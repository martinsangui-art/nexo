-- ============================================================
-- NEXO — objetivo de UDN: se piensa/carga como TOTAL, no como incremento
-- Verificado con el usuario: 1102 es el objetivo final a diciembre 2026
-- (447 base x 2,4653 = 1102), no una cantidad a sumarle a los 447. El
-- incremental (655) se sigue usando para el semáforo/pacing, pero se
-- deriva restando la base en la aplicación, no se carga a mano.
-- ============================================================

alter table udn_objetivos_anuales rename column objetivo_crecimiento_polizas to objetivo_polizas_diciembre;
