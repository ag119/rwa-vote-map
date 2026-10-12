# RWA Vote Map

A shared map of every flat in Towers A, B and C for the RWA election. Campaign volunteers mark each household green (will vote for us), yellow (don't know yet) or red (won't vote for us), add notes, claim follow-ups and track nominations.

The page itself holds **no resident data**. Names, marks and nominations live in a private Google Sheet, reached through an Apps Script web app that checks a shared passcode.

## One-time setup

1. Create a new Google Sheet (e.g. "RWA Vote Map data").
2. In the Sheet: **Extensions → Apps Script**. Replace the contents of `Code.gs` with [`apps-script/Code.gs`](apps-script/Code.gs).
3. Add a second script file named `Seed` and paste the private seed script (kept outside this repo).
4. Pick `setup` in the function dropdown and click **Run**. Approve the permissions prompt (it only needs access to this Sheet).
5. Pick `seedData` and click **Run**. The `Residents` and `Candidates` tabs fill in. Then delete the `Seed` file from the editor.
6. In the `Settings` tab, change the `passcode` value from `change-me` to your group's passcode.
7. **Deploy → New deployment → Select type: Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Copy the Web app URL (ends in `/exec`).
8. Paste that URL into [`config.js`](config.js) and commit.

## Day-to-day

- Share the GitHub Pages link and the passcode with your team (WhatsApp is fine).
- Everyone enters the passcode and their own name once; the browser remembers it.
- Changes reach other people within about 12 seconds.
- To lock someone out, change the passcode in the `Settings` tab. Everyone will be asked for the new one.
- You can edit the Sheet directly too (fix names, flats, nominations); the page picks it up on the next refresh.

## Updating the backend

After editing `Code.gs`: **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**. The URL stays the same.

## Flat numbering

Flats use UGF numbering: UGF, 1, 2, 3, 4. A number given in the 1–5 style (e.g. "501") is our 401.
