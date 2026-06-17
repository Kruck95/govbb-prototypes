# generator-v2 — Setup

This is a one-time setup. After it, "Save to library" works with one click.

---

## What you're setting up

You're telling GitHub that this app is allowed to ask you to sign in. Once you
sign in (once), the app gets a token GitHub gave you, and it uses that token to
commit new prototypes into your repos for you. No SSH keys, no terminal.

---

## Steps

### 1. Create a GitHub OAuth App

1. Open <https://github.com/settings/developers> in your browser.
2. Click **OAuth Apps** in the left sidebar.
3. Click **New OAuth App**.
4. Fill in:

   | Field | Value |
   |---|---|
   | Application name | `GovBB Form Generator` |
   | Homepage URL | `http://localhost:5173` |
   | Authorization callback URL | `http://localhost:5173/api/auth/github/callback` |
   | Application description | (anything, e.g. "Internal tool for digitising government forms") |

5. Leave **Enable Device Flow** unchecked.
6. Click **Register application**.

### 2. Get your Client ID and Client Secret

On the page you land on after registering:

1. Copy the **Client ID** (a short string like `Iv1.abcd1234`).
2. Click **Generate a new client secret**.
3. Copy the secret immediately — GitHub only shows it once. (If you lose it,
   you can always generate a new one.)

### 3. Tell the local server about them

Open a terminal in the project folder and start `api-server.js` with the
secrets set in the environment:

```bash
GITHUB_OAUTH_CLIENT_ID=Iv1.abcd1234 \
GITHUB_OAUTH_CLIENT_SECRET=ghs_abcdef1234567890 \
ANTHROPIC_API_KEY=sk-ant-... \
node api-server.js
```

(Replace the values with the ones you copied. `ANTHROPIC_API_KEY` is needed
for **reading uploaded forms** — when you drop a PDF/Word/photo, the app sends
its pages to Claude to turn them into form fields. Without the key, upload will
show an error. The GitHub values are only needed for save-to-library; you can
set just `ANTHROPIC_API_KEY` if you only want to read and edit forms.)

If you'd rather not type the env vars every time, put them in a file you keep
private:

```bash
# .env.local — do NOT commit this file
GITHUB_OAUTH_CLIENT_ID=Iv1.abcd1234
GITHUB_OAUTH_CLIENT_SECRET=ghs_abcdef1234567890
ANTHROPIC_API_KEY=sk-ant-...
```

…then source it before starting the server:

```bash
set -a && source .env.local && set +a && node api-server.js
```

(`.env.local` is already covered by the repo's `.gitignore`. Double-check
before committing.)

### 4. Start the generator-v2 app

In a separate terminal:

```bash
cd generator-v2
npm install   # one-time
npm run dev
```

Open <http://localhost:5173>. The Vite dev server proxies `/api/*` to
`api-server.js` on port 3001, so the GitHub callback works on a single origin.

### 5. Sign in

1. Click **📥 Save** from the editor.
2. In the "Where to save" panel, click **Sign in with GitHub**.
3. GitHub asks you to authorise the app once.
4. You're redirected back to the generator and shown as signed in.

That's it. From now on, **Save to library** writes three files to whichever
repo you pick and shows you the commit link.

---

## What gets committed

When you click **💾 Save to library**, the server makes one git commit
containing:

| File | What it is |
|---|---|
| `prototypes/<slug>.html` | The clickable prototype (same self-contained HTML the zip produces) |
| `schemas/<slug>.json` | Canonical schema — the source of truth |
| `lib/reference.js` | Updated to add the new form's reference prefix |

Commit message: `Add <slug> via Form Generator`.

---

## Repos you can save to

The dropdown shows:

- Every GitHub org you're a member of (e.g. `govtech-bb`)
- Your personal account (e.g. `Kruck95`)

The repo defaults to `govbb-prototypes`. Change it if you maintain a fork
under a different name.

> **Note**: The app only commits to repos you actually have write access to. If
> you pick an org repo where you're not a maintainer, GitHub will reject the
> commit and the modal will show the error.

---

## Reading uploaded forms (AI extraction)

When you drop a PDF, Word document, or photo of a form on the upload screen,
the app:

1. Reads the text/pages locally in your browser (pdf.js, Tesseract, mammoth).
2. Sends those pages to `POST /api/extract`, which calls Claude with forced
   tool-use and gets back a structured form (pages, fields, options, validation).
3. Opens the result in the editor, where you can fix anything before exporting.

For this to work, **the API server must be running with `ANTHROPIC_API_KEY`
set** (see step 3) and the app must be opened via `npm run dev` (so Vite proxies
`/api` to the server). Each form costs roughly a few US cents to read.

If extraction fails you'll see a message in the "Reading the form" screen:

- *"Could not reach the extraction server…"* — `api-server.js` isn't running.
  Start it in a terminal: `ANTHROPIC_API_KEY=sk-... npm run api`.
- *"The server has no ANTHROPIC_API_KEY…"* — the server is running but was
  started without the key. Stop it and restart with the key set.

---

## Troubleshooting

**"GitHub OAuth not configured"** — the env vars aren't set. Re-check step 3.

**"GitHub 404"** when committing — the slug already exists OR you don't have
write access to that repo. Try a different slug, or pick a different owner.

**Sign-in loops back to "not signed in"** — the cookie didn't stick. Check
that you started the dev server with `npm run dev` (not by opening the file
directly) so the Vite proxy is in play.

**Want to revoke the app's access** — go to
<https://github.com/settings/applications> and remove **GovBB Form Generator**.

---

## Scope of access

The OAuth app requests the `public_repo` scope only — that lets it write to
your public repositories. It cannot read private repos, your email, or any
other personal data.
