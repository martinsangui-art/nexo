-- ============================================================
-- NEXO — Historial de importaciones (Fuerza Comercial)
-- Guarda el estado ANTERIOR de cada fila que un importador (Excel de
-- pólizas o ZIP Signos) pisa, para poder reconstruirlo a mano si un
-- archivo viene corrupto o se cargó mal. No es un "undo" automático
-- (eso implica lógica de restauración con sus propios riesgos, ver
-- discusión del 9/7) — por ahora esto es la red de seguridad: los datos
-- de antes quedan guardados, aunque restaurarlos hoy sea manual.
-- ============================================================

-- Una fila por corrida de importador.
-- `resumen` se completa después de escribir los datos (recién ahí se
-- sabe cuántas filas nuevas/actualizadas hubo).
create table importaciones (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  tipo text not null check (tipo in ('polizas', 'signos')),
  archivo text,
  resumen jsonb,
  creado_en timestamptz not null default now()
);

-- Snapshot del valor ANTERIOR de cada póliza que una importación pisa.
-- tipo_cambio='nueva': la póliza no existía, no hay snapshot (deshacerla
-- es simplemente borrar la fila de `polizas`).
-- tipo_cambio='actualizada': snapshot trae la fila completa como estaba
-- antes de este import.
-- Sin FK a polizas.id a propósito: el historial tiene que sobrevivir
-- aunque la póliza se borre o se reimporte después. profile_id queda
-- desnormalizado acá (igual que en `polizas`) para poder aislar por RLS
-- sin depender de un join a `importaciones`.
create table polizas_historial (
  id uuid primary key default gen_random_uuid(),
  importacion_id uuid not null references importaciones(id) on delete cascade,
  numero_poliza integer not null,
  profile_id uuid not null references profiles(id) on delete cascade,
  tipo_cambio text not null check (tipo_cambio in ('nueva', 'actualizada')),
  snapshot jsonb,
  creado_en timestamptz not null default now()
);

-- Mismo patrón para organizador_kpis_generales (prioridad menor: estos
-- datos cambian poco mes a mes y no alimentan la evaluación del
-- especialista — ver nota en importarSignos.js — pero el costo de
-- guardarlos es el mismo que para pólizas, así que se hace igual).
-- No tiene profile_id propio (como organizador_kpis_generales tampoco lo
-- tiene): se aisla vía join a importaciones.
create table kpis_historial (
  id uuid primary key default gen_random_uuid(),
  importacion_id uuid not null references importaciones(id) on delete cascade,
  organizador_id uuid not null references organizadores(id) on delete cascade,
  periodo date not null,
  ramo text not null,
  tipo_cambio text not null check (tipo_cambio in ('nueva', 'actualizada')),
  snapshot jsonb,
  creado_en timestamptz not null default now()
);

create index idx_importaciones_profile on importaciones(profile_id, creado_en desc);
create index idx_polizas_historial_importacion on polizas_historial(importacion_id);
create index idx_polizas_historial_numero on polizas_historial(numero_poliza, profile_id);
create index idx_kpis_historial_importacion on kpis_historial(importacion_id);
create index idx_kpis_historial_organizador on kpis_historial(organizador_id, periodo, ramo);

alter table importaciones enable row level security;
alter table polizas_historial enable row level security;
alter table kpis_historial enable row level security;

create policy "importaciones_all_own" on importaciones
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "polizas_historial_all_own" on polizas_historial
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "kpis_historial_all_own" on kpis_historial
  for all using (
    exists (select 1 from importaciones i where i.id = kpis_historial.importacion_id and i.profile_id = auth.uid())
  )
  with check (
    exists (select 1 from importaciones i where i.id = kpis_historial.importacion_id and i.profile_id = auth.uid())
  );
