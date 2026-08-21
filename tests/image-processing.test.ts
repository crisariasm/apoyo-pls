import assert from 'node:assert/strict'
import test from 'node:test'
import sharp from 'sharp'

import { optimizeImage } from '../lib/image-processing'

test('convierte imágenes a WebP, sanea el nombre y limita su dimensión', async () => {
  const input = await sharp({ create: { width: 2400, height: 1800, channels: 3, background: '#f6c945' } }).png().toBuffer()
  const result = await optimizeImage(input, ' Foto ayuda (final).PNG ')
  const metadata = await sharp(result.buffer).metadata()

  assert.equal(result.filename, 'Foto-ayuda-final.webp')
  assert.equal(result.mimeType, 'image/webp')
  assert.equal(result.filesize, result.buffer.length)
  assert.equal(metadata.format, 'webp')
  assert.ok(result.width <= 1600)
  assert.ok(result.height <= 1600)
  assert.equal(result.width, metadata.width)
  assert.equal(result.height, metadata.height)
})

test('no amplía imágenes pequeñas y usa un nombre seguro por defecto', async () => {
  const input = await sharp({ create: { width: 320, height: 200, channels: 4, background: '#ffffff' } }).png().toBuffer()
  const result = await optimizeImage(input, '***.png')
  assert.equal(result.filename, 'imagen.webp')
  assert.equal(result.width, 320)
  assert.equal(result.height, 200)
})

test('rechaza archivos que no son imágenes válidas', async () => {
  await assert.rejects(optimizeImage(Buffer.from('esto no es una imagen'), 'ataque.jpg'))
})
