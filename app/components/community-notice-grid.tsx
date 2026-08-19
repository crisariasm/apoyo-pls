'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'

type CommunityNotice = {
  id: string
  category: string
  title: string
  body: string
  image: string
  location: string
  time: string
  contact: string
  featured: boolean
}

const pageSize = 6

export function CommunityNoticeGrid({ notices }: { notices: CommunityNotice[] }) {
  const [page, setPage] = useState(1)
  const [sharedId, setSharedId] = useState('')
  const totalPages = Math.max(1, Math.ceil(notices.length / pageSize))
  const visibleNotices = useMemo(() => notices.slice((page - 1) * pageSize, page * pageSize), [notices, page])

  const shareNotice = async (notice: CommunityNotice) => {
    const url = `${window.location.origin}/comunicados#comunicado-${notice.id}`
    try {
      if (navigator.share) {
        await navigator.share({ title: notice.title, text: `${notice.category}: ${notice.body}`, url })
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url)
      }
      setSharedId(notice.id)
      window.setTimeout(() => setSharedId(''), 2200)
    } catch {
      // Compartir puede cancelarse desde el menú del dispositivo.
    }
  }

  return (
    <>
      {!notices.length && <p className="empty-state">Todavía no hay comunicados publicados.</p>}
      <div className="notice-grid">
        {visibleNotices.map((notice) => (
          <article className={`notice-card${notice.featured ? ' is-featured' : ''}`} id={`comunicado-${notice.id}`} key={notice.id}>
            <div className="notice-image"><Image src={notice.image} alt="" fill sizes="(max-width: 800px) 100vw, 33vw" /></div>
            <div className="notice-card-body">
              <div className="notice-card-meta"><span>{notice.category}</span><small>{notice.time}</small></div>
              {notice.featured && <span className="featured-badge">Destacado</span>}
              <h2>{notice.title}</h2>
              <p>{notice.body}</p>
              <div className="notice-card-footer"><span>{notice.location} · {notice.contact}</span><button type="button" onClick={() => shareNotice(notice)}>{sharedId === notice.id ? 'Enlace listo' : 'Compartir'}</button></div>
            </div>
          </article>
        ))}
      </div>
      {notices.length > pageSize && <div className="collection-pagination" aria-label="Paginación de comunicados">
        <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>Anterior</button>
        <div>{Array.from({ length: totalPages }, (_, index) => index + 1).map((item) => <button className={item === page ? 'active' : ''} type="button" key={item} onClick={() => setPage(item)} aria-label={`Página ${item}`} aria-current={item === page ? 'page' : undefined}>{item}</button>)}</div>
        <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages}>Siguiente</button>
      </div>}
    </>
  )
}
