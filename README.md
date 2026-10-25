# Fraudviser

Fraudviser is a Nigerian-focused online listing comparison and observable risk assessment MVP. It combines a strict comparable-price lookup with an explainable rule-based risk summary. The score is decision support, not a calibrated probability or a verdict about a seller.

## Project layout

- `fraudviser-frontend`: React 19, Vite, React Router, Tailwind CSS 4 and Lucide icons.
- `fraudviser-backend`: Express 5 API and Mongoose models/services.
- MongoDB stores market price observations and assessment history.

## Requirements and setup

Use Node.js 20+ and a reachable MongoDB server. Each app already has its dependencies installed.

1. Copy `fraudviser-backend/.env.example` to `fraudviser-backend/.env` and set `MONGODB_URL` to your MongoDB connection URI. The API uses the `fraudviser` database. Set `GEMINI_API_KEY` to enable AI reviews. Set `FRONTEND_ORIGIN` to the exact frontend origin(s), comma separated. For a cross-site frontend/API deployment, set `COOKIE_SAME_SITE=none` and use HTTPS.
2. Optional: create `fraudviser-frontend/.env` with `VITE_API_URL=http://localhost:3000/api` if the API uses a different address. The default is shown.
3. Start MongoDB.
4. In `fraudviser-backend`, run `npm start`.
5. For a repeatable classroom example, in a second backend terminal run `npm run seed:demo`. It upserts an explicitly labelled demo dataset and can safely be run again. It never creates assessment history or runs on server startup.
6. In `fraudviser-frontend`, run `npm run dev` and open the local URL Vite prints.

The public landing page is `/`. Users create buyer or seller accounts at `/register`, sign in at `/login`, and enter the protected workspace at `/app`. History and individual assessment routes require a valid session. Passwords are salted and hashed with Node's scrypt; session tokens are random, stored only as hashes in MongoDB, and sent to the browser in HttpOnly cookies. Sessions expire after seven days. Login and registration attempts are rate limited in MongoDB. Set production `FRONTEND_ORIGIN` explicitly and serve both sites over HTTPS.

## Market data and import

No marketplace API credentials or documented Nigerian marketplace provider were present in the inspected project. The application does not scrape marketplaces and does not claim to have live prices. Demo records are labelled `demo`, carry the source text “illustrative only, not observed listings,” and have no invented observation dates; user supplied records are labelled `imported`. The API has an explicit refresh response stating that no live provider is configured. The integration point is the normalized `PriceRecord` model and backend market-data route.

The backend import endpoint accepts a JSON array (or `{ "records": [...] }`) with `productName`, `category`, `condition`, and `price`, plus optional `brand`, `model`, `storage`, `source`, `observedAt`, `location`, and `referenceId`. Conditions include `new`, `used`, `refurbished`, `open_box`, `near_expiry`, and `service`; prices are positive NGN amounts. Product categories and kinds are not restricted to electronics. Import only records you are permitted to use. The server normalizes identity, validates rows, upserts by source and reference ID, and labels the records `imported`. This write endpoint is disabled unless `MARKET_IMPORT_TOKEN` is configured and supplied in the `x-market-import-token` header; keep that token on trusted server-side jobs only.

## Analysis method

Comparable observations match normalized category, brand, model, and storage and the exact condition for the primary comparison. The report also groups same-product records across conditions into low, median, and high price ranges. The reference is the median of valid positive prices; even-sized samples use the mean of the two middle prices. The price deviation is `((listing price - reference price) / reference price) × 100`. Fewer than five matches are explicitly low confidence, and no matches produce no market estimate. Historical records using the former condition-specific identity remain available to this grouped view.

Risk rules are in `fraudviser-backend/services/analysis.js`. They consider unusually low or high prices, small comparison samples, incomplete product or seller details, marketplace context, pressure or payment language, and description/condition conflicts. Missing details are shown as unknowns rather than proof of fraud. The initial weights are heuristic and not empirically calibrated; every assessment returns explanations, evidence coverage, and missing information.

Before payment, users are advised to inspect the item, verify specifications and proof of ownership independently, and avoid unprotected deposits. Missing seller data means unknown, not proven fraudulent.

## API

- `POST /api/auth/register` — create an account and start a session.
- `POST /api/auth/login` — sign in.
- `GET /api/auth/me` — current session user.
- `POST /api/auth/logout` — revoke the current session.
- `GET /api/health` — service health for operators.
- `POST /api/analysis` — validate listing, compare exact-match observations, assess risk, and save the assessment.
- `GET /api/analysis?limit=20` — newest assessment history.
- `GET /api/analysis/:id` — individual saved assessment.
- `GET /api/market-prices` — stored market records and source types.
- `POST /api/market-prices/import` — validate and upsert permitted observations.
- `POST /api/market-prices/refresh` — explicit unavailable-provider response until an external source is configured.

All analysis, history, and market read routes require authentication. Each saved assessment includes its owner and history queries are scoped to that user; looking up another user's assessment returns 404. Public registration is rate limited. Configure allowed origins, secure cookies, HTTPS, MongoDB backups, and monitoring before public launch. The AI review is optional and its output is advice, not verified marketplace information.

## Checks

From `fraudviser-frontend`: `npm run build` and `npm run lint`.
From `fraudviser-backend`: `npm test`.

Backend unit checks use deterministic test fixtures and do not represent market observations. MongoDB persistence and history retrieval should be demonstrated with MongoDB running and a valid local `.env` configuration.

## Defense screenshot workflow

1. Start MongoDB, backend and frontend as above; run `npm run seed:demo` once.
2. Capture the workspace with recent assessments visible.
3. Select **Analyse a listing** and enter `Apple iPhone 13`, category `Smartphones`, brand `Apple`, model `iPhone 13`, storage `128GB`, condition `Used`, and an asking price such as `350000`. Optionally enter a seller and marketplace.
4. Submit to capture the saved comparison chart, reference range, deviation, risk score, factors and recommended checks. The sample is explicitly demo data.
5. Open **History** to capture persistence/retrieval, then open that assessment again.
6. For an insufficient-data screenshot, analyse a distinct model/storage combination that has no matching observations; the result states that no estimate is available.

Screenshots come from the running app; none are generated or represented as real marketplace listings.
