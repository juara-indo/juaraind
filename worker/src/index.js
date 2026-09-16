const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png'])
const ALLOWED_DOCUMENT_TYPES = new Set(['ktp', 'kk', 'ijazah', 'cv', 'paspor', 'visa', 'pendukung'])
const REQUIRED_DOCUMENT_TYPES = ['ktp', 'kk', 'ijazah', 'cv']
const UPLOAD_RATE_WINDOW_MS = 10 * 60 * 1000
const UPLOAD_RATE_LIMIT_PER_USER = 10
const UPLOAD_RATE_LIMIT_PER_IP = 30

function safeObjectSegment(value, fallback = 'candidate') {
  return String(value || fallback).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120) || fallback
}

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

function json(data, status, origin, headers = {}) {
  return response(JSON.stringify(data), status, origin, { 'Content-Type': 'application/json', ...headers })
}

function requestOrigin(request, env) {
  const origin = request.headers.get('Origin')
  const allowedOrigins = (env.ALLOWED_ORIGIN || '').split(',').map((value) => value.trim()).filter(Boolean)
  return origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || '*'
}

function authToken(request) {
  const value = request.headers.get('Authorization') || ''
  return value.startsWith('Bearer ') ? value.slice(7) : null
}

function adminEmails(env) {
  return new Set((env.ADMIN_EMAILS || '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean))
}

async function authenticateAdmin(request, env) {
  const user = await authenticate(request, env)
  if (!user || !adminEmails(env).has(String(user.email || '').toLowerCase())) return null
  return user
}

function supabaseAdminHeaders(env) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi.')
  return {
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  }
}

async function listAdminCandidates(request, env, origin) {
  const url = new URL(request.url)
  const search = (url.searchParams.get('q') || '').replace(/[^a-zA-Z0-9 _-]/g, '').trim().slice(0, 80)
  const params = new URLSearchParams({
    select: 'id,candidate_id,full_name,phone,city,status,created_at',
    order: 'created_at.desc',
    limit: '100',
  })
  if (search) params.set('or', `(candidate_id.ilike.*${search}*,full_name.ilike.*${search}*)`)
  const candidateResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/candidates?${params}`, {
    headers: supabaseAdminHeaders(env),
  })
  if (!candidateResponse.ok) throw new Error('Gagal mengambil daftar kandidat.')
  const candidates = await candidateResponse.json()
  const { results } = await env.DB.prepare(
    `SELECT candidate_id, COUNT(*) AS document_count, MAX(created_at) AS latest_upload
     FROM documents GROUP BY candidate_id ORDER BY latest_upload DESC`,
  ).all()
  const documentsByCandidate = new Map(results.map((item) => [item.candidate_id, item]))
  return json({
    candidates: candidates.map((candidate) => ({
      ...candidate,
      document_count: Number(documentsByCandidate.get(candidate.candidate_id)?.document_count || 0),
      latest_upload: documentsByCandidate.get(candidate.candidate_id)?.latest_upload || null,
    })),
  }, 200, origin)
}

async function listAdminDocuments(candidateId, env, origin) {
  const { results } = await env.DB.prepare(
    `SELECT id, candidate_id, document_type, file_name, content_type, file_size, created_at
     FROM documents WHERE candidate_id = ? ORDER BY document_type, created_at DESC`,
  ).bind(candidateId).all()
  return json({ documents: results }, 200, origin)
}

async function consumeRateLimit(key, limit, env) {
  const now = Date.now()
  const windowStart = now - UPLOAD_RATE_WINDOW_MS
  await env.DB.prepare(
    `INSERT INTO request_limits (rate_key, window_start, request_count)
     VALUES (?, ?, 1)
     ON CONFLICT(rate_key) DO UPDATE SET
       window_start = CASE WHEN request_limits.window_start <= ? THEN excluded.window_start ELSE request_limits.window_start END,
       request_count = CASE WHEN request_limits.window_start <= ? THEN 1 ELSE request_limits.request_count + 1 END`,
  ).bind(key, now, windowStart, windowStart).run()

  const current = await env.DB.prepare(
    'SELECT request_count FROM request_limits WHERE rate_key = ?',
  ).bind(key).first()
  return Number(current?.request_count || 0) <= limit
}

async function enforceUploadRateLimit(request, user, env, origin) {
  const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown'
  const userAllowed = await consumeRateLimit(`upload:user:${user.id}`, UPLOAD_RATE_LIMIT_PER_USER, env)
  const ipAllowed = await consumeRateLimit(`upload:ip:${clientIp}`, UPLOAD_RATE_LIMIT_PER_IP, env)
  if (userAllowed && ipAllowed) return null

  return json(
    { error: 'Terlalu banyak percobaan upload. Silakan coba lagi beberapa menit kemudian.' },
    429,
    origin,
    { 'Retry-After': String(UPLOAD_RATE_WINDOW_MS / 1000) },
  )
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
    `SELECT id, candidate_id, document_type, file_name, content_type, file_size, created_at
     FROM documents WHERE user_id = ? ORDER BY created_at DESC`,
  ).bind(userId).all()
  return json({ documents: results }, 200, origin)
}

async function submitApplication(request, user, token, env, origin) {
  const payload = await request.json().catch(() => null)
  const agencyDocuments = {
    paspor: payload?.paspor === true,
    visa: payload?.visa === true,
  }
  const candidate = await candidateFor(user, token, env)
  if (!candidate) return json({ error: 'Profil kandidat belum tersedia.' }, 404, origin)

  const { results } = await env.DB.prepare(
    `SELECT document_type FROM documents
     WHERE user_id = ? AND document_type IS NOT NULL
     GROUP BY document_type`,
  ).bind(user.id).all()
  const uploadedTypes = new Set(results.map((item) => item.document_type))
  const missing = REQUIRED_DOCUMENT_TYPES.filter((type) => !uploadedTypes.has(type))
  if (!agencyDocuments.paspor && !uploadedTypes.has('paspor')) missing.push('paspor')
  if (!agencyDocuments.visa && !uploadedTypes.has('visa')) missing.push('visa')
  if (missing.length) return json({ error: 'Dokumen wajib belum lengkap. Silakan lengkapi atau pilih pembuatan kolektif untuk Paspor/Visa.' }, 400, origin)

  await env.DB.prepare(
    `INSERT INTO applications (user_id, candidate_id, passport_by_agency, visa_by_agency)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       candidate_id = excluded.candidate_id,
       passport_by_agency = excluded.passport_by_agency,
       visa_by_agency = excluded.visa_by_agency,
       applied_at = CURRENT_TIMESTAMP`,
  ).bind(user.id, candidate.candidate_id, agencyDocuments.paspor ? 1 : 0, agencyDocuments.visa ? 1 : 0).run()
  return json({ applied: true }, 200, origin)
}

async function uploadDocuments(request, user, token, env, origin) {
  const turnstileToken = request.headers.get('X-Turnstile-Token')
  const turnstile = await verifyTurnstile(turnstileToken, request, env)
  if (!turnstile.success) return json({ error: 'Verifikasi keamanan gagal. Silakan coba lagi.' }, 403, origin)

  const candidate = await candidateFor(user, token, env)
  if (!candidate) return json({ error: 'Profil kandidat belum tersedia.' }, 404, origin)

  const form = await request.formData()
  const files = form.getAll('files')
  const documentTypes = form.getAll('document_types').map(String)
  if (!files.length || files.some((file) => !(file instanceof File))) {
    return json({ error: 'File dokumen wajib dipilih.' }, 400, origin)
  }
  if (files.length !== documentTypes.length || files.length > 10) {
    return json({ error: 'Data dokumen tidak valid.' }, 400, origin)
  }
  for (const [index, file] of files.entries()) {
    if (!ALLOWED_DOCUMENT_TYPES.has(documentTypes[index])) return json({ error: 'Jenis dokumen tidak valid.' }, 400, origin)
    if (!ALLOWED_TYPES.has(file.type)) return json({ error: 'Format harus PDF, JPG, atau PNG.' }, 415, origin)
    if (file.size > MAX_FILE_SIZE) return json({ error: 'Ukuran file maksimal 5 MB.' }, 413, origin)
  }

  const replaceTypes = [...new Set(documentTypes.filter((type) => type !== 'pendukung'))]
  const previousDocuments = replaceTypes.length
    ? (await env.DB.prepare(
      `SELECT id, object_key FROM documents
       WHERE user_id = ? AND document_type IN (${replaceTypes.map(() => '?').join(',')})`,
    ).bind(user.id, ...replaceTypes).all()).results
    : []
  const uploaded = []
  const insertedIds = []
  try {
    for (const [index, file] of files.entries()) {
      const id = crypto.randomUUID()
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-110) || 'document'
      const candidateFolder = safeObjectSegment(candidate.candidate_id)
      const documentLabel = safeObjectSegment(documentTypes[index]).toUpperCase()
      const extensionIndex = safeName.lastIndexOf('.')
      const nameBase = extensionIndex > 0 ? safeName.slice(0, extensionIndex) : safeName
      const extension = extensionIndex > 0 ? safeName.slice(extensionIndex) : ''
      const objectName = `${documentLabel}-${nameBase}-${id.slice(0, 8)}${extension}`
      const objectKey = `documents/${candidateFolder}/${objectName}`
      await env.DOCUMENTS.put(objectKey, file.stream(), {
        httpMetadata: { contentType: file.type },
      })
      uploaded.push({ id, objectKey, file, documentType: documentTypes[index] })
    }
    for (const item of uploaded) {
      await env.DB.prepare(
        `INSERT INTO documents
         (id, user_id, candidate_id, document_type, object_key, file_name, content_type, file_size)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(item.id, user.id, candidate.candidate_id, item.documentType, item.objectKey, item.file.name, item.file.type, item.file.size).run()
      insertedIds.push(item.id)
    }
    for (const previous of previousDocuments) {
      await env.DOCUMENTS.delete(previous.object_key)
      await env.DB.prepare('DELETE FROM documents WHERE id = ? AND user_id = ?').bind(previous.id, user.id).run()
    }
  } catch (error) {
    await Promise.all([
      ...uploaded.map((item) => env.DOCUMENTS.delete(item.objectKey)),
      ...insertedIds.map((id) => env.DB.prepare('DELETE FROM documents WHERE id = ? AND user_id = ?').bind(id, user.id).run()),
    ])
    throw error
  }

  return json({
    documents: uploaded.map((item) => ({
      id: item.id,
      candidate_id: candidate.candidate_id,
      document_type: item.documentType,
      file_name: item.file.name,
      content_type: item.file.type,
      file_size: item.file.size,
    })),
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

async function downloadAdminDocument(id, env, origin) {
  const document = await env.DB.prepare(
    'SELECT object_key, file_name, content_type FROM documents WHERE id = ?',
  ).bind(id).first()
  if (!document) return json({ error: 'Dokumen tidak ditemukan.' }, 404, origin)
  const object = await env.DOCUMENTS.get(document.object_key)
  if (!object) return json({ error: 'File tidak tersedia.' }, 404, origin)
  return response(object.body, 200, origin, {
    'Content-Type': document.content_type,
    'Content-Disposition': `attachment; filename="${document.file_name.replace(/["\r\n]/g, '_')}"`,
  })
}

export default {
  async fetch(request, env) {
    const origin = requestOrigin(request, env)
    if (request.method === 'OPTIONS') return response(null, 204, origin)

    const url = new URL(request.url)
    const user = await authenticate(request, env)
    if (!user) return json({ error: 'Sesi login tidak valid.' }, 401, origin)

    try {
      if (url.pathname === '/admin/candidates' && request.method === 'GET') {
        if (!await authenticateAdmin(request, env)) return json({ error: 'Akses admin ditolak.' }, 403, origin)
        return listAdminCandidates(request, env, origin)
      }
      const adminDocumentMatch = url.pathname.match(/^\/admin\/candidates\/([^/]+)\/documents$/)
      if (adminDocumentMatch && request.method === 'GET') {
        if (!await authenticateAdmin(request, env)) return json({ error: 'Akses admin ditolak.' }, 403, origin)
        return listAdminDocuments(decodeURIComponent(adminDocumentMatch[1]), env, origin)
      }
      const adminDownloadMatch = url.pathname.match(/^\/admin\/documents\/([^/]+)$/)
      if (adminDownloadMatch && request.method === 'GET') {
        if (!await authenticateAdmin(request, env)) return json({ error: 'Akses admin ditolak.' }, 403, origin)
        return downloadAdminDocument(decodeURIComponent(adminDownloadMatch[1]), env, origin)
      }
      if (url.pathname === '/documents' && request.method === 'GET') {
        return listDocuments(user.id, env, origin)
      }
      if (url.pathname === '/documents' && request.method === 'POST') {
        const rateLimitResponse = await enforceUploadRateLimit(request, user, env, origin)
        if (rateLimitResponse) return rateLimitResponse
        const token = authToken(request)
        return uploadDocuments(request, user, token, env, origin)
      }
      if (url.pathname === '/applications' && request.method === 'POST') {
        const token = authToken(request)
        return submitApplication(request, user, token, env, origin)
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
