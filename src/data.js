// ============================================================
// Data konten website — foto berlisensi Creative Commons /
// Public Domain (sumber & atribusi ada di README.md)
// ============================================================

export const IMG = {
  hero: '/images/hero.jpg', // Bosphorus, Istanbul — golden hour
  heroAlt:
    'Selat Bosphorus di Istanbul saat matahari senja, dengan feri melintas dan siluet menara masjid',
  width: 1229,
  height: 768,
  srcSet: '/images/hero-480.jpg 480w, /images/hero-800.jpg 800w, /images/hero.jpg 1229w',
  sizes: '100vw',
}

export const HOTELS = [
  {
    name: 'Four Seasons at the Bosphorus',
    city: 'Istanbul',
    tier: 'Five Star',
    img: '/images/hotel-1.jpg',
    alt: 'Hotel mewah tepi Bosphorus, Istanbul',
    width: 900,
    height: 600,
    srcSet: '/images/hotel-1-480.jpg 480w, /images/hotel-1-800.jpg 800w, /images/hotel-1.jpg 900w',
    sizes: '(max-width: 900px) 100vw, 50vw',
    positions: ['F&B Service', 'Housekeeping', 'Guest Relations'],
  },
  {
    name: 'CVK Park Bosphorus',
    city: 'Istanbul',
    tier: 'Five Star',
    img: '/images/hotel-2.jpg',
    alt: 'Gedung CVK Park Bosphorus Hotel Istanbul',
    width: 900,
    height: 600,
    srcSet: '/images/hotel-2-480.jpg 480w, /images/hotel-2-800.jpg 800w, /images/hotel-2.jpg 900w',
    sizes: '(max-width: 900px) 100vw, 33vw',
    positions: ['Front Office', 'Kitchen / Pastry'],
  },
  {
    name: 'Mandarin Oriental Bosphorus',
    city: 'Istanbul',
    tier: 'Five Star',
    img: '/images/hotel-3.jpg',
    alt: 'Lobi dan fasad Mandarin Oriental Bosphorus',
    width: 900,
    height: 506,
    srcSet: '/images/hotel-3-480.jpg 480w, /images/hotel-3-800.jpg 800w, /images/hotel-3.jpg 900w',
    sizes: '(max-width: 900px) 100vw, 33vw',
    positions: ['F&B Service', 'Spa & Wellness'],
  },
  {
    name: 'Miracle Resort',
    city: 'Antalya',
    tier: 'Five Star · All-Inclusive',
    img: '/images/hotel-4.jpg',
    alt: 'Kolam resort di Antalya',
    width: 900,
    height: 600,
    srcSet: '/images/hotel-4-480.jpg 480w, /images/hotel-4-800.jpg 800w, /images/hotel-4.jpg 900w',
    sizes: '(max-width: 900px) 100vw, 33vw',
    positions: ['Animation Team', 'F&B Service'],
  },
  {
    name: 'Cornelia DeLuxe Resort',
    city: 'Antalya',
    tier: 'Five Star · Golf Resort',
    img: '/images/hotel-5.jpg',
    alt: 'Kolam dekoratif Cornelia DeLuxe Resort',
    width: 283,
    height: 189,
    // small image — no resized variants
    positions: ['Housekeeping', 'Kitchen / Pastry'],
  },
]

export const GALLERY = [
  { img: '/images/gallery-1.jpg', caption: 'Seragam staf perhotelan — standar hotel bintang lima', width: 900, height: 600, srcSet: '/images/gallery-1-480.jpg 480w, /images/gallery-1-800.jpg 800w, /images/gallery-1.jpg 900w', sizes: '(max-width: 900px) 100vw, 25vw' },

  { img: '/images/gallery-2.jpg', caption: 'Kolam resor Antalya — jantung musim panas Turki', width: 900, height: 600, srcSet: '/images/gallery-2-480.jpg 480w, /images/gallery-2-800.jpg 800w, /images/gallery-2.jpg 900w', sizes: '(max-width: 900px) 100vw, 25vw' },

  { img: '/images/gallery-3.jpg', caption: 'Tim operasional hotel — peluang karier Anda', width: 900, height: 581, srcSet: '/images/gallery-3-480.jpg 480w, /images/gallery-3-800.jpg 800w, /images/gallery-3.jpg 900w', sizes: '(max-width: 900px) 100vw, 25vw' },

  { img: '/images/gallery-4.jpg', caption: 'Malam di Istanbul — kota dua benua', width: 900, height: 600, srcSet: '/images/gallery-4-480.jpg 480w, /images/gallery-4-800.jpg 800w, /images/gallery-4.jpg 900w', sizes: '(max-width: 900px) 100vw, 25vw' },

  { img: '/images/gallery-5.jpg', caption: 'Four Seasons Bosphorus — mitra penempatan', width: 900, height: 600, srcSet: '/images/gallery-5-480.jpg 480w, /images/gallery-5-800.jpg 800w, /images/gallery-5.jpg 900w', sizes: '(max-width: 900px) 100vw, 25vw' },

  { img: '/images/gallery-6.jpg', caption: 'Resor pantai Mediterania, Turki', width: 900, height: 598, srcSet: '/images/gallery-6-480.jpg 480w, /images/gallery-6-800.jpg 800w, /images/gallery-6.jpg 900w', sizes: '(max-width: 900px) 100vw, 25vw' },

]

export const STEPS = [
  {
    no: '01',
    title: 'Daftar & Dapatkan ID',
    desc: 'Login dengan Google, lengkapi profil, dan sistem langsung menerbitkan ID Kandidat unik Anda — mis. TKI-2026-00001. Simpan ID ini: itulah kunci pemanggilan data Anda di kantor agency.',
  },
  {
    no: '02',
    title: 'Seleksi & Wawancara',
    desc: 'Tim rekrutmen kami menyaring pengalaman dan bahasa. Kandidat lolos dijadwalkan wawancara daring bersama perekrut mitra dari hotel di Turki.',
  },
  {
    no: '03',
    title: 'Pelatihan & Sertifikasi',
    desc: 'Pelatihan bahasa Turki dasar, standar layanan perhotelan internasional, serta pembekalan budaya kerja — termasuk kelas keselamatan kerja.',
  },
  {
    no: '04',
    title: 'Dokumen & Visa Kerja',
    desc: 'Pengurusan passport, kontrak kerja, izin kerja (çalışma izni) dan visa ditangani bersama legal officer agency hingga terbit.',
  },
  {
    no: '05',
    title: 'Berangkat & Mulai Karier',
    desc: 'Ticketing, kedatangan di Istanbul/Antalya, penjemputan bandara, dan orientasi langsung di hotel tempat Anda bekerja.',
  },
]

export const POSITIONS = [
  'F&B Service (Waiter/Waitress)',
  'Housekeeping',
  'Front Office / Receptionist',
  'Kitchen / Pastry',
  'Guest Relations',
  'Spa & Wellness Therapist',
  'Animation / Kids Club',
  'Barista / Bartender',
]

export const STATS = [
  { value: '1.200+', label: 'Kandidat ditempatkan sejak 2019' },
  { value: '38', label: 'Hotel & resort mitra di Turki' },
  { value: '4', label: 'Kota penempatan: Istanbul, Antalya, Bodrum, Izmir' },
  { value: '98%', label: 'Kelulusan visa kerja mitra' },
]
