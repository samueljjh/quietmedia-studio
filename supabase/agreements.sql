-- Agreements clients sign by private link (sheets.quietmedia.co.uk/agreement/).
-- Run in the Supabase SQL editor. Safe to run again: after an update to this file, run the whole file again.
--
-- How it is kept safe:
--   * Studio members (the same people who can read `records`) can create agreements and see them. Nobody else can read the table.
--   * The link holds a random key. Only a fingerprint (SHA-256) of the key is stored, so the table alone can't be used to open a link.
--   * The public page can only reach an agreement through get_agreement / sign_agreement, and only with the right key.
--   * The text is fingerprinted (SHA-256) when Quiet Media signs. The client's page checks the fingerprint, and signing is
--     refused if the text they were shown isn't the text that was signed.
--   * Once the client has signed, nothing about the agreement can be changed or deleted, not even from Studio.
--     The one exception is the link: Studio can switch it off and on (link_off). The agreement itself stays.
--   * Each signature records the name, the drawn signature, the time, the IP address and the device.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.agreements (
  id              text primary key check (id ~ '^[A-Za-z0-9_-]{6,40}$'),
  org_id          text not null,
  client_id       text not null,
  kind            text not null,
  title           text not null,
  doc_html        text not null,
  doc_hash        text not null,
  token_hash      text not null,
  provider        jsonb not null,
  counterparty    jsonb,
  client_sig      jsonb,
  signed_at       timestamptz,
  revoked         boolean not null default false,
  first_opened_at timestamptz,
  last_opened_at  timestamptz,
  open_count      int not null default 0,
  created_at      timestamptz not null default now(),
  created_by      uuid
);
alter table public.agreements add column if not exists link_off boolean not null default false;
create index if not exists agreements_client on public.agreements (org_id, client_id);

alter table public.agreements enable row level security;
revoke all on public.agreements from anon;

drop policy if exists "members read agreements" on public.agreements;
create policy "members read agreements" on public.agreements for select to authenticated
  using (org_id in (select m.org_id::text from public.members m));
drop policy if exists "members create agreements" on public.agreements;
create policy "members create agreements" on public.agreements for insert to authenticated
  with check (org_id in (select m.org_id::text from public.members m));
drop policy if exists "members cancel agreements" on public.agreements;
create policy "members cancel agreements" on public.agreements for update to authenticated
  using (org_id in (select m.org_id::text from public.members m))
  with check (org_id in (select m.org_id::text from public.members m));
-- no delete policy: agreements are never deleted from Studio

-- the caller's IP address, as passed on by Supabase
create or replace function public.agreement_ip() returns text
language sql stable set search_path = public as $$
  select nullif(left(btrim(coalesce(
    (nullif(current_setting('request.headers', true), '')::jsonb) ->> 'cf-connecting-ip',
    split_part((nullif(current_setting('request.headers', true), '')::jsonb) ->> 'x-forwarded-for', ',', 1),
    '')), 64), '')
$$;

create or replace function public.agreement_sig_ok(p_sig text) returns boolean
language sql immutable as $$
  select coalesce(p_sig, '') ~ '^data:image/png;base64,[A-Za-z0-9+/=]+$' and length(p_sig) between 200 and 400000
$$;

-- what Studio may write, and what it may never change
create or replace function public.agreements_guard() returns trigger
language plpgsql set search_path = public, extensions as $$
begin
  if tg_op = 'DELETE' then
    if old.signed_at is not null then raise exception 'a signed agreement cannot be deleted'; end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    if not public.agreement_sig_ok(new.provider ->> 'sig') then raise exception 'a drawn signature is needed'; end if;
    if length(coalesce(btrim(new.provider ->> 'name'), '')) < 2 then raise exception 'the signer''s name is needed'; end if;
    if new.token_hash !~ '^[0-9a-f]{64}$' then raise exception 'the link key is not valid'; end if;
    if length(new.doc_html) > 200000 then raise exception 'the agreement is too long'; end if;
    new.doc_hash := encode(digest(convert_to(new.doc_html, 'UTF8'), 'sha256'), 'hex');
    new.provider := jsonb_build_object(
      'name',      left(btrim(new.provider ->> 'name'), 120),
      'role',      left(coalesce(btrim(new.provider ->> 'role'), ''), 80),
      'company',   left(coalesce(btrim(new.provider ->> 'company'), ''), 120),
      'sig',       new.provider ->> 'sig',
      'ua',        left(coalesce(new.provider ->> 'ua', ''), 200),
      'ip',        public.agreement_ip(),
      'signed_at', to_jsonb(now()),
      'user_id',   auth.uid(),
      'doc_hash',  new.doc_hash);
    new.client_sig := null; new.signed_at := null; new.revoked := false; new.link_off := false;
    new.first_opened_at := null; new.last_opened_at := null; new.open_count := 0;
    new.created_at := now(); new.created_by := auth.uid();
    return new;
  end if;

  -- UPDATE. From Studio, the only changes allowed are: cancelling the link of an agreement the client hasn't signed,
  -- and switching the link of a signed agreement off or on.
  -- (get_agreement and sign_agreement below run as the database owner, so they can record opens and the signature.)
  if current_user in ('anon', 'authenticated') then
    if (to_jsonb(new) - 'revoked' - 'link_off') is distinct from (to_jsonb(old) - 'revoked' - 'link_off') then
      raise exception '%', case when old.signed_at is not null then 'a signed agreement cannot be changed' else 'only cancelling the link is allowed' end;
    end if;
    if old.signed_at is not null then
      if new.revoked is distinct from old.revoked then raise exception 'a signed agreement cannot be cancelled'; end if;
    else
      if new.link_off is distinct from old.link_off then raise exception 'cancel the link instead'; end if;
      if old.revoked and not new.revoked then raise exception 'a cancelled link cannot be reopened'; end if;
    end if;
  elsif old.signed_at is not null and (new.client_sig is distinct from old.client_sig or new.signed_at is distinct from old.signed_at
        or new.doc_html is distinct from old.doc_html or new.doc_hash is distinct from old.doc_hash or new.provider is distinct from old.provider) then
    raise exception 'a signed agreement cannot be changed';
  end if;
  return new;
end $$;

drop trigger if exists agreements_guard on public.agreements;
create trigger agreements_guard before insert or update or delete on public.agreements
  for each row execute function public.agreements_guard();

-- the public page: open an agreement with its link
create or replace function public.get_agreement(p_id text, p_token text, p_count boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  r public.agreements%rowtype;
begin
  if p_id is null or p_token is null or length(p_token) > 100 or length(p_id) > 40 then return null; end if;
  select * into r from public.agreements
   where id = p_id and token_hash = encode(digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');
  if not found or (r.revoked and r.signed_at is null) then return null; end if;
  if r.link_off then return jsonb_build_object('off', true, 'title', r.title); end if;

  if p_count then
    update public.agreements set open_count = open_count + 1, last_opened_at = now(), first_opened_at = coalesce(first_opened_at, now())
     where id = r.id;
  end if;

  return jsonb_build_object(
    'id', r.id, 'kind', r.kind, 'title', r.title, 'doc_html', r.doc_html, 'doc_hash', r.doc_hash, 'created_at', r.created_at,
    'provider', jsonb_build_object('name', r.provider ->> 'name', 'role', r.provider ->> 'role', 'company', r.provider ->> 'company',
                                   'sig', r.provider ->> 'sig', 'signed_at', r.provider -> 'signed_at'),
    'counterparty', r.counterparty,
    'client', case when r.client_sig is null then null else jsonb_build_object(
        'name', r.client_sig ->> 'name', 'role', r.client_sig ->> 'role', 'company', r.client_sig ->> 'company', 'email', r.client_sig ->> 'email',
        'sig', r.client_sig ->> 'sig', 'signed_at', r.client_sig -> 'signed_at', 'ip', r.client_sig ->> 'ip', 'ua', r.client_sig ->> 'ua') end,
    'signed_at', r.signed_at);
end
$$;

-- the public page: the client signs
create or replace function public.sign_agreement(p_id text, p_token text, p_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  r       public.agreements%rowtype;
  v_name  text;
  v_role  text;
  v_email text;
begin
  if p_id is null or p_token is null or length(p_token) > 100 or length(p_id) > 40 then raise exception 'this link is not valid'; end if;
  select * into r from public.agreements
   where id = p_id and token_hash = encode(digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex')
   for update;
  if not found or r.revoked then raise exception 'this link is no longer valid'; end if;
  if r.signed_at is not null then raise exception 'this agreement has already been signed'; end if;

  if p_data is null or jsonb_typeof(p_data) <> 'object' or octet_length(p_data::text) > 450000 then raise exception 'the signature could not be read'; end if;
  if (p_data -> 'agreed') is distinct from 'true'::jsonb then raise exception 'please tick the box to agree'; end if;
  if coalesce(p_data ->> 'doc_hash', '') <> r.doc_hash then
    raise exception 'the agreement text does not match what was signed by Quiet Media. Reload the page and try again';
  end if;

  v_name := btrim(coalesce(p_data ->> 'name', ''));
  if length(v_name) < 2 or length(v_name) > 120 then raise exception 'please type your full name'; end if;
  v_role := left(btrim(coalesce(p_data ->> 'role', '')), 80);
  v_email := lower(btrim(coalesce(p_data ->> 'email', '')));
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 160 then raise exception 'please add a valid email address'; end if;
  if not public.agreement_sig_ok(p_data ->> 'sig') then raise exception 'please draw your signature'; end if;

  update public.agreements set
    client_sig = jsonb_build_object(
      'name', v_name, 'role', v_role, 'company', coalesce(r.counterparty ->> 'company', ''), 'email', v_email,
      'sig', p_data ->> 'sig', 'ip', public.agreement_ip(), 'ua', left(coalesce(p_data ->> 'ua', ''), 200),
      'signed_at', to_jsonb(now()), 'doc_hash', r.doc_hash),
    signed_at = now()
  where id = r.id;

  return public.get_agreement(p_id, p_token, false);
end
$$;

revoke all on function public.get_agreement(text, text, boolean) from public;
revoke all on function public.sign_agreement(text, text, jsonb) from public;
grant execute on function public.get_agreement(text, text, boolean) to anon, authenticated;
grant execute on function public.sign_agreement(text, text, jsonb) to anon, authenticated;

-- a push notification when a client signs (uses the push setup from push.sql, if it has been run)
create or replace function public.notify_agreement() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url := 'https://jxfnzlwwsvfcrstxpgzr.supabase.co/functions/v1/notify',
    body := jsonb_build_object('kind', 'agreement', 'record', jsonb_build_object(
      'id', new.id, 'org_id', new.org_id, 'title', new.title, 'name', new.client_sig ->> 'name', 'company', new.client_sig ->> 'company')),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', (select secret from public.notify_config where id = 1)),
    timeout_milliseconds := 10000);
  return new;
exception when others then
  return new;
end $$;

drop trigger if exists push_agreement on public.agreements;
create trigger push_agreement after update on public.agreements
  for each row when (old.signed_at is null and new.signed_at is not null) execute function public.notify_agreement();
