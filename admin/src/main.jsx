import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import JSZip from 'jszip'
import { getSupabase, isConfigured } from './supabaseClient.js'
import './styles.css'

const apiUrl = import.meta.env.VITE_DOCUMENTS_API_URL

function Icon({ name, size = 18 }) {
  const paths = {
    close: <><path d="m5 5 14 14M19 5 5 19" /></>,
    download: <><path d="M12 3v12M7 10l5 5 5-5M4 21h16" /></>,
    ktp: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8" cy="11" r="2" /><path d="M5.5 16c.7-1.3 1.5-2 2.5-2s1.8.7 2.5 2M13 10h5M13 14h4" /></>,
    kk: <><path d="M16 20v-1.5a3.5 3.5 0 0 0-7 0V20M12.5 8.5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0ZM20 20v-1a3 3 0 0 0-2.2-2.9M15.5 6.2a2.5 2.5 0 0 1 0 4.8" /></>,
    ijazah: <><path d="M4 4h16v16H4zM8 8h8M8 12h8M8 16h5" /><path d="m16 16 2 2 3-3" /></>,
    cv: <><path d="M6 3h9l3 3v15H6zM15 3v4h4M9 11h6M9 15h6M9 19h4" /></>,
    paspor: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.2 2.4 3.3 5.4 3.3 9s-1.1 6.6-3.3 9c-2.2-2.4-3.3-5.4-3.3-9S9.8 5.4 12 3Z" /></>,
    visa: <><path d="m3 12 18-6-6 18-3-8-9-4Z" /><path d="m12 16 4-4" /></>,
    pendukung: <><path d="M3 7h7l2 2h9v10H3z" /><path d="M3 7V5h7l2 2" /></>,
  }
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [candidates, setCandidates] = useState([])
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [downloadingCandidateId, setDownloadingCandidateId] = useState(null)
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

  const downloadAll = async (candidate) => {
    if (!candidate.documents.length) return
    try {
      setError('')
      setDownloadingCandidateId(candidate.candidate_id)
      const zip = new JSZip()
      const folderName = `${candidate.candidate_id} - ${candidate.full_name || 'Nama belum diisi'}`
      const folder = zip.folder(folderName)
      const usedNames = new Map()
      for (const item of candidate.documents) {
        const response = await fetch(`${apiUrl}/admin/documents/${encodeURIComponent(item.id)}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!response.ok) throw new Error(`Dokumen ${item.document_type.toUpperCase()} tidak dapat diunduh.`)
        const extension = item.file_name.includes('.') ? `.${item.file_name.split('.').pop()}` : ''
        const baseName = item.document_type.toUpperCase()
        const count = (usedNames.get(baseName) || 0) + 1
        usedNames.set(baseName, count)
        folder.file(`${baseName}${count > 1 ? `-${count}` : ''}${extension}`, await response.arrayBuffer())
      }
      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${folderName}.zip`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (downloadError) {
      setError(downloadError.message)
    } finally {
      setDownloadingCandidateId(null)
    }
  }

  if (loading) return <main className="center">Memeriksa sesi admin...</main>
  if (!session) return <Login />
  return (
    <main>
      <header><div><span className="eyebrow">PT. JUARA · ADMIN</span><h1>Dokumen kandidat</h1></div><button onClick={() => getSupabase()?.auth.signOut()}>Keluar</button></header>
      <section className="toolbar"><button onClick={loadCandidates}>Muat ulang peserta</button></section>
      {error && <p className="error">{error}</p>}
      <section className="panel"><h2>Daftar peserta ({candidates.length})</h2><div className="table-wrap"><table><thead><tr><th>No</th><th>Nama</th><th>ID Peserta</th><th>Dokumen</th></tr></thead><tbody>{candidates.map((candidate, index) => <tr key={candidate.candidate_id}><td>{index + 1}</td><td>{candidate.full_name || 'Nama belum diisi'}</td><td>{candidate.candidate_id}</td><td><button onClick={() => setSelectedCandidate(candidate)}>Lihat dokumen ({candidate.documents.length})</button></td></tr>)}</tbody></table></div>{!candidates.length && <div className="empty">Belum ada peserta.</div>}</section>
      {selectedCandidate && <div className="modal-backdrop" role="presentation" onClick={() => setSelectedCandidate(null)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="documents-title" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="eyebrow">DOKUMEN PESERTA</span><h2 id="documents-title">{selectedCandidate.full_name || 'Nama belum diisi'}</h2><p>{selectedCandidate.candidate_id}</p></div><button className="icon-button" aria-label="Tutup detail dokumen" title="Tutup" onClick={() => setSelectedCandidate(null)}><Icon name="close" /></button></div>{selectedCandidate.documents.length > 0 && <button className="download-all icon-button" aria-label="Download semua dokumen" title="Download semua dokumen" disabled={downloadingCandidateId === selectedCandidate.candidate_id} onClick={() => downloadAll(selectedCandidate)}>{downloadingCandidateId === selectedCandidate.candidate_id ? <span className="spinner" aria-label="Menyiapkan download" /> : <Icon name="download" />}</button>}<div className="docs">{selectedCandidate.documents.map((item) => <div className="doc" key={item.id}><div className="doc-label"><span className="document-icon"><Icon name={item.document_type} /></span><strong>{item.document_type.toUpperCase()}</strong></div><button className="icon-button" aria-label={`Download ${item.document_type}`} title={`Download ${item.document_type}`} onClick={() => download(item)}><Icon name="download" /></button></div>)}</div>{!selectedCandidate.documents.length && <div className="empty">Belum ada dokumen.</div>}</section></div>}
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
