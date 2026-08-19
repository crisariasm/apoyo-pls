'use client'

import { useEffect, useMemo, useState } from 'react'

type Resource = {
  id: string
  name: string
  category: string
  quantity: number | string
  unit: string
  status: string
  detail: string
  featured: boolean
}

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export function ResourceBrowser({ resources }: { resources: Resource[] }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todas')
  const [filterOpen, setFilterOpen] = useState(false)
  const categories = ['Todas', ...Array.from(new Set(resources.map((resource) => resource.category)))]
  useEffect(() => {
    if (!filterOpen) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setFilterOpen(false) }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [filterOpen])
  const filteredResources = useMemo(() => resources.filter((resource) => {
    const normalizedQuery = normalize(query.trim())
    const matchesQuery = normalize(`${resource.name} ${resource.category} ${resource.detail}`).includes(normalizedQuery)
    const matchesCategory = category === 'Todas' || resource.category === category
    return matchesQuery && matchesCategory
  }), [category, query, resources])

  return (
    <>
      <div className="resource-toolbar">
        <label className="search-box" htmlFor="resource-search">
          <input id="resource-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar recursos" />
        </label>
        <div className="filter-controls">
          <div className="filter-pills" aria-label="Filtrar por categoría">
            {categories.map((item) => <button key={item} className={category === item ? 'filter-pill active' : 'filter-pill'} onClick={() => setCategory(item)}>{item}</button>)}
          </div>
          <button className="mobile-filter-trigger" type="button" onClick={() => setFilterOpen(true)} aria-haspopup="dialog" aria-expanded={filterOpen}>
            <span>Filtros</span>
            <strong>{category === 'Todas' ? 'Todos' : category}</strong>
          </button>
        </div>
      </div>
      {filterOpen && <div className="filter-modal-backdrop" role="presentation" onClick={() => setFilterOpen(false)}>
        <section className="filter-modal" role="dialog" aria-modal="true" aria-labelledby="filter-modal-title" onClick={(event) => event.stopPropagation()}>
          <div className="filter-modal-header">
            <div><span className="section-kicker green-text">Inventario público</span><h2 id="filter-modal-title">Filtrar recursos</h2></div>
            <button className="filter-modal-close" type="button" onClick={() => setFilterOpen(false)}>Cerrar</button>
          </div>
          <div className="filter-modal-options" role="group" aria-label="Categorías de recursos">
            {categories.map((item) => <button key={item} className={category === item ? 'filter-modal-option active' : 'filter-modal-option'} type="button" onClick={() => { setCategory(item); setFilterOpen(false) }}>{item}</button>)}
          </div>
        </section>
      </div>}
      <div className={`resource-grid${filteredResources.length > 9 ? ' is-scrollable' : ''}`}>
        {filteredResources.map((resource) => (
          <article className={`resource-card${resource.featured ? ' is-featured' : ''}`} key={resource.id}>
            <div className="resource-top"><span className="small-label">{resource.category}</span><span className={`availability ${resource.status}`}>{resource.status === 'disponible' ? 'Disponible' : resource.status === 'limitado' ? 'Limitado' : 'Agotado'}</span></div>
            {resource.featured && <span className="featured-badge">Destacado</span>}
            <h3>{resource.name}</h3>
            <p>{resource.detail}</p>
            <div className="resource-bottom"><strong>{resource.quantity}</strong><span>{resource.unit}</span></div>
          </article>
        ))}
      </div>
      {filteredResources.length > 9 && <p className="collection-scroll-hint">Desplázate dentro de la lista para consultar más recursos.</p>}
      {filteredResources.length === 0 && <div className="empty-state">No encontramos recursos con ese criterio. Prueba otra búsqueda.</div>}
      <div className="update-line">La disponibilidad es aproximada y se actualiza desde el equipo de inventario.</div>
    </>
  )
}
