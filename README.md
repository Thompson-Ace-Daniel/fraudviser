# Fraudviser

Fraudviser is a Nigerian-focused online listing comparison and observable risk assessment MVP. It combines a strict comparable-price lookup with an explainable rule-based risk summary. The score is decision support, not a calibrated probability or a verdict about a seller.

## Project layout

- `fraudviser-frontend`: React 19, Vite, React Router, Tailwind CSS 4 and Lucide icons.
- `fraudviser-backend`: Express 5 API and Mongoose models/services.
- MongoDB stores market price observations and assessment history.

## Requirements and setup

Use Node.js 20+ and a reachable MongoDB server. Each app already has its dependencies installed.

1. Copy `fraudviser-backend/.env.example` to `fraudviser-backend/.env` and set `MONGODB_URL` to your MongoDB connection URI. The API uses the `fraudviser` database. Optionally set `PORT` (default `3000`) and comma-separated `FRONTEND_ORIGIN` (default CORS allows local development origins).
2. Optional: create `fraudviser-frontend/.env` with `VITE_BACKEND_BASE_URL=http://localhost:3000/api` if the API uses a different address. The default is shown.
3. Start MongoDB.
4. In `fraudviser-backend`, run `npm start`.
5. For a repeatable classroom example, in a second backend terminal run `npm run seed:demo`. It upserts an explicitly labelled demo dataset and can safely be run again. It never creates assessment history or runs on server startup.
6. In `fraudviser-frontend`, run `npm run dev` and open the local URL Vite prints.

The API health endpoint is `GET http://localhost:3000/api/health`. It reports API status and database status separately; a disconnected database returns HTTP 503. Core analysis/history endpoints also return a clear 503 until MongoDB connects.

## Market data and import

No marketplace API credentials or documented Nigerian marketplace provider were present in the inspected project. The application does not scrape marketplaces and does not claim to have live prices. Demo records are labelled `demo`, carry the source text “illustrative only, not observed listings,” and have no invented observation dates; user supplied records are labelled `imported`. The API has an explicit refresh response stating that no live provider is configured. The integration point is the normalized `PriceRecord` model and backend market-data route.

The dashboard's **Import JSON** action accepts a JSON array (or `{ "records": [...] }`) with `productName`, `category`, `brand`, `model`, `storage`, `condition`, `price`, and optional `source`, `observedAt`, `location`, `referenceId`. Conditions are `new`, `used`, or `refurbished`; prices are positive NGN amounts. Import only records you are permitted to use. The server normalizes identity, validates rows, upserts by source and reference ID, and labels the records `imported`.

## Analysis method

Comparable observations match the normalized category, brand, model, and storage key and the exact condition. The reference is the median of valid positive prices; even-sized samples use the mean of the two middle prices. The price deviation is `((listing price - reference price) / reference price) × 100`. Less than five matches are explicitly low confidence, and no matches produce no market estimate.

Risk rules are in `fraudviser-backend/services/analysis.js`. A price at least 35% below median adds 30 points; 20–34.9% below adds 15; fewer than three matches adds 10; incomplete brand/model/storage adds 10; missing seller adds 10; missing marketplace adds 5; specified pressure/deposit/no-inspection phrases add 15. Classifications are Low (0–24 with market data), Moderate (25–49), Elevated (50–100), or Insufficient information when no price reference exists below those thresholds. These initial heuristic weights are not empirically calibrated; explanations and missing information are returned with every assessment.

Before payment, users are advised to inspect the item, verify specifications and proof of ownership independently, and avoid unprotected deposits. Missing seller data means unknown, not proven fraudulent.

## API

- `GET /api/health` — API and MongoDB state.
- `POST /api/analysis` — validate listing, compare exact-match observations, assess risk, and save the assessment.
- `GET /api/analysis?limit=20` — newest assessment history.
- `GET /api/analysis/:id` — individual saved assessment.
- `GET /api/market-prices` — stored market records and source types.
- `POST /api/market-prices/import` — validate and upsert permitted observations.
- `POST /api/market-prices/refresh` — explicit unavailable-provider response until an external source is configured.

There is no authentication in this local academic MVP. Do not expose it publicly without adding access controls and abuse protection.

## Checks

From `fraudviser-frontend`: `npm run build` and `npm run lint`.
From `fraudviser-backend`: `npm test`.

Backend unit checks use deterministic test fixtures and do not represent market observations. MongoDB persistence and history retrieval should be demonstrated with MongoDB running and a valid local `.env` configuration.

## Defense screenshot workflow

1. Start MongoDB, backend and frontend as above; run `npm run seed:demo` once.
2. Capture the dashboard with the data status and recent assessments area visible.
3. Select **Analyse a listing** and enter `Apple iPhone 13`, category `Smartphones`, brand `Apple`, model `iPhone 13`, storage `128GB`, condition `Used`, and an asking price such as `350000`. Optionally enter a seller and marketplace.
4. Submit to capture the saved comparison chart, reference range, deviation, risk score, factors and recommended checks. The sample is explicitly demo data.
5. Open **History** to capture persistence/retrieval, then open that assessment again.
6. For an insufficient-data screenshot, analyse a distinct model/storage combination that has no matching observations; the result states that no estimate is available.

Screenshots come from the running app; none are generated or represented as real marketplace listings.
