# EYeOn — Smart Family Surveillance

Real-time family surveillance where **face recognition runs entirely in the
visitor's browser** via `@vladmandic/face-api` (TensorFlow.js). No Python
service, no server-side camera, no OS dependencies — open the URL, grant
webcam permission, click Start.

## Architecture

```
┌──────────────────────── Browser (visitor's machine) ────────────────────────┐
│  • getUserMedia → webcam video                                              │
│  • face-api.js loads models from CDN (~5 MB, cached)                        │
│  • Fetches family/category photos from backend → computes descriptors       │
│  • Every 1.5s: detects faces in video, matches against known descriptors    │
│  • Family/category match → logs locally (no network call)                   │
│  • Unknown match → uploads frame to backend + shows overlay                 │
└───────────────────────────────────────────┬─────────────────────────────────┘
                                            │ HTTPS
                                            ▼
┌──────────────────────────── Node backend (Render) ──────────────────────────┐
│  • Auth (JWT), Mongo models, socket.io                                      │
│  • Stores family/category/unknown photos under /data/                       │
│  • Serves static images with permissive CORS so face-api can canvas them    │
│  • POST /api/unknown/capture persists unknown frames + emits notifications  │
└──────────────────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼
                                ┌──────── MongoDB Atlas ─────────┐
                                └────────────────────────────────┘
```

## Services

| Service     | Tech                    | Port | Purpose                                    |
| ----------- | ----------------------- | ---- | ------------------------------------------ |
| `frontend/` | React + Vite + face-api | 5173 | UI + browser-side face recognition         |
| `backend/`  | Node + Express          | 5001 | Auth, storage, notifications, sockets      |
| `surveillance/` *(optional)* | Python + FastAPI | 8000 | Legacy server-side pipeline if you prefer |

The Python service is **optional** — keep it if you want to run recognition
on a server with its own webcam (e.g. a Raspberry Pi). For web deployments
like Render, you don't need it.

## Deploying to Render (college-project friendly)

1. Push this repo to GitHub.
2. On Render: **New → Blueprint** → point at the repo. It picks up
   `render.yaml` and creates two services:
   - `eyeon-backend` (Node web service)
   - `eyeon-frontend` (static site)
3. After creation, set these env vars:
   - **eyeon-backend**
     - `MONGODB_URI` — your Mongo Atlas SRV string
     - `PUBLIC_BASE_URL` — `https://<backend-name>.onrender.com` (so image
       URLs stored in DB resolve from anywhere)
     - `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` *(optional — unused in
       browser-only mode, kept for parity)*
   - **eyeon-frontend**
     - `VITE_API_BASE_URL` — `https://<backend-name>.onrender.com/api`
     - `VITE_SOCKET_URL` — `https://<backend-name>.onrender.com`
4. Trigger the deploy. Open the frontend URL, sign up, add family photos,
   click Surveillance → Start, allow the camera permission. Done.

> Render's free plan has an ephemeral filesystem. Uploaded photos under
> `backend/data/` survive until the service restarts, which on free plan
> happens on redeploy and after ~15 min of inactivity. Fine for a college
> demo. For persistence, add a Render disk or swap to S3-compatible storage.

## Local development

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env       # fill in MONGODB_URI etc
npm run dev                # http://localhost:5001

# 2. Frontend
cd frontend
npm install
npm run dev                # http://localhost:5173
```

Open `http://localhost:5173`, sign up, and you're good.

## Environment Variables

### `backend/.env`
```
MONGODB_URI=mongodb+srv://.../EYeOn
JWT_SECRET=<random 64 bytes>
PORT=5001
PUBLIC_BASE_URL=http://localhost:5001
TELEGRAM_BOT_TOKEN=<optional>
TELEGRAM_CHAT_ID=<optional>
SYSTEM_TOKEN=<optional; only used by legacy Python service>
```

### `frontend/.env`
```
VITE_API_BASE_URL=http://localhost:5001/api
VITE_SOCKET_URL=http://localhost:5001
VITE_FACE_API_MODEL_URL=https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model
```

## Browser-side recognition details

- Uses `tiny_face_detector` (fast), `face_landmark_68_net` (alignment), and
  `face_recognition_net` (128-d descriptor) — same descriptor topology as
  dlib/FaceNet, so distance thresholds translate cleanly.
- Default match distance: **0.5** (tighter than dlib's 0.6 because
  TF.js-based descriptors cluster slightly differently).
- Unknown-detection cooldown: **20 s** (so you don't spam Mongo when
  someone lingers in frame).
- Known-detection cooldown per identity: **60 s**.
- Models load once per browser session and are cached by the CDN.

## API Endpoints

### Public (browser, JWT)
| Method | Path                          | Description                           |
| ------ | ----------------------------- | ------------------------------------- |
| POST   | `/api/auth/signup`            | Create account                        |
| POST   | `/api/auth/login`             | Login                                 |
| GET    | `/api/auth/me`                | Current user                          |
| POST   | `/api/family/add`             | Upload family photo                   |
| GET    | `/api/family/list`            | List                                  |
| DELETE | `/api/family/:id`             | Delete                                |
| POST   | `/api/category/add`           | Upload category photo                 |
| GET    | `/api/category/list`          | List                                  |
| DELETE | `/api/category/:id`           | Delete                                |
| GET    | `/api/unknown/list`           | Detected unknowns                     |
| POST   | `/api/unknown/capture`        | **New**: browser uploads a frame      |
| POST   | `/api/unknown/assign`         | Assign unknown → family or category   |
| DELETE | `/api/unknown/:id`            | Delete detection                      |
| POST   | `/api/surveillance/start`     | Toggle server-side "running" flag     |
| POST   | `/api/surveillance/stop`      | Toggle off                            |
| GET    | `/api/surveillance/status`    | Running flag                          |
| GET    | `/api/notification/list`      | Notifications                         |
| GET    | `/api/health`                 | Health probe                          |

### Internal *(legacy, used only if you run the Python service)*
- `GET /api/internal/family/:userId` — system-token guarded
- `GET /api/internal/categories/:userId` — system-token guarded
- `POST /api/fastapi/event` — unknown-face event from Python
- `POST /api/fastapi/category-event` — category match event from Python

## WebSocket events
- `unknown:detected` — a new unknown was stored
- `notify:<userId>` — user-scoped notification payload
- `family:updated`, `category:updated` — collection changed
- `surveillance:started`, `surveillance:stopped` — per-user state changes

## Troubleshooting

- **"Models still loading" forever**: CDN blocked by network / ad-blocker.
  Set `VITE_FACE_API_MODEL_URL` to a different mirror, or self-host the
  models under `frontend/public/models/` and point the var at `/models`.
- **Webcam preview black**: browser requires HTTPS for `getUserMedia` on
  non-localhost origins. Render serves HTTPS by default — fine.
- **Images don't load in the detector**: the backend must send CORS
  headers on `/data/*`. The bundled `server.js` already does this.
- **Family photos uploaded without a visible face** won't be indexed —
  face-api will log a warning and skip them.

## License
MIT
