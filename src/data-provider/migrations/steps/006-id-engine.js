// Step 006 — LX-ID sequence manager
export const version = 6;
export const description = 'Create next_lx_id function';
export const sql = `
create or replace function next_lx_id(p_entity text)
returns text
language plpgsql
as $$
declare
  v_prefix text;
  v_pad int;
  v_seq int;
  v_id text;
begin
  insert into entity_prefix_registry (entity, prefix, label, padding, current_sequence)
  values (p_entity, upper(substr(p_entity, 1, 5)), p_entity, 5, 0)
  on conflict (entity) do nothing;
  select prefix, padding into strict v_prefix, v_pad from entity_prefix_registry where entity = p_entity;
  update entity_prefix_registry
  set current_sequence = current_sequence + 1,
      updated_at = now()
  where entity = p_entity
  returning current_sequence into v_seq;
  v_id := 'LX-' || v_prefix || '-' || lpad(v_seq::text, v_pad, '0');
  return v_id;
end;
$$;
`;
