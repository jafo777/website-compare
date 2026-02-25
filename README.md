# Website comparison

Compare two websites side by side. Enter two URLs; the app crawls both sites (up to 15 pages each), captures full-page screenshots, and shows matching pages (by URL path) next to each other.

## Getting Started

Install Playwright’s Chromium browser (required for screenshots):

```bash
npx playwright install chromium
```

Then run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Portable executable for another Mac (without installing Node)

You have two options: **Node.js SEA** (single executable) and a **portable .app-style folder** (recommended for this project).

### Node.js SEA (Single Executable Applications) — and why it doesn’t fit this app

[Node.js SEA](https://nodejs.org/api/single-executable-applications.html) lets you bundle **one** Node.js script (and its bundled dependencies) into a single binary. The other Mac runs that binary with no Node installed.

**How to create an SEA in general (Node 20.12+ / 21+):**

1. **One entry script** — SEA runs a single script (e.g. `dist/entry.cjs`). That script is built (e.g. with a bundler) so all JS code is in one (or a few) files.

2. **Config file** (e.g. `sea-config.json`):

   ```json
   {
     "main": "path/to/entry.cjs",
     "output": "website-compare-mac",
     "disableExperimentalSEAWarning": true
   }
   ```

3. **Build the executable:**

   ```bash
   node --build-sea sea-config.json
   ```

4. **Inject the blob into the Node binary** (so the final file is one executable):

   ```bash
   cp $(command -v node) website-compare-mac
   npx postject website-compare-mac NODE_SEA_BLOB sea.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
   ```

   (The sentinel value is from the `node --build-sea` output; use what Node prints.)

5. **On macOS, sign the binary** so it runs without quarantine issues:

   ```bash
   codesign --sign - --force website-compare-mac
   ```

**Why SEA doesn’t work for this Next.js + Playwright app:**

- **Next.js** is a server that loads many files from disk (`.next/`, routes, API routes). SEA is built for a single entry script and doesn’t package an entire server + file tree.
- **Playwright** uses native addons and **spawns an external Chromium process**. SEA can’t bundle Chromium; the browser must exist on the machine or be shipped separately.
- So you **cannot** turn this full app into one self-contained SEA binary that “just works” on another Mac without Node or other deps.

For a **small CLI or single-script** Node app, SEA is a good fit. For this stack, use the portable folder approach below instead.

### Recommended: portable folder for Mac (no Node install)

This gives a **single folder** (or .app bundle) the other person can run on their Mac without installing Node or npm. It’s not one binary, but it’s the approach that works with Next.js + Playwright.

**On your Mac:**

1. **Build and get Playwright Chromium:**

   ```bash
   npm run build
   npx playwright install chromium
   ```

2. **Prepare a folder** (e.g. `website-compare-portable/`):

   - Copy **`.next/standalone`** contents into the folder (so `server.js` and `.next/` are at the root of the folder).
   - Copy **`.next/static`** into `website-compare-portable/.next/static`.
   - Copy **`public`** into `website-compare-portable/public` (if it exists).
   - Find where Chromium was installed, e.g.:
     ```bash
     node -e "const path = require('path'); console.log(require('playwright-core').chromium.executablePath())"
     ```
     Copy that Chromium app/directory into the folder, e.g. `website-compare-portable/playwright-browsers/`.

3. **Bundle Node** so their Mac doesn’t need Node installed:

   - Download **Node 20 LTS** (or the same major you built with) for **macOS** from [nodejs.org](https://nodejs.org/) (e.g. “macOS Installer .pkg” or the binary tarball).
   - From the tarball, take the `bin/node` (and optionally `bin/npm`) and put them in a subfolder, e.g. `website-compare-portable/node/bin/node`.
   - Or use a prebuilt standalone Node binary for macOS and place it as `website-compare-portable/node/bin/node`.

4. **Launcher script** `run.sh` in the folder:

   ```sh
   #!/bin/sh
   cd "$(dirname "$0")"
   export PORT=3000
   export PLAYWRIGHT_BROWSERS_PATH="$PWD/playwright-browsers"
   exec "$PWD/node/bin/node" server.js
   ```

   Then:

   ```bash
   chmod +x run.sh
   ```

5. **Optional: wrap as a macOS .app** so they can double‑click:

   - Create `Website Compare.app/Contents/MacOS/` and put `run.sh` there (or a small script that runs `run.sh` and opens `http://localhost:3000` in the default browser).
   - In `Contents/Info.plist` you can set the app name and optionally have it open the browser on launch. The “executable” the .app runs is your script that starts the Node server.

6. **Zip and share** the folder (or the .app). On the other Mac they:

   - Unzip.
   - Run `./run.sh` from the folder, **or** double‑click the .app if you made one.
   - Open `http://localhost:3000` in a browser.

They do **not** need Node or npm installed; everything needed (Node binary, Chromium, app) is inside the folder.

### Summary

| Goal                         | Option              | Works for this app? |
|-----------------------------|---------------------|----------------------|
| One binary, no deps         | Node.js SEA         | No (Next.js + Playwright) |
| Run on another Mac, no Node| Portable folder + run.sh (or .app) | Yes |

So: use **SEA** for simple, single-script Node apps; for this project, use the **portable folder** (and optional .app) to run on another person’s Mac without installing Node or other dependencies.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
