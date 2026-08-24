import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'

const baseUrl = (process.env.TEST_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
const testOrigin = (process.env.TEST_ORIGIN || baseUrl).replace(/\/$/, '')
const teamPassword = 'PLsEquipo2026!'

type JsonRecord = Record<string, unknown>

function url(path: string) {
  return `${baseUrl}${path}`
}

function sameOriginHeaders(extra: Record<string, string> = {}) {
  return { origin: testOrigin, 'sec-fetch-site': 'same-origin', ...extra }
}

async function request(path: string, init: RequestInit = {}) {
  return fetch(url(path), { redirect: 'manual', signal: AbortSignal.timeout(15_000), ...init })
}

async function json(response: Response) {
  return response.json() as Promise<JsonRecord>
}

function assertNoSensitiveFields(value: unknown, label: string) {
  const forbidden = new Set(['password', 'hash', 'salt', 'token', 'apiKey', 'sessions', 'resetPasswordToken', 'resetPasswordExpiration', 'r2Key', 'r2Filename', 'r2MimeType', 'r2Filesize', 'uploadedByUserId', 'uploadedByName', 'registeredByUserId', 'updatedByUserId'])
  const inspect = (current: unknown, path: string, depth: number) => {
    if (depth > 8 || current === null || current === undefined || typeof current !== 'object') return
    if (Array.isArray(current)) {
      current.forEach((item, index) => inspect(item, `${path}[${index}]`, depth + 1))
      return
    }
    for (const [key, item] of Object.entries(current as JsonRecord)) {
      assert.equal(forbidden.has(key), false, `${label}: no debe devolver ${path}.${key}`)
      inspect(item, `${path}.${key}`, depth + 1)
    }
  }
  inspect(value, label, 0)
}

function responseCookie(response: Response) {
  const raw = response.headers.get('set-cookie') || ''
  const match = raw.match(/(?:^|,\s*)([^=;,\s]+=[^;,]*)/)
  assert.ok(match?.[1], 'La respuesta no entregó una cookie de sesión')
  return match[1]
}

async function loginTeam(email: string, password = teamPassword, address = `10.20.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`) {
  const response = await request('/api/equipo/login', {
    method: 'POST',
    headers: sameOriginHeaders({ 'content-type': 'application/json', 'x-forwarded-for': address }),
    body: JSON.stringify({ email, password }),
  })
  const body = await json(response)
  assertNoSensitiveFields(body, `/api/equipo/login (${email})`)
  return { response, body, cookie: response.ok ? responseCookie(response) : '' }
}

const pages = [
  ['/', 'Nuestro centro de acopio'],
  ['/recursos', 'Qué tenemos hoy'],
  ['/necesidades', 'Qué necesitamos'],
  ['/distribucion', 'La ayuda sigue su camino'],
  ['/ayudar', 'Conecta tu ayuda con una necesidad real'],
  ['/solicitar-apoyo', 'Cuéntanos qué hace falta'],
  ['/comunicados', 'Comunicados'],
  ['/servicios', 'Servicios'],
  ['/boletin', 'Boletín'],
  ['/equipo/login', 'Portal operativo'],
] as const

test('sitio público, API, autenticación y CRUD funcionan contra el servidor real', async (t) => {
  await t.test('healthcheck confirma servicio y base configurada', async () => {
    const response = await request('/api/health')
    assert.equal(response.status, 200)
    const body = await json(response)
    assert.equal(body.ok, true)
    assert.equal(body.service, 'pls-al-llamado')
    assert.equal(body.databaseConfigured, true)
    assert.equal(Number.isNaN(new Date(String(body.timestamp)).getTime()), false)
  })

  await t.test('todas las páginas principales renderizan contenido y cabeceras seguras', async () => {
    for (const [path, heading] of pages) {
      const response = await request(path)
      assert.equal(response.status, 200, path)
      const html = await response.text()
      assert.match(html, new RegExp(heading, 'i'), path)
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff', path)
      assert.equal(response.headers.get('x-frame-options'), 'SAMEORIGIN', path)
      assert.equal(response.headers.get('referrer-policy'), 'strict-origin-when-cross-origin', path)
      assert.match(response.headers.get('permissions-policy') || '', /camera=\(\)/, path)
    }
  })

  await t.test('el acceso administrativo usa la identidad de PLs al llamado', async () => {
    const response = await request('/admin/login')
    assert.equal(response.status, 200)
    const html = await response.text()
    assert.match(html, /pls-admin-login-brand/)
    assert.match(html, /logo-PLs-rosado\.png/)
    assert.match(html, /PLs al llamado/)
  })

  await t.test('todos los endpoints públicos devuelven datos reales sin caché', async () => {
    const endpoints = ['resources', 'aid-intakes', 'needs', 'announcements', 'distributions', 'community-notices', 'services', 'bulletins']
    for (const endpoint of endpoints) {
      const response = await request(`/api/public/${endpoint}`, { headers: { 'x-forwarded-for': `172.20.0.${endpoints.indexOf(endpoint) + 10}` } })
      assert.equal(response.status, 200, endpoint)
      assert.match(response.headers.get('cache-control') || '', /no-store/, endpoint)
      const body = await json(response)
      assert.equal(body.mode, 'live', endpoint)
      assert.ok(Array.isArray(body.docs), endpoint)
      assert.ok((body.docs as unknown[]).length > 0, `${endpoint} debe estar poblado por el seeder`)
      assertNoSensitiveFields(body.docs, `/api/public/${endpoint}`)
    }

    const directPayload = await request('/api/resources')
    assert.ok([401, 403].includes(directPayload.status), 'El API REST de Payload no debe exponer inventario anónimo')
    const directSettings = await request('/api/globals/site-settings')
    assert.ok([401, 403].includes(directSettings.status), 'El global de configuración no debe exponerse por Payload')

    const overviewResponse = await request('/api/public/overview', { headers: { 'x-forwarded-for': '172.20.0.30' } })
    const overview = await json(overviewResponse)
    assert.equal(overview.mode, 'live')
    assert.equal(typeof overview.center, 'object')
    assert.equal(typeof overview.metrics, 'object')
    assert.ok(Array.isArray(overview.evidences))
    assert.ok((overview.evidences as unknown[]).length > 0)
  })

  await t.test('el formulario público bloquea origen, formato y combinaciones inválidas', async () => {
    const crossSite = await request('/api/public/support-request', {
      method: 'POST', headers: { origin: 'https://atacante.test', 'sec-fetch-site': 'cross-site', 'content-type': 'application/json', 'x-forwarded-for': '172.21.0.1' }, body: '{}',
    })
    assert.equal(crossSite.status, 403)

    const malformed = await request('/api/public/support-request', {
      method: 'POST', headers: sameOriginHeaders({ 'content-type': 'application/json', 'x-forwarded-for': '172.21.0.2' }), body: '{mal',
    })
    assert.equal(malformed.status, 400)

    const invalid = await request('/api/public/support-request', {
      method: 'POST', headers: sameOriginHeaders({ 'content-type': 'application/json', 'x-forwarded-for': '172.21.0.3' }),
      body: JSON.stringify({ helpType: 'necesitar-ayuda', requestType: 'oferta', category: 'Agua', zone: 'Pereira', description: 'Detalle', contactName: 'Prueba', phone: '-1', privacyAccepted: false }),
    })
    assert.equal(invalid.status, 400)
    const invalidBody = await json(invalid)
    assert.ok(Array.isArray(invalidBody.fields))
  })

  let publicRequestId = ''
  await t.test('una solicitud válida se registra y queda disponible para el equipo', async () => {
    const unique = randomUUID()
    const response = await request('/api/public/support-request', {
      method: 'POST', headers: sameOriginHeaders({ 'content-type': 'application/json', 'x-forwarded-for': '172.21.0.4' }),
      body: JSON.stringify({
        helpType: 'necesitar-ayuda', requestType: 'recursos', category: `Agua prueba ${unique}`, zone: 'Pereira',
        quantity: 2, quantityUnit: 'cajas', description: 'Solicitud creada por la prueba HTTP.', contactName: `Prueba ${unique}`,
        phone: '+57 300 123 4567', privacyAccepted: true,
      }),
    })
    assert.equal(response.status, 201)
    const body = await json(response)
    assert.equal(body.ok, true)
    assert.match(String(body.id), /^[0-9a-f-]{36}$/i)
    publicRequestId = String(body.id)
  })

  await t.test('credenciales inválidas y usuarios Payload no ingresan al portal operativo', async () => {
    const invalid = await loginTeam('inventario@plsalllamado.local', 'contraseña-incorrecta', '172.22.0.1')
    assert.equal(invalid.response.status, 401)
    assert.deepEqual(invalid.body, { message: 'Credenciales inválidas.' })

    const payloadAdmin = await loginTeam('admin@plsalllamado.local', 'PLsAdmin2026!', '172.22.0.2')
    assert.equal(payloadAdmin.response.status, 401)
    assert.deepEqual(payloadAdmin.body, { message: 'Credenciales inválidas.' })
  })

  const roleCases = [
    ['que-tenemos', 'tenemos'], ['que-necesitamos', 'necesitamos'], ['anuncios', 'anuncios'], ['boletin', 'boletin'],
    ['servicios', 'servicios'], ['inventario', 'inventario'], ['distribucion', 'distribucion'], ['comunicados', 'comunicados'],
  ] as const

  await t.test('cada rol ve su módulo, evidencias y solicitudes, pero no módulos ajenos', async () => {
    for (const [index, [role, ownModule]] of roleCases.entries()) {
      const login = await loginTeam(`${role}@plsalllamado.local`, teamPassword, `172.23.${index + 1}.1`)
      assert.equal(login.response.status, 200, role)
      assert.equal(login.body.user && (login.body.user as JsonRecord).role, role)
      for (const module of [ownModule, 'actividades', 'evidencias', 'administracion']) {
        const response = await request(`/api/equipo/${module}?page=1&limit=8`, { headers: sameOriginHeaders({ cookie: login.cookie }) })
        assert.equal(response.status, 200, `${role} -> ${module}`)
      }
      const dashboardResponse = await request('/equipo', { headers: sameOriginHeaders({ cookie: login.cookie }) })
      assert.equal(dashboardResponse.status, 200, `${role} -> dashboard`)
      assert.match(await dashboardResponse.text(), /Actividades/)
      const activitiesPageResponse = await request('/equipo/actividades', { headers: sameOriginHeaders({ cookie: login.cookie }) })
      assert.equal(activitiesPageResponse.status, 200, `${role} -> formulario de actividades`)
      const activitiesPage = await activitiesPageResponse.text()
      assert.match(activitiesPage, /Crear actividades/i)
      assert.match(activitiesPage, /Personas inscritas/i)
      const foreignModule = ownModule === 'inventario' ? 'boletin' : 'inventario'
      const forbidden = await request(`/api/equipo/${foreignModule}`, { headers: { cookie: login.cookie } })
      assert.equal(forbidden.status, 403, `${role} no debe ver ${foreignModule}`)
    }
  })

  const crudCases: Array<{ role: string; module: string; data: JsonRecord; patch: JsonRecord }> = [
    { role: 'que-tenemos', module: 'tenemos', data: { resourceName: 'Ayuda de prueba', category: 'agua', quantity: 3, unit: 'cajas', sourceType: 'donacion', receivedAt: new Date().toISOString(), status: 'recibida', publicVisible: false }, patch: { notes: 'Revisada' } },
    { role: 'que-necesitamos', module: 'necesitamos', data: { title: 'Necesidad de prueba', detail: 'Detalle para la prueba.', category: 'agua', quantity: 3, unit: 'cajas', priority: 'media', status: 'abierta', zone: 'Pereira', publicVisible: false }, patch: { priority: 'alta' } },
    { role: 'anuncios', module: 'anuncios', data: { title: 'Anuncio de prueba', body: 'Contenido de prueba.', type: 'oficial', status: 'borrador', publicVisible: false }, patch: { body: 'Contenido actualizado.' } },
    { role: 'boletin', module: 'boletin', data: { title: 'Boletín de prueba', summary: 'Resumen de prueba.', body: 'Contenido largo de prueba.', category: 'Operación', author: 'Equipo', status: 'borrador', publicVisible: false }, patch: { summary: 'Resumen actualizado.' } },
    { role: 'servicios', module: 'servicios', data: { title: 'Servicio de prueba', description: 'Descripción de prueba.', type: 'gratuito', category: 'Transporte', provider: 'Comunidad', location: 'Pereira', status: 'borrador', publicVisible: false }, patch: { location: 'Dosquebradas' } },
    { role: 'inventario', module: 'inventario', data: { name: 'Inventario de prueba', category: 'agua', quantity: 0, unit: 'cajas', status: 'agotado', publicVisible: false }, patch: { quantity: 1, status: 'limitado' } },
    { role: 'distribucion', module: 'distribucion', data: { resourceName: 'Distribución de prueba', quantity: 2, unit: 'cajas', date: new Date().toISOString(), destination: 'Pereira', organization: 'Equipo de prueba', status: 'pendiente', publicVisible: false }, patch: { status: 'en-ruta' } },
    { role: 'inventario', module: 'actividades', data: { title: 'Actividad de prueba', description: 'Jornada creada por la prueba E2E.', date: new Date().toISOString(), startTime: '08:00', endTime: '12:00', location: 'Centro de acopio', capacity: 6, registered: 0, status: 'abierta', featured: true, publicVisible: true }, patch: { registered: 1 } },
  ]

  await t.test('los módulos operativos completan crear, listar, editar y eliminar', async () => {
    for (const scenario of crudCases) {
      const login = await loginTeam(`${scenario.role}@plsalllamado.local`, teamPassword, `172.24.${crudCases.indexOf(scenario) + 1}.1`)
      assert.equal(login.response.status, 200, scenario.module)
      const createResponse = await request(`/api/equipo/${scenario.module}`, {
        method: 'POST', headers: sameOriginHeaders({ cookie: login.cookie, 'content-type': 'application/json', 'x-forwarded-for': `172.25.${crudCases.indexOf(scenario) + 1}.1` }),
        body: JSON.stringify(scenario.data),
      })
      assert.equal(createResponse.status, 201, `${scenario.module}: crear ${JSON.stringify(await createResponse.clone().json())}`)
      const created = await json(createResponse)
      assertNoSensitiveFields(created, `/api/equipo/${scenario.module} POST`)
      const id = String((created.doc as JsonRecord).id)

      const listResponse = await request(`/api/equipo/${scenario.module}?page=1&limit=20`, { headers: sameOriginHeaders({ cookie: login.cookie }) })
      const list = await json(listResponse)
      assertNoSensitiveFields(list, `/api/equipo/${scenario.module}`)
      assert.ok((list.docs as JsonRecord[]).some((doc) => String(doc.id) === id), `${scenario.module}: listar`)

      if (scenario.module === 'actividades') {
        const overviewResponse = await request('/api/public/overview')
        assert.equal(overviewResponse.status, 200)
        const overview = await json(overviewResponse)
        const publicActivity = (overview.activities as JsonRecord[]).find((activity) => String(activity.id) === id)
        assert.ok(publicActivity, 'actividades: aparecer en el resumen público')
        assert.equal(publicActivity.featured, true, 'actividades: conservar destacado en el resumen público')
        const helpPage = await request('/ayudar')
        assert.equal(helpPage.status, 200)
        assert.match(await helpPage.text(), /Actividad de prueba/)
      }

      const updateResponse = await request(`/api/equipo/${scenario.module}`, {
        method: 'PATCH', headers: sameOriginHeaders({ cookie: login.cookie, 'content-type': 'application/json', 'x-forwarded-for': `172.26.${crudCases.indexOf(scenario) + 1}.1` }),
        body: JSON.stringify({ id, ...scenario.patch }),
      })
      assert.equal(updateResponse.status, 200, `${scenario.module}: editar`)
      assertNoSensitiveFields(await json(updateResponse), `/api/equipo/${scenario.module} PATCH`)

      const deleteResponse = await request(`/api/equipo/${scenario.module}`, {
        method: 'DELETE', headers: sameOriginHeaders({ cookie: login.cookie, 'content-type': 'application/json', 'x-forwarded-for': `172.27.${crudCases.indexOf(scenario) + 1}.1` }), body: JSON.stringify({ id }),
      })
      assert.equal(deleteResponse.status, 200, `${scenario.module}: eliminar`)

      if (scenario.module === 'actividades') {
        const overviewResponse = await request('/api/public/overview')
        const overview = await json(overviewResponse)
        assert.equal((overview.activities as JsonRecord[]).some((activity) => String(activity.id) === id), false, 'actividades: desaparecer del resumen público al eliminar')
      }
    }
  })

  await t.test('comunicados y evidencias rechazan creación sin imagen', async () => {
    for (const [role, module, body] of [
      ['comunicados', 'comunicados', { title: 'Sin imagen', body: 'No debe guardarse', category: 'vivienda', location: 'Pereira', contact: 'Equipo', status: 'borrador', publicVisible: false }],
      ['distribucion', 'evidencias', { sourceType: 'otro', otherReference: 'Jornada', title: 'Sin imagen', description: 'No debe guardarse', status: 'borrador', publicVisible: false }],
    ] as const) {
      const login = await loginTeam(`${role}@plsalllamado.local`, teamPassword, `172.28.${module === 'comunicados' ? 1 : 2}.1`)
      const response = await request(`/api/equipo/${module}`, {
        method: 'POST', headers: sameOriginHeaders({ cookie: login.cookie, 'content-type': 'application/json', 'x-forwarded-for': `172.29.${module === 'comunicados' ? 1 : 2}.1` }), body: JSON.stringify(body),
      })
      assert.equal(response.status, 400)
      assert.match(String((await json(response)).message), /Imagen/)
    }
  })

  await t.test('todas las personas gestionan solicitudes y no revierten una atendida', async () => {
    const login = await loginTeam('inventario@plsalllamado.local', teamPassword, '172.30.0.1')
    const listResponse = await request('/api/equipo/administracion', { headers: sameOriginHeaders({ cookie: login.cookie }) })
    const list = await json(listResponse)
    assert.ok((list.docs as JsonRecord[]).some((doc) => String(doc.id) === publicRequestId))

    const update = await request('/api/equipo/administracion', {
      method: 'PATCH', headers: sameOriginHeaders({ cookie: login.cookie, 'content-type': 'application/json', 'x-forwarded-for': '172.30.0.2' }), body: JSON.stringify({ id: publicRequestId, status: 'atendida', internalNotes: 'Gestionada por pruebas.' }),
    })
    assert.equal(update.status, 200)

    const regression = await request('/api/equipo/administracion', {
      method: 'PATCH', headers: sameOriginHeaders({ cookie: login.cookie, 'content-type': 'application/json', 'x-forwarded-for': '172.30.0.3' }), body: JSON.stringify({ id: publicRequestId, status: 'pendiente' }),
    })
    assert.equal(regression.status, 400)

    const remove = await request('/api/equipo/administracion', {
      method: 'DELETE', headers: sameOriginHeaders({ cookie: login.cookie, 'content-type': 'application/json', 'x-forwarded-for': '172.30.0.4' }), body: JSON.stringify({ id: publicRequestId }),
    })
    assert.equal(remove.status, 200)
  })

  await t.test('la sesión se renueva, se cierra y deja de autorizar', async () => {
    const login = await loginTeam('inventario@plsalllamado.local', teamPassword, '172.31.0.1')
    const refresh = await request('/api/equipo/refresh', { method: 'POST', headers: sameOriginHeaders({ cookie: login.cookie, 'x-forwarded-for': '172.31.0.2' }) })
    assert.equal(refresh.status, 200)
    assertNoSensitiveFields(await json(refresh), '/api/equipo/refresh')
    const refreshedCookie = responseCookie(refresh)
    const logout = await request('/api/equipo/logout', { method: 'POST', headers: sameOriginHeaders({ cookie: refreshedCookie }) })
    assert.equal(logout.status, 200)
    const expiredCookie = responseCookie(logout)
    const denied = await request('/api/equipo/inventario', { headers: { cookie: expiredCookie } })
    assert.equal(denied.status, 403)
  })

  await t.test('Payload permite admin, protege auditoría y mantiene la navegación de monitoreo', async () => {
    const loginResponse = await request('/api/users/login', {
      method: 'POST', headers: sameOriginHeaders({ 'content-type': 'application/json', 'x-forwarded-for': '172.32.0.1' }),
      body: JSON.stringify({ email: 'admin@plsalllamado.local', password: 'PLsAdmin2026!' }),
    })
    assert.equal(loginResponse.status, 200)
    const loginBody = await json(loginResponse)
    assert.equal('token' in loginBody, false)
    assertNoSensitiveFields(loginBody, '/api/users/login')
    const adminCookie = responseCookie(loginResponse)

    const currentUserResponse = await request('/api/users/me', { headers: sameOriginHeaders({ cookie: adminCookie }) })
    assert.equal(currentUserResponse.status, 200)
    assertNoSensitiveFields(await json(currentUserResponse), '/api/users/me')

    const auditResponse = await request('/api/audit-logs?limit=1', { headers: sameOriginHeaders({ cookie: adminCookie }) })
    assert.equal(auditResponse.status, 200)

    const monitoring = await request('/admin/monitoring', { headers: sameOriginHeaders({ cookie: adminCookie }) })
    assert.equal(monitoring.status, 200)
    const html = await monitoring.text()
    assert.match(html, /Monitoreo/i)
    assert.match(html, /Resources|Recursos/i)
    assert.match(html, /Needs|Necesidades/i)

    const operational = await loginTeam('inventario@plsalllamado.local', teamPassword, '172.32.0.2')
    const forbiddenAudit = await request('/api/audit-logs?limit=1', { headers: { cookie: operational.cookie } })
    assert.equal(forbiddenAudit.status, 403)
  })
})
