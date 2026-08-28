'use client'

import { useMemo, useState } from 'react'

import { departmentName, departmentOptions, municipalitiesForDepartment } from '../../lib/colombia-locations'
import { normalizeServiceCoverage, type ServiceCoverage } from '../../lib/service-options'

type ServiceCoveragePickerProps = {
  value: unknown
  onChange: (value: ServiceCoverage[]) => void
  required?: boolean
  compact?: boolean
}

export function ServiceCoveragePicker({ value, onChange, required = false, compact = false }: ServiceCoveragePickerProps) {
  const selected = normalizeServiceCoverage(value)
  const [departmentCode, setDepartmentCode] = useState('')
  const [municipality, setMunicipality] = useState('')
  const municipalities = useMemo(() => municipalitiesForDepartment(departmentCode), [departmentCode])

  function selectDepartment(nextDepartmentCode: string) {
    setDepartmentCode(nextDepartmentCode)
    setMunicipality('')
  }

  function selectMunicipality(nextMunicipality: string) {
    setMunicipality(nextMunicipality)
    if (!departmentCode || !nextMunicipality) return
    const next: ServiceCoverage = { departmentCode, department: departmentName(departmentCode), city: nextMunicipality }
    onChange(normalizeServiceCoverage([...selected, next]))
    setMunicipality('')
  }

  function removeCoverage(index: number) {
    onChange(selected.filter((_, currentIndex) => currentIndex !== index))
  }

  return (
    <div className={`service-coverage-picker${compact ? ' is-compact' : ''}`}>
      <div className="service-coverage-picker-heading">
        <div>
          <span className="service-coverage-label">Ciudades y municipios donde prestas el servicio{required && ' *'}</span>
          <small>Elige un departamento y un municipio. Cada municipio seleccionado se agrega automáticamente; puedes repetir el proceso para otra cobertura.</small>
        </div>
        <span className="service-coverage-count">{selected.length} {selected.length === 1 ? 'cobertura' : 'coberturas'}</span>
      </div>
      <div className="service-coverage-picker-fields">
        <label>Departamento<select value={departmentCode} onChange={(event) => selectDepartment(event.currentTarget.value)} required={required && selected.length === 0}>
          <option value="">Selecciona un departamento</option>
          {departmentOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
        </select></label>
        <label>Ciudad o municipio<select value={municipality} disabled={!departmentCode} onChange={(event) => selectMunicipality(event.currentTarget.value)} required={required && selected.length === 0}>
          <option value="">{departmentCode ? 'Selecciona una ciudad o pueblo' : 'Primero elige un departamento'}</option>
          {municipalities.map((option) => <option value={option} key={option}>{option}</option>)}
        </select></label>
      </div>
      {selected.length > 0 ? <div className="service-coverage-list" aria-label="Coberturas seleccionadas">
        {selected.map((item, index) => <div className="service-coverage-chip" key={`${item.departmentCode}:${item.city}`}><span><strong>{item.city}</strong><small>{item.department}</small></span><button type="button" onClick={() => removeCoverage(index)} aria-label={`Quitar ${item.city}`}>×</button></div>)}
      </div> : <p className="service-coverage-empty">Todavía no has agregado una ciudad. Al seleccionar un municipio aparecerá aquí.</p>}
    </div>
  )
}
