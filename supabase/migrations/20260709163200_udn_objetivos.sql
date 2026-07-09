-- ============================================================
-- NEXO — Objetivos de UDN (Unidad de Negocios)
-- Objetivo anual fijo (impuesto por Gerencia Comercial en diciembre del año
-- anterior) + avance mensual, cargado a mano desde OBI. Es un nivel de
-- gestión distinto del "plan comercial" de cada especialista: el plan de
-- cada especialista es un aporte al objetivo de la UDN, no la misma cosa.
-- ============================================================

-- Un registro por año (y por UDN, si en algún momento se maneja más de una).
-- Los objetivos son fijos durante el año, pero no se asume inmutabilidad a
-- nivel de base — si Gerencia Comercial los revisa, se edita el registro.
create table udn_objetivos_anuales (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  anio integer not null,
  nombre_udn text not null,
  polizas_base_diciembre integer not null,
  objetivo_crecimiento_pct numeric not null,
  objetivo_premio_promedio_min numeric,
  objetivo_tasa_rescate_max numeric,
  creado_en timestamptz not null default now(),
  unique (profile_id, anio, nombre_udn)
);

-- Un registro por mes. Los 5 números se cargan tal cual figuran en el
-- reporte de OBI/Gerencia Comercial — a propósito no se recalculan acá
-- adentro, para que nunca haya un desvío entre lo que dice NEXO y lo que
-- dice el reporte oficial.
create table udn_avance_mensual (
  id uuid primary key default gen_random_uuid(),
  udn_objetivo_id uuid not null references udn_objetivos_anuales(id) on delete cascade,
  periodo date not null,
  crecimiento_ac_polizas integer,
  crecimiento_acumulado_pct numeric,
  avance_objetivo_pct numeric,
  premio_promedio_acumulado numeric,
  tasa_rescate_acumulada numeric,
  notas text,
  cargado_en timestamptz not null default now(),
  unique (udn_objetivo_id, periodo)
);

create index idx_udn_objetivos_profile on udn_objetivos_anuales(profile_id, anio desc);
create index idx_udn_avance_objetivo on udn_avance_mensual(udn_objetivo_id, periodo desc);

alter table udn_objetivos_anuales enable row level security;
alter table udn_avance_mensual enable row level security;

create policy "udn_objetivos_anuales_all_own" on udn_objetivos_anuales
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- udn_avance_mensual no tiene profile_id propio — se aisla vía join, mismo
-- patrón que organizador_codigos/organizador_kpis_generales.
create policy "udn_avance_mensual_all_own" on udn_avance_mensual
  for all using (
    exists (select 1 from udn_objetivos_anuales u where u.id = udn_avance_mensual.udn_objetivo_id and u.profile_id = auth.uid())
  )
  with check (
    exists (select 1 from udn_objetivos_anuales u where u.id = udn_avance_mensual.udn_objetivo_id and u.profile_id = auth.uid())
  );
