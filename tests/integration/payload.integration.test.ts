import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test, { after, before } from 'node:test'
import { getPayload, type Payload } from 'payload'

import { isUUID } from '../../lib/uuid'
import { loadTestEnv } from '../helpers/load-test-env'

loadTestEnv()

type StoredDoc = { collection: string; id: string }
type TestUser = Record<string, unknown> & { id: string; email: string; name: string; role: string }

let payload: Payload
let admin: TestUser
let inventoryUser: TestUser
const createdDocs: StoredDoc[] = []
const marker = `Prueba automatizada ${randomUUID()}`

async function removeCreatedDocs() {
  for (const item of [...createdDocs].reverse()) {
    try {
      await payload.delete({ collection: item.collection as never, id: item.id, context: { skipAuditLog: true }, overrideAccess: true })
    } catch {
      // La prueba de CRUD puede haber eliminado el documento antes del cleanup.
    }
  }

  if (admin?.id) {
    const logs = await payload.find({ collection: 'audit-logs', where: { actorId: { equals: admin.id } }, pagination: false, overrideAccess: true })
    for (const log of logs.docs) {
      await payload.delete({ collection: 'audit-logs', id: log.id, context: { skipAuditLog: true }, overrideAccess: true })
    }
  }
}

before(async () => {
  assert.ok(process.env.DATABASE_URL, 'DATABASE_URL es obligatorio para las pruebas de integración.')
  const config = (await import('../../payload.config')).default
  payload = await getPayload({ config })
  const suffix = randomUUID().slice(0, 8)
  admin = await payload.create({
    collection: 'users',
    data: { email: `test-admin-${suffix}@pls.test`, password: `TestAdmin-${suffix}!Aa1`, name: `${marker} admin`, role: 'admin', active: true },
    context: { skipAuditLog: true },
    overrideAccess: true,
  }) as unknown as TestUser
  createdDocs.push({ collection: 'users', id: admin.id })
  inventoryUser = await payload.create({
    collection: 'users',
    data: { email: `test-inventory-${suffix}@pls.test`, password: `TestInventory-${suffix}!Aa1`, name: `${marker} inventario`, role: 'inventario', active: true },
    context: { skipAuditLog: true },
    overrideAccess: true,
  }) as unknown as TestUser
  createdDocs.push({ collection: 'users', id: inventoryUser.id })
})

after(async () => {
  if (!payload) return
  await removeCreatedDocs()
  await payload.destroy()
})

test('Payload y PostgreSQL aplican CRUD, roles, autoría, visibilidad y auditoría', async (t) => {
  let visibleResourceId = ''
  let hiddenResourceId = ''

  await t.test('todos los identificadores creados son UUID', () => {
    assert.equal(isUUID(admin.id), true)
    assert.equal(isUUID(inventoryUser.id), true)
  })

  await t.test('un rol operativo no puede escribir directamente en la API de Payload', async () => {
    await assert.rejects(payload.create({
      collection: 'resources',
      data: { name: `${marker} denegado`, category: 'agua', quantity: 1, unit: 'cajas', status: 'disponible', publicVisible: true },
      overrideAccess: false,
      user: inventoryUser as never,
    }))
  })

  await t.test('admin crea y Payload registra al autor real', async () => {
    const created = await payload.create({
      collection: 'resources',
      data: { name: `${marker} visible`, category: 'agua', quantity: 4, unit: 'cajas', status: 'disponible', publicVisible: true, featured: true },
      overrideAccess: false,
      user: admin as never,
    })
    visibleResourceId = String(created.id)
    createdDocs.push({ collection: 'resources', id: visibleResourceId })
    assert.equal(isUUID(created.id), true)
    assert.equal(created.registeredBy, admin.name)
    assert.equal(created.registeredByUserId, admin.id)
    assert.equal(created.updatedBy, admin.name)

    const hidden = await payload.create({
      collection: 'resources',
      data: { name: `${marker} oculto '; DROP TABLE users; --`, category: 'agua', quantity: 2, unit: 'cajas', status: 'limitado', publicVisible: false },
      overrideAccess: false,
      user: admin as never,
    })
    hiddenResourceId = String(hidden.id)
    createdDocs.push({ collection: 'resources', id: hiddenResourceId })
    const usersStillAvailable = await payload.count({ collection: 'users', overrideAccess: true })
    assert.ok(usersStillAvailable.totalDocs >= 2, 'Las entradas se parametrizan y no alteran el esquema SQL')
  })

  await t.test('la API directa de Payload no expone datos anónimos', async () => {
    await assert.rejects(payload.find({
      collection: 'resources',
      where: { name: { contains: marker } },
      pagination: false,
      overrideAccess: false,
    }))
  })

  await t.test('la salida pública mapea únicamente el recurso visible', async () => {
    const { getOverview } = await import('../../lib/public-api')
    const overview = await getOverview({ sections: ['resources'] })
    assert.equal(overview.mode, 'live')
    assert.equal(overview.resources.some(({ id }) => id === visibleResourceId), true)
    assert.equal(overview.resources.some(({ id }) => id === hiddenResourceId), false)
  })

  await t.test('admin edita y elimina con auditoría inmutable', async () => {
    const updated = await payload.update({
      collection: 'resources', id: visibleResourceId, data: { quantity: 7, notes: 'Actualizado por la prueba de integración.' },
      overrideAccess: false, user: admin as never,
    })
    assert.equal(updated.quantity, 7)
    assert.equal(updated.updatedByUserId, admin.id)

    await payload.delete({ collection: 'resources', id: visibleResourceId, overrideAccess: false, user: admin as never })
    const audit = await payload.find({ collection: 'audit-logs', where: { and: [{ actorId: { equals: admin.id } }, { entitySlug: { equals: 'resources' } }] }, pagination: false, overrideAccess: true })
    const actions = new Set(audit.docs.map((entry) => entry.action))
    assert.ok(actions.has('create'))
    assert.ok(actions.has('update'))
    assert.ok(actions.has('delete'))
    assert.equal(audit.docs.every((entry) => entry.actorName === admin.name), true)

    await assert.rejects(payload.create({
      collection: 'audit-logs',
      data: { occurredAt: new Date().toISOString(), action: 'create', source: 'equipo', actorName: 'Alterado', entityType: 'system', entitySlug: 'manual', summary: 'No permitido', success: true },
      overrideAccess: false,
      user: admin as never,
    }))
  })

  await t.test('las solicitudes gestionadas no regresan a pendiente', async () => {
    const request = await payload.create({
      collection: 'support-requests',
      data: {
        helpType: 'necesitar-ayuda', requestType: 'recursos', category: 'Agua', zone: 'Pereira', quantity: 2,
        quantityUnit: 'cajas', description: marker, contactName: marker, phone: '3001234567', privacyAccepted: true,
      } as never,
      context: { skipAuditLog: true },
      overrideAccess: true,
    })
    createdDocs.push({ collection: 'support-requests', id: String(request.id) })
    await payload.update({ collection: 'support-requests', id: request.id, data: { status: 'atendida' }, context: { skipAuditLog: true }, overrideAccess: true })
    await assert.rejects(payload.update({ collection: 'support-requests', id: request.id, data: { status: 'pendiente' }, context: { skipAuditLog: true }, overrideAccess: true }))
  })
})
