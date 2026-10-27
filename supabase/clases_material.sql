-- Material de apoyo en los anuncios de clases particulares. Pedido de Lucas
-- del 2026-10-23: al publicar se elige entre clase particular y material de
-- apoyo (guías, apuntes, ejercicios resueltos).
--
-- Aplícalo en el SQL Editor de Supabase DESPUÉS de clases_particulares.sql y
-- clases_pack_descuento.sql, y ANTES de mergear el PR que lo usa. Es aditivo y
-- reaplicable: los anuncios que ya existen quedan como 'clase' y no cambian.
-- La app funciona con y sin este SQL: si no está, no ofrece material.
--
-- Las mismas sentencias están en clases_particulares.sql, para que reaplicar
-- ese archivo entero no le quite al tipo sus permisos (tests/clases-material-sql).

begin;

-- MATERIAL DE APOYO (2026-10-23, pedido de Lucas): un anuncio puede ser una
-- clase particular o material de apoyo (guías, apuntes, ejercicios resueltos).
-- Aditivo: toda fila existente queda como 'clase' y sigue igual. Mismas
-- sentencias que clases_material.sql, que sirve como delta: con `if not
-- exists`, aplicar cualquiera de los dos en cualquier orden deja lo mismo.
alter table public.tutor_anuncios add column if not exists tipo text not null default 'clase';
alter table public.tutor_anuncios drop constraint if exists tutor_anuncios_tipo_check;
alter table public.tutor_anuncios add constraint tutor_anuncios_tipo_check
  check (tipo in ('clase', 'material'));
-- Un material no tiene formato, lugar ni pack de clases.
alter table public.tutor_anuncios drop constraint if exists tutor_anuncios_material_coherente;
alter table public.tutor_anuncios add constraint tutor_anuncios_material_coherente
  check (tipo = 'clase' or (modalidad is null and ubicacion is null and pack_clases is null));
-- Contacto: la clase pagada, solo WhatsApp; la gratis, además Instagram o un
-- link. El material pagado puede llevar WhatsApp o un link para conseguirlo
-- (Drive, tienda); gratis, también Instagram. Toda fila existente sigue válida.
alter table public.tutor_anuncios drop constraint if exists tutor_anuncios_contacto_tipo_check;
alter table public.tutor_anuncios add constraint tutor_anuncios_contacto_tipo_check
  check (contacto_tipo = 'whatsapp'
         or (precio_clp = 0 and contacto_tipo in ('instagram', 'enlace'))
         or (tipo = 'material' and contacto_tipo = 'enlace'));

grant select (tipo) on public.tutor_anuncios to anon, authenticated;
grant insert (tipo) on public.tutor_anuncios to authenticated;
grant update (tipo) on public.tutor_anuncios to authenticated;

commit;
