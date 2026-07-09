-- ============================================================
-- NEXO — Objetivo de crecimiento de UDN: porcentual -> numérico
-- El PDF de Gerencia Comercial define el objetivo como % (146,53%), pero en
-- la práctica lo que se carga y se sigue mes a mes es una cantidad de
-- pólizas (el propio reporte destaca "Crecimiento Ac. pólizas: 210" como
-- número principal, el % es derivado). Se guarda como cantidad para que
-- el semáforo compare manzanas con manzanas contra crecimiento_ac_polizas.
-- ============================================================

alter table udn_objetivos_anuales add column objetivo_crecimiento_polizas integer;

-- Backfill por si ya hay algún registro cargado: reconstruye la cantidad a
-- partir del % y la base (redondeando), para no perder datos existentes.
update udn_objetivos_anuales
set objetivo_crecimiento_polizas = round(polizas_base_diciembre * objetivo_crecimiento_pct / 100)
where objetivo_crecimiento_polizas is null;

alter table udn_objetivos_anuales alter column objetivo_crecimiento_polizas set not null;
alter table udn_objetivos_anuales drop column objetivo_crecimiento_pct;
