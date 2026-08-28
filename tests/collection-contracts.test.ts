import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import type { CollectionConfig, Field } from 'payload'
import sharp from 'sharp'

import { AidIntakes } from '../collections/AidIntakes'
import { Announcements } from '../collections/Announcements'
import { Bulletins } from '../collections/Bulletins'
import { CommunityNotices } from '../collections/CommunityNotices'
import { DistributionEvidence } from '../collections/DistributionEvidence'
import { Distributions } from '../collections/Distributions'
import { Media } from '../collections/Media'
import { Needs } from '../collections/Needs'
import { Resources } from '../collections/Resources'
import { Services } from '../collections/Services'
import { SupportRequests } from '../collections/SupportRequests'
import { Users } from '../collections/Users'
import { VolunteerActivities } from '../collections/VolunteerActivities'
import { withAuditFields } from '../lib/audit-fields'
import { portalModules } from '../lib/staff-portal-config'

const collections = [
  Users, AidIntakes, Resources, Needs, Distributions, DistributionEvidence, Announcements,
  CommunityNotices, Services, Bulletins, VolunteerActivities, SupportRequests, Media,
]

function namedFields(fields: Field[]) {
  return new Map(fields.flatMap((field) => 'name' in field && typeof field.name === 'string' ? [[field.name, field] as const] : []))
}

function hook(config: CollectionConfig, phase: 'beforeValidate' | 'beforeChange', index = 0) {
  const value = config.hooks?.[phase]?.[index]
  assert.equal(typeof value, 'function', `${config.slug} no tiene hook ${phase}`)
  return value!
}

function expectValidation(fn: () => unknown, path: string, message: RegExp) {
  let caught: unknown
  try {
    fn()
  } catch (error) {
    caught = error
  }
  assert.ok(caught, 'Se esperaba un error de validación')
  const cause = (caught as { cause?: { errors?: Array<{ path?: string; message?: string }> } }).cause
  const fieldError = cause?.errors?.find((error) => error.path === path)
  assert.ok(fieldError, `No se encontró el error del campo ${path}`)
  assert.match(fieldError.message || '', message)
}

test('las colecciones tienen slugs únicos y acceso administrativo explícito', () => {
  assert.equal(new Set(collections.map(({ slug }) => slug)).size, collections.length)
  for (const collection of collections) {
    assert.ok(collection.access?.admin, `${collection.slug} debe restringir el panel administrativo`)
    assert.ok(collection.access?.read, `${collection.slug} debe declarar lectura`)
    assert.ok(collection.access?.create, `${collection.slug} debe declarar creación`)
    assert.ok(collection.access?.update, `${collection.slug} debe declarar edición`)
    assert.ok(collection.access?.delete, `${collection.slug} debe declarar eliminación`)
  }
})

test('cada campo del portal operativo existe en su colección Payload', () => {
  const bySlug = new Map(collections.map((collection) => [collection.slug, collection]))
  for (const module of portalModules) {
    const collection = bySlug.get(module.collection)
    assert.ok(collection, `Falta la colección ${module.collection}`)
    const fields = namedFields(collection!.fields)
    for (const portalField of module.fields) {
      const field = fields.get(portalField.name)
      assert.ok(field, `${module.slug}.${portalField.name} no existe en Payload`)
      if (portalField.required && portalField.type !== 'upload') {
        assert.equal('required' in field! ? field!.required : false, true, `${module.slug}.${portalField.name} debe ser obligatorio en ambos lados`)
      }
    }
  }
})

test('la autenticación usa sesiones, bloqueo y cookie segura', () => {
  assert.ok(Users.auth && typeof Users.auth === 'object')
  const auth = Users.auth as {
    maxLoginAttempts?: number
    lockTime?: number
    tokenExpiration?: number
    useSessions?: boolean
    removeTokenFromResponses?: boolean
    cookies?: { sameSite?: string }
  }
  assert.equal(auth.maxLoginAttempts, 5)
  assert.equal(auth.lockTime, 15 * 60 * 1000)
  assert.equal(auth.tokenExpiration, 8 * 60 * 60)
  assert.equal(auth.useSessions, true)
  assert.equal(auth.removeTokenFromResponses, true)
  assert.equal(auth.cookies?.sameSite, 'Strict')
})

test('los comunicados exigen imagen y reservan la ruta pública al seeder', () => {
  const validate = hook(CommunityNotices, 'beforeValidate')
  const base = { title: 'Comunicado', body: 'Detalle', category: 'vivienda', location: 'Pereira', contact: 'Equipo' }
  expectValidation(() => validate({ data: base, operation: 'create', req: { context: {} } } as never), 'image', /imagen es obligatoria/i)
  expectValidation(() => validate({ data: { ...base, publicImagePath: '/seed.webp' }, operation: 'create', req: { context: {} } } as never), 'image', /solo puede ser usada por el seeder/i)
  assert.doesNotThrow(() => validate({ data: { ...base, publicImagePath: '/seed.webp' }, operation: 'create', req: { context: { seed: true } } } as never))
  assert.doesNotThrow(() => validate({ data: { ...base, image: randomUUID() }, operation: 'create', req: { context: {} } } as never))
})

test('las evidencias exigen origen coherente e imagen', () => {
  const validate = hook(DistributionEvidence, 'beforeValidate')
  const base = { title: 'Entrega', description: 'Registro general', status: 'publicado' }
  expectValidation(() => validate({ data: { ...base, sourceType: 'distribucion', image: randomUUID() }, operation: 'create', req: { context: {} } } as never), 'distribution', /Selecciona la salida/)
  expectValidation(() => validate({ data: { ...base, sourceType: 'otro', image: randomUUID() }, operation: 'create', req: { context: {} } } as never), 'otherReference', /referencia/)
  expectValidation(() => validate({ data: { ...base, sourceType: 'otro', otherReference: 'Jornada' }, operation: 'create', req: { context: {} } } as never), 'image', /imagen es obligatoria/i)
  assert.doesNotThrow(() => validate({ data: { ...base, sourceType: 'otro', otherReference: 'Jornada', publicImagePath: '/seed.webp' }, operation: 'create', req: { context: { seed: true } } } as never))
})

test('una solicitud gestionada no puede regresar a pendiente', () => {
  const preventRegression = hook(SupportRequests, 'beforeChange')
  expectValidation(() => preventRegression({ data: { status: 'pendiente' }, originalDoc: { status: 'atendida' }, operation: 'update', req: {} } as never), 'status', /no puede volver/)
  assert.doesNotThrow(() => preventRegression({ data: { status: 'cerrada' }, originalDoc: { status: 'atendida' }, operation: 'update', req: {} } as never))
})

test('las solicitudes conservan el origen del botón Lo tengo', () => {
  const source = namedFields(SupportRequests.fields).get('source') as { defaultValue?: string; options?: Array<{ value: string }> } | undefined
  assert.equal(source?.defaultValue, 'public-form')
  assert.deepEqual(source?.options?.map((option) => option.value), ['public-form', 'need-offer'])
})

test('las actividades permiten marcar una actividad como destacada', () => {
  const featured = namedFields(VolunteerActivities.fields).get('featured') as { defaultValue?: boolean; index?: boolean } | undefined
  assert.equal(featured?.defaultValue, false)
  assert.equal(featured?.index, true)
})

test('los servicios permiten imagen, WhatsApp y limpian medios reemplazados', async () => {
  const fields = namedFields(Services.fields)
  const image = fields.get('image') as { type?: string; relationTo?: string } | undefined
  const vision = fields.get('vision') as { type?: string; maxLength?: number } | undefined
  const countryCode = fields.get('whatsappCountryCode') as { defaultValue?: string; required?: boolean; options?: Array<{ value: string }> } | undefined
  const phone = fields.get('whatsappNumber') as { required?: boolean; maxLength?: number } | undefined

  assert.equal(image?.type, 'upload')
  assert.equal(image?.relationTo, 'media')
  assert.equal(vision?.type, 'text')
  assert.equal(vision?.maxLength, 160)
  assert.equal(countryCode?.defaultValue, '+57')
  assert.equal(countryCode?.required, true)
  assert.ok((countryCode?.options?.length || 0) >= 5)
  assert.ok(countryCode?.options?.some((option) => option.value === '+57'))
  assert.equal(phone?.required, true)
  assert.equal(phone?.maxLength, 20)
  assert.equal(typeof Services.hooks?.afterChange?.[0], 'function')
  assert.equal(typeof Services.hooks?.afterDelete?.[0], 'function')

  const validate = hook(Services, 'beforeValidate')
  const base = { title: 'Transporte', description: 'Apoyo comunitario', type: 'gratuito', category: 'Movilidad', provider: 'Comunidad', location: 'Pereira' }
  expectValidation(() => validate({ data: base, operation: 'create', req: { context: {} } } as never), 'whatsappNumber', /obligatorio/i)
  expectValidation(() => validate({ data: { ...base, whatsappCountryCode: '+57', whatsappNumber: 'abc' }, operation: 'create', req: { context: {} } } as never), 'whatsappNumber', /WhatsApp válido/i)
  assert.doesNotThrow(() => validate({ data: { ...base, whatsappCountryCode: '+57', whatsappNumber: '300 123 4567' }, operation: 'create', req: { context: {} } } as never))

  const mediaId = randomUUID()
  const deleted: string[] = []
  const cleanup = Services.hooks?.afterChange?.[0]
  await cleanup?.({
    operation: 'update',
    previousDoc: { image: mediaId },
    req: {
      payload: {
        find: async () => ({ totalDocs: 0 }),
        delete: async ({ id }: { id: typeof mediaId }) => { deleted.push(id); return {} },
        logger: { error: () => undefined },
      },
    },
  } as never)
  assert.deepEqual(deleted, [mediaId])

  const deleteCleanup = Services.hooks?.afterDelete?.[0]
  await deleteCleanup?.({
    doc: { image: mediaId },
    req: {
      payload: {
        find: async () => ({ totalDocs: 0 }),
        delete: async ({ id }: { id: typeof mediaId }) => { deleted.push(id); return {} },
        logger: { error: () => undefined },
      },
    },
  } as never)
  assert.deepEqual(deleted, [mediaId, mediaId])
})

test('las colecciones con imágenes limpian referencias huérfanas en cambios y eliminaciones', async () => {
  const mediaId = randomUUID()
  const deleted: string[] = []
  const payload = {
    find: async () => ({ totalDocs: 0 }),
    delete: async ({ id }: { id: string }) => { deleted.push(id); return {} },
    logger: { error: () => undefined },
  }

  for (const collection of [CommunityNotices, DistributionEvidence, Distributions, Services]) {
    await collection.hooks?.afterChange?.[0]?.({ operation: 'update', previousDoc: { image: mediaId }, req: { payload } } as never)
    await collection.hooks?.afterDelete?.[0]?.({ doc: { image: mediaId }, req: { payload } } as never)
  }

  assert.equal(deleted.length, 8)
})

test('la auditoría automática limita texto y conserva creador/editor', () => {
  const audited = withAuditFields(Resources)
  const fields = namedFields(audited.fields)
  for (const field of ['registeredBy', 'registeredByUserId', 'updatedBy', 'updatedByUserId']) assert.ok(fields.has(field))

  const enforceLengths = hook(audited, 'beforeValidate', (Resources.hooks?.beforeValidate || []).length)
  expectValidation(() => enforceLengths({ data: { name: 'x'.repeat(161) }, collection: audited, req: {} } as never), 'name', /160 caracteres/)

  const stamp = hook(audited, 'beforeChange', (Resources.hooks?.beforeChange || []).length)
  const creator = { id: randomUUID(), name: 'Persona creadora' }
  const created = stamp({ data: { name: 'Agua' }, operation: 'create', collection: audited, req: { user: creator } } as never) as unknown as Record<string, unknown>
  assert.equal(created.registeredBy, creator.name)
  assert.equal(created.registeredByUserId, creator.id)
  assert.equal(created.updatedBy, creator.name)

  const editor = { id: randomUUID(), name: 'Persona editora' }
  const updated = stamp({ data: { registeredBy: creator.name, registeredByUserId: creator.id }, operation: 'update', collection: audited, req: { user: editor } } as never) as unknown as Record<string, unknown>
  assert.equal(updated.registeredBy, creator.name)
  assert.equal(updated.updatedBy, editor.name)
  assert.equal(updated.updatedByUserId, editor.id)
})

test('la colección de medios no exige archivo a nivel interno pero protege su escritura', () => {
  assert.ok(Media.upload && typeof Media.upload === 'object')
  const upload = Media.upload as { filesRequiredOnCreate?: boolean; mimeTypes?: string[] }
  assert.equal(upload.filesRequiredOnCreate, false)
  assert.deepEqual(upload.mimeTypes, ['image/*', 'application/pdf'])
  const fields = namedFields(Media.fields)
  assert.equal((fields.get('alt') as unknown as { required?: boolean } | undefined)?.required, true)
  assert.equal((fields.get('r2Key') as unknown as { maxLength?: number } | undefined)?.maxLength, 500)
})

test('el ciclo de medios optimiza, sube y elimina el objeto de R2', async () => {
  const originalEnv = { ...process.env }
  const originalFetch = globalThis.fetch
  const calls: Array<{ method: string; url: string; contentType: string | null; bodySize: number }> = []
  try {
    process.env.R2_ENABLED = 'true'
    process.env.R2_ACCESS_KEY_ID = 'test-key'
    process.env.R2_SECRET_ACCESS_KEY = 'test-secret'
    process.env.R2_BUCKET = 'test-bucket'
    process.env.R2_ENDPOINT = 'https://account.r2.cloudflarestorage.com'
    process.env.R2_PREFIX = 'media-test'
    globalThis.fetch = async (input, init) => {
      const body = init?.body
      const bodySize = body instanceof Uint8Array ? body.byteLength : 0
      calls.push({ method: init?.method || 'GET', url: String(input), contentType: new Headers(init?.headers).get('content-type'), bodySize })
      return new Response(null, { status: 200 })
    }

    const source = await sharp({ create: { width: 2000, height: 1200, channels: 3, background: '#f5c84c' } }).png().toBuffer()
    const upload = hook(Media, 'beforeChange')
    const uploaded = await upload({
      data: { alt: 'Entrega', filename: 'Evidencia grande.PNG' },
      operation: 'create',
      req: { file: { data: source, mimetype: 'image/png', name: 'Evidencia grande.PNG' } },
    } as never) as unknown as Record<string, unknown>

    assert.equal(uploaded.mimeType, 'image/webp')
    assert.equal(uploaded.r2MimeType, 'image/webp')
    assert.equal(typeof uploaded.r2Key, 'string')
    assert.match(String(uploaded.r2Key), /^media-test\/[0-9a-f-]+-Evidencia-grande\.webp$/)
    assert.equal(calls[0].method, 'PUT')
    assert.match(calls[0].url, /test-bucket\/media-test\//)
    assert.equal(calls[0].contentType, 'image/webp')
    assert.ok(calls[0].bodySize > 0)

    const remove = Media.hooks?.afterDelete?.[0]
    assert.equal(typeof remove, 'function')
    await remove!({ doc: { r2Key: uploaded.r2Key } } as never)
    assert.equal(calls[1].method, 'DELETE')
    assert.equal(calls[1].url, calls[0].url)
  } finally {
    globalThis.fetch = originalFetch
    process.env = originalEnv
  }
})
