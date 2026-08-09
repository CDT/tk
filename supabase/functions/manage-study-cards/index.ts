type StudyMode = 'translation' | 'excerpt' | 'word'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { action, password, card, mode } = await request.json()
  if (!password || password !== Deno.env.get('ADMIN_PASSWORD')) return json({ error: 'Incorrect password.' }, 401)
  if (action === 'verify') return json({ ok: true })

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
