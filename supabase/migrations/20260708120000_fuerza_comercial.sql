-- ============================================================
-- NEXO — Módulo Fuerza Comercial (Signos + Pólizas de Retiro)
-- organizador_codigos / organizador_kpis_generales / polizas (reemplazo)
-- ============================================================

-- Códigos alternativos por organizador (resuelve casos como BAROFFIO,
-- que opera bajo dos códigos Signos distintos: 62687 y 25080).
-- organizador_id es NOT NULL: el importador resuelve o crea el organizador
-- antes de escribir acá, así que nunca hace falta un código sin dueño.
create table organizador_codigos (
  id uuid primary key default gen_random_uuid(),
  organizador_id uuid not null references organizadores(id) on delete cascade,
  codigo_signos integer not null unique,
  es_principal boolean not null default false,
  nota text,
  created_at timestamptz not null default now()
);

-- Snapshot mensual de fuerza comercial (Seguros Generales + ART) por organizador,
-- parseado de los reportes Signos. Un organizador tiene hasta 3 filas por período
-- (ramo combinado, solo generales, solo ART). El ZIP puede incluir reportes tipo
-- "productor" (cartera de un productor individual dentro de la red de un
-- organizador) — el importador los detecta pero no los carga acá: esta tabla es
-- por-organizador, y trackear cada productor individual (podría haber decenas por
-- organizador) necesitaría una clave adicional que la spec no pidió. tipo_reporte
-- queda en el esquema para cuando se decida modelar eso.
create table organizador_kpis_generales (
  id uuid primary key default gen_random_uuid(),
  organizador_id uuid not null references organizadores(id) on delete cascade,
  periodo date not null,
  ramo text not null check (ramo in ('generales_art', 'generales', 'art')),
  tipo_reporte text not null check (tipo_reporte in ('organizador','productor')),
  productores integer,
  asegurados integer,
  polizas integer,
  certificados integer,
  prima_anualizada numeric,
  prima_emitida_mes numeric,
  siniestralidad numeric,
  frecuencia_siniestral numeric,
  fuente_archivo text,
  importado_en timestamptz not null default now(),
  unique (organizador_id, periodo, ramo)
);

-- La tabla polizas original (migración inicial) tenía un esquema especulativo
-- (poliza text, razon_social_org, razon_social_pas) sin uso real: ningún hook ni
-- componente la lee/escribe hoy. Se reemplaza por el esquema real del importador
-- semanal de pólizas de retiro (confirmado contra Bahía Blanca_0707.xlsx real).
drop table if exists polizas;

create table polizas (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  numero_poliza integer not null,
  estado text,
  cuil text,
  apellido text,
  nombre text,
  fecha_emision date,
  fecha_inicio_vigencia date,
  plan text,
  edad_retiro integer,
  tipo_renta text,
  premio_regular numeric,
  premio_anualizado numeric,
  forma_cobro text,
  provincia text,
  localidad text,
  organizador_id uuid references organizadores(id),
  codigo_org_origen integer,
  codigo_pas integer,
  razon_social_pas text,
  cuit_pas text,
  venta_directa boolean,
  importado_en timestamptz not null default now(),
  unique (numero_poliza, profile_id)
);

create index idx_organizador_kpis_organizador on organizador_kpis_generales(organizador_id, periodo);
create index idx_organizador_codigos_organizador on organizador_codigos(organizador_id);
create index idx_polizas_profile on polizas(profile_id);
create index idx_polizas_organizador on polizas(organizador_id);
create index idx_polizas_codigo_org_origen on polizas(codigo_org_origen);

alter table organizador_codigos enable row level security;
alter table organizador_kpis_generales enable row level security;
alter table polizas enable row level security;

-- organizador_codigos y organizador_kpis_generales no tienen profile_id propio
-- (son hijas de organizadores): el aislamiento por usuario se hace vía join,
-- mismo efecto que el patrón auth.uid() = profile_id del resto del schema.
create policy "organizador_codigos_all_own" on organizador_codigos
  for all using (
    exists (select 1 from organizadores o where o.id = organizador_codigos.organizador_id and o.profile_id = auth.uid())
  )
  with check (
    exists (select 1 from organizadores o where o.id = organizador_codigos.organizador_id and o.profile_id = auth.uid())
  );

create policy "organizador_kpis_generales_all_own" on organizador_kpis_generales
  for all using (
    exists (select 1 from organizadores o where o.id = organizador_kpis_generales.organizador_id and o.profile_id = auth.uid())
  )
  with check (
    exists (select 1 from organizadores o where o.id = organizador_kpis_generales.organizador_id and o.profile_id = auth.uid())
  );

create policy "polizas_all_own" on polizas
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
