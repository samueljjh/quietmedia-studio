-- Push notifications for Studio. Run once in the Supabase SQL editor, after deploying the `notify` Edge Function.
-- Safe to run again.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

-- one row per device that has turned notifications on
create table if not exists public.push_subs (
  endpoint   text primary key,
  org_id     text not null,
  user_id    uuid not null default auth.uid(),
  sub        jsonb not null,
  ua         text,
  created_at timestamptz not null default now()
);
alter table public.push_subs enable row level security;
drop policy if exists "own devices" on public.push_subs;
create policy "own devices" on public.push_subs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- the secret the database uses to call the function, and the function's signing keys (made on first use).
-- No policies: only the server can read it.
create table if not exists public.notify_config (
  id     int primary key default 1 check (id = 1),
  secret text not null,
  vapid  jsonb
);
alter table public.notify_config enable row level security;
insert into public.notify_config (id, secret) values (1, replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
  on conflict (id) do nothing;

-- call the function without ever holding up a save
create or replace function public.notify_push() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url := 'https://jxfnzlwwsvfcrstxpgzr.supabase.co/functions/v1/notify',
    body := jsonb_build_object('kind', tg_argv[0], 'record', to_jsonb(new)),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', (select secret from public.notify_config where id = 1)),
    timeout_milliseconds := 10000);
  return new;
exception when others then
  return new;
end $$;

drop trigger if exists push_enquiry on public.records;
create trigger push_enquiry after insert on public.records
  for each row when (new.col = 'enquiries') execute function public.notify_push('enquiry');

drop trigger if exists push_reply on public.sheet_responses;
create trigger push_reply after insert on public.sheet_responses
  for each row execute function public.notify_push('reply');

-- the morning summary: runs at 07:00 and 08:00 UTC; the function only sends at 8am London time, so it is right in summer and winter
select cron.schedule('studio-morning', '0 7,8 * * *', $cron$
  select net.http_post(
    url := 'https://jxfnzlwwsvfcrstxpgzr.supabase.co/functions/v1/notify',
    body := '{"kind":"morning"}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', (select secret from public.notify_config where id = 1)),
    timeout_milliseconds := 30000)
$cron$);
