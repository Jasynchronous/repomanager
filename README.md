# RepoPilot — GitHub Repository Manager

A responsive **Next.js web application for Vercel** to see personal GitHub repositories and change their visibility from **Public** to **Private** (or vice versa). No desktop app or GitHub CLI is needed after deployment.

**Status:** Source code is complete and local static tests pass. It has **not** been connected to a live GitHub account or deployed to Vercel from this environment; you must configure GitHub OAuth and deploy it.

## Features

- Sign in with GitHub OAuth.
- **Single-account access control** via `ALLOWED_GITHUB_USERNAME` — app denies other GitHub users by default.
- Read your **personally owned** repositories (public and private), with pagination up to 1,000.
- Dashboard counts: all / public / private / archived.
- Search, filter, sort, multi-select, select all shown.
- Make one or multiple repositories public or private.
- Explicit confirmation (and an extra acknowledgement checkbox before publishing code).
- Sequential updates with progress and per-repository error messages. Updates that already succeeded will **not** automatically roll back if you stop the operation.
- Mobile responsive layout.
- Server-side GitHub REST API calls; GitHub access token is not included in browser-readable session data.

## Stack

- Next.js (App Router), React, TypeScript, CSS
- NextAuth.js with GitHub OAuth
- GitHub REST API
- Lucide icons
- Designed for Vercel

## Step 1 — Create a GitHub OAuth App

Go to **https://github.com/settings/developers** → **OAuth Apps** → **New OAuth App**.

For LOCAL testing, enter:

| Field | Value |
| --- | --- |
| Application name | RepoPilot Local |
| Homepage URL | `http://localhost:3000` |
| Authorization callback URL | `http://localhost:3000/api/auth/callback/github` |

Copy the **Client ID** and generate a **Client secret**.

> **Important:** The application requests `repo` and `read:user` scopes. The `repo` scope grants **broad** access to your GitHub repositories. Only deploy your own trusted code, never share secrets, and revoke the OAuth app in GitHub settings if you no longer use it. This is a personal tool and does not support organization-managed repositories. GitHub Apps with fine-grained permissions are a safer alternative for a product offered to the public.

## Step 2 — Run on Windows or macOS/Linux

Install Node.js 20.9+ and unpack this project. From inside the project folder:

```bash
npm install
```

Copy `.env.example` to `.env.local` and edit its five variables:

```env
GITHUB_CLIENT_ID=YOUR_GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET=YOUR_GITHUB_CLIENT_SECRET
NEXTAUTH_SECRET=YOUR_GENERATED_SECRET
NEXTAUTH_URL=http://localhost:3000
ALLOWED_GITHUB_USERNAME=YOUR_ACTUAL_GITHUB_USERNAME
```

To generate the random secret in PowerShell, Command Prompt, or Terminal:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Run:

```bash
npm run dev
```

Visit **http://localhost:3000**, select **Continue with GitHub**, and authorize the OAuth App.

**Troubleshooting:**

- `AccessDenied`: your signed-in GitHub username must match `ALLOWED_GITHUB_USERNAME` exactly (ignoring case).
- `redirect_uri_mismatch`: the GitHub OAuth App callback URL must exactly match your app's actual domain and `/api/auth/callback/github`.
- No private repos: check whether you granted the requested `repo` scope and reauthorize the app.
- `NEXTAUTH_SECRET` errors: ensure it contains a randomly generated 32-byte secret and is present in Vercel settings.
- GitHub 403 / 422: GitHub account policy or permission might block visibility updates, or you may have hit an API limit.

## Step 3 — Deploy on Vercel

1. Create a **PRIVATE GitHub repository** for this project and push the files (do not commit `.env.local`).
2. Go to **https://vercel.com/new**, select **Import Git Repository**, and choose that repo.
3. Framework: **Next.js** (detected automatically). Leave default build settings.
4. Set production environment variables in Vercel **Project → Settings → Environment Variables**:

   | Variable | Value |
   | --- | --- |
   | `GITHUB_CLIENT_ID` | Production GitHub OAuth App Client ID |
   | `GITHUB_CLIENT_SECRET` | Production GitHub OAuth App Client Secret |
   | `NEXTAUTH_SECRET` | Strong randomly generated secret |
   | `ALLOWED_GITHUB_USERNAME` | Your exact GitHub username |
   | `NEXTAUTH_URL` | `https://YOUR-PROJECT.vercel.app` (or your custom domain) |

5. Deploy. Once your Vercel URL is known, make sure the **production GitHub OAuth App** has:
   - Homepage: `https://YOUR-PROJECT.vercel.app`
   - Authorization callback: `https://YOUR-PROJECT.vercel.app/api/auth/callback/github`
6. Redeploy if you changed environment variables. Open the Vercel URL and sign in.

**Why a second OAuth App?** Separate local and production GitHub OAuth apps avoid callback domain mixups. For production, you can register the production OAuth App after Vercel gives you its URL, then set the environment variables and redeploy. Preview deployments have their own URLs and require matching callback URLs if you enable OAuth on previews.

## Security notes

- The app prevents non-allowlisted accounts from logging in. The API validates the authenticated username on every request.
- Backend API derives the GitHub repository **owner from the logged-in account**, not from an untrusted request. There are no public endpoints for changing arbitrary organizations' repositories.
- The GitHub OAuth token is stored in NextAuth's secure HttpOnly JWT session cookie and is used only by server code. Do not expose `GITHUB_CLIENT_SECRET` or `NEXTAUTH_SECRET` as `NEXT_PUBLIC_` variables.
- GitHub's OAuth `repo` scope is broad. Avoid deploying preview branches or public forks with unreviewed code. We recommend restricting the Vercel deployment and keeping this source repository private.
- Making a repo **public** can expose prior commits and accidentally committed credentials.
- Making a repo **private** can disable GitHub Pages and does not privatize previously created public forks.
- App does not scan repository contents for secrets or maintain an audit log. Check repositories manually before publishing.
- You cannot undo visibility side effects (e.g. exposure of copied credentials) just by switching a repo back to private.
- No database is required; the current state is fetched from GitHub.
- Auth sessions expire after eight hours by default.

## Commands

```bash
npm run dev       # Local development
npm run build     # Production build
npm run start     # Run production server
npm run typecheck # TypeScript check
npm test          # Lightweight local structural checks
```

## Important limitations

- Supports **personal repositories you own**, not organization repositories or projects where you only collaborate.
- Loads at most 1,000 repositories per refresh, and shows a notice if it encounters that limit.
- Applies changes one repository at a time so progress and errors are visible; very large selections may take a while. A stopped operation does not revert completed changes.
- GitHub visibility restrictions and API rate limits still apply.

## Official references

- GitHub OAuth App: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app
- GitHub REST repository endpoints: https://docs.github.com/en/rest/repos/repos
- GitHub visibility caveats: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility
- NextAuth GitHub provider: https://next-auth.js.org/providers/github
- Vercel deploying Next.js: https://vercel.com/docs/frameworks/full-stack/nextjs
"# repomanager" 
