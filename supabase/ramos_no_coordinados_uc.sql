-- TTF y BIO141C no son coordinados (Lucas, 2026-11-09). Aplicar a mano
-- después de pautas_sugeridas.sql. Reaplicable.
--
-- Su fila del registro de pautas queda, para que ningún consenso automático
-- los trate como ramos sin programa, pero marcada con coordinado:false: así
-- pautas_sugeridas sí devuelve sus reportes y la ficha ofrece las pautas de
-- cada profesor. Solo agrega la marca: no borra filas ni toca reportes. La
-- definición completa la deja `node bin/actualizar-registro-pautas.js` en
-- consenso_periodo.sql para la próxima vez que se aplique ese archivo.
update public.pautas_catalogo_registro
  set definicion=definicion||'{"coordinado":false}'::jsonb
  where tenant='uc' and clave in ('BIO141C','TTF012','TTF036','TTF109','TTF115','TTF116','TTF118','TTF202','TTF205','TTF206','TTF207','TTF208','TTF210','TTF211','TTF213','TTF215','TTF216','TTF217','TTF218','TTF219','TTF220','TTF222','TTF225','TTF226','TTF232','TTF233')
    and definicion->>'coordinado' is distinct from 'false';
