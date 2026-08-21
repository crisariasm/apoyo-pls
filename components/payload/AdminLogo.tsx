import Image from 'next/image'

export function AdminLogo() {
  return (
    <div className="pls-admin-login-brand" aria-label="PLs al llamado — Administración">
      <span className="pls-admin-login-brand__mark">
        <Image
          src="/logo-PLs-rosado.png"
          alt=""
          width={112}
          height={112}
          priority
        />
      </span>
      <span className="pls-admin-login-brand__copy">
        <strong>PLs al llamado</strong>
        <small>Administración</small>
      </span>
    </div>
  )
}
