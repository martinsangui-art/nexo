alter table organizadores drop column especialista_id;

alter table especialistas add column organizador_id uuid references organizadores(id) on delete set null;
alter table especialistas add column es_externo boolean not null default false;

-- Parche momentáneo: los especialistas ya cargados (ej. "Fasto S") no tienen
-- organizador todavía, así que quedan marcados como externos para cumplir
-- el constraint de abajo. Reasignar desde la UI cuando se carguen organizaciones reales.
-- Se corre ANTES del constraint (a diferencia del pedido original) porque el
-- check se valida contra las filas existentes al momento de crearse, y si se
-- corriera después la migración fallaría y no se aplicaría nada.
update especialistas set es_externo = true where organizador_id is null;

alter table especialistas add constraint especialista_organizacion_check
  check (
    (organizador_id is not null and es_externo = false)
    or
    (organizador_id is null and es_externo = true)
  );

create index idx_especialistas_organizador on especialistas(organizador_id);
