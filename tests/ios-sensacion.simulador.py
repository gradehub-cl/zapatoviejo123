from pathlib import Path
import shutil,re,json,tempfile,argparse
parser=argparse.ArgumentParser(description='Prepara XCTest aislado, con datos sintéticos y red bloqueada. Ejecuta ios:preparar antes.');parser.add_argument('--raiz',type=Path,default=Path(__file__).resolve().parents[1]);args=parser.parse_args();root=args.raiz.resolve();qa=Path(tempfile.mkdtemp(prefix='gh-nativa-ui-'))
app=qa/'App'
shutil.copytree(root/'ios/App',app,ignore=shutil.ignore_patterns('build','xcuserdata','Firma.local.xcconfig'))
shutil.copy2(root/'ios/debug.xcconfig',qa/'debug.xcconfig')
public=app/'App/public'
pack=app/'CapApp-SPM/Package.swift';s=pack.read_text();s=re.sub(r'path: "[^"]*/node_modules/', 'path: "'+str((root/'node_modules').resolve())+'/',s);pack.write_text(s)
state={'ramos':[{'id':'qa-ramo','nombre':'Curso sintético','sigla':'SYN101','creditos':10,'color':'#0d7a6b','categorias':[{'id':'qa-prueba','nombre':'Prueba','peso':50,'notas':[{'id':'qa-nota','nombre':'Prueba','peso':1,'valor':5.2}]},{'id':'qa-controles','nombre':'Controles','peso':50,'slots':10,'notas':[]}]}],'historial':[],'userName':'Estudiante sintético','careerSemestre':1,'carrera':'ING-PC','tenant':'uc','onboardingDone':True,'modo':'sistema','sortMode':'manual'}
fixture='''<script>
localStorage.setItem('gradehub_sombras','0');localStorage.setItem('gradehub_v1',JSON.stringify(ESTADO));localStorage.setItem('gradehub_cache_owner','11111111-2222-4333-8444-555555555555');
if(window.__QA_OFFLINE)Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false});
const qaUsuario={id:'11111111-2222-4333-8444-555555555555',user_metadata:{full_name:'Estudiante sintético'}};
const qaFallo={data:null,error:{message:'Sin red sintética',code:'PGRST202'}};
function qaCadena(){return new Proxy({}, {get:(t,k)=>k==='then'?(a,b)=>Promise.resolve(qaFallo).then(a,b):()=>qaCadena()})}
window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:window.__QA_SIN_SESION?null:{user:qaUsuario}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal1'}})}},rpc:async()=>qaFallo,from:()=>qaCadena()})};
window.__qaIniciado=performance.now();
async function qaEstado(){if(typeof prefersDark!=='function')return;const barra=await Capacitor.Plugins.StatusBar.getInfo();document.title='QA modo '+(prefersDark()?'oscuro':'claro')+' barra '+barra.style+' movimiento '+(matchMedia('(prefers-reduced-motion:reduce)').matches?'reducido':'completo');window.webkit?.messageHandlers?.qa?.postMessage({evento:'estado',titulo:document.title,barra})}setInterval(()=>qaEstado().catch(()=>{}),1000);
const qaM=matchMedia('(prefers-reduced-motion:reduce)');function qaMovimiento(){window.webkit?.messageHandlers?.qa?.postMessage({evento:'movimiento',reducido:qaM.matches,animacion:getComputedStyle(document.querySelector('.scroll')).animationName,transicion:getComputedStyle(document.querySelector('.scroll')).transitionDuration})}qaM.addEventListener('change',qaMovimiento);
const qaArranque=new MutationObserver(()=>{if(!document.getElementById('arranque')){qaArranque.disconnect();requestAnimationFrame(()=>requestAnimationFrame(()=>window.webkit?.messageHandlers?.qa?.postMessage({evento:'lista',ms:performance.now(),sinSesion:!!window.__QA_SIN_SESION})))}});qaArranque.observe(document.body,{childList:true,subtree:true});
document.addEventListener('DOMContentLoaded',()=>{
 window.matchMedia('(prefers-color-scheme:dark)').addEventListener('change',()=>setTimeout(async()=>window.webkit?.messageHandlers?.qa?.postMessage({evento:'apariencia',oscuro:prefersDark(),barra:await Capacitor.Plugins.StatusBar?.getInfo()}),400));
 document.addEventListener('click',()=>setTimeout(()=>window.webkit?.messageHandlers?.qa?.postMessage({evento:'clic',foco:document.activeElement?.tagName,ramo:document.getElementById('screen-ramo').className,clases:document.documentElement.className,alto:innerHeight}),100));
 const real=soltarSplash;soltarSplash=()=>{window.webkit?.messageHandlers?.qa?.postMessage({evento:'splash',ms:performance.now(),lista:!!document.querySelector('#screen-home.active,#screen-auth.active,#screen-loading.active')});return real()};
 setTimeout(qaMovimiento,700);
 setTimeout(()=>window.webkit?.messageHandlers?.qa?.postMessage({evento:'vista',ms:performance.now(),modo:getComputedStyle(document.documentElement).getPropertyValue('--bg'),seleccionSigla:getComputedStyle(document.getElementById('ramo-subtitulo')).webkitUserSelect,alto:innerHeight}),1000);
});
</script>'''.replace('ESTADO',json.dumps(state,ensure_ascii=False))
p=public/'index.html';s=p.read_text();s=re.sub(r'<script async src="https://www.googletagmanager.com/[^>]+></script>','',s);s=re.sub(r'<script src="(?:supabase.js|https://cdn.jsdelivr.net/npm/@supabase/supabase-js[^\"]*)"[^>]*>\s*</script>',fixture,s);assert 'qaCadena' in s;s=s.replace('<head>','<head><meta http-equiv="Content-Security-Policy" content="connect-src \'none\';">');p.write_text(s)
p=app/'App/MainViewController.swift';s=p.read_text().replace('import Capacitor','import Capacitor\nimport WebKit');s=s.replace('class MainViewController: CAPBridgeViewController {','class MainViewController: CAPBridgeViewController {\n    private let recorder = QARecorder()')
s=s.replace('        bridge?.registerPluginInstance(GradeHubWidgetsPlugin())','''        bridge?.registerPluginInstance(GradeHubWidgetsPlugin())
        let offline = ProcessInfo.processInfo.arguments.contains("-qaOffline")
        let sinSesion = ProcessInfo.processInfo.arguments.contains("-qaSinSesion")
        webView?.configuration.userContentController.addUserScript(WKUserScript(source: "window.__QA_OFFLINE=\\(offline);window.__QA_SIN_SESION=\\(sinSesion);", injectionTime: .atDocumentStart, forMainFrameOnly: true))
        webView?.configuration.userContentController.add(recorder, name: "qa")''')
s+='''
class QARecorder: NSObject, WKScriptMessageHandler {
 func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
  guard var payload=message.body as? [String:Any] else {return};payload["movimientoNativo"]=UIAccessibility.isReduceMotionEnabled;guard let data=try? JSONSerialization.data(withJSONObject:payload) else {return}
  let url = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("qa.jsonl")
  if !FileManager.default.fileExists(atPath: url.path) { FileManager.default.createFile(atPath: url.path, contents: nil) }
  if let handle = try? FileHandle(forWritingTo: url) { handle.seekToEndOfFile(); handle.write(data); handle.write(Data([10]));try? handle.close() }
 }
}
''';p.write_text(s)
ui=app/'UITests';ui.mkdir();(ui/'NativeUI.swift').write_text('''import XCTest
final class NativeUI: XCTestCase {
 let app = XCUIApplication(bundleIdentifier: "cl.gradehub.nativeqa")
 func foto(_ nombre:String){let a=XCTAttachment(screenshot:XCUIScreen.main.screenshot());a.name=nombre;a.lifetime = .keepAlways;add(a)}
 func testPantallas() throws {
  continueAfterFailure=false;app.launch();XCTAssertTrue(app.buttons["Inicio"].waitForExistence(timeout:15));foto("inicio")
  app.buttons["Inicio"].press(forDuration:1.2);XCTAssertFalse(app.menuItems["Copiar"].exists);XCTAssertFalse(app.buttons["Copiar"].exists);XCTAssertFalse(app.menuItems["Copy"].exists)
  let curso=app.buttons.matching(NSPredicate(format:"label CONTAINS %@", "Curso sintético")).firstMatch
  XCTAssertTrue(curso.waitForExistence(timeout:5));curso.tap();foto("ficha")

  let grupo=app.buttons.matching(NSPredicate(format:"label CONTAINS %@", "Controles")).firstMatch
  let cabecera=app.buttons["Volver"].frame
  XCTAssertTrue(grupo.exists);grupo.tap()
  XCTAssertTrue(app.buttons.matching(NSPredicate(format:"label BEGINSWITH %@","Anotar nota de")).firstMatch.waitForExistence(timeout:5))
  var ultimo=app.buttons.matching(NSPredicate(format:"label BEGINSWITH %@","Anotar nota de")).allElementsBoundByIndex.last!
  for _ in 0..<8 {if ultimo.isHittable {break};app.swipeUp();ultimo=app.buttons.matching(NSPredicate(format:"label BEGINSWITH %@","Anotar nota de")).allElementsBoundByIndex.last!}
  XCTAssertEqual(app.buttons["Volver"].frame.minY,cabecera.minY,accuracy:1)
  XCTAssertTrue(ultimo.isHittable);ultimo.tap();XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout:5));foto("editor-teclado")

  let campo=app.textFields.matching(NSPredicate(format:"label BEGINSWITH %@","Anotar nota de")).firstMatch
  XCTAssertTrue(campo.exists);XCTAssertLessThanOrEqual(campo.frame.maxY,app.keyboards.firstMatch.frame.minY-4)
  campo.typeText("5,7")
  app.buttons["Volver"].tap();foto("tras-volver");XCTAssertTrue(app.buttons["Inicio"].waitForExistence(timeout:5))
  let menu=app.descendants(matching:.any).matching(NSPredicate(format:"label == %@","Menú de usuario")).firstMatch

  XCTAssertTrue(menu.exists);menu.tap()
  app.buttons["Ajustes"].tap();foto("hoja")
  let buscar=app.searchFields.firstMatch
  XCTAssertTrue(buscar.exists);buscar.tap();XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout:5));XCTAssertLessThanOrEqual(buscar.frame.maxY,app.keyboards.firstMatch.frame.minY-4);if app.buttons["Continue"].exists {app.buttons["Continue"].tap()};foto("hoja-teclado")

 }
 func testAparienciaAbierta(){
  continueAfterFailure=false;app.launch();XCTAssertTrue(app.buttons["Inicio"].waitForExistence(timeout:15))
  app.descendants(matching:.any).matching(NSPredicate(format:"label == %@","Menú de usuario")).firstMatch.tap();app.buttons["Ajustes"].tap()
  let opcion=app.buttons.matching(NSPredicate(format:"label BEGINSWITH %@","Apariencia")).firstMatch
  for _ in 0..<3 {if opcion.isHittable {break};app.swipeUp()};XCTAssertTrue(opcion.exists);opcion.tap()
  app.buttons["Claro"].tap();XCTAssertTrue(app.descendants(matching:.any).matching(NSPredicate(format:"label CONTAINS %@","QA modo claro barra LIGHT")).firstMatch.waitForExistence(timeout:5));foto("cambio-abierta-claro")
  app.buttons["Oscuro"].tap();XCTAssertTrue(app.descendants(matching:.any).matching(NSPredicate(format:"label CONTAINS %@","QA modo oscuro barra DARK")).firstMatch.waitForExistence(timeout:5));foto("cambio-abierta-oscuro")
 }
 func testCopiarSigla(){
  continueAfterFailure=false;app.launch();XCTAssertTrue(app.buttons["Inicio"].waitForExistence(timeout:15))
  app.buttons.matching(NSPredicate(format:"label CONTAINS %@","Curso sintético")).firstMatch.tap()
  let sigla=app.staticTexts.matching(NSPredicate(format:"label == %@","SYN101 · 10 créditos")).allElementsBoundByIndex.first
  XCTAssertNotNil(sigla);sigla!.press(forDuration:1.2)
  let copiar=app.menuItems.matching(NSPredicate(format:"label == 'Copy' OR label == 'Copiar'")).firstMatch
  XCTAssertTrue(copiar.waitForExistence(timeout:3));foto("sigla-copiable")
 }
 func testArranque(){
  for _ in 0..<3 {app.launchArguments=[];app.launch();XCTAssertTrue(app.buttons["Inicio"].waitForExistence(timeout:15));app.terminate()}
  for _ in 0..<3 {app.launchArguments=["-qaSinSesion"];app.launch();XCTAssertTrue(app.buttons["Continuar con Google"].waitForExistence(timeout:15));Thread.sleep(forTimeInterval:2.5);app.terminate()}
 }
 func ajustarMovimiento(_ control:XCUIElement,_ valor:String){
  for _ in 0..<3 {if control.value as? String == valor {return};control.coordinate(withNormalizedOffset:CGVector(dx:0.92,dy:0.5)).tap();let esperado=XCTNSPredicateExpectation(predicate:NSPredicate(format:"value == %@",valor),object:control);if XCTWaiter.wait(for:[esperado],timeout:1) == .completed {return}}
  XCTAssertEqual(control.value as? String,valor)
 }
 func testMovimientoSistema(){
  continueAfterFailure=false
  let ajustes=XCUIApplication(bundleIdentifier:"com.apple.Preferences");ajustes.launch()
  for _ in 0..<4 {if ajustes.navigationBars["Settings"].exists {break};let volver=ajustes.navigationBars.buttons.firstMatch;if !volver.exists {break};volver.tap()}
  let acceso=ajustes.descendants(matching:.any).matching(NSPredicate(format:"label == %@","Accessibility")).firstMatch
  for _ in 0..<8 {if acceso.isHittable {break};ajustes.swipeUp()}
  XCTAssertTrue(acceso.exists);acceso.tap()
  let movimiento=ajustes.descendants(matching:.any).matching(NSPredicate(format:"label == %@","Motion")).firstMatch
  XCTAssertTrue(movimiento.waitForExistence(timeout:5));movimiento.tap()
  let control=ajustes.switches["Reduce Motion"];XCTAssertTrue(control.waitForExistence(timeout:5))
  let anterior=control.value as? String
  print("QA MOTION anterior: \(String(describing:anterior))")
  if anterior == "0" {ajustarMovimiento(control,"1")};print("QA MOTION después: \(String(describing:control.value))");XCTAssertEqual(control.value as? String,"1")
  defer {if anterior == "0" {ajustes.activate();XCTAssertTrue(control.waitForExistence(timeout:5));ajustarMovimiento(control,"0")};app.activate()}
  app.launchArguments=[];app.launch();XCTAssertTrue(app.buttons["Inicio"].waitForExistence(timeout:15))
  XCTAssertTrue(app.descendants(matching:.any).matching(NSPredicate(format:"label CONTAINS %@","movimiento reducido")).firstMatch.waitForExistence(timeout:5))
  app.buttons.matching(NSPredicate(format:"label CONTAINS %@","Curso sintético")).firstMatch.tap();foto("movimiento-reducido")
 }
 func testSinRed(){
  app.launchArguments=["-qaOffline"];app.launch();XCTAssertTrue(app.buttons["Inicio"].waitForExistence(timeout:15));
  XCTAssertTrue(app.staticTexts["Sin conexión · tus cambios quedan en este iPhone."].waitForExistence(timeout:5));foto("modo-avion")
 }
}
''')
# Un target de UI solo en la copia temporal. No se modifica el proyecto del repo.
pbx=app/'App.xcodeproj/project.pbxproj';s=pbx.read_text();ids={k:'F7C1000000000000000000'+f'{i:02X}' for i,k in enumerate(['file','build','product','group','sources','frameworks','resources','target','debug','release','config'],1)}
def insertar(sec,txt):
 global s
 s=s.replace('/* End '+sec+' section */',txt+'\n/* End '+sec+' section */')
insertar('PBXFileReference',f'{ids["file"]} = {{isa=PBXFileReference;lastKnownFileType=sourcecode.swift;path=NativeUI.swift;sourceTree="<group>";}};\n{ids["product"]} = {{isa=PBXFileReference;explicitFileType=wrapper.cfbundle;path=NativeUI.xctest;sourceTree=BUILT_PRODUCTS_DIR;}};')
insertar('PBXBuildFile',f'{ids["build"]} = {{isa=PBXBuildFile;fileRef={ids["file"]};}};')
insertar('PBXGroup',f'{ids["group"]} = {{isa=PBXGroup;children=({ids["file"]},);path=UITests;sourceTree="<group>";}};')
s=s.replace('504EC2FB1FED79650016851F = {\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (','504EC2FB1FED79650016851F = {\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (\n'+ids['group']+',')
for sec,key in [('PBXSourcesBuildPhase','sources'),('PBXFrameworksBuildPhase','frameworks'),('PBXResourcesBuildPhase','resources')]:insertar(sec,f'{ids[key]} = {{isa={sec};buildActionMask=2147483647;files=({ids["build"]+"," if key=="sources" else ""});runOnlyForDeploymentPostprocessing=0;}};')
insertar('PBXNativeTarget',f'{ids["target"]} = {{isa=PBXNativeTarget;buildConfigurationList={ids["config"]};buildPhases=({ids["sources"]},{ids["frameworks"]},{ids["resources"]},);dependencies=();name=NativeUI;productName=NativeUI;productReference={ids["product"]};productType="com.apple.product-type.bundle.ui-testing";}};')
s=s.replace('targets = (','targets = (\n'+ids['target']+',',1)
for k in ['debug','release']:insertar('XCBuildConfiguration',f'{ids[k]} = {{isa=XCBuildConfiguration;buildSettings={{GENERATE_INFOPLIST_FILE=YES;PRODUCT_NAME="$(TARGET_NAME)";PRODUCT_BUNDLE_IDENTIFIER="$(GRADEHUB_BUNDLE_ID).uitests";IPHONEOS_DEPLOYMENT_TARGET=17.0;SWIFT_VERSION=5.0;TARGETED_DEVICE_FAMILY=1;TEST_TARGET_NAME=App;TEST_TARGET_BUNDLE_IDENTIFIER="$(GRADEHUB_BUNDLE_ID)";SDKROOT=iphoneos;}};name={k.title()};}};')
insertar('XCConfigurationList',f'{ids["config"]} = {{isa=XCConfigurationList;buildConfigurations=({ids["debug"]},{ids["release"]},);defaultConfigurationIsVisible=0;defaultConfigurationName=Release;}};');pbx.write_text(s)
def ref(i,name,product):return f'<BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="{i}" BuildableName="{product}" BlueprintName="{name}" ReferencedContainer="container:App.xcodeproj"/>'
rapp=ref('504EC3031FED79650016851F','App','App.app');rui=ref(ids['target'],'NativeUI','NativeUI.xctest');schemes=app/'App.xcodeproj/xcshareddata/xcschemes';schemes.mkdir(parents=True,exist_ok=True)
(schemes/'QA.xcscheme').write_text(f'''<?xml version="1.0" encoding="UTF-8"?><Scheme LastUpgradeVersion="2700" version="1.3"><BuildAction parallelizeBuildables="NO" buildImplicitDependencies="YES"><BuildActionEntries><BuildActionEntry buildForTesting="YES" buildForRunning="YES" buildForProfiling="NO" buildForArchiving="NO" buildForAnalyzing="NO">{rapp}</BuildActionEntry><BuildActionEntry buildForTesting="YES" buildForRunning="NO" buildForProfiling="NO" buildForArchiving="NO" buildForAnalyzing="NO">{rui}</BuildActionEntry></BuildActionEntries></BuildAction><TestAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" shouldUseLaunchSchemeArgsEnv="YES"><Testables><TestableReference skipped="NO">{rui}</TestableReference></Testables><MacroExpansion>{rapp}</MacroExpansion></TestAction><LaunchAction buildConfiguration="Debug"><BuildableProductRunnable runnableDebuggingMode="0">{rapp}</BuildableProductRunnable></LaunchAction></Scheme>''')
print('QA temporal:',qa);print('Proyecto:',app/'App.xcodeproj');print('Solo cl.gradehub.nativeqa, sin cuenta ni red reales. No modifica ios/App del repositorio.')
