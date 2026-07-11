-- Agrega las columnas que la UI (ModalNuevo, PanelDetalle) ya pedía pero
-- que nunca se persistían: contacto directo, plan comercial y notas de
-- seguimiento. Hasta ahora se perdían en cada creación/edición.

alter table especialistas
  add column tel text,
  add column email text,
  add column notas text,
  add column estrategia text,
  add column inconvenientes text,
  add column plan_desc text,
  add column plan_fecha_inicio date,
  add column plan_fecha_fin date,
  add column plan_polizas_obj integer not null default 0,
  add column plan_prima_obj numeric not null default 0,
  add column plan_com_pct numeric not null default 0;
