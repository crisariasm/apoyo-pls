import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { PayloadRequest } from 'payload'

import { auditCollectionChange, auditCollectionDelete, auditLogin } from '../lib/audit-log'

function auditRequest(options?: { role?: string; user?: boolean }) {
  const entries: Array<Record<string, unknown>> = []
  const errors: unknown[] = []
  const role = options?.role || 'que-tenemos'
  const req = {
    context: {},
    headers: new Headers({
      'user-agent': 'Navegador de prueba',
      'x-forwarded-for': '192.0.2.10',
    }),
    method: 'PATCH',
    pathname: role === 'admin' || role === 'super-admin' ? '/api/users/login' : '/api/equipo/que-tenemos',
    payload: {
      create: async (input: unknown) => {
        const data = (input as { data?: Record<string, unknown> }).data || {}
        entries.push(data)
        return { id: '00000000-0000-4000-8000-000000000001' }
      },
      logger: { error: (error: unknown) => errors.push(error) },
    },
    user: options?.user === false ? null : {
      id: '00000000-0000-4000-8000-000000000010',
      name: 'Persona de prueba',
      email: 'persona@pls.test',
      role,
    },
  } as unknown as PayloadRequest

  return { entries, errors, req }
}

describe('auditoría de acciones autenticadas', () => {
  it('registra una edición del panel de equipo sin copiar valores sensibles', async () => {
    const { entries, req } = auditRequest()
    await auditCollectionChange({
      collection: { slug: 'resources' },
      context: {},
      data: { name: 'Agua', password: 'secreto-nuevo', quantity: 4, updatedBy: 'Campo automático' },
      doc: { id: '00000000-0000-4000-8000-000000000020', name: 'Agua', password: 'secreto-nuevo', quantity: 4 },
      operation: 'update',
      previousDoc: { id: '00000000-0000-4000-8000-000000000020', name: 'Agua', password: 'secreto-anterior', quantity: 3 },
      req,
    } as never)

    assert.equal(entries.length, 1)
    assert.equal(entries[0].action, 'update')
    assert.equal(entries[0].source, 'equipo')
    assert.equal(entries[0].actorName, 'Persona de prueba')
    assert.equal(entries[0].changedFields, 'credenciales, quantity')
    assert.equal(JSON.stringify(entries[0]).includes('secreto-nuevo'), false)
    assert.equal(JSON.stringify(entries[0]).includes('secreto-anterior'), false)
    assert.equal(JSON.stringify(entries[0]).includes('Campo automático'), false)
  })

  it('no genera actividad para procesos del seeder ni peticiones anónimas', async () => {
    const seeded = auditRequest()
    await auditCollectionChange({
      collection: { slug: 'needs' },
      context: { seed: true },
      data: { title: 'Necesidad de prueba' },
      doc: { id: '00000000-0000-4000-8000-000000000030', title: 'Necesidad de prueba' },
      operation: 'create',
      previousDoc: {},
      req: seeded.req,
    } as never)
    assert.equal(seeded.entries.length, 0)

    const anonymous = auditRequest({ user: false })
    await auditCollectionChange({
      collection: { slug: 'support-requests' },
      context: {},
      data: { requestType: 'recursos' },
      doc: { id: '00000000-0000-4000-8000-000000000040', requestType: 'recursos' },
      operation: 'create',
      previousDoc: {},
      req: anonymous.req,
    } as never)
    assert.equal(anonymous.entries.length, 0)
  })

  it('conserva la identidad y el nombre del registro eliminado', async () => {
    const { entries, req } = auditRequest({ role: 'admin' })
    await auditCollectionDelete({
      collection: { slug: 'announcements' },
      context: {},
      doc: { id: '00000000-0000-4000-8000-000000000050', title: 'Cambio de horario' },
      id: '00000000-0000-4000-8000-000000000050',
      req,
    } as never)

    assert.equal(entries.length, 1)
    assert.equal(entries[0].action, 'delete')
    assert.equal(entries[0].source, 'payload-admin')
    assert.equal(entries[0].documentLabel, 'Cambio de horario')
    assert.equal(entries[0].documentId, '00000000-0000-4000-8000-000000000050')
  })

  it('diferencia los accesos de Payload y del panel de equipo', async () => {
    const payloadAdmin = auditRequest({ role: 'super-admin' })
    await auditLogin({ context: {}, req: payloadAdmin.req, token: 'no-se-registra', user: payloadAdmin.req.user } as never)
    assert.equal(payloadAdmin.entries[0].source, 'payload-admin')
    assert.equal(JSON.stringify(payloadAdmin.entries[0]).includes('no-se-registra'), false)

    const portal = auditRequest({ role: 'inventario' })
    await auditLogin({ context: {}, req: portal.req, token: 'tampoco-se-registra', user: portal.req.user } as never)
    assert.equal(portal.entries[0].source, 'equipo')
    assert.equal(JSON.stringify(portal.entries[0]).includes('tampoco-se-registra'), false)
  })
})
