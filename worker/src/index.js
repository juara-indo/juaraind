const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png'])

function response(body, status, origin, headers = {}) {
  return new Response(body, {
    status,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Turnstile-Token',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Vary': 'Origin',
      ...headers,
    },
  })
}

function json(data, status, origin) {
  return response(JSON.stringify(data), status, origin, { 'Content-Type': 'application/json' })
}

function authToken(request) {
  const value = request.headers.get('Authorization') || ''
  return value.startsWith('Bearer ') ? value.slice(7) : null
}

async function authenticate(request, env) {
  const token = authToken(request)
  if (!token) return null

  const userResponse = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: env.SUPABASE_ANON_KEY,
    },
  })
  if (!userResponse.ok) return null
  return userResponse.json()
}

async function candidateFor(user, token, env) {
  const query = new URLSearchParams({ id: `eq.${user.id}`, select: 'candidate_id' })
  const candidateResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/candidates?${query}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: env.SUPABASE_ANON_KEY,
    },
  })
  if (!candidateResponse.ok) throw new Error('Gagal memeriksa data kandidat.')
  const candidates = await candidateResponse.json()
  return candidates[0] || null
}

async function verifyTurnstile(token, request, env) {
  if (!env.TURNSTILE_SECRET_KEY) throw new Error('Turnstile belum dikonfigurasi.')
  const form = new FormData()
  form.append('secret', env.TURNSTILE_SECRET_KEY)
  form.append('response', token || '')
  const clientIp = request.headers.get('CF-Connecting-IP')
  if (clientIp) form.append('remoteip', clientIp)
  const verification = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: form,
  })
  if (!verification.ok) throw new Error('Gagal memeriksa keamanan upload.')
  return verification.json()
}

async function listDocuments(userId, env, origin) {
  const { results } = await env.DB.prepare(
    `SELECT id, candidate_id, file_name, content_type, file_size, created_at
     FROM documents WHERE user_id = ? ORDER BY created_at DESC`,
  ).bind(userId).all()
  return json({ documents: results }, 200, origin)
}

async function uploadDocument(request, user, token, env, origin) {
  const turnstileToken = request.headers.get('X-Turnstile-Token')
  const turnstile = await verifyTurnstile(turnstileToken, request, env)
  if (!turnstile.success) return json({ error: 'Verifikasi keamanan gagal. Silakan coba lagi.' }, 403, origin)

  const candidate = await candidateFor(user, token, env)
  if (!candidate) return json({ error: 'Profil kandidat belum tersedia.' }, 404, origin)

  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return json({ error: 'File dokumen wajib dipilih.' }, 400, origin)
  if (!ALLOWED_TYPES.has(file.type)) return json({ error: 'Format harus PDF, JPG, atau PNG.' }, 415, origin)
  if (file.size > MAX_FILE_SIZE) return json({ error: 'Ukuran file maksimal 5 MB.' }, 413, origin)

  const id = crypto.randomUUID()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'document'
  const objectKey = `documents/${user.id}/${id}-${safeName}`
  await env.DOCUMENTS.put(objectKey, file.stream(), {
    httpMetadata: { contentType: file.type },
  })

  try {
    await env.DB.prepare(
      `INSERT INTO documents
       (id, user_id, candidate_id, object_key, file_name, content_type, file_size)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, user.id, candidate.candidate_id, objectKey, file.name, file.type, file.size).run()
  } catch (error) {
    await env.DOCUMENTS.delete(objectKey)
    throw error
  }

  return json({
    document: { id, candidate_id: candidate.candidate_id, file_name: file.name, content_type: file.type, file_size: file.size },
  }, 201, origin)
}

async function downloadDocument(request, user, id, env, origin) {
  const document = await env.DB.prepare(
    'SELECT object_key, file_name, content_type FROM documents WHERE id = ? AND user_id = ?',
  ).bind(id, user.id).first()
  if (!document) return json({ error: 'Dokumen tidak ditemukan.' }, 404, origin)

  const object = await env.DOCUMENTS.get(document.object_key)
  if (!object) return json({ error: 'File tidak tersedia.' }, 404, origin)
  return response(object.body, 200, origin, {
    'Content-Type': document.content_type,
    'Content-Disposition': `attachment; filename="${document.file_name.replace(/["\r\n]/g, '_')}"`,
  })
}

async function deleteDocument(user, id, env, origin) {
  const document = await env.DB.prepare(
    'SELECT object_key FROM documents WHERE id = ? AND user_id = ?',
  ).bind(id, user.id).first()
  if (!document) return json({ error: 'Dokumen tidak ditemukan.' }, 404, origin)
  await env.DOCUMENTS.delete(document.object_key)
  await env.DB.prepare('DELETE FROM documents WHERE id = ? AND user_id = ?').bind(id, user.id).run()
  return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } })
}

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || '*'
    if (request.method === 'OPTIONS') return response(null, 204, origin)

    const url = new URL(request.url)
    const user = await authenticate(request, env)
    if (!user) return json({ error: 'Sesi login tidak valid.' }, 401, origin)

    try {
      if (url.pathname === '/documents' && request.method === 'GET') {
        return listDocuments(user.id, env, origin)
      }
      if (url.pathname === '/documents' && request.method === 'POST') {
        const token = authToken(request)
        return uploadDocument(request, user, token, env, origin)
      }

      const match = url.pathname.match(/^\/documents\/([^/]+)$/)
      if (match && request.method === 'GET') return downloadDocument(request, user, match[1], env, origin)
      if (match && request.method === 'DELETE') return deleteDocument(user, match[1], env, origin)
      return json({ error: 'Endpoint tidak ditemukan.' }, 404, origin)
    } catch (error) {
      console.error(error)
      return json({ error: 'Terjadi kesalahan saat memproses dokumen.' }, 500, origin)
    }
  },
}
