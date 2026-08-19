import sharp from 'sharp'

const MAX_IMAGE_EDGE = 1_600
const WEBP_QUALITY = 82

export type OptimizedImage = {
  buffer: Buffer
  filename: string
  mimeType: 'image/webp'
  filesize: number
  width: number
  height: number
}

function outputFilename(filename: string) {
  const baseName = filename
    .trim()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'imagen'

  return `${baseName}.webp`
}

export async function optimizeImage(input: Uint8Array, filename: string): Promise<OptimizedImage> {
  const result = await sharp(input, { failOn: 'error', limitInputPixels: 40_000_000 })
    .rotate()
    .resize({ width: MAX_IMAGE_EDGE, height: MAX_IMAGE_EDGE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toBuffer({ resolveWithObject: true })

  return {
    buffer: result.data,
    filename: outputFilename(filename),
    mimeType: 'image/webp',
    filesize: result.data.length,
    width: result.info.width,
    height: result.info.height,
  }
}
