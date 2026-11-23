# Quiet Studio

Hours, bookings, invoicing and running costs for Quiet Media. A single-page app served from GitHub Pages at studio.quietmedia.co.uk.

Business data lives in Quiet Media's Supabase database (London), in one `records` table with row-level security: only invited accounts can sign in and read it. A copy is cached on each device so the app opens offline. This repository holds only the app.

## Backups

The Studio menu bar app on the Mac (`menubar/`) saves the whole of Studio as one JSON file every night to a folder you choose, normally on the NAS: `Studio Backups/YYYY/MM/studio-YYYY-MM-DD.json`. It keeps every day for 30 days and the 1st of each month for good. Settings → Backups shows the last one, downloads one by hand and restores from a file (anything deleted or changed since comes back; anything added since is kept).

## Email

Email buttons (crew pencils, booking forms, releases, call sheets, and the client's pencil, confirmation and reminder) send straight from Studio through Resend, in one click. The message is the one shown on screen, with a button to the page it is about. Replies go to the Reply email in Settings. If sending is not set up, the button opens the mail app as it used to.

Setup: verify the sending domain in Resend, create a Resend API key with sending access, deploy `supabase/functions/email` as the Edge Function `email` with "Verify JWT" off, and add the key to it as the secret `RESEND_API_KEY`. In Studio, Settings → Sending to clients and crew → "Send emails from" must be an address on the verified domain (it falls back to the Reply email). "Send me a copy of every email" BCCs the Reply email, since emails sent this way do not appear in your own Sent folder.

## Project booking form

A project has a **Client booking form** (on the project, and linked from any of its days under Client booking): one form for the whole project rather than a page per day. The price lines are free text, so each client can be shown the price the way that suits them: one fee, or a line each for filming and editing ("Editing, approx 3 days, £1,000"), plus an optional note and the days booked so far. It uses the booking terms from Settings.

Publishing makes a private link on the Sheets site (`sheets.quietmedia.co.uk/booking/`) where the client reads it, types their name and signs. When they sign, the project shows as signed in Studio, its pencilled days become confirmed, and a push arrives. Updating a published form means the client signs again; a signature on the older version no longer counts.

It is stored and answered like a crew booking form (the `sheets` and `sheet_responses` tables, and the same two database functions), so it needs no database change.

## Shot lists

A project can have a **shot list** (the Shot list button on the project, and a panel on Today while it is being shot). It holds the shoot days (location, hours, parking, house rules), the blocks in each day with their look codes, every shot (ID, priority, A cam and B cam set-up and lens, action, notes), the running order, and wardrobe looks, props and open questions as checklists. On set: tick shots, filter by day, block and priority, and see the P1 shots left.

A shot marked **GRAB** takes a photo of the monitor plus focal length, stop, focus distance and camera height; shots marked **MATCH** show that grab and its numbers so the frame can be lined up again.

**Share with crew** makes a private link on the Sheets site (`sheets.quietmedia.co.uk/shots/`). Anyone with it can tick shots, log grabs and add notes, and everyone sees changes within a few seconds; they cannot change the list itself. Switching the link off kills it; switching it on again makes a new one.

The list is stored as records like everything else (`shotlists`, one record per shot in `shots`, one per note in `shotnotes`), so it syncs, works offline, undoes and is in the nightly backup. Shot lists are brought in from a `.json` file (Import from a file) or built by hand; "Download a copy" on the Info tab saves one out. Shot list files are not kept in this repository, which is public.

Setup: run `supabase/shots.sql` in the Supabase SQL editor (safe to re-run). It adds the functions the link uses and the `shot_grabs` table for full-size grabs. Full-size grabs are not in the nightly backup; the small copy inside each shot is.

## Agreements

International Collective's client page has an **Agreements** panel for the Data Processing Agreement and the Services and Licence Agreement. Samuel reads and signs one in Studio, which creates a private link (`sheets.quietmedia.co.uk/agreement/`) for the client to read and sign. The text lives in `agreements.js`; once Samuel signs, the text is stored and fingerprinted (SHA-256), and editing `agreements.js` only affects agreements created after that.

Signed agreements are kept in the `agreements` table (`supabase/agreements.sql`): only studio members can read it, the link's key is stored only as a fingerprint, and once the client signs, the database refuses any change or deletion. Each signature records the name, the drawn signature, the time, and (for the client) their email, IP address and device. Studio shows the signed copy straight from the database (View signed copy), with Save as PDF. After signing, the client's link can be switched off and on again from that view; the agreement itself stays stored either way. The client can save a PDF from their link before and after signing.

Setup: run `supabase/agreements.sql` in the Supabase SQL editor (and again whenever the file changes; it is safe to re-run), and redeploy the `notify` Edge Function so a push arrives when a client signs.

The nightly backup covers `records` only, so it does not include the signed agreements themselves. Save each signed copy as a PDF too.
