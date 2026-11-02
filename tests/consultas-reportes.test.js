// El export no mezcla la facultad con la universidad ni las pautas con reclamos.
// Tablas y cuentas inventadas; nunca copia el archivo adjunto de producción.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');

(async()=>{
  const db=new PGlite();
  try{
    await db.exec(`create table profiles(id text primary key,nombre text,universidad text);
      create table catalog_reports(id text primary key,created_at timestamptz,updated_at timestamptz,
        user_id text,tenant text,carrera text,ramo text,ramo_sigla text,ramo_norm text,nota text,estructura jsonb);
      create table reportes_programa(id text primary key,created_at timestamptz,tenant text,carrera text,
        ramo text,evaluacion text,descripcion text);
      insert into profiles values ('a','Cuenta A','U. Católica · Ingeniería'),
        ('b','Cuenta B','U. de Chile · FEN'),('c','Cuenta C','U. de los Andes');
      insert into catalog_reports values
        ('1','2026-10-20 12:00Z','2026-11-01 12:00Z','a','uc','Derecho','Ramo A','ABC100','ramo a',null,'[]'),
        ('2','2026-10-21 12:00Z','2026-10-21 12:00Z','b','fen','Carrera B','Ramo B',null,'ramo b',null,'[]'),
        ('3','2026-10-22 12:00Z','2026-10-22 12:00Z','c','uc','Carrera C','Ramo C',null,'ramo c',null,'[]'),
        ('4','2026-10-23 12:00Z','2026-10-23 12:00Z','sin-perfil','uai',null,'Ramo D',null,'ramo d',null,'[]'),
        ('5','2026-10-24 12:00Z','2026-10-24 12:00Z','sin-perfil','uandes',null,'Ramo E',null,'ramo e',null,'[]'),
        ('6','2026-10-25 12:00Z','2026-10-25 12:00Z','a','desconocido',null,'Ramo F',null,'ramo f',null,'[]');
      insert into reportes_programa values
        ('rep1','2026-10-15 01:30Z','uc','Derecho','Ramo A','Prueba 1','Diferencia sintética'),
        ('rep2','2026-10-16 12:00Z','fen','Carrera B','Ramo B',null,'Otra diferencia sintética');`);
    const sql=fs.readFileSync(path.join(__dirname,'../docs/consultas-reportes.sql'),'utf8');
    const ejecutar=()=>db.exec(sql);
    const [catalogo,programas]=await ejecutar();
    assert.equal(catalogo.rows.length,6,'LEFT JOIN conserva reportes sin perfil');
    const porId=Object.fromEntries(catalogo.rows.map(r=>[r.id,r]));
    assert.equal(porId['1'].universidad,'U. Católica');
    assert.equal(porId['1'].carrera,'Derecho');
    assert.equal(porId['2'].universidad,'U. de Chile');
    assert.equal(porId['3'].universidad,'U. Católica','manda el tenant del reporte, aunque cambie el perfil');
    assert.equal(porId['4'].universidad,'U. Adolfo Ibáñez');
    assert.equal(porId['5'].universidad,'U. de los Andes');
    assert.equal(porId['6'].universidad,null,'no inventa universidad para un tenant desconocido');
    assert.deepEqual(Object.keys(porId['1']),['id','created_at','updated_at','user_id','nombre',
      'universidad','tenant','carrera','ramo','ramo_sigla','ramo_norm','nota','estructura']);
    assert.deepEqual(catalogo.rows.map(r=>r.id),['6','5','4','3','2','1'],'ordena por creación, no por actualización');
    assert.deepEqual(programas.rows.map(r=>r.id),['rep2','rep1'],'consulta los mensajes, incluidos los antiguos');
    assert.equal(programas.rows[0].universidad,'U. de Chile');
    assert.equal(programas.rows[1].universidad,'U. Católica');
    // Verifica el reloj local dentro de Postgres: PGlite convierte timestamp
    // sin zona a Date usando la zona del proceso que corre el test.
    const consultaProgramas=sql.slice(sql.indexOf('select\n  rp.id')).trim().replace(/;$/,'');
    const local=await db.query(`select to_char(fecha_envio_chile,'YYYY-MM-DD HH24:MI:SS') as fecha
      from (${consultaProgramas}) r where id='rep1'`);
    assert.equal(local.rows[0].fecha,'2026-10-14 22:30:00');
    assert.equal(new Date(programas.rows[1].created_at).toISOString(),'2026-10-15T01:30:00.000Z');
    assert.deepEqual(await ejecutar(),[catalogo,programas],'repetir la consulta no recrea ni actualiza reportes');
    console.log('PASS: consultas de reportes, universidad y fechas de envío');
  }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
