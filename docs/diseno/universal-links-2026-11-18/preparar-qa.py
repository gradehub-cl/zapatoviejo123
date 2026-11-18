#!/usr/bin/env python3
"""Copia temporal para simctl: transporte sintético y relay del evento, sin AASA desplegado.
Uso: python3 docs/diseno/universal-links-2026-11-18/preparar-qa.py /ruta/al/worktree
Antes: npm run ios:preparar. No cambia ningún archivo de producción.
"""
from pathlib import Path
import json, plistlib, shutil, sys, tempfile
raiz=Path(sys.argv[1]).resolve()
qa=Path(tempfile.mkdtemp(prefix='gh-enlaces-qa-'))
app=qa/'App'
shutil.copytree(raiz/'ios/App', app, ignore=shutil.ignore_patterns('build','xcuserdata','Firma.local.xcconfig'))
shutil.copy2(raiz/'ios/debug.xcconfig',qa/'debug.xcconfig')
p=app/'CapApp-SPM/Package.swift'
p.write_text(p.read_text().replace('../../../node_modules/', str((raiz/'node_modules').resolve())+'/'))
p=app/'App/Info.plist';info=plistlib.loads(p.read_bytes());info['CFBundleDisplayName']='Enlaces QA'
for tipo in info['CFBundleURLTypes']: tipo['CFBundleURLSchemes']=['cl.gradehub.enlacesqa']
p.write_bytes(plistlib.dumps(info))
public=app/'App/public'
mock=r'''
// Solo en la copia QA. Ninguna cuenta se crea y ninguna petición sale a Supabase.
window.__qaErrores=[];window.addEventListener('error',e=>__qaErrores.push(e.message));
const qaUsuario={id:'00000000-0000-4000-8000-000000000001',email:'sintetico@ejemplo.test',user_metadata:{}};
const qaEstado={userName:'Persona sintética',tenant:'udd',carrera:'',onboardingDone:true,ramos:[
{id:'sintetico-a',nombre:'Álgebra sintética',color:'#7F77DD',creditos:null,categorias:[]},
{id:'sintetico-b',nombre:'Física sintética',color:'#1D9E75',creditos:null,categorias:[]}],historial:[]};
function qaConsulta(tabla){
 const resultado=()=>({data:tabla==='user_ramos'?{data:qaEstado}:null,error:null});
 const b={};for(const k of ['select','eq','neq','in','is','order','limit','update','upsert','insert','delete','gt','gte','lt','lte'])b[k]=()=>b;
 b.maybeSingle=async()=>resultado();b.single=async()=>resultado();b.then=(r,j)=>Promise.resolve({data:[],error:null}).then(r,j);return b;
}
window.supabase={createClient:()=>({
 auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),getSession:async()=>({data:{session:null},error:null}),signInWithPassword:async()=>({data:{user:qaUsuario,session:{user:qaUsuario}},error:null}),signOut:async()=>({error:null})},
 from:qaConsulta,
 rpc:async(nombre)=>{
  if(nombre==='profesor_por_codigo')return {data:[{nombre_publico:'Profesor sintético',id:'00000000-0000-4000-8000-000000000002'}],error:null};
  if(nombre==='mi_compartido_profesor')return {data:null,error:null};
  if(nombre==='compartir_con_profesor')return {data:null,error:{message:'QA no comparte datos'}};
  return {data:[],error:null};
 }
})};
window.qaEntrar=()=>{ponerModoAuth('login');document.getElementById('auth-user').value=qaUsuario.email;document.getElementById('auth-pass').value='Prueba-sintetica-123';document.getElementById('auth-btn').disabled=false;return submitAuth();};
'''
(public/'qa-transporte.js').write_text(mock)
p=public/'index.html';s=p.read_text();import re
s=re.sub(r'<script src="supabase.js"[^>]*></script>', '<script src="qa-transporte.js"></script>',s)
s=re.sub(r'<script async src="https://www.googletagmanager.com/[^>]+></script>','',s)
s=s.replace('<head>', '<head><meta http-equiv="Content-Security-Policy" content="connect-src \'none\';">')
p.write_text(s)
# Solo el relay QA traduce el esquema aislado a la NSUserActivity pública que
# normalmente entrega iOS. De ahí pasa por SceneDelegateProxy y @capacitor/app.
p=app/'App/SceneDelegate.swift';s=p.read_text()
s=s.replace('        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)', '''        if let url = connectionOptions.urlContexts.first?.url {
            var observador: NSObjectProtocol?
            observador = NotificationCenter.default.addObserver(forName: .capacitorViewDidAppear, object: nil, queue: .main) { _ in
                if let observador { NotificationCenter.default.removeObserver(observador) }
                _ = self.enlaceQA(url, scene: scene)
            }
        }
        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)''')
s=s.replace('        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)', '''        for contexto in URLContexts {
            if enlaceQA(contexto.url, scene: scene) { return }
        }
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)''')
s=s.replace('    func scene(_ scene: UIScene, continue userActivity:', '''    private func enlaceQA(_ url: URL, scene: UIScene) -> Bool {
        guard url.scheme == "cl.gradehub.enlacesqa" else { return false }
        if url.host == "entrar" {
            (window?.rootViewController as? MainViewController)?.webView?.evaluateJavaScript("qaEntrar(); true", completionHandler: nil)
        } else if let texto = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.first(where: { $0.name == "url" })?.value, let destino = URL(string: texto) {
            let actividad = NSUserActivity(activityType: NSUserActivityTypeBrowsingWeb)
            actividad.webpageURL = destino
            SceneDelegateProxy.shared.scene(scene, continue: actividad)
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
            let js = "JSON.stringify({sesion:!!currentUser,dueno:getCacheOwner(),pestana:currentTab,auth:document.getElementById('screen-auth').classList.contains('active'),titulo:document.getElementById('modal-titulo')?.textContent||'',modal:document.getElementById('modal').classList.contains('open'),pendiente:profePendiente(),ramos:S.ramos.map(r=>r.nombre),errores:window.__qaErrores})"
            (self.window?.rootViewController as? MainViewController)?.webView?.evaluateJavaScript(js) { valor, error in
                let destino = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("qa-enlace.json")
                try? (valor as? String ?? "{\\"error\\":\\"sin resultado JS\\"}").write(to: destino, atomically: true, encoding: .utf8)
            }
        }
        return true
    }

    func scene(_ scene: UIScene, continue userActivity:''')
p.write_text(s)
print(json.dumps({'proyecto':str(app/'App.xcodeproj'),'qa':str(qa)},ensure_ascii=False))
