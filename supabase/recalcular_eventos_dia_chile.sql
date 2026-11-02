-- sql-produccion: manual
-- Una sola vez, después de metricas_dia_chile.sql. Reaplicar luego es un no-op.
-- Solo grupos íntegros: nunca estima fechas si faltan recibos por retención/borrado.
begin;
create table if not exists admin.eventos_dia_chile_recalculo (
 unico boolean primary key default true check(unico),
 completado_at timestamptz not null default now(),
 grupos integer not null,filas_antes integer not null,filas_despues integer not null
);
alter table admin.eventos_dia_chile_recalculo enable row level security;
revoke all on admin.eventos_dia_chile_recalculo from public,anon,authenticated;
create table if not exists admin.eventos_dia_chile_respaldo (
 anuncio_id uuid not null references public.tutor_anuncios(id) on delete cascade,
 publicacion timestamptz not null,dia date not null,tipo text not null,eventos bigint not null,
 primary key(anuncio_id,publicacion,dia,tipo)
);
alter table admin.eventos_dia_chile_respaldo enable row level security;
revoke all on admin.eventos_dia_chile_respaldo from public,anon,authenticated;
do $$
declare grupos integer;antes integer;despues integer;
begin
 if exists(select 1 from admin.eventos_dia_chile_recalculo) then return; end if;
 if to_regclass('admin.anuncio_dias_chile_inicio') is null then raise exception 'aplica primero metricas_dia_chile.sql'; end if;
 lock table public.anuncio_eventos_recibos,public.anuncio_eventos_diarios in share row exclusive mode;
 if exists(select 1 from admin.eventos_dia_chile_recalculo) then return; end if;
 create temporary table eventos_chile_completos on commit drop as
   with recibos as (select anuncio_id,publicacion,tipo,count(*) n from public.anuncio_eventos_recibos group by 1,2,3),
        totales as (select anuncio_id,publicacion,tipo,sum(eventos) n from public.anuncio_eventos_diarios group by 1,2,3)
   select r.anuncio_id,r.publicacion,r.tipo from recibos r join totales t using(anuncio_id,publicacion,tipo) where r.n=t.n;
 select count(*) into grupos from eventos_chile_completos;
 insert into admin.eventos_dia_chile_respaldo
   select d.anuncio_id,d.publicacion,d.dia,d.tipo,d.eventos from public.anuncio_eventos_diarios d join eventos_chile_completos g using(anuncio_id,publicacion,tipo)
   on conflict do nothing;
 delete from public.anuncio_eventos_diarios d using eventos_chile_completos g
   where d.anuncio_id=g.anuncio_id and d.publicacion=g.publicacion and d.tipo=g.tipo;
 get diagnostics antes=row_count;
 insert into public.anuncio_eventos_diarios(anuncio_id,publicacion,dia,tipo,eventos)
   select r.anuncio_id,r.publicacion,(r.creado_at at time zone 'America/Santiago')::date,r.tipo,count(*)
   from public.anuncio_eventos_recibos r join eventos_chile_completos g using(anuncio_id,publicacion,tipo)
   group by 1,2,3,4;
 get diagnostics despues=row_count;
 insert into admin.eventos_dia_chile_recalculo(unico,grupos,filas_antes,filas_despues) values(true,grupos,antes,despues);
end;
$$;
select grupos,filas_antes,filas_despues,completado_at from admin.eventos_dia_chile_recalculo;
commit;
