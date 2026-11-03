// Solo para reproductores explícitos de deuda académica, fuera de npm test.
const fs=require('fs'),vm=require('vm'),path=require('path');
module.exports=function(){
 const nodo={style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false}},addEventListener(){},appendChild(){},setAttribute(){},getAttribute(){return null},removeAttribute(){},querySelectorAll(){return[]},querySelector(){return nodo},dataset:{},value:'',innerHTML:''};
 const c={console,window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},document:{getElementById:()=>nodo,createElement:()=>nodo,querySelector:()=>nodo,querySelectorAll:()=>[],documentElement:nodo,body:nodo,addEventListener(){}},localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''},setTimeout(){},clearTimeout(){}};
 vm.createContext(c);for(const f of ['data.js','engine.js','app.js'])vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../..',f),'utf8'),c);
 c.run=s=>vm.runInContext(s,c);return c;
};
