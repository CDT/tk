type StudyMode = 'translation' | 'excerpt' | 'word'

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

  const { action, password, token, card, mode } = await request.json()
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

  if (action === 'delete') {
    const response = await fetch(`${baseUrl}?id=eq.${encodeURIComponent(card?.id ?? '')}`, { method: 'DELETE', headers })
    return response.ok ? json({ ok: true }) : json({ error: await response.text() }, 400)
  }

  const cardMode = (mode ?? (card?.source ? 'translation' : card?.word ? 'word' : 'excerpt')) as StudyMode
  if (!card || !['translation', 'excerpt', 'word'].includes(cardMode)) return json({ error: 'Invalid card.' }, 400)

  if (action === 'create') {
    const positions = await fetch(`${baseUrl}?mode=eq.${cardMode}&select=position&order=position.desc&limit=1`, { headers })
    const lastCard = (await positions.json())[0]
    const position = (lastCard?.position ?? -1) + 1
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({ ...card, id: `${cardMode}-${String(position + 1).padStart(3, '0')}`, mode: cardMode, position }),
    })
    const data = await response.json()
    return response.ok ? json({ card: data[0] }) : json({ error: data }, 400)
  }

  const response = await fetch(`${baseUrl}?id=eq.${encodeURIComponent(card.id)}`, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify(card),
  })
  const data = await response.json()
  return response.ok ? json({ card: data[0] }) : json({ error: data }, 400)
})
