import fs from 'fs';
const SQL = fs.readFileSync('scripts/probe.sql', 'utf8');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const URL = 'https://draqiendljxssicwfjyc.supabase.co';
const headers = { 'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY, 'Content-Type': 'application/json' };
let res = await fetch(`${URL}/rest/v1/rpc/exec_sql`, { method: 'POST', headers, body: JSON.stringify({ sql: SQL }) });
console.log('CREATE probe STATUS:', res.status, await res.text());
// Now insert a test row with jsonb arrays
const ins = `insert into judgments (id, citation, provisions, "legalIssue") values ('_test_roundtrip','TEST','["S151"]'::jsonb,'["LI1"]'::jsonb) on conflict (id) do update set provisions='["S151"]'::jsonb,"legalIssue"='["LI1"]'::jsonb;`;
res = await fetch(`${URL}/rest/v1/rpc/exec_sql`, { method: 'POST', headers, body: JSON.stringify({ sql: ins }) });
console.log('INSERT STATUS:', res.status, (await res.text()).slice(0,200));
// Now call lex_probe
res = await fetch(`${URL}/rest/v1/rpc/lex_probe`, { method: 'POST', headers, body: JSON.stringify({ p_id: '_test_roundtrip' }) });
console.log('PROBE STATUS:', res.status, await res.text());
// Cleanup
res = await fetch(`${URL}/rest/v1/rpc/exec_sql`, { method: 'POST', headers, body: JSON.stringify({ sql: "delete from judgments where id='_test_roundtrip';" }) });
console.log('CLEANUP STATUS:', res.status);
