import fs from 'fs';
const SQL = fs.readFileSync('scripts/rt.sql', 'utf8');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const URL = 'https://draqiendljxssicwfjyc.supabase.co';
const headers = { 'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY, 'Content-Type': 'application/json' };
const res = await fetch(`${URL}/rest/v1/rpc/exec_sql`, { method: 'POST', headers, body: JSON.stringify({ sql: SQL }) });
const txt = await res.text();
console.log('STATUS:', res.status);
console.log('BODY:', txt.slice(0, 800));
