# PLs al llamado

Plataforma web para coordinar la red de apoyo y el centro de acopio de **PLs al llamado** en Pereira.

La aplicación centraliza en un solo lugar:

- Qué recursos tiene el centro.
- Qué recursos y servicios hacen falta.
- Qué ayudas están en camino o ya fueron entregadas.
- Qué actividades puede apoyar la comunidad.
- Qué comunicados, servicios y boletines están publicados.
- Qué solicitudes llegan desde los formularios públicos.
- Qué información puede administrar cada persona del equipo.

La interfaz pública y el portal operativo están separados. El panel original de Payload también permanece separado y solo está disponible para sus roles técnicos.

> El proyecto utiliza pnpm exclusivamente. La versión requerida está declarada en `package.json` y el proyecto rechaza instalaciones iniciadas con otro gestor de paquetes.

## Índice

- [Arquitectura](#arquitectura)
- [Puesta en marcha](#puesta-en-marcha)
- [Variables de entorno](#variables-de-entorno)
- [Sitio público](#sitio-público)
- [Portal operativo del equipo](#portal-operativo-del-equipo)
- [Roles y permisos](#roles-y-permisos)
- [Colecciones y datos](#colecciones-y-datos)
- [Flujos principales](#flujos-principales)
- [Actualización automática](#actualización-automática)
- [API](#api)
- [Imágenes y Cloudflare R2](#imágenes-y-cloudflare-r2)
- [Seeder de demostración](#seeder-de-demostración)
- [UUID y migraciones](#uuid-y-migraciones)
- [Seguridad y privacidad](#seguridad-y-privacidad)
- [Comandos de desarrollo](#comandos-de-desarrollo)
- [Producción](#producción)
- [Solución de problemas](#solución-de-problemas)

## Arquitectura

La aplicación está construida con:

| Capa | Tecnología |
|---|---|
| Frontend y servidor | Next.js 15 con App Router |
| Lenguaje | TypeScript |
| CMS y API técnica | Payload CMS |
| Base de datos | PostgreSQL mediante `@payloadcms/db-postgres` |
| Identificadores | UUID |
| Imágenes | Sharp + Cloudflare R2 mediante API S3 compatible |
| Autenticación | Payload Auth con cookies HttpOnly, sesiones persistidas y renovación segura |
| Gestor de paquetes | pnpm 9.15.4 |
| Contenedores locales | Docker Compose para PostgreSQL |

### Organización principal del código

| Carpeta o archivo | Responsabilidad |
|---|---|
| `app/(site)` | Páginas públicas y portal operativo |
| `app/(payload)` | Panel y API original de Payload |
| `app/api/public` | Endpoints públicos |
| `app/api/equipo` | Login, CRUD y medios del portal operativo |
| `app/components` | Componentes reutilizables del sitio público |
| `collections` | Colecciones y global de Payload |
| `lib/public-api.ts` | Lectura, normalización y presentación de datos públicos |
| `lib/staff-portal-config.ts` | Módulos, campos y roles del portal operativo |
| `lib/staff-portal-auth.ts` | Sesión, permisos y pertenencia de registros |
| `lib/staff-portal-validation.ts` | Validaciones del portal operativo |
| `lib/audit-fields.ts` | Auditoría automática de creación y actualización |
| `lib/input-security.ts` | Límites, origen, rate limiting y lectura segura de solicitudes |
| `lib/image-processing.ts` | Rotación, redimensión y conversión de imágenes a WebP |
| `lib/r2-storage.ts` | Firmado de operaciones GET, PUT y DELETE contra R2 |
| `scripts/seed-with-migrations.ts` | Migraciones, UUID v4 únicos por ejecución y carga idempotente de datos y usuarios de prueba |
| `payload.config.ts` | Configuración de Payload, PostgreSQL, UUID y colecciones |

## Puesta en marcha

### Requisitos

- Node.js 20.9 o superior.
- pnpm 9.15.4 o superior.
- PostgreSQL 16 o compatible.
- Docker y Docker Compose, solo si quieres levantar PostgreSQL localmente.
- Credenciales de Cloudflare R2 para cargar imágenes desde el portal operativo.

### Instalación

Desde la raíz del proyecto:

```bash
pnpm install
```

El script `preinstall` bloquea instalaciones iniciadas con npm, yarn o bun.

Copia las variables de ejemplo:

```bash
cp .env.example .env
```

Completa al menos:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pls_al_llamado
PAYLOAD_SECRET=escribe-un-secreto-largo-de-al-menos-32-caracteres
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
```

### PostgreSQL con Docker

El proyecto incluye [docker-compose.yml](./docker-compose.yml):

```bash
docker compose up -d
```

Ese servicio crea:

- Base: `pls_al_llamado`
- Usuario: `postgres`
- Contraseña local: `postgres`
- Puerto: `5432`

Si usas otra instancia de PostgreSQL, cambia `DATABASE_URL` en `.env`.

### Desarrollo

```bash
pnpm dev
```

Direcciones locales:

| Servicio | URL |
|---|---|
| Sitio público | http://localhost:3000 |
| Panel Payload | http://localhost:3000/admin |
| Portal del equipo | http://localhost:3000/equipo/login |
| Estado del servicio | http://localhost:3000/api/health |

En desarrollo, Payload usa `push` automático para sincronizar el esquema cuando inicia. En producción este comportamiento queda desactivado y se deben usar migraciones versionadas.

## Variables de entorno

El archivo [.env.example](./.env.example) contiene la plantilla completa.

### Variables generales

| Variable | Obligatoria | Uso |
|---|---:|---|
| `DATABASE_URL` | Sí | Conexión a PostgreSQL |
| `PAYLOAD_SECRET` | Sí en producción | Firma de sesiones y secretos internos |
| `NEXT_PUBLIC_SERVER_URL` | Sí | URL permitida para CORS, CSRF y enlaces públicos |

En producción, `PAYLOAD_SECRET` debe tener al menos 32 caracteres.

### Usuarios creados por el seeder

Las credenciales de prueba están definidas directamente en
`scripts/seed-with-migrations.ts`. El seeder no lee correos ni contraseñas desde
`.env`.

| Usuario | Valor definido en el seed | Uso |
|---|---|---|
| Administrador Payload | `admin@plsalllamado.local` / `PLsAdmin2026!` | Acceso técnico a Payload |
| Superadministrador Payload | `superadmin@plsalllamado.local` / `PLsSuper2026!` | Acceso total a Payload |
| Equipo operativo | `PLsEquipo2026!` | Contraseña de los roles del portal `/equipo` |

Las contraseñas predeterminadas son solo para desarrollo. Deben cambiarse antes de utilizar el proyecto fuera de pruebas.

### Cloudflare R2

| Variable | Uso |
|---|---|
| `R2_ENABLED` | Debe ser `true` para cargar imágenes desde el portal |
| `R2_ACCOUNT_ID` | Identificador de cuenta Cloudflare |
| `R2_BUCKET` | Nombre exacto del bucket |
| `R2_ENDPOINT` | Endpoint S3 de la cuenta, sin necesidad de URL pública |
| `R2_REGION` | Normalmente `auto` |
| `R2_ACCESS_KEY_ID` | Access key de la API S3 |
| `R2_SECRET_ACCESS_KEY` | Secret key de la API S3 |
| `R2_PREFIX` | Prefijo de objetos, normalmente `media` |

Ejemplo:

```env
R2_ENABLED=true
R2_ACCOUNT_ID=TU_ACCOUNT_ID
R2_BUCKET=pls-al-llamado-media
R2_ENDPOINT=https://TU_ACCOUNT_ID.r2.cloudflarestorage.com
R2_REGION=auto
R2_ACCESS_KEY_ID=TU_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY=TU_SECRET_ACCESS_KEY
R2_PREFIX=media
```

Las credenciales de R2 solo se leen en el servidor. No se deben colocar en componentes cliente ni en variables `NEXT_PUBLIC_*`.

## Sitio público

Todas las páginas públicas leen información de Payload mediante [lib/public-api.ts](./lib/public-api.ts). Si la base no está disponible, se conserva la estructura visual y se muestran estados vacíos o información de disponibilidad.

### Página inicial: `/`

La portada está enfocada en responder rápidamente:

1. Qué tiene el centro.
2. Qué necesita.
3. Cómo ayudar.
4. Cómo solicitar apoyo.
5. Qué anuncios están vigentes.

Incluye:

- Bloque principal **Nuestro centro de acopio PLs al llamado — Pereira**.
- Dirección, horarios, estado y última actualización.
- Botón **Quiero ayudar**, que lleva al formulario de ayuda.
- Botón **Solicitar apoyo**, que lleva al formulario correspondiente.
- Necesidades del día ubicadas arriba, antes de bloques secundarios.
- Botón **Lo tengo** en cada necesidad para ofrecer una cantidad concreta.
- Métricas de recibido, disponible y distribuido.
- Anuncios destacados del centro.
- Scroll interno cuando una lista supera el límite visual.
- Actualización automática de datos sin recargar manualmente.

### `/recursos`: Qué tenemos hoy

Muestra dos bloques:

- **Recursos disponibles**: nombre, categoría, cantidad, presentación o medida, estado, detalle y destacado.
- **Ayudas recibidas**: aportes que ya llegaron al centro, con origen, cantidad, estado y fecha.

Incluye:

- Búsqueda por nombre, categoría o detalle.
- Filtros por categoría.
- En dispositivos móviles, los filtros se abren en un modal.
- Estado disponible, limitado o agotado.
- Indicador de información aproximada.
- Scroll interno cuando hay muchos recursos o recepciones.

### `/necesidades`: Qué necesitamos

Cada tarjeta puede mostrar:

- Prioridad crítica, alta o media.
- Categoría.
- Nombre de la necesidad.
- Detalle público.
- Cantidad aproximada.
- Zona o destino general.
- Estado destacado.
- Botón **Lo tengo**.

El modal **Lo tengo** valida:

- Nombre de contacto.
- Cantidad mínima de 1.
- No permite cantidades negativas.
- Número de teléfono válido.
- Aceptación del aviso de privacidad.
- Mensaje opcional.
- Botón de envío deshabilitado hasta completar lo necesario.

### `/distribucion`: Seguimiento

Muestra:

- Resumen de rutas.
- Conteo de entregadas, en ruta y pendientes.
- Recurso, cantidad, presentación, destino general y equipo responsable.
- Lista con scroll interno.
- Carrusel de evidencias.
- Evidencias relacionadas con una distribución o con otro registro operativo.
- Imágenes y descripciones sin nombres de familias, menores ni ubicaciones sensibles.

### `/ayudar`: Quiero ayudar

Contiene un único formulario para:

- Ofrecer recursos.
- Ofrecer transporte.
- Ofrecer tiempo o conocimientos.

El formulario solicita:

- Tipo de ayuda.
- Nombre de contacto.
- Qué se puede aportar.
- Zona.
- Cantidad aproximada como número entero positivo.
- Unidad de la cantidad, cuando se informa una cantidad.
- Detalle.
- Número de teléfono.
- Aceptación de privacidad.

También muestra **Próximas actividades**, donde aparecen jornadas de clasificación, carga, recepción, inventario y preparación de ayudas.

### `/solicitar-apoyo`: Solicitar apoyo

Permite registrar solicitudes generales de:

- Recursos.
- Transporte.

Solicita zona, categoría, cantidad aproximada como número entero, unidad, detalle, nombre y número de teléfono. La cantidad y su unidad son opcionales, pero deben llegar juntas. No se deben registrar nombres de familias, datos de niños, documentos ni ubicaciones sensibles.

### `/comunicados`

Publica información comunitaria moderada:

- Mascotas encontradas.
- Vivienda.
- Objetos encontrados.
- Apoyo comunitario.
- Información general.

Cada tarjeta puede incluir:

- Imagen.
- Categoría.
- Título.
- Descripción.
- Zona general.
- Canal o responsable.
- Fecha.
- Estado destacado.
- Botón **Compartir**.

La página pagina los comunicados de seis en seis y utiliza `navigator.share` cuando el dispositivo lo permite; si no, copia el enlace al portapapeles.

### `/servicios`

Directorio de capacidades de la comunidad:

- Servicios gratuitos.
- Servicios ofrecidos por la comunidad.
- Servicios que todavía se necesitan.

Incluye búsqueda por texto y filtro por categoría. Cada tarjeta muestra proveedor, zona o modalidad, costo o condición y un botón que lleva al formulario correspondiente.

### `/boletin`

Publica avances, registros y aprendizajes de la operación.

Cada boletín es una tarjeta expandible con:

- Categoría.
- Fecha.
- Título.
- Resumen.
- Contenido completo.
- Equipo responsable.

Cuando hay muchos boletines, el contenedor utiliza scroll interno.

### Navegación y pie de página

El sitio público tiene navegación separada por páginas. El ingreso del equipo no aparece como un bloque operativo dentro del contenido principal; queda disponible desde el footer.

El footer mantiene:

- Logo.
- Identidad de PLs al llamado.
- Enlaces públicos.
- Acceso al portal operativo.
- Información de privacidad y coordinación.

## Portal operativo del equipo

Entrada: `/equipo/login`.

Es una interfaz independiente del administrador original de Payload. Tiene:

- Login con credenciales de usuarios operativos.
- Dashboard con indicadores y gráficas.
- Navbar lateral fijo y colapsable.
- Estado activo del módulo seleccionado.
- Scroll automático hasta el módulo activo.
- Contador de solicitudes pendientes junto al módulo Solicitudes.
- Aviso temporal cuando llega una nueva solicitud: rojo si es para necesitar ayuda y verde si es una oferta de ayuda.
- Formularios de creación y edición.
- Modal responsive para editar.
- Paginación de registros.
- Acciones de editar y eliminar.
- Estado y visibilidad visibles en cada registro.
- Auditoría de quién registró y quién actualizó.
- Mensajes de error en español.
- Sesión operativa válida hasta 8 horas de inactividad.
- Renovación automática cada 45 minutos mientras el portal está activo.
- Revocación de la sesión en servidor al cerrar sesión.
- Tokens ausentes de las respuestas JSON y almacenados únicamente en cookies HttpOnly.

### Dashboard: `/equipo`

El dashboard presenta:

- Registros creados por el usuario actual como indicador de trabajo propio.
- Registros visibles o publicados.
- Gráfica de registros por módulo.
- Lectura rápida de visibilidad.
- Tarjetas de acceso a los módulos disponibles.
- Solicitudes compartidas para todo el equipo.
- Conteos calculados con los registros realmente devueltos por Payload.

El rol de administración puede consultar todos los módulos. Cada rol operativo puede consultar todos los registros de los módulos que tiene asignados, además de Solicitudes y Evidencias. El indicador de trabajo propio conserva el filtro por `registeredByUserId`, mientras que las tarjetas de módulos muestran el total compartido para ayudar a detectar duplicados.

### Módulos operativos

| Ruta | Módulo | Colección | Funcionalidad |
|---|---|---|---|
| `/equipo/tenemos` | Qué tenemos | `aid-intakes` | Registra ayudas recibidas, origen, cantidad, clasificación y visibilidad |
| `/equipo/necesitamos` | Qué necesitamos | `needs` | Publica necesidades, categorías, prioridades, cantidades y zonas |
| `/equipo/anuncios` | Anuncios del centro | `announcements` | Publica horarios, necesidades, rutas, información oficial e impacto |
| `/equipo/boletin` | Boletín informativo | `bulletins` | Redacta resúmenes, contenido completo, categorías y estado |
| `/equipo/servicios` | Servicios | `services` | Registra servicios gratuitos, ofrecidos o necesarios |
| `/equipo/inventario` | Inventario | `resources` | Actualiza recursos disponibles, cantidad, unidad y estado |
| `/equipo/distribucion` | Distribución | `distributions` | Registra salidas, destinos, equipos responsables y estado |
| `/equipo/evidencias` | Evidencias | `distribution-evidence` | Sube imágenes y descripciones de distribuciones u otros registros |
| `/equipo/comunicados` | Comunicados | `community-notices` | Publica comunicados con imágenes y categorías |
| `/equipo/administracion` | Solicitudes | `support-requests` | Revisa, actualiza y elimina solicitudes públicas |

### Reglas de formularios del portal

- Los campos obligatorios se validan en frontend y backend.
- El botón de crear permanece deshabilitado hasta completar el formulario.
- El botón de guardar cambios se habilita únicamente si realmente se modificó un campo.
- Las cantidades numéricas respetan mínimos definidos por cada colección.
- Las fechas tienen valor predeterminado y se muestran con formato local.
- Los selectores muestran un placeholder no seleccionable.
- Las evidencias exigen distribución cuando el origen es “Salida de distribución”.
- Las evidencias exigen una referencia cuando el origen es “Otro registro operativo”.
- En edición de imágenes no se reemplaza directamente el archivo: primero se elimina el anterior y luego se carga uno nuevo.
- Los registros de cada módulo son visibles para todo el equipo autorizado en ese módulo. Así pueden revisar lo que ya existe antes de crear otro registro.
- Cada registro conserva `Registrado por` como su creador original. Si otra persona lo modifica, `Actualizado por` muestra al último responsable sin reemplazar al creador.
- Las listas usan paginación y/o scroll interno para no crecer indefinidamente.
- Todas las respuestas de validación del portal se muestran en español.

### Solicitudes compartidas

Las solicitudes enviadas desde la página pública llegan a `/equipo/administracion`.

Todos los roles operativos pueden:

- Ver todas las solicitudes.
- Abrir el detalle completo.
- Ver si es **Necesitar ayuda** u **Ofrecer ayuda**.
- Ver el tipo específico: recursos, oferta, transporte o voluntariado.
- Ver hace cuánto fue reportada, por ejemplo `Hace 12 horas` o `Hace 1 día y 12 horas`, junto con la fecha exacta.
- Cambiar estado.
- Agregar notas internas.
- Guardar cambios.
- Eliminar una solicitud.

Estados disponibles:

- Pendiente.
- En revisión.
- Asignada.
- Atendida.
- Cerrada.

Una solicitud que ya salió de **Pendiente** no puede volver a ese estado.

## Panel administrativo de Payload

Entrada: `/admin`.

Es el administrador original de Payload y no se reemplaza por el portal operativo.

Solo pueden entrar:

- `admin`
- `super-admin`

Los roles operativos no pueden utilizar `/admin`, aunque tengan acceso al portal `/equipo`.

El panel permite administrar directamente las colecciones y el global de configuración según los permisos técnicos definidos en [lib/access.ts](./lib/access.ts).

## Roles y permisos

### Roles técnicos de Payload

| Rol | Entrada | Acceso |
|---|---|---|
| `admin` | `/admin` | Todo el administrador técnico de Payload |
| `super-admin` | `/admin` | Todo el administrador técnico de Payload |

### Roles operativos

| Rol | Módulo principal | Acceso adicional |
|---|---|---|
| `que-tenemos` | Qué tenemos | Solicitudes y Evidencias |
| `que-necesitamos` | Qué necesitamos | Solicitudes y Evidencias |
| `anuncios` | Anuncios del centro | Solicitudes y Evidencias |
| `boletin` | Boletín informativo | Solicitudes y Evidencias |
| `servicios` | Servicios | Solicitudes y Evidencias |
| `inventario` | Inventario | Solicitudes y Evidencias |
| `distribucion` | Distribución | Solicitudes y Evidencias |
| `comunicados` | Comunicados | Solicitudes y Evidencias |
| `administracion` | Todos los módulos | Acceso completo del portal |

La API del portal vuelve a validar sesión, rol y módulo en cada operación. La visibilidad compartida no elimina la auditoría: la creación conserva el usuario original y cada edición actualiza el responsable de modificación. No se confía únicamente en ocultar enlaces del frontend.

## Colecciones y datos

Todas las colecciones pasan por [withAuditFields](./lib/audit-fields.ts), que añade:

- `registeredBy`: persona o proceso que creó el registro.
- `registeredByUserId`: UUID del usuario creador cuando existe.
- `updatedBy`: última persona que modificó el registro.
- `updatedByUserId`: UUID del último usuario que actualizó.

### Colecciones operativas

| Colección | Uso | Datos principales |
|---|---|---|
| `aid-intakes` | Ayudas recibidas | Recurso, categoría, cantidad, unidad, origen, fecha, clasificación, visibilidad, destacado y observaciones |
| `resources` | Inventario público | Recurso, categoría, cantidad, unidad, disponibilidad, visibilidad, destacado y notas |
| `needs` | Necesidades | Título, detalle, categoría, cantidad, unidad, prioridad, estado, zona, publicación y destacado |
| `distributions` | Salidas | Recurso, cantidad, unidad, fecha, destino general, organización, estado, visibilidad y observaciones |
| `distribution-evidence` | Evidencias | Origen, distribución relacionada o referencia libre, imagen, título, descripción, estado y visibilidad |
| `volunteer-activities` | Actividades | Título, descripción, fecha, horarios, lugar, cupos, inscritos, estado, visibilidad y responsable |
| `support-requests` | Solicitudes | Tipo de ayuda, tipo de solicitud, categoría, zona, cantidad, detalle, contacto, estado, notas internas y privacidad |

### Colecciones de comunicación y comunidad

| Colección | Uso | Datos principales |
|---|---|---|
| `announcements` | Anuncios del centro | Título, contenido, tipo, estado, destacado, visibilidad, fecha de publicación y vencimiento |
| `bulletins` | Boletines | Título, resumen, contenido completo, categoría, autor, estado, destacado, visibilidad y fecha |
| `community-notices` | Comunicados | Título, descripción, categoría, imagen, zona, contacto, estado, destacado, visibilidad y fecha |
| `services` | Servicios | Título, descripción, tipo, categoría, proveedor, zona o modalidad, costo, estado, visibilidad y fecha |

### Colecciones técnicas

| Colección o global | Uso |
|---|---|
| `users` | Usuarios técnicos y operativos, roles, estado activo y autenticación |
| `media` | Metadatos de imágenes y claves de almacenamiento R2 |
| `site-settings` | Nombre, dirección, horarios, estado, instrucciones para donar, mensaje principal, contacto y última actualización |

Los nombres de familias, menores, documentos, teléfonos sensibles y ubicaciones exactas no se publican en los módulos públicos.

## Flujos principales

### Registrar una ayuda recibida

1. El equipo recibe la donación.
2. El rol **Qué tenemos** registra recurso, categoría, cantidad, unidad y origen.
3. Se marca el estado de clasificación.
4. Se decide si es visible y si debe quedar destacada.
5. La información aparece en **Ayudas recibidas** de `/recursos`.

### Actualizar inventario

1. El rol **Inventario** registra o actualiza el recurso.
2. Se define la cantidad aproximada y su presentación.
3. Se selecciona Disponible, Limitado o Agotado.
4. La página pública refleja el cambio automáticamente.

### Publicar una necesidad

1. El rol **Qué necesitamos** registra título, detalle, categoría y prioridad.
2. Se define la zona o destino general.
3. Se marca visible públicamente y, si corresponde, destacado.
4. La necesidad aparece en la portada y en `/necesidades`.
5. La comunidad puede usar **Lo tengo** para ofrecer una cantidad.

### Recibir una solicitud pública

1. Una persona usa `/ayudar`, `/solicitar-apoyo` o **Lo tengo**.
2. El backend valida origen, tamaño, campos, privacidad y límite de solicitudes.
3. Payload crea una solicitud en estado **Pendiente**.
4. Todos los roles operativos la ven en Solicitudes.
5. Un integrante la abre, agrega notas o cambia su estado.
6. La información no se muestra como lista pública de nombres o contactos.

### Registrar una distribución

1. El rol Distribución registra recurso, cantidad, unidad, fecha, destino general y organización.
2. Elige Pendiente, En ruta o Entregado.
3. Puede crear evidencias desde el módulo separado.
4. Las evidencias publicadas aparecen en el carrusel de `/distribucion`.

### Publicar un comunicado con imagen

1. El rol Comunicados abre `/equipo/comunicados`.
2. Completa categoría, título, descripción, zona y contacto.
3. Carga una imagen si corresponde.
4. La imagen se optimiza y se guarda en R2.
5. Al publicar y marcar visible, aparece en `/comunicados`.
6. La comunidad puede compartir el enlace de la tarjeta.

## Actualización automática

La aplicación no depende de una recarga manual para reflejar cambios:

- Las páginas públicas usan `noStore` y refresco del router cada 5 segundos.
- El dashboard del equipo se actualiza automáticamente cada 5 segundos.
- Los módulos operativos consultan su endpoint cada 5 segundos.
- Solicitudes y listas se actualizan al recuperar el foco de la ventana.
- Las acciones de crear, editar y eliminar actualizan la lista local inmediatamente.
- Los endpoints públicos envían `Cache-Control: no-store`.

La implementación actual utiliza polling controlado, no WebSockets. Es una actualización automática de pocos segundos sin añadir Redis, SSE ni infraestructura adicional.

## API

### Endpoints públicos

Todos los endpoints de lectura consultan únicamente información visible y publicada cuando corresponde.

| Método | Ruta | Respuesta |
|---|---|---|
| GET | `/api/public/overview` | Centro, métricas, recursos, ayudas, necesidades, anuncios, distribuciones, evidencias, actividades, comunicados, servicios y boletines |
| GET | `/api/public/resources` | Recursos disponibles |
| GET | `/api/public/aid-intakes` | Ayudas recibidas visibles |
| GET | `/api/public/needs` | Necesidades activas |
| GET | `/api/public/announcements` | Anuncios publicados |
| GET | `/api/public/distributions` | Distribuciones visibles |
| GET | `/api/public/community-notices` | Comunicados publicados |
| GET | `/api/public/services` | Servicios publicados |
| GET | `/api/public/bulletins` | Boletines publicados |
| POST | `/api/public/support-request` | Crea una solicitud pública |
| GET | `/api/health` | Estado del servicio y si `DATABASE_URL` está configurada |

### Endpoints del portal operativo

Todos requieren sesión operativa y validación de rol.

| Método | Ruta | Uso |
|---|---|---|
| POST | `/api/equipo/login` | Inicia sesión operativa |
| POST | `/api/equipo/refresh` | Renueva la sesión operativa sin exponer el token |
| POST | `/api/equipo/logout` | Cierra sesión operativa |
| GET | `/api/equipo/:module` | Lista registros paginados del módulo |
| GET | `/api/equipo/administracion?summary=pending` | Devuelve únicamente el total y tipo de la solicitud pendiente más reciente para el contador y las alertas |
| POST | `/api/equipo/:module` | Crea un registro si el módulo lo permite |
| PATCH | `/api/equipo/:module` | Actualiza un registro mediante su UUID |
| DELETE | `/api/equipo/:module` | Elimina un registro mediante su UUID |
| POST | `/api/equipo/media` | Optimiza y carga una imagen a R2 |
| DELETE | `/api/equipo/media` | Elimina una imagen propia o autorizada de Payload y R2 |
| GET | `/api/media/:id` | Sirve una imagen de R2 mediante su UUID |

El módulo `administracion` corresponde internamente a **Solicitudes** y devuelve las solicitudes compartidas para todos los roles operativos.

### API de Payload

Payload mantiene:

- Panel: `/admin`
- API general: `/api`
- GraphQL habilitado por la configuración de Payload.

Las reglas de acceso de Payload reservan la administración directa para `admin` y `super-admin`. El portal operativo utiliza endpoints propios y valida sus permisos antes de usar operaciones internas.

## Imágenes y Cloudflare R2

### Flujo de carga

1. El usuario selecciona una imagen.
2. El portal valida que sea JPG, PNG, WebP o GIF.
3. Se rechazan archivos superiores a 10 MB.
4. Sharp corrige la orientación.
5. Sharp redimensiona sin ampliar y limita el borde máximo a 1600 px.
6. La imagen se convierte a WebP con calidad 82.
7. Se genera una clave con UUID dentro de `R2_PREFIX`.
8. Se sube mediante una solicitud S3 firmada.
9. Payload guarda los metadatos de la imagen.
10. El frontend utiliza `/api/media/:id` para mostrarla.

### Eliminación

Al eliminar una imagen desde el portal:

- Se elimina el registro de `media`.
- Se elimina el objeto correspondiente de R2.
- Si una operación falla, el backend intenta limpiar el objeto temporal creado.

No se necesita una URL pública del bucket. El backend descarga los objetos de R2 y los sirve mediante una ruta propia con caché inmutable.

### Permisos de medios

- Comunicados: el rol Comunicados y Administración.
- Evidencias: los roles operativos autorizados.
- Los roles técnicos de Payload no usan el login del equipo.
- Un usuario operativo no puede eliminar la imagen cargada por otra persona, excepto Administración.

## Seeder de demostración

El seeder completo se encuentra en [scripts/seed-with-migrations.ts](./scripts/seed-with-migrations.ts).
Es el único archivo de seed que debe ejecutarse directamente.

Carga o actualiza datos de demostración realistas para que la aplicación no aparezca vacía:

- 28 recursos.
- 6 ayudas recibidas.
- 16 necesidades.
- 13 anuncios.
- 13 distribuciones.
- 13 evidencias.
- 10 comunicados.
- 10 servicios.
- 8 boletines.
- 10 actividades.
- 8 solicitudes internas.
- Usuarios de Payload y un usuario por rol operativo.
- Rutas de imágenes iniciales de comunicados y evidencias tomadas desde `public/`; el seeder no crea archivos ni documentos en `media`.

El seeder es idempotente:

- Busca registros por campos de referencia.
- Actualiza los existentes.
- Evita duplicar registros al ejecutarse nuevamente.
- Corrige registros antiguos cuyo auditor aparezca como `Seeder inicial PLs al llamado` o `Administrador de prueba`.
- Usa el actor de demostración `Carga inicial del sistema`, sin atribuir la carga a un administrador real.
- Genera UUID v4 aleatorios y únicos durante cada ejecución para los registros iniciales, relaciones, medios y usuarios.
- Comprueba los UUID con un conjunto en memoria para que no se repitan dentro de la misma carga.
- Guarda esos UUID al crear documentos gracias a `allowIDOnCreate` y conserva los UUID existentes al actualizar.

Ejecutar:

```bash
pnpm payload:seed
```

`payload:seed` comprueba si la base ya tiene el registro de migraciones. Cuando
existe un esquema anterior, ejecuta primero `pnpm payload:migrate` para preparar
el enum de roles y convertir `anuncios-boletin` antes de que Payload sincronice
el esquema en desarrollo. En una base completamente nueva omite ese paso porque
todavía no existen tablas que migrar y deja que el `push` de desarrollo cree el
esquema inicial.

### Usuarios de prueba

#### Payload

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@plsalllamado.local` | `PLsAdmin2026!` |
| Superadministrador | `superadmin@plsalllamado.local` | `PLsSuper2026!` |

#### Equipo operativo

Todos los siguientes usuarios usan la contraseña definida en el seed: `PLsEquipo2026!`:

| Rol | Correo |
|---|---|
| Administración | `administracion@plsalllamado.local` |
| Qué tenemos | `que-tenemos@plsalllamado.local` |
| Qué necesitamos | `que-necesitamos@plsalllamado.local` |
| Anuncios | `anuncios@plsalllamado.local` |
| Boletín | `boletin@plsalllamado.local` |
| Servicios | `servicios@plsalllamado.local` |
| Inventario | `inventario@plsalllamado.local` |
| Distribución | `distribucion@plsalllamado.local` |
| Comunicados | `comunicados@plsalllamado.local` |

## UUID y migraciones

Payload está configurado con:

```ts
db: postgresAdapter({
  idType: 'uuid',
})
```

Los documentos nuevos utilizan UUID. Las evidencias embebidas heredadas de distribuciones también se normalizan a UUID.

### Generar tipos

```bash
pnpm payload:generate
```

### Crear y aplicar migraciones

Para aplicar las migraciones pendientes:

```bash
pnpm payload:migrate
```

Para crear una migración de cambios posteriores:

```bash
pnpm payload:migrate:create
```

En desarrollo, Payload puede sincronizar cambios de esquema con `push`, pero las
migraciones versionadas siempre se ejecutan antes del seeder. En producción se
debe ejecutar `pnpm payload:migrate` como parte del despliegue antes de iniciar
la aplicación.

### UUID y limpieza de desarrollo

El proyecto ya usa UUID desde la configuración de Payload y el seeder genera
los IDs iniciales automáticamente. No se necesita un script manual para
convertir IDs ni un script de reinicio dentro del proyecto.

Si necesitas vaciar una base local, hazlo con el flujo de PostgreSQL o Docker
que utilices en tu entorno de desarrollo y luego ejecuta `pnpm payload:seed`.

## Seguridad y privacidad

### Validación de entradas

- El backend valida todos los campos, no solo el frontend.
- Se rechazan cuerpos JSON inválidos.
- Se limitan los tamaños de los cuerpos.
- Se limitan longitudes de texto por campo.
- Se validan UUID antes de buscar, editar o eliminar registros.
- Se valida el origen de las solicitudes.
- Se normalizan valores de texto antes de guardarlos.
- No se interpolan valores de usuario directamente en consultas SQL.
- Payload y PostgreSQL utilizan parámetros y relaciones controladas.

### Límites principales

| Flujo | Límite |
|---|---:|
| Login operativo | 16 KB |
| Solicitud pública | 32 KB |
| CRUD JSON del portal | 512 KB |
| Imagen del portal | 10 MB |
| Texto de título/nombre | 160 caracteres |
| Texto descriptivo | Según campo, normalmente 2.000 a 5.000 caracteres |

### Rate limiting

- Solicitudes públicas: 10 por dirección en 15 minutos.
- Login por IP: 12 intentos en 15 minutos.
- Login por cuenta: 8 intentos en 15 minutos.
- Payload Auth: máximo 5 intentos y bloqueo durante 15 minutos.
- Tokens de sesión: expiración configurada en 2 horas.
- Cookies: `SameSite=Strict` y `Secure` en producción.

### Privacidad

La plataforma no tiene módulo de personas desaparecidas.

No se deben registrar públicamente:

- Nombres de familias receptoras.
- Datos de niñas o niños.
- Documentos de identidad.
- Teléfonos personales en comunicados públicos.
- Direcciones exactas de personas.
- Información médica individual.
- Detalles que permitan identificar a una familia vulnerable.

Las distribuciones utilizan destinos generales, barrios, zonas, albergues u organizaciones.

## Comandos de desarrollo

Todos los comandos de proyecto se ejecutan con pnpm:

```bash
pnpm install                  # Instala dependencias
pnpm dev                      # Servidor de desarrollo
pnpm build                    # Compilación de producción
pnpm start                    # Sirve la compilación
pnpm lint                     # Ejecuta ESLint
pnpm typecheck                # Comprueba TypeScript
pnpm payload:generate         # Genera payload-types.ts
pnpm payload:migrate:create   # Crea una migración
pnpm payload:migrate          # Ejecuta migraciones
pnpm payload:seed             # Carga datos y usuarios de prueba
```

El proyecto contiene:

- [pnpm-lock.yaml](./pnpm-lock.yaml)
- [pnpm-workspace.yaml](./pnpm-workspace.yaml)
- `packageManager: pnpm@9.15.4`
- Script `preinstall` que bloquea otros gestores.

No se debe crear ni agregar `package-lock.json`, `yarn.lock`, `bun.lock` o archivos equivalentes.

## Producción

Antes de publicar:

1. Cambia todos los correos y contraseñas de prueba.
2. Define un `PAYLOAD_SECRET` largo y aleatorio.
3. Configura PostgreSQL administrado.
4. Configura R2 con una API limitada al bucket.
5. Define `NEXT_PUBLIC_SERVER_URL` con HTTPS.
6. Revisa CORS y CSRF.
7. Crea un respaldo de la base.
8. Genera y ejecuta migraciones.
9. Ejecuta el seeder solo si realmente quieres datos iniciales.
10. Revisa el aviso de privacidad y los canales de contacto.
11. Verifica que las imágenes no contengan datos sensibles.
12. Prueba cada rol con una cuenta independiente.
13. Comprueba que `/admin` no sea accesible para roles operativos.
14. Comprueba que el portal operativo no acepte usuarios `admin` o `super-admin`.
15. Revisa logs, rate limiting y permisos de R2.

Comandos de compilación:

```bash
pnpm install --frozen-lockfile
pnpm payload:generate
pnpm payload:migrate
pnpm build
pnpm start
```

## Solución de problemas

### La página aparece vacía

Comprueba:

1. PostgreSQL está encendido.
2. `DATABASE_URL` apunta a la base correcta.
3. Ejecutaste `pnpm payload:seed`.
4. Los registros tienen `publicVisible=true`.
5. Los anuncios, boletines, servicios y comunicados tienen `status=publicado`.
6. El endpoint `/api/health` responde correctamente.

### El seeder no conecta a PostgreSQL

Revisa la conexión:

```bash
docker compose ps
docker compose logs postgres
```

Después valida `DATABASE_URL` y vuelve a ejecutar:

```bash
pnpm payload:seed
```

### Error `invalid input value for enum enum_users_role`

La base conserva el rol combinado de una versión anterior. La corrección está
versionada en `migrations/` y se aplica automáticamente cuando ejecutas:

```bash
pnpm payload:seed
```

Si quieres separar los pasos, usa primero `pnpm payload:migrate` y después
`pnpm payload:seed`.

### El portal no permite subir imágenes

Comprueba:

- `R2_ENABLED=true`.
- El bucket existe.
- El endpoint no incluye el nombre del bucket en una ruta duplicada.
- La API tiene permisos Object Read & Write sobre el bucket.
- Las claves R2 son correctas.
- El archivo es JPG, PNG, WebP o GIF.
- El archivo pesa menos de 10 MB.

### El administrador Payload no carga

Comprueba:

- Que el primer usuario tenga rol `admin` o `super-admin`.
- Que `PAYLOAD_SECRET` esté definido.
- Que la base tenga el esquema actualizado.
- Que no se esté intentando ingresar con un rol operativo.

### Un cambio no aparece inmediatamente

La aplicación actualiza automáticamente aproximadamente cada 5 segundos. También puedes cambiar de página o volver a enfocar la ventana. Comprueba que:

- El registro esté publicado.
- `publicVisible` esté activo.
- No tenga estado archivado o cerrado cuando la vista lo excluya.
- El seeder o el panel hayan terminado sin errores.

## Validación del proyecto

La validación estándar es:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

La compilación debe reconocer:

- La portada pública.
- Todas las rutas públicas.
- El panel original de Payload.
- El API general de Payload.
- Los endpoints públicos.
- El login y CRUD del portal operativo.
- El servidor de medios.

Última actualización documental: agosto de 2026.
