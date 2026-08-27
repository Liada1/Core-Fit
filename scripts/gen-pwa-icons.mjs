// Gera os ícones do PWA a partir da identidade da marca (raio CORE FIT).
// Rode com: node scripts/gen-pwa-icons.mjs
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public')
await mkdir(outDir, { recursive: true })

const LIME = '#CCFF00'
const INK = '#101010'

// Raio centralizado sobre fundo da marca. viewBox 0..100 para facilitar o padding.
const bolt = (fill) =>
  `<path d="M54 14 L28 56 H46 L42 86 L74 40 H54 Z" fill="${fill}"/>`

// Ícone "any": raio lima sobre fundo escuro, com respiro nas bordas.
const anySvg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="${INK}"/>
  ${bolt(LIME)}
</svg>`

// Ícone "maskable": fundo lima sangrando até a borda (safe zone ~80%), raio escuro.
const maskableSvg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="${LIME}"/>
  <g transform="translate(50 50) scale(0.62) translate(-50 -50)">
    ${bolt(INK)}
  </g>
</svg>`

const jobs = [
  { name: 'pwa-192x192.png', svg: anySvg(192), size: 192 },
  { name: 'pwa-512x512.png', svg: anySvg(512), size: 512 },
  { name: 'pwa-maskable-512x512.png', svg: maskableSvg(512), size: 512 },
  { name: 'apple-touch-icon.png', svg: anySvg(180), size: 180 },
]

for (const job of jobs) {
  await sharp(Buffer.from(job.svg))
    .resize(job.size, job.size)
    .png()
    .toFile(resolve(outDir, job.name))
  // eslint-disable-next-line no-console
  console.log('gerado:', job.name)
}
