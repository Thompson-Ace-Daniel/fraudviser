# Fraudviser

Fraudviser is a Nigerian-focused listing safety guide for buyers and sellers. It returns one concise, structured AI opinion with practical next steps. The asking price is saved for the user's reference and is never sent to AI or assessed. Recommendations are decision support, not proof of fraud or authenticity.

## Project layout

- `fraudviser-frontend`: React 19, Vite, React Router, Tailwind CSS 4 and Lucide icons.
  - `src/pages/` — Landing, Auth, workspace pages (Overview, Analyze, History, Result), and 404.
  - `src/components/` — layout shell, assessment tables/headings, and an error boundary.
  - `src/state/` + `src/hooks/` — auth and workspace state providers and their hooks.
  - `src/utils/` — shared currency/date formatting and assessment helpers.
- `fraudviser-backend`: Express 5 API and Mongoose models/services.
  - `routes/` — auth and API routers; `middleware/` — origin guard, DB guard, security headers, errors.
  - `services/` — listing validation and optional trusted price imports; `gemini.js` — one-call structured AI opinion.
  - `constants/` — environment configuration and the database URL resolver.
- MongoDB stores market price observations and assessment history.

## Requirements and setup

Use Node.js 20+ and a reachable MongoDB server. Each app already has its dependencies installed.

1. Copy `fraudviser-backend/.env.example` to `fraudviser-backend/.env` and set `MONGODB_URL` to your MongoDB connection URI. The API uses the `fraudviser` database. Set `GEMINI_API_KEY` to enable AI reviews. Set `FRONTEND_ORIGIN` to the exact frontend origin(s), comma separated. For a cross-site frontend/API deployment, set `COOKIE_SAME_SITE=none` and use HTTPS.
2. For local development, leave `fraudviser-frontend/.env` unset: Vite proxies same-origin `/api` to the backend on `localhost:3000`. In production, set `VITE_API_URL` to the deployed backend URL ending in `/api`; do not let a production build fall back to localhost.
3. Start MongoDB.
4. In `fraudviser-backend`, run `npm start`.
5. For a repeatable classroom example, in a second backend terminal run `npm run seed:demo`. It upserts an explicitly labelled demo dataset and can safely be run again. It never creates assessment history or runs on server startup.
6. In `fraudviser-frontend`, run `npm run dev` and open the local URL Vite prints.

The public landing page is `/`. Users create buyer or seller accounts at `/register`, sign in at `/login`, and enter the protected workspace at `/app`. History and individual assessment routes require a valid session. Passwords are salted and hashed with Node's scrypt; session tokens are random, stored only as hashes in MongoDB, and sent to the browser in HttpOnly cookies. Sessions expire after seven days. Login and registration attempts are rate limited in MongoDB. Set production `FRONTEND_ORIGIN` explicitly, set frontend `VITE_API_URL` to the deployed backend, and serve both sites over HTTPS. Vercel's SPA rewrite is in `fraudviser-frontend/vercel.json`; set the Vercel project root to `fraudviser-frontend` so it applies.

## Listing review

The review form accepts a product, service, rental, or other deal description, an optional asking price for the user's own reference, an optional listing link, and optional concerns. The backend stores the asking price with the assessment but excludes it from the Gemini request. The AI does not browse the web, extract market prices, calculate a benchmark, or judge an asking price.

One Gemini Flash request returns constrained JSON containing a recommendation, a short opinion, up to three reasons, up to three next steps, and up to three useful missing details. The response is validated before saving. Buyer and seller accounts get role-specific guidance. If the AI is unavailable, the listing is saved and the user can retry; refreshing an older assessment generates the new compact response from its saved listing details.

The result page displays the opinion, its concrete reasons and steps, and details the user actually supplied. It hides empty values and older price-analysis fields. AI advice is a decision aid: it cannot confirm a seller's identity or prove that an item is genuine or fake.

Trusted price records are never sent to AI. When at least two recent, independent, exact-name and exact-condition records are available, the backend calculates a plain arithmetic reference average and displays it without retailer names or links. Demo rows are excluded. The separate price-record import API is disabled unless `MARKET_IMPORT_TOKEN` is configured and supplied in the `x-market-import-token` header; keep that token server-side.

## API

- `POST /api/auth/register` — create an account and start a session.
- `POST /api/auth/login` — sign in.
- `GET /api/auth/me` — current session user.
- `POST /api/auth/logout` — revoke the current session.
- `GET /api/health` — service health for operators.
- `POST /api/analysis` — validate and save a listing, then request one structured Gemini opinion (`201` complete, `202` saved listing with AI pending).
- `GET /api/analysis?limit=20` — newest assessment history.
- `GET /api/analysis/:id` — individual saved assessment.
- `POST /api/analysis/:id/retry` — regenerate the opinion from the saved listing; accepts `{ "refresh": true }` to update an older completed report.
- `POST /api/analysis/:id/feedback` — save validated user feedback, scoped to the assessment owner.
- `GET /api/market-prices` — stored market records and source types.
- `POST /api/market-prices/import` — validate and upsert permitted observations.

All analysis, feedback, history, and market read routes require authentication; market import instead requires the trusted server-side import token. Each assessment and feedback submission is owner-scoped; looking up another user's assessment returns 404. Public registration is rate limited. Configure allowed origins, secure cookies, HTTPS, MongoDB backups, and monitoring before public launch. Model availability depends on the configured Gemini account and its API access/billing settings. The deployed Vercel rewrite has not been exercised against a live deployment.

## Checks

From `fraudviser-frontend`: `npm run build` and `npm run lint`.
From `fraudviser-backend`: `npm test` runs deterministic validation, matching, mean, and AI-schema tests. It does not call the live Gemini search service or require market credentials.

Backend checks include deterministic listing and legacy market-record validation. MongoDB persistence and history retrieval should be demonstrated with MongoDB running and a valid local `.env` configuration.

## Demo data

`npm run seed:demo` can populate illustrative price records for backend demonstrations. Those demo rows do not count toward market reference averages. Properly imported, recent exact matches can be averaged separately from the AI opinion. The result view stays focused on the user's details and concise recommendation; it does not present a numeric fraud score.
