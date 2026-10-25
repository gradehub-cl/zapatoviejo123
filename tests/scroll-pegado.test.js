// En la app agregada al inicio, la lista se quedaba pegada arriba (reporte de
// un usuario, 2026-10-23). En iOS, el rebote de un `.scroll` que está arriba del
// todo pasaba al documento, y el siguiente gesto lo tomaba el documento, que no
// tiene nada que desplazar. Estas reglas lo contienen; el test las fija para que
// nadie las saque creyendo que solo cambian el rebote.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const css=fs.readFileSync(path.join(__dirname,'..','styles.css'),'utf8');
assert.match(css,/\.app\.tab-mode \.scroll\{overscroll-behavior-y:contain;\}/,'el rebote de cada pantalla no se encadena al documento');
assert.match(css,/@media \(display-mode:standalone\)\{html,body\{overscroll-behavior-y:none;\}\}/,'el documento no rebota en la app instalada');
assert.match(css,/html\.app-nativa,html\.app-nativa body\{overscroll-behavior-y:none;\}/,'ni en la app iOS');
// La regla vieja que evitaba que .app fuera otro contenedor con scroll sigue ahí.
assert.match(css,/\.app\.tab-mode\{overflow-x:hidden;overflow-x:clip;\}/,'.app recorta con clip y no crea otro contenedor');
console.log('OK scroll pegado: el rebote se queda en cada pantalla y el documento no se lleva el dedo');
