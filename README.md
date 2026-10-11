# UniConnect Frontend — ANURAG UNIVERSITY

Instagram-style web client for the UniConnect backend. Plain HTML/CSS/JavaScript (no build step).

- Sign up / log in only with `@anurag.edu.in` email addresses
- Instagram-like dashboard with the **ANURAG UNIVERSITY** wordmark
- Light and dark theme toggle (remembers your choice)
- Create posts with photos, like (double-tap too), comment and share
- Search students, suggested students, responsive on phones

## Run locally
1. Start the backend (see `uniconnect-backend`), default `http://localhost:8080`.
2. Serve this folder: `python3 -m http.server 5173` and open http://localhost:5173

## Deploy (GitHub Pages)
1. Repo **Settings → Pages → Source: GitHub Actions**.
2. Repo **Settings → Secrets and variables → Actions → Variables → New variable**:
   `API_URL` = `https://<your-backend-host>/api`
3. Push to `main` — the workflow publishes the site at `https://<username>.github.io/<repo>/`.
