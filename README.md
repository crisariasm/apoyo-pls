# PLs al llamado

Primera versión de la plataforma operativa del centro de acopio PLs al llamado en Pereira.

El proyecto utiliza pnpm exclusivamente. La versión esperada está declarada en `package.json` y el proyecto rechaza instalaciones iniciadas con otro gestor de paquetes.

## Qué incluye

- Página pública responsive con una portada breve y navegación por módulos; la landing conserva el resumen y los anuncios destacados.
- Rutas públicas separadas: `/recursos`, `/necesidades`, `/distribucion`, `/ayudar`, `/solicitar-apoyo`, `/comunicados`, `/servicios` y `/boletin`.
- Registro público de ayudas recibidas y clasificadas, visible en `/recursos` y en `/api/public/aid-intakes`.
- Inventario público por categoría, cantidad aproximada, unidad y estado.
- Necesidades urgentes con prioridad crítica, alta o media.
- Seguimiento de distribuciones por destino general, organización y estado.
- Anuncios de horarios, necesidades, rutas, voluntariado e impacto visibles desde la portada.
- Próximas actividades y registro de voluntariado dentro de `/ayudar`.
- Formularios públicos para solicitar apoyo, ofrecer recursos o inscribirse como voluntario.
- Panel administrativo Payload en `/admin`, con su interfaz original y reservado para `admin` y `super-admin`.
- Portal operativo independiente en `/equipo/login`, con dashboard, indicadores, gráficas y edición por rol.
- Roles operativos: Rol que tenemos, Rol que necesitamos, Rol de anuncios del centro y boletín informativo, Rol de servicios, Rol de inventario, Rol de distribución, Rol de comunicados y Rol de administración.
- API REST de Payload en `/api` y endpoints públicos de lectura/escritura segura.
- PostgreSQL mediante `@payloadcms/db-postgres`.
- Todos los IDs de documentos de Payload se generan como UUID (`idType: 'uuid'`). Los IDs de las evidencias de distribución también se normalizan a UUID antes de guardar.
- Imágenes en Cloudflare R2 mediante API S3 compatible: el portal permite cargar o eliminar imágenes, sin reemplazar archivos en una edición. Cada imagen se gira según su orientación, se redimensiona hasta 1600 px, se convierte a WebP y se comprime antes de guardarse; luego se sirve por `/api/media/:id` con lectura firmada en servidor.
- Imagen principal generada para el proyecto en `public/hero-PLs-al-llamado.png`.
- Logo vigente en `public/logo-PLs-rosado.png`, favicon PNG en `public/favicon-PLs.png`, favicon ICO en `public/favicon-PLs.ico` y Apple touch icon en `public/apple-touch-icon-PLs.png`.

### Matriz de acceso

| Rol | Entrada | Alcance |
|---|---|---|
| `admin` | `/admin` | Todo el panel técnico de Payload |
| `super-admin` | `/admin` | Todo el panel técnico de Payload |
| `administracion` | `/equipo/login` | Todos los módulos del portal operativo |
| Cualquier otro rol operativo | `/equipo/login` | Solo el módulo asignado |

Las cuentas `admin` y `super-admin` no se aceptan en el login de `/equipo`; las cuentas operativas no tienen acceso al panel de `/admin`. El portal operativo valida de nuevo el módulo en cada página y endpoint.

## Arranque local

Requisitos: Node.js 20.9+, pnpm y PostgreSQL.

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Para usar una base local con Docker:

```bash
docker compose up -d
```

Luego define `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pls_al_llamado` en `.env` y genera los tipos:

```bash
pnpm payload:generate
pnpm dev
```

En desarrollo, `payload.config.ts` usa `push` automático para crear o sincronizar el esquema al iniciar la aplicación. En producción `push` queda desactivado; allí debes crear y aplicar migraciones versionadas antes de arrancar:

```bash
pnpm payload:migrate:create
pnpm payload:migrate
pnpm payload:seed
```

### Convertir una base existente a UUID

Si la base se creó antes de activar UUID, detén la aplicación y crea primero un respaldo. Después ejecuta el migrador transaccional:

```bash
UUID_MIGRATION_CONFIRM=YES pnpm payload:ids:uuid
pnpm payload:generate
pnpm payload:migrate
```

El migrador conserva los registros, genera un UUID nuevo para cada documento, actualiza las relaciones de Payload y normaliza los IDs de sesiones y evidencias. Si encuentra una relación huérfana o una clave compuesta, revierte toda la transacción y reporta el problema. No uses `payload migrate:fresh` para conservar datos.

### Reiniciar la base completamente

Si quieres comenzar sin ningún registro, incluyendo usuarios, crea un respaldo y ejecuta el reset únicamente sobre la `DATABASE_URL` revisada:

```bash
RESET_DATABASE_CONFIRM=YES pnpm payload:reset
pnpm payload:generate
pnpm dev
```

Después abre `/admin` y registra el primer usuario. El rol inicial queda como `admin`, por lo que podrá administrar todas las colecciones. Si quieres que sea el superadministrador de Payload, selecciónalo en el campo de rol del formulario inicial. Este reset no borra archivos que ya existan en Cloudflare R2; esos objetos deben eliminarse desde R2 si también quieres vaciar el bucket.

### Imágenes con Cloudflare R2

Activa el almacenamiento después de crear un bucket y una API token con permisos `Object Read & Write` limitada a ese bucket. Define en `.env`:

```bash
R2_ENABLED=true
R2_ACCOUNT_ID=TU_ACCOUNT_ID
R2_BUCKET=pls-al-llamado-media
R2_ENDPOINT=https://TU_ACCOUNT_ID.r2.cloudflarestorage.com
R2_REGION=auto
R2_ACCESS_KEY_ID=TU_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY=TU_SECRET_ACCESS_KEY
R2_PREFIX=media
```

No se necesita una URL pública del bucket: la aplicación descarga las imágenes desde R2 en el servidor y las expone a través de `/api/media/:id`. En el portal operativo, quitar una imagen la elimina de la colección `media` y del bucket; seleccionar un archivo nuevo requiere eliminar primero el anterior.

El seeder carga los registros iniciales de recursos, ayudas recibidas, necesidades, anuncios, boletines, distribuciones, comunicados, servicios y actividades. La aplicación pública no incluye datos simulados: su contenido proviene de Payload y queda vacío hasta ejecutar el seeder.

Abre:

- Portal público: `http://localhost:3000`
- Panel Payload: `http://localhost:3000/admin`
- Portal operativo: `http://localhost:3000/equipo/login`
- Salud del servicio: `http://localhost:3000/api/health`

La base de datos debe estar configurada para mostrar y guardar información. Si no está disponible, la página conserva su estructura y muestra estados vacíos; los formularios informan que no pueden guardar la solicitud.

El seeder crea cuentas de prueba para `admin`, `super-admin` y cada rol operativo. Las contraseñas se controlan con las variables `SEED_*` del archivo `.env`; cambia estos valores antes de usar el proyecto fuera de pruebas.

## API pública

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/public/overview` | Centro, métricas, recursos, ayudas recibidas, necesidades, anuncios, distribuciones y actividades |
| GET | `/api/public/resources` | Inventario público |
| GET | `/api/public/aid-intakes` | Ayudas recibidas visibles |
| GET | `/api/public/needs` | Necesidades activas |
| GET | `/api/public/announcements` | Anuncios publicados |
| GET | `/api/public/distributions` | Distribuciones visibles |
| POST | `/api/public/support-request` | Solicitar recursos, transporte u ofrecer ayuda |
| GET | `/api/health` | Estado del servicio y de la configuración de base de datos |

Payload expone también el API general bajo `/api` y el panel administra las colecciones con permisos por rol.

## Flujo operativo

1. Se recibe una donación.
2. Inventario la registra y clasifica.
3. Se publica su disponibilidad.
4. El equipo recibe o crea una necesidad.
5. Coordinación aprueba la salida.
6. Distribución registra destino, responsable y estado.
7. Comunicaciones publica avances o anuncios.

La primera versión no registra personas desaparecidas ni datos individuales de menores. Las solicitudes trabajan con zona, necesidad general y canal de contacto. Antes de usarla en producción se debe reemplazar la dirección y los canales de contacto de ejemplo, configurar un `PAYLOAD_SECRET` real y revisar el aviso de privacidad del equipo PLs al llamado.

## Validación realizada

```bash
pnpm typecheck
pnpm lint
pnpm build
```

La compilación reconoce la página pública, `/admin`, el API de Payload y los endpoints públicos. El seeder también crea o actualiza las cuentas iniciales de Payload y del equipo operativo; sus credenciales pueden definirse con las variables `SEED_*` en `.env`.
