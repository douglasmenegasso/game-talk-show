-- =============================================================
-- GAME TALK SHOW — Primeira missão: Bolo de Chocolate
-- Passo 3: importar o perfil da Klara e a missão histórica.
--
-- ANTES DE RODAR:
-- 1) Crie o usuário da Klara em Authentication > Users.
-- 2) Substitua o e-mail placeholder na linha marcada abaixo.
--
-- Este script é idempotente: se a mesma missão já foi importada,
-- ele não duplica pontos nem registros.
-- =============================================================

do $$
declare
  v_player_email text := 'EMAIL_DA_KLARA_AQUI';  -- <<<< EDITE ESTA LINHA
  v_player_id    uuid;
  v_mission_id   uuid;
  v_admin_id     uuid;
  v_hash         text;
  v_points       integer := 15;

  v_payload jsonb := '{
    "source": "chat-export-1795302963281.json",
    "mission": {
      "kind": "recipe",
      "title": "Bolo de chocolate com calda",
      "occurred_at": "2026-11-21",
      "feedback": "Massa fofinha, sabor agradável e doce no ponto. Calda ajustada a tempo. Dificuldades: começou a misturar antes da orientação completa e adicionou farinha fora da ordem, gerando pelotas.",
      "rating": null,
      "points_delta": 15,
      "kitchen_level_after": 2,
      "points_breakdown": [
        {"label": "Execução da receita", "points": 10},
        {"label": "Limpeza e organização", "points": 5},
        {"label": "Feedback sincero e detalhado", "points": 5},
        {"label": "Penalidade: misturar antes da orientação", "points": -3},
        {"label": "Penalidade: pelotas por mistura fora de ordem", "points": -2}
      ],
      "notes": "Saldo inicial histórico confirmado para importação. O direito ao Ingrediente Especial foi anunciado como desbloqueado, mas nenhuma compra foi registrada."
    },
    "recipe": {
      "title": "Bolo de chocolate com calda",
      "yield": "1 bolo médio",
      "equipment": [
        "forma média",
        "tigela grande",
        "colher de pau ou fouet",
        "panela média",
        "forno"
      ],
      "ingredients": [
        {"item": "ovos", "quantity": "2", "unit": "unidade"},
        {"item": "açúcar", "quantity": "1", "unit": "xic", "note": "para a massa"},
        {"item": "leite", "quantity": "1", "unit": "xic", "note": "para a massa"},
        {"item": "óleo", "quantity": "1/2", "unit": "xic"},
        {"item": "achocolatado", "quantity": "1", "unit": "xic", "note": "usado no lugar do chocolate em pó previsto"},
        {"item": "farinha de trigo", "quantity": "2", "unit": "xic"},
        {"item": "fermento em pó", "quantity": "1", "unit": "colher de sopa"},
        {"item": "leite", "quantity": "1", "unit": "xic", "note": "para a calda"},
        {"item": "achocolatado", "quantity": "1/2", "unit": "xic", "note": "para a calda"},
        {"item": "açúcar", "quantity": "2", "unit": "colheres de sopa", "note": "para a calda, ajustado porque o achocolatado já contém açúcar"}
      ],
      "products": [
        {"name": "achocolatado", "brand": null, "note": "Marca não informada no histórico. Confirmar rótulo em próximas receitas."}
      ],
      "steps": [
        {"order": 1, "text": "Adulto preaquece o forno a 180 °C e prepara a forma média untada."},
        {"order": 2, "text": "Misturar ovos, açúcar, leite, óleo e achocolatado até ficar homogêneo."},
        {"order": 3, "text": "Adicionar a farinha aos poucos e com delicadeza, depois o fermento."},
        {"order": 4, "text": "Adulto coloca no forno por cerca de 35 a 40 minutos. Não abrir antes de 30 minutos."},
        {"order": 5, "text": "Enquanto assa, lavar e organizar a bancada."},
        {"order": 6, "text": "Preparar a calda nos minutos finais ou durante o descanso do bolo: leite, achocolatado e açúcar em panela média, mexendo até engrossar levemente."},
        {"order": 7, "text": "Adulto desenforma e aplica a calda com segurança."}
      ],
      "safety": [
        "Forno, panela quente e calda quente são tarefas do adulto.",
        "Klara pode misturar ingredientes frios e organizar a bancada com supervisão.",
        "Não usar equipamento elétrico sem liberação do adulto."
      ],
      "tips": [
        "Esperar a instrução completa antes de executar: ouviu, entendeu, executou.",
        "Separar e medir os ingredientes antes de misturar.",
        "Integrar os líquidos antes de adicionar a farinha para evitar pelotas.",
        "Confirmar se o produto é chocolate em pó/cacau ou achocolatado antes de ajustar açúcar.",
        "Limpar e organizar durante o tempo de forno.",
        "Usar abreviações no texto e nomes por extenso na leitura falada."
      ]
    }
  }'::jsonb;

begin
  if v_player_email = 'EMAIL_DA_KLARA_AQUI' then
    raise exception 'Edite v_player_email com o e-mail da Klara antes de executar.';
  end if;

  select id into v_player_id
  from auth.users
  where lower(email) = lower(v_player_email)
  limit 1;

  if v_player_id is null then
    raise exception 'Usuário da Klara não encontrado em Authentication > Users: %', v_player_email;
  end if;

  -- Se por engano esse usuário era admin, não rebaixar silenciosamente.
  if exists (
    select 1 from public.profiles
    where id = v_player_id and role = 'admin'
  ) then
    raise exception 'O e-mail informado já é administrador. Use um usuário separado para a Klara.';
  end if;

  -- Garante o perfil da Klara como jogador.
  insert into public.profiles (id, display_name, role)
  values (v_player_id, 'Klara', 'player')
  on conflict (id) do update
    set display_name = 'Klara',
        role = 'player',
        updated_at = now();

  v_hash := md5(v_payload::text);

  if exists (
    select 1 from public.import_batches
    where payload_hash = v_hash
  ) then
    raise notice 'Esta missão já foi importada. Nada foi duplicado.';
    return;
  end if;

  select id into v_admin_id
  from public.profiles
  where role = 'admin'
  order by created_at
  limit 1;

  -- Estado inicial do jogador, se ainda não existir.
  insert into public.player_state (player_id, points_balance, kitchen_level)
  values (v_player_id, 0, 2)
  on conflict (player_id) do nothing;

  -- Missão histórica.
  insert into public.missions (
    player_id, kind, title, status, occurred_at, feedback,
    rating, points_delta, kitchen_level_after, created_by
  )
  values (
    v_player_id,
    'recipe',
    'Bolo de chocolate com calda',
    'confirmed',
    '2026-11-21 00:00:00-03',
    v_payload -> 'mission' ->> 'feedback',
    null,
    v_points,
    2,
    v_admin_id
  )
  returning id into v_mission_id;

  -- Receita, dicas, ingredientes e produtos.
  insert into public.mission_recipes (
    mission_id, recipe, tips, ingredients, products, equipment
  )
  values (
    v_mission_id,
    v_payload -> 'recipe',
    coalesce(v_payload -> 'recipe' -> 'tips', '[]'::jsonb),
    coalesce(v_payload -> 'recipe' -> 'ingredients', '[]'::jsonb),
    coalesce(v_payload -> 'recipe' -> 'products', '[]'::jsonb),
    coalesce(v_payload -> 'recipe' -> 'equipment', '[]'::jsonb)
  );

  -- Lançamento único de pontos da missão.
  insert into public.point_ledger (
    player_id, mission_id, entry_type, points_delta, reason, created_by
  )
  values (
    v_player_id,
    v_mission_id,
    'mission',
    v_points,
    'Bolo de chocolate: 10 execução + 5 limpeza + 5 feedback - 3 ansiedade - 2 pelotas = 15 pontos.',
    v_admin_id
  );

  -- Atualiza saldo e nível da cozinha.
  update public.player_state
  set points_balance = points_balance + v_points,
      kitchen_level = 2,
      updated_at = now()
  where player_id = v_player_id;

  -- Registro de importação para evitar duplicidade.
  insert into public.import_batches (
    payload_hash, payload, status, imported_by
  )
  values (
    v_hash,
    v_payload,
    'imported',
    v_admin_id
  );

  raise notice 'Missão importada com sucesso. Saldo inicial da Klara: % pontos.', v_points;
end;
$$;

-- =============================================================
-- CONSULTAS DE CONFERÊNCIA (opcionais)
-- Rode separadamente se quiser visualizar o resultado.
-- =============================================================

-- select display_name, role from public.profiles order by created_at;
-- select player_id, points_balance, kitchen_level from public.player_state;
-- select title, kind, points_delta, occurred_at from public.missions order by occurred_at desc;
-- select entry_type, points_delta, reason from public.point_ledger order by created_at desc;
