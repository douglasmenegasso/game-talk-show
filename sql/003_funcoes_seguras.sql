-- =============================================================
-- GAME TALK SHOW — Funções seguras do aplicativo
-- Passo 4: rode este script UMA vez no SQL Editor.
--
-- Estas funções serão chamadas pelo site depois do login.
-- Elas NÃO liberam escrita direta nas tabelas.
-- O navegador continua sem poder alterar pontos livremente.
-- =============================================================

-- -------------------------------------------------------------
-- 0. Ajustes pequenos em pedidos de recompensa e livro-caixa
-- -------------------------------------------------------------

-- O lançamento de pontos de uma missão deve ser único por missão.
-- Porém, uma recompensa vinculada à mesma missão também pode gerar
-- lançamento. Por isso, a unicidade vale apenas para entry_type = 'mission'.
drop index if exists public.point_ledger_mission_unique;
create unique index if not exists point_ledger_mission_unique
  on public.point_ledger(mission_id)
  where mission_id is not null and entry_type = 'mission';

alter table public.reward_orders
  add column if not exists mode text
    check (mode in ('temporary', 'permanent'));

alter table public.reward_orders
  add column if not exists mission_id uuid
    references public.missions(id) on delete set null;

create index if not exists reward_orders_mission_idx
  on public.reward_orders(mission_id);

-- -------------------------------------------------------------
-- 1. ADMIN: listar jogadores
-- -------------------------------------------------------------

create or replace function public.admin_list_players()
returns table (
  player_id uuid,
  display_name text,
  points_balance integer,
  kitchen_level smallint,
  last_rating numeric
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Acesso negado: somente administrador.';
  end if;

  return query
  select
    p.id,
    p.display_name,
    coalesce(ps.points_balance, 0),
    coalesce(ps.kitchen_level, 2),
    ps.last_rating
  from public.profiles p
  left join public.player_state ps on ps.player_id = p.id
  where p.role = 'player'
  order by p.display_name;
end;
$$;

revoke all on function public.admin_list_players() from public, anon;
grant execute on function public.admin_list_players() to authenticated, service_role;

-- -------------------------------------------------------------
-- 2. ADMIN: importar missão gerada pelo Chefe Triix
-- -------------------------------------------------------------

create or replace function public.admin_import_mission(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin_id    uuid := auth.uid();
  v_player_id   uuid;
  v_mission     jsonb;
  v_recipe      jsonb;
  v_breakdown   jsonb;
  v_kind        text;
  v_title       text;
  v_points      integer;
  v_sum         integer;
  v_hash        text;
  v_mission_id  uuid;
  v_balance     integer;
  v_occurred_at timestamptz;
  v_rating      numeric;
  v_kitchen     smallint;
begin
  if not public.is_admin() then
    raise exception 'Acesso negado: somente administrador.';
  end if;

  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'Payload inválido: envie um objeto JSON.';
  end if;

  v_player_id := nullif(payload ->> 'player_id', '')::uuid;
  if v_player_id is null then
    raise exception 'Payload inválido: player_id é obrigatório.';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = v_player_id and role = 'player'
  ) then
    raise exception 'Jogador não encontrado ou não é player: %', v_player_id;
  end if;

  v_mission := payload -> 'mission';
  if v_mission is null or jsonb_typeof(v_mission) <> 'object' then
    raise exception 'Payload inválido: mission é obrigatório e deve ser objeto.';
  end if;

  v_kind := v_mission ->> 'kind';
  if v_kind is null or v_kind not in ('recipe', 'household', 'school', 'other') then
    raise exception 'Tipo de missão inválido: %', v_kind;
  end if;

  v_title := nullif(trim(v_mission ->> 'title'), '');
  if v_title is null then
    raise exception 'Título da missão é obrigatório.';
  end if;

  v_points := coalesce(nullif(v_mission ->> 'points_delta', '')::integer, 0);
  if v_points < -1000 or v_points > 1000 then
    raise exception 'Pontuação fora do limite permitido por importação.';
  end if;

  v_breakdown := v_mission -> 'points_breakdown';
  if v_breakdown is not null then
    if jsonb_typeof(v_breakdown) <> 'array' then
      raise exception 'points_breakdown deve ser uma lista.';
    end if;

    select coalesce(sum((item ->> 'points')::integer), 0)
    into v_sum
    from jsonb_array_elements(v_breakdown) as item;

    if v_sum <> v_points then
      raise exception 'Soma do detalhamento (%) diferente de points_delta (%).', v_sum, v_points;
    end if;
  end if;

  v_hash := md5(payload::text);
  if exists (select 1 from public.import_batches where payload_hash = v_hash) then
    return jsonb_build_object(
      'status', 'already_imported',
      'message', 'Esta missão já foi importada. Nada foi duplicado.'
    );
  end if;

  v_occurred_at := coalesce(nullif(v_mission ->> 'occurred_at', '')::timestamptz, now());
  v_rating := nullif(v_mission ->> 'rating', '')::numeric;
  v_kitchen := nullif(v_mission ->> 'kitchen_level_after', '')::smallint;

  if v_rating is not null and (v_rating < 0 or v_rating > 10) then
    raise exception 'Nota deve estar entre 0 e 10.';
  end if;

  if v_kitchen is not null and v_kitchen not in (1, 2, 3) then
    raise exception 'Nível de cozinha deve ser 1, 2 ou 3.';
  end if;

  insert into public.missions (
    player_id, kind, title, status, occurred_at, feedback,
    rating, points_delta, kitchen_level_after, created_by
  )
  values (
    v_player_id,
    v_kind,
    v_title,
    'confirmed',
    v_occurred_at,
    v_mission ->> 'feedback',
    v_rating,
    v_points,
    v_kitchen,
    v_admin_id
  )
  returning id into v_mission_id;

  v_recipe := payload -> 'recipe';
  if v_recipe is not null and jsonb_typeof(v_recipe) = 'object' then
    insert into public.mission_recipes (
      mission_id, recipe, tips, ingredients, products, equipment
    )
    values (
      v_mission_id,
      v_recipe,
      coalesce(v_recipe -> 'tips', '[]'::jsonb),
      coalesce(v_recipe -> 'ingredients', '[]'::jsonb),
      coalesce(v_recipe -> 'products', '[]'::jsonb),
      coalesce(v_recipe -> 'equipment', '[]'::jsonb)
    );
  end if;

  insert into public.point_ledger (
    player_id, mission_id, entry_type, points_delta, reason, created_by
  )
  values (
    v_player_id,
    v_mission_id,
    'mission',
    v_points,
    'Importação de missão: ' || v_title,
    v_admin_id
  );

  insert into public.player_state (player_id, points_balance, kitchen_level)
  values (v_player_id, 0, 2)
  on conflict (player_id) do nothing;

  update public.player_state
  set points_balance = points_balance + v_points,
      kitchen_level = coalesce(v_kitchen, kitchen_level),
      last_rating = coalesce(v_rating, last_rating),
      updated_at = now()
  where player_id = v_player_id;

  select points_balance into v_balance
  from public.player_state
  where player_id = v_player_id;

  insert into public.import_batches (
    payload_hash, payload, status, imported_by
  )
  values (
    v_hash,
    payload,
    'imported',
    v_admin_id
  );

  return jsonb_build_object(
    'status', 'imported',
    'mission_id', v_mission_id,
    'points_delta', v_points,
    'points_balance', v_balance
  );
end;
$$;

revoke all on function public.admin_import_mission(jsonb) from public, anon;
grant execute on function public.admin_import_mission(jsonb) to authenticated, service_role;

-- -------------------------------------------------------------
-- 3. JOGADOR: pedir/reservar recompensa
-- -------------------------------------------------------------

create or replace function public.player_request_reward(
  p_reward_code text,
  p_note text default null,
  p_mode text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_player_id uuid := auth.uid();
  v_reward    public.rewards%rowtype;
  v_price     integer;
  v_mode      text;
  v_order_id  uuid;
begin
  if v_player_id is null then
    raise exception 'Faça login para pedir recompensas.';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = v_player_id and role = 'player'
  ) then
    raise exception 'Somente jogador pode pedir recompensas.';
  end if;

  select * into v_reward
  from public.rewards
  where code = p_reward_code and active = true;

  if not found then
    raise exception 'Recompensa não encontrada ou inativa: %', p_reward_code;
  end if;

  if v_reward.reward_type = 'equipment' then
    v_mode := lower(coalesce(p_mode, ''));
    if v_mode not in ('temporary', 'permanent') then
      raise exception 'Equipamento exige modo temporary ou permanent.';
    end if;

    if v_mode = 'temporary' then
      v_price := coalesce(nullif(v_reward.config ->> 'temporary_price', '')::integer, v_reward.base_price);
    else
      v_price := coalesce(nullif(v_reward.config ->> 'permanent_price', '')::integer, v_reward.base_price * 5);
    end if;
  else
    v_mode := null;
    v_price := v_reward.base_price;
  end if;

  if v_price <= 0 then
    raise exception 'Preço inválido para a recompensa.';
  end if;

  if exists (
    select 1 from public.reward_orders
    where player_id = v_player_id
      and reward_id = v_reward.id
      and status = 'pending'
      and coalesce(mode, '') = coalesce(v_mode, '')
  ) then
    raise exception 'Já existe um pedido pendente desta recompensa.';
  end if;

  insert into public.reward_orders (
    player_id, reward_id, status, requested_price, notes, mode
  )
  values (
    v_player_id,
    v_reward.id,
    'pending',
    v_price,
    nullif(trim(p_note), ''),
    v_mode
  )
  returning id into v_order_id;

  return jsonb_build_object(
    'status', 'pending',
    'order_id', v_order_id,
    'reward', v_reward.name,
    'reward_code', v_reward.code,
    'mode', v_mode,
    'requested_price', v_price,
    'message', 'Pedido enviado para aprovação do Douglas.'
  );
end;
$$;

revoke all on function public.player_request_reward(text, text, text) from public, anon;
grant execute on function public.player_request_reward(text, text, text) to authenticated, service_role;

-- -------------------------------------------------------------
-- 4. JOGADOR: cancelar pedido pendente
-- -------------------------------------------------------------

create or replace function public.player_cancel_reward_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_player_id uuid := auth.uid();
  v_order_id  uuid;
begin
  if v_player_id is null then
    raise exception 'Faça login para cancelar pedidos.';
  end if;

  update public.reward_orders
  set status = 'cancelled',
      updated_at = now()
  where id = p_order_id
    and player_id = v_player_id
    and status = 'pending'
  returning id into v_order_id;

  if v_order_id is null then
    raise exception 'Pedido não encontrado, não é seu ou não está pendente.';
  end if;

  return jsonb_build_object('status', 'cancelled', 'order_id', v_order_id);
end;
$$;

revoke all on function public.player_cancel_reward_order(uuid) from public, anon;
grant execute on function public.player_cancel_reward_order(uuid) to authenticated, service_role;

-- -------------------------------------------------------------
-- 5. ADMIN: aprovar ou recusar pedido
-- -------------------------------------------------------------

create or replace function public.admin_review_reward_order(
  p_order_id uuid,
  p_approve boolean,
  p_note text default null,
  p_mission_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin_id  uuid := auth.uid();
  v_order     public.reward_orders%rowtype;
  v_reward    public.rewards%rowtype;
  v_state     public.player_state%rowtype;
  v_price     integer;
  v_balance   integer;
  v_unlock_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Acesso negado: somente administrador.';
  end if;

  select * into v_order
  from public.reward_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Pedido não encontrado: %', p_order_id;
  end if;

  if v_order.status <> 'pending' then
    raise exception 'Pedido já foi revisado. Status atual: %', v_order.status;
  end if;

  select * into v_reward
  from public.rewards
  where id = v_order.reward_id;

  if not found then
    raise exception 'Recompensa do pedido não encontrada.';
  end if;

  if not p_approve then
    update public.reward_orders
    set status = 'rejected',
        reviewed_by = v_admin_id,
        reviewed_at = now(),
        notes = coalesce(nullif(trim(p_note), ''), notes),
        updated_at = now()
    where id = p_order_id;

    return jsonb_build_object('status', 'rejected', 'order_id', p_order_id);
  end if;

  v_price := v_order.requested_price;
  if v_price <= 0 then
    raise exception 'Preço do pedido inválido.';
  end if;

  insert into public.player_state (player_id, points_balance, kitchen_level)
  values (v_order.player_id, 0, 2)
  on conflict (player_id) do nothing;

  select * into v_state
  from public.player_state
  where player_id = v_order.player_id
  for update;

  if v_state.points_balance < v_price then
    raise exception 'Saldo insuficiente. Saldo: %, preço: %.', v_state.points_balance, v_price;
  end if;

  if v_reward.reward_type = 'equipment' then
    if v_order.mode = 'permanent' then
      if v_state.kitchen_level <> 1 then
        raise exception 'Equipamento permanente só pode ser usado na Cozinha Master, nível 1.';
      end if;

      insert into public.equipment_unlocks (
        player_id, equipment_code, mode, mission_id, status, created_by
      )
      values (
        v_order.player_id,
        v_reward.code,
        'permanent',
        null,
        'active',
        v_admin_id
      )
      returning id into v_unlock_id;

    elsif v_order.mode = 'temporary' then
      if p_mission_id is null then
        raise exception 'Equipamento temporário precisa ser vinculado a uma missão.';
      end if;

      if not exists (
        select 1 from public.missions
        where id = p_mission_id and player_id = v_order.player_id
      ) then
        raise exception 'Missão não encontrada para este jogador.';
      end if;

      insert into public.equipment_unlocks (
        player_id, equipment_code, mode, mission_id, status, created_by
      )
      values (
        v_order.player_id,
        v_reward.code,
        'temporary',
        p_mission_id,
        'active',
        v_admin_id
      )
      returning id into v_unlock_id;
    else
      raise exception 'Pedido de equipamento sem modo válido.';
    end if;
  end if;

  update public.player_state
  set points_balance = points_balance - v_price,
      updated_at = now()
  where player_id = v_order.player_id
  returning points_balance into v_balance;

  insert into public.point_ledger (
    player_id, mission_id, entry_type, points_delta, reason, created_by
  )
  values (
    v_order.player_id,
    p_mission_id,
    'reward',
    -v_price,
    'Recompensa aprovada: ' || v_reward.name,
    v_admin_id
  );

  update public.reward_orders
  set status = 'approved',
      approved_price = v_price,
      points_delta = -v_price,
      reviewed_by = v_admin_id,
      reviewed_at = now(),
      notes = coalesce(nullif(trim(p_note), ''), notes),
      mission_id = coalesce(p_mission_id, mission_id),
      updated_at = now()
  where id = p_order_id;

  return jsonb_build_object(
    'status', 'approved',
    'order_id', p_order_id,
    'reward', v_reward.name,
    'points_delta', -v_price,
    'points_balance', v_balance,
    'equipment_unlock_id', v_unlock_id
  );
end;
$$;

revoke all on function public.admin_review_reward_order(uuid, boolean, text, uuid) from public, anon;
grant execute on function public.admin_review_reward_order(uuid, boolean, text, uuid) to authenticated, service_role;

-- -------------------------------------------------------------
-- 6. ADMIN: ajuste manual de pontos com auditoria
-- -------------------------------------------------------------

create or replace function public.admin_adjust_points(
  p_player_id uuid,
  p_delta integer,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin_id uuid := auth.uid();
  v_balance  integer;
  v_reason   text;
begin
  if not public.is_admin() then
    raise exception 'Acesso negado: somente administrador.';
  end if;

  if p_delta is null or p_delta = 0 then
    raise exception 'Informe uma alteração de pontos diferente de zero.';
  end if;

  if p_delta < -1000 or p_delta > 1000 then
    raise exception 'Ajuste fora do limite permitido.';
  end if;

  v_reason := nullif(trim(p_reason), '');
  if v_reason is null then
    raise exception 'Motivo do ajuste é obrigatório.';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = p_player_id and role = 'player'
  ) then
    raise exception 'Jogador não encontrado: %', p_player_id;
  end if;

  insert into public.player_state (player_id, points_balance, kitchen_level)
  values (p_player_id, 0, 2)
  on conflict (player_id) do nothing;

  update public.player_state
  set points_balance = points_balance + p_delta,
      updated_at = now()
  where player_id = p_player_id
  returning points_balance into v_balance;

  if v_balance < 0 then
    raise exception 'Ajuste deixaria o saldo negativo.';
  end if;

  insert into public.point_ledger (
    player_id, mission_id, entry_type, points_delta, reason, created_by
  )
  values (
    p_player_id,
    null,
    'adjustment',
    p_delta,
    v_reason,
    v_admin_id
  );

  return jsonb_build_object(
    'status', 'adjusted',
    'player_id', p_player_id,
    'points_delta', p_delta,
    'points_balance', v_balance
  );
end;
$$;

revoke all on function public.admin_adjust_points(uuid, integer, text) from public, anon;
grant execute on function public.admin_adjust_points(uuid, integer, text) to authenticated, service_role;

-- -------------------------------------------------------------
-- 7. ADMIN: exportar resumo para o Chefe Triix
-- -------------------------------------------------------------

create or replace function public.admin_export_summary()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Acesso negado: somente administrador.';
  end if;

  select jsonb_build_object(
    'exported_at', now(),
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
        'player_id', p.id,
        'display_name', p.display_name,
        'points_balance', coalesce(ps.points_balance, 0),
        'kitchen_level', coalesce(ps.kitchen_level, 2),
        'last_rating', ps.last_rating
      ) order by p.display_name)
      from public.profiles p
      left join public.player_state ps on ps.player_id = p.id
      where p.role = 'player'
    ), '[]'::jsonb),
    'pending_orders', coalesce((
      select jsonb_agg(jsonb_build_object(
        'order_id', o.id,
        'player_id', o.player_id,
        'reward_code', r.code,
        'reward_name', r.name,
        'mode', o.mode,
        'requested_price', o.requested_price,
        'notes', o.notes,
        'created_at', o.created_at
      ) order by o.created_at)
      from public.reward_orders o
      join public.rewards r on r.id = o.reward_id
      where o.status = 'pending'
    ), '[]'::jsonb),
    'recent_missions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'mission_id', m.id,
        'player_id', m.player_id,
        'title', m.title,
        'kind', m.kind,
        'points_delta', m.points_delta,
        'rating', m.rating,
        'occurred_at', m.occurred_at
      ) order by m.occurred_at desc)
      from (
        select * from public.missions
        order by occurred_at desc
        limit 20
      ) m
    ), '[]'::jsonb),
    'active_equipment', coalesce((
      select jsonb_agg(jsonb_build_object(
        'player_id', e.player_id,
        'equipment_code', e.equipment_code,
        'mode', e.mode,
        'mission_id', e.mission_id,
        'status', e.status
      ) order by e.created_at desc)
      from public.equipment_unlocks e
      where e.status = 'active'
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_export_summary() from public, anon;
grant execute on function public.admin_export_summary() to authenticated, service_role;

-- =============================================================
-- FIM DAS FUNÇÕES SEGURAS
-- Próximo passo: criar a interface do site para chamar estas
-- funções com login, sem expor chaves secretas.
-- =============================================================
