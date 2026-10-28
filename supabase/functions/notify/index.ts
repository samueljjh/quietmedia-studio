// Studio push notifications. Deploy as the Edge Function `notify` with "Verify JWT" turned OFF
// (the database calls it with its own secret; Studio calls it signed in, and both are checked below).
//   kind 'enquiry'  a booking request arrived       (database trigger on records)
//   kind 'reply'    crew replied to a form          (database trigger on sheet_responses)
//   kind 'morning'  what's on today, sent at 8am    (pg_cron, runs 07:00 and 08:00 UTC, sends at 8 London time)
//   kind 'key'/'test'  from Studio: the public key to subscribe with, and a test to your own devices
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const SUBJECT = 'mailto:hello@quietmedia.co.uk';
const TZ = 'Europe/London';

/* ---------- Web Push with plain WebCrypto: RFC 8291 encryption, RFC 8292 VAPID ---------- */
const enc = new TextEncoder();
export const b64u = (buf: ArrayBuffer | Uint8Array) => { let s = ''; for (const b of new Uint8Array(buf)) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
export const ub64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
const cat = (...a: Uint8Array[]) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };
const hkdf = async (salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number) => new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info },
  await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']), len * 8));

export async function makeVapid() {
  const k = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']) as CryptoKeyPair;
  return { publicKey: b64u(await crypto.subtle.exportKey('raw', k.publicKey)), privateJwk: await crypto.subtle.exportKey('jwk', k.privateKey) };
}
// asKey and salt are only passed by the test against the RFC 8291 example
export async function encrypt(text: string, p256dh: string, auth: string, asKey?: CryptoKeyPair, salt?: Uint8Array) {
  const ua = ub64u(p256dh);
  salt = salt || crypto.getRandomValues(new Uint8Array(16));
  const as = asKey || await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair;
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', as.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', ua, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, as.privateKey, 256));
  const ikm = await hkdf(ub64u(auth), shared, cat(enc.encode('WebPush: info\0'), ua, asPub), 32);
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, cat(enc.encode(text), new Uint8Array([2]))));
  return cat(salt, new Uint8Array([0, 0, 16, 0, asPub.length]), asPub, ct);
}
export async function vapidHeader(endpoint: string, vapid: any) {
  const h = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const c = b64u(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: SUBJECT })));
  const key = await crypto.subtle.importKey('jwk', vapid.privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(h + '.' + c));
  return 'vapid t=' + h + '.' + c + '.' + b64u(sig) + ', k=' + vapid.publicKey;
}
async function sendPush(sub: any, msg: any, vapid: any) {
  const r = await fetch(sub.endpoint, { method: 'POST', body: await encrypt(JSON.stringify(msg), sub.keys.p256dh, sub.keys.auth), headers: {
    'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '86400', Urgency: 'high', Authorization: await vapidHeader(sub.endpoint, vapid) } });
  return { status: r.status, reply: r.status < 300 ? '' : (await r.text().catch(() => '')).slice(0, 200) };
}

/* ---------- what to say ---------- */
const londonKey = (t: number) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t));
const londonHour = (t: number) => +new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hourCycle: 'h23' }).format(new Date(t));
const shortDate = (k: string) => new Date(k + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const first = (s: string) => String(s || '').split(' ')[0];

export function enquiryMsg(rec: any) {
  const d = rec.data || {}; const ds = (d.dates || []).map((x: any) => shortDate(x.d));
  return { title: 'New booking request', body: (d.name || 'Someone') + (d.company ? ' · ' + d.company : '') + (d.project ? ' · ' + d.project : '') + (ds.length ? '\n' + ds.join(', ') : ''), tag: 'enq-' + rec.id };
}
export function replyMsg(r: any, sheet: any, crewName: string) {
  const d = r.data || {}; const p = sheet.payload || {}; const who = crewName || p.name || 'Crew'; const job = p.title || 'the job';
  if (r.kind === 'crewpencil') return { title: d.hold ? 'Pencil held' : 'Pencil declined', body: who + (d.hold ? ' is holding ' : ' can’t do ') + job + (d.note ? ': “' + String(d.note).slice(0, 140) + '”' : ''), tag: 'rep-' + r.id };
  if (r.kind === 'crewbook') return { title: d.accept ? 'Booking signed' : 'Booking turned down', body: who + (d.accept ? ' signed the booking for ' : ' turned down ') + job + (!d.accept && d.note ? ': “' + String(d.note).slice(0, 140) + '”' : ''), tag: 'rep-' + r.id };
  if (r.kind === 'callack' && d.what === 'confirmed') return { title: 'Call sheet confirmed', body: who + ' confirmed the timings for ' + job, tag: 'rep-' + r.id };
  return null;
}
/* the same things Today shows: today's bookings, requests waiting, pencils to send or chase */
export function morningMsg(rows: any[], now: number) {
  const of = (c: string) => rows.filter(r => r.col === c).map(r => ({ ...r.data, id: r.id }));
  const settings = (rows.find(r => r.col === 'settings' && r.id === 'app') || { data: {} }).data;
  const clients: any = Object.fromEntries(of('clients').map(c => [c.id, c]));
  const today = londonKey(now); const events = of('events').filter(e => e.status !== 'cancelled');
  const lines: string[] = [];
  const todays = events.filter(e => londonKey(e.start) === today && e.type !== 'Unavailable').sort((a, b) => a.start - b.start);
  for (const e of todays) {
    const t = e.title || (clients[e.clientId] || {}).name || e.type; const pen = e.status === 'pencil' ? ' (pencil)' : '';
    lines.push(e.type === 'Shoot' ? 'Filming ' + t + (e.callTime ? ', call ' + e.callTime : '') + pen : e.type === 'Edit' ? 'Editing ' + t + pen : e.type + ': ' + t + pen);
  }
  const reqs = of('enquiries').filter(q => (q.status || 'new') === 'new').length;
  if (reqs) lines.push(reqs + ' booking request' + (reqs === 1 ? '' : 's') + ' waiting');
  const seen: any = {}; let chase = 0, unsent = 0; const days = +settings.pencilDays || 7;
  for (const e of events) {
    if (e.status !== 'pencil' || !e.clientId || londonKey(e.start) < today) continue;
    const k = e.groupId || e.id; if (seen[k]) continue; seen[k] = 1;
    if (!e.pencilSent) unsent++; else if ((now - e.pencilSent) / 864e5 >= days) chase++;
  }
  if (chase) lines.push(chase + ' pencil' + (chase === 1 ? '' : 's') + ' to chase');
  if (unsent) lines.push(unsent + ' pencil' + (unsent === 1 ? '' : 's') + ' not sent yet');
  if (!lines.length) return null;
  return { title: todays.length ? 'Today' : 'Nothing booked today', body: lines.join('\n'), tag: 'morning-' + today };
}

/* ---------- handler ---------- */
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// the server key: the legacy service role key, or the newer secret key on projects that use publishable/secret keys
function serverKey() {
  // @ts-ignore Deno global
  const env = (k: string) => Deno.env.get(k) || '';
  if (env('SUPABASE_SERVICE_ROLE_KEY')) return env('SUPABASE_SERVICE_ROLE_KEY');
  if (env('SUPABASE_SECRET_KEY')) return env('SUPABASE_SECRET_KEY');
  try { const all = JSON.parse(env('SUPABASE_SECRET_KEYS') || '{}'); return all.default || Object.values(all)[0] || ''; } catch (_) { return ''; }
}

async function handle(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (!serverKey()) return json({ error: 'No server key found in the function environment' }, 500);
  // @ts-ignore Deno global
  const db = createClient(Deno.env.get('SUPABASE_URL'), serverKey(), { auth: { persistSession: false } });
  const body = await req.json().catch(() => ({}));
  const { data: cfg } = await db.from('notify_config').select('secret,vapid').eq('id', 1).maybeSingle();
  if (!cfg) return json({ error: 'Run supabase/push.sql first' }, 500);
  let vapid = cfg.vapid;
  if (!vapid) { vapid = await makeVapid(); await db.from('notify_config').update({ vapid }).eq('id', 1); }

  const toSubs = async (subs: any[], msg: any) => {
    let sent = 0;
    if (!subs || !subs.length) console.log('push: no devices to send to');
    for (const s of subs || []) {
      const host = (() => { try { return new URL(s.endpoint).host; } catch (_) { return '?'; } })();
      try {
        const { status, reply } = await sendPush(s.sub, { ...msg, url: './' }, vapid);
        console.log('push', msg.tag, host, status, reply);   // shows in the function's Logs: 201 = accepted
        if (status === 404 || status === 410) await db.from('push_subs').delete().eq('endpoint', s.endpoint); else if (status < 300) sent++;
      } catch (e) { console.log('push', msg.tag, host, 'failed', String(e)); /* one bad device never stops the rest */ }
    }
    return sent;
  };
  const toOrg = async (org: string, msg: any) => { if (!msg) return json({ skipped: true }); const { data } = await db.from('push_subs').select('endpoint,sub').eq('org_id', String(org)); return json({ sent: await toSubs(data || [], msg) }); };

  if (req.headers.get('x-notify-secret') === cfg.secret) {
    if (body.kind === 'enquiry') return toOrg(body.record.org_id, enquiryMsg(body.record));
    if (body.kind === 'reply') {
      const r = body.record; const { data: sheet } = await db.from('sheets').select('org_id,payload').eq('id', r.sheet_id).maybeSingle(); if (!sheet) return json({ skipped: true });
      let name = '';
      if (r.kind === 'callack' && r.data && r.data.person) { const { data: c } = await db.from('records').select('data').eq('org_id', sheet.org_id).eq('col', 'crew').eq('id', r.data.person).maybeSingle(); name = (c && c.data && c.data.name) || ''; }
      return toOrg(sheet.org_id, replyMsg(r, sheet, name));
    }
    if (body.kind === 'morning') {
      const now = Date.now(); if (londonHour(now) !== 8 && !body.force) return json({ skipped: 'not 8am in London' });
      const { data: subs } = await db.from('push_subs').select('endpoint,sub,org_id'); const orgs = [...new Set((subs || []).map((s: any) => s.org_id))];
      let sent = 0;
      for (const org of orgs) {
        const rows: any[] = [];
        for (let p = 0; p < 50; p++) { const { data, error } = await db.from('records').select('col,id,data').eq('org_id', org).in('col', ['events', 'enquiries', 'settings', 'clients']).is('deleted_at', null).order('id').range(p * 1000, p * 1000 + 999); if (error || !data) break; rows.push(...data); if (data.length < 1000) break; }
        sent += await toSubs((subs || []).filter((s: any) => s.org_id === org), morningMsg(rows, now));
      }
      return json({ sent });
    }
    return json({ error: 'unknown kind' }, 400);
  }

  // from Studio: must be signed in
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer /, '');
  const { data: u } = await db.auth.getUser(token);
  if (!u || !u.user) return json({ error: 'Sign in to Studio first' }, 401);
  if (body.kind === 'key') return json({ key: vapid.publicKey });
  if (body.kind === 'test') { const { data } = await db.from('push_subs').select('endpoint,sub').eq('user_id', u.user.id); return json({ sent: await toSubs(data || [], { title: 'Studio', body: 'Notifications are working on this device.', tag: 'test' }) }); }
  return json({ error: 'unknown kind' }, 400);
}
// @ts-ignore Deno global
if (globalThis.Deno) Deno.serve(handle);
