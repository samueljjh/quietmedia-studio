# Quiet Studio

Hours, bookings, invoicing and running costs for Quiet Media. A single-page app served from GitHub Pages at studio.quietmedia.co.uk.

Business data lives in Quiet Media's Supabase database (London), in one `records` table with row-level security: only invited accounts can sign in and read it. A copy is cached on each device so the app opens offline. This repository holds only the app.

## Backups

The Studio menu bar app on the Mac (`menubar/`) saves the whole of Studio as one JSON file every night to a folder you choose, normally on the NAS: `Studio Backups/YYYY/MM/studio-YYYY-MM-DD.json`. It keeps every day for 30 days and the 1st of each month for good. Settings → Backups shows the last one, downloads one by hand and restores from a file (anything deleted or changed since comes back; anything added since is kept).

## Email

Email buttons (crew pencils, booking forms, releases, call sheets, and the client's pencil, confirmation and reminder) send straight from Studio through Resend, in one click. The message is the one shown on screen, with a button to the page it is about. Replies go to the Reply email in Settings. If sending is not set up, the button opens the mail app as it used to.

Setup: verify the sending domain in Resend, create a Resend API key with sending access, deploy `supabase/functions/email` as the Edge Function `email` with "Verify JWT" off, and add the key to it as the secret `RESEND_API_KEY`. In Studio, Settings → Sending to clients and crew → "Send emails from" must be an address on the verified domain (it falls back to the Reply email). "Send me a copy of every email" BCCs the Reply email, since emails sent this way do not appear in your own Sent folder.

## Agreements

International Collective's client page has an **Agreements** panel for the Data Processing Agreement and the Services and Licence Agreement. Samuel reads and signs one in Studio, which creates a private link (`sheets.quietmedia.co.uk/agreement/`) for the client to read and sign. The text lives in `agreements.js`; once Samuel signs, the text is stored and fingerprinted (SHA-256), and editing `agreements.js` only affects agreements created after that.

Signed agreements are kept in the `agreements` table (`supabase/agreements.sql`): only studio members can read it, the link's key is stored only as a fingerprint, and once the client signs, the database refuses any change or deletion. Each signature records the name, the drawn signature, the time, and (for the client) their email, IP address and device. Studio shows the signed copy straight from the database (View signed copy), with Save as PDF. After signing, the client's link can be switched off and on again from that view; the agreement itself stays stored either way. The client can save a PDF from their link before and after signing.

Setup: run `supabase/agreements.sql` in the Supabase SQL editor (and again whenever the file changes; it is safe to re-run), and redeploy the `notify` Edge Function so a push arrives when a client signs.

The nightly backup covers `records` only, so it does not include the signed agreements themselves. Save each signed copy as a PDF too.
