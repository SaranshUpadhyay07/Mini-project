# Copilot coding instructions (my-react-app)

## Repo shape (3 services)
- `client/`: React 19 + Vite + Tailwind UI (runs on `http://localhost:5173`).
- `api/`: Express (ESM) + Mongoose + Firebase Admin + Mappls proxy APIs (runs on `http://localhost:5000`).
- `Agent/`: FastAPI “AI agent” service for chat + itinerary planning (runs on `http://localhost:8000`).

## Local dev commands (run per folder)
- Frontend: `cd client` → `npm install` → `npm run dev`
- API: `cd api` → `npm install` → `npm run dev` (CORS allows `http://localhost:5173` in `api/index.js`).
- Agent: `cd Agent` → `pip install -r requirements.txt` → `python app.py` (or `uvicorn app:app --reload --port 8000`).
- There is no top-level app runner; the repo is multi-service (don’t assume `npm start` from the repo root).

## Auth + data flow (client ↔ api)
- Client uses Firebase Auth via `client/src/config/firebase.js` and exposes helpers in `client/src/context/AuthContext.jsx`.
- After signup / Google sign-in, client fetches a Firebase ID token and POSTs to `POST /api/auth/sync` on the API.
- Protected API routes use `Authorization: Bearer <firebase_id_token>` and are guarded by `authenticateUser` in `api/middlewares/auth.middleware.js`.
- `authenticateUser` verifies the token with Firebase Admin and attaches `req.user` (Mongo user) + `req.firebaseUser` (decoded token).
- Client-to-API base URL is currently hardcoded as `http://localhost:5000` (see `client/src/context/AuthContext.jsx`).

## MongoDB + env var gotchas
- API Mongo connection reads `process.env.MONGO_URI` in `api/config/db.config.js` (note: setup doc mentions `MONGODB_URI`, but code uses `MONGO_URI`).
- Mappls server-side requests use `process.env.MAPPLS_API_KEY` in `api/controllers/places.controller.js`.
- Vite env vars must be prefixed with `VITE_` (see Mappls guide in `client/MAPPLS-INTEGRATION-GUIDE.md`).
- Firebase Admin tries to load a service-account JSON from `api/config/pilgrim-itinerary-odisha-firebase-adminsdk-fbsvc-c490868502.json` and logs a warning if missing.

## Mappls integration (client + api)
- Client map UX is in `client/src/pages/MapPage.jsx`; it dynamically injects Mappls SDK + plugins and uses `import.meta.env.VITE_MAPPLS_API_KEY`.
- API also exposes Mappls-backed endpoints under `GET /api/places/*` (see `api/routes/places.routes.js`).

## Agent service (FastAPI) conventions
- Entrypoint: `Agent/app.py` registers `routes/planner_routes.py` and `routes/chat_routes.py`.
- Endpoints:
  - `POST /chat` expects `{ "user_id": string, "chat_id": string, "message": string }` and returns `{ "result": string }`.
  - `POST /planner` expects the same request shape and returns an itinerary JSON object; send `message: "RESET"` to clear state.
- State is in-memory per `(user_id, chat_id)` via `Agent/store/itinerary_store.py` (no DB persistence).
- Agent secrets come from `Agent/.env`: `Gemini_api_key` (google-genai) and `Groq_api_key` (edit extraction in `agents/editor_agent.py`).
- The current UI page `client/src/pages/Iternary.jsx` calls `http://localhost:8000/chat`; if you touch this flow, align request/response shape with `Agent/routes/chat_routes.py`.

## Project-specific patterns to follow
- API uses a `routes/*.routes.js` → `controllers/*.controller.js` split; handlers return JSON with `success`/`message` on most routes.
- Keep ESM style (`import ... from`, `export default`) in `api/` and `client/`.
- Frontend routing uses `ProtectedRoute` in `client/src/App.jsx` (blocks `/map` and `/profile` when `currentUser` is missing).
