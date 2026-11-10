import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')

const BG = [10, 11, 13]
const ACCENT = [201, 255, 46]

const RECTS = [
  { x: 78, y: 214, w: 22, h: 84, alpha: 0.55 },
  { x: 110, y: 190, w: 38, h: 132, alpha: 1 },
  { x: 148, y: 246, w: 216, h: 20, alpha: 1 },
  { x: 364, y: 190, w: 38, h: 132, alpha: 1 },
  { x: 412, y: 214, w: 22, h: 84, alpha: 0.55 },
]

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buffer) {
  let crc = -1
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ -1) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const typeBuffer = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0)
  return Buffer.concat([length, typeBuffer, data, crc])
}

function encodePng(size, pixels) {
  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function blend(target, offset, color, alpha) {
  for (let c = 0; c < 3; c += 1) {
    target[offset + c] = Math.round(target[offset + c] * (1 - alpha) + color[c] * alpha)
  }
  target[offset + 3] = 255
}

function render(size) {
  const pixels = Buffer.alloc(size * size * 4)
  for (let i = 0; i < size * size; i += 1) {
    pixels[i * 4] = BG[0]
    pixels[i * 4 + 1] = BG[1]
    pixels[i * 4 + 2] = BG[2]
    pixels[i * 4 + 3] = 255
  }

  const scale = size / 512
  for (const rect of RECTS) {
    const x0 = Math.round(rect.x * scale)
    const y0 = Math.round(rect.y * scale)
    const x1 = Math.round((rect.x + rect.w) * scale)
    const y1 = Math.round((rect.y + rect.h) * scale)
    for (let y = y0; y < y1; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        blend(pixels, (y * size + x) * 4, ACCENT, rect.alpha)
      }
    }
  }

  return pixels
}

mkdirSync(OUT_DIR, { recursive: true })
for (const [size, name] of [
  [192, 'icon-192.png'],
  [512, 'icon-512.png'],
  [180, 'apple-touch-180.png'],
]) {
  writeFileSync(join(OUT_DIR, name), encodePng(size, render(size)))
  console.log(`icons/${name}`)
}
