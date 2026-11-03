// Solo genera un derivado gráfico; no es un build de la aplicación.
// Uso: node bin/preparar-icono.cjs. Luego exportar PNG con bin/iconos.html.
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const logo=fs.readFileSync(path.join(root,'logo.svg'),'utf8');
const marker='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none">';
if(!logo.startsWith(marker))throw Error('logo.svg cambió de formato: revisar el encuadre antes de generar');
const framed=logo.replace(marker,'<svg x="20.18462" y="17.23077" width="87.63077" height="87.63077" viewBox="0 0 128 128" fill="none">').trim();
fs.writeFileSync(path.join(root,'icon.svg'),`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 128 128">
  <title>GradeHub</title>
  <!-- Generado desde logo.svg con node bin/preparar-icono.cjs.
       Para exportar los PNG, ver bin/iconos.html. No editar este derivado. -->
  <rect x=".25" y=".25" width="127.5" height="127.5" rx="28.5" fill="#111113" stroke="#242427" stroke-width=".5"/>
${framed}
</svg>
`);

// Variante maskable (Android/TWA): fondo #0a0e14 a sangre, sin esquinas, y la
// marca más chica para que quede dentro de la zona segura (círculo del 80%
// central). Va en bin/ porque solo se exporta a icon-maskable-512.png.
const maskable=logo.replace(marker,'<svg x="26" y="24.21875" width="76" height="76" viewBox="0 0 128 128" fill="none">').trim();
fs.writeFileSync(path.join(__dirname,'icon-maskable.svg'),`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 128 128">
  <!-- Generado desde logo.svg con node bin/preparar-icono.cjs. No editar. -->
  <rect width="128" height="128" fill="#0a0e14"/>
${maskable}
</svg>
`);
