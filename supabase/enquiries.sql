-- Booking requests from the public availability page (sheets.quietmedia.co.uk/availability/).
-- Run once in the Supabase SQL editor. Safe to run again.
--
-- A request is stored as an ordinary row in `records` (col = 'enquiries'), so Studio picks it up through
-- the sync and realtime it already has, and only members of the studio can read it.
-- The page is public, so this function is the only way in: it checks and trims everything it is given
-- and keeps only the fields below.

create or replace function public.submit_enquiry(p_slug text, p_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org   public.availability.org_id%type;
  v_now   bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_id    text;
  v_dates jsonb;
  v_n     int;
begin
  select org_id into v_org from public.availability where slug = p_slug limit 1;
  if v_org is null then raise exception 'unknown studio'; end if;

  if p_data is null or jsonb_typeof(p_data) <> 'object' or octet_length(p_data::text) > 8000 then
    raise exception 'request is not valid';
  end if;
  if coalesce(btrim(p_data->>'name'), '') = '' or coalesce(btrim(p_data->>'email'), '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'please add your name and a valid email';
  end if;

  -- no more than 30 requests an hour reach the studio, so the page cannot be used to flood it
  select count(*) into v_n from public.records
   where org_id = v_org and col = 'enquiries' and (data->>'received')::bigint > v_now - 3600000;
  if v_n >= 30 then raise exception 'too many requests right now, please email us instead'; end if;

  select coalesce(jsonb_agg(jsonb_build_object('d', x->>'d', 'maybe', (x->'maybe') = 'true'::jsonb)), '[]'::jsonb)
    into v_dates
    from (select x from jsonb_array_elements(case when jsonb_typeof(p_data->'dates') = 'array' then p_data->'dates' else '[]'::jsonb end) x
           where jsonb_typeof(x) = 'object' and (x->>'d') ~ '^\d{4}-\d{2}-\d{2}$' limit 60) s;

  v_id := 'enq' || to_char(clock_timestamp(), 'YYMMDDHH24MISS') || substr(md5(random()::text), 1, 6);

  insert into public.records (org_id, col, id, data, updated_at, deleted_at)
  values (v_org, 'enquiries', v_id, jsonb_build_object(
      'name',     left(btrim(p_data->>'name'), 120),
      'email',    left(btrim(p_data->>'email'), 160),
      'phone',    left(coalesce(btrim(p_data->>'phone'), ''), 40),
      'company',  left(coalesce(btrim(p_data->>'company'), ''), 120),
      'project',  left(coalesce(btrim(p_data->>'project'), ''), 160),
      'location', left(coalesce(btrim(p_data->>'location'), ''), 160),
      'details',  left(coalesce(btrim(p_data->>'details'), ''), 3000),
      'dates',    v_dates,
      'status',   'new',
      'received', v_now
    ), v_now, null);

  return jsonb_build_object('ok', true, 'id', v_id);
end
$$;

revoke all on function public.submit_enquiry(text, jsonb) from public;
grant execute on function public.submit_enquiry(text, jsonb) to anon, authenticated;
