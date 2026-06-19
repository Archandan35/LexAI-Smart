// Step 007 — Supabase auth compatibility layer
export const version = 7;
export const description = 'Create current_user_role() function for Supabase auth.uid() mapping';
export const sql = `
create or replace function current_user_role()
returns text
language plpgsql
security definer
stable
as $$
declare
  v_role text;
begin
  if current_setting('role', true) = 'lexai_admin' then return 'admin'; end if;
  begin
    if auth.uid() is null then
      if current_user = 'anon' then return 'anon'; end if;
      if current_user = 'service_role' then return 'admin'; end if;
      return 'anon';
    end if;
    select role_code into strict v_role from users where id = auth.uid()::text;
    return v_role;
  exception
    when others then
      if current_user = 'authenticated' then return 'user'; end if;
      return 'anon';
  end;
end;
$$;
`;
