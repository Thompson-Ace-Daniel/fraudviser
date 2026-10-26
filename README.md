# Fraudviser

Fraudviser is a Nigerian-focused listing assessment site. It grounds price checks in source-linked website offers, calculates an arithmetic mean on the backend, and asks AI to produce one validated, evidence-referenced assessment. It does not produce a fraud probability or a 0–100 score.

## Project layout

- `fraudviser-frontend`: React 19, Vite, React Router, Tailwind CSS 4 and Lucide icons.
  - `src/pages/` — Landing, Auth, workspace pages (Overview, Analyze, History, Result), and 404.
  - `src/components/` — layout shell, assessment tables/headings, and an error boundary.
  - `src/state/` + `src/hooks/` — auth and workspace state providers and their hooks.
  - `src/utils/` — shared currency/date formatting and assessment helpers.
- `fraudviser-backend`: Express 5 API and Mongoose models/services.
  - `routes/` — auth and API routers; `middleware/` — origin guard, DB guard, security headers, errors.
  - `services/` — listing validation, price benchmarks, and market search; `gemini.js` — AI integration.
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

## Market data and import

The assessment form asks for two details: a free-form description of the item or service, including model/specification and condition when known, and its asking price. Gemini extracts search attributes from that description, then uses Google Search grounding to check Jumia Nigeria (`jumia.com.ng`), Konga (`konga.com`), and Jiji (`jiji.ng`). A result counts only when its HTTPS URL is present in Google's grounding metadata and the offer matches the available product attributes and condition. Offers must be identified as Nigeria, priced in NGN, available, and show a clear total price. If the condition cannot be identified, the app does not create a like-for-like benchmark. Sources are search results, not retailer APIs; the site does not scrape retailer pages. If search or matching fails, the report says so and does not invent a price.

Accepted observations store the title, seller when visible, canonical URL/domain, product attributes, condition, NGN price, country, observed/retrieved dates, availability, promotional flag, and match status in `PriceRecord`. Existing `demo` rows are never used as source evidence. Imported observations must include a Nigeria HTTPS source, explicit NGN currency, confirmed availability, exact match status, and whether the displayed price includes required charges. The importer is disabled unless `MARKET_IMPORT_TOKEN` is configured and supplied in the `x-market-import-token` header; keep that token server-side.

The backend import endpoint accepts a JSON array (or `{ "records": [...] }`) with `productName`, `category`, `condition`, and `price`, plus optional `brand`, `model`, `storage`, `source`, `observedAt`, `location`, and `referenceId`. Conditions include `new`, `used`, `refurbished`, `open_box`, `near_expiry`, and `service`; prices are positive NGN amounts. Product categories and kinds are not restricted to electronics. Import only records you are permitted to use. The server normalizes identity, validates rows, upserts by source and reference ID, and labels the records `imported`. This write endpoint is disabled unless `MARKET_IMPORT_TOKEN` is configured and supplied in the `x-market-import-token` header; keep that token on trusted server-side jobs only.

## Analysis method

The primary mean uses at most one accepted offer from each independent source domain and only exact-condition matches. Duplicate URLs/domains and clearly syndicated offers are counted once. Non-NGN offers, wrong variants/conditions, unavailable listings, unclear total charges, stale dated observations, and source URLs absent from grounding metadata are excluded with reasons. No currency conversion or numeric risk score is used. Three accepted sources make a complete benchmark; one or two make it provisional; zero means price cannot be assessed. The backend calculates `mean = sum(prices) / count`, `difference = asking price − mean`, and `percentage difference = difference / mean × 100`. The result chart shows the observed source-price range beside the asking price.

The assessment schema is versioned (`2.0`) and validated before persistence. Gemini receives the submitted listing, accepted/excluded source observations, source attempts, and backend-calculated values, then generates the assessment summary, qualitative conclusion, supported findings with evidence references, advice, questions, checks, missing information, limitations, and next steps. The frontend renders this validated report as its assessment source of truth; backend price fields overwrite any model-generated arithmetic. Invalid AI output is retried with the configured fallback model. If AI generation remains unavailable, the assessment and price-source evidence are saved with a pending/invalid status and can be retried without losing the evidence. No numeric fraud score is generated.

Before payment, users are advised to inspect the item, verify specifications and proof of ownership independently, and avoid unprotected deposits. Missing seller data means unknown, not proven fraudulent.

## API

- `POST /api/auth/register` — create an account and start a session.
- `POST /api/auth/login` — sign in.
- `GET /api/auth/me` — current session user.
- `POST /api/auth/logout` — revoke the current session.
- `GET /api/health` — service health for operators.
- `POST /api/analysis` — validate listing, attempt three grounded website searches, calculate the mean, generate and save the structured assessment (`201` complete, `202` saved evidence with AI pending).
- `GET /api/analysis?limit=20` — newest assessment history.
- `GET /api/analysis/:id` — individual saved assessment.
- `POST /api/analysis/:id/retry` — retry AI generation from the saved source evidence.
- `POST /api/analysis/:id/feedback` — save validated user feedback, scoped to the assessment owner.
- `GET /api/market-prices` — stored market records and source types.
- `POST /api/market-prices/import` — validate and upsert permitted observations.

All analysis, feedback, history, and market read routes require authentication; market import instead requires the trusted server-side import token. Each assessment and feedback submission is owner-scoped; looking up another user's assessment returns 404. Public registration is rate limited. Configure allowed origins, secure cookies, HTTPS, MongoDB backups, and monitoring before public launch. Search grounding and model availability depend on the configured Gemini account and its API access/billing settings. The deployed Vercel rewrite has not been exercised against a live deployment.

## Checks

From `fraudviser-frontend`: `npm run build` and `npm run lint`.
From `fraudviser-backend`: `npm test` runs deterministic validation, matching, mean, and AI-schema tests. It does not call the live Gemini search service or require market credentials.

Backend unit checks use deterministic test fixtures and do not represent market observations. MongoDB persistence and history retrieval should be demonstrated with MongoDB running and a valid local `.env` configuration.

## Demo data

`npm run seed:demo` can populate clearly labelled sample rows for interface walkthroughs. These demo rows are not used as assessment evidence and do not count as live market offers. A live three-source comparison requires the configured Gemini Search grounding service to return three independent matching listings. If it returns fewer, the report marks the mean as provisional or unavailable and explains the evidence gap. The result dashboard presents the arithmetic mean, source observations, condition ranges when available, qualitative findings, and recommendations; it does not present a numeric fraud score.
