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

const landingTranslations = {
  id: {
    nav: ['Hotel Mitra', 'Alur', 'Galeri', 'Pendaftaran'],
    signIn: 'Masuk',
    account: 'Akun Saya',
    heroTitle: <>Dari Nusantara ke <em>menara Istanbul</em> — karier Anda dimulai di sini.</>,
    register: 'Daftar dengan Google',
    complete: 'Lengkapi Pendaftaran',
    hotels: 'Lihat Hotel Mitra ↓',
    heroSide: 'Kami menempatkan talenta Indonesia terbaik di hotel-hotel bintang lima Turki — dengan kontrak resmi, izin kerja, dan pendampingan penuh dari Jakarta hingga Bosphorus.',
    hotelKicker: 'Jaringan Penempatan',
    hotelTitle: <>Hotel <em>berbintang lima</em> yang menanti Anda</>,
    hotelDesc: 'Semua mitra penempatan kami terverifikasi dan terikat kontrak kerja resmi. Setiap posisi disiapkan khusus untuk kandidat Indonesia.',
    processKicker: 'Alur 5 Langkah',
    processTitle: <>Dari daftar <em>hingga terbang</em>, kami dampingi</>,
    processDesc: 'Proses transparan dengan satu penanggung jawab per kandidat — Anda selalu tahu posisi Anda di setiap tahap.',
    galleryKicker: 'Galeri',
    galleryTitle: <>Seperti apa <em>dunia kerja</em> Anda nanti</>,
    galleryDesc: 'Potret hotel, resor, dan standar layanan di kota-kota penempatan kami di Turki.',
    footerDesc: 'Agensi penempatan ketenagakerjaan Indonesia → Turki. Berbasis di Jakarta dengan kantor perwakilan di Istanbul. Terikat prinsip penempatan yang etis, kontrak transparan, dan perlindungan pekerja migran.',
    placement: 'Penempatan',
    contact: 'Kontak',
    candidateRegister: 'Daftar Kandidat',
    processLink: 'Alur Pendaftaran',
    hotelLink: 'Hotel Mitra',
    hotelCountry: 'Turki',
    authKicker: 'Pendaftaran Kandidat',
    authTitle: <>Satu akun Google, <em>satu ID unik</em> untuk Anda</>,
    authDesc: <>Setiap kandidat menerima <b>ID Kandidat permanen</b> setelah akun terhubung. Sebutkan ID ini saat menghubungi kantor agency — seluruh berkas Anda bisa langsung dipanggil tanpa mencari ulang.</>,
    authBullets: ['Login aman via Google — tanpa mengisi password baru', 'Data tersimpan terenkripsi di Supabase (hanya Anda yang bisa melihat)', 'ID langsung diterbitkan otomatis saat akun dibuat'],
    authCardTitle: 'Masuk / Daftar',
    authCardDesc: 'Gunakan akun Google Anda. ID Kandidat akan diterbitkan otomatis begitu akun terhubung.',
    authGoogle: 'Masuk dengan Google',
    authNote: 'Dengan mendaftar, Anda menyetujui proses verifikasi dokumen dan seleksi oleh tim PT. JUARA. Data Anda tidak dibagikan ke pihak ketiga tanpa persetujuan.',
    stats: ['Kandidat ditempatkan sejak 2019', 'Hotel & resort mitra di Turki', 'Kota penempatan: Istanbul, Antalya, Bodrum, Izmir', 'Kelulusan visa kerja mitra'],
    steps: ['Daftar & Dapatkan ID', 'Seleksi & Wawancara', 'Pelatihan & Sertifikasi', 'Dokumen & Visa Kerja', 'Berangkat & Mulai Karier'],
    stepDescriptions: STEPS.map((step) => step.desc),
    galleryCaptions: GALLERY.map((gallery) => gallery.caption),
    hotelTiers: HOTELS.map((hotel) => hotel.tier),
    hotelPositions: Object.fromEntries(HOTELS.map((hotel) => [hotel.name, hotel.positions])),
    marquee: ['Istanbul ✦ Antalya ✦ Bodrum ✦ Izmir ✦ Cappadocia', 'Layanan F&B', 'Housekeeping', 'Front Office', 'Dapur & Pastry', 'Relasi Tamu'],
  },
  en: {
    nav: ['Partner Hotels', 'Process', 'Gallery', 'Registration'],
    signIn: 'Sign in',
    account: 'My Account',
    heroTitle: <>From the Nusantara to <em>Istanbul’s towers</em> — your career starts here.</>,
    register: 'Register with Google',
    complete: 'Complete Registration',
    hotels: 'View Partner Hotels ↓',
    heroSide: 'We place Indonesia’s best talent in five-star hotels across Türkiye — with official contracts, work permits, and full support from Jakarta to the Bosphorus.',
    hotelKicker: 'Placement Network',
    hotelTitle: <>Five-star <em>hotels</em> waiting for you</>,
    hotelDesc: 'All our placement partners are verified and bound by official employment contracts. Every position is prepared specifically for Indonesian candidates.',
    processKicker: '5-Step Process',
    processTitle: <>From registration <em>to takeoff</em>, we guide you</>,
    processDesc: 'A transparent process with one person responsible for each candidate — you always know where you stand.',
    galleryKicker: 'Gallery',
    galleryTitle: <>See your future <em>workplace</em></>,
    galleryDesc: 'A look at the hotels, resorts, and service standards in our placement cities across Türkiye.',
    footerDesc: 'An Indonesian → Türkiye employment placement agency. Based in Jakarta with a representative office in Istanbul. Built on ethical placement, transparent contracts, and migrant worker protection.',
    placement: 'Placements',
    contact: 'Contact',
    candidateRegister: 'Candidate Registration',
    processLink: 'Registration Process',
    hotelLink: 'Partner Hotels',
    hotelCountry: 'Türkiye',
    authKicker: 'Candidate Registration',
    authTitle: <>One Google account, <em>one unique ID</em> for you</>,
    authDesc: <>Every candidate receives a <b>permanent Candidate ID</b> after connecting their account. Share this ID with the agency office — your records can be retrieved immediately.</>,
    authBullets: ['Secure Google sign-in — no new password required', 'Your data is encrypted in Supabase and visible only to you', 'Your ID is issued automatically when your account is created'],
    authCardTitle: 'Sign in / Register',
    authCardDesc: 'Use your Google account. Your Candidate ID will be issued automatically once your account is connected.',
    authGoogle: 'Sign in with Google',
    authNote: 'By registering, you agree to document verification and selection by PT. JUARA. Your data will not be shared with third parties without your consent.',
    stats: ['Candidates placed since 2019', 'Partner hotels & resorts in Türkiye', 'Placement cities: Istanbul, Antalya, Bodrum, Izmir', 'Partner work visa approval rate'],
    steps: ['Register & Get Your ID', 'Selection & Interview', 'Training & Certification', 'Documents & Work Visa', 'Depart & Start Your Career'],
    stepDescriptions: [
      'Sign in with Google, complete your profile, and the system will issue your unique Candidate ID. Keep this ID: it is the key to retrieving your records at the agency.',
      'Our recruitment team reviews your experience and language skills. Shortlisted candidates join an online interview with a partner hotel recruiter in Türkiye.',
      'Learn basic Turkish, international hospitality standards, and workplace culture — including a workplace safety class.',
      'Passport processing, employment contracts, work permits, and visas are handled together with the agency’s legal officer until approved.',
      'Ticketing, arrival in Istanbul or Antalya, airport pickup, and orientation at your hotel.',
    ],
    galleryCaptions: [
      'Hotel staff uniforms — five-star hospitality standards',
      'Antalya resort pool — the heart of the Turkish summer',
      'Hotel operations team — your career opportunity',
      'Istanbul at night — a city across two continents',
      'Four Seasons Bosphorus — placement partner',
      'Mediterranean coast resort, Türkiye',
    ],
    hotelTiers: ['Five Star', 'Five Star', 'Five Star', 'Five Star · All-Inclusive', 'Five Star · Golf Resort'],
    hotelPositions: {
      'Four Seasons at the Bosphorus': ['F&B Service', 'Housekeeping', 'Guest Relations'],
      'CVK Park Bosphorus': ['Front Office', 'Kitchen / Pastry'],
      'Mandarin Oriental Bosphorus': ['F&B Service', 'Spa & Wellness'],
      'Miracle Resort': ['Animation Team', 'F&B Service'],
      'Cornelia DeLuxe Resort': ['Housekeeping', 'Kitchen / Pastry'],
    },
    marquee: ['Istanbul ✦ Antalya ✦ Bodrum ✦ Izmir ✦ Cappadocia', 'F&B Service', 'Housekeeping', 'Front Office', 'Kitchen & Pastry', 'Guest Relations'],
  },
  tr: {
    nav: ['Partner Oteller', 'Süreç', 'Galeri', 'Başvuru'],
    signIn: 'Giriş yap',
    account: 'Hesabım',
    heroTitle: <>Nusantara’dan <em>İstanbul kulelerine</em> — kariyeriniz burada başlıyor.</>,
    register: 'Google ile Başvur',
    complete: 'Başvuruyu Tamamla',
    hotels: 'Partner Otelleri Gör ↓',
    heroSide: 'Endonezya’nın en iyi yeteneklerini Türkiye’nin beş yıldızlı otellerine yerleştiriyoruz — Cakarta’dan Boğaz’a kadar resmi sözleşme, çalışma izni ve tam destek ile.',
    hotelKicker: 'Yerleştirme Ağı',
    hotelTitle: <>Sizi bekleyen <em>beş yıldızlı</em> oteller</>,
    hotelDesc: 'Tüm yerleştirme ortaklarımız doğrulanmış ve resmi iş sözleşmeleriyle bağlıdır. Her pozisyon Endonezyalı adaylar için özel olarak hazırlanır.',
    processKicker: '5 Adımlı Süreç',
    processTitle: <>Başvurudan <em>uçuşa kadar</em> yanınızdayız</>,
    processDesc: 'Her aday için tek sorumlu ile şeffaf bir süreç — her aşamada durumunuzu bilirsiniz.',
    galleryKicker: 'Galeri',
    galleryTitle: <>Gelecekteki <em>çalışma dünyanızı</em> görün</>,
    galleryDesc: 'Türkiye’deki yerleştirme şehirlerimizdeki otel, tatil köyü ve hizmet standartlarından kareler.',
    footerDesc: 'Endonezya → Türkiye iş yerleştirme ajansı. Cakarta merkezli, İstanbul’da temsilcilik ofisi bulunan ajansımız etik yerleştirme, şeffaf sözleşmeler ve göçmen işçi koruması ilkeleriyle çalışır.',
    placement: 'Yerleştirmeler',
    contact: 'İletişim',
    candidateRegister: 'Aday Başvurusu',
    processLink: 'Başvuru Süreci',
    hotelLink: 'Partner Oteller',
    hotelCountry: 'Türkiye',
    authKicker: 'Aday Başvurusu',
    authTitle: <>Tek Google hesabı, <em>size özel tek kimlik</em></>,
    authDesc: <>Her aday, hesabını bağladıktan sonra <b>kalıcı bir Aday Kimliği</b> alır. Bu kimliği acente ofisiyle paylaşın — kayıtlarınıza hemen ulaşılabilir.</>,
    authBullets: ['Güvenli Google girişi — yeni bir şifre gerekmez', 'Verileriniz Supabase’de şifrelenir ve yalnızca sizin tarafınızdan görüntülenebilir', 'Hesabınız oluşturulduğunda kimliğiniz otomatik olarak verilir'],
    authCardTitle: 'Giriş / Başvuru',
    authCardDesc: 'Google hesabınızı kullanın. Hesabınız bağlandığında Aday Kimliğiniz otomatik olarak oluşturulur.',
    authGoogle: 'Google ile giriş yap',
    authNote: 'Başvurarak PT. JUARA tarafından yapılacak belge doğrulama ve seçim sürecini kabul etmiş olursunuz. Verileriniz izniniz olmadan üçüncü taraflarla paylaşılmaz.',
    stats: ['2019’dan beri yerleştirilen adaylar', 'Türkiye’deki partner otel ve tatil köyleri', 'Yerleştirme şehirleri: İstanbul, Antalya, Bodrum, İzmir', 'Partner çalışma vizesi onay oranı'],
    steps: ['Başvurun ve Kimliğinizi Alın', 'Seçim ve Mülakat', 'Eğitim ve Sertifikasyon', 'Belgeler ve Çalışma Vizesi', 'Yola Çıkın ve Kariyerinize Başlayın'],
    stepDescriptions: [
      'Google ile giriş yapın, profilinizi tamamlayın ve sistem benzersiz Aday Kimliğinizi oluştursun. Bu kimliği saklayın: acentedeki kayıtlarınıza ulaşmanın anahtarıdır.',
      'İşe alım ekibimiz deneyiminizi ve dil becerilerinizi değerlendirir. Uygun adaylar, Türkiye’deki partner otelin işe alım uzmanıyla çevrim içi görüşmeye davet edilir.',
      'Temel Türkçe, uluslararası otelcilik standartları ve iş kültürü eğitimi alın — iş güvenliği dersi dahil.',
      'Pasaport işlemleri, iş sözleşmesi, çalışma izni ve vize süreçleri, onaylanana kadar acentenin hukuk sorumlusuyla birlikte yürütülür.',
      'Biletleme, İstanbul veya Antalya’ya varış, havaalanı karşılaması ve çalışacağınız otelde oryantasyon.',
    ],
    galleryCaptions: [
      'Otel personeli üniformaları — beş yıldızlı hizmet standardı',
      'Antalya tatil köyü havuzu — Türkiye yazının kalbi',
      'Otel operasyon ekibi — kariyer fırsatınız',
      'Gece İstanbul — iki kıtayı birleştiren şehir',
      'Four Seasons Bosphorus — yerleştirme ortağı',
      'Akdeniz sahilindeki tatil köyü, Türkiye',
    ],
    hotelTiers: ['Beş Yıldızlı', 'Beş Yıldızlı', 'Beş Yıldızlı', 'Beş Yıldızlı · Her Şey Dahil', 'Beş Yıldızlı · Golf Resort'],
    hotelPositions: {
      'Four Seasons at the Bosphorus': ['Yiyecek & İçecek', 'Kat Hizmetleri', 'Misafir İlişkileri'],
      'CVK Park Bosphorus': ['Ön Büro', 'Mutfak & Pastane'],
      'Mandarin Oriental Bosphorus': ['Yiyecek & İçecek', 'Spa & Wellness'],
      'Miracle Resort': ['Animasyon Ekibi', 'Yiyecek & İçecek'],
      'Cornelia DeLuxe Resort': ['Kat Hizmetleri', 'Mutfak & Pastane'],
    },
    marquee: ['İstanbul ✦ Antalya ✦ Bodrum ✦ İzmir ✦ Kapadokya', 'Yiyecek & İçecek', 'Kat Hizmetleri', 'Ön Büro', 'Mutfak & Pastane', 'Misafir İlişkileri'],
  },
}

const DocumentIcon = ({ type }) => {
  const detail = {
    ktp: <><rect x="4" y="6" width="16" height="12" rx="2" /><circle cx="9" cy="11" r="1.8" /><path d="M13 10h4M13 13h4" /></>,
    kk: <><rect x="5" y="4" width="14" height="16" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
    ijazah: <><path d="m3 8 9-4 9 4-9 4-9-4Z" /><path d="M6 10v5c3 2 9 2 12 0v-5M12 12v6" /></>,
    cv: <><path d="M7 4h7l4 4v12H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" /><path d="M14 4v5h5M8 13h6M8 16h5" /></>,
    pas_photo: <><circle cx="12" cy="8" r="3" /><path d="M5 20c.8-4 3.1-6 7-6s6.2 2 7 6" /></>,
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

function SearchableSelect({ value, onChange, options, placeholder, id, tabIndex, disabled = false }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlighted, setHighlighted] = useState(0)
  const rootRef = React.useRef(null)
  const inputRef = React.useRef(null)
  const normalizedOptions = options.map((option) => {
    if (typeof option === 'string') return { value: option, label: option }
    return { value: option.value ?? option.name, label: option.label ?? option.name }
  })
  const filteredOptions = normalizedOptions.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()))

  React.useEffect(() => {
    if (!open) return undefined
    const closeWhenOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeWhenOutside)
    return () => document.removeEventListener('pointerdown', closeWhenOutside)
  }, [open])

  const selectOption = (option) => {
    onChange({ target: { value: option.value } })
    setQuery('')
    setOpen(false)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        setHighlighted(0)
      } else if (filteredOptions[highlighted]) {
        selectOption(filteredOptions[highlighted])
      }
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) setOpen(true)
      const delta = event.key === 'ArrowDown' ? 1 : -1
      setHighlighted((current) => Math.max(0, Math.min(filteredOptions.length - 1, current + delta)))
      return
    }
    if (event.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  return (
    <div ref={rootRef} className={`searchable-select ${open ? 'is-open' : ''}`}>
      <input
        ref={inputRef}
        id={id}
        tabIndex={tabIndex}
        value={open ? query : value}
        onChange={(event) => { setQuery(event.target.value); setHighlighted(0); setOpen(true) }}
        onFocus={() => { setQuery(''); setHighlighted(0); setOpen(true) }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        aria-haspopup="listbox"
        aria-expanded={open}
      />
      {open && (
        <div className="searchable-select-menu" role="listbox">
          {filteredOptions.length ? filteredOptions.map((option, index) => (
            <button
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={index === highlighted ? 'is-highlighted' : ''}
              key={option.value}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectOption(option)}
            >
              {option.label}
            </button>
          )) : <span className="searchable-select-empty">Tidak ada pilihan</span>}
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
  const [roleError, setRoleError] = useState('')

  const validateRole = async (nextSession, supabase) => {
    if (!nextSession) {
      setRoleError('')
      return true
    }
    const apiUrl = import.meta.env.VITE_DOCUMENTS_API_URL
    if (!apiUrl) return true
    const response = await fetch(`${apiUrl}/account/role`, {
      headers: { Authorization: `Bearer ${nextSession.access_token}` },
    })
    if (!response.ok) return true
    const payload = await response.json()
    if (payload.role !== 'admin') return true
    await supabase.auth.signOut()
    setRoleError('Akun ini terdaftar sebagai Admin dan tidak dapat digunakan untuk area peserta. Gunakan halaman Admin.')
    return false
  }

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
      const allowed = await validateRole(data.session, supabase)
      if (!mounted) return
      setSession(allowed ? data.session : null)
      setLoading(false)
      const res = supabase.auth.onAuthStateChange(async (_e, s) => {
        const allowed = await validateRole(s, supabase)
        if (mounted) setSession(allowed ? s : null)
      })
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
    const userId = (await supabase?.auth.getUser())?.data?.user?.id
    if (userId) {
      try {
        sessionStorage.removeItem(`juara-candidate-${userId}`)
        sessionStorage.removeItem(`juara-documents-${userId}`)
        sessionStorage.removeItem(`juara-agency-documents-${userId}`)
      } catch { /* cache is optional */ }
    }
    return supabase?.auth.signOut()
  }
  return { session, loading, roleError, signInWithGoogle, signOut }
}

/* ---------------- Kandidat: ID + form ---------------- */
function useCandidate(session) {
  const [cand, setCand] = useState(() => {
    if (!session) return null
    try {
      const cached = sessionStorage.getItem(`juara-candidate-${session.user.id}`)
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!session || !isConfigured) { setCand(null); return }
    let alive = true
    const startedAt = performance.now()
    let cachedCandidate = null
    try {
      const cached = sessionStorage.getItem(`juara-candidate-${session.user.id}`)
      cachedCandidate = cached ? JSON.parse(cached) : null
    } catch {
      cachedCandidate = null
    }
    if (cachedCandidate) setCand(cachedCandidate)
    setLoading(!cachedCandidate)
    ;(async () => {
      const supabase = await getSupabase()
      if (!supabase) { if (alive) setLoading(false); return }
      const uid = session.user.id
      let { data } = await supabase.from('candidates').select('*').eq('id', uid).maybeSingle()
      if (data) {
        try { sessionStorage.setItem(`juara-candidate-${uid}`, JSON.stringify(data)) } catch { /* cache is optional */ }
      }
      if (!cachedCandidate) await holdTransition(startedAt, 650)
      if (alive) { setCand(data || cachedCandidate); setLoading(false) }
    })()
    return () => { alive = false }
  }, [session?.user?.id])

  const updateProfile = async (fields) => {
    if (!session) return { error: null }
    const supabase = await getSupabase()
    if (!supabase) return { error: { message: 'Supabase not configured' } }
    const { error } = await supabase.from('candidates').update(fields).eq('id', session.user.id)
    if (!error) {
      setCand((current) => {
        const next = { ...current, ...fields }
        try { sessionStorage.setItem(`juara-candidate-${session.user.id}`, JSON.stringify(next)) } catch { /* cache is optional */ }
        return next
      })
    }
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
  { id: 'pas_photo', label: 'UPLOAD PAS PHOTO', hint: 'Foto formal terbaru' },
  { id: 'pendukung', label: 'Dokumen pendukung', hint: 'Sertifikat atau dokumen lainnya' },
  { id: 'paspor', label: 'Paspor', hint: 'Halaman identitas paspor' },
  { id: 'visa', label: 'Visa', hint: 'Dokumen visa atau izin tinggal' },
]

function useDocuments(session) {
  const cacheKey = session?.user?.id ? `juara-documents-${session.user.id}` : ''
  const readCachedDocuments = () => {
    try { return cacheKey ? JSON.parse(sessionStorage.getItem(cacheKey) || '[]') : [] } catch { return [] }
  }
  const [documents, setDocuments] = useState(readCachedDocuments)
  const [agencyDocuments, setAgencyDocuments] = useState(() => {
    try {
      return session?.user?.id
        ? JSON.parse(sessionStorage.getItem(`juara-agency-documents-${session.user.id}`) || '{"paspor":false,"visa":false}')
        : { paspor: false, visa: false }
    } catch {
      return { paspor: false, visa: false }
    }
  })
  const [loading, setLoading] = useState(() => readCachedDocuments().length === 0)
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
      const nextDocuments = payload.documents || []
      setDocuments(nextDocuments)
      try { if (cacheKey) sessionStorage.setItem(cacheKey, JSON.stringify(nextDocuments)) } catch { /* cache is optional */ }
      if (payload.agencyDocuments) {
        setAgencyDocuments(payload.agencyDocuments)
        try { if (session?.user?.id) sessionStorage.setItem(`juara-agency-documents-${session.user.id}`, JSON.stringify(payload.agencyDocuments)) } catch { /* cache is optional */ }
      }
      setError('')
    } catch (requestError) {
      setError(requestError.message)
      throw requestError
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!session || !documentsApiUrl) return
    refresh().catch(() => undefined)
  }, [session?.user?.id])

  const upload = async (files, turnstileToken, documentTypes, documentNames = []) => {
    const body = new FormData()
    files.forEach((file, index) => {
      body.append('files', file)
      body.append('document_types', documentTypes[index])
      if (documentNames[index]) body.append('document_names', documentNames[index])
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

  const getDocumentUrl = async (document) => {
    const response = await fetch(`${documentsApiUrl}/documents/${encodeURIComponent(document.id)}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (!response.ok) throw new Error('Gagal memuat dokumen.')
    return URL.createObjectURL(await response.blob())
  }

  return { documents, loading, error, agencyDocuments, setAgencyDocuments, upload, download, getDocumentUrl, remove, submitApplication }
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
function Nav({ session, onLogin, language, setLanguage }) {
  const copy = landingTranslations[language]
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
        <li><a href="#hotel" onClick={(e) => { e.preventDefault(); go('hotel') }}>{copy.nav[0]}</a></li>
        <li><a href="#proses" onClick={(e) => { e.preventDefault(); go('proses') }}>{copy.nav[1]}</a></li>
        <li><a href="#galeri" onClick={(e) => { e.preventDefault(); go('galeri') }}>{copy.nav[2]}</a></li>
        <li><a href="#daftar" onClick={(e) => { e.preventDefault(); go('daftar') }}>{copy.nav[3]}</a></li>
      </ul>
      <label className="language-select">
        <span className="sr-only">Bahasa</span>
        <select value={language} onChange={(event) => setLanguage(event.target.value)} aria-label="Pilih bahasa">
          <option value="id">🇮🇩 Indonesia</option>
          <option value="en">🇬🇧 English</option>
          <option value="tr">🇹🇷 Türkçe</option>
        </select>
      </label>
      <button className="nav-cta" onClick={() => (session ? go('daftar') : onLogin())}>
        {session ? copy.account : (<><GoogleIcon size={16} /> {copy.signIn}</>)}
      </button>
    </header>
  )
}

/* ---------------- Hero: layar besar ---------------- */
function Hero({ session, onLogin, language }) {
  const copy = landingTranslations[language]
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
            {copy.heroTitle}
          </h1>
          <div className="hero-row">
            <button className="btn-primary" onClick={() => (session ? go('daftar') : onLogin())}>
              {session ? copy.complete : copy.register}
            </button>
            <button className="btn-ghost" onClick={() => go('hotel')}>{copy.hotels}</button>
          </div>
        </div>
        <p className="hero-side">
          {copy.heroSide}
        </p>
      </div>
      <div className="hero-stats">
        {STATS.map((s, i) => (
          <div className="hero-stat" key={s.label}><b>{s.value}</b><span>{copy.stats[i]}</span></div>
        ))}
      </div>
    </section>
  )
}

/* ---------------- Marquee ---------------- */
function Marquee({ language }) {
  const items = landingTranslations[language].marquee
  const row = items.map((t, i) => <span key={i}>{t} <i className="dot" /></span>)
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">{row}{row}</div>
    </div>
  )
}

/* ---------------- Hotels ---------------- */
function Hotels({ language }) {
  const copy = landingTranslations[language]
  return (
    <section className="section hotels" id="hotel">
      <Reveal className="section-head">
        <div>
          <div className="sec-kicker">{copy.hotelKicker}</div>
          <h2 className="sec-title">{copy.hotelTitle}</h2>
        </div>
        <p className="sec-desc">
          {copy.hotelDesc}
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
              <div className="hotel-tier">{copy.hotelTiers[i]}</div>
              <div className="hotel-name">{h.name}</div>
              <div className="hotel-city"><Pin /> {h.city}, {copy.hotelCountry}</div>
              <div className="hotel-tags">{copy.hotelPositions[h.name].map((position) => <span key={position}>{position}</span>)}</div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

/* ---------------- Timeline proses ---------------- */
function Process({ language }) {
  const copy = landingTranslations[language]
  return (
    <section className="section process" id="proses">
      <Reveal className="section-head">
        <div>
          <div className="sec-kicker">{copy.processKicker}</div>
          <h2 className="sec-title">{copy.processTitle}</h2>
        </div>
        <p className="sec-desc">
          {copy.processDesc}
        </p>
      </Reveal>
      <div className="tl">
        {STEPS.map((s, i) => (
          <Reveal className="tl-item" key={s.no} delay={i * 80}>
            <div className="tl-no">{s.no}</div>
            <div className="tl-title">{copy.steps[i]}</div>
            <p className="tl-desc">{copy.stepDescriptions[i]}</p>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

/* ---------------- Galeri kolase ---------------- */
function Gallery({ language }) {
  const copy = landingTranslations[language]
  return (
    <section className="section" id="galeri">
      <Reveal className="section-head">
        <div>
          <div className="sec-kicker">{copy.galleryKicker}</div>
          <h2 className="sec-title">{copy.galleryTitle}</h2>
        </div>
        <p className="sec-desc">
          {copy.galleryDesc}
        </p>
      </Reveal>
      <div className="collage">
        {GALLERY.map((g, i) => (
          <Reveal as="figure" key={i} delay={i * 50}>
            <picture>
              <source type="image/webp" srcSet={g.srcSet?.replace(/\.jpg/g, '.webp')} sizes={g.sizes} />
              <img src={g.img} alt={copy.galleryCaptions[i]} loading="lazy" decoding="async" width={g.width} height={g.height} srcSet={g.srcSet} sizes={g.sizes} />
            </picture>
            <figcaption>{copy.galleryCaptions[i]}</figcaption>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

/* ---------------- Auth + Dashboard ---------------- */
function AuthSection({ session, loading: sessLoading, roleError, signInWithGoogle, signOut, language = 'id' }) {
  const copy = landingTranslations[language]
  const { cand, loading: candLoading, updateProfile } = useCandidate(session)
  const { documents, loading: documentsLoading, error: documentsError, agencyDocuments, setAgencyDocuments, upload, download, getDocumentUrl, remove, submitApplication } = useDocuments(session)
  const [form, setForm] = useState(null)
  const [documentBusy, setDocumentBusy] = useState(false)
  const [selectedDocuments, setSelectedDocuments] = useState({})
  const [supportingDocuments, setSupportingDocuments] = useState([])
  const [turnstileToken, setTurnstileToken] = useState('')
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [err, setErr] = useState('')
  const [activeTab, setActiveTab] = useState('profile')
  const [isEditing, setIsEditing] = useState(true)
  const { provinces, cities } = useRegionOptions(form)
  const [avatarUrl, setAvatarUrl] = useState('')

  useEffect(() => {
    if (!documentBusy) return undefined
    const warnBeforeLeave = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeLeave)
    return () => window.removeEventListener('beforeunload', warnBeforeLeave)
  }, [documentBusy])

  useEffect(() => {
    let active = true
    const pasPhoto = documents.find((document) => document.document_type === 'pas_photo')
    if (!pasPhoto) {
      setAvatarUrl('')
      return undefined
    }
    getDocumentUrl(pasPhoto)
      .then((url) => {
        if (active) setAvatarUrl(url)
        else URL.revokeObjectURL(url)
      })
      .catch(() => { if (active) setAvatarUrl('') })
    return () => {
      active = false
      setAvatarUrl((current) => {
        if (current) URL.revokeObjectURL(current)
        return ''
      })
    }
  }, [documents])

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
      const profileValues = [
        cand.full_name,
        cand.birth_place,
        cand.birth_date,
        cand.gender,
        cand.phone,
        cand.address,
        cand.province,
        cand.city,
        cand.postal_code,
        cand.experience,
      ]
      setIsEditing(profileValues.some((value) => !String(value || '').trim()))
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
      const isPasPhoto = documentType === 'pas_photo'
      if (!allowedDocumentTypes.has(file.type) || (isPasPhoto && !['image/jpeg', 'image/png'].includes(file.type))) {
        setErr(isPasPhoto ? 'Pas photo harus berupa JPG atau PNG.' : 'Format file harus PDF, JPG, atau PNG.')
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

  const addSupportingDocument = () => {
    setSupportingDocuments((current) => [...current, { id: `${Date.now()}-${current.length}`, name: '', file: null }])
    setErr('')
  }

  const updateSupportingDocument = (id, field, value) => {
    setSupportingDocuments((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item))
  }

  const handleSupportingFileSelect = (event, id) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!allowedDocumentTypes.has(file.type)) {
      setErr('Format file harus PDF, JPG, atau PNG.')
      return
    }
    if (file.size > maxDocumentSize) {
      setErr('Ukuran file maksimal 5 MB.')
      return
    }
    updateSupportingDocument(id, 'file', file)
    setErr('')
  }

  const handleTurnstileSuccess = (token) => {
    setErr('')
    setTurnstileToken(token)
  }

  const handleBatchUpload = async () => {
    if (supportingDocuments.some((item) => Boolean(item.file) !== Boolean(item.name.trim()))) {
      setErr('Lengkapi nama dan file untuk setiap dokumen pendukung.')
      return
    }
    const files = []
    const documentTypes = []
    const documentNames = []
    Object.entries(selectedDocuments).forEach(([documentType, selected]) => {
      const selectedFiles = documentType === 'pendukung' ? selected : [selected]
      selectedFiles.filter(Boolean).forEach((file) => {
        files.push(file)
        documentTypes.push(documentType)
        documentNames.push('')
      })
    })
    supportingDocuments.forEach((item) => {
      if (!item.file) return
      const customName = item.name.trim()
      if (!customName) return
      files.push(item.file)
      documentTypes.push('pendukung')
      documentNames.push(customName)
    })
    if (!files.length) return
    setErr('')
    if (!turnstileToken) {
      setErr('Selesaikan verifikasi keamanan terlebih dahulu.')
      return
    }
    setDocumentBusy(true)
    try {
      await upload(files, turnstileToken, documentTypes, documentNames)
      setSelectedDocuments({})
      setSupportingDocuments([])
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
    setAgencyDocuments((current) => {
      const next = { ...current, [documentType]: checked }
      try { sessionStorage.setItem(`juara-agency-documents-${session.user.id}`, JSON.stringify(next)) } catch { /* cache is optional */ }
      return next
    })
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
  const hasAcceptedDocument = (documentType) => documents.some((document) => document.document_type === documentType && document.validation_status === 'accepted')
  const hasRejectedDocument = (documentType) => documents.some((document) => document.document_type === documentType && document.validation_status === 'rejected')
  const documentReady = (documentType) => hasUploadedDocument(documentType) || agencyDocuments[documentType]
  const canApply = requiredDocumentTypes.every(documentReady) && !documentBusy && !applying && !applied
  const hasPendingDocuments = Object.values(selectedDocuments).some((selected) => (
    Array.isArray(selected) ? selected.length > 0 : Boolean(selected)
  )) || supportingDocuments.some((item) => item.file || item.name.trim())

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
            <span className="transition-kicker">{language === 'tr' ? 'Aday başvurusu' : language === 'en' ? 'Candidate registration' : 'Pendaftaran kandidat'}</span>
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
            <div className="sec-kicker">{copy.authKicker}</div>
            <h2 className="sec-title">{copy.authTitle}</h2>
            <p className="sec-desc">
              {copy.authDesc}
            </p>
            <ul style={{ listStyle: 'none', display: 'grid', gap: 12, fontSize: 14, color: 'var(--ink-soft)' }}>
              {copy.authBullets.map((bullet) => <li key={bullet}>✦ {bullet}</li>)}
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
                {avatarUrl ? <img className="avatar avatar-photo" src={avatarUrl} alt="Pas photo kandidat" /> : <AvatarIcon />}
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

          {session && candLoading && !cand ? (
            <div className="inline-transition" role="status" aria-label="Menyiapkan formulir pendaftaran">
              <span className="transition-kicker">Menyiapkan formulir</span>
              <span className="transition-line" aria-hidden="true" />
            </div>
          ) : !session ? (
            <>
              <h3 style={{ fontFamily: 'var(--serif)', fontSize: 26, marginBottom: 8 }}>{copy.authCardTitle}</h3>
              {roleError && <div className="err-box">{roleError}</div>}
              <p style={{ fontSize: 14, color: 'var(--ink-soft)', marginBottom: 22, lineHeight: 1.7 }}>
                {copy.authCardDesc}
              </p>
              <button className="google-btn" onClick={signInWithGoogle} disabled={!isConfigured}>
                <GoogleIcon /> {copy.authGoogle}
              </button>
              <p className="auth-note">
                {copy.authNote}
              </p>
            </>
          ) : (
            <>
              {err && <div className="err-box">{err}</div>}
              {documentsError && !err && <div className="err-box">{documentsError}</div>}
              <div className="candidate-tabs" role="tablist" aria-label="Tahapan pendaftaran">
                <button type="button" role="tab" aria-selected={activeTab === 'profile'} className={activeTab === 'profile' ? 'is-active' : ''} onClick={() => setActiveTab('profile')} disabled={documentBusy}>
                  <span>01</span> Data diri
                </button>
                <button type="button" role="tab" aria-selected={activeTab === 'documents'} className={activeTab === 'documents' ? 'is-active' : ''} onClick={() => setActiveTab('documents')} disabled={documentBusy}>
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
                    <SearchableSelect id="province" tabIndex="7" value={form.province} options={provinces} onChange={set('province')} placeholder="Ketik untuk mencari provinsi" disabled={!isEditing} />
                  </div>
                  <div className="field">
                    <label htmlFor="city">Kota / kabupaten</label>
                    <SearchableSelect id="city" tabIndex="8" value={form.city} options={cities} onChange={set('city')} placeholder="Pilih provinsi terlebih dahulu" disabled={!isEditing || !cities.length} />
                  </div>
                  <div className="field">
                    <label htmlFor="postal-code">Kode pos</label>
                    <input
                      id="postal-code"
                      tabIndex="9"
                      value={form.postal_code}
                      onChange={set('postal_code')}
                      placeholder="Masukkan kode pos"
                      inputMode="numeric"
                      maxLength={10}
                      readOnly={!isEditing}
                    />
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
                    const accepted = hasAcceptedDocument(documentType.id)
                    const rejected = !accepted && !files.length && hasRejectedDocument(documentType.id)
                    const ready = stored || files.length > 0 || agencyDocuments[documentType.id]
                    if (documentType.id === 'pendukung') {
                      const storedSupportingDocuments = documents.filter((document) => document.document_type === 'pendukung')
                      return (
                        <div className="document-slot supporting-document-slot" key={documentType.id}>
                          <div className="document-slot-info">
                            <span className="document-number">{String(index + 1).padStart(2, '0')}</span>
                            <DocumentIcon type="pendukung" />
                            <strong>{documentType.label}</strong>
                            <span>{storedSupportingDocuments.length ? `${storedSupportingDocuments.length} dokumen tersimpan` : 'Tambahkan dokumen lain jika diperlukan'}</span>
                          </div>
                          <button className="supporting-add-btn" type="button" onClick={addSupportingDocument} disabled={documentBusy}>+</button>
                          {(storedSupportingDocuments.length > 0 || supportingDocuments.length > 0) && (
                            <div className="supporting-document-list">
                              {storedSupportingDocuments.map((document, storedIndex) => (
                                <div className="supporting-document-row supporting-document-stored" key={document.id}>
                                  <span className="supporting-document-number">{storedIndex + 1}</span>
                                  <div className="supporting-document-name">
                                    <strong>{document.file_name}</strong>
                                    <small>Dokumen tersimpan</small>
                                  </div>
                                  <span className="upload-btn upload-status" aria-label="Dokumen sudah tersimpan">OK</span>
                                </div>
                              ))}
                              {supportingDocuments.map((item, itemIndex) => (
                                <div className="supporting-document-row" key={item.id}>
                                  <span className="supporting-document-number">{storedSupportingDocuments.length + itemIndex + 1}</span>
                                  <input
                                    type="text"
                                    value={item.name}
                                    onChange={(event) => updateSupportingDocument(item.id, 'name', event.target.value)}
                                    placeholder="Nama dokumen"
                                    maxLength={120}
                                    disabled={documentBusy}
                                  />
                                  <label className={`upload-btn ${documentBusy ? 'disabled' : ''}`}>
                                    {item.file ? 'Siap diunggah' : 'Pilih file'}
                                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(event) => handleSupportingFileSelect(event, item.id)} disabled={documentBusy} />
                                  </label>
                                  {item.file && <small className="supporting-document-pending">Menunggu tombol “Unggah semua dokumen” · {item.file.name}</small>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    }
                    return (
                      <div className={`document-slot ${rejected ? 'is-rejected' : ''} ${documentType.id === 'paspor' ? 'is-special-start' : ''}`} key={documentType.id}>
                        <div className="document-slot-info">
                          <span className="document-number">{String(index + 1).padStart(2, '0')}</span>
                          <DocumentIcon type={documentType.id} />
                          <strong>{documentType.label}</strong>
                          <span>
                            {documentType.id === 'pendukung' && files.length
                              ? `${files.length} file dipilih · ${files.map((item) => item.name).join(', ')}`
                              : file
                                ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`
                                : rejected
                                  ? 'Dokumen ditolak'
                                  : stored
                                    ? 'Dokumen tersimpan'
                                : documentType.hint}
                          </span>
                        </div>
                        {rejected ? (
                          <label className={`edit-document-btn rejected-edit ${documentBusy ? 'disabled' : ''}`}>
                            Ganti dokumen
                            <input type="file" multiple={documentType.id === 'pendukung'} accept={documentType.id === 'pas_photo' ? '.jpg,.jpeg,.png,image/jpeg,image/png' : '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png'} onChange={(event) => handleDocumentSelect(event, documentType.id)} disabled={documentBusy} />
                          </label>
                        ) : ready ? (
                          <span className="upload-btn upload-status" aria-label="Dokumen sudah dipilih">
                            OK
                          </span>
                        ) : (
                          <label className={`upload-btn ${documentBusy || agencyDocuments[documentType.id] ? 'disabled' : ''}`}>
                            Pilih file
                            <input type="file" multiple={documentType.id === 'pendukung'} accept={documentType.id === 'pas_photo' ? '.jpg,.jpeg,.png,image/jpeg,image/png' : '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png'} onChange={(event) => handleDocumentSelect(event, documentType.id)} disabled={documentBusy || agencyDocuments[documentType.id]} />
                          </label>
                        )}
                        {ready && !rejected && !agencyDocuments[documentType.id] && !accepted && (
                          <label className="edit-document-btn">
                            Edit
                            <input type="file" multiple={documentType.id === 'pendukung'} accept={documentType.id === 'pas_photo' ? '.jpg,.jpeg,.png,image/jpeg,image/png' : '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png'} onChange={(event) => handleDocumentSelect(event, documentType.id)} disabled={documentBusy} />
                          </label>
                        )}
                        {(documentType.id === 'paspor' || documentType.id === 'visa') && (
                          <label className="agency-document-option">
                            <input type="checkbox" checked={agencyDocuments[documentType.id]} onChange={toggleAgencyDocument(documentType.id)} disabled={documentBusy || applying || applied || accepted} />
                            <span>Dibuat kolektif oleh agency</span>
                          </label>
                        )}
                      </div>
                    )
                  })}
                </div>
                {!documentsApiUrl && <p className="document-note">Upload dokumen belum aktif karena API Cloudflare belum dikonfigurasi.</p>}
                {!turnstileSiteKey && <p className="document-note">Upload dokumen belum aktif karena Turnstile belum dikonfigurasi.</p>}
                {hasPendingDocuments && (
                  <p className="document-note">Centang verifikasi Cloudflare untuk mengunggah file yang dipilih.</p>
                )}
                {hasPendingDocuments && turnstileSiteKey && (
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
                {hasPendingDocuments && turnstileToken && (
                <button className="document-submit" type="button" onClick={handleBatchUpload} disabled={documentBusy || !documentsApiUrl}>
                  {documentBusy ? 'Mengunggah dokumen…' : 'Unggah semua dokumen'}
                </button>
                )}
                <div className="document-apply">
                  <p className="document-note">Dokumen pendukung bersifat opsional. KTP, KK, ijazah, dan CV wajib tersedia; Paspor dan Visa dapat digantikan dengan pilihan kolektif agency.</p>
                  <button className="apply-btn" type="button" onClick={handleApply} disabled={!canApply} aria-busy={documentBusy || applying}>
                    {documentBusy ? 'Menyimpan dokumen…' : applying ? 'Menyimpan pendaftaran…' : applied ? '✓ Sudah Apply' : 'Apply'}
                    {(documentBusy || applying) && <span className="apply-spinner" aria-hidden="true" />}
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
function Footer({ language }) {
  const copy = landingTranslations[language]
  return (
    <footer>
      <div className="foot-grid">
        <div>
          <div className="foot-brand">PT. JUARA</div>
          <p className="foot-desc">{copy.footerDesc}</p>
        </div>
        <div>
          <h4>{copy.placement}</h4>
          <ul>
            <li>Istanbul</li><li>Antalya</li><li>Bodrum</li><li>Izmir</li><li>Cappadocia</li>
          </ul>
        </div>
        <div>
          <h4>{copy.contact}</h4>
          <ul>
            <li><a href="#daftar">{copy.candidateRegister}</a></li>
            <li><a href="#hotel">{copy.hotelLink}</a></li>
            <li><a href="#proses">{copy.processLink}</a></li>
            <li>admin@juaraind.com</li>
          </ul>
        </div>
      </div>
      <div className="foot-bottom">
        <span>© 2026 PT. JUARA</span>
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

  const { session, loading, roleError, signInWithGoogle, signOut } = useSession()
  const [language, setLanguage] = useState('tr')
  return (
    <>
      <ScrollIndicator />
      {!loading && !session && <Nav session={session} onLogin={signInWithGoogle} language={language} setLanguage={setLanguage} />}
      {!loading && !session && (
        <>
          <Hero session={session} onLogin={signInWithGoogle} language={language} />
          <Marquee language={language} />
          <Hotels language={language} />
          <Process language={language} />
          <Gallery language={language} />
        </>
      )}
      <AuthSection
        session={session}
        loading={loading}
        roleError={roleError}
        signInWithGoogle={signInWithGoogle}
        signOut={signOut}
        language={language}
      />
      {!loading && !session && <Footer language={language} />}
    </>
  )
}
