type Bulletin = {
  id: string
  category: string
  title: string
  summary: string
  body: string
  date: string
  author: string
  featured: boolean
}

export function BulletinList({ bulletins }: { bulletins: Bulletin[] }) {
  return (
    <>
      {!bulletins.length && <p className="empty-state">Todavía no hay boletines publicados.</p>}
      <div className={`bulletin-list${bulletins.length > 5 ? ' is-scrollable' : ''}`}>
        {bulletins.map((bulletin) => <details className={`bulletin-card${bulletin.featured ? ' is-featured' : ''}`} key={bulletin.id}>
          <summary><span className="bulletin-card-top"><small>{bulletin.category}</small><time>{bulletin.date}</time></span>{bulletin.featured && <span className="featured-badge">Destacado</span>}<strong>{bulletin.title}</strong><span className="bulletin-summary">{bulletin.summary}</span><span className="bulletin-toggle">Leer completo</span></summary>
          <div className="bulletin-content"><p>{bulletin.body}</p><small>{bulletin.author}</small></div>
        </details>)}
      </div>
      {bulletins.length > 5 && <p className="collection-scroll-hint">Desplázate dentro de la lista para consultar más boletines.</p>}
    </>
  )
}
