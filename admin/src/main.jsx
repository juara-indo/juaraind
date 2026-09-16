import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { getSupabase, isConfigured } from './supabaseClient.js'
import './styles.css'

const apiUrl = import.meta.env.VITE_DOCUMENTS_API_URL

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [candidates, setCandidates] = useState([])
  const [selected, setSelected] = useState(null)
  const [documents, setDocuments] = useState([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    if (!isConfigured) { setLoading(false); return undefined }
    getSupabase().then(async (supabase) => {
      const { data } = await supabase.auth.getSession()
      if (mounted) { setSession(data.session); setLoading(false) }
      supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    })
    return () => { mounted = false }
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
      setCandidates((await request(`/admin/candidates${query ? `?q=${encodeURIComponent(query)}` : ''}`)).candidates)
    } catch (requestError) { setError(requestError.message) }
  }

  useEffect(() => { if (session) loadCandidates() }, [session])

  const selectCandidate = async (candidate) => {
    try {
      setSelected(candidate)
      setDocuments((await request(`/admin/candidates/${encodeURIComponent(candidate.candidate_id)}/documents`)).documents)
    } catch (requestError) { setError(requestError.message) }
  }

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
      <header><div><span className="eyebrow">PT. JUARA · ADMIN</span><h1>Dokumen kandidat</h1></div><button onClick={() => getSupabase().then((supabase) => supabase.auth.signOut())}>Keluar</button></header>
      <section className="toolbar"><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && loadCandidates()} placeholder="Cari ID atau nama peserta" /><button onClick={loadCandidates}>Cari</button></section>
      {error && <p className="error">{error}</p>}
      <div className="layout">
        <section className="panel"><h2>Peserta ({candidates.length})</h2>{candidates.map((candidate) => <button className={`candidate ${selected?.id === candidate.id ? 'selected' : ''}`} key={candidate.id} onClick={() => selectCandidate(candidate)}><strong>{candidate.candidate_id}</strong><span>{candidate.full_name || 'Nama belum diisi'}</span><small>{candidate.document_count} dokumen</small></button>)}</section>
        <section className="panel details">{selected ? <><h2>{selected.candidate_id}</h2><p>{selected.full_name || 'Nama belum diisi'} · {selected.city || 'Kota belum diisi'}</p><div className="docs">{documents.map((item) => <div className="doc" key={item.id}><div><strong>{item.document_type.toUpperCase()}</strong><span>{item.file_name} · {(item.file_size / 1024 / 1024).toFixed(2)} MB</span></div><button onClick={() => download(item)}>Download</button></div>)}</div></> : <div className="empty">Pilih peserta untuk melihat dokumen.</div>}</section>
      </div>
    </main>
  )
}

function Login() {
  const login = async () => (await getSupabase())?.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } })
  return <main className="center"><div className="login"><span className="eyebrow">PT. JUARA · ADMIN</span><h1>Kelola dokumen kandidat</h1><p>Login Google hanya dapat digunakan oleh email yang telah didaftarkan sebagai admin.</p><button onClick={login}>Masuk dengan Google</button></div></main>
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
