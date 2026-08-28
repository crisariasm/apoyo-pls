import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'

import {
  canAccessModule,
  dashboardRoleValues,
  getModulesForRole,
  getPortalModule,
  portalModules,
  portalModuleSlugs,
} from '../lib/staff-portal-config'
import { getPortalFieldMaxLength, normalizePortalData, validatePortalData } from '../lib/staff-portal-validation'

test('todos los módulos y roles tienen una navegación consistente', () => {
  assert.deepEqual(portalModules.map(({ slug }) => slug), [...portalModuleSlugs])
  assert.equal(new Set(portalModules.map(({ slug }) => slug)).size, portalModules.length)
  assert.equal(getModulesForRole('administracion').length, portalModules.length)

  for (const role of dashboardRoleValues) {
    const modules = getModulesForRole(role)
    assert.ok(modules.some(({ slug }) => slug === 'administracion'), `${role} debe ver solicitudes`)
    assert.ok(modules.some(({ slug }) => slug === 'actividades'), `${role} debe ver actividades`)
    assert.ok(modules.some(({ slug }) => slug === 'evidencias'), `${role} debe ver evidencias`)
    for (const module of modules) assert.equal(canAccessModule(module, role), true)
  }

  assert.equal(canAccessModule(getPortalModule('inventario')!, 'inventario'), true)
  assert.equal(canAccessModule(getPortalModule('boletin')!, 'inventario'), false)
  assert.equal(getPortalModule('desconocido'), undefined)
})

test('normaliza texto, números y fecha de publicación automática', () => {
  const inventory = getPortalModule('inventario')!
  const normalized = normalizePortalData(inventory, { name: '  Agua  ', quantity: '20', unit: '  cajas ', notes: '' })
  assert.equal(normalized.name, 'Agua')
  assert.equal(normalized.quantity, 20)
  assert.equal(normalized.unit, 'cajas')
  assert.equal('notes' in normalized, false)

  const bulletin = getPortalModule('boletin')!
  const published = normalizePortalData(bulletin, { title: ' Avance ', status: 'publicado', publishedAt: '' })
  assert.equal(published.title, 'Avance')
  assert.equal(Number.isNaN(new Date(String(published.publishedAt)).getTime()), false)
})

test('valida obligatorios, números, fechas, selectores, booleanos y uploads', () => {
  const inventory = getPortalModule('inventario')!
  assert.match(validatePortalData(inventory, {}) || '', /Completa: Recurso/)
  assert.match(validatePortalData(inventory, { name: 'Agua', category: 'agua', quantity: -1, unit: 'cajas', status: 'disponible' }) || '', /igual o mayor que 0/)
  assert.match(validatePortalData(inventory, { name: 'Agua', category: 'inventada', quantity: 1, unit: 'cajas', status: 'disponible' }) || '', /opción no válida/)
  assert.match(validatePortalData(inventory, { name: 'Agua', category: 'agua', quantity: 1.5, unit: 'cajas', status: 'disponible' }) || '', /entero/)
  assert.match(validatePortalData(inventory, { name: 'Agua', category: 'agua', quantity: 1_000_000_001, unit: 'cajas', status: 'disponible' }) || '', /límite/)
  assert.match(validatePortalData(inventory, { publicVisible: 'true' }, { partial: true }) || '', /verdadero o falso/)

  const distribution = getPortalModule('distribucion')!
  assert.match(validatePortalData(distribution, { date: 'no-es-fecha' }, { partial: true }) || '', /fecha válida/)

  const notices = getPortalModule('comunicados')!
  assert.match(validatePortalData(notices, { image: 'no-uuid' }, { partial: true }) || '', /no es válida/)
  assert.equal(validatePortalData(notices, { image: randomUUID() }, { partial: true }), null)
  assert.equal(validatePortalData(notices, { image: { id: randomUUID(), filename: 'foto.jpg' } }, { partial: true }), null)
  assert.equal(validatePortalData(notices, { image: { name: 'foto.jpg', arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) } }, { partial: true }), null)
})

test('valida reglas cruzadas de necesidades, evidencias y publicaciones', () => {
  const needs = getPortalModule('necesitamos')!
  assert.match(validatePortalData(needs, { quantity: 10 }, { partial: true }) || '', /presentación/)
  assert.equal(validatePortalData(needs, { quantity: 10, unit: 'kits' }, { partial: true }), null)

  const evidence = getPortalModule('evidencias')!
  assert.match(validatePortalData(evidence, { sourceType: 'distribucion' }, { partial: true }) || '', /Selecciona la salida/)
  assert.match(validatePortalData(evidence, { sourceType: 'otro' }, { partial: true }) || '', /referencia/)
  assert.equal(validatePortalData(evidence, { sourceType: 'distribucion', distribution: randomUUID() }, { partial: true }), null)

  const bulletin = getPortalModule('boletin')!
  assert.match(validatePortalData(bulletin, { status: 'publicado' }, { partial: true }) || '', /Fecha de publicación/)
})

test('valida el WhatsApp de un servicio antes de enviarlo al servidor', () => {
  const services = getPortalModule('servicios')!
  assert.equal(validatePortalData(services, { whatsappCountryCode: '+57', whatsappNumber: '300 123 4567' }, { partial: true }), null)
  assert.equal(validatePortalData(services, { providerEmail: 'persona@ejemplo.co' }, { partial: true }), null)
  assert.match(validatePortalData(services, { providerEmail: 'correo-invalido' }, { partial: true }) || '', /Correo de contacto debe tener un formato válido/)
  assert.match(validatePortalData(services, {
    title: 'Servicio', description: 'Descripción', type: 'gratuito', category: 'Apoyo', provider: 'Comunidad', location: 'Pereira',
    status: 'borrador', publicVisible: false, whatsappCountryCode: '+57',
  }) || '', /Completa: Número de WhatsApp/)
  assert.match(validatePortalData(services, { whatsappCountryCode: '+57', whatsappNumber: 'abc' }, { partial: true }) || '', /WhatsApp válido/)
})

test('los límites de campo usados por frontend y backend son deterministas', () => {
  const inventory = getPortalModule('inventario')!
  assert.equal(getPortalFieldMaxLength(inventory.fields.find(({ name }) => name === 'name')!), 160)
  assert.equal(getPortalFieldMaxLength(inventory.fields.find(({ name }) => name === 'notes')!), 5000)
  const evidence = getPortalModule('evidencias')!
  assert.equal(getPortalFieldMaxLength(evidence.fields.find(({ name }) => name === 'description')!), 2000)
})
