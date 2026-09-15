const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

async function convert(file) {
  const ext = path.extname(file).toLowerCase()
  if (ext !== '.jpg' && ext !== '.jpeg' && ext !== '.png') return
  const out = file.replace(/\.(jpg|jpeg|png)$/i, '.webp')
  try {
    await sharp(file).webp({ quality: 75 }).toFile(out)
    console.log('wrote', out)
  } catch (e) {
    console.error('failed', file, e.message)
  }
}

async function main() {
  const dir = path.join(__dirname, '..', 'public', 'images')
  const files = fs.readdirSync(dir).filter(f => /\.(jpg|jpeg|png)$/i.test(f))
  for (const f of files) {
    const full = path.join(dir, f)
    await convert(full)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
