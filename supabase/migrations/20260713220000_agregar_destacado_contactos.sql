-- Agrega la posibilidad de destacar/pinnear un contacto, para el
-- rediseño de PanelDetalle (Punto 3 del plan de rediseño).

alter table contactos add column destacado boolean not null default false;
