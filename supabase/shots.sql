-- Shot lists: the crew link (sheets.quietmedia.co.uk/shots/) and full-size monitor grabs.
-- Run in the Supabase SQL editor. Safe to run again: after an update to this file, run the whole file again.
--
-- Shot lists themselves need no table: they are ordinary rows in `records`
-- (col = 'shotlists' for the list, 'shots' for each shot, 'shotnotes' for each note from set),
-- so Studio syncs, backs up and undoes them like everything else. A shot's id and a note's id start with their list's id.
--
-- How the link is kept safe:
--   * Studio makes a random key for a list and stores it in the list (share.key, share.on). Switching the link off removes the key.
--   * The public page can only reach a list through the functions below, and only with the right key while the link is on.
--   * With the key a person can: read the list; tick a shot; log a grab against a shot; add or remove a note; tick a
--     look, prop or question. They cannot add, delete or rewrite shots, or change the list itself. Everything they send is
--     checked and trimmed, and nothing outside that one list can be touched.
--   * Full-size grabs are in `shot_grabs`. Only studio members can read the table; the link reads one grab at a time with the key.

create table if not exists public.shot_grabs (
  shot_id    text primary key check (shot_id ~ '^[A-Za-z0-9_-]{4,80}$'),
  list_id    text not null,
  org_id     text not null,
  img        text not null check (img like 'data:image/jpeg;base64,%' and length(img) <= 1500000),
  updated_at timestamptz not null default now()
);
create index if not exists shot_grabs_list on public.shot_grabs (list_id);

alter table public.shot_grabs enable row level security;
revoke all on public.shot_grabs from anon;
grant select, insert, update, delete on public.shot_grabs to authenticated;

drop policy if exists "members read grabs" on public.shot_grabs;
create policy "members read grabs" on public.shot_grabs for select to authenticated
  using (org_id in (select m.org_id::text from public.members m));
drop policy if exists "members add grabs" on public.shot_grabs;
create policy "members add grabs" on public.shot_grabs for insert to authenticated
  with check (org_id in (select m.org_id::text from public.members m));
drop policy if exists "members change grabs" on public.shot_grabs;
create policy "members change grabs" on public.shot_grabs for update to authenticated
  using (org_id in (select m.org_id::text from public.members m))
  with check (org_id in (select m.org_id::text from public.members m));
drop policy if exists "members delete grabs" on public.shot_grabs;
create policy "members delete grabs" on public.shot_grabs for delete to authenticated
  using (org_id in (select m.org_id::text from public.members m));

-- the list a link opens, or nothing if the key is wrong or the link is off
create or replace function public.shotlist_by_link(p_id text, p_token text)
returns public.records
language sql
stable
security definer
set search_path = public
as $$
  select r.* from public.records r
   where r.col = 'shotlists' and r.id = p_id and r.deleted_at is null
     and p_id ~ '^[A-Za-z0-9_-]{4,40}$'
     and length(coalesce(p_token, '')) between 16 and 100
     and r.data -> 'share' ->> 'key' = p_token
     and (r.data -> 'share' -> 'on') = 'true'::jsonb
   limit 1
$$;
revoke all on function public.shotlist_by_link(text, text) from public, anon, authenticated;

-- the public page: read the list. p_have is what the page already holds ({record id: updated_at}); only what is new,
-- changed or gone since then comes back, so asking every few seconds stays small.
create or replace function public.get_shotlist(p_id text, p_token text, p_have jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  l      public.records;
  v_have jsonb := case when jsonb_typeof(p_have) = 'object' then p_have else '{}'::jsonb end;
  v_rows jsonb;
  v_ids  jsonb;
begin
  l := public.shotlist_by_link(p_id, p_token);
  if l.id is null then return null; end if;

  select coalesce(jsonb_agg(jsonb_build_object('col', r.col, 'id', r.id, 'u', r.updated_at, 'data', r.data)), '[]'::jsonb)
    into v_rows
    from public.records r
   where r.org_id = l.org_id and r.col in ('shots', 'shotnotes') and r.deleted_at is null
     and left(r.id, length(p_id) + 1) = p_id || '-'
     and (v_have ->> r.id) is distinct from r.updated_at::text;

  select coalesce(jsonb_agg(r.id), '[]'::jsonb)
    into v_ids
    from public.records r
   where r.org_id = l.org_id and r.col in ('shots', 'shotnotes') and r.deleted_at is null
     and left(r.id, length(p_id) + 1) = p_id || '-';

  return jsonb_build_object(
    'u', l.updated_at,
    'list', case when (v_have ->> p_id) is distinct from l.updated_at::text then l.data - 'share' - 'projectId' else null end,
    'rows', v_rows,
    'ids', v_ids);
end
$$;

-- the public page: tick or untick a shot, or log a grab against it. Only `done` and `grab` can be changed.
create or replace function public.update_shot(p_id text, p_token text, p_shot text, p_patch jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  l     public.records;
  v_now bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_set jsonb := '{}'::jsonb;
  d     jsonb;
  g     jsonb;
  k     text;
  v_out public.records;
begin
  l := public.shotlist_by_link(p_id, p_token);
  if l.id is null then raise exception 'this link is not valid'; end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' or octet_length(p_patch::text) > 200000 then raise exception 'not valid'; end if;
  if p_shot is null or left(p_shot, length(p_id) + 1) <> p_id || '-' then raise exception 'not valid'; end if;

  if p_patch ? 'done' then
    d := p_patch -> 'done';
    if jsonb_typeof(d) = 'object' then
      v_set := v_set || jsonb_build_object('done', jsonb_build_object('at', v_now, 'by', left(coalesce(btrim(d ->> 'by'), ''), 40)));
    else
      v_set := v_set || jsonb_build_object('done', null);
    end if;
  end if;

  if p_patch ? 'grab' and jsonb_typeof(p_patch -> 'grab') = 'object' then
    d := p_patch -> 'grab';
    g := jsonb_build_object('at', v_now, 'by', left(coalesce(btrim(d ->> 'by'), ''), 40));
    foreach k in array array['focal', 'stop', 'focus', 'height', 'other'] loop
      if d ? k then g := g || jsonb_build_object(k, left(coalesce(d ->> k, ''), 300)); end if;
    end loop;
    if d ? 'thumb' then
      if (d ->> 'thumb') not like 'data:image/jpeg;base64,%' or length(d ->> 'thumb') > 150000 then raise exception 'photo is not valid'; end if;
      g := g || jsonb_build_object('thumb', d ->> 'thumb', 'img', v_now);
    end if;
    -- keep whatever was logged before and lay the new values over it
    v_set := v_set || jsonb_build_object('grab', coalesce(
      (select case when jsonb_typeof(r.data -> 'grab') = 'object' then r.data -> 'grab' else '{}'::jsonb end
         from public.records r where r.org_id = l.org_id and r.col = 'shots' and r.id = p_shot), '{}'::jsonb) || g);
  end if;

  if v_set = '{}'::jsonb then raise exception 'nothing to change'; end if;

  update public.records r set data = r.data || v_set, updated_at = greatest(v_now, r.updated_at + 1)
   where r.org_id = l.org_id and r.col = 'shots' and r.id = p_shot and r.deleted_at is null
   returning r.* into v_out;
  if v_out.id is null then raise exception 'that shot is no longer on the list'; end if;
  return jsonb_build_object('col', 'shots', 'id', v_out.id, 'u', v_out.updated_at, 'data', v_out.data);
end
$$;

-- the public page: add a note against a shot (p_text) or remove one (p_text null)
create or replace function public.note_shot(p_id text, p_token text, p_note text, p_shot text, p_by text, p_text text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  l     public.records;
  v_now bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_n   int;
begin
  l := public.shotlist_by_link(p_id, p_token);
  if l.id is null then raise exception 'this link is not valid'; end if;
  if p_note is null or p_note !~ '^[A-Za-z0-9_-]{6,80}$' or left(p_note, length(p_id) + 2) <> p_id || '-n' then raise exception 'not valid'; end if;

  if p_text is null then
    update public.records r set data = '{}'::jsonb, deleted_at = v_now, updated_at = greatest(v_now, r.updated_at + 1)
     where r.org_id = l.org_id and r.col = 'shotnotes' and r.id = p_note and r.deleted_at is null;
    return jsonb_build_object('ok', true, 'id', p_note, 'gone', true);
  end if;

  if btrim(p_text) = '' then raise exception 'the note is empty'; end if;
  if exists (select 1 from public.records r where r.org_id = l.org_id and r.col = 'shotnotes' and r.id = p_note) then
    return jsonb_build_object('ok', true, 'id', p_note);   -- already saved (the page sent it twice)
  end if;
  if not exists (select 1 from public.records r where r.org_id = l.org_id and r.col = 'shots' and r.id = p_shot and r.deleted_at is null
                    and left(r.id, length(p_id) + 1) = p_id || '-') then
    raise exception 'that shot is no longer on the list';
  end if;
  -- a list holds at most 2000 notes, so the link cannot be used to flood it
  select count(*) into v_n from public.records r
   where r.org_id = l.org_id and r.col = 'shotnotes' and r.deleted_at is null and left(r.id, length(p_id) + 1) = p_id || '-';
  if v_n >= 2000 then raise exception 'this list has too many notes'; end if;

  insert into public.records (org_id, col, id, data, updated_at, deleted_at)
  values (l.org_id, 'shotnotes', p_note, jsonb_build_object(
      'listId', p_id, 'shotId', p_shot, 'by', left(coalesce(btrim(p_by), ''), 40), 'at', v_now, 'text', left(btrim(p_text), 2000)), v_now, null);
  return jsonb_build_object('ok', true, 'id', p_note, 'u', v_now);
end
$$;

-- the public page: tick or untick a look, a prop or a question
create or replace function public.check_shotlist(p_id text, p_token text, p_kind text, p_item text, p_done boolean, p_by text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  l     public.records;
  v_now bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_arr jsonb;
begin
  l := public.shotlist_by_link(p_id, p_token);
  if l.id is null then raise exception 'this link is not valid'; end if;
  if p_kind not in ('looks', 'props', 'questions') or jsonb_typeof(l.data -> p_kind) <> 'array' then raise exception 'not valid'; end if;

  select coalesce(jsonb_agg(case when x ->> 'id' = p_item
           then x || jsonb_build_object('done', coalesce(p_done, false), 'by', case when p_done then left(coalesce(btrim(p_by), ''), 40) else '' end)
           else x end order by ord), '[]'::jsonb)
    into v_arr
    from jsonb_array_elements(l.data -> p_kind) with ordinality as t(x, ord);

  update public.records r set data = jsonb_set(r.data, array[p_kind], v_arr), updated_at = greatest(v_now, r.updated_at + 1)
   where r.org_id = l.org_id and r.col = 'shotlists' and r.id = p_id;
  return jsonb_build_object('ok', true);
end
$$;

-- the public page: store and fetch the full-size grab for a shot
create or replace function public.put_shot_grab(p_id text, p_token text, p_shot text, p_img text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  l public.records;
begin
  l := public.shotlist_by_link(p_id, p_token);
  if l.id is null then raise exception 'this link is not valid'; end if;
  if p_img is null or p_img not like 'data:image/jpeg;base64,%' or length(p_img) > 1500000 then raise exception 'photo is not valid'; end if;
  if not exists (select 1 from public.records r where r.org_id = l.org_id and r.col = 'shots' and r.id = p_shot and r.deleted_at is null
                    and left(r.id, length(p_id) + 1) = p_id || '-') then
    raise exception 'that shot is no longer on the list';
  end if;
  insert into public.shot_grabs (shot_id, list_id, org_id, img, updated_at) values (p_shot, p_id, l.org_id::text, p_img, now())
  on conflict (shot_id) do update set img = excluded.img, updated_at = now();
  return jsonb_build_object('ok', true);
end
$$;

create or replace function public.get_shot_grab(p_id text, p_token text, p_shot text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  l public.records;
begin
  l := public.shotlist_by_link(p_id, p_token);
  if l.id is null then return null; end if;
  return (select g.img from public.shot_grabs g where g.shot_id = p_shot and g.list_id = p_id and g.org_id = l.org_id::text);
end
$$;

revoke all on function public.get_shotlist(text, text, jsonb) from public;
revoke all on function public.update_shot(text, text, text, jsonb) from public;
revoke all on function public.note_shot(text, text, text, text, text, text) from public;
revoke all on function public.check_shotlist(text, text, text, text, boolean, text) from public;
revoke all on function public.put_shot_grab(text, text, text, text) from public;
revoke all on function public.get_shot_grab(text, text, text) from public;
grant execute on function public.get_shotlist(text, text, jsonb) to anon, authenticated;
grant execute on function public.update_shot(text, text, text, jsonb) to anon, authenticated;
grant execute on function public.note_shot(text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.check_shotlist(text, text, text, text, boolean, text) to anon, authenticated;
grant execute on function public.put_shot_grab(text, text, text, text) to anon, authenticated;
grant execute on function public.get_shot_grab(text, text, text) to anon, authenticated;
