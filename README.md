# EYeOn - AI-Powered Home Security SaaS

**Turn Any Camera Into An Intelligent Watchman**

EYeOn is a cloud-based AI security platform that recognizes family members, categorizes regular visitors, and immediately alerts you when unknown faces appear. No vendor lock-in, no complicated setups—just pure AI-powered protection.

## 🎯 Core Vision

Every family should have:
- ✅ **Face Recognition** - Knows who belongs
- ✅ **Visitor Categories** - Recognizes regular visitors  
- ✅ **Instant Alerts** - Telegram notifications
- ✅ **Privacy** - No cloud vendor dependency
- ✅ **Intelligence** - Learns over time

## 🚀 Features

### ✨ Authentication & User Management
- Email/password signup & login
- JWT-based authentication
- Per-user isolated data
- Profile management

### 👨‍👩‍👧 Family Management
- Add family members with photos
- Automatic face recognition
- Silent (no alerts for family)
- Manage family database

### 📦 Visitor Categories
- Define visitor types (Milkman, Maid, Guard, Driver, etc.)
- Smart recognition of regular visitors
- Telegram alerts: "Milkman arrived"
- Category-based alerts

### 🎥 Real-time Surveillance
- Live camera monitoring
- Face detection & recognition
- Start/Stop controls
- Session management
- CPU-optimized frame processing

### ⚠️ Unknown Person Detection
- Automatic unknown face capture
- Image upload to Supabase
- Telegram photo alert
- One-click classification
- Assign to family or categories

### 📡 Real-time Notifications
- Socket.IO for instant updates
- User-scoped events (no cross-user leakage)
- Live detection feed
- Classification notifications

### 🔐 Security & Privacy
- User-isolated data
- Supabase encrypted storage
- No face data stored in DB (only URLs)
- Secure JWT tokens
- Environment-based credentials

## 💻 Tech Stack

### Frontend
- **React 18** + Vite
- **Tailwind CSS** - Styling
- **Socket.IO Client** - Real-time updates
- **Axios** - HTTP requests

### Backend  
- **Node.js + Express** - REST API
- **MongoDB Atlas** - NoSQL database
- **Socket.IO** - WebSocket server
- **JWT** - Authentication
- **Supabase** - Image storage
- **Multer** - File uploads

### AI Engine
- **FastAPI** - Python async framework
- **face_recognition** - Face encoding
- **OpenCV** - Image processing
- **NumPy** - Numerical operations

### Infrastructure
- **Supabase** - Cloud storage
- **MongoDB Atlas** - Cloud database
- **Telegram Bot API** - Notifications
- **Railway** - Backend hosting
- **Vercel** - Frontend hosting

## 📊 Architecture

```
┌─────────────────┐
│   React SPA     │ (Vercel)
└────────┬────────┘
         │
         │ REST API + WebSocket
         │
┌────────▼────────┐
│  Node.js Server │ (Railway)
├─────────────────┤
│ - Auth (JWT)    │
│ - API Routes    │
│ - Socket.IO     │
└────────┬────────┘
         │
    ┌────┴──────────┬──────────────┐
    │               │              │
    ▼               ▼              ▼
┌────────┐   ┌─────────────┐  ┌──────────┐
│MongoDB │   │  Supabase   │  │ FastAPI  │
│ Atlas  │   │  Storage    │  │  Engine  │
└────────┘   └─────────────┘  └────┬─────┘
                                    │
                                    ▼
                          ┌──────────────────┐
                          │  Telegram Alerts │
                          └──────────────────┘
```

## 🏃 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.8+
- MongoDB account (Atlas)
- Supabase account
- Telegram bot token

### Local Development

**1. Clone & Install**
```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install

# Surveillance Engine
cd surveillance
python -m venv venv
source venv/bin/activate  # Mac/Linux
# or: venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

**2. Configure Environment**
```bash
# Backend
cp backend/.env.example backend/.env
# Edit with MongoDB URI, Supabase keys, Telegram token

# Surveillance
cp surveillance/.env.example surveillance/.env
# Edit with Backend URL, Telegram token

# Frontend
cp frontend/.env.example frontend/.env.local
# Uses localhost by default
```

**3. Start Services**

Terminal 1 - Backend:
```bash
cd backend && npm run dev
# Runs on http://localhost:5001
```

Terminal 2 - FastAPI:
```bash
cd surveillance
source venv/bin/activate
uvicorn main:app --reload --port 8000
# Runs on http://localhost:8000
```

Terminal 3 - Frontend:
```bash
cd frontend && npm run dev
# Runs on http://localhost:5173
```

4. **Access**: Open http://localhost:5173

## 📚 Documentation

- [Setup Guide](./SETUP_GUIDE.md) - Detailed setup & deployment
- [API Documentation](./API_DOCUMENTATION.md) - Complete API reference
- [Architecture Guide](./ARCHITECTURE.md) - System design details

## 🔑 Key Improvements Made

### ✅ Data Layer
- [x] Fixed MongoDB schemas (added userId, removed unique constraints)
- [x] Consistent field naming (camelCase)
- [x] Proper indexing for queries

### ✅ Backend API
- [x] User-scoped endpoints (verifyToken middleware)
- [x] Proper error handling
- [x] Socket.IO authentication & room management
- [x] File upload handling
- [x] Supabase integration

### ✅ Real-time Communication
- [x] Socket.IO user isolation (rooms)
- [x] Per-user notification scoping
- [x] Event authentication
- [x] Error handling

### ✅ AI Engine
- [x] Per-user face caching
- [x] Category recognition with alerts
- [x] Duplicate prevention (cooldown)
- [x] Async operation support
- [x] Error recovery

### ✅ Security
- [x] JWT authentication
- [x] User isolation
- [x] Environment variables
- [x] Secure file handling
- [x] Rate limiting ready

### ✅ Deployment Ready
- [x] Environment-based config
- [x] Production/dev settings
- [x] Cloud URL support
- [x] Database connection pooling
- [x] Error logging

## 🚀 Deployment

### Backend (Railway)
```bash
git push heroku main
# Set environment variables in Railway dashboard
```

### Frontend (Vercel)
```bash
vercel deploy
# Set VITE_BACKEND_URL to production API
```

### FastAPI (Railway)
```bash
# Create separate Railway project
# Deploy with uvicorn
```

## 📋 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/family/add` | Add family member |
| GET | `/api/family/list` | List family |
| POST | `/api/category/add` | Add visitor category |
| GET | `/api/category/list` | List categories |
| POST | `/api/surveillance/start` | Start surveillance |
| POST | `/api/surveillance/stop` | Stop surveillance |
| GET | `/api/unknown/list` | List unknowns |
| POST | `/api/unknown/assign/:id` | Classify unknown |

Full documentation: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

## 🔧 Configuration

All configuration via environment variables:

**Backend** (.env):
```
PORT=5001
MONGODB_URI=mongodb+srv://...
SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
JWT_SECRET=your-secret
FASTAPI_URL=http://localhost:8000
```

**Surveillance** (.env):
```
BACKEND_URL=http://localhost:5001
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

**Frontend** (.env.local):
```
VITE_BACKEND_URL=http://localhost:5001
```

## 🎨 System Flow

### New User Onboarding
1. User signs up → JWT token created
2. User uploads family photos → Faces encoded
3. User defines visitor categories
4. System learns over time

### Runtime Detection
```
Camera Feed
    ↓
Face Detection
    ↓
Family Match? → Silent (continue)
    ↓
Category Match? → Send alert "Milkman arrived"
    ↓
Unknown? → Upload + Telegram alert
    ↓
User Classify → Learn (next detection similar = categorized)
```

## 🐛 Troubleshooting

### Camera not found
```bash
# Check camera access
python -c "import cv2; cap = cv2.VideoCapture(0); print(cap.isOpened())"
```

### Face not detected
- Ensure good lighting
- Face must be clearly visible
- Image should be >100x100 pixels

### MongoDB connection
- Check connection string in .env
- Verify IP whitelist in MongoDB Atlas
- Test connection: `mongo "mongodb+srv://..."`

### Telegram not working
- Verify bot token is correct
- Check chat ID matches your chat
- Bot must be started (send /start)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file.

## 🙋 Support

For issues, questions, or suggestions:
1. Check [SETUP_GUIDE.md](./SETUP_GUIDE.md)
2. Review [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
3. Open an issue on GitHub

## 🎯 Roadmap

- [ ] Mobile app (React Native)
- [ ] Multi-camera support
- [ ] Cloud-hosted FastAPI
- [ ] Advanced analytics
- [ ] Email notifications
- [ ] Custom alert schedules
- [ ] API for third-party integrations
- [ ] WhatsApp alerts
- [ ] Video recording
- [ ] Face anonymization options

---

**EYeOn** - Bringing AI-powered security to every home. 🔐

Made with ❤️ for family safety.
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Socket.io Client** - WebSocket client
- **TailwindCSS** - Styling

### Database
- **MongoDB** - NoSQL database for users, family members, categories, detections

## Project Structure

```
EYeOn/
├── backend/
│   ├── package.json
│   ├── server.js                    # Express server
│   ├── surveillance.py              # Python face recognition loop
│   ├── encode_face.py              # Face encoding helper
│   ├── move_unknown.py             # Move unknown image helper
│   ├── face_recognition_service.py # Flask face service
│   ├── .env                        # Environment variables
│   ├── models/
│   │   ├── User.js                # User schema
│   │   ├── FamilyMember.js        # Family member schema
│   │   ├── Category.js            # Category schema
│   │   └── UnknownDetection.js    # Unknown detection schema
│   ├── routes/
│   │   ├── auth.js                # Authentication routes
│   │   ├── family.js              # Family member routes
│   │   ├── categories.js          # Category routes
│   │   ├── surveillance.js        # Surveillance routes
│   │   └── unknown.js             # Unknown detection routes
│   └── data/
│       ├── family/                # Family member photos
│       ├── categories/            # Category photos
│       └── unknown/               # Unknown detections
│
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── App.jsx               # Main app
│       ├── main.jsx              # Entry point
│       ├── index.css
│       ├── pages/
│       │   ├── LoginPage.jsx
│       │   ├── SignupPage.jsx
│       │   ├── Dashboard.jsx
│       │   ├── AddFamilyPage.jsx
│       │   ├── FamilyPage.jsx
│       │   ├── CategoriesPage.jsx
│       │   ├── SurveillancePage.jsx
│       │   └── UnknownPage.jsx
│       └── services/
│           ├── api.js            # API client
│           └── websocket.js      # WebSocket client
│
└── main.py                        # Original base code
```

## Installation

### Prerequisites
- **Node.js** (v14+)
- **MongoDB** (running locally)
- **Python 3.8+**
- **Webcam** connected to your computer

### Backend Setup

1. **Install dependencies:**
```bash
cd backend
npm install
pip install -r requirements.txt
```

Wait, requirements.txt is in root. Let me create it.

2. **Create .env file:**
```bash
# backend/.env
MONGODB_URI=mongodb://localhost:27017/eyeon
JWT_SECRET=your-secret-key-change-in-production
PORT=5000
NODE_ENV=development
PYTHON_PATH=python
```

3. **Start MongoDB:**
```bash
# Windows (if using MongoDB locally)
mongod
```

4. **Start backend server:**
```bash
npm run dev
```

Server will run on `http://localhost:5000`

### Frontend Setup

1. **Install dependencies:**
```bash
cd frontend
npm install
```

2. **Start development server:**
```bash
npm run dev
```

App will run on `http://localhost:5173`

## Usage

### First Time Setup

1. **Create Account**
   - Go to http://localhost:5173/signup
   - Create a new admin account
   - Login with your credentials

2. **Add Family Members**
   - Go to Dashboard → Add Family Member
   - Upload a clear photo of each family member
   - The system will automatically encode their face

3. **Create Categories**
   - Go to Dashboard → Manage Categories
   - Add categories like "Milkman", "Maid", "Delivery"
   - Upload a reference photo for recognition

4. **Start Surveillance**
   - Go to Dashboard → Start Surveillance
   - Click "Start" button
   - System will monitor your webcam in real-time

5. **Handle Unknown People**
   - When an unknown person is detected, they're saved to /data/unknown/
   - Go to Dashboard → Unknown People
   - Review detected unknowns
   - Assign them to family members or categories

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Family Members
- `POST /api/family/add` - Add family member (multipart/form-data)
- `GET /api/family/list` - List all family members
- `DELETE /api/family/:id` - Delete family member

### Categories
- `POST /api/category/add` - Add category (multipart/form-data)
- `GET /api/category/list` - List all categories
- `DELETE /api/category/:id` - Delete category

### Surveillance
- `POST /api/surveillance/start` - Start surveillance
- `POST /api/surveillance/stop` - Stop surveillance
- `GET /api/surveillance/status` - Get surveillance status

### Unknown Detections
- `GET /api/unknown/list` - List unknown detections
- `POST /api/unknown/assign` - Assign unknown to known person
- `DELETE /api/unknown/:id` - Delete unknown detection

## WebSocket Events

### Client → Server
- `surveillance:start` - Client signals surveillance start
- `surveillance:stop` - Client signals surveillance stop

### Server → Client
- `surveillance:started` - Surveillance has started
- `surveillance:stopped` - Surveillance has stopped
- `unknown:detected` - Unknown person detected
- `face_detected` - Known person detected
- `family:updated` - Family members list updated
- `category:updated` - Categories list updated

## Important Notes

1. **Face Recognition Quality**
   - Use clear, well-lit photos for best results
   - Tolerance can be adjusted in code (default: 0.6)
   - HOG model is CPU-friendly, CNN is more accurate but slower

2. **Privacy**
   - All data stored locally
   - No cloud upload by default
   - Face encodings stored as binary in MongoDB

3. **Performance**
   - Processes every other frame for better performance
   - Adjust frame skipping based on your needs
   - Use webcam resolution 640x480 for optimal speed

4. **Troubleshooting**
   - Ensure MongoDB is running before starting backend
   - Check webcam permissions
   - Verify Python dependencies installed
   - Check .env file for correct paths

## Core Face Recognition Logic (from main.py)

The application uses the original main.py logic:

```python
# Face encoding from folders
def encode_faces_from_folder(folder_path):
    """Encode all faces in folder structure"""
    # Walks through family/category subfolders
    # Encodes first valid face found in each folder
    # Returns dictionary: {name: encoding}

# Face recognition
def recognize_face(face_encoding):
    """Recognize face against known encodings"""
    # Compares against family faces first
    # Then against category faces
    # Returns (name, type, confidence)
```

## Database Schemas

### User
```javascript
{
  email: String (unique),
  password: String (hashed),
  full_name: String,
  is_admin: Boolean,
  created_at: Date
}
```

### FamilyMember
```javascript
{
  name: String (unique),
  image_path: String,
  encoding: Buffer,
  created_at: Date
}
```

### Category
```javascript
{
  name: String (unique),
  description: String,
  image_path: String,
  created_at: Date
}
```

### UnknownDetection
```javascript
{
  image_path: String,
  detected_at: Date,
  assigned_to: String (null initially),
  is_processed: Boolean,
  created_at: Date
}
```

## Building for Production

### Backend
```bash
cd backend
npm install --production
NODE_ENV=production npm start
```

### Frontend
```bash
cd frontend
npm run build
# Serve dist/ folder with any static server
```

## Security Considerations

1. **Change JWT_SECRET** in production
2. **Use HTTPS** in production
3. **MongoDB Authentication** - Set username/password
4. **Rate Limiting** - Add on API endpoints
5. **Input Validation** - Already implemented with Pydantic
6. **CORS** - Configured for localhost:5173

## Troubleshooting

### Webcam not working
- Check if other apps are using the webcam
- Ensure camera permissions granted to browser
- Try restarting browser and backend

### MongoDB connection error
- Verify MongoDB is running: `mongod`
- Check MONGODB_URI in .env
- Ensure port 27017 is available

### Face encoding errors
- Ensure image has clear face
- Try different angle or lighting
- Check image format (JPG/PNG)

### Socket.io connection failed
- Verify backend server is running on port 5000
- Check CORS settings in server.js
- Clear browser cache and reconnect

## Future Enhancements

- [ ] Cloud storage for unknown detections
- [ ] Email notifications on unknown detection
- [ ] Telegram integration (optional)
- [ ] Advanced analytics dashboard
- [ ] Mobile app support
- [ ] Multi-camera support
- [ ] Deep learning model improvements
- [ ] Face blur for privacy
- [ ] Activity logs and history

## License

MIT

## Support

For issues or questions, check the documentation above or review the code comments.
