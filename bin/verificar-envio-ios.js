#!/usr/bin/env node
// Antes de archivar en Xcode para la App Store (guía 2.5.2 de App Review):
// comprueba que lo que va dentro del binario es la copia local que arma
// `npm run ios:preparar`, y no la app de prueba de `npm run ios:rama`, que
// carga ios.gradehub.pages.dev desde internet.
//
//   npm run ios:preparar && npm run ios:verificar-envio
//
// Revisa:
//  - capacitor.config.json sin `server` (nada se carga desde un servidor);
//  - index.html y los siete scripts del bundle dentro de la app, con la
//    versión sellada;
//  - supabase-js incluido, no pedido a jsDelivr;
//  - ningún <script src> remoto fuera de la lista conocida (hoy solo Google
//    Analytics, que se avisa aparte porque sigue pendiente en #665).
//
// Uso: node bin/verificar-envio-ios.js [carpeta de ios/App/App]
// Sale con 1 si algo impide enviar. No modifica nada.
'use strict';
const fs=require('fs'),path=require('path');
const SCRIPTS=['data.js','engine.js','app.js','app-session.js','marketplace.js','render-main.js','render-agenda.js'];
const REMOTOS_CONOCIDOS=[/^https:\/\/www\.googletagmanager\.com\/gtag\/js\?/];

function verificarEnvioIOS(dirApp){
  const errores=[],avisos=[];
  const config=path.join(dirApp,'capacitor.config.json');
  if(!fs.existsSync(config))errores.push('Falta capacitor.config.json: corre npm run ios:preparar.');
  else{
    let c=null;try{c=JSON.parse(fs.readFileSync(config,'utf8'));}catch(e){errores.push('capacitor.config.json no es JSON válido.');}
    if(c&&c.server)errores.push('capacitor.config.json tiene "server"'+(c.server.url?' ('+c.server.url+')':'')+': es la app de prueba de ios:rama. Vuelve a correr npm run ios:preparar sin GRADEHUB_SERVIDOR.');
  }
  const pub=path.join(dirApp,'public'),html=path.join(pub,'index.html');
  if(!fs.existsSync(html)){errores.push('Falta public/index.html: corre npm run ios:preparar.');return {errores,avisos};}
  const h=fs.readFileSync(html,'utf8');
  if(h.includes('__ASSET_VERSION__'))errores.push('index.html sin versión sellada (__ASSET_VERSION__).');
  for(const s of [...SCRIPTS,'supabase.js'])if(!fs.existsSync(path.join(pub,s)))errores.push('Falta '+s+' dentro de la app.');
  if(!/<script src="supabase\.js"/.test(h))errores.push('index.html no carga supabase.js local.');
  for(const m of h.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)){
    const src=m[1];
    if(!/^https?:|^\/\//i.test(src))continue;
    if(REMOTOS_CONOCIDOS.some(r=>r.test(src)))avisos.push('Script remoto conocido: '+src.split('?')[0]+' (analítica, pendiente en #665).');
    else errores.push('Script remoto no esperado: '+src);
  }
  return {errores,avisos};
}

if(require.main===module){
  const dir=path.resolve(process.argv[2]||path.join(__dirname,'..','ios','App','App'));
  const {errores,avisos}=verificarEnvioIOS(dir);
  avisos.forEach(a=>console.log('  AVISO '+a));
  errores.forEach(e=>console.log('  NO    '+e));
  if(errores.length){console.log('\nNo archives este build para la App Store.');process.exit(1);}
  console.log('\nListo para archivar: la app va sin servidor remoto y con todo adentro.');
}
module.exports={verificarEnvioIOS};
