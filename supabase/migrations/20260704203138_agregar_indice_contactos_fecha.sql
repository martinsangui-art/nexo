-- Índice compuesto para la query más común:
-- "último contacto por especialista, ordenado por fecha desc"
create index idx_contactos_especialista_fecha
  on contactos(especialista_id, fecha desc);
