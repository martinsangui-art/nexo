alter table contactos drop constraint contactos_canal_check;

alter table contactos add constraint contactos_canal_check
  check (canal in ('email','whatsapp','llamada','presencial','video','agencia','oficina','comision'));
