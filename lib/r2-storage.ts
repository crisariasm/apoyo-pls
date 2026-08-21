import { createHash, createHmac, randomUUID } from 'node:crypto'

type R2Config = {
  accessKeyId: string
  bucket: string
  endpoint: string
  region: string
  secretAccessKey: string
}

type R2Body = Uint8Array | Buffer

const encodeRFC3986 = (value: string) => encodeURIComponent(value).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)
const sha256 = (value: string | R2Body) => createHash('sha256').update(value).digest('hex')
const hmac = (key: string | Buffer, value: string) => createHmac('sha256', key).update(value).digest()

function getR2Config(): R2Config | null {
  if (process.env.R2_ENABLED !== 'true') return null

  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim()
  const bucket = process.env.R2_BUCKET?.trim()
  const rawEndpoint = process.env.R2_ENDPOINT?.trim()
  const region = process.env.R2_REGION?.trim() || 'auto'
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim()

  if (!accessKeyId || !bucket || !rawEndpoint || !secretAccessKey) return null

  try {
    const endpointUrl = new URL(rawEndpoint)
    if (endpointUrl.protocol !== 'https:') return null
    const bucketPath = `/${encodeURIComponent(bucket)}`
    if (endpointUrl.pathname.replace(/\/$/, '') === bucketPath) endpointUrl.pathname = ''
    endpointUrl.search = ''
    endpointUrl.hash = ''
    return { accessKeyId, bucket, endpoint: endpointUrl.toString().replace(/\/$/, ''), region, secretAccessKey }
  } catch {
    return null
  }
}

export function isR2Enabled() {
  return getR2Config() !== null
}

function requireR2Config() {
  const config = getR2Config()
  if (!config) throw new Error('R2 está habilitado, pero faltan variables de configuración.')
  return config
}

function objectPath(bucket: string, key: string) {
  return `/${encodeRFC3986(bucket)}/${key.split('/').map(encodeRFC3986).join('/')}`
}

function isSafeObjectKey(key: string) {
  return key.length > 0
    && key.length <= 512
    && !key.startsWith('/')
    && !key.includes('\\')
    && key.split('/').every((segment) => segment && segment !== '.' && segment !== '..')
    && /^[a-zA-Z0-9._/-]+$/.test(key)
}

function signingKey(secretAccessKey: string, dateStamp: string, region: string) {
  const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp)
  const regionKey = hmac(dateKey, region)
  const serviceKey = hmac(regionKey, 's3')
  return hmac(serviceKey, 'aws4_request')
}

async function signedRequest(method: 'DELETE' | 'GET' | 'HEAD' | 'PUT', key: string, body?: R2Body, contentType?: string, signal?: AbortSignal) {
  if (!isSafeObjectKey(key)) throw new Error('La clave del objeto R2 no es válida.')
  const config = requireR2Config()
  const endpoint = new URL(config.endpoint)
  const path = objectPath(config.bucket, key)
  const url = new URL(path, endpoint)
  const now = new Date()
  const dateStamp = now.toISOString().slice(0, 10).replaceAll('-', '')
  const amzDate = `${dateStamp}T${now.toISOString().slice(11, 19).replaceAll(':', '')}Z`
  const payloadHash = sha256(body || '')
  const canonicalHeaderEntries = [
    ['host', url.host],
    ['x-amz-content-sha256', payloadHash],
    ['x-amz-date', amzDate],
    ...(contentType ? [['content-type', contentType]] : []),
  ].sort(([left], [right]) => left.localeCompare(right))
  const canonicalHeaders = canonicalHeaderEntries.map(([name, value]) => `${name}:${value.trim()}\n`).join('')
  const signedHeaders = canonicalHeaderEntries.map(([name]) => name).join(';')
  const canonicalRequest = [method, path, '', canonicalHeaders, signedHeaders, payloadHash].join('\n')
  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256(canonicalRequest)].join('\n')
  const signature = createHmac('sha256', signingKey(config.secretAccessKey, dateStamp, config.region)).update(stringToSign).digest('hex')
  const authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  const headers: Record<string, string> = {
    Authorization: authorization,
    Host: url.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  }
  if (contentType) headers['Content-Type'] = contentType

  return fetch(url, { method, headers, body: body ? Buffer.from(body) : undefined, cache: 'no-store', signal })
}

export function createR2Key(filename: string) {
  const prefix = (process.env.R2_PREFIX?.trim() || 'media')
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .map((segment) => segment.replace(/[^a-zA-Z0-9._-]/g, '-'))
    .filter((segment) => segment && segment !== '.' && segment !== '..')
    .join('/') || 'media'
  const safeFilename = filename
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/\.{2,}/g, '.')
    .replace(/^[.-]+|[.-]+$/g, '') || 'archivo'
  return `${prefix}/${randomUUID()}-${safeFilename}`
}

export async function putR2Object(key: string, body: R2Body, contentType: string) {
  const response = await signedRequest('PUT', key, body, contentType)
  if (!response.ok) throw new Error(`R2 rechazó la carga del archivo (${response.status}).`)
}

export async function deleteR2Object(key: string) {
  const response = await signedRequest('DELETE', key)
  if (!response.ok && response.status !== 404) throw new Error(`R2 rechazó la eliminación del archivo (${response.status}).`)
}

export async function getR2Object(key: string) {
  return signedRequest('GET', key)
}

export async function headR2Object(key: string, timeoutMs = 5000) {
  return signedRequest('HEAD', key, undefined, undefined, AbortSignal.timeout(timeoutMs))
}
