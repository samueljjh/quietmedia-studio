# Quiet Studio

Hours, bookings, invoicing and running costs for Quiet Media. A single-page app served from GitHub Pages at studio.quietmedia.co.uk.

Business data lives in Quiet Media's Supabase database (London), in one `records` table with row-level security: only invited accounts can sign in and read it. A copy is cached on each device so the app opens offline. This repository holds only the app.

## Backups

The Studio menu bar app on the Mac (`menubar/`) saves the whole of Studio as one JSON file every night to a folder you choose, normally on the NAS: `Studio Backups/YYYY/MM/studio-YYYY-MM-DD.json`. It keeps every day for 30 days and the 1st of each month for good. Settings → Backups shows the last one, downloads one by hand and restores from a file (anything deleted or changed since comes back; anything added since is kept).
