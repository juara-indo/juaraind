import React, { useEffect, useState } from 'react'
import { getSupabase, isConfigured } from './supabaseClient.js'
import { IMG, HOTELS, GALLERY, STEPS, POSITIONS, STATS } from './data.js'

/* ---------------- Google ikon (SVG resmi, inline) ---------------- */
const GoogleIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.5 6.1 29.5 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 18.9 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C36.9 40.2 44 35 44 24c0-1.2-.1-2.3-.4-3.5z"/>
  </svg>
)

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
      const supabase = await getSupabase()
      if (!supabase) { if (mounted) setLoading(false); return }
      const { data } = await supabase.auth.getSession()
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
    setLoading(true)
    ;(async () => {
      const supabase = await getSupabase()
      if (!supabase) { if (alive) setLoading(false); return }
      const uid = session.user.id
      let { data } = await supabase.from('candidates').select('*').eq('id', uid).maybeSingle()
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
      <ul className="nav-links">
        <li><a href="#hotel" onClick={(e) => { e.preventDefault(); go('hotel') }}>Hotel Mitra</a></li>
        <li><a href="#proses" onClick={(e) => { e.preventDefault(); go('proses') }}>Alur</a></li>
        <li><a href="#galeri" onClick={(e) => { e.preventDefault(); go('galeri') }}>Galeri</a></li>
        <li><a href="#daftar" onClick={(e) => { e.preventDefault(); go('daftar') }}>Pendaftaran</a></li>
      </ul>
      <button className="nav-cta" onClick={() => (session ? go('daftar') : onLogin())}>
        {session ? 'Dashboard Saya' : (<><GoogleIcon size={16} /> Masuk</>)}
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
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [err, setErr] = useState('')

  React.useEffect(() => {
    if (cand) {
      setForm({
        full_name: cand.full_name || '',
        phone: cand.phone || '',
        position: cand.position || '',
        experience: cand.experience || '',
      })
    }
  }, [cand])

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setSaved(false) }

  const save = async (e) => {
    e.preventDefault()
    setErr('')
    if (!form.full_name?.trim()) { setErr('Nama lengkap wajib diisi.'); return }
    if (!form.position) { setErr('Pilih posisi yang Anda incar.'); return }
    setSaving(true)
    const { error } = await updateProfile({
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      position: form.position,
      experience: form.experience.trim(),
    })
    setSaving(false)
    if (error) setErr('Gagal menyimpan: ' + error.message)
    else setSaved(true)
  }

  const copyId = async () => {
    try { await navigator.clipboard.writeText(cand.candidate_id) } catch { /* abaikan */ }
    setCopied(true); setTimeout(() => setCopied(false), 1800)
  }

  const meta = session?.user?.user_metadata || {}
  const avatar = meta.avatar_url || meta.picture

  return (
    <section className="section auth-section" id="daftar">
      <div className="auth-wrap">
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

          {sessLoading || (session && candLoading) ? (
            <p style={{ padding: 20, color: 'var(--ink-soft)' }}>Memuat…</p>
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
              <div className="user-line">
                {avatar && <img className="avatar" src={avatar} alt="Foto profil" referrerPolicy="no-referrer" />}
                <div className="user-meta">
                  <b>{meta.full_name || meta.name || session.user.email}</b>
                  <span>{session.user.email}</span>
                </div>
                <button className="signout" onClick={signOut}>Keluar</button>
              </div>

              {cand?.candidate_id && (
                <div className="id-card">
                  <div className="id-label">ID Kandidat Anda</div>
                  <div className="id-value">{cand.candidate_id}</div>
                  <div className="id-hint">Simpan / tangkap layar ID ini — itu kunci pemanggilan data Anda di kantor agency.</div>
                  <button className="copy-btn" onClick={copyId}>{copied ? '✓ Tersalin' : 'Salin ID'}</button>
                </div>
              )}

              {cand?.status && <div style={{ marginBottom: 18 }}><span className="status-chip">{cand.status}</span></div>}
              {err && <div className="err-box">{err}</div>}
              {saved && <div className="ok-box">✓ Data tersimpan. Tim rekrutmen kami akan menghubungi Anda melalui nomor telepon &amp; email terdaftar.</div>}

              {form && (
                <form className="form-grid" onSubmit={save}>
                  <div className="field full">
                    <label>Nama Lengkap (sesuai paspor)</label>
                    <input value={form.full_name} onChange={set('full_name')} placeholder="cth. Rizky Pratama" maxLength={160} required />
                  </div>
                  <div className="field">
                    <label>Nomor WhatsApp</label>
                    <input value={form.phone || ''} onChange={set('phone')} placeholder="+62 8xx-xxxx-xxxx" maxLength={32} />
                  </div>
                  <div className="field">
                    <label>Posisi yang Diincar</label>
                    <select value={form.position || ''} onChange={set('position')} required>
                      <option value="">— Pilih posisi —</option>
                      {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="field full">
                    <label>Pengalaman Kerja Singkat</label>
                    <textarea
                      value={form.experience || ''}
                      onChange={set('experience')}
                      placeholder="cth. 3 tahun waiter di hotel bintang 4 di Bali; dasar bahasa Inggris aktif…"
                      maxLength={2000}
                    />
                  </div>
                  <div className="full">
                    <button className="submit-btn" type="submit" disabled={saving}>
                      {saving ? 'Menyimpan…' : 'Simpan & Kirim Pendaftaran'}
                    </button>
                  </div>
                </form>
              )}
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
      const trackHeight = Math.max(0, window.innerHeight - thumbHeight.current)
      const top = maxScroll ? window.scrollY / maxScroll * trackHeight : 0
      if (thumbRef.current) thumbRef.current.style.transform = `translate3d(0, ${top}px, 0)`
    }
    const onScroll = () => {
      if (!frame.current) frame.current = requestAnimationFrame(updatePosition)
    }
    const onPointerMove = (event) => {
      if (!dragging.current) return
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
      const maxTop = Math.max(0, window.innerHeight - thumbHeight.current)
      const progress = maxTop ? Math.max(0, Math.min(1, (event.clientY - thumbHeight.current / 2) / maxTop)) : 0
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
      <Nav session={session} onLogin={signInWithGoogle} />
      <Hero session={session} onLogin={signInWithGoogle} />
      <Marquee />
      <Hotels />
      <Process />
      <Gallery />
      <AuthSection
        session={session}
        loading={loading}
        signInWithGoogle={signInWithGoogle}
        signOut={signOut}
      />
      <Footer />
    </>
  )
}
