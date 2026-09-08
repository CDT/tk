const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders })
}

const sessionDurationMs = 30 * 24 * 60 * 60 * 1000
const encoder = new TextEncoder()

function encode(value: Uint8Array) {
  return btoa(String.fromCharCode(...value)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

async function signature(payload: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return encode(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(payload))))
}

async function createSession(secret: string) {
  const expiresAt = Date.now() + sessionDurationMs
  const payload = encode(encoder.encode(JSON.stringify({ expiresAt })))
  return { token: `${payload}.${await signature(payload, secret)}`, expiresAt }
}

async function validSession(token: unknown, secret: string) {
  if (typeof token !== 'string') return false
  const [payload, suppliedSignature] = token.split('.')
  if (!payload || !suppliedSignature || suppliedSignature !== await signature(payload, secret)) return false
  try {
    const decoded = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(payload.replaceAll('-', '+').replaceAll('_', '/')), (character) => character.charCodeAt(0))))
    return typeof decoded.expiresAt === 'number' && decoded.expiresAt > Date.now()
  } catch {
    return false
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)
  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON.' }, 400) }
  const { action, password, token, card } = body ?? {}
  if (!['verify', 'create', 'update', 'delete'].includes(action)) return json({ error: 'Invalid action.' }, 400)
  const adminPassword = Deno.env.get('ADMIN_PASSWORD') ?? ''
  if (!adminPassword) return json({ error: 'Admin password is not configured.' }, 503)
  if (action === 'verify') {
    if (!password || password !== adminPassword) return json({ error: 'Incorrect password.' }, 401)
    return json({ ok: true, ...await createSession(adminPassword) })
  }
  if (!await validSession(token, adminPassword)) return json({ error: 'Your editor session has expired.' }, 401)

  const baseUrl = `${Deno.env.get('SUPABASE_URL')}/rest/v1/study_cards`
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const headers = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' }

  if (action !== 'create' && (typeof card?.id !== 'string' || !card.id.trim())) return json({ error: 'Card ID is required.' }, 400)

  if (action === 'delete') {
    const response = await fetch(`${baseUrl}?id=eq.${encodeURIComponent(card?.id ?? '')}`, { method: 'DELETE', headers })
    return response.ok ? json({ ok: true }) : json({ error: await response.text() }, 400)
  }

  if (typeof card?.title !== 'string' || !card.title.trim() || typeof card?.content !== 'string' || !card.content.trim()) {
    return json({ error: 'Title and content are required.' }, 400)
  }
  const values = { title: card.title, content: card.content, updated_at: new Date().toISOString() }
  const response = await fetch(action === 'create' ? baseUrl : `${baseUrl}?id=eq.${encodeURIComponent(card.id)}`, {
    method: action === 'create' ? 'POST' : 'PATCH',
    headers: { ...headers, Prefer: 'return=representation' },
    // PostgreSQL assigns a UUID and a sequence position, including concurrent creates.
    body: JSON.stringify(values),
  })
  const data = await response.json()
  if (!response.ok) return json({ error: data }, 400)
  if (!data[0]) return json({ error: 'Card not found.' }, 404)
  return json({ card: data[0] })
})
