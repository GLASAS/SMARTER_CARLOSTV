# SMART IPTV CHARLY

Proyecto inicial modular para GitHub Pages + Google Sheets + Apps Script.

## Estructura

- `index.html`: estructura y pantallas.
- `css/styles.css`: diseño adaptable.
- `js/auth.js`: sesión del usuario.
- `js/api.js`: comunicación con el backend.
- `js/catalog.js`: catálogo, categorías, favoritos y búsqueda.
- `js/m3u-parser.js`: lectura del formato M3U.
- `js/player.js`: reproducción HLS/M3U8 y formatos que admita el navegador.
- `js/app.js`: navegación y coordinación.
- `apps-script/Code.gs`: validación de usuario, clave, vencimiento y URL de columna G.
- `cloudflare-worker/worker.js`: proxy CORS opcional recomendado.

## 1. Preparar Google Sheets

Conserva las columnas del ejemplo:
A FECHA CREACION, B FECHA VENCIMIENTO, C NOMBRE, D APELLIDO,
E USUARIO, F CLAVE, G URL1, H ESTADO (opcional; ACTIVO/BLOQUEADO).

La fecha de vencimiento debe ser una fecha real de Sheets, no texto.
La columna G debe contener una URL http/https accesible desde el dispositivo.

## 2. Configurar Apps Script

1. Abre la hoja y entra a Extensiones > Apps Script.
2. Copia el contenido de `apps-script/Code.gs`.
3. Cambia `SPREADSHEET_ID` por el ID de la hoja (el texto entre `/d/` y `/edit`).
4. Cambia `SHEET_NAME` por el nombre exacto de la pestaña inferior.
5. Guarda y ejecuta una función si Google solicita autorización.
6. Implementar > Nueva implementación > Aplicación web.
7. Ejecutar como: tú. Quién tiene acceso: cualquiera (el acceso a los datos se valida en el código).
8. Copia la URL terminada en `/exec`.

IMPORTANTE: una implementación pública debe protegerse y probarse cuidadosamente. No compartas la URL administrativa ni permisos de edición de la hoja.

## 3. Configurar el proxy CORS (recomendado)

Los navegadores pueden bloquear solicitudes entre GitHub Pages y Apps Script por CORS/redirecciones. El proxy evita que el navegador llame directamente a Google.

1. Crea un Worker en Cloudflare y pega `cloudflare-worker/worker.js`.
2. En Settings > Variables agrega `APPS_SCRIPT_URL` con la URL `/exec` de Apps Script.
3. Publica el Worker y copia su URL.
4. Abre `js/config.js` y pega la URL del Worker en `API_URL`.

También la lista M3U debe permitir solicitudes desde el origen del reproductor. Si el proveedor no permite CORS, el navegador no podrá descargar el archivo M3U directamente. No se incluye proxy de streams: puede estar prohibido por el proveedor y consumir mucho ancho de banda.

## 4. Publicar en GitHub Pages

1. Crea un repositorio, por ejemplo `smart-iptv-charly`.
2. Sube todos los archivos y carpetas manteniendo la estructura.
3. En Settings > Pages, selecciona Deploy from a branch, `main` y `/root`.
4. Guarda y abre la URL de GitHub Pages.

No abras `index.html` con doble clic: los módulos JavaScript necesitan servirse desde HTTP/HTTPS. Usa GitHub Pages o un servidor local.

## 5. Prueba

- Usuario: el valor de la columna E.
- Contraseña: el valor de la columna F.
- URL de lista: el valor de la columna G para esa misma fila.
- Vencimiento: la fecha de la columna B.

Prueba primero con una lista M3U de muestra legal y accesible.

## Compatibilidad real

- M3U es un formato de lista de texto, no un formato de video.
- M3U8/HLS: HLS.js en navegadores compatibles; HLS nativo en Safari/iOS y otros dispositivos que lo soporten.
- MP4: depende de códec/perfil compatible con el dispositivo.
- MKV, AVI, TS, HEVC y otros formatos no están garantizados en navegadores.
- Smart TV: depende del navegador, versión, memoria, códecs y soporte de Media Source Extensions.
- Autoplay puede estar bloqueado; el usuario debe pulsar Play.
- CORS, enlaces vencidos, geobloqueo, DRM o autenticación del proveedor pueden impedir reproducción.

## Seguridad: antes de uso comercial

Este es un prototipo funcional de inicio. Las contraseñas de la hoja están comparadas como texto simple porque el formato mostrado tiene una columna CLAVE. Para producción, migra a contraseñas con hash, tokens de sesión firmados y controles anti-fuerza-bruta. No guardes contraseñas en localStorage. El reproductor guarda temporalmente la URL de la lista en sessionStorage después del login; considera un backend que emita URL de lista de corta duración si necesitas mayor protección.

Usa únicamente listas y contenidos para los que tengas autorización de distribución.


## 6. Configurar el administrador

En Apps Script:
1. Abre Configuración del proyecto > Propiedades del script.
2. Agrega `ADMIN_USER` y `ADMIN_PASSWORD` con credenciales fuertes.
3. No coloques las credenciales del administrador en archivos HTML/JavaScript.
4. Después de cambiar `Code.gs`, crea una nueva versión de la implementación web (Implementar > Administrar implementaciones > Editar > Nueva versión).
5. Entra en la aplicación con esas credenciales. Aparecerá el módulo Administración.

Desde el panel podrás crear cuentas, editar datos, renovar vencimiento, actualizar la URL de la columna G y bloquear/activar usuarios. El sistema añade la columna H ESTADO si no existe. Los usuarios bloqueados no podrán iniciar sesión.

Las sesiones se mantienen en CacheService hasta 6 horas. La caché puede expirar antes; en ese caso el usuario debe ingresar de nuevo. El panel no incluye borrado permanente de cuentas para evitar eliminar accidentalmente registros: usa BLOQUEADO.

## 7. Seguridad y alcance

La hoja mantiene la contraseña de usuarios en la columna F como texto simple para respetar el formato que ya tienes. Esto no es ideal para un servicio público. Antes de producción se recomienda migrar a contraseñas con hash y un sistema de autenticación dedicado, limitar intentos, restringir orígenes y revisar el acceso público al Worker. El token reduce la exposición de la contraseña de administrador después del inicio de sesión, pero no sustituye una auditoría de seguridad.
