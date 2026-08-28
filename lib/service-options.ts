import { findDepartmentForMunicipality } from './colombia-locations'

export const serviceModes = [
  { label: 'Presencial', value: 'presencial' },
  { label: 'A domicilio', value: 'domicilio' },
  { label: 'Remoto', value: 'remoto' },
  { label: 'Híbrido', value: 'hibrido' },
] as const

export const servicePricingTypes = [
  { label: 'Gratis', value: 'gratis' },
  { label: 'De pago', value: 'pagado' },
  { label: 'Tarifa negociable', value: 'negociable' },
  { label: 'Intercambio o aporte', value: 'intercambio' },
  { label: 'Por definir', value: 'por-definir' },
] as const

export type ServiceCoverage = {
  departmentCode: string
  department: string
  city: string
}

export function normalizeServiceCoverage(value: unknown): ServiceCoverage[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const coverage: ServiceCoverage[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const record = item as Record<string, unknown>
    const departmentCode = typeof record.departmentCode === 'string' ? record.departmentCode.trim() : ''
    const department = typeof record.department === 'string' ? record.department.trim() : ''
    const city = typeof record.city === 'string' ? record.city.trim() : ''
    if (!departmentCode || !department || !city) continue
    const key = `${departmentCode}:${city.toLocaleLowerCase('es-CO')}`
    if (seen.has(key)) continue
    seen.add(key)
    coverage.push({ departmentCode, department, city })
  }
  return coverage
}

export function coverageCities(value: unknown, fallbackCity = '') {
  const current = normalizeServiceCoverage(value)
  const cities = [...new Set(current.map((item) => item.city))]
  if (cities.length) return cities
  return fallbackCity.trim() ? [fallbackCity.trim()] : []
}

export function serviceCoverageFromCity(city: string): ServiceCoverage[] {
  const currentCity = city.trim()
  if (!currentCity) return []
  if (currentCity === 'Remoto / toda Colombia') return [{ departmentCode: 'nacional', department: 'Cobertura nacional', city: currentCity }]
  const knownDepartmentCodes: Record<string, string> = { Armenia: '63', Pereira: '66', Dosquebradas: '66', 'Santa Rosa de Cabal': '66', 'La Virginia': '66', Marsella: '66', Manizales: '17' }
  const department = knownDepartmentCodes[currentCity]
    ? { code: knownDepartmentCodes[currentCity], name: knownDepartmentCodes[currentCity] === '63' ? 'Quindío' : knownDepartmentCodes[currentCity] === '66' ? 'Risaralda' : 'Caldas' }
    : findDepartmentForMunicipality(currentCity)
  return [{ departmentCode: department?.code || 'legacy', department: department?.name || 'Otra cobertura', city: currentCity }]
}
