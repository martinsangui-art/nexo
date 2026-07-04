-- ============================================================
-- NEXO — Migración inicial
-- profiles / especialistas / organizadores / polizas / contactos / notas_estrategicas
-- ============================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text,
  email text,
  created_at timestamptz not null default now()
);

create table especialistas (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  nombre text not null,
  zona text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table organizadores (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  razon_social text not null,
  zona text,
  especialista_id uuid references especialistas(id) on delete set null,
  created_at timestamptz not null default now()
);

create table polizas (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  poliza text not null,
  estado text,
  fecha_emision date,
  razon_social_org text,
  razon_social_pas text,
  premio_regular numeric,
  premio_anualizado numeric,
  plan text,
  tipo_renta text,
  importado_en timestamptz not null default now()
);

create table contactos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  especialista_id uuid references especialistas(id) on delete cascade,
  canal text check (canal in ('email','whatsapp','llamada','video','presencial')),
  fecha timestamptz not null default now(),
  notas text,
  created_at timestamptz not null default now()
);

create table notas_estrategicas (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  especialista_id uuid references especialistas(id) on delete cascade,
  organizador_id uuid references organizadores(id) on delete cascade,
  contenido text not null,
  created_at timestamptz not null default now()
);

create index idx_especialistas_profile on especialistas(profile_id);
create index idx_organizadores_profile on organizadores(profile_id);
create index idx_organizadores_especialista on organizadores(especialista_id);
create index idx_polizas_profile on polizas(profile_id);
create index idx_polizas_org on polizas(razon_social_org);
create index idx_polizas_importado on polizas(importado_en);
create index idx_contactos_especialista on contactos(especialista_id);
create index idx_notas_especialista on notas_estrategicas(especialista_id);

create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, nombre)
  values (new.id, new.email, new.raw_user_meta_data->>'nombre');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table profiles enable row level security;
alter table especialistas enable row level security;
alter table organizadores enable row level security;
alter table polizas enable row level security;
alter table contactos enable row level security;
alter table notas_estrategicas enable row level security;

create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

create policy "especialistas_all_own" on especialistas
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "organizadores_all_own" on organizadores
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "polizas_all_own" on polizas
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "contactos_all_own" on contactos
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "notas_all_own" on notas_estrategicas
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
