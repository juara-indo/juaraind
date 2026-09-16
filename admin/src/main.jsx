import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { getSupabase, isConfigured } from './supabaseClient.js'
import './styles.css'

const apiUrl = import.meta.env.VITE_DOCUMENTS_API_URL

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [candidates, setCandidates] = useState([])
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    if (!isConfigured) { setLoading(false); return undefined }
    const supabase = getSupabase()
    if (!supabase) { setLoading(false); return undefined }
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (mounted) { setSession(data.session); setLoading(false) }
    }
    loadSession()
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        setSession(nextSession)
        setLoading(false)
      }
    })
    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const request = async (path) => {
    const response = await fetch(`${apiUrl}${path}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(payload?.error || 'Permintaan gagal.')
    return payload
  }

  const loadCandidates = async () => {
    try {
      setError('')
      setCandidates((await request('/admin/documents')).candidates)
    } catch (requestError) { setError(requestError.message) }
  }

  useEffect(() => { if (session) loadCandidates() }, [session])

  const download = async (item) => {
    const response = await fetch(`${apiUrl}/admin/documents/${encodeURIComponent(item.id)}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (!response.ok) throw new Error('Dokumen tidak dapat diunduh.')
    const url = URL.createObjectURL(await response.blob())
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = item.file_name
    anchor.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <main className="center">Memeriksa sesi admin...</main>
  if (!session) return <Login />
  return (
    <main>
      <header><div><span className="eyebrow">PT. JUARA · ADMIN</span><h1>Dokumen kandidat</h1></div><button onClick={() => getSupabase()?.auth.signOut()}>Keluar</button></header>
      <section className="toolbar"><button onClick={loadCandidates}>Muat ulang peserta</button></section>
      {error && <p className="error">{error}</p>}
      <section className="panel"><h2>Daftar peserta ({candidates.length})</h2><div className="table-wrap"><table><thead><tr><th>No</th><th>Nama</th><th>ID Peserta</th><th>Dokumen</th></tr></thead><tbody>{candidates.map((candidate, index) => <tr key={candidate.candidate_id}><td>{index + 1}</td><td>{candidate.full_name || 'Nama belum diisi'}</td><td>{candidate.candidate_id}</td><td><button onClick={() => setSelectedCandidate(candidate)}>Lihat dokumen ({candidate.documents.length})</button></td></tr>)}</tbody></table></div>{!candidates.length && <div className="empty">Belum ada peserta.</div>}</section>
      {selectedCandidate && <div className="modal-backdrop" role="presentation" onClick={() => setSelectedCandidate(null)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="documents-title" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="eyebrow">DOKUMEN PESERTA</span><h2 id="documents-title">{selectedCandidate.full_name || 'Nama belum diisi'}</h2><p>{selectedCandidate.candidate_id}</p></div><button onClick={() => setSelectedCandidate(null)}>Tutup</button></div><div className="docs">{selectedCandidate.documents.map((item) => <div className="doc" key={item.id}><div><strong>{item.document_type.toUpperCase()}</strong><span>{item.file_name} · {(item.file_size / 1024 / 1024).toFixed(2)} MB</span></div><button onClick={() => download(item)}>Download</button></div>)}</div>{!selectedCandidate.documents.length && <div className="empty">Belum ada dokumen.</div>}</section></div>}
    </main>
  )
}

function Login() {
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const login = async () => {
    setError('')
    setSubmitting(true)
    const supabase = getSupabase()
    if (!supabase) {
      setError('Konfigurasi login belum tersedia.')
      setSubmitting(false)
      return
    }
    const { data, error: loginError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    })
    if (loginError) {
      setError(loginError.message)
      setSubmitting(false)
      return
    }
    if (data?.url) window.location.assign(data.url)
  }
  return <main className="center"><div className="login"><span className="eyebrow">PT. JUARA · ADMIN</span><h1>Kelola dokumen kandidat</h1><p>Login Google hanya dapat digunakan oleh email yang telah didaftarkan sebagai admin.</p>{error && <p className="error">{error}</p>}<button onClick={login} disabled={submitting}>{submitting ? 'Membuka Google...' : 'Masuk dengan Google'}</button></div></main>
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
