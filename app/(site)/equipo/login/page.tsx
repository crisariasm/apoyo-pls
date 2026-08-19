import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { StaffLoginForm } from '../components/login-form'
import { getStaffSession } from '../../../../lib/staff-portal-auth'

export const dynamic = 'force-dynamic'

export default async function StaffLoginPage() {
  const session = await getStaffSession()
  if (session) redirect('/equipo')

  return (
    <main className="staff-login-page">
      <section className="staff-login-card">
        <div className="staff-login-brand"><Image src="/logo-PLs-rosado.png" alt="PLs al llamado" width={64} height={64} priority /><div><strong>PLs al llamado</strong><span>Centro de acopio · Pereira</span></div></div>
        <p className="staff-eyebrow">Acceso del equipo</p>
        <h1>Portal operativo</h1>
        <p className="staff-login-intro">Ingresa para actualizar necesidades, inventario, anuncios, servicios, distribución y comunicados.</p>
        <StaffLoginForm />
        <p className="staff-login-note">Este acceso no tiene registro público. El rol de administración puede ver todos los módulos. Las cuentas admin y super-admin de Payload ingresan únicamente por /admin.</p>
        <Link className="staff-public-link" href="/">Volver a la página pública</Link>
      </section>
    </main>
  )
}
