# Fraudviser Frontend

React 19 + Vite + React Router + Tailwind CSS 4 workspace for Fraudviser.

See the root [README](../README.md) for full product setup, API, and deployment notes.

## Local development

1. Copy `.env.example` to `.env` (defaults to `http://localhost:3000/api`).
2. From this folder: `npm run dev`, then open the URL Vite prints.
3. The backend must be running (see `fraudviser-backend`) with `FRONTEND_ORIGIN` set to the Vite origin.

## Checks

- `npm run lint`
- `npm run build`

## Routes

- `/` public landing page
- `/login`, `/register` auth
- `/app`, `/analyze`, `/history`, `/analysis/:assessmentId` protected workspace (requires session cookie from the API)
