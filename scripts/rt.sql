insert into judgments (id, citation, provisions, "legalIssue") 
values ('_test_roundtrip', 'TEST', '["S151"]'::jsonb, '["LI1"]'::jsonb) 
on conflict (id) do update set provisions='["S151"]'::jsonb, "legalIssue"='["LI1"]'::jsonb;
select to_jsonb(row_to_json(t)) as r from (
  select provisions::text as p, "legalIssue"::text as l from judgments where id='_test_roundtrip'
) t;
