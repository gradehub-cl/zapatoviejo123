# Sección dentro de Calificar profesor

Capturas con datos sintéticos: 375 y 1280 px, claro/oscuro y texto al 200%. El tema estacional es el que ya existe en main.

`*-seccion.png`: campo corregido, foco visible y Continuar. `*-invalida.png`: intento sin sección, borde de error y mensaje.

`checks.json` registra las ocho variantes. Prueba en Chrome con HTTP local, sin boot de sesión, service worker bloqueado y peticiones externas bloqueadas. Usa las funciones reales de save, respaldoAlDia y syncNow contra un cliente Supabase simulado (fallo de respaldo seguido de éxito). Comprueba copia local y remota sintética, orden de respaldo/consulta, recarga, cancelación, sección opcional en Editar ramo, notas intactas, objetivos de 44 px y ausencia de desborde en la hoja.

No se usaron cuentas, profesores ni notas reales.
