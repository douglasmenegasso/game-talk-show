-- =============================================================
-- GAME TALK SHOW — Estrutura inicial do banco (Supabase)
-- Passo 2: rode este script UMA vez no SQL Editor do projeto.
--
-- ANTES DE RODAR:
-- 1) Crie o usuário do Douglas em Authentication > Users.
-- 2) Substitua o e-mail placeholder na linha marcada abaixo.
--
-- Este script NÃO lança pontos, NÃO cria dados de receita
-- e NÃO habilita escrita direta pelo navegador.
-- =============================================================

-- -------------------------------------------------------------
-- 0. TABELA BASE (criada antes das funções que a consultam)
-- -------------------------------------------------------------

create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role         text not null default 'player'
               check (role in ('admin', 'player')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- -------------------------------------------------------------
-- 1. FUNÇÕES AUXILIARES
-- -------------------------------------------------------------

-- Verifica se o usuário autenticado atual é administrador.
-- SECURITY DEFINER evita recursão de RLS ao consultar profiles.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

-- Cria automaticamente um perfil quando um usuário é criado no Auth.
-- O papel inicial é sempre 'player'; nunca confia em metadados para definir admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      split_part(coalesce(new.email, 'usuario'), '@', 1)
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- Atualiza updated_at automaticamente.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.touch_updated_at() from public, anon, authenticated;

-- -------------------------------------------------------------
-- 2. TABELAS
-- -------------------------------------------------------------

-- Perfis ligados ao Supabase Auth.
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role         text not null default 'player'
               check (role in ('admin', 'player')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Estado atual de cada jogador (Klara).
create table if not exists public.player_state (
  player_id      uuid primary key references public.profiles(id) on delete cascade,
  points_balance integer not null default 0 check (points_balance >= 0),
  kitchen_level  smallint not null default 2 check (kitchen_level between 1 and 3),
  last_rating    numeric(4,2) check (last_rating is null or (last_rating >= 0 and last_rating <= 10)),
  updated_at     timestamptz not null default now()
);

-- Missões: receitas, tarefas domésticas, escolares ou outras.
create table if not exists public.missions (
  id                  uuid primary key default gen_random_uuid(),
  player_id           uuid not null references public.profiles(id) on delete cascade,
  kind                text not null check (kind in ('recipe', 'household', 'school', 'other')),
  title               text not null,
  status              text not null default 'confirmed'
                      check (status in ('draft', 'confirmed', 'voided')),
  occurred_at         timestamptz not null default now(),
  feedback            text,
  rating              numeric(4,2) check (rating is null or (rating >= 0 and rating <= 10)),
  points_delta        integer not null default 0,
  kitchen_level_after smallint check (kitchen_level_after is null or kitchen_level_after between 1 and 3),
  created_by          uuid references public.profiles(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists missions_player_idx on public.missions(player_id, occurred_at desc);

-- Detalhes de receita vinculados a uma missão.
create table if not exists public.mission_recipes (
  mission_id  uuid primary key references public.missions(id) on delete cascade,
  recipe      jsonb not null default '{}'::jsonb check (jsonb_typeof(recipe) = 'object'),
  tips        jsonb not null default '[]'::jsonb check (jsonb_typeof(tips) = 'array'),
  ingredients jsonb not null default '[]'::jsonb check (jsonb_typeof(ingredients) = 'array'),
  products    jsonb not null default '[]'::jsonb check (jsonb_typeof(products) = 'array'),
  equipment   jsonb not null default '[]'::jsonb check (jsonb_typeof(equipment) = 'array'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Fotos vinculadas a missões. O arquivo fica no Storage privado.
create table if not exists public.mission_photos (
  id           uuid primary key default gen_random_uuid(),
  mission_id   uuid not null references public.missions(id) on delete cascade,
  storage_path text not null unique,
  caption      text,
  created_by   uuid references public.profiles(id),
  created_at   timestamptz not null default now()
);

create index if not exists mission_photos_mission_idx on public.mission_photos(mission_id);

-- Livro-caixa de pontos: cada alteração fica registrada.
create table if not exists public.point_ledger (
  id           uuid primary key default gen_random_uuid(),
  player_id    uuid not null references public.profiles(id) on delete cascade,
  mission_id   uuid references public.missions(id) on delete set null,
  entry_type   text not null check (entry_type in ('mission', 'reward', 'adjustment', 'reservation')),
  points_delta integer not null,
  reason       text not null,
  created_by   uuid references public.profiles(id),
  created_at   timestamptz not null default now()
);

create unique index if not exists point_ledger_mission_unique
  on public.point_ledger(mission_id)
  where mission_id is not null;

create index if not exists point_ledger_player_idx on public.point_ledger(player_id, created_at desc);

-- Catálogo de recompensas.
create table if not exists public.rewards (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  description text,
  base_price  integer not null check (base_price > 0),
  reward_type text not null check (reward_type in ('ingredient', 'experience', 'utensil', 'equipment')),
  active      boolean not null default true,
  config      jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Pedidos/reservas de recompensas feitos pela Klara.
create table if not exists public.reward_orders (
  id              uuid primary key default gen_random_uuid(),
  player_id       uuid not null references public.profiles(id) on delete cascade,
  reward_id       uuid not null references public.rewards(id),
  status          text not null default 'pending'
                  check (status in ('pending', 'approved', 'rejected', 'cancelled', 'fulfilled')),
  requested_price integer not null check (requested_price >= 0),
  approved_price  integer check (approved_price is null or approved_price >= 0),
  points_delta    integer,
  notes           text,
  reviewed_by     uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  reviewed_at     timestamptz,
  updated_at      timestamptz not null default now()
);

create index if not exists reward_orders_player_idx on public.reward_orders(player_id, created_at desc);
create index if not exists reward_orders_status_idx on public.reward_orders(status);

-- Desbloqueios de equipamentos: temporários ou permanentes.
create table if not exists public.equipment_unlocks (
  id             uuid primary key default gen_random_uuid(),
  player_id      uuid not null references public.profiles(id) on delete cascade,
  equipment_code text not null,
  mode           text not null check (mode in ('temporary', 'permanent')),
  mission_id     uuid references public.missions(id) on delete set null,
  status         text not null default 'active'
                 check (status in ('active', 'used', 'revoked', 'expired')),
  created_by     uuid references public.profiles(id),
  created_at     timestamptz not null default now(),
  expires_at     timestamptz,
  constraint equipment_temporary_requires_mission
    check (mode <> 'temporary' or mission_id is not null)
);

create index if not exists equipment_unlocks_player_idx on public.equipment_unlocks(player_id, status);

-- Configurações do jogo: regras aprovadas e sugestões pendentes.
create table if not exists public.app_config (
  key        text primary key,
  value      jsonb not null check (jsonb_typeof(value) = 'object'),
  status     text not null default 'approved' check (status in ('approved', 'proposed')),
  updated_at timestamptz not null default now()
);

-- Controle de importações de JSON para evitar duplicidade.
create table if not exists public.import_batches (
  id           uuid primary key default gen_random_uuid(),
  payload_hash text not null unique,
  payload      jsonb not null check (jsonb_typeof(payload) = 'object'),
  status       text not null default 'imported' check (status in ('imported', 'rejected')),
  imported_by  uuid references public.profiles(id),
  created_at   timestamptz not null default now()
);

-- -------------------------------------------------------------
-- 3. TRIGGERS DE updated_at
-- -------------------------------------------------------------

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists trg_player_state_updated_at on public.player_state;
create trigger trg_player_state_updated_at before update on public.player_state
for each row execute function public.touch_updated_at();

drop trigger if exists trg_missions_updated_at on public.missions;
create trigger trg_missions_updated_at before update on public.missions
for each row execute function public.touch_updated_at();

drop trigger if exists trg_mission_recipes_updated_at on public.mission_recipes;
create trigger trg_mission_recipes_updated_at before update on public.mission_recipes
for each row execute function public.touch_updated_at();

drop trigger if exists trg_rewards_updated_at on public.rewards;
create trigger trg_rewards_updated_at before update on public.rewards
for each row execute function public.touch_updated_at();

drop trigger if exists trg_reward_orders_updated_at on public.reward_orders;
create trigger trg_reward_orders_updated_at before update on public.reward_orders
for each row execute function public.touch_updated_at();

drop trigger if exists trg_app_config_updated_at on public.app_config;
create trigger trg_app_config_updated_at before update on public.app_config
for each row execute function public.touch_updated_at();

-- -------------------------------------------------------------
-- 4. PERMISSÕES E RLS
-- -------------------------------------------------------------

grant usage on schema public to anon, authenticated, service_role;

-- Remove escrita direta pelo navegador. Escritas futuras passarão
-- por funções de servidor validadas; o SQL Editor continua como postgres.
revoke all on public.profiles, public.player_state, public.missions,
  public.mission_recipes, public.mission_photos, public.point_ledger,
  public.rewards, public.reward_orders, public.equipment_unlocks,
  public.app_config, public.import_batches
from anon, authenticated;

grant select on public.profiles, public.player_state, public.missions,
  public.mission_recipes, public.mission_photos, public.point_ledger,
  public.rewards, public.reward_orders, public.equipment_unlocks,
  public.app_config, public.import_batches
to authenticated;

grant all on public.profiles, public.player_state, public.missions,
  public.mission_recipes, public.mission_photos, public.point_ledger,
  public.rewards, public.reward_orders, public.equipment_unlocks,
  public.app_config, public.import_batches
to service_role;

alter table public.profiles          enable row level security;
alter table public.player_state      enable row level security;
alter table public.missions          enable row level security;
alter table public.mission_recipes   enable row level security;
alter table public.mission_photos    enable row level security;
alter table public.point_ledger      enable row level security;
alter table public.rewards           enable row level security;
alter table public.reward_orders     enable row level security;
alter table public.equipment_unlocks enable row level security;
alter table public.app_config        enable row level security;
alter table public.import_batches    enable row level security;

-- Profiles: cada usuário vê o próprio; admin vê todos.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_admin());

-- Player state: jogador vê o próprio; admin vê todos.
drop policy if exists player_state_select on public.player_state;
create policy player_state_select on public.player_state
for select to authenticated
using (player_id = auth.uid() or public.is_admin());

-- Missions.
drop policy if exists missions_select on public.missions;
create policy missions_select on public.missions
for select to authenticated
using (player_id = auth.uid() or public.is_admin());

-- Mission recipes: acesso via missão.
drop policy if exists mission_recipes_select on public.mission_recipes;
create policy mission_recipes_select on public.mission_recipes
for select to authenticated
using (
  exists (
    select 1 from public.missions m
    where m.id = mission_id
      and (m.player_id = auth.uid() or public.is_admin())
  )
);

-- Mission photos: acesso via missão.
drop policy if exists mission_photos_select on public.mission_photos;
create policy mission_photos_select on public.mission_photos
for select to authenticated
using (
  exists (
    select 1 from public.missions m
    where m.id = mission_id
      and (m.player_id = auth.uid() or public.is_admin())
  )
);

-- Point ledger.
drop policy if exists point_ledger_select on public.point_ledger;
create policy point_ledger_select on public.point_ledger
for select to authenticated
using (player_id = auth.uid() or public.is_admin());

-- Rewards: jogadores veem apenas recompensas ativas; admin vê todas.
drop policy if exists rewards_select on public.rewards;
create policy rewards_select on public.rewards
for select to authenticated
using (active or public.is_admin());

-- Reward orders.
drop policy if exists reward_orders_select on public.reward_orders;
create policy reward_orders_select on public.reward_orders
for select to authenticated
using (player_id = auth.uid() or public.is_admin());

-- Equipment unlocks.
drop policy if exists equipment_unlocks_select on public.equipment_unlocks;
create policy equipment_unlocks_select on public.equipment_unlocks
for select to authenticated
using (player_id = auth.uid() or public.is_admin());

-- App config: jogador vê apenas regras aprovadas; admin vê propostas também.
drop policy if exists app_config_select on public.app_config;
create policy app_config_select on public.app_config
for select to authenticated
using (status = 'approved' or public.is_admin());

-- Import batches: somente admin.
drop policy if exists import_batches_select on public.import_batches;
create policy import_batches_select on public.import_batches
for select to authenticated
using (public.is_admin());

-- -------------------------------------------------------------
-- 5. STORAGE PRIVADO PARA FOTOS
-- -------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fotos-receitas',
  'fotos-receitas',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Admin pode gerenciar arquivos do bucket.
drop policy if exists fotos_admin_select on storage.objects;
create policy fotos_admin_select on storage.objects
for select to authenticated
using (bucket_id = 'fotos-receitas' and public.is_admin());

drop policy if exists fotos_admin_insert on storage.objects;
create policy fotos_admin_insert on storage.objects
for insert to authenticated
with check (bucket_id = 'fotos-receitas' and public.is_admin());

drop policy if exists fotos_admin_update on storage.objects;
create policy fotos_admin_update on storage.objects
for update to authenticated
using (bucket_id = 'fotos-receitas' and public.is_admin())
with check (bucket_id = 'fotos-receitas' and public.is_admin());

drop policy if exists fotos_admin_delete on storage.objects;
create policy fotos_admin_delete on storage.objects
for delete to authenticated
using (bucket_id = 'fotos-receitas' and public.is_admin());

-- Jogador pode ler foto somente se estiver vinculada à própria missão.
-- O upload pela Klara será habilitado depois por função segura.
drop policy if exists fotos_player_select on storage.objects;
create policy fotos_player_select on storage.objects
for select to authenticated
using (
  bucket_id = 'fotos-receitas'
  and exists (
    select 1
    from public.mission_photos mp
    join public.missions m on m.id = mp.mission_id
    where mp.storage_path = name
      and m.player_id = auth.uid()
  )
);

-- -------------------------------------------------------------
-- 6. DADOS INICIAIS DO CATÁLOGO
-- -------------------------------------------------------------

-- Recompensas já aprovadas na conversa.
insert into public.rewards (code, name, description, base_price, reward_type, active)
values
  ('ingrediente-especial', 'Ingrediente Especial',
   'Escolher um ingrediente novo e acessível para uma próxima receita, com aprovação do adulto.',
   15, 'ingredient', true),
  ('sous-chef', 'Sous-Chef por um dia',
   'Comandar uma receita com os adultos como ajudantes, mantendo as regras de segurança.',
   30, 'experience', true),
  ('escolha-cardapio', 'Escolha do Cardápio',
   'Escolher o cardápio de uma refeição da família, com aprovação do adulto.',
   50, 'experience', true),
  ('utensilio-novo', 'Utensílio Novo',
   'Um utensílio simples e divertido para a cozinha, aprovado pelo adulto.',
   70, 'utensil', true)
on conflict (code) do nothing;

-- Eletroportáteis sugeridos: ficam inativos até confirmação dos preços.
insert into public.rewards (code, name, description, base_price, reward_type, active, config)
values
  ('batedeira', 'Batedeira',
   'Uso temporário por tarefa nos níveis 1 e 2; permanente custa 5x e só pode ser usado no nível 1.',
   15, 'equipment', false,
   '{"temporary_price":15,"permanent_price":75,"permanent_min_kitchen_level":1}'::jsonb),
  ('liquidificador', 'Liquidificador',
   'Uso temporário por tarefa nos níveis 1 e 2; permanente custa 5x e só pode ser usado no nível 1.',
   15, 'equipment', false,
   '{"temporary_price":15,"permanent_price":75,"permanent_min_kitchen_level":1}'::jsonb),
  ('micro-ondas', 'Micro-ondas',
   'Uso temporário por tarefa nos níveis 1 e 2; permanente custa 5x e só pode ser usado no nível 1.',
   20, 'equipment', false,
   '{"temporary_price":20,"permanent_price":100,"permanent_min_kitchen_level":1}'::jsonb),
  ('airfryer', 'Airfryer',
   'Uso temporário por tarefa nos níveis 1 e 2; permanente custa 5x e só pode ser usado no nível 1.',
   25, 'equipment', false,
   '{"temporary_price":25,"permanent_price":125,"permanent_min_kitchen_level":1}'::jsonb)
on conflict (code) do nothing;

-- Regras aprovadas e sugestões pendentes.
insert into public.app_config (key, value, status)
values
  ('points.recipe', '{"base":10,"cleanup_bonus":5,"feedback_bonus":5}'::jsonb, 'approved'),
  ('points.voluntary_help', '{"points":5}'::jsonb, 'approved'),
  ('points.school_initiative', '{"points":3}'::jsonb, 'proposed'),
  ('pricing.dynamic', '{"excellent_discount":3,"poor_surcharge":5}'::jsonb, 'proposed'),
  ('kitchen.thresholds', '{"master_min":9,"standard_min":7,"rating_window":3}'::jsonb, 'proposed')
on conflict (key) do nothing;

-- -------------------------------------------------------------
-- 7. DEFINIR O PRIMEIRO ADMINISTRADOR (DOUGLAS)
-- -------------------------------------------------------------
-- IMPORTANTE: substitua o e-mail abaixo pelo e-mail do usuário
-- que você acabou de criar em Authentication > Users.
-- Não use a senha antiga compartilhada no histórico.

do $$
declare
  v_admin_email text := 'SEU_EMAIL_DO_DOUGLAS_AQUI';  -- <<<< EDITE ESTA LINHA
  v_admin_id uuid;
begin
  if v_admin_email = 'SEU_EMAIL_DO_DOUGLAS_AQUI' then
    raise exception 'Edite v_admin_email com o e-mail do Douglas antes de executar.';
  end if;

  select id into v_admin_id
  from auth.users
  where lower(email) = lower(v_admin_email)
  limit 1;

  if v_admin_id is null then
    raise exception 'Usuário não encontrado em Authentication > Users: %', v_admin_email;
  end if;

  insert into public.profiles (id, display_name, role)
  values (v_admin_id, 'Douglas', 'admin')
  on conflict (id) do update
    set role = 'admin',
        display_name = 'Douglas',
        updated_at = now();
end;
$$;

-- =============================================================
-- FIM DA ESTRUTURA INICIAL
-- Próximo passo: validar tabelas, RLS e bucket privado.
-- Depois: criar funções seguras de importação, pedidos e fotos.
-- =============================================================
