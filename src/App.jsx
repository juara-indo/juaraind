import React, { useEffect, useState } from 'react'
import { Turnstile } from '@marsidev/react-turnstile'
import { getSupabase, isConfigured } from './supabaseClient.js'
import { IMG, HOTELS, GALLERY, STEPS, STATS } from './data.js'

/* ---------------- Google ikon (SVG resmi, inline) ---------------- */
const GoogleIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.5 6.1 29.5 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 18.9 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C36.9 40.2 44 35 44 24c0-1.2-.1-2.3-.4-3.5z"/>
  </svg>
)

const AvatarIcon = () => (
  <svg className="avatar avatar-svg" viewBox="0 0 48 48" role="img" aria-label="Avatar peserta">
    <circle cx="24" cy="24" r="23" fill="#f2ead3" stroke="#b3261e" strokeWidth="2" />
    <circle cx="24" cy="18" r="7" fill="#b3261e" />
    <path d="M11 39c1.7-7.2 6.1-10.8 13-10.8S35.3 31.8 37 39" fill="#b3261e" />
  </svg>
)

const DocumentIcon = ({ type }) => {
  const detail = {
    ktp: <><rect x="4" y="6" width="16" height="12" rx="2" /><circle cx="9" cy="11" r="1.8" /><path d="M13 10h4M13 13h4" /></>,
    kk: <><rect x="5" y="4" width="14" height="16" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
    ijazah: <><path d="m3 8 9-4 9 4-9 4-9-4Z" /><path d="M6 10v5c3 2 9 2 12 0v-5M12 12v6" /></>,
    cv: <><path d="M7 4h7l4 4v12H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" /><path d="M14 4v5h5M8 13h6M8 16h5" /></>,
    paspor: <><rect x="5" y="3" width="14" height="18" rx="2" /><circle cx="12" cy="10" r="3" /><path d="M7 17h10" /></>,
    visa: <><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 9h8M8 13h5M16 16h.01" /></>,
    pendukung: <><path d="M7 4h7l4 4v12H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" /><path d="M14 4v5h5M12 12v6M9 15h6" /></>,
  }[type]

  return <svg className="document-icon" viewBox="0 0 24 24" aria-hidden="true">{detail}</svg>
}

function CustomSelect({ value, onChange, options, placeholder, required = false, id, tabIndex, disabled = false }) {
  const [open, setOpen] = useState(false)
  const selectRef = React.useRef(null)
  const triggerRef = React.useRef(null)
  const menuRef = React.useRef(null)
  const pendingOptionIndex = React.useRef(null)
  const selected = options.find((option) => option.value === value)

  React.useEffect(() => {
    if (!open || pendingOptionIndex.current === null) return
    const index = pendingOptionIndex.current
    pendingOptionIndex.current = null
    window.requestAnimationFrame(() => focusOption(index))
  }, [open])

  React.useEffect(() => {
    if (!open) return undefined
    const closeWhenOutside = (event) => {
      if (!selectRef.current?.contains(event.target)) setOpen(false)
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeWhenOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeWhenOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const choose = (nextValue) => {
    onChange({ target: { value: nextValue } })
    setOpen(false)
  }

  const focusOption = (index) => {
    const buttons = menuRef.current?.querySelectorAll('button')
    if (!buttons?.length) return
    buttons[Math.max(0, Math.min(index, buttons.length - 1))]?.focus()
  }

  const handleTriggerKeyDown = (event) => {
    if (!['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) return
    event.preventDefault()
    pendingOptionIndex.current = event.key === 'ArrowUp' ? options.length : 0
    if (!open) setOpen(true)
    if (open) window.requestAnimationFrame(() => focusOption(pendingOptionIndex.current))
  }

  const handleMenuKeyDown = (event) => {
    const buttons = [...(menuRef.current?.querySelectorAll('button') || [])]
    const currentIndex = buttons.indexOf(event.target)
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      focusOption(currentIndex + (event.key === 'ArrowDown' ? 1 : -1))
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      focusOption(event.key === 'Home' ? 0 : buttons.length - 1)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
    }
  }

  return (
    <div ref={selectRef} className={`custom-select ${open ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''}`}>
      <button
        ref={triggerRef}
        className={`custom-select-trigger ${selected ? '' : 'is-placeholder'}`}
        id={id}
        tabIndex={tabIndex}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-required={required}
        disabled={disabled}
        aria-disabled={disabled}
        onClick={() => !disabled && setOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
      >
        <span>{selected?.label || placeholder}</span>
        <span className="custom-select-arrow" aria-hidden="true">
          <svg viewBox="0 0 16 16" focusable="false"><path d="m3.5 6 4.5 4 4.5-4" /></svg>
        </span>
      </button>
      {open && (
        <div ref={menuRef} className="custom-select-menu" role="listbox" onKeyDown={handleMenuKeyDown}>
          <button type="button" role="option" aria-selected={!value} onClick={() => choose('')}>
            {placeholder}
          </button>
          {options.map((option) => (
            <button key={option.value} type="button" role="option" aria-selected={option.value === value} onClick={() => choose(option.value)}>
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const displayDate = (value) => {
  if (!value) return ''
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value
}

const databaseDate = (value) => {
  const input = String(value || '')
  const displayMatch = input.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (displayMatch) return `${displayMatch[3]}-${displayMatch[2]}-${displayMatch[1]}`
  return /^\d{4}-\d{2}-\d{2}$/.test(input) ? input : ''
}

const toTitleCase = (value) => String(value || '')
  .toLocaleLowerCase('id-ID')
  .replace(/(^|[\s'-])(\p{L})/gu, (_, separator, character) => `${separator}${character.toLocaleUpperCase('id-ID')}`)

const holdTransition = async (startedAt, minimumMs) => {
  const remaining = Math.max(0, minimumMs - (performance.now() - startedAt))
  if (remaining) await new Promise((resolve) => window.setTimeout(resolve, remaining))
}

function useRegionOptions(form) {
  const [provinces, setProvinces] = useState([])
  const [cities, setCities] = useState([])
  const [postalCodes, setPostalCodes] = useState([])

  useEffect(() => {
    fetch('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json')
      .then((response) => response.ok ? response.json() : [])
      .then((items) => setProvinces(items.map((item) => ({ id: item.id, name: item.name }))))
      .catch(() => setProvinces([]))
  }, [])

  useEffect(() => {
    const province = provinces.find((item) => item.name.toLowerCase() === String(form?.province || '').toLowerCase())
    setCities([])
    setPostalCodes([])
    if (!province) return
    fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${province.id}.json`)
      .then((response) => response.ok ? response.json() : [])
      .then((items) => setCities(items.map((item) => ({ id: item.id, name: item.name }))))
      .catch(() => setCities([]))
  }, [form?.province, provinces])

  useEffect(() => {
    const city = cities.find((item) => item.name.toLowerCase() === String(form?.city || '').toLowerCase())
    setPostalCodes([])
    if (!city) return
    fetch(`https://kodepos.vercel.app/search/?q=${encodeURIComponent(city.name)}`)
      .then((response) => response.ok ? response.json() : {})
      .then((payload) => {
        const codes = (payload.data || []).map((item) => item.code || item.kodepos || item.postal_code).filter(Boolean)
        setPostalCodes([...new Set(codes.map(String))])
      })
      .catch(() => setPostalCodes([]))
  }, [form?.city, cities])

  return { provinces, cities, postalCodes }
}

const maintenanceMode = import.meta.env.VITE_MAINTENANCE_MODE === 'true'

function MaintenancePage() {
  return (
    <main className="maintenance-page">
      <div className="maintenance-card">
        <img className="maintenance-logo" src="/images/logojuara-maintenance.svg" alt="Juara" />
        <p className="maintenance-kicker">Juara · Indonesia → Turki</p>
        <h1>Kami sedang menyiapkan sesuatu yang lebih baik.</h1>
        <p className="maintenance-copy">
          Website sedang dalam tahap penyempurnaan. Silakan kembali lagi dalam waktu dekat.
        </p>
      </div>
    </main>
  )
}

const Pin = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0z" /><circle cx="12" cy="10" r="3" />
  </svg>
)

/* ---------------- Hook: sesi + profil kandidat ---------------- */
function useSession() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isConfigured) { setLoading(false); return }
    let mounted = true
    let sub = null
    ;(async () => {
      const startedAt = performance.now()
      const supabase = await getSupabase()
      if (!supabase) { if (mounted) setLoading(false); return }
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      await holdTransition(startedAt, 900)
      if (!mounted) return
      setSession(data.session)
      setLoading(false)
      const res = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
      sub = res?.data
    })()
    return () => { mounted = false; try { sub?.subscription?.unsubscribe() } catch (e) {/* ignore */} }
  }, [])

  const signInWithGoogle = async () => {
    if (!isConfigured) return
    const supabase = await getSupabase()
    if (!supabase) return
    const redirectTo = `${window.location.origin}${window.location.pathname}`
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
  }

  const signOut = async () => {
    const supabase = await getSupabase()
    return supabase?.auth.signOut()
  }
  return { session, loading, signInWithGoogle, signOut }
}

/* ---------------- Kandidat: ID + form ---------------- */
function useCandidate(session) {
  const [cand, setCand] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!session || !isConfigured) { setCand(null); return }
    let alive = true
    const startedAt = performance.now()
    setLoading(true)
    ;(async () => {
      const supabase = await getSupabase()
      if (!supabase) { if (alive) setLoading(false); return }
      const uid = session.user.id
      let { data } = await supabase.from('candidates').select('*').eq('id', uid).maybeSingle()
      await holdTransition(startedAt, 650)
      if (alive) { setCand(data); setLoading(false) }
    })()
    return () => { alive = false }
  }, [session])

  const updateProfile = async (fields) => {
    if (!session) return { error: null }
    const supabase = await getSupabase()
    if (!supabase) return { error: { message: 'Supabase not configured' } }
    const { error } = await supabase.from('candidates').update(fields).eq('id', session.user.id)
    if (!error) setCand((c) => ({ ...c, ...fields }))
    return { error }
  }

  return { cand, loading, updateProfile }
}

const documentsApiUrl = import.meta.env.VITE_DOCUMENTS_API_URL
const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY
const maxDocumentSize = 5 * 1024 * 1024
const allowedDocumentTypes = new Set(['application/pdf', 'image/jpeg', 'image/png'])
const documentTypes = [
  { id: 'ktp', label: 'KTP', hint: 'Kartu tanda penduduk' },
  { id: 'kk', label: 'KK', hint: 'Kartu keluarga' },
  { id: 'ijazah', label: 'Ijazah terakhir', hint: 'Ijazah pendidikan terakhir' },
  { id: 'cv', label: 'CV', hint: 'Curriculum vitae terbaru' },
  { id: 'paspor', label: 'Paspor', hint: 'Halaman identitas paspor' },
  { id: 'visa', label: 'Visa', hint: 'Dokumen visa atau izin tinggal' },
  { id: 'pendukung', label: 'Dokumen pendukung', hint: 'Sertifikat atau dokumen lainnya' },
]

function useDocuments(session) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const request = async (path, options = {}) => {
    if (!documentsApiUrl || !session?.access_token) {
      throw new Error('API dokumen belum dikonfigurasi.')
    }
    const response = await fetch(`${documentsApiUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        ...options.headers,
      },
    })
    const payload = response.status === 204 ? null : await response.json()
    if (!response.ok) throw new Error(payload?.error || 'Gagal memproses dokumen.')
    return payload
  }

  const refresh = async () => {
    if (!session || !documentsApiUrl) return
    setLoading(true)
    try {
      const payload = await request('/documents')
      setDocuments(payload.documents || [])
      setError('')
    } catch (requestError) {
      setError(requestError.message)
      throw requestError
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setDocuments([])
    if (!session || !documentsApiUrl) return
    refresh().catch(() => undefined)
  }, [session])

  const upload = async (files, turnstileToken, documentTypes) => {
    const body = new FormData()
    files.forEach((file, index) => {
      body.append('files', file)
      body.append('document_types', documentTypes[index])
    })
    await request('/documents', {
      method: 'POST',
      body,
      headers: { 'X-Turnstile-Token': turnstileToken },
    })
    await refresh()
  }

  const submitApplication = async (agencyDocuments) => {
    return request('/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agencyDocuments),
    })
  }

  const download = async (document) => {
    const response = await fetch(`${documentsApiUrl}/documents/${encodeURIComponent(document.id)}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      throw new Error(payload?.error || 'Gagal mengunduh dokumen.')
    }
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const anchor = window.document.createElement('a')
    anchor.href = url
    anchor.download = document.file_name
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const remove = async (document) => {
    await request(`/documents/${encodeURIComponent(document.id)}`, { method: 'DELETE' })
    setDocuments((current) => current.filter((item) => item.id !== document.id))
  }

  return { documents, loading, error, upload, download, remove, submitApplication }
}

/* ---------------- Komponen: scroll reveal ---------------- */
function Reveal({ children, className = '', delay = 0, as: Tag = 'div' }) {
  const ref = React.useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add('in'); io.disconnect() } },
      { threshold: 0.12 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return <Tag ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</Tag>
}

/* ---------------- Navbar ---------------- */
function Nav({ session, onLogin }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])
  const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  return (
    <header className={`nav ${scrolled ? 'scrolled' : ''}`}>
      <a className="brand" href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
        <img className="brand-logo" src="/images/logojuara.svg" alt="Juara" />
      </a>
      <ul className={`nav-links ${session ? 'nav-links-hidden' : ''}`}>
        <li><a href="#hotel" onClick={(e) => { e.preventDefault(); go('hotel') }}>Hotel Mitra</a></li>
        <li><a href="#proses" onClick={(e) => { e.preventDefault(); go('proses') }}>Alur</a></li>
        <li><a href="#galeri" onClick={(e) => { e.preventDefault(); go('galeri') }}>Galeri</a></li>
        <li><a href="#daftar" onClick={(e) => { e.preventDefault(); go('daftar') }}>Pendaftaran</a></li>
      </ul>
      <button className="nav-cta" onClick={() => (session ? go('daftar') : onLogin())}>
        {session ? 'Akun Saya' : (<><GoogleIcon size={16} /> Masuk</>)}
      </button>
    </header>
  )
}

/* ---------------- Hero: layar besar ---------------- */
function Hero({ session, onLogin }) {
  const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  return (
    <section className="hero" id="top">
      <div className="hero-media">
        <picture>
          <source type="image/webp" srcSet={IMG.srcSet?.replace(/\.jpg/g, '.webp')} sizes={IMG.sizes} />
          <img src={IMG.hero} alt={IMG.heroAlt} width={IMG.width} height={IMG.height} srcSet={IMG.srcSet} sizes={IMG.sizes} fetchpriority="high" decoding="async" />
        </picture>
      </div>
      <div className="hero-inner">
        <div>
          <h1 className="hero-title">
            Dari Nusantara ke <em>menara Istanbul</em> — karier Anda dimulai di sini.
          </h1>
          <div className="hero-row">
            <button className="btn-primary" onClick={() => (session ? go('daftar') : onLogin())}>
              {session ? 'Lengkapi Pendaftaran' : 'Daftar dengan Google'}
            </button>
            <button className="btn-ghost" onClick={() => go('hotel')}>Lihat Hotel Mitra ↓</button>
          </div>
        </div>
        <p className="hero-side">
          Kami menempatkan talenta Indonesia terbaik di hotel-hotel bintang lima Turki —
          dengan kontrak resmi, izin kerja, dan pendampingan penuh dari Jakarta hingga Bosphorus.
        </p>
      </div>
      <div className="hero-stats">
        {STATS.map((s) => (
          <div className="hero-stat" key={s.label}><b>{s.value}</b><span>{s.label}</span></div>
        ))}
      </div>
    </section>
  )
}

/* ---------------- Marquee ---------------- */
function Marquee() {
  const items = ['Istanbul ✦ Antalya ✦ Bodrum ✦ Izmir ✦ Cappadocia',
    'F&B Service', 'Housekeeping', 'Front Office', 'Kitchen & Pastry', 'Guest Relations']
  const row = items.map((t, i) => <span key={i}>{t} <i className="dot" /></span>)
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">{row}{row}</div>
    </div>
  )
}

/* ---------------- Hotels ---------------- */
function Hotels() {
  return (
    <section className="section hotels" id="hotel">
      <Reveal className="section-head">
        <div>
          <div className="sec-kicker">Jaringan Penempatan</div>
          <h2 className="sec-title">Hotel <em>berbintang lima</em> yang menanti Anda</h2>
        </div>
        <p className="sec-desc">
          Semua mitra penempatan kami terverifikasi dan terikat kontrak kerja resmi.
          Setiap posisi disiapkan khusus untuk kandidat Indonesia.
        </p>
      </Reveal>
      <div className="hotel-grid">
        {HOTELS.map((h, i) => (
          <Reveal className="hotel-card" key={h.name} delay={i * 60}>
            <picture>
              <source type="image/webp" srcSet={h.srcSet?.replace(/\.jpg/g, '.webp')} sizes={h.sizes} />
              <img src={h.img} alt={h.alt} loading="lazy" decoding="async" width={h.width} height={h.height} srcSet={h.srcSet} sizes={h.sizes} />
            </picture>
            <div className="hotel-info">
              <div className="hotel-tier">{h.tier}</div>
              <div className="hotel-name">{h.name}</div>
              <div className="hotel-city"><Pin /> {h.city}, Turki</div>
              <div className="hotel-tags">{h.positions.map((p) => <span key={p}>{p}</span>)}</div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

/* ---------------- Timeline proses ---------------- */
function Process() {
  return (
    <section className="section process" id="proses">
      <Reveal className="section-head">
        <div>
          <div className="sec-kicker">Alur 5 Langkah</div>
          <h2 className="sec-title">Dari daftar <em>hingga terbang</em>, kami dampingi</h2>
        </div>
        <p className="sec-desc">
          Proses transparan dengan satu penanggung jawab per kandidat — Anda selalu tahu posisi Anda di setiap tahap.
        </p>
      </Reveal>
      <div className="tl">
        {STEPS.map((s, i) => (
          <Reveal className="tl-item" key={s.no} delay={i * 80}>
            <div className="tl-no">{s.no}</div>
            <div className="tl-title">{s.title}</div>
            <p className="tl-desc">{s.desc}</p>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

/* ---------------- Galeri kolase ---------------- */
function Gallery() {
  return (
    <section className="section" id="galeri">
      <Reveal className="section-head">
        <div>
          <div className="sec-kicker">Galeri</div>
          <h2 className="sec-title">Seperti apa <em>dunia kerja</em> Anda nanti</h2>
        </div>
        <p className="sec-desc">
          Potret hotel, resor, dan standar layanan di kota-kota penempatan kami di Turki.
        </p>
      </Reveal>
      <div className="collage">
        {GALLERY.map((g, i) => (
          <Reveal as="figure" key={i} delay={i * 50}>
            <picture>
              <source type="image/webp" srcSet={g.srcSet?.replace(/\.jpg/g, '.webp')} sizes={g.sizes} />
              <img src={g.img} alt={g.caption} loading="lazy" decoding="async" width={g.width} height={g.height} srcSet={g.srcSet} sizes={g.sizes} />
            </picture>
            <figcaption>{g.caption}</figcaption>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

/* ---------------- Auth + Dashboard ---------------- */
function AuthSection({ session, loading: sessLoading, signInWithGoogle, signOut }) {
  const { cand, loading: candLoading, updateProfile } = useCandidate(session)
  const { documents, loading: documentsLoading, error: documentsError, upload, download, remove, submitApplication } = useDocuments(session)
  const [form, setForm] = useState(null)
  const [documentBusy, setDocumentBusy] = useState(false)
  const [selectedDocuments, setSelectedDocuments] = useState({})
  const [turnstileToken, setTurnstileToken] = useState('')
  const [agencyDocuments, setAgencyDocuments] = useState({ paspor: false, visa: false })
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [err, setErr] = useState('')
  const [activeTab, setActiveTab] = useState('profile')
  const [isEditing, setIsEditing] = useState(true)
  const { provinces, cities, postalCodes } = useRegionOptions(form)

  React.useEffect(() => {
    if (cand) {
      setForm({
        full_name: cand.full_name || '',
        birth_place: cand.birth_place || '',
        birth_date: displayDate(cand.birth_date || ''),
        gender: cand.gender || '',
        phone: cand.phone || '',
        address: cand.address || '',
        province: cand.province || '',
        city: cand.city || '',
        postal_code: cand.postal_code || '',
        experience: cand.experience || '',
      })
      setIsEditing(!cand.full_name)
    }
  }, [cand])

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setSaved(false) }

  const save = async (e) => {
    e.preventDefault()
    setErr('')
    if (!form.full_name?.trim()) { setErr('Nama lengkap wajib diisi.'); return }
    if (form.birth_date && !databaseDate(form.birth_date)) {
      setErr('Tanggal lahir harus menggunakan format dd/mm/yyyy.')
      return
    }
    setSaving(true)
    const saveStartedAt = performance.now()
    const { error } = await updateProfile({
      full_name: toTitleCase(form.full_name),
      birth_place: toTitleCase(form.birth_place),
      birth_date: databaseDate(form.birth_date) || null,
      gender: form.gender || null,
      phone: form.phone.trim(),
      address: toTitleCase(form.address),
      province: toTitleCase(form.province),
      city: toTitleCase(form.city),
      postal_code: form.postal_code.trim(),
      experience: form.experience.trim(),
    })
    await holdTransition(saveStartedAt, 2000)
    setSaving(false)
    if (error) setErr('Gagal menyimpan: ' + error.message)
    else {
      setSaved(true)
      setIsEditing(false)
    }
  }

  const copyId = async () => {
    try { await navigator.clipboard.writeText(cand.candidate_id) } catch { /* abaikan */ }
    setCopied(true); setTimeout(() => setCopied(false), 1800)
  }

  const handleDocumentSelect = (event, documentType) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (!files.length) return
    setErr('')
    for (const file of files) {
      if (!allowedDocumentTypes.has(file.type)) {
        setErr('Format file harus PDF, JPG, atau PNG.')
        return
      }
      if (file.size > maxDocumentSize) {
        setErr('Ukuran file maksimal 5 MB.')
        return
      }
    }
    setSelectedDocuments((current) => ({
      ...current,
      [documentType]: documentType === 'pendukung'
        ? [...(current[documentType] || []), ...files]
        : files[0],
    }))
  }

  const handleTurnstileSuccess = async (token) => {
    const files = []
    const documentTypes = []
    Object.entries(selectedDocuments).forEach(([documentType, selected]) => {
      const selectedFiles = documentType === 'pendukung' ? selected : [selected]
      selectedFiles.filter(Boolean).forEach((file) => {
        files.push(file)
        documentTypes.push(documentType)
      })
    })
    setTurnstileToken(token)
    if (!files.length) return
    setErr('')
    setDocumentBusy(true)
    try {
      await upload(files, token, documentTypes)
      setSelectedDocuments({})
      setTurnstileToken('')
    } catch (error) {
      setErr(error.message)
      setTurnstileToken('')
    } finally {
      setDocumentBusy(false)
    }
  }

  const toggleAgencyDocument = (documentType) => (event) => {
    const checked = event.target.checked
    setAgencyDocuments((current) => ({ ...current, [documentType]: checked }))
    if (checked) {
      setSelectedDocuments((current) => {
        const next = { ...current }
        delete next[documentType]
        return next
      })
    }
    setApplied(false)
  }

  const requiredDocumentTypes = ['ktp', 'kk', 'ijazah', 'cv', 'paspor', 'visa']
  const hasUploadedDocument = (documentType) => documents.some((document) => document.document_type === documentType)
  const documentReady = (documentType) => hasUploadedDocument(documentType) || agencyDocuments[documentType]
  const canApply = requiredDocumentTypes.every(documentReady) && !applying && !applied

  const handleApply = async () => {
    if (!canApply) return
    setErr('')
    setApplying(true)
    try {
      await submitApplication(agencyDocuments)
      setApplied(true)
    } catch (error) {
      setErr(error.message)
    } finally {
      setApplying(false)
    }
  }

  const handleDocumentAction = async (action) => {
    setErr('')
    setDocumentBusy(true)
    try {
      await action()
    } catch (error) {
      setErr(error.message)
    } finally {
      setDocumentBusy(false)
    }
  }

  const meta = session?.user?.user_metadata || {}
  const profileFields = form ? ['full_name', 'birth_place', 'birth_date', 'gender', 'phone', 'address', 'province', 'city', 'postal_code', 'experience'] : []
  const completedFields = profileFields.filter((field) => String(form?.[field] || '').trim()).length
  const completion = profileFields.length ? Math.round((completedFields / profileFields.length) * 100) : 0

  if (sessLoading) {
    return (
      <section className="section auth-section auth-loading-section" id="daftar" aria-live="polite">
        <div className="auth-wrap auth-loading-wrap">
          <div className="auth-transition-card" role="status" aria-label="Menyiapkan formulir pendaftaran">
            <span className="transition-kicker">Pendaftaran kandidat</span>
            <span className="transition-line" aria-hidden="true" />
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className={`section auth-section ${session ? 'candidate-section' : ''}`} id="daftar">
      <div className={`auth-wrap ${session ? 'candidate-mode' : ''}`}>
        {!session && (
          <Reveal className="auth-pitch">
            <div className="sec-kicker">Pendaftaran Kandidat</div>
            <h2 className="sec-title">Satu akun Google, <em>satu ID unik</em> untuk Anda</h2>
            <p className="sec-desc">
              Setiap kandidat menerima <b>ID Kandidat permanen</b> setelah akun terhubung.
              Sebutkan ID ini saat menghubungi kantor agency — seluruh berkas Anda bisa langsung dipanggil tanpa mencari ulang.
            </p>
            <ul style={{ listStyle: 'none', display: 'grid', gap: 12, fontSize: 14, color: 'var(--ink-soft)' }}>
              <li>✦ Login aman via Google — tanpa mengisi password baru</li>
              <li>✦ Data tersimpan terenkripsi di Supabase (hanya Anda yang bisa melihat)</li>
              <li>✦ ID langsung diterbitkan otomatis saat akun dibuat</li>
            </ul>
          </Reveal>
        )}

        {session && cand?.candidate_id && (
          <div className="id-card">
            <header className="candidate-header">
              <div className="user-meta">
                <b>{meta.full_name || meta.name || session.user.email}</b>
                <span>{session.user.email}</span>
                <button className="signout" onClick={signOut}>Keluar</button>
              </div>
              <div className="avatar-column">
                <AvatarIcon />
              </div>
            </header>
            <div className="id-content">
              <div className="id-label">ID Kandidat Anda</div>
              <div className="id-value-row">
                <div className="id-value">{cand.candidate_id}</div>
                <button
                  className="copy-btn"
                  onClick={copyId}
                  aria-label={copied ? 'ID tersalin' : 'Salin ID kandidat'}
                  title={copied ? 'ID tersalin' : 'Salin ID'}
                >
                  {copied ? '✓' : (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <rect x="8" y="8" width="11" height="11" rx="2" />
                      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
                    </svg>
                  )}
                </button>
              </div>
              <div className="id-hint">Simpan ID ini — untuk pemanggilan data di kantor agency.</div>
            </div>
          </div>
        )}

        <Reveal className="auth-card" delay={120}>
          {!isConfigured && (
            <div className="config-warn">
              <b>⚙ Mode demo aktif — Supabase belum dikonfigurasi.</b><br />
              Untuk mengaktifkan login & database: salin <code>.env.example</code> menjadi <code>.env</code>,
              isi <code>VITE_SUPABASE_URL</code> &amp; <code>VITE_SUPABASE_ANON_KEY</code> dari dashboard Supabase,
              lalu jalankan SQL di <code>supabase/schema.sql</code> dan aktifkan provider Google.
              Panduan lengkap ada di README.md proyek ini.
            </div>
          )}

          {session && candLoading ? (
            <div className="inline-transition" role="status" aria-label="Menyiapkan formulir pendaftaran">
              <span className="transition-kicker">Menyiapkan formulir</span>
              <span className="transition-line" aria-hidden="true" />
            </div>
          ) : !session ? (
            <>
              <h3 style={{ fontFamily: 'var(--serif)', fontSize: 26, marginBottom: 8 }}>Masuk / Daftar</h3>
              <p style={{ fontSize: 14, color: 'var(--ink-soft)', marginBottom: 22, lineHeight: 1.7 }}>
                Gunakan akun Google Anda. ID Kandidat akan diterbitkan otomatis begitu akun terhubung.
              </p>
              <button className="google-btn" onClick={signInWithGoogle} disabled={!isConfigured}>
                <GoogleIcon /> Masuk dengan Google
              </button>
              <p className="auth-note">
                Dengan mendaftar, Anda menyetujui proses verifikasi dokumen dan seleksi oleh tim
                PT. JUARA. Data Anda tidak dibagikan ke pihak ketiga tanpa persetujuan.
              </p>
            </>
          ) : (
            <>
              {err && <div className="err-box">{err}</div>}
              {documentsError && !err && <div className="err-box">{documentsError}</div>}
              <div className="candidate-tabs" role="tablist" aria-label="Tahapan pendaftaran">
                <button type="button" role="tab" aria-selected={activeTab === 'profile'} className={activeTab === 'profile' ? 'is-active' : ''} onClick={() => setActiveTab('profile')}>
                  <span>01</span> Data diri
                </button>
                <button type="button" role="tab" aria-selected={activeTab === 'documents'} className={activeTab === 'documents' ? 'is-active' : ''} onClick={() => setActiveTab('documents')}>
                  <span>02</span> Upload dokumen
                </button>
              </div>

              {form && activeTab === 'profile' && (
                <div className="biodata-layout">
                  <aside className="biodata-aside" aria-label="Ringkasan pengisian data diri">
                    <div className="biodata-aside-kicker">Langkah 01 / 02</div>
                    <h2>Kenali<br /><em>kandidatnya.</em></h2>
                    <p>Data ini membantu tim kami mencocokkan Anda dengan posisi dan hotel yang tepat.</p>
                    <div className="completion-card">
                      <div className="completion-top"><span>Kelengkapan profil</span><strong>{completion}%</strong></div>
                      <div className="completion-track" aria-hidden="true"><span style={{ width: `${completion}%` }} /></div>
                      <small>{completedFields} dari {profileFields.length} bagian terisi</small>
                    </div>
                    <div className="privacy-note"><span aria-hidden="true">▣</span><span>Data Anda hanya digunakan untuk proses seleksi dan penempatan.</span></div>
                  </aside>

                  <form className={`form-grid biodata-form ${isEditing ? 'is-editing' : 'is-readonly'}`} onSubmit={save}>
                    <div className="form-heading full">
                      <div>
                        <div className="field-label">Data diri</div>
                        <h3>Informasi pribadi</h3>
                      </div>
                      <p><span className="required-mark">*</span> Wajib diisi</p>
                    </div>
                    <datalist id="province-options">
                      {provinces.map((item) => <option key={item.id} value={item.name} />)}
                    </datalist>
                    <datalist id="city-options">
                      {cities.map((item) => <option key={item.id} value={item.name} />)}
                    </datalist>
                    <datalist id="postal-options">
                      {postalCodes.map((code) => <option key={code} value={code} />)}
                    </datalist>
                  <div className="field full">
                    <label htmlFor="full-name">Nama lengkap <span>(sesuai paspor)</span> <i>*</i></label>
                    <input id="full-name" tabIndex="1" className="title-case" value={form.full_name} onChange={set('full_name')} onBlur={() => setForm((current) => ({ ...current, full_name: toTitleCase(current.full_name) }))} placeholder="cth. Rizky Pratama" maxLength={160} readOnly={!isEditing} required />
                  </div>
                  <div className="field">
                    <label htmlFor="birth-place">Tempat lahir</label>
                    <input id="birth-place" tabIndex="2" className="title-case" value={form.birth_place} onChange={set('birth_place')} onBlur={() => setForm((current) => ({ ...current, birth_place: toTitleCase(current.birth_place) }))} placeholder="cth. Bandung" maxLength={100} readOnly={!isEditing} />
                  </div>
                  <div className="field">
                    <label htmlFor="birth-date">Tanggal lahir</label>
                    <input id="birth-date" tabIndex="3" type="date" value={databaseDate(form.birth_date)} onChange={set('birth_date')} lang="id-ID" readOnly={!isEditing} />
                  </div>
                  <div className="field">
                    <label>Jenis kelamin</label>
                    <CustomSelect
                      id="gender"
                      tabIndex="4"
                      disabled={!isEditing}
                      value={form.gender}
                      onChange={set('gender')}
                      placeholder="— Pilih jenis kelamin —"
                      options={[
                        { value: 'Laki-laki', label: 'Laki-laki' },
                        { value: 'Perempuan', label: 'Perempuan' },
                      ]}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="phone">Nomor WhatsApp</label>
                    <input id="phone" tabIndex="5" value={form.phone || ''} onChange={set('phone')} placeholder="+62 8xx-xxxx-xxxx" maxLength={32} readOnly={!isEditing} />
                  </div>
                  <div className="field full">
                    <label htmlFor="address">Alamat lengkap</label>
                    <textarea id="address" tabIndex="6" className="title-case" value={form.address} onChange={set('address')} onBlur={() => setForm((current) => ({ ...current, address: toTitleCase(current.address) }))} placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan atau desa" maxLength={500} readOnly={!isEditing} />
                  </div>
                  <div className="field">
                    <label htmlFor="province">Provinsi</label>
                    <input id="province" list="province-options" tabIndex="7" className="title-case" value={form.province} onChange={set('province')} onBlur={() => setForm((current) => ({ ...current, province: toTitleCase(current.province) }))} placeholder="Ketik untuk mencari provinsi" maxLength={100} readOnly={!isEditing} />
                  </div>
                  <div className="field">
                    <label htmlFor="city">Kota / kabupaten</label>
                    <input id="city" list="city-options" tabIndex="8" className="title-case" value={form.city} onChange={set('city')} onBlur={() => setForm((current) => ({ ...current, city: toTitleCase(current.city) }))} placeholder="Pilih provinsi terlebih dahulu" maxLength={100} readOnly={!isEditing} />
                  </div>
                  <div className="field">
                    <label htmlFor="postal-code">Kode pos</label>
                    <input id="postal-code" list="postal-options" tabIndex="9" value={form.postal_code} onChange={set('postal_code')} placeholder="Ketik untuk mencari kode pos" inputMode="numeric" maxLength={10} readOnly={!isEditing} />
                  </div>
                  <div className="field full">
                    <label htmlFor="experience">Pengalaman kerja singkat</label>
                    <textarea
                      id="experience"
                      tabIndex="10"
                      value={form.experience || ''}
                      onChange={set('experience')}
                      placeholder="cth. 3 tahun waiter di hotel bintang 4 di Bali; dasar bahasa Inggris aktif…"
                      maxLength={2000}
                      readOnly={!isEditing}
                    />
                  </div>
                  <div className="full">
                    <div className="submit-actions">
                    <button className="edit-btn" type="button" tabIndex="11" onClick={() => { setIsEditing(true); setSaved(false) }} disabled={isEditing || saving}>
                      Edit data
                    </button>
                    <button className={`submit-btn ${saving ? 'is-saving' : ''}`} type="submit" tabIndex="12" disabled={!isEditing || saving} aria-busy={saving}>
                      <span className="submit-label">{saving ? 'Menyimpan…' : 'Simpan & Kirim Pendaftaran'}</span>
                      {saving && <span className="submit-dots" aria-hidden="true"><i /><i /><i /></span>}
                    </button>
                    <button className="next-btn" type="button" tabIndex="13" onClick={() => setActiveTab('documents')} disabled={!saved || isEditing || saving}>
                      Next <span aria-hidden="true">→</span>
                    </button>
                    </div>
                  </div>
                  </form>
                </div>
              )}

              {activeTab === 'documents' && <div className="documents-card">
                <div className="documents-head">
                  <div>
                    <div className="field-label">Berkas Kandidat</div>
                    <p>Unggah KTP, KK, paspor, CV, sertifikat, atau dokumen pendukung lainnya. Maksimal 5 MB per file.</p>
                  </div>
                </div>
                <div className="document-slots">
                  {documentTypes.map((documentType, index) => {
                    const selected = selectedDocuments[documentType.id]
                    const files = documentType.id === 'pendukung'
                      ? (selected || [])
                      : (selected ? [selected] : [])
                    const file = files[0]
                    const stored = hasUploadedDocument(documentType.id)
                    const ready = stored || files.length > 0 || agencyDocuments[documentType.id]
                    return (
                      <div className="document-slot" key={documentType.id}>
                        <div className="document-slot-info">
                          <span className="document-number">{String(index + 1).padStart(2, '0')}</span>
                          <DocumentIcon type={documentType.id} />
                          <strong>{documentType.label}</strong>
                          <span>
                            {documentType.id === 'pendukung' && files.length
                              ? `${files.length} file dipilih · ${files.map((item) => item.name).join(', ')}`
                              : file
                                ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`
                                : stored
                                  ? 'Dokumen tersimpan'
                                : documentType.hint}
                          </span>
                        </div>
                        <label className={`upload-btn ${documentBusy || agencyDocuments[documentType.id] ? 'disabled' : ''}`}>
                          {ready ? 'OK' : 'Pilih file'}
                          <input type="file" multiple={documentType.id === 'pendukung'} accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(event) => handleDocumentSelect(event, documentType.id)} disabled={documentBusy || agencyDocuments[documentType.id]} />
                        </label>
                        {ready && !agencyDocuments[documentType.id] && (
                          <label className="edit-document-btn">
                            Edit
                            <input type="file" multiple={documentType.id === 'pendukung'} accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(event) => handleDocumentSelect(event, documentType.id)} disabled={documentBusy} />
                          </label>
                        )}
                        {(documentType.id === 'paspor' || documentType.id === 'visa') && (
                          <label className="agency-document-option">
                            <input type="checkbox" checked={agencyDocuments[documentType.id]} onChange={toggleAgencyDocument(documentType.id)} disabled={documentBusy || applying || applied} />
                            <span>Dibuat kolektif oleh agency</span>
                          </label>
                        )}
                      </div>
                    )
                  })}
                </div>
                {!documentsApiUrl && <p className="document-note">Upload dokumen belum aktif karena API Cloudflare belum dikonfigurasi.</p>}
                {!turnstileSiteKey && <p className="document-note">Upload dokumen belum aktif karena Turnstile belum dikonfigurasi.</p>}
                <p className="document-note">Pilih semua file terlebih dahulu, lalu centang verifikasi Cloudflare untuk mengunggahnya sekaligus.</p>
                {turnstileSiteKey && (
                  <div className="turnstile-box">
                    <Turnstile
                      siteKey={turnstileSiteKey}
                      options={{ action: 'document-upload', theme: 'light' }}
                      onSuccess={handleTurnstileSuccess}
                      onExpire={() => setTurnstileToken('')}
                      onError={() => setTurnstileToken('')}
                    />
                  </div>
                )}
                <div className="document-apply">
                  <p className="document-note">Dokumen pendukung bersifat opsional. KTP, KK, ijazah, dan CV wajib tersedia; Paspor dan Visa dapat digantikan dengan pilihan kolektif agency.</p>
                  <button className="apply-btn" type="button" onClick={handleApply} disabled={!canApply}>
                    {applying ? 'Menyimpan…' : applied ? '✓ Sudah Apply' : 'Apply'}
                  </button>
                </div>
              </div>}
            </>
          )}
        </Reveal>
      </div>
    </section>
  )
}

/* ---------------- Footer ---------------- */
function Footer() {
  return (
    <footer>
      <div className="foot-grid">
        <div>
          <div className="foot-brand">PT. JUARA</div>
          <p className="foot-desc">
            Agensi penempatan ketenagakerjaan Indonesia → Turki. Berbasis di Jakarta dengan kantor
            perwakilan di Istanbul. Terikat prinsip penempatan yang etis, kontrak transparan, dan
            perlindungan pekerja migran.
          </p>
        </div>
        <div>
          <h4>Penempatan</h4>
          <ul>
            <li>Istanbul</li><li>Antalya</li><li>Bodrum</li><li>Izmir</li><li>Cappadocia</li>
          </ul>
        </div>
        <div>
          <h4>Kontak</h4>
          <ul>
            <li><a href="#daftar">Daftar Kandidat</a></li>
            <li><a href="#hotel">Hotel Mitra</a></li>
            <li><a href="#proses">Alur Pendaftaran</a></li>
            <li>admin@juaraind.com</li>
          </ul>
        </div>
      </div>
      <div className="foot-bottom">
        <span>© 2026 PT. JUARA — PT Anadolu Talenta Nusantara</span>
        <span>Jakarta ✦ Istanbul</span>
      </div>
    </footer>
  )
}

function ScrollIndicator() {
  const [visible, setVisible] = useState(false)
  const thumbRef = React.useRef(null)
  const dragging = React.useRef(false)
  const frame = React.useRef(0)
  const thumbHeight = React.useRef(44)

  useEffect(() => {
    const updateMetrics = () => {
      const root = document.documentElement
      const pageHeight = root.scrollHeight
      const maxScroll = Math.max(0, pageHeight - window.innerHeight)
      thumbHeight.current = Math.max(44, window.innerHeight ** 2 / Math.max(pageHeight, 1))
      setVisible(maxScroll > 0)
      updatePosition()
    }
    const updatePosition = () => {
      frame.current = 0
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
      const trackHeight = Math.max(0, window.innerHeight - 8 - thumbHeight.current)
      const top = maxScroll ? window.scrollY / maxScroll * trackHeight : 0
      if (thumbRef.current) thumbRef.current.style.transform = `translate3d(0, ${top}px, 0)`
    }
    const onScroll = () => {
      if (!frame.current) frame.current = requestAnimationFrame(updatePosition)
    }
    const onPointerMove = (event) => {
      if (!dragging.current) return
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
      const maxTop = Math.max(0, window.innerHeight - 8 - thumbHeight.current)
      const progress = maxTop ? Math.max(0, Math.min(1, (event.clientY - 8 - thumbHeight.current / 2) / maxTop)) : 0
      window.scrollTo({ top: progress * maxScroll, behavior: 'auto' })
    }
    const stopDragging = () => { dragging.current = false }
    updateMetrics()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', updateMetrics)
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerup', stopDragging)
    const observer = new ResizeObserver(updateMetrics)
    observer.observe(document.documentElement)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', updateMetrics)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', stopDragging)
      observer.disconnect()
      if (frame.current) cancelAnimationFrame(frame.current)
    }
  }, [])

  if (!visible) return null
  return <div className="scroll-indicator" aria-hidden="true"><div ref={thumbRef} className="scroll-indicator-thumb" style={{ height: thumbHeight.current }} onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture?.(event.pointerId); dragging.current = true }} onPointerUp={(event) => { event.currentTarget.releasePointerCapture?.(event.pointerId); dragging.current = false }} /></div>
}

/* ---------------- App ---------------- */
export default function App() {
  if (maintenanceMode) return <MaintenancePage />

  const { session, loading, signInWithGoogle, signOut } = useSession()
  return (
    <>
      <ScrollIndicator />
      {!loading && !session && <Nav session={session} onLogin={signInWithGoogle} />}
      {!loading && !session && (
        <>
          <Hero session={session} onLogin={signInWithGoogle} />
          <Marquee />
          <Hotels />
          <Process />
          <Gallery />
        </>
      )}
      <AuthSection
        session={session}
        loading={loading}
        signInWithGoogle={signInWithGoogle}
        signOut={signOut}
      />
      {!loading && !session && <Footer />}
    </>
  )
}
