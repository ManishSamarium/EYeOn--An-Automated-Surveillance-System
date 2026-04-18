# EYeOn — Smart Family Surveillance

A three-service stack for real-time face-recognition surveillance using your webcam.

## Services

| Service        | Tech                       | Port | Purpose                                           |
| -------------- | -------------------------- | ---- | ------------------------------------------------- |
| `frontend/`    | React + Vite + Tailwind    | 5173 | Dashboard UI, live camera preview, notifications. |
| `backend/`     | Node + Express + Socket.io | 5001 | REST API, auth, MongoDB, image storage, sockets.  |
| `surveillance/`| Python + FastAPI + OpenCV  | 8000 | Webcam loop, face recognition, Telegram alerts.   |

## Data Flow

```
Browser (React)
   │  REST /api/*               WebSocket (socket.io)
   ▼                                         ▲
Node backend (port 5001) ──────────────────┐ │
   │  /api/internal/*   /api/fastapi/event │ │
   ▼                                       │ │
Python FastAPI (port 8000)                 │ │
   │  webcam → face_recognition            │ │
   └── POSTs unknown events ───────────────┘ │
                                             │
                Telegram bot ◄───────────────┘
```

- Images for family members, categories and unknown detections are stored on
  the Node backend filesystem (`backend/data/...`) and exposed at
  `http://localhost:5001/data/...`.
- The Python service fetches family/category image URLs from the Node backend
  via `/api/internal/*` using a shared `SYSTEM_TOKEN` header, encodes them with
  `face_recognition`, then runs an OpenCV capture loop.
- When an unknown face is seen, Python POSTs the frame to
  `/api/fastapi/event`, which persists the image, creates a `Notification`
  and emits a `notify:<userId>` socket event that the browser listens for.

## Installation

### Prerequisites
- Node.js 18+
- Python 3.10+
- MongoDB connection (Atlas or local)
- Webcam
- Optional: Telegram bot token + chat id

### Backend (Node)
```bash
cd backend
npm install
cp .env .env.local   # adjust values as needed
npm run dev
```

### Python surveillance service
```bash
cd surveillance
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python main.py                   # runs uvicorn on :8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev                      # http://localhost:5173
```

## Environment Variables

### `backend/.env`
```
MONGODB_URI=mongodb+srv://.../EYeOn
JWT_SECRET=<random 64 bytes>
PORT=5001
FASTAPI_URL=http://127.0.0.1:8000
SYSTEM_TOKEN=<shared secret>
PUBLIC_BASE_URL=http://localhost:5001
TELEGRAM_BOT_TOKEN=<optional>
TELEGRAM_CHAT_ID=<optional>
```

### `surveillance/.env`
```
NODE_BACKEND_URL=http://127.0.0.1:5001
SYSTEM_TOKEN=<must match backend SYSTEM_TOKEN>
TELEGRAM_BOT_TOKEN=<optional>
TELEGRAM_CHAT_ID=<optional>
FAMILY_TOLERANCE=0.55
CATEGORY_TOLERANCE=0.6
UNKNOWN_COOLDOWN_SECONDS=30
FRAME_SKIP=2
CAMERA_INDEX=0
```

## API Endpoints

### Public (browser)
| Method | Path                         | Auth    | Description                       |
| ------ | ---------------------------- | ------- | --------------------------------- |
| POST   | `/api/auth/signup`           | —       | Create account                    |
| POST   | `/api/auth/login`            | —       | Login, returns JWT                |
| GET    | `/api/auth/me`               | user    | Current user                      |
| POST   | `/api/family/add`            | user    | Upload family member photo        |
| GET    | `/api/family/list`           | user    | List family members               |
| DELETE | `/api/family/:id`            | user    | Delete a family member            |
| POST   | `/api/category/add`          | user    | Create a category                 |
| GET    | `/api/category/list`         | user    | List categories                   |
| DELETE | `/api/category/:id`          | user    | Delete a category                 |
| GET    | `/api/unknown/list`          | user    | List detected unknowns            |
| POST   | `/api/unknown/assign`        | user    | Assign unknown → family/category  |
| DELETE | `/api/unknown/:id`           | user    | Delete unknown detection          |
| POST   | `/api/surveillance/start`    | user    | Start FastAPI camera loop         |
| POST   | `/api/surveillance/stop`     | user    | Stop camera loop                  |
| GET    | `/api/surveillance/status`   | user    | Query camera status               |
| GET    | `/api/notification/list`     | user    | List notifications                |
| POST   | `/api/notification/mark-all-read` | user | Mark all notifications read  |
| GET    | `/api/health`                | —       | Health probe                      |

### Internal (python ↔ node)
| Method | Path                                | Auth          | Description              |
| ------ | ----------------------------------- | ------------- | ------------------------ |
| GET    | `/api/internal/family/:userId`      | system token  | Family list for Python   |
| GET    | `/api/internal/categories/:userId`  | system token  | Categories for Python    |
| POST   | `/api/fastapi/event`                | system token  | Unknown-face event       |
| POST   | `/api/fastapi/category-event`       | system token  | Category match event     |

### Python (fastapi)
| Method | Path                    | Description                    |
| ------ | ----------------------- | ------------------------------ |
| POST   | `/start/{user_id}`      | Start camera thread            |
| POST   | `/stop/{user_id}`       | Stop camera thread             |
| GET    | `/status/{user_id}`     | Running / encoding counts      |
| POST   | `/reload/{user_id}`     | Refresh encodings from backend |
| GET    | `/health`               | Service health                 |

## WebSocket Events

- `family:updated`, `category:updated` — collection changed
- `unknown:detected` — a new unknown was stored
- `notify:<userId>` — user-scoped notification payload
- `surveillance:started`, `surveillance:stopped` — FastAPI lifecycle

## Troubleshooting

- **Camera not accessible**: confirm `CAMERA_INDEX` and that no other app is
  using the webcam. On Linux, install `v4l-utils` and run `v4l2-ctl --list-devices`.
- **`face_recognition` install on Windows**: see `backend/README.md` for
  Conda / prebuilt-wheel instructions.
- **No unknown alerts arriving**: check that `SYSTEM_TOKEN` matches in
  `backend/.env` and `surveillance/.env`, and that the backend logs show a
  `POST /api/fastapi/event 200` line.

## Security Notes

- Change `JWT_SECRET` and `SYSTEM_TOKEN` before deploying.
- `backend/data/*` is served publicly — do not put anything sensitive there
  that you do not intend to be accessible via the backend URL.
- Set `PUBLIC_BASE_URL` so generated image URLs work behind a reverse proxy.

## License
MIT
