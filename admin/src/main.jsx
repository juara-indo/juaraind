import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import JSZip from 'jszip'
import { getSupabase, isConfigured } from './supabaseClient.js'
import './styles.css'

const apiUrl = import.meta.env.VITE_DOCUMENTS_API_URL
const biodataFields = ['full_name', 'birth_place', 'birth_date', 'gender', 'phone', 'address', 'province', 'city', 'postal_code', 'experience']

function isBiodataComplete(candidate) {
  return biodataFields.every((field) => String(candidate[field] || '').trim())
}

function Icon({ name, size = 18 }) {
  const paths = {
    close: <><path d="m5 5 14 14M19 5 5 19" /></>,
    download: <><path d="M12 3v12M7 10l5 5 5-5M4 21h16" /></>,
    ktp: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8" cy="11" r="2" /><path d="M5.5 16c.7-1.3 1.5-2 2.5-2s1.8.7 2.5 2M13 10h5M13 14h4" /></>,
    kk: <><path d="M16 20v-1.5a3.5 3.5 0 0 0-7 0V20M12.5 8.5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0ZM20 20v-1a3 3 0 0 0-2.2-2.9M15.5 6.2a2.5 2.5 0 0 1 0 4.8" /></>,
    ijazah: <><path d="M4 4h16v16H4zM8 8h8M8 12h8M8 16h5" /><path d="m16 16 2 2 3-3" /></>,
    cv: <><path d="M6 3h9l3 3v15H6zM15 3v4h4M9 11h6M9 15h6M9 19h4" /></>,
    pas_photo: <><circle cx="12" cy="8" r="3" /><path d="M5 20c.8-4 3.1-6 7-6s6.2 2 7 6" /></>,
    paspor: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.2 2.4 3.3 5.4 3.3 9s-1.1 6.6-3.3 9c-2.2-2.4-3.3-5.4-3.3-9S9.8 5.4 12 3Z" /></>,
    visa: <><path d="m3 12 18-6-6 18-3-8-9-4Z" /><path d="m12 16 4-4" /></>,
    pendukung: <><path d="M3 7h7l2 2h9v10H3z" /><path d="M3 7V5h7l2 2" /></>,
  }
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const readSessionCache = (key, fallback) => {
    try {
      const value = sessionStorage.getItem(key)
      return value ? JSON.parse(value) : fallback
    } catch {
      return fallback
    }
  }
  const [candidates, setCandidates] = useState(() => readSessionCache('juara-admin-candidates', []))
  const [financeCandidates, setFinanceCandidates] = useState(() => readSessionCache('juara-admin-finance', []))
  const [activeTab, setActiveTabState] = useState(() => {
    try { return sessionStorage.getItem('juara-admin-tab') || 'candidates' } catch { return 'candidates' }
  })
  const [selectedFinanceCandidate, setSelectedFinanceCandidate] = useState(null)
  const [financeForm, setFinanceForm] = useState(null)
  const [paymentForm, setPaymentForm] = useState({ amount: '', payment_date: new Date().toISOString().slice(0, 10), note: '' })
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [selectedBiodata, setSelectedBiodata] = useState(null)
  const [selectedCollectiveCandidate, setSelectedCollectiveCandidate] = useState(null)
  const [collectiveFiles, setCollectiveFiles] = useState({})
  const [collectiveConvertingCandidateId, setCollectiveConvertingCandidateId] = useState(null)
  const [downloadingCandidateId, setDownloadingCandidateId] = useState(null)
  const [selectedPreview, setSelectedPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [reviewingDocumentId, setReviewingDocumentId] = useState(null)
  const [error, setError] = useState('')
  const setActiveTab = (tab) => {
    sessionStorage.setItem('juara-admin-tab', tab)
    setActiveTabState(tab)
  }

  useEffect(() => {
    const modalOpen = Boolean(selectedCandidate || selectedBiodata || selectedCollectiveCandidate || selectedPreview || selectedFinanceCandidate || selectedInvoice)
    if (!modalOpen) return undefined
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return
      if (selectedInvoice) setSelectedInvoice(null)
      else if (selectedPreview) closePreview()
      else if (selectedCandidate) setSelectedCandidate(null)
      else if (selectedBiodata) setSelectedBiodata(null)
      else if (selectedCollectiveCandidate && selectedCollectiveCandidate.candidate_id !== collectiveConvertingCandidateId) setSelectedCollectiveCandidate(null)
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [selectedCandidate, selectedBiodata, selectedCollectiveCandidate, selectedPreview, selectedFinanceCandidate, selectedInvoice, collectiveConvertingCandidateId])

  useEffect(() => {
    let mounted = true
    if (!isConfigured) { setLoading(false); return undefined }
    const supabase = getSupabase()
    if (!supabase) { setLoading(false); return undefined }
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      setSession(data.session)
      setLoading(false)
      if (!data.session) return
      const { data: refreshed } = await supabase.auth.refreshSession()
      if (mounted && refreshed.session) setSession(refreshed.session)
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

  const authHeaders = () => ({ Authorization: `Bearer ${session.access_token}` })

  const request = async (path) => {
    const response = await fetch(`${apiUrl}${path}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(payload?.error || 'Permintaan gagal.')
    return payload
  }

  const requestForm = async (path, formData) => {
    const response = await fetch(`${apiUrl}${path}`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(payload?.error || 'Permintaan gagal.')
    return payload
  }

  const requestJson = async (path, method, body) => {
    const response = await fetch(`${apiUrl}${path}`, {
      method,
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(payload?.error || 'Permintaan gagal.')
    return payload
  }

  const loadCandidates = async () => {
    try {
      setError('')
      const nextCandidates = (await request('/admin/documents')).candidates
      setCandidates(nextCandidates)
      sessionStorage.setItem('juara-admin-candidates', JSON.stringify(nextCandidates))
    } catch (requestError) { setError(requestError.message) }
  }

  const loadFinance = async () => {
    try {
      setError('')
      const nextFinanceCandidates = (await request('/admin/finance')).candidates
      setFinanceCandidates(nextFinanceCandidates)
      sessionStorage.setItem('juara-admin-finance', JSON.stringify(nextFinanceCandidates))
    } catch (requestError) { setError(requestError.message) }
  }

  useEffect(() => { if (session) loadCandidates() }, [session])
  useEffect(() => { if (session && activeTab === 'finance') loadFinance() }, [session, activeTab])

  const formatCurrency = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
  const formatCurrencyInput = (value) => formatCurrency(Number(value) || 0)
  const parseCurrencyInput = (value) => value.replace(/\D/g, '')
  const financeTotal = (candidate) => Number(candidate.passport_fee) + Number(candidate.visa_fee) + Number(candidate.departure_fee)
  const financePaid = (candidate) => candidate.payments.reduce((total, payment) => total + Number(payment.amount), 0)
  const openFinance = (candidate) => {
    setSelectedFinanceCandidate(candidate)
    setFinanceForm({ passport_fee: candidate.passport_fee, visa_fee: candidate.visa_fee, departure_fee: candidate.departure_fee })
    setPaymentForm({ amount: '', payment_date: new Date().toISOString().slice(0, 10), note: '' })
  }
  const saveFinance = async () => {
    try {
      await requestJson(`/admin/finance/${encodeURIComponent(selectedFinanceCandidate.candidate_id)}`, 'PATCH', financeForm)
      await loadFinance()
      setSelectedFinanceCandidate(null)
    } catch (requestError) { setError(requestError.message) }
  }
  const addPayment = async () => {
    try {
      await requestJson(`/admin/finance/${encodeURIComponent(selectedFinanceCandidate.candidate_id)}`, 'POST', paymentForm)
      await loadFinance()
      setSelectedFinanceCandidate(null)
    } catch (requestError) { setError(requestError.message) }
  }
  const openInvoice = (candidate, payment, paymentIndex) => {
    const paidBefore = candidate.payments.slice(0, paymentIndex).reduce((total, item) => total + Number(item.amount), 0)
    const paidThrough = paidBefore + Number(payment.amount)
    setSelectedInvoice({
      candidate,
      payment,
      installmentNumber: paymentIndex + 1,
      paidThrough,
      remaining: Math.max(financeTotal(candidate) - paidThrough, 0),
    })
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

  const preview = async (item) => {
    try {
      setError('')
      setPreviewLoading(true)
      const response = await fetch(`${apiUrl}/admin/documents/${encodeURIComponent(item.id)}`, { headers: authHeaders() })
      if (!response.ok) throw new Error('Dokumen tidak dapat dibuka.')
      const url = URL.createObjectURL(await response.blob())
      setSelectedPreview({ item, url })
    } catch (previewError) {
      setError(previewError.message)
    } finally {
      setPreviewLoading(false)
    }
  }

  const closePreview = () => {
    if (selectedPreview) URL.revokeObjectURL(selectedPreview.url)
    setSelectedPreview(null)
  }

  const reviewDocument = async (item, status) => {
    try {
      setReviewingDocumentId(item.id)
      setError('')
      await fetch(`${apiUrl}/admin/documents/${encodeURIComponent(item.id)}`, {
        method: 'PATCH',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }).then(async (response) => {
        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(payload?.error || 'Status dokumen gagal diperbarui.')
      })
      setCandidates((current) => current.map((candidate) => ({
        ...candidate,
        documents: candidate.documents.map((document) => document.id === item.id ? { ...document, validation_status: status, reviewed_at: new Date().toISOString() } : document),
      })))
      setSelectedCandidate((current) => current ? {
        ...current,
        documents: current.documents.map((document) => document.id === item.id ? { ...document, validation_status: status, reviewed_at: new Date().toISOString() } : document),
      } : current)
      setSelectedPreview((current) => current?.item.id === item.id
        ? { ...current, item: { ...current.item, validation_status: status, reviewed_at: new Date().toISOString() } }
        : current)
    } catch (reviewError) {
      setError(reviewError.message)
    } finally {
      setReviewingDocumentId(null)
    }
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

  const collectiveTypes = (candidate) => [
    ...(candidate.passport_by_agency ? ['paspor'] : []),
    ...(candidate.visa_by_agency ? ['visa'] : []),
  ]
  const isDocumentsComplete = (candidate) => {
    const uploadedTypes = new Set(candidate.documents.map((document) => document.document_type))
    const requiredTypes = ['ktp', 'kk', 'ijazah', 'cv', ...collectiveTypes(candidate)]
    return requiredTypes.every((type) => uploadedTypes.has(type))
  }
  const handleCollectiveFile = (candidate, type, file) => {
    if (!file) return
    setCollectiveFiles((current) => ({
      ...current,
      [candidate.candidate_id]: { ...(current[candidate.candidate_id] || {}), [type]: file },
    }))
  }
  const convertCollective = async (candidate) => {
    if (collectiveConvertingCandidateId === candidate.candidate_id) return false
    const files = collectiveFiles[candidate.candidate_id] || {}
    const types = collectiveTypes(candidate)
    const formData = new FormData()
    types.forEach((type) => {
      formData.append('files', files[type])
      formData.append('document_types', type)
    })
    try {
      setCollectiveConvertingCandidateId(candidate.candidate_id)
      setError('')
      await requestForm(`/admin/candidates/${encodeURIComponent(candidate.candidate_id)}/collective`, formData)
      setCollectiveFiles((current) => ({ ...current, [candidate.candidate_id]: {} }))
      await loadCandidates()
      return true
    } catch (requestError) { setError(requestError.message) }
    finally { setCollectiveConvertingCandidateId(null) }
    return false
  }

  if (loading) return <main className="center">Memeriksa sesi admin...</main>
  if (!session) return <Login />
  return (
    <main>
      <header><div><span className="eyebrow">PT. JUARA · ADMIN</span><h1 className="admin-title">{activeTab === 'finance' ? 'Keuangan kandidat' : 'Dokumen kandidat'}</h1><p className="candidate-count">{activeTab === 'finance' ? `${financeCandidates.length} kandidat kolektif` : `${candidates.length} peserta`}</p></div><div className="header-actions"><button className="icon-button reload-button" aria-label="Muat ulang peserta" title="Muat ulang peserta" onClick={activeTab === 'finance' ? loadFinance : loadCandidates}><img src="/reload.svg" alt="" /></button><button onClick={() => getSupabase()?.auth.signOut()}>Keluar</button></div></header>
      <nav className="admin-tabs" aria-label="Menu admin"><button className={activeTab === 'candidates' ? 'active' : ''} onClick={() => setActiveTab('candidates')}>Dokumen kandidat</button><button className={activeTab === 'finance' ? 'active' : ''} onClick={() => setActiveTab('finance')}>Keuangan kolektif</button></nav>
      {error && <p className="error">{error}</p>}
      {activeTab === 'candidates' ? <section className="panel"><div className="table-wrap"><table className="candidate-table"><thead><tr><th>No</th><th>Kandidat</th><th>Biodata</th><th>Kolektif</th><th>Dokumen</th></tr></thead><tbody>{candidates.map((candidate, index) => { const biodataComplete = isBiodataComplete(candidate); const documentsComplete = isDocumentsComplete(candidate); const types = collectiveTypes(candidate); const files = collectiveFiles[candidate.candidate_id] || {}; const collectiveDone = types.length > 0 && types.every((type) => candidate.documents.some((document) => document.document_type === type)); return <tr key={candidate.candidate_id}><td>{index + 1}</td><td className="candidate-cell"><span className="candidate-name">{candidate.full_name || 'Nama belum diisi'}</span><strong className="candidate-id">{candidate.candidate_id}</strong></td><td><button className={`documents-button biodata-button ${biodataComplete ? 'is-complete' : 'is-incomplete'}`} title={biodataComplete ? 'Biodata lengkap' : 'Biodata belum lengkap'} onClick={() => setSelectedBiodata(candidate)}>Biodata</button></td><td>{!types.length || collectiveDone ? <button className="documents-button collective-button" disabled>Tidak aktif</button> : <button className={`documents-button collective-button ${files[types[0]] ? 'is-ready' : ''}`} onClick={() => setSelectedCollectiveCandidate(candidate)}>Upload</button>}</td><td><button className={`documents-button documents-status-button ${documentsComplete ? 'is-complete' : 'is-incomplete'}`} title={documentsComplete ? 'Dokumen lengkap' : 'Dokumen belum lengkap'} onClick={() => setSelectedCandidate(candidate)}>Lihat dokumen <span className="document-count">({candidate.documents.length})</span></button></td></tr> })}</tbody></table></div>{!candidates.length && <div className="empty">Belum ada peserta.</div>}</section> : <section className="panel"><div className="table-wrap"><table><thead><tr><th>No</th><th>Kandidat</th><th>Paspor</th><th>Visa</th><th>Keberangkatan</th><th>Dibayar</th><th>Sisa</th><th>Aksi</th></tr></thead><tbody>{financeCandidates.map((candidate, index) => { const total = financeTotal(candidate); const paid = financePaid(candidate); return <tr key={candidate.candidate_id}><td>{index + 1}</td><td className="candidate-cell"><span className="candidate-name">{candidate.full_name || 'Nama belum diisi'}</span><strong className="candidate-id">{candidate.candidate_id}</strong></td><td>{candidate.passport_by_agency ? formatCurrency(candidate.passport_fee) : '-'}</td><td>{candidate.visa_by_agency ? formatCurrency(candidate.visa_fee) : '-'}</td><td>{formatCurrency(candidate.departure_fee)}</td><td>{formatCurrency(paid)}</td><td className={paid >= total ? 'finance-paid' : 'finance-due'}>{formatCurrency(Math.max(total - paid, 0))}</td><td><button className="documents-button" onClick={() => openFinance(candidate)}>Kelola</button></td></tr>})}</tbody></table></div>{!financeCandidates.length && <div className="empty">Belum ada kandidat dengan jasa kolektif.</div>}</section>}
      {selectedFinanceCandidate && financeForm && <div className="modal-backdrop" role="presentation" onClick={() => setSelectedFinanceCandidate(null)}><section className="modal finance-modal" role="dialog" aria-modal="true" aria-labelledby="finance-title" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="eyebrow">KEUANGAN KOLEKTIF</span><h2 id="finance-title">{selectedFinanceCandidate.full_name || 'Nama belum diisi'}</h2><p>{selectedFinanceCandidate.candidate_id}</p></div><button className="icon-button" aria-label="Tutup keuangan" title="Tutup" onClick={() => setSelectedFinanceCandidate(null)}><Icon name="close" /></button></div><div className="finance-fields"><label><span>Jasa paspor</span><input inputMode="numeric" value={formatCurrencyInput(financeForm.passport_fee)} onChange={(event) => setFinanceForm({ ...financeForm, passport_fee: parseCurrencyInput(event.target.value) })} /></label><label><span>Jasa visa</span><input inputMode="numeric" value={formatCurrencyInput(financeForm.visa_fee)} onChange={(event) => setFinanceForm({ ...financeForm, visa_fee: parseCurrencyInput(event.target.value) })} /></label><label><span>Biaya keberangkatan</span><input inputMode="numeric" value={formatCurrencyInput(financeForm.departure_fee)} onChange={(event) => setFinanceForm({ ...financeForm, departure_fee: parseCurrencyInput(event.target.value) })} /></label></div><button className="collective-convert" onClick={saveFinance}>Simpan biaya</button><div className="finance-payment-section"><h3>Tambah cicilan</h3><div className="finance-fields"><label><span>Nominal</span><input inputMode="numeric" value={paymentForm.amount ? formatCurrencyInput(paymentForm.amount) : ''} onChange={(event) => setPaymentForm({ ...paymentForm, amount: parseCurrencyInput(event.target.value) })} /></label><label><span>Tanggal</span><input type="date" value={paymentForm.payment_date} onChange={(event) => setPaymentForm({ ...paymentForm, payment_date: event.target.value })} /></label><label className="finance-note"><span>Catatan</span><input value={paymentForm.note} onChange={(event) => setPaymentForm({ ...paymentForm, note: event.target.value })} /></label></div><button className="documents-button" disabled={!paymentForm.amount} onClick={addPayment}>Catat cicilan</button></div><div className="finance-history"><h3>Riwayat pembayaran</h3>{selectedFinanceCandidate.payments.length ? selectedFinanceCandidate.payments.map((payment, paymentIndex) => <div className="finance-history-row" key={payment.id}><span>{new Date(`${payment.payment_date}T00:00:00`).toLocaleDateString('id-ID')}</span><strong>{formatCurrency(payment.amount)}</strong><small>{payment.note || 'Tanpa catatan'}</small><button className="documents-button invoice-button" onClick={() => openInvoice(selectedFinanceCandidate, payment, paymentIndex)}>Invoice</button></div>) : <p>Belum ada pembayaran.</p>}</div></section></div>}
      {selectedInvoice && <div className="modal-backdrop invoice-backdrop" role="presentation" onClick={() => setSelectedInvoice(null)}><section className="modal invoice-modal" role="dialog" aria-modal="true" aria-labelledby="invoice-title" onClick={(event) => event.stopPropagation()}><div className="invoice-brand"><div><span className="invoice-company">PT. JUARA</span><p>Jasa pengurusan dokumen dan keberangkatan</p></div><div className="invoice-label">INVOICE</div></div><div className="invoice-heading"><div><span className="invoice-kicker">TAGIHAN CICILAN</span><h2 id="invoice-title">Invoice #{String(selectedInvoice.installmentNumber).padStart(4, '0')}</h2></div><button className="icon-button no-print" aria-label="Tutup invoice" title="Tutup" onClick={() => setSelectedInvoice(null)}><Icon name="close" /></button></div><div className="invoice-info"><div><span>Ditagihkan kepada</span><strong>{selectedInvoice.candidate.full_name || 'Nama belum diisi'}</strong><small>{selectedInvoice.candidate.candidate_id}</small></div><div><span>Tanggal invoice</span><strong>{new Date(`${selectedInvoice.payment.payment_date}T00:00:00`).toLocaleDateString('id-ID')}</strong><small>Pembayaran cicilan ke-{selectedInvoice.installmentNumber}</small></div></div><table className="invoice-table"><thead><tr><th>Deskripsi</th><th>Qty</th><th>Jumlah</th></tr></thead><tbody><tr><td>Jasa pembuatan paspor</td><td>{selectedInvoice.candidate.passport_by_agency ? '1' : '-'}</td><td>{selectedInvoice.candidate.passport_by_agency ? formatCurrency(selectedInvoice.candidate.passport_fee) : '-'}</td></tr><tr><td>Jasa pengurusan visa</td><td>{selectedInvoice.candidate.visa_by_agency ? '1' : '-'}</td><td>{selectedInvoice.candidate.visa_by_agency ? formatCurrency(selectedInvoice.candidate.visa_fee) : '-'}</td></tr><tr><td>Biaya keberangkatan</td><td>1</td><td>{formatCurrency(selectedInvoice.candidate.departure_fee)}</td></tr></tbody></table><div className="invoice-summary"><div><span>Total tagihan</span><strong>{formatCurrency(financeTotal(selectedInvoice.candidate))}</strong></div><div><span>Pembayaran cicilan ini</span><strong className="invoice-payment">{formatCurrency(selectedInvoice.payment.amount)}</strong></div><div><span>Total dibayar sampai invoice ini</span><strong>{formatCurrency(selectedInvoice.paidThrough)}</strong></div><div className="invoice-balance"><span>Sisa tagihan</span><strong>{formatCurrency(selectedInvoice.remaining)}</strong></div></div>{selectedInvoice.payment.note && <p className="invoice-note"><strong>Catatan pembayaran</strong>{selectedInvoice.payment.note}</p>}<div className="invoice-status">Status pembayaran: <strong>{selectedInvoice.remaining === 0 ? 'LUNAS' : 'SEBAGIAN'}</strong></div><div className="invoice-footer"><p>Terima kasih atas pembayaran Anda.</p><small>Dokumen ini diterbitkan secara elektronik oleh PT. JUARA.</small></div><div className="invoice-actions no-print"><button className="collective-convert" onClick={() => window.print()}>Cetak invoice</button><button className="documents-button" onClick={() => setSelectedInvoice(null)}>Tutup</button></div></section></div>}
      {selectedCollectiveCandidate && <div className="modal-backdrop" role="presentation" onClick={() => selectedCollectiveCandidate.candidate_id !== collectiveConvertingCandidateId && setSelectedCollectiveCandidate(null)}><section className="modal collective-modal" role="dialog" aria-modal="true" aria-labelledby="collective-title" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="eyebrow">DOKUMEN KOLEKTIF</span><h2 id="collective-title">{selectedCollectiveCandidate.full_name || 'Nama belum diisi'}</h2><p>{selectedCollectiveCandidate.candidate_id}</p></div><button className="icon-button" aria-label="Tutup upload kolektif" title="Tutup" disabled={selectedCollectiveCandidate.candidate_id === collectiveConvertingCandidateId} onClick={() => setSelectedCollectiveCandidate(null)}><Icon name="close" /></button></div><p className="collective-help">Upload dokumen kolektif yang dipilih saat pendaftaran.</p><div className="collective-fields">{collectiveTypes(selectedCollectiveCandidate).map((type) => <label className="collective-field" key={type}><span>{type.toUpperCase()}</span><input type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={selectedCollectiveCandidate.candidate_id === collectiveConvertingCandidateId} onChange={(event) => handleCollectiveFile(selectedCollectiveCandidate, type, event.target.files?.[0])} /><strong>{collectiveFiles[selectedCollectiveCandidate.candidate_id]?.[type]?.name || 'Pilih file'}</strong></label>)}</div><button className="collective-convert" disabled={collectiveConvertingCandidateId === selectedCollectiveCandidate.candidate_id || !collectiveTypes(selectedCollectiveCandidate).every((type) => collectiveFiles[selectedCollectiveCandidate.candidate_id]?.[type])} onClick={async () => { const converted = await convertCollective(selectedCollectiveCandidate); if (converted) setSelectedCollectiveCandidate(null) }}>{collectiveConvertingCandidateId === selectedCollectiveCandidate.candidate_id ? 'Memproses...' : 'Convert'}</button></section></div>}
      {selectedBiodata && <div className="modal-backdrop" role="presentation" onClick={() => setSelectedBiodata(null)}><section className="modal biodata-modal" role="dialog" aria-modal="true" aria-labelledby="biodata-title" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="eyebrow">BIODATA PESERTA</span><h2 id="biodata-title">{selectedBiodata.full_name || 'Nama belum diisi'}</h2><p>{selectedBiodata.candidate_id}</p></div><button className="icon-button" aria-label="Tutup biodata" title="Tutup" onClick={() => setSelectedBiodata(null)}><Icon name="close" /></button></div><div className="biodata-grid"><div className="biodata-full"><span>Email</span><strong>{selectedBiodata.email || '-'}</strong></div><div><span>Nama lengkap</span><strong>{selectedBiodata.full_name || '-'}</strong></div><div><span>Jenis kelamin</span><strong>{selectedBiodata.gender || '-'}</strong></div><div><span>Tempat lahir</span><strong>{selectedBiodata.birth_place || '-'}</strong></div><div><span>Tanggal lahir</span><strong>{selectedBiodata.birth_date ? new Date(`${selectedBiodata.birth_date}T00:00:00`).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}</strong></div><div><span>Nomor WhatsApp</span><strong>{selectedBiodata.phone || '-'}</strong></div><div><span>Kode pos</span><strong>{selectedBiodata.postal_code || '-'}</strong></div><div className="biodata-full"><span>Alamat</span><strong>{selectedBiodata.address || '-'}</strong></div><div><span>Provinsi</span><strong>{selectedBiodata.province || '-'}</strong></div><div><span>Kota / kabupaten</span><strong>{selectedBiodata.city || '-'}</strong></div><div className="biodata-full"><span>Pengalaman</span><strong>{selectedBiodata.experience || '-'}</strong></div></div></section></div>}
      {selectedCandidate && <div className="modal-backdrop" role="presentation" onClick={() => setSelectedCandidate(null)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="documents-title" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div className="modal-title-group"><div><span className="eyebrow">DOKUMEN PESERTA</span><h2 id="documents-title">{selectedCandidate.full_name || 'Nama belum diisi'}</h2><p>{selectedCandidate.candidate_id}</p></div>{selectedCandidate.documents.length > 0 && <button className="download-all icon-button" aria-label="Download semua dokumen" title="Download semua dokumen" disabled={downloadingCandidateId === selectedCandidate.candidate_id} onClick={() => downloadAll(selectedCandidate)}>{downloadingCandidateId === selectedCandidate.candidate_id ? <span className="spinner" aria-label="Menyiapkan download" /> : <img src="/download-all.svg" alt="" />}</button>}</div><button className="icon-button" aria-label="Tutup detail dokumen" title="Tutup" onClick={() => setSelectedCandidate(null)}><Icon name="close" /></button></div><div className="docs">{selectedCandidate.documents.map((item) => <div className="doc" key={item.id} role="button" tabIndex="0" onClick={() => preview(item)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') preview(item) }}><div className="doc-label"><span className="document-icon"><Icon name={item.document_type} /></span><strong>{item.document_type.toUpperCase()}</strong><small className={`review-status ${item.validation_status || 'pending'}`}>{item.validation_status === 'accepted' ? 'Diterima' : item.validation_status === 'rejected' ? 'Ditolak' : 'Menunggu review'}</small></div><button className="icon-button" aria-label={`Download ${item.document_type}`} title={`Download ${item.document_type}`} onClick={(event) => { event.stopPropagation(); download(item) }}><Icon name="download" /></button></div>)}</div>{!selectedCandidate.documents.length && <div className="empty">Belum ada dokumen.</div>}</section></div>}
      {previewLoading && <div className="modal-backdrop preview-loading-backdrop" role="status" aria-live="polite"><div className="preview-loading"><span className="preview-spinner" aria-hidden="true" /><strong>Memuat dokumen...</strong></div></div>}
      {selectedPreview && <div className="modal-backdrop preview-backdrop" role="presentation" onClick={closePreview}><section className="modal preview-modal" role="dialog" aria-modal="true" aria-labelledby="preview-title" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="eyebrow">PREVIEW DOKUMEN</span><h2 id="preview-title">{selectedPreview.item.document_type.toUpperCase()}</h2><small className={`review-status ${selectedPreview.item.validation_status || 'pending'}`}>{selectedPreview.item.validation_status === 'accepted' ? 'Diterima' : selectedPreview.item.validation_status === 'rejected' ? 'Ditolak' : 'Menunggu review'}</small></div><div className="preview-header-actions"><button className="review-button accept" disabled={reviewingDocumentId === selectedPreview.item.id || selectedPreview.item.validation_status === 'accepted'} onClick={() => reviewDocument(selectedPreview.item, 'accepted')}>{reviewingDocumentId === selectedPreview.item.id ? 'Memproses...' : 'Accept'}</button><button className="review-button reject" disabled={reviewingDocumentId === selectedPreview.item.id || selectedPreview.item.validation_status === 'rejected'} onClick={() => reviewDocument(selectedPreview.item, 'rejected')}>Reject</button><button className="preview-download" onClick={() => download(selectedPreview.item)}>Download</button><button className="icon-button" aria-label="Tutup preview" title="Tutup" onClick={closePreview}><Icon name="close" /></button></div></div>{selectedPreview.item.content_type === 'application/pdf' ? <iframe className="document-preview-frame" src={selectedPreview.url} title={`Preview ${selectedPreview.item.document_type}`} /> : selectedPreview.item.content_type.startsWith('image/') ? <img className="document-preview-image" src={selectedPreview.url} alt={`Preview ${selectedPreview.item.document_type}`} /> : <div className="empty">Format ini tidak dapat dipreview. Gunakan tombol download.</div>}</section></div>}
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
