create or replace function lex_probe(p_id text)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_p jsonb;
  v_l jsonb;
begin
  select provisions, "legalIssue" into v_p, v_l from judgments where id = p_id;
  return jsonb_build_object('provisions', v_p, 'legalIssue', v_l);
end;
$$;
