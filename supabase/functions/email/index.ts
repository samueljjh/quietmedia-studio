// Studio email. Sends a message from Studio through Resend, so Email is one click instead of opening a mail app.
// Deploy as the Edge Function `email` with "Verify JWT" turned OFF (the sign-in is checked below, the same way `notify` does it).
// Needs one secret: RESEND_API_KEY (Supabase → Edge Functions → Secrets). The key never reaches the browser.
//
// Studio calls it signed in with { to, subject, text, link?, label? }. Everything else comes from the database, read as
// the signed-in person so the usual row-level security applies: only studio members can send, and only from the studio's
// own address (Settings → Sending to clients and crew → Send emails from).
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const EMAIL = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/;
const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const oneLine = (s: unknown, max: number) => String(s || '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);
const httpsUrl = (s: unknown) => { try { const u = new URL(String(s || '')); return u.protocol === 'https:' ? u.href : ''; } catch (_) { return ''; } };

/* "Samuel" becomes "Samuel · Quiet Media" so the inbox shows who it is from; quotes and brackets can't break the header */
export function fromHeader(settings: any) {
  const address = String(settings.emailFrom || settings.replyEmail || '').trim();
  const clean = (s: string) => String(s || '').replace(/[<>"\r\n]/g, '').trim();
  const who = clean(settings.senderName); const co = clean(settings.companyName).replace(/\s+(Limited|Ltd\.?)$/i, '') || 'Quiet Media';
  const name = !who ? co : who.toLowerCase().includes(co.toLowerCase()) ? who : who + ' · ' + co;
  return { address, header: '"' + name + '" <' + address + '>' };
}

/* the message as written, with links made clickable and one clear button to the page it is about */
export function htmlBody(text: string, link: string, label: string) {
  const body = esc(text).replace(/https:\/\/[^\s<]+[^\s<.,;:!?)]/g, u => '<a href="' + u + '" style="color:#111111">' + u + '</a>').replace(/\n/g, '<br>');
  const button = link ? '<p style="margin:24px 0 0"><a href="' + esc(link) + '" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px">' + esc(label || 'Open') + '</a></p>' : '';
  return '<!doctype html><html><body style="margin:0;padding:24px;background:#ffffff;color:#111111;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5">' +
    '<div style="max-width:560px"><p style="margin:0">' + body + '</p>' + button + '</div></body></html>';
}

export async function handle(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  // @ts-ignore Deno global
  const env = (k: string) => Deno.env.get(k) || '';
  const key = env('RESEND_API_KEY');
  if (!key) return json({ error: 'Email is not set up yet: add the RESEND_API_KEY secret to the email function', code: 'setup' }, 503);

  // who is asking: the session Studio sent, checked by Supabase, then their studio and its settings read as them
  const auth = req.headers.get('Authorization') || '';
  const db = createClient(env('SUPABASE_URL'), req.headers.get('apikey') || env('SUPABASE_ANON_KEY'), { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: auth } } });
  const { data: u } = await db.auth.getUser(auth.replace(/^Bearer /, ''));
  if (!u || !u.user) return json({ error: 'Sign in to Studio first' }, 401);
  const { data: mem } = await db.from('members').select('org_id').limit(1);
  if (!mem || !mem.length) return json({ error: 'This account is not part of a studio' }, 403);
  const { data: row } = await db.from('records').select('data').eq('org_id', mem[0].org_id).eq('col', 'settings').eq('id', 'app').maybeSingle();
  const settings = (row && row.data) || {};

  const body = await req.json().catch(() => ({}));
  const to = String(body.to || '').trim();
  const subject = oneLine(body.subject, 200);
  const text = String(body.text || '').trim().slice(0, 20000);
  if (!EMAIL.test(to)) return json({ error: 'That email address does not look right: ' + (to || 'none given') }, 400);
  if (!subject || !text) return json({ error: 'Nothing to send' }, 400);
  const from = fromHeader(settings);
  if (!EMAIL.test(from.address)) return json({ error: 'Set "Send emails from" in Studio Settings first', code: 'setup' }, 503);
  const reply = String(settings.replyEmail || '').trim();
  const link = httpsUrl(body.link);

  const mail: Record<string, unknown> = { from: from.header, to: [to], subject, text, html: htmlBody(text, link, oneLine(body.label, 60)) };
  if (EMAIL.test(reply)) mail.reply_to = reply;
  if (settings.emailCopy && EMAIL.test(reply) && reply.toLowerCase() !== to.toLowerCase()) mail.bcc = [reply];
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify(mail) });
  const out = await r.json().catch(() => ({}));
  if (!r.ok) return json({ error: 'Resend would not send it: ' + (out.message || 'error ' + r.status) }, 502);
  return json({ sent: true, id: out.id || '' });
}
// @ts-ignore Deno global
if (globalThis.Deno) Deno.serve(handle);
