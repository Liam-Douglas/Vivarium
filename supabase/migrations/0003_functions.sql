-- ============================================================================
-- Vivarium — RPC + view to make feeding atomic and to fix the feeder N+1
-- ============================================================================
-- REVIEW BEFORE APPLYING. Confirm column names against your schema.
-- ============================================================================

-- ── Atomic feeding ───────────────────────────────────────────────────────────
-- Replaces the client's three sequential writes (feeding_logs insert →
-- animals.last_fed_at update → feeder_stock_events insert) with one
-- transaction, so a flaky/offline connection can't leave a partial write.
-- Runs as the caller (SECURITY INVOKER) so RLS still applies.
create or replace function public.log_feeding(
  p_household_id   uuid,
  p_animal_id      uuid,
  p_fed_at         timestamptz,
  p_prey_type      text,
  p_quantity       integer,
  p_refused        boolean,
  p_prey_size      text default null,
  p_notes          text default null,
  p_feeder_item_id uuid default null
)
returns public.feeding_logs
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_log public.feeding_logs;
begin
  insert into public.feeding_logs
    (household_id, animal_id, user_id, fed_at, prey_type, prey_size, quantity, refused, notes)
  values
    (p_household_id, p_animal_id, auth.uid(), p_fed_at, p_prey_type, p_prey_size, p_quantity, p_refused, p_notes)
  returning * into v_log;

  -- Keep last_fed_at consistent with the latest non-refused feeding.
  update public.animals a
     set last_fed_at = (
       select max(fl.fed_at) from public.feeding_logs fl
       where fl.animal_id = p_animal_id and fl.refused = false
     )
   where a.id = p_animal_id;

  -- Optional stock deduction in the same transaction.
  if p_feeder_item_id is not null and p_refused = false then
    insert into public.feeder_stock_events
      (household_id, feeder_item_id, user_id, event_type, quantity_delta, notes)
    values
      (p_household_id, p_feeder_item_id, auth.uid(), 'feeding', -p_quantity, p_notes);
  end if;

  return v_log;
end;
$$;

grant execute on function public.log_feeding(uuid, uuid, timestamptz, text, integer, boolean, text, text, uuid) to authenticated;

-- ── Feeder stock aggregation ─────────────────────────────────────────────────
-- Replaces the per-item getFeederStock() N+1 with one grouped query.
-- security_invoker makes the view honour the caller's RLS on feeder_stock_events.
create or replace view public.feeder_stock
with (security_invoker = true) as
  select
    feeder_item_id,
    household_id,
    coalesce(sum(quantity_delta), 0)::bigint as current_stock
  from public.feeder_stock_events
  group by feeder_item_id, household_id;
