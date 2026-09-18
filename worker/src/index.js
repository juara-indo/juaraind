const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png'])
const ALLOWED_DOCUMENT_TYPES = new Set(['ktp', 'kk', 'ijazah', 'cv', 'pas_photo', 'paspor', 'visa', 'pendukung'])
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
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
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

function isAdminUser(user, env) {
  return adminEmails(env).has(String(user?.email || '').toLowerCase())
}

async function authenticateAdmin(request, env) {
  const user = await authenticate(request, env)
  if (!user || !isAdminUser(user, env)) return null
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
    `SELECT id, candidate_id, document_type, file_name, content_type, file_size, validation_status, reviewed_at, created_at
     FROM documents WHERE candidate_id = ? ORDER BY created_at ASC, rowid ASC`,
  ).bind(candidateId).all()
  return json({ documents: results }, 200, origin)
}

async function listAllAdminDocuments(env, origin) {
  const { results } = await env.DB.prepare(
    `SELECT id, candidate_id, document_type, file_name, content_type, file_size, validation_status, reviewed_at, created_at
     FROM documents ORDER BY candidate_id, created_at ASC, rowid ASC`,
  ).all()
  const candidateResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/candidates?select=id,candidate_id,full_name,birth_place,birth_date,gender,phone,address,province,city,postal_code,experience&order=created_at.desc&limit=100`, {
    headers: supabaseAdminHeaders(env),
  })
  if (!candidateResponse.ok) {
    console.error('Supabase candidates request failed', candidateResponse.status, await candidateResponse.text())
    throw new Error('Gagal mengambil daftar kandidat.')
  }

  async function listAdminFinance(env, origin) {
    const { results: applications } = await env.DB.prepare(
      'SELECT candidate_id, passport_by_agency, visa_by_agency FROM applications WHERE passport_by_agency = 1 OR visa_by_agency = 1',
    ).all()
    if (!applications.length) return json({ candidates: [] }, 200, origin)
    const candidateResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/candidates?select=candidate_id,full_name&order=created_at.desc&limit=100`, {
      headers: supabaseAdminHeaders(env),
    })
    if (!candidateResponse.ok) throw new Error('Gagal mengambil daftar kandidat.')
    const candidates = await candidateResponse.json()
    const { results: accounts } = await env.DB.prepare('SELECT * FROM candidate_finance').all()
    const { results: payments } = await env.DB.prepare(
      'SELECT id, candidate_id, amount, payment_date, note FROM candidate_finance_payments ORDER BY payment_date DESC, created_at DESC',
    ).all()
    const applicationByCandidate = new Map(applications.map((item) => [item.candidate_id, item]))
    const accountByCandidate = new Map(accounts.map((item) => [item.candidate_id, item]))
    const paymentsByCandidate = new Map()
    for (const payment of payments) {
      const list = paymentsByCandidate.get(payment.candidate_id) || []
      list.push(payment)
      paymentsByCandidate.set(payment.candidate_id, list)
    }
    return json({
      candidates: candidates.filter((candidate) => applicationByCandidate.has(candidate.candidate_id)).map((candidate) => {
        const application = applicationByCandidate.get(candidate.candidate_id)
        const account = accountByCandidate.get(candidate.candidate_id) || {
          passport_fee: 0, visa_fee: 0, departure_fee: 0,
        }
        return {
          ...candidate,
          passport_by_agency: Boolean(application.passport_by_agency),
          visa_by_agency: Boolean(application.visa_by_agency),
          passport_fee: Number(account.passport_fee),
          visa_fee: Number(account.visa_fee),
          departure_fee: Number(account.departure_fee),
          payments: paymentsByCandidate.get(candidate.candidate_id) || [],
        }
      }),
    }, 200, origin)
  }

  async function updateAdminFinance(request, candidateId, env, origin) {
    const body = await request.json().catch(() => null)
    const passportFee = Number(body?.passport_fee)
    const visaFee = Number(body?.visa_fee)
    const departureFee = Number(body?.departure_fee)
    if (![passportFee, visaFee, departureFee].every((value) => Number.isInteger(value) && value >= 0)) {
      return json({ error: 'Nominal biaya harus berupa angka bulat yang valid.' }, 400, origin)
    }
    await env.DB.prepare(
      `INSERT INTO candidate_finance (candidate_id, passport_fee, visa_fee, departure_fee, updated_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(candidate_id) DO UPDATE SET passport_fee = excluded.passport_fee,
       visa_fee = excluded.visa_fee, departure_fee = excluded.departure_fee, updated_at = CURRENT_TIMESTAMP`,
    ).bind(candidateId, passportFee, visaFee, departureFee).run()
    return json({ ok: true }, 200, origin)
  }

  async function addAdminFinancePayment(request, candidateId, env, origin) {
    const body = await request.json().catch(() => null)
    const amount = Number(body?.amount)
    const paymentDate = String(body?.payment_date || '')
    const note = String(body?.note || '').trim().slice(0, 240)
    if (!Number.isInteger(amount) || amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) {
      return json({ error: 'Nominal dan tanggal pembayaran wajib valid.' }, 400, origin)
    }
    await env.DB.prepare(
      'INSERT INTO candidate_finance_payments (id, candidate_id, amount, payment_date, note) VALUES (?, ?, ?, ?, ?)',
    ).bind(crypto.randomUUID(), candidateId, amount, paymentDate, note).run()
    return json({ ok: true }, 201, origin)
  }
  const candidates = await candidateResponse.json()
  const authUsersResponse = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users?per_page=100`, {
    headers: supabaseAdminHeaders(env),
  })
  if (!authUsersResponse.ok) throw new Error('Gagal mengambil email kandidat.')
  const authUsersPayload = await authUsersResponse.json()
  const emailsByUserId = new Map((authUsersPayload.users || []).map((user) => [user.id, user.email || '']))
  const { results: applications } = await env.DB.prepare(
    'SELECT candidate_id, passport_by_agency, visa_by_agency FROM applications',
  ).all()
  const applicationsByCandidate = new Map(applications.map((application) => [application.candidate_id, application]))
  const documentsByCandidate = new Map()
  for (const document of results) {
    const group = documentsByCandidate.get(document.candidate_id) || []
    group.push(document)
    documentsByCandidate.set(document.candidate_id, group)
  }
  return json({
    candidates: candidates.map((candidate) => ({
      ...candidate,
      email: emailsByUserId.get(candidate.id) || '',
      passport_by_agency: Boolean(applicationsByCandidate.get(candidate.candidate_id)?.passport_by_agency),
      visa_by_agency: Boolean(applicationsByCandidate.get(candidate.candidate_id)?.visa_by_agency),
      documents: documentsByCandidate.get(candidate.candidate_id) || [],
    })),
  }, 200, origin)
}

async function uploadAdminCollectiveDocuments(request, candidateId, env, origin) {
  const application = await env.DB.prepare(
    'SELECT user_id, passport_by_agency, visa_by_agency FROM applications WHERE candidate_id = ?',
  ).bind(candidateId).first()
  if (!application) return json({ error: 'Data kolektif kandidat belum tersedia.' }, 404, origin)

  const allowedCollectiveTypes = new Set()
  if (application.passport_by_agency) allowedCollectiveTypes.add('paspor')
  if (application.visa_by_agency) allowedCollectiveTypes.add('visa')
  const form = await request.formData()
  const files = form.getAll('files')
  const documentTypes = form.getAll('document_types').map(String)
  if (!files.length || files.length !== documentTypes.length || files.some((file) => !(file instanceof File))) {
    return json({ error: 'File kolektif wajib dipilih.' }, 400, origin)
  }
  if (new Set(documentTypes).size !== documentTypes.length || documentTypes.some((type) => !allowedCollectiveTypes.has(type))) {
    return json({ error: 'Jenis dokumen kolektif tidak valid.' }, 400, origin)
  }
  for (const file of files) {
    if (!ALLOWED_TYPES.has(file.type)) return json({ error: 'Format harus PDF, JPG, atau PNG.' }, 415, origin)
    if (file.size > MAX_FILE_SIZE) return json({ error: 'Ukuran file maksimal 5 MB.' }, 413, origin)
  }
  const existing = await env.DB.prepare(
    `SELECT document_type FROM documents WHERE candidate_id = ? AND document_type IN (${documentTypes.map(() => '?').join(',')})`,
  ).bind(candidateId, ...documentTypes).all()
  if (existing.results.length) return json({ error: 'Dokumen kolektif sudah dikonversi.' }, 409, origin)

  const claims = await env.DB.batch(documentTypes.map((type) => env.DB.prepare(
    'INSERT OR IGNORE INTO collective_document_claims (candidate_id, document_type) VALUES (?, ?)',
  ).bind(candidateId, type)))
  const claimedTypes = claims.map((result) => result.meta?.changes || 0)
  if (claimedTypes.some((changes) => changes !== 1)) {
    await env.DB.batch(documentTypes.map((type, index) => claimedTypes[index] === 1
      ? env.DB.prepare(
        'DELETE FROM collective_document_claims WHERE candidate_id = ? AND document_type = ?',
      ).bind(candidateId, type)
      : env.DB.prepare('SELECT 1')))
    return json({ error: 'Konversi dokumen sedang diproses atau sudah dilakukan.' }, 409, origin)
  }

  const uploaded = []
  try {
    for (const [index, file] of files.entries()) {
      const id = crypto.randomUUID()
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-110) || 'document'
      const extensionIndex = safeName.lastIndexOf('.')
      const extension = extensionIndex > 0 ? safeName.slice(extensionIndex) : ''
      const objectKey = `documents/${safeObjectSegment(candidateId)}/${documentTypes[index].toUpperCase()}-COLLECTIVE-${id.slice(0, 8)}${extension}`
      await env.DOCUMENTS.put(objectKey, file.stream(), { httpMetadata: { contentType: file.type } })
      await env.DB.prepare(
        `INSERT INTO documents (id, user_id, candidate_id, document_type, object_key, file_name, content_type, file_size)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(id, application.user_id, candidateId, documentTypes[index], objectKey, file.name, file.type, file.size).run()
      uploaded.push({ id, document_type: documentTypes[index] })
    }
  } catch (error) {
    await Promise.all(uploaded.map(async (item) => {
      const document = await env.DB.prepare('SELECT object_key FROM documents WHERE id = ?').bind(item.id).first()
      if (document) await env.DOCUMENTS.delete(document.object_key)
      await env.DB.prepare('DELETE FROM documents WHERE id = ?').bind(item.id).run()
    }))
    await env.DB.batch(documentTypes.map((type) => env.DB.prepare(
      'DELETE FROM collective_document_claims WHERE candidate_id = ? AND document_type = ?',
    ).bind(candidateId, type)))
    throw error
  }
  return json({ documents: uploaded }, 201, origin)
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
    `SELECT id, candidate_id, document_type, file_name, content_type, file_size, validation_status, reviewed_at, created_at
     FROM documents WHERE user_id = ? ORDER BY created_at DESC`,
  ).bind(userId).all()
  const application = await env.DB.prepare(
    'SELECT passport_by_agency, visa_by_agency FROM applications WHERE user_id = ?',
  ).bind(userId).first()
  return json({
    documents: results,
    agencyDocuments: application ? {
      paspor: Boolean(application?.passport_by_agency),
      visa: Boolean(application?.visa_by_agency),
    } : null,
  }, 200, origin)
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
  const documentNames = form.getAll('document_names').map(String)
  if (!files.length || files.some((file) => !(file instanceof File))) {
    return json({ error: 'File dokumen wajib dipilih.' }, 400, origin)
  }
  if (files.length !== documentTypes.length || files.length > 10) {
    return json({ error: 'Data dokumen tidak valid.' }, 400, origin)
  }
  for (const [index, file] of files.entries()) {
    if (!ALLOWED_DOCUMENT_TYPES.has(documentTypes[index])) return json({ error: 'Jenis dokumen tidak valid.' }, 400, origin)
    if (!ALLOWED_TYPES.has(file.type)) return json({ error: 'Format harus PDF, JPG, atau PNG.' }, 415, origin)
    if (documentTypes[index] === 'pas_photo' && !['image/jpeg', 'image/png'].includes(file.type)) {
      return json({ error: 'Pas photo harus berupa JPG atau PNG.' }, 415, origin)
    }
    if (file.size > MAX_FILE_SIZE) return json({ error: 'Ukuran file maksimal 5 MB.' }, 413, origin)
  }

  const replaceTypes = [...new Set(documentTypes.filter((type) => type !== 'pendukung'))]
  const previousDocuments = replaceTypes.length
    ? (await env.DB.prepare(
      `SELECT id, object_key, validation_status FROM documents
       WHERE user_id = ? AND document_type IN (${replaceTypes.map(() => '?').join(',')})`,
    ).bind(user.id, ...replaceTypes).all()).results
    : []
  const uploaded = []
  const insertedIds = []
  try {
    for (const [index, file] of files.entries()) {
      const id = crypto.randomUUID()
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-110) || 'document'
      const customName = documentTypes[index] === 'pendukung' ? String(documentNames[index] || '').trim().replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 100) : ''
      if (documentTypes[index] === 'pendukung' && !customName) throw new Error('Nama dokumen pendukung wajib diisi.')
      const candidateFolder = safeObjectSegment(candidate.candidate_id)
      const documentLabel = safeObjectSegment(documentTypes[index]).toUpperCase()
      const extensionIndex = safeName.lastIndexOf('.')
      const nameBase = customName || (extensionIndex > 0 ? safeName.slice(0, extensionIndex) : safeName)
      const extension = extensionIndex > 0 ? safeName.slice(extensionIndex) : ''
      const objectName = `${documentLabel}-${nameBase}-${id.slice(0, 8)}${extension}`
      const objectKey = `documents/${candidateFolder}/${objectName}`
      await env.DOCUMENTS.put(objectKey, file.stream(), {
        httpMetadata: { contentType: file.type },
      })
      uploaded.push({ id, objectKey, file, documentType: documentTypes[index], documentName: customName })
    }
    for (const item of uploaded) {
      await env.DB.prepare(
        `INSERT INTO documents
         (id, user_id, candidate_id, document_type, object_key, file_name, content_type, file_size)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(item.id, user.id, candidate.candidate_id, item.documentType, item.objectKey, item.documentName || item.file.name, item.file.type, item.file.size).run()
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
    'SELECT object_key, validation_status FROM documents WHERE id = ? AND user_id = ?',
  ).bind(id, user.id).first()
  if (!document) return json({ error: 'Dokumen tidak ditemukan.' }, 404, origin)
  if (document.validation_status === 'accepted') return json({ error: 'Dokumen yang sudah diterima tidak dapat diubah.' }, 409, origin)
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

async function reviewAdminDocument(request, id, env, origin) {
  const payload = await request.json().catch(() => null)
  const status = payload?.status
  if (!['accepted', 'rejected'].includes(status)) return json({ error: 'Status review tidak valid.' }, 400, origin)
  const result = await env.DB.prepare(
    'UPDATE documents SET validation_status = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?',
  ).bind(status, id).run()
  if (!result.meta?.changes) return json({ error: 'Dokumen tidak ditemukan.' }, 404, origin)
  return json({ id, validation_status: status }, 200, origin)
}

async function normalizeCandidateStorage(candidateId, env, origin) {
  const { results } = await env.DB.prepare(
    `SELECT id, object_key FROM documents WHERE candidate_id = ? ORDER BY created_at ASC, rowid ASC`,
  ).bind(candidateId).all()
  const candidateFolder = safeObjectSegment(candidateId)
  const moved = []

  for (const document of results) {
    const expectedPrefix = `documents/${candidateFolder}/`
    if (document.object_key.startsWith(expectedPrefix)) continue

    const source = await env.DOCUMENTS.get(document.object_key)
    if (!source) throw new Error(`Object dokumen tidak ditemukan: ${document.object_key}`)

    const fileName = document.object_key.split('/').pop() || document.id
    const destination = `${expectedPrefix}${fileName}`
    if (await env.DOCUMENTS.head(destination)) {
      throw new Error(`Object tujuan sudah ada: ${destination}`)
    }

    await env.DOCUMENTS.put(destination, source.body, {
      httpMetadata: source.httpMetadata,
      customMetadata: source.customMetadata,
    })
    await env.DB.prepare('UPDATE documents SET object_key = ? WHERE id = ?').bind(destination, document.id).run()
    await env.DOCUMENTS.delete(document.object_key)
    moved.push({ id: document.id, object_key: destination })
  }

  return json({ candidate_id: candidateId, moved }, 200, origin)
}

async function listAdminFinanceEndpoint(env, origin) {
  const { results: applications } = await env.DB.prepare(
    'SELECT candidate_id, passport_by_agency, visa_by_agency FROM applications WHERE passport_by_agency = 1 OR visa_by_agency = 1',
  ).all()
  if (!applications.length) return json({ candidates: [] }, 200, origin)
  const candidateResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/candidates?select=candidate_id,full_name&order=created_at.desc&limit=100`, {
    headers: supabaseAdminHeaders(env),
  })
  if (!candidateResponse.ok) throw new Error('Gagal mengambil daftar kandidat.')
  const candidates = await candidateResponse.json()
  const { results: accounts } = await env.DB.prepare('SELECT * FROM candidate_finance').all()
  const { results: payments } = await env.DB.prepare(
    'SELECT id, candidate_id, amount, payment_date, note FROM candidate_finance_payments ORDER BY payment_date DESC, created_at DESC',
  ).all()
  const applicationByCandidate = new Map(applications.map((item) => [item.candidate_id, item]))
  const accountByCandidate = new Map(accounts.map((item) => [item.candidate_id, item]))
  const paymentsByCandidate = new Map()
  for (const payment of payments) {
    const list = paymentsByCandidate.get(payment.candidate_id) || []
    list.push(payment)
    paymentsByCandidate.set(payment.candidate_id, list)
  }
  return json({
    candidates: candidates.filter((candidate) => applicationByCandidate.has(candidate.candidate_id)).map((candidate) => {
      const application = applicationByCandidate.get(candidate.candidate_id)
      const account = accountByCandidate.get(candidate.candidate_id) || { passport_fee: 0, visa_fee: 0, departure_fee: 0 }
      return {
        ...candidate,
        passport_by_agency: Boolean(application.passport_by_agency),
        visa_by_agency: Boolean(application.visa_by_agency),
        passport_fee: Number(account.passport_fee),
        visa_fee: Number(account.visa_fee),
        departure_fee: Number(account.departure_fee),
        payments: paymentsByCandidate.get(candidate.candidate_id) || [],
      }
    }),
  }, 200, origin)
}

async function updateAdminFinanceEndpoint(request, candidateId, env, origin) {
  const body = await request.json().catch(() => null)
  const values = [Number(body?.passport_fee), Number(body?.visa_fee), Number(body?.departure_fee)]
  if (!values.every((value) => Number.isInteger(value) && value >= 0)) return json({ error: 'Nominal biaya harus berupa angka bulat yang valid.' }, 400, origin)
  await env.DB.prepare(
    `INSERT INTO candidate_finance (candidate_id, passport_fee, visa_fee, departure_fee, updated_at)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(candidate_id) DO UPDATE SET passport_fee = excluded.passport_fee,
     visa_fee = excluded.visa_fee, departure_fee = excluded.departure_fee, updated_at = CURRENT_TIMESTAMP`,
  ).bind(candidateId, ...values).run()
  return json({ ok: true }, 200, origin)
}

async function addAdminFinancePaymentEndpoint(request, candidateId, env, origin) {
  const body = await request.json().catch(() => null)
  const amount = Number(body?.amount)
  const paymentDate = String(body?.payment_date || '')
  const note = String(body?.note || '').trim().slice(0, 240)
  if (!Number.isInteger(amount) || amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) return json({ error: 'Nominal dan tanggal pembayaran wajib valid.' }, 400, origin)
  await env.DB.prepare(
    'INSERT INTO candidate_finance_payments (id, candidate_id, amount, payment_date, note) VALUES (?, ?, ?, ?, ?)',
  ).bind(crypto.randomUUID(), candidateId, amount, paymentDate, note).run()
  return json({ ok: true }, 201, origin)
}

async function candidateFinanceEndpoint(user, token, env, origin) {
  const candidate = await candidateFor(user, token, env)
  if (!candidate) return json({ error: 'Profil kandidat belum tersedia.' }, 404, origin)
  const candidateId = candidate.candidate_id
  const [finance, payments, invoices, proofs, nextStep] = await Promise.all([
    env.DB.prepare(
      'SELECT candidate_id, passport_fee, visa_fee, departure_fee, updated_at FROM candidate_finance WHERE candidate_id = ?',
    ).bind(candidateId).first(),
    env.DB.prepare(
      'SELECT id, candidate_id, amount, payment_date, note, created_at FROM candidate_finance_payments WHERE candidate_id = ? ORDER BY payment_date DESC, created_at DESC',
    ).bind(candidateId).all(),
    env.DB.prepare(
      'SELECT id, candidate_id, invoice_number, amount, currency, due_date, status, description, created_at FROM finance_invoices WHERE candidate_id = ? ORDER BY due_date ASC, created_at ASC',
    ).bind(candidateId).all(),
    env.DB.prepare(
      `SELECT id, payment_id, invoice_id, file_name, content_type, file_size,
              status, review_note, created_at, reviewed_at
       FROM finance_payment_proofs WHERE candidate_id = ? ORDER BY created_at DESC`,
    ).bind(candidateId).all(),
    env.DB.prepare(
      'SELECT status, message, updated_at FROM candidate_next_steps WHERE candidate_id = ?',
    ).bind(candidateId).first(),
  ])
  return json({
    candidate_id: candidateId,
    enabled: Boolean(finance || payments.results.length || invoices.results.length || nextStep),
    finance: finance || { candidate_id: candidateId, passport_fee: 0, visa_fee: 0, departure_fee: 0 },
    payments: payments.results,
    invoices: invoices.results,
    payment_proofs: proofs.results,
    next_step: nextStep || null,
  }, 200, origin)
}

async function uploadFinanceProof(request, user, token, env, origin, targetType, targetId) {
  const candidate = await candidateFor(user, token, env)
  if (!candidate) return json({ error: 'Profil kandidat belum tersedia.' }, 404, origin)
  const target = targetType === 'payment'
    ? await env.DB.prepare(
      'SELECT id, candidate_id FROM candidate_finance_payments WHERE id = ? AND candidate_id = ?',
    ).bind(targetId, candidate.candidate_id).first()
    : await env.DB.prepare(
      'SELECT id, candidate_id FROM finance_invoices WHERE id = ? AND candidate_id = ?',
    ).bind(targetId, candidate.candidate_id).first()
  if (!target) return json({ error: 'Tagihan tidak ditemukan.' }, 404, origin)

  const rateLimitResponse = await enforceUploadRateLimit(request, user, env, origin)
  if (rateLimitResponse) return rateLimitResponse
  const turnstile = await verifyTurnstile(request.headers.get('X-Turnstile-Token'), request, env)
  if (!turnstile.success) return json({ error: 'Verifikasi keamanan gagal. Silakan coba lagi.' }, 403, origin)

  const file = (await request.formData()).get('file')
  if (!(file instanceof File)) return json({ error: 'File bukti pembayaran wajib dipilih.' }, 400, origin)
  if (!ALLOWED_TYPES.has(file.type)) return json({ error: 'Format harus PDF, JPG, atau PNG.' }, 415, origin)
  if (file.size > MAX_FILE_SIZE) return json({ error: 'Ukuran file maksimal 5 MB.' }, 413, origin)

  const id = crypto.randomUUID()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-110) || 'payment-proof'
  const objectKey = `finance-proofs/${safeObjectSegment(candidate.candidate_id)}/${id}-${safeName}`
  await env.DOCUMENTS.put(objectKey, file.stream(), { httpMetadata: { contentType: file.type } })
  try {
    await env.DB.prepare(
      `INSERT INTO finance_payment_proofs
       (id, candidate_id, payment_id, invoice_id, object_key, file_name, content_type, file_size)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      id,
      candidate.candidate_id,
      targetType === 'payment' ? target.id : null,
      targetType === 'invoice' ? target.id : null,
      objectKey,
      file.name,
      file.type,
      file.size,
    ).run()
  } catch (error) {
    await env.DOCUMENTS.delete(objectKey)
    throw error
  }
  return json({
    payment_proof: {
      id,
      payment_id: targetType === 'payment' ? target.id : null,
      invoice_id: targetType === 'invoice' ? target.id : null,
      file_name: file.name,
      content_type: file.type,
      file_size: file.size,
      status: 'pending',
    },
  }, 201, origin)
}

async function listAdminFinanceProofs(request, env, origin) {
  const url = new URL(request.url)
  const status = url.searchParams.get('status')
  const candidateId = url.searchParams.get('candidate_id')
  const conditions = []
  const values = []
  if (status) { conditions.push('status = ?'); values.push(status) }
  if (candidateId) { conditions.push('candidate_id = ?'); values.push(candidateId) }
  const query = `SELECT id, candidate_id, payment_id, invoice_id, file_name, content_type,
                        file_size, status, review_note, reviewed_by, created_at, reviewed_at
                 FROM finance_payment_proofs
                 ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
                 ORDER BY created_at DESC LIMIT 200`
  const { results } = await env.DB.prepare(query).bind(...values).all()
  return json({ payment_proofs: results }, 200, origin)
}

async function downloadAdminFinanceProof(id, env, origin) {
  const proof = await env.DB.prepare(
    'SELECT object_key, file_name, content_type FROM finance_payment_proofs WHERE id = ?',
  ).bind(id).first()
  if (!proof) return json({ error: 'Bukti pembayaran tidak ditemukan.' }, 404, origin)
  const object = await env.DOCUMENTS.get(proof.object_key)
  if (!object) return json({ error: 'File bukti pembayaran tidak tersedia.' }, 404, origin)
  return response(object.body, 200, origin, {
    'Content-Type': proof.content_type,
    'Content-Disposition': `inline; filename="${proof.file_name.replace(/["\r\n]/g, '_')}"`,
  })
}

async function reviewFinanceProof(request, admin, id, env, origin) {
  const payload = await request.json().catch(() => null)
  if (!['accepted', 'rejected'].includes(payload?.status)) {
    return json({ error: 'Status review harus accepted atau rejected.' }, 400, origin)
  }
  const note = typeof payload.review_note === 'string' ? payload.review_note.trim().slice(0, 1000) : ''
  const result = await env.DB.prepare(
    `UPDATE finance_payment_proofs
     SET status = ?, review_note = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
     WHERE id = ? AND status = 'pending'`,
  ).bind(payload.status, note, admin.id, id).run()
  if (!result.meta?.changes) return json({ error: 'Bukti tidak ditemukan atau sudah direview.' }, 404, origin)
  return json({ id, status: payload.status, review_note: note }, 200, origin)
}

async function updateCandidateNextStep(request, candidateId, env, origin) {
  const payload = await request.json().catch(() => null)
  const status = typeof payload?.status === 'string' ? payload.status.trim().slice(0, 80) : ''
  const message = typeof payload?.message === 'string' ? payload.message.trim().slice(0, 2000) : ''
  if (!status) return json({ error: 'Status langkah berikutnya wajib diisi.' }, 400, origin)
  await env.DB.prepare(
    `INSERT INTO candidate_next_steps (candidate_id, status, message, updated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(candidate_id) DO UPDATE SET
       status = excluded.status, message = excluded.message, updated_at = CURRENT_TIMESTAMP`,
  ).bind(candidateId, status, message).run()
  return json({ candidate_id: candidateId, status, message }, 200, origin)
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
      if (url.pathname === '/account/role' && request.method === 'GET') {
        if (isAdminUser(user, env)) return json({ role: 'admin' }, 200, origin)
        const candidate = await candidateFor(user, authToken(request), env)
        return json({ role: candidate ? 'candidate' : 'unassigned' }, 200, origin)
      }
      if (url.pathname === '/admin/documents' && request.method === 'GET') {
        if (!await authenticateAdmin(request, env)) return json({ error: 'Akses admin ditolak.' }, 403, origin)
        return listAllAdminDocuments(env, origin)
      }
      if (url.pathname === '/admin/finance' && request.method === 'GET') {
        if (!await authenticateAdmin(request, env)) return json({ error: 'Akses admin ditolak.' }, 403, origin)
        return listAdminFinanceEndpoint(env, origin)
      }
      if (url.pathname === '/finance' && request.method === 'GET') {
        if (isAdminUser(user, env)) return json({ error: 'Akun admin tidak dapat digunakan sebagai peserta.' }, 403, origin)
        return candidateFinanceEndpoint(user, authToken(request), env, origin)
      }
      const financeProofMatch = url.pathname.match(/^\/finance\/(payments|invoices)\/([^/]+)\/proof$/)
      if (financeProofMatch && request.method === 'POST') {
        if (isAdminUser(user, env)) return json({ error: 'Akun admin tidak dapat digunakan sebagai peserta.' }, 403, origin)
        return uploadFinanceProof(
          request,
          user,
          authToken(request),
          env,
          origin,
          financeProofMatch[1] === 'payments' ? 'payment' : 'invoice',
          decodeURIComponent(financeProofMatch[2]),
        )
      }
      if (url.pathname === '/admin/finance/proofs' && request.method === 'GET') {
        if (!await authenticateAdmin(request, env)) return json({ error: 'Akses admin ditolak.' }, 403, origin)
        return listAdminFinanceProofs(request, env, origin)
      }
      const financeProofReviewMatch = url.pathname.match(/^\/admin\/finance\/proofs\/([^/]+)$/)
      if (financeProofReviewMatch && request.method === 'PATCH') {
        const admin = await authenticateAdmin(request, env)
        if (!admin) return json({ error: 'Akses admin ditolak.' }, 403, origin)
        return reviewFinanceProof(request, admin, decodeURIComponent(financeProofReviewMatch[1]), env, origin)
      }
      const financeProofFileMatch = url.pathname.match(/^\/admin\/finance\/proofs\/([^/]+)\/file$/)
      if (financeProofFileMatch && request.method === 'GET') {
        if (!await authenticateAdmin(request, env)) return json({ error: 'Akses admin ditolak.' }, 403, origin)
        return downloadAdminFinanceProof(decodeURIComponent(financeProofFileMatch[1]), env, origin)
      }
      const nextStepMatch = url.pathname.match(/^\/admin\/candidates\/([^/]+)\/next-step$/)
      if (nextStepMatch && request.method === 'PATCH') {
        if (!await authenticateAdmin(request, env)) return json({ error: 'Akses admin ditolak.' }, 403, origin)
        return updateCandidateNextStep(request, decodeURIComponent(nextStepMatch[1]), env, origin)
      }
      const financeMatch = url.pathname.match(/^\/admin\/finance\/([^/]+)$/)
      if (financeMatch && request.method === 'PATCH') {
        if (!await authenticateAdmin(request, env)) return json({ error: 'Akses admin ditolak.' }, 403, origin)
        return updateAdminFinanceEndpoint(request, decodeURIComponent(financeMatch[1]), env, origin)
      }
      if (financeMatch && request.method === 'POST') {
        if (!await authenticateAdmin(request, env)) return json({ error: 'Akses admin ditolak.' }, 403, origin)
        return addAdminFinancePaymentEndpoint(request, decodeURIComponent(financeMatch[1]), env, origin)
      }
      const adminCollectiveMatch = url.pathname.match(/^\/admin\/candidates\/([^/]+)\/collective$/)
      if (adminCollectiveMatch && request.method === 'POST') {
        if (!await authenticateAdmin(request, env)) return json({ error: 'Akses admin ditolak.' }, 403, origin)
        return uploadAdminCollectiveDocuments(request, decodeURIComponent(adminCollectiveMatch[1]), env, origin)
      }
      const adminDocumentMatch = url.pathname.match(/^\/admin\/candidates\/([^/]+)\/documents$/)
      if (adminDocumentMatch && request.method === 'GET') {
        if (!await authenticateAdmin(request, env)) return json({ error: 'Akses admin ditolak.' }, 403, origin)
        return listAdminDocuments(decodeURIComponent(adminDocumentMatch[1]), env, origin)
      }
      const adminDownloadMatch = url.pathname.match(/^\/admin\/documents\/([^/]+)$/)
      if (adminDownloadMatch && request.method === 'PATCH') {
        if (!await authenticateAdmin(request, env)) return json({ error: 'Akses admin ditolak.' }, 403, origin)
        return reviewAdminDocument(request, decodeURIComponent(adminDownloadMatch[1]), env, origin)
      }
      if (adminDownloadMatch && request.method === 'GET') {
        if (!await authenticateAdmin(request, env)) return json({ error: 'Akses admin ditolak.' }, 403, origin)
        return downloadAdminDocument(decodeURIComponent(adminDownloadMatch[1]), env, origin)
      }
      const normalizeStorageMatch = url.pathname.match(/^\/admin\/candidates\/([^/]+)\/normalize-storage$/)
      if (normalizeStorageMatch && request.method === 'POST') {
        if (!await authenticateAdmin(request, env)) return json({ error: 'Akses admin ditolak.' }, 403, origin)
        return normalizeCandidateStorage(decodeURIComponent(normalizeStorageMatch[1]), env, origin)
      }
      if (url.pathname === '/documents' && request.method === 'GET') {
        if (isAdminUser(user, env)) return json({ error: 'Akun admin tidak dapat digunakan sebagai peserta.' }, 403, origin)
        return listDocuments(user.id, env, origin)
      }
      if (url.pathname === '/documents' && request.method === 'POST') {
        if (isAdminUser(user, env)) return json({ error: 'Akun admin tidak dapat digunakan sebagai peserta.' }, 403, origin)
        const rateLimitResponse = await enforceUploadRateLimit(request, user, env, origin)
        if (rateLimitResponse) return rateLimitResponse
        const token = authToken(request)
        return uploadDocuments(request, user, token, env, origin)
      }
      if (url.pathname === '/applications' && request.method === 'POST') {
        if (isAdminUser(user, env)) return json({ error: 'Akun admin tidak dapat digunakan sebagai peserta.' }, 403, origin)
        const token = authToken(request)
        return submitApplication(request, user, token, env, origin)
      }

      const match = url.pathname.match(/^\/documents\/([^/]+)$/)
      if (match && isAdminUser(user, env)) return json({ error: 'Akun admin tidak dapat digunakan sebagai peserta.' }, 403, origin)
      if (match && request.method === 'GET') return downloadDocument(request, user, match[1], env, origin)
      if (match && request.method === 'DELETE') return deleteDocument(user, match[1], env, origin)
      return json({ error: 'Endpoint tidak ditemukan.' }, 404, origin)
    } catch (error) {
      console.error(error)
      return json({ error: 'Terjadi kesalahan saat memproses dokumen.' }, 500, origin)
    }
  },
}
