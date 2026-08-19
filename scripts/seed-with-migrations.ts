import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'

import { Pool } from 'pg'
import { getPayload } from 'payload'

import type { StaffRole } from '../lib/access'
import config from '../payload.config'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL es obligatorio para ejecutar el seeder.')
}

const run = (command: string, args: string[]) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      env: process.env,
      stdio: 'inherit',
    })

    child.once('error', reject)
    child.once('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`${command} ${args.join(' ')} terminó con código ${code ?? 'desconocido'}.`))
    })
  })

const hasMigrationTable = async () => {
  const pool = new Pool({ connectionString: databaseUrl })

  try {
    const result = await pool.query<{ exists: string | null }>(
      `SELECT to_regclass('public.payload_migrations') AS "exists"`,
    )
    return Boolean(result.rows[0]?.exists)
  } finally {
    await pool.end()
  }
}

const migrationCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

const generatedSeedIds = new Set<string>()

const seedId = () => {
  let id = randomUUID()

  while (generatedSeedIds.has(id)) {
    id = randomUUID()
  }

  generatedSeedIds.add(id)
  return id
}
export const seedResources = [
  { id: seedId(), name: 'Alimentos no perecederos', category: 'Alimentos', quantity: 184, unit: 'cajas', status: 'disponible', detail: 'Arroz, lentejas, pasta, enlatados y aceite' },
  { id: seedId(), name: 'Agua potable', category: 'Agua', quantity: 96, unit: 'canecas', status: 'limitado', detail: 'Presentaciones de 5 y 20 litros' },
  { id: seedId(), name: 'Kits de aseo', category: 'Aseo', quantity: 42, unit: 'kits', status: 'limitado', detail: 'Higiene personal y limpieza básica' },
  { id: seedId(), name: 'Cobijas limpias', category: 'Abrigo', quantity: 128, unit: 'unidades', status: 'disponible', detail: 'Clasificadas y listas para distribución' },
  { id: seedId(), name: 'Botiquines', category: 'Salud', quantity: 16, unit: 'kits', status: 'limitado', detail: 'Primeros auxilios básicos' },
  { id: seedId(), name: 'Alimento para mascotas', category: 'Mascotas', quantity: 14, unit: 'bultos', status: 'limitado', detail: 'Alimento seco para perros y gatos' },
  { id: seedId(), name: 'Harina de maíz', category: 'Alimentos', quantity: 73, unit: 'bultos', status: 'disponible', detail: 'Presentaciones de 10 kilos para mercados comunitarios' },
  { id: seedId(), name: 'Fríjol cargamanto', category: 'Alimentos', quantity: 55, unit: 'bultos', status: 'limitado', detail: 'Alimento seco clasificado y empacado' },
  { id: seedId(), name: 'Leche en polvo', category: 'Alimentos', quantity: 41, unit: 'bolsas', status: 'limitado', detail: 'Bolsas cerradas con fecha vigente' },
  { id: seedId(), name: 'Atún enlatado', category: 'Alimentos', quantity: 210, unit: 'unidades', status: 'disponible', detail: 'Enlatados sin abrir y sin abolladuras' },
  { id: seedId(), name: 'Agua embotellada', category: 'Agua', quantity: 180, unit: 'pacas', status: 'disponible', detail: 'Botellas selladas para rutas de distribución' },
  { id: seedId(), name: 'Toallas higiénicas', category: 'Aseo', quantity: 68, unit: 'paquetes', status: 'limitado', detail: 'Paquetes sellados de diferentes tamaños' },
  { id: seedId(), name: 'Jabón de baño', category: 'Aseo', quantity: 95, unit: 'cajas', status: 'disponible', detail: 'Elementos de higiene personal sin abrir' },
  { id: seedId(), name: 'Desinfectante', category: 'Aseo', quantity: 32, unit: 'galones', status: 'limitado', detail: 'Para limpieza de espacios comunitarios' },
  { id: seedId(), name: 'Pañales talla M', category: 'Bebés', quantity: 18, unit: 'paquetes', status: 'limitado', detail: 'Paquetes sellados, talla M' },
  { id: seedId(), name: 'Pañales talla G', category: 'Bebés', quantity: 11, unit: 'paquetes', status: 'limitado', detail: 'Paquetes sellados, talla G' },
  { id: seedId(), name: 'Fórmula infantil', category: 'Bebés', quantity: 7, unit: 'latas', status: 'limitado', detail: 'Latas cerradas y con fecha vigente' },
  { id: seedId(), name: 'Linternas recargables', category: 'Herramientas', quantity: 22, unit: 'unidades', status: 'disponible', detail: 'Revisadas y listas para préstamo comunitario' },
  { id: seedId(), name: 'Pilas AA', category: 'Herramientas', quantity: 35, unit: 'paquetes', status: 'disponible', detail: 'Pilas nuevas para radios y linternas' },
  { id: seedId(), name: 'Guantes de trabajo', category: 'Herramientas', quantity: 46, unit: 'pares', status: 'disponible', detail: 'Tallas variadas para clasificación y carga' },
  { id: seedId(), name: 'Botas de caucho', category: 'Herramientas', quantity: 12, unit: 'pares', status: 'limitado', detail: 'Pares en buen estado para recorridos rurales' },
  { id: seedId(), name: 'Colchonetas', category: 'Abrigo', quantity: 27, unit: 'unidades', status: 'limitado', detail: 'Limpias y listas para albergues temporales' },
  { id: seedId(), name: 'Sábanas limpias', category: 'Abrigo', quantity: 40, unit: 'juegos', status: 'disponible', detail: 'Juegos completos y clasificados' },
  { id: seedId(), name: 'Alimento para gatos', category: 'Mascotas', quantity: 9, unit: 'bultos', status: 'limitado', detail: 'Alimento seco para gatos' },
  { id: seedId(), name: 'Correas y collares', category: 'Mascotas', quantity: 16, unit: 'kits', status: 'disponible', detail: 'Elementos para identificación y cuidado' },
  { id: seedId(), name: 'Suero oral', category: 'Salud', quantity: 64, unit: 'cajas', status: 'disponible', detail: 'Sobres sellados de hidratación oral' },
  { id: seedId(), name: 'Gasas estériles', category: 'Salud', quantity: 29, unit: 'paquetes', status: 'limitado', detail: 'Material de primeros auxilios' },
  { id: seedId(), name: 'Cajas plásticas con tapa', category: 'Otros', quantity: 31, unit: 'unidades', status: 'disponible', detail: 'Para organizar y proteger donaciones' },
]

export const seedAidIntakes = [
  { id: seedId(), resource: 'Alimentos no perecederos', category: 'Alimentos', quantity: '120 cajas', sourceType: 'Donación comunitaria', sourceReference: 'Red de vecinos de Pereira', receivedAt: 'Hoy · 8:30 a.m.', status: 'Incorporada al inventario', publicVisible: true, notes: 'Cajas cerradas y clasificadas por tipo de alimento.' },
  { id: seedId(), resource: 'Agua embotellada', category: 'Agua', quantity: '36 pacas', sourceType: 'Alianza u organización', sourceReference: 'Comercio aliado', receivedAt: 'Ayer · 3:10 p.m.', status: 'En clasificación', publicVisible: true, notes: 'Se revisan sellos y fechas antes de incorporarla.' },
  { id: seedId(), resource: 'Cobijas limpias', category: 'Abrigo', quantity: '48 unidades', sourceType: 'Donación comunitaria', sourceReference: 'Red comunitaria', receivedAt: 'Ayer · 11:40 a.m.', status: 'Incorporada al inventario', publicVisible: true, notes: 'Elementos revisados, doblados y listos para distribución.' },
  { id: seedId(), resource: 'Alimento para mascotas', category: 'Mascotas', quantity: '8 bultos', sourceType: 'Alianza u organización', sourceReference: 'Red animalista', receivedAt: '17 ago · 4:20 p.m.', status: 'Incorporada al inventario', publicVisible: true, notes: 'Alimento seco para perros y gatos.' },
  { id: seedId(), resource: 'Kits de aseo', category: 'Aseo', quantity: '30 kits', sourceType: 'Donación comunitaria', sourceReference: 'Donantes del centro', receivedAt: '17 ago · 9:15 a.m.', status: 'Recibida', publicVisible: false, notes: 'Pendientes de revisión y rotulado.' },
  { id: seedId(), resource: 'Linternas recargables', category: 'Herramientas', quantity: '14 unidades', sourceType: 'Préstamo', sourceReference: 'Comercio aliado', receivedAt: '16 ago · 2:00 p.m.', status: 'Incorporada al inventario', publicVisible: true, notes: 'Registradas como préstamo para recorridos rurales.' },
]

export const seedNeeds = [
  { id: seedId(), title: 'Kits de higiene personal', detail: 'Necesitamos kits listos para entregar en los recorridos de esta semana.', quantity: '200 kits', priority: 'Crítica', zone: 'Pereira y zonas rurales', category: 'Aseo' },
  { id: seedId(), title: 'Agua potable', detail: 'Se requieren presentaciones familiares y canecas selladas.', quantity: '120 canecas', priority: 'Alta', zone: 'La Florida', category: 'Agua' },
  { id: seedId(), title: 'Transporte para distribución', detail: 'Camioneta con conductor para ruta de entrega.', quantity: '2 turnos', priority: 'Alta', zone: 'Pereira', category: 'Transporte' },
  { id: seedId(), title: 'Voluntariado de clasificación', detail: 'Apoyo para separar, contar y rotular donaciones.', quantity: '8 cupos', priority: 'Media', zone: 'Centro PLs al llamado', category: 'Otros' },
  { id: seedId(), title: 'Pañales talla M', detail: 'Se necesitan paquetes sellados para completar los kits de cuidado.', quantity: '80 paquetes', priority: 'Crítica', zone: 'Pereira', category: 'Bebés' },
  { id: seedId(), title: 'Fórmula infantil', detail: 'Latas cerradas y con fecha vigente para apoyo alimentario.', quantity: '24 latas', priority: 'Alta', zone: 'La Florida', category: 'Bebés' },
  { id: seedId(), title: 'Linternas recargables', detail: 'Apoyo para recorridos y espacios con cortes de energía.', quantity: '15 unidades', priority: 'Alta', zone: 'Zonas rurales', category: 'Herramientas' },
  { id: seedId(), title: 'Guantes de trabajo', detail: 'Se requieren pares en buen estado para clasificar y cargar donaciones.', quantity: '30 pares', priority: 'Media', zone: 'Centro PLs al llamado', category: 'Herramientas' },
  { id: seedId(), title: 'Colchonetas', detail: 'Elementos limpios para albergues temporales y jornadas de descanso.', quantity: '35 unidades', priority: 'Alta', zone: 'Pereira', category: 'Abrigo' },
  { id: seedId(), title: 'Suero oral', detail: 'Se necesitan sobres sellados para los recorridos de salud comunitaria.', quantity: '40 cajas', priority: 'Crítica', zone: 'Dosquebradas', category: 'Salud' },
  { id: seedId(), title: 'Alimento para gatos', detail: 'Hace falta alimento seco para incluir en las ayudas para mascotas.', quantity: '12 bultos', priority: 'Media', zone: 'La Florida', category: 'Mascotas' },
  { id: seedId(), title: 'Cajas plásticas con tapa', detail: 'Ayudan a proteger y organizar los recursos durante el almacenamiento.', quantity: '20 unidades', priority: 'Media', zone: 'Centro PLs al llamado', category: 'Otros' },
  { id: seedId(), title: 'Ropa interior nueva', detail: 'Se requieren prendas nuevas para complementar los kits de abrigo.', quantity: '60 unidades', priority: 'Alta', zone: 'Pereira y zonas rurales', category: 'Abrigo' },
  { id: seedId(), title: 'Botas de caucho', detail: 'Pares en buen estado para las rutas de acceso rural.', quantity: '10 pares', priority: 'Alta', zone: 'Zonas rurales', category: 'Herramientas' },
  { id: seedId(), title: 'Transporte nocturno', detail: 'Vehículo con conductor para mover recursos después de la clasificación.', quantity: '1 turno', priority: 'Alta', zone: 'Pereira', category: 'Transporte' },
  { id: seedId(), title: 'Apoyo para inventario', detail: 'Personas para contar, registrar y ubicar recursos recibidos.', quantity: '6 cupos', priority: 'Media', zone: 'Centro PLs al llamado', category: 'Otros' },
]

export const seedAnnouncements = [
  { id: seedId(), type: 'Horario', title: 'El centro recibe donaciones hasta las 6:00 p.m.', body: 'La recepción funciona de lunes a sábado. Trae los recursos limpios, separados y, si es posible, rotulados por categoría.', time: 'Hoy · 9:24 a.m.', tone: 'green' },
  { id: seedId(), type: 'Distribución', title: 'Mañana sale una ruta hacia La Florida', body: 'La salida llevará alimentos, agua y elementos de aseo. La información pública muestra el destino general, sin datos de familias.', time: 'Ayer · 4:10 p.m.', tone: 'orange' },
  { id: seedId(), type: 'Agradecimiento', title: 'Gracias a las 34 personas que ayudaron a clasificar', body: 'El apoyo permitió revisar, contar y organizar las donaciones recibidas durante la jornada de la mañana.', time: 'Ayer · 11:02 a.m.', tone: 'blue' },
  { id: seedId(), type: 'Información', title: 'Se reciben cajas limpias para organizar las ayudas', body: 'Las cajas plásticas o de cartón resistente ayudan a proteger los recursos y mantener despejados los pasillos del centro.', time: 'Hoy · 8:50 a.m.', tone: 'green' },
  { id: seedId(), type: 'Necesidad', title: 'Se buscan conductores para dos rutas de esta semana', body: 'Se necesitan vehículos con conductor para mover ayudas hacia La Florida y Dosquebradas. Registra tu oferta desde Ayudar.', time: 'Hoy · 8:15 a.m.', tone: 'orange' },
  { id: seedId(), type: 'Inventario', title: 'El inventario de agua potable está limitado', body: 'Antes de donar agua, revisa las cantidades publicadas y prioriza presentaciones selladas y fáciles de transportar.', time: 'Ayer · 6:02 p.m.', tone: 'orange' },
  { id: seedId(), type: 'Actividad', title: 'Jornada de clasificación este sábado', body: 'El equipo recibirá personas para contar, separar y rotular recursos. Los cupos disponibles se actualizan en la sección Ayudar.', time: 'Ayer · 3:40 p.m.', tone: 'blue' },
  { id: seedId(), type: 'Inventario', title: 'Llegaron nuevos recursos para mascotas', body: 'La red animalista recibió alimento seco y elementos de cuidado para apoyar los recorridos comunitarios.', time: 'Ayer · 1:20 p.m.', tone: 'green' },
  { id: seedId(), type: 'Horario', title: 'El sábado la recepción será hasta las 4:00 p.m.', body: 'Este horario especial permite cerrar inventario y preparar las salidas de la semana siguiente.', time: '17 ago · 5:10 p.m.', tone: 'orange' },
  { id: seedId(), type: 'Distribución', title: 'La ruta hacia Dosquebradas ya fue entregada', body: 'La salida de suero oral y elementos de salud fue entregada a la brigada aliada para sus recorridos.', time: '17 ago · 2:30 p.m.', tone: 'blue' },
  { id: seedId(), type: 'Información', title: 'También recibimos herramientas en buen estado', body: 'Linternas, guantes, botas y cajas para almacenamiento pueden registrarse como ayuda para revisión del equipo.', time: '17 ago · 11:45 a.m.', tone: 'green' },
  { id: seedId(), type: 'Agradecimiento', title: 'Gracias a la red comunitaria por apoyar la logística', body: 'La coordinación entre vecinos, comercios y organizaciones aliadas ha permitido sostener las rutas de distribución.', time: '16 ago · 4:18 p.m.', tone: 'blue' },
  { id: seedId(), type: 'Actualización', title: 'La lista de prioridades fue actualizada', body: 'Las necesidades pueden cambiar durante la jornada. Consulta la lista antes de preparar una nueva donación.', time: '16 ago · 10:05 a.m.', tone: 'orange' },
]

export const seedDistributions = [
  { id: seedId(), resource: 'Alimentos no perecederos', quantity: '48 cajas', destination: 'La Florida', organization: 'PLs al llamado · Ruta 03', status: 'Entregado', date: '17 ago', evidence: [{ id: seedId(), image: '/hero-PLs-al-llamado.png', title: 'Clasificación antes de la salida', description: 'Las cajas fueron separadas y marcadas antes de cargar la ruta hacia La Florida.' }] },
  { id: seedId(), resource: 'Cobijas limpias', quantity: '36 unidades', destination: 'Albergue temporal', organization: 'Red comunitaria', status: 'En ruta', date: '18 ago', evidence: [{ id: seedId(), image: '/hero-PLs-al-llamado.png', title: 'Ayudas listas para el albergue', description: 'Cobijas revisadas y organizadas para una entrega general en el albergue temporal.' }] },
  { id: seedId(), resource: 'Botiquines', quantity: '6 kits', destination: 'Dosquebradas', organization: 'Brigada de salud', status: 'Pendiente', date: '19 ago', evidence: [{ id: seedId(), image: '/hero-PLs-al-llamado.png', title: 'Botiquines revisados', description: 'La brigada de salud verificó los elementos básicos antes de programar la salida.' }] },
  { id: seedId(), resource: 'Agua potable', quantity: '24 canecas', destination: 'La Florida', organization: 'Red comunitaria', status: 'En ruta', date: '19 ago', evidence: [{ id: seedId(), image: '/hero-PLs-al-llamado.png', title: 'Agua sellada para la ruta', description: 'Las canecas fueron revisadas, selladas y ubicadas para evitar derrames durante el traslado.' }] },
  { id: seedId(), resource: 'Kits de aseo', quantity: '42 kits', destination: 'Pereira rural', organization: 'Equipo de distribución', status: 'Pendiente', date: '20 ago', evidence: [{ id: seedId(), image: '/hero-PLs-al-llamado.png', title: 'Kits organizados por destino', description: 'Los kits quedaron agrupados por zona para agilizar la próxima jornada de distribución.' }] },
  { id: seedId(), resource: 'Alimento para mascotas', quantity: '5 bultos', destination: 'La Florida', organization: 'Red animalista', status: 'Entregado', date: '20 ago', evidence: [{ id: seedId(), image: '/hero-PLs-al-llamado.png', title: 'Apoyo para animales de compañía', description: 'La red animalista recibió alimento seco para incluirlo en sus recorridos comunitarios.' }] },
  { id: seedId(), resource: 'Pañales talla M', quantity: '18 paquetes', destination: 'Albergue temporal', organization: 'Equipo comunitario', status: 'En ruta', date: '21 ago', evidence: [{ id: seedId(), image: '/hero-PLs-al-llamado.png', title: 'Elementos de cuidado', description: 'Los paquetes fueron agrupados sin registrar datos de niñas, niños ni familias.' }] },
  { id: seedId(), resource: 'Colchonetas', quantity: '12 unidades', destination: 'Dosquebradas', organization: 'Red comunitaria', status: 'Pendiente', date: '21 ago', evidence: [{ id: seedId(), image: '/hero-PLs-al-llamado.png', title: 'Descanso para la jornada', description: 'Colchonetas limpias reservadas para el espacio comunitario de Dosquebradas.' }] },
  { id: seedId(), resource: 'Suero oral', quantity: '16 cajas', destination: 'Pereira rural', organization: 'Brigada de salud', status: 'Entregado', date: '22 ago', evidence: [{ id: seedId(), image: '/hero-PLs-al-llamado.png', title: 'Entrega a la brigada', description: 'La brigada recibió los sobres sellados para sus recorridos de salud comunitaria.' }] },
  { id: seedId(), resource: 'Linternas recargables', quantity: '8 unidades', destination: 'Zonas rurales', organization: 'Equipo de distribución', status: 'Pendiente', date: '22 ago', evidence: [{ id: seedId(), image: '/hero-PLs-al-llamado.png', title: 'Herramientas para recorrer', description: 'Las linternas fueron probadas antes de asignarlas a las rutas rurales.' }] },
  { id: seedId(), resource: 'Alimentos no perecederos', quantity: '60 cajas', destination: 'La Florida', organization: 'PLs al llamado · Ruta 04', status: 'En ruta', date: '23 ago', evidence: [{ id: seedId(), image: '/hero-PLs-al-llamado.png', title: 'Segunda salida de alimentos', description: 'Una nueva salida complementa la primera entrega registrada para La Florida.' }] },
  { id: seedId(), resource: 'Sábanas limpias', quantity: '20 juegos', destination: 'Albergue temporal', organization: 'Red comunitaria', status: 'Pendiente', date: '23 ago', evidence: [{ id: seedId(), image: '/hero-PLs-al-llamado.png', title: 'Juegos completos', description: 'Los juegos de sábanas fueron revisados y doblados para ocupar menos espacio en el traslado.' }] },
  { id: seedId(), resource: 'Guantes de trabajo', quantity: '16 pares', destination: 'Centro de acopio aliado', organization: 'Equipo de inventario', status: 'Entregado', date: '23 ago', evidence: [{ id: seedId(), image: '/hero-PLs-al-llamado.png', title: 'Apoyo a otro centro', description: 'Los guantes fueron enviados a un centro aliado para apoyar la clasificación.' }] },
]

export const seedCommunityNotices = [
  { id: seedId(), category: 'Mascota encontrada', title: 'Encontramos este animalito peludito', body: 'Perro criollo de tamaño mediano, tranquilo y con collar azul. Está bajo cuidado temporal mientras aparece su familia.', image: '/community-notice-animals.png', location: 'Pereira · sector centro', time: 'Hoy · 9:45 a.m.', contact: 'Equipo de comunicaciones' },
  { id: seedId(), category: 'Vivienda', title: 'Casa en arriendo en Pereira', body: 'Casa de barrio con dos habitaciones, acceso a transporte y disponibilidad para confirmar directamente con el contacto responsable.', image: '/community-notice-housing.png', location: 'Pereira · zona general', time: 'Hoy · 8:40 a.m.', contact: 'Referencia comunitaria' },
  { id: seedId(), category: 'Mascota encontrada', title: 'Encontramos una gatita atigrada', body: 'Gatita pequeña y tranquila encontrada cerca de una jornada comunitaria. Se busca confirmar quién la reconoce y puede hacerse cargo.', image: '/community-notice-animals.png', location: 'La Florida', time: 'Hoy · 10:20 a.m.', contact: 'Red animalista comunitaria' },
  { id: seedId(), category: 'Objeto perdido', title: 'Documentos encontrados', body: 'Se encontraron documentos personales durante la jornada de clasificación. La entrega se hace verificando la identidad.', image: '/community-notice-animals.png', location: 'Centro de acopio', time: 'Ayer · 2:30 p.m.', contact: 'Coordinación del centro' },
  { id: seedId(), category: 'Mascota encontrada', title: 'Encontramos este perrito de pelaje claro', body: 'Perrito pequeño, de pelaje claro y comportamiento tranquilo. Permanece acompañado mientras se ubica a su familia.', image: '/community-notice-animals.png', location: 'Cuba · Pereira', time: 'Ayer · 5:40 p.m.', contact: 'Vecinos del sector' },
  { id: seedId(), category: 'Información comunitaria', title: 'Punto de orientación abierto', body: 'El equipo puede orientar sobre rutas de ayuda, centros aliados y formas seguras de aportar.', image: '/community-notice-animals.png', location: 'Centro PLs al llamado', time: 'Ayer · 3:15 p.m.', contact: 'Coordinación del centro' },
  { id: seedId(), category: 'Mascota encontrada', title: 'Encontramos un gatito muy cariñoso', body: 'Gatito de tamaño pequeño, sociable y en buen estado general. Se reciben referencias para encontrar a su familia.', image: '/community-notice-animals.png', location: 'Dosquebradas', time: '17 ago · 11:45 a.m.', contact: 'Red animalista comunitaria' },
  { id: seedId(), category: 'Vivienda', title: 'Casa en arriendo con acceso a transporte', body: 'Vivienda disponible en un sector de barrio. Consulta condiciones, valor y disponibilidad directamente con el contacto responsable.', image: '/community-notice-housing.png', location: 'Pereira y alrededores', time: 'Ayer · 5:20 p.m.', contact: 'Equipo de orientación' },
  { id: seedId(), category: 'Mascota encontrada', title: 'Encontramos una perrita tranquila', body: 'Perrita de tamaño mediano encontrada durante un recorrido. Está acompañada y se busca confirmar su hogar.', image: '/community-notice-animals.png', location: 'Pereira · zona rural', time: '16 ago · 4:10 p.m.', contact: 'Red animalista comunitaria' },
  { id: seedId(), category: 'Apoyo comunitario', title: 'Hogares de paso para animales encontrados', body: 'La red animalista busca hogares temporales para los animales encontrados mientras se confirma su situación.', image: '/community-notice-animals.png', location: 'Pereira y Dosquebradas', time: '16 ago · 2:15 p.m.', contact: 'Red animalista comunitaria' },
]

export const seedServices = [
  { id: seedId(), type: 'gratuito', category: 'Orientación', title: 'Orientación para organizar donaciones', description: 'Acompañamiento para separar, rotular y entregar recursos de forma segura.', provider: 'Equipo PLs al llamado', location: 'Centro de acopio', price: 'Sin costo' },
  { id: seedId(), type: 'ofrecido', category: 'Transporte', title: 'Transporte solidario para recorridos cortos', description: 'Personas de la comunidad ofrecen vehículo y tiempo para mover ayudas dentro de Pereira.', provider: 'Red de conductores comunitarios', location: 'Pereira', price: 'A convenir' },
  { id: seedId(), type: 'necesitado', category: 'Veterinaria', title: 'Se necesita valoración veterinaria', description: 'Apoyo profesional para revisar animales encontrados o que acompañan los recorridos.', provider: 'Solicitud de la comunidad', location: 'Pereira y alrededores', price: 'Se necesita' },
  { id: seedId(), type: 'gratuito', category: 'Clasificación', title: 'Taller abierto de clasificación', description: 'Espacio práctico para aprender a separar alimentos, aseo, abrigo y elementos para mascotas.', provider: 'Voluntariado PLs', location: 'Centro de acopio', price: 'Sin costo' },
  { id: seedId(), type: 'ofrecido', category: 'Comunicación', title: 'Diseño de piezas para la comunidad', description: 'Apoyo para crear avisos claros sobre necesidades, rutas y comunicados.', provider: 'Diseñadora voluntaria', location: 'Remoto', price: 'A convenir' },
  { id: seedId(), type: 'necesitado', category: 'Almacenamiento', title: 'Se requiere espacio temporal', description: 'Lugar seco y seguro para guardar cajas plásticas y ayudas clasificadas.', provider: 'Centro de acopio', location: 'Pereira', price: 'Se necesita' },
  { id: seedId(), type: 'gratuito', category: 'Primeros auxilios', title: 'Orientación básica de primeros auxilios', description: 'Espacio comunitario para resolver dudas y revisar botiquines antes de una ruta.', provider: 'Brigada de salud aliada', location: 'Centro de acopio', price: 'Sin costo' },
  { id: seedId(), type: 'ofrecido', category: 'Reparaciones', title: 'Reparación de linternas y radios', description: 'Revisión básica de elementos útiles para las rutas en zonas rurales.', provider: 'Taller comunitario', location: 'Pereira', price: 'A convenir' },
  { id: seedId(), type: 'necesitado', category: 'Traducción', title: 'Se necesita apoyo para traducir avisos', description: 'Personas que puedan ayudar a adaptar comunicados para distintas comunidades.', provider: 'Equipo de comunicaciones', location: 'Remoto', price: 'Se necesita' },
  { id: seedId(), type: 'gratuito', category: 'Mascotas', title: 'Guía de cuidado para animales', description: 'Orientación para preparar alimento, agua y elementos de cuidado durante una emergencia.', provider: 'Red animalista comunitaria', location: 'Remoto', price: 'Sin costo' },
]

export const seedBulletins = [
  { id: seedId(), category: 'Avances', title: 'Primera semana de operación del centro', summary: 'La red comunitaria logró ordenar las primeras rutas y consolidar el inventario público.', body: 'Durante la primera semana se recibieron donaciones de alimentos, agua, aseo, abrigo y elementos para mascotas. El equipo organizó turnos para clasificar, registrar y preparar las entregas. Esta información se publica de forma general para cuidar los datos de las comunidades receptoras.', date: '17 ago', author: 'Coordinación PLs al llamado' },
  { id: seedId(), category: 'Registro', title: 'Cómo estamos midiendo las ayudas', summary: 'Cada entrada se clasifica por categoría, unidad y estado antes de publicarse.', body: 'El registro permite saber qué llegó, cuánto está disponible y qué ya fue distribuido. Las cantidades son aproximadas y se actualizan desde el centro. Para evitar confusiones, se conserva la unidad original y se anotan observaciones operativas cuando es necesario.', date: '16 ago', author: 'Equipo de inventario' },
  { id: seedId(), category: 'Transparencia', title: 'Qué información no publicamos', summary: 'La coordinación trabaja con zonas y organizaciones, sin exponer datos individuales.', body: 'No publicamos nombres de familias, menores, teléfonos, documentos ni ubicaciones sensibles. Los reportes de distribución muestran destinos generales y equipos responsables. Las solicitudes que llegan por los formularios quedan disponibles únicamente para el equipo autorizado.', date: '15 ago', author: 'Coordinación general' },
  { id: seedId(), category: 'Impacto', title: 'La red de apoyo se sigue ampliando', summary: 'Nuevos aliados se sumaron con transporte, clasificación y orientación veterinaria.', body: 'Además de las donaciones materiales, la comunidad ha ofrecido tiempo, conocimientos y servicios. El nuevo directorio permite ordenar esas capacidades para que las personas encuentren una forma concreta de ayudar o pedir apoyo.', date: '14 ago', author: 'Equipo de comunicaciones' },
  { id: seedId(), category: 'Operación', title: 'Así se prepara una salida', summary: 'Un recorrido pasa por recepción, clasificación, revisión y registro antes de salir.', body: 'Primero se verifica que los recursos estén limpios y en condiciones de uso. Después se agrupan por destino y se registra la salida general. Al finalizar, el equipo actualiza el estado para que la comunidad pueda consultar qué ayudas ya están en camino.', date: '13 ago', author: 'Equipo de distribución' },
  { id: seedId(), category: 'Comunidad', title: 'Cuidar también es coordinar', summary: 'La información clara evita viajes innecesarios y ayuda a que cada aporte llegue mejor.', body: 'Antes de acercarte, revisa las necesidades abiertas, el inventario disponible y los anuncios del centro. Si tienes un recurso que no aparece en la lista, puedes registrarlo para que el equipo revise cómo incorporarlo a la operación.', date: '12 ago', author: 'PLs al llamado' },
  { id: seedId(), category: 'Avances', title: 'Se habilita el directorio de servicios', summary: 'La comunidad puede encontrar apoyos gratuitos, ofrecidos o todavía necesarios.', body: 'Este espacio nace para reunir capacidades que no siempre aparecen en un inventario: transporte, reparaciones, orientación, traducción y cuidado animal. Los servicios publicados deben mantenerse claros, respetuosos y verificables por el equipo.', date: '11 ago', author: 'Equipo de comunicaciones' },
  { id: seedId(), category: 'Cierre semanal', title: 'Resumen de la jornada de clasificación', summary: 'El equipo revisó cajas, actualizó cantidades y dejó listas nuevas salidas.', body: 'La jornada permitió identificar recursos que ya están limitados y necesidades que requieren refuerzo. Gracias a quienes ayudaron a separar y rotular, el centro puede responder más rápido cuando llega una solicitud de apoyo.', date: '10 ago', author: 'Equipo de inventario' },
]

export const seedActivities = [
  { id: seedId(), title: 'Clasificación y rotulado', date: 'Hoy', time: '2:00 — 5:00 p.m.', location: 'Centro PLs al llamado', spots: '3 cupos' },
  { id: seedId(), title: 'Carga de ruta La Florida', date: 'Mañana', time: '7:30 — 9:00 a.m.', location: 'Centro PLs al llamado', spots: '2 cupos' },
  { id: seedId(), title: 'Recepción y pesaje', date: '20 ago', time: '8:00 — 11:00 a.m.', location: 'Centro PLs al llamado', spots: '4 cupos' },
  { id: seedId(), title: 'Organización de kits de aseo', date: '20 ago', time: '1:00 — 4:00 p.m.', location: 'Centro PLs al llamado', spots: '5 cupos' },
  { id: seedId(), title: 'Apoyo para ruta rural', date: '21 ago', time: '7:00 — 10:00 a.m.', location: 'Centro PLs al llamado', spots: '2 cupos' },
  { id: seedId(), title: 'Inventario de herramientas', date: '21 ago', time: '2:00 — 4:00 p.m.', location: 'Centro PLs al llamado', spots: '3 cupos' },
  { id: seedId(), title: 'Clasificación de ropa y cobijas', date: '22 ago', time: '9:00 a.m. — 12:00 m.', location: 'Centro PLs al llamado', spots: '6 cupos' },
  { id: seedId(), title: 'Preparación de ayudas para mascotas', date: '22 ago', time: '2:00 — 5:00 p.m.', location: 'Centro PLs al llamado', spots: '4 cupos' },
  { id: seedId(), title: 'Carga de ruta Dosquebradas', date: '23 ago', time: '7:30 — 9:30 a.m.', location: 'Centro PLs al llamado', spots: '2 cupos' },
  { id: seedId(), title: 'Cierre semanal de inventario', date: '23 ago', time: '3:00 — 5:00 p.m.', location: 'Centro PLs al llamado', spots: '3 cupos' },
]

export const seedSupportRequests = [
  { id: seedId(), helpType: 'ofrecer-ayuda', requestType: 'oferta', category: 'Alimentos', zone: 'Pereira · sector centro', quantity: 25, quantityUnit: 'cajas', description: 'Tenemos cajas de alimentos no perecederos, cerradas y con fechas vigentes. Podemos entregarlas en el centro durante la jornada de la tarde.', contactName: 'Mariana Gómez', phone: '3005550182', status: 'en-revision', internalNotes: 'Confirmar recepción y revisar fechas antes de incorporarlas al inventario.', privacyAccepted: true },
  { id: seedId(), helpType: 'necesitar-ayuda', requestType: 'recursos', category: 'Agua', zone: 'La Florida', quantity: 30, quantityUnit: 'canecas', description: 'El equipo comunitario solicita agua sellada para complementar la próxima ruta de entrega en la zona.', contactName: 'Junta comunitaria La Florida', phone: '3115550101', status: 'asignada', internalNotes: 'Revisar disponibilidad de agua y asociar a la salida programada para el viernes.', privacyAccepted: true },
  { id: seedId(), helpType: 'ofrecer-ayuda', requestType: 'transporte', category: 'Transporte', zone: 'Pereira y Dosquebradas', quantity: 2, quantityUnit: 'turnos', description: 'Cuento con camioneta y puedo apoyar recorridos cortos de carga entre el centro y los puntos de entrega generales.', contactName: 'Andrés Ríos', phone: '3125550122', status: 'pendiente', internalNotes: '', privacyAccepted: true },
  { id: seedId(), helpType: 'ofrecer-ayuda', requestType: 'voluntariado', category: 'Clasificación', zone: 'Centro de acopio', quantity: 1, quantityUnit: 'turnos', description: 'Puedo apoyar durante la tarde en conteo, rotulado y organización de cajas. Tengo experiencia en bodega.', contactName: 'Laura Salazar', phone: '3015550144', status: 'atendida', internalNotes: 'Participó en la jornada del martes. Agradecimiento enviado.', privacyAccepted: true },
  { id: seedId(), helpType: 'necesitar-ayuda', requestType: 'recursos', category: 'Mascotas', zone: 'Dosquebradas', quantity: 8, quantityUnit: 'bultos', description: 'La red animalista solicita alimento seco para perros y gatos que están siendo acompañados en hogares temporales.', contactName: 'Red Animalista Comunitaria', phone: '3135550155', status: 'en-revision', internalNotes: 'Comparar con inventario de mascotas y consultar posible alianza con comercio local.', privacyAccepted: true },
  { id: seedId(), helpType: 'ofrecer-ayuda', requestType: 'oferta', category: 'Abrigo', zone: 'Pereira · zona general', quantity: 40, quantityUnit: 'unidades', description: 'Tenemos cobijas limpias y empacadas. Podemos llevarlas al centro el sábado en la mañana.', contactName: 'Comunidad Edificio Mirador', phone: '3025550171', status: 'cerrada', internalNotes: 'Ayuda recibida y registrada en inventario como cobijas limpias.', privacyAccepted: true },
  { id: seedId(), helpType: 'necesitar-ayuda', requestType: 'transporte', category: 'Transporte', zone: 'Vereda La Suiza', quantity: 1, quantityUnit: 'recorridos', description: 'Se requiere apoyo para transportar kits de aseo desde el centro hasta un punto comunitario de la vereda.', contactName: 'Equipo comunitario La Suiza', phone: '3145550166', status: 'pendiente', internalNotes: '', privacyAccepted: true },
  { id: seedId(), helpType: 'ofrecer-ayuda', requestType: 'voluntariado', category: 'Primeros auxilios', zone: 'Centro de acopio', quantity: 2, quantityUnit: 'horas', description: 'Profesional de enfermería ofrece orientación para revisar botiquines y acompañar una jornada de preparación.', contactName: 'Camilo Torres', phone: '3155550199', status: 'asignada', internalNotes: 'Coordinar con la brigada de salud para el próximo sábado.', privacyAccepted: true },
]


const categoryValues: Record<string, string> = {
  Alimentos: 'alimentos',
  Agua: 'agua',
  Aseo: 'aseo',
  Salud: 'salud',
  Abrigo: 'abrigo',
  Bebés: 'bebes',
  Herramientas: 'herramientas',
  Mascotas: 'mascotas',
  Cocina: 'cocina',
  'Higiene personal': 'higiene',
  Transporte: 'transporte',
  Alojamiento: 'alojamiento',
  'Energía e iluminación': 'energia',
  'Materiales de construcción': 'construccion',
  Otros: 'otros',
}

const priorityValues: Record<string, string> = { Crítica: 'critica', Alta: 'alta', Media: 'media' }
const distributionStatusValues: Record<string, string> = { Entregado: 'entregado', 'En ruta': 'en-ruta', Pendiente: 'pendiente' }
const aidSourceValues: Record<string, string> = {
  'Donación comunitaria': 'donacion',
  'Alianza u organización': 'alianza',
  'Compra del equipo': 'compra',
  Préstamo: 'prestamo',
  Otro: 'otro',
}
const aidStatusValues: Record<string, string> = {
  Recibida: 'recibida',
  'En clasificación': 'en-clasificacion',
  'Incorporada al inventario': 'incorporada',
  'No apta': 'no-apta',
}
const announcementTypeValues: Record<string, string> = {
  horario: 'horario',
  necesidad: 'necesidad',
  distribución: 'distribucion',
  distribucion: 'distribucion',
  voluntariado: 'voluntariado',
  información: 'oficial',
  informacion: 'oficial',
  inventario: 'oficial',
  actividad: 'voluntariado',
  agradecimiento: 'impacto',
  actualización: 'oficial',
  actualizacion: 'oficial',
}

const numberFromLabel = (value: string) => Number.parseInt(value, 10) || 0
const unitFromLabel = (value: string) => value.replace(/^\d+\s*/, '') || 'unidades'
const slugify = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replaceAll(' ', '-')

const resources = seedResources.map((resource, index) => ({
  id: resource.id,
  name: resource.name,
  category: categoryValues[resource.category] || 'otros',
  quantity: Number(resource.quantity),
  unit: resource.unit,
  status: resource.status,
  publicVisible: true,
  featured: index < 6,
  notes: resource.detail,
}))

const aidIntakes = seedAidIntakes.map((intake, index) => ({
  id: intake.id,
  resourceName: intake.resource,
  category: categoryValues[intake.category] || 'otros',
  quantity: numberFromLabel(intake.quantity),
  unit: unitFromLabel(intake.quantity),
  sourceType: aidSourceValues[intake.sourceType] || 'otro',
  sourceReference: intake.sourceReference,
  receivedAt: new Date(Date.now() - index * 18 * 60 * 60 * 1000).toISOString(),
  status: aidStatusValues[intake.status] || 'recibida',
  publicVisible: intake.publicVisible,
  featured: index < 2,
  notes: intake.notes,
}))

const needs = seedNeeds.map((need, index) => ({
  id: need.id,
  title: need.title,
  detail: need.detail,
  category: categoryValues[need.category] || 'otros',
  quantity: numberFromLabel(need.quantity),
  unit: unitFromLabel(need.quantity),
  priority: priorityValues[need.priority] || 'media',
  status: 'abierta',
  zone: need.zone,
  publicVisible: true,
  featured: index < 4,
  publishedAt: new Date(Date.now() - index * 3 * 60 * 60 * 1000).toISOString(),
}))

const announcements = seedAnnouncements.map((announcement, index) => ({
  id: announcement.id,
  title: announcement.title,
  body: announcement.body,
  type: announcementTypeValues[announcement.type.toLowerCase()] || 'oficial',
  status: 'publicado',
  publicVisible: true,
  featured: index < 3,
  publishedAt: new Date(Date.now() - index * 60 * 60 * 1000).toISOString(),
  expiresAt: new Date(Date.now() + (index < 5 ? 7 : 3) * 24 * 60 * 60 * 1000).toISOString(),
}))

const distributions = seedDistributions.map((distribution, index) => ({
  id: distribution.id,
  resourceName: distribution.resource,
  quantity: numberFromLabel(distribution.quantity),
  unit: unitFromLabel(distribution.quantity),
  date: new Date(Date.now() + index * 24 * 60 * 60 * 1000).toISOString(),
  destination: distribution.destination,
  organization: distribution.organization,
  status: distributionStatusValues[distribution.status] || 'pendiente',
  publicVisible: true,
  notes: `Registro operativo inicial para la ruta ${distribution.date}.`,
}))

const activities = seedActivities.map((activity, index) => {
  const [startTime, endTime] = activity.time.split(' — ')
  const capacity = numberFromLabel(activity.spots)
  return {
    id: activity.id,
    title: activity.title,
    description: `Actividad abierta de apoyo para el centro de acopio. ${activity.location}.`,
    date: new Date(Date.now() + Math.max(0, index - 1) * 24 * 60 * 60 * 1000).toISOString(),
    startTime: startTime || 'Hora por confirmar',
    endTime: endTime || 'Hora de cierre',
    location: activity.location,
    capacity: Math.max(capacity, 1),
    registered: 0,
    status: 'abierta',
    publicVisible: true,
    lead: 'Coordinación de actividades',
  }
})

const communityNotices = seedCommunityNotices.map((notice, index) => ({
  id: notice.id,
  title: notice.title,
  body: notice.body,
  category: slugify(notice.category),
  imagePath: notice.image,
  location: notice.location,
  contact: notice.contact,
  status: 'publicado',
  publicVisible: true,
  featured: index < 2,
  publishedAt: new Date(Date.now() - index * 60 * 60 * 1000).toISOString(),
}))

const services = seedServices.map((service, index) => ({
  id: service.id,
  title: service.title,
  description: service.description,
  type: service.type,
  category: service.category,
  provider: service.provider,
  location: service.location,
  price: service.price,
  status: 'publicado',
  publicVisible: true,
  featured: index < 3,
  publishedAt: new Date(Date.now() - index * 60 * 60 * 1000).toISOString(),
}))

const bulletins = seedBulletins.map((bulletin, index) => ({
  id: bulletin.id,
  title: bulletin.title,
  summary: bulletin.summary,
  body: bulletin.body,
  category: bulletin.category,
  author: bulletin.author,
  status: 'publicado',
  publicVisible: true,
  featured: index < 2,
  publishedAt: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
}))

const seedAdminEmail = 'admin@plsalllamado.local'
const seedAdminPassword = 'PLsAdmin2026!'
const seedSuperAdminEmail = 'superadmin@plsalllamado.local'
const seedSuperAdminPassword = 'PLsSuper2026!'
const seedPortalPassword = 'PLsEquipo2026!'
const seedAuditActor = 'Carga inicial del sistema'
const seedContext = { seed: true }
const legacySeedActors = new Set(['Seeder inicial PLs al llamado', 'Administrador de prueba', 'Carga inicial del sistema'])
const auditActor = (value: unknown) => typeof value === 'string' && value.trim() ? value : seedAuditActor
const auditUserId = (value: unknown) => typeof value === 'string' && value.trim() ? value : null

const portalSeedUsers: Array<{ email: string; name: string; role: StaffRole }> = [
  { email: 'administracion@plsalllamado.local', name: 'Equipo de administración', role: 'administracion' },
  { email: 'que-tenemos@plsalllamado.local', name: 'Equipo que tenemos', role: 'que-tenemos' },
  { email: 'que-necesitamos@plsalllamado.local', name: 'Equipo que necesitamos', role: 'que-necesitamos' },
  { email: 'anuncios@plsalllamado.local', name: 'Equipo de anuncios', role: 'anuncios' },
  { email: 'boletin@plsalllamado.local', name: 'Equipo de boletín', role: 'boletin' },
  { email: 'servicios@plsalllamado.local', name: 'Equipo de servicios', role: 'servicios' },
  { email: 'inventario@plsalllamado.local', name: 'Equipo de inventario', role: 'inventario' },
  { email: 'distribucion@plsalllamado.local', name: 'Equipo de distribución', role: 'distribucion' },
  { email: 'comunicados@plsalllamado.local', name: 'Equipo de comunicados', role: 'comunicados' },
]

async function seed() {
  const payload = await getPayload({ config })
  type SeedCollection = 'resources' | 'aid-intakes' | 'needs' | 'announcements' | 'distributions' | 'distribution-evidence' | 'volunteer-activities' | 'community-notices' | 'services' | 'bulletins' | 'support-requests'

  const ensure = async (collection: SeedCollection, lookupFields: string[], data: Record<string, unknown>) => {
    const { id: seedRecordId, ...recordData } = data
    const where = { and: lookupFields.map((field) => ({ [field]: { equals: recordData[field] } })) }
    const existing = await payload.find({ collection, where, limit: 1, overrideAccess: true })
    if (existing.docs.length) {
      const previous = existing.docs[0] as unknown as Record<string, unknown>
      const previousWasSeeded = legacySeedActors.has(String(previous.registeredBy || ''))
      const auditedData = {
        ...recordData,
        registeredBy: previousWasSeeded ? seedAuditActor : auditActor(previous.registeredBy),
        registeredByUserId: previousWasSeeded ? null : auditUserId(previous.registeredByUserId),
        updatedBy: previousWasSeeded ? seedAuditActor : auditActor(previous.updatedBy),
        updatedByUserId: previousWasSeeded ? null : auditUserId(previous.updatedByUserId),
      }
      await payload.update({ collection, id: existing.docs[0].id, data: auditedData as never, context: seedContext, overrideAccess: true })
      return existing.docs[0].id
    }
    const created = await payload.create({
      collection,
      data: {
        ...(seedRecordId ? { id: seedRecordId } : {}),
        ...recordData,
        registeredBy: seedAuditActor,
        registeredByUserId: null,
        updatedBy: seedAuditActor,
        updatedByUserId: null,
      } as never,
      context: seedContext,
      overrideAccess: true,
    })
    return created.id
  }

  for (const resource of resources) await ensure('resources', ['name'], resource)
  for (const intake of aidIntakes) await ensure('aid-intakes', ['resourceName', 'sourceReference'], intake)
  for (const need of needs) await ensure('needs', ['title'], need)
  for (const announcement of announcements) await ensure('announcements', ['title'], announcement)
  for (const activity of activities) await ensure('volunteer-activities', ['title'], activity)
  for (const service of services) await ensure('services', ['title'], service)
  for (const bulletin of bulletins) await ensure('bulletins', ['title'], bulletin)
  for (const request of seedSupportRequests) await ensure('support-requests', ['contactName'], request)

  for (const [index, distribution] of distributions.entries()) {
    const distributionId = await ensure('distributions', ['resourceName', 'destination', 'quantity'], distribution)
    const source = seedDistributions[index]
    for (const item of source.evidence) {
      await ensure('distribution-evidence', ['title', 'distribution'], {
        id: item.id,
        sourceType: 'distribucion',
        distribution: distributionId,
        publicImagePath: item.image,
        title: item.title,
        description: item.description,
        status: 'publicado',
        publicVisible: true,
        publishedAt: new Date().toISOString(),
      })
    }
  }

  for (const notice of communityNotices) {
    const { imagePath, ...noticeData } = notice
    await ensure('community-notices', ['title'], { ...noticeData, publicImagePath: imagePath })
  }

  await payload.updateGlobal({
    slug: 'site-settings',
    overrideAccess: true,
    data: {
      centerName: 'Centro de acopio PLs al llamado',
      address: 'Pereira, Risaralda · Dirección por confirmar',
      hours: 'Lun — Sáb · 8:00 a.m. — 6:00 p.m.',
      centerStatus: 'abierto',
      donationInstructions: 'Trae los recursos limpios, separados y marcados por categoría. Antes de salir, revisa la lista de necesidades urgentes.',
      heroMessage: 'Estamos coordinando la recepción, organización y distribución de ayudas para las comunidades afectadas.',
      phone: '300 000 0000',
      lastOperationalUpdate: new Date().toISOString(),
    },
  })

  const seedUsers: Array<{ email: string; password: string; name: string; role: StaffRole }> = [
    { email: seedAdminEmail, password: seedAdminPassword, name: 'Administrador de prueba', role: 'admin' },
    { email: seedSuperAdminEmail, password: seedSuperAdminPassword, name: 'Super administrador de prueba', role: 'super-admin' },
    ...portalSeedUsers.map((user) => ({ ...user, password: seedPortalPassword })),
  ]
  for (const user of seedUsers) {
    const existingUser = await payload.find({ collection: 'users', where: { email: { equals: user.email } }, limit: 1, overrideAccess: true })
    const previous = existingUser.docs[0] as unknown as Record<string, unknown> | undefined
    const previousWasSeeded = legacySeedActors.has(String(previous?.registeredBy || ''))
    const { id: seedUserId, ...userData } = { ...user, id: seedId(), phone: '300 000 0000', active: true, registeredBy: previousWasSeeded ? seedAuditActor : auditActor(previous?.registeredBy), registeredByUserId: previousWasSeeded ? null : auditUserId(previous?.registeredByUserId), updatedBy: previousWasSeeded ? seedAuditActor : auditActor(previous?.updatedBy), updatedByUserId: previousWasSeeded ? null : auditUserId(previous?.updatedByUserId) }
    if (existingUser.docs.length) {
      await payload.update({ collection: 'users', id: existingUser.docs[0].id, data: userData, overrideAccess: true })
    } else {
      await payload.create({ collection: 'users', data: { id: seedUserId, ...userData }, overrideAccess: true })
    }
  }

  console.log(`PLs al llamado: ${resources.length} recursos, ${aidIntakes.length} ayudas recibidas, ${needs.length} necesidades, ${announcements.length} anuncios, ${distributions.length} distribuciones, ${communityNotices.length} comunicados, ${services.length} servicios, ${bulletins.length} boletines y ${seedSupportRequests.length} solicitudes listas.`)
  console.log(`Usuarios de Payload listos para /admin: ${seedAdminEmail}, ${seedSuperAdminEmail}`)
  console.log(`Usuarios operativos listos para /equipo/login: ${portalSeedUsers.length}`)
  process.exit(0)
}

const main = async () => {
  if (await hasMigrationTable()) {
    await run(migrationCommand, ['payload:migrate', '--force-accept-warning'])
  }

  await seed()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
