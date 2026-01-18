# Firebase + MongoDB Integration Setup

## 📍 Where Each File Goes

### **Frontend (Client) - React App**
- **`client/src/config/firebase.js`** - Firebase authentication configuration

### **Backend (API) - Express Server**
- **`api/config/firebase.config.js`** - Firebase Admin SDK setup
- **`api/config/db.config.js`** - MongoDB connection
- **`api/middlewares/auth.middleware.js`** - Token verification middleware
- **`api/controllers/auth.controller.js`** - Authentication logic
- **`api/routes/auth.routes.js`** - Authentication routes
- **`api/models/user.model.js`** - User database schema

---

## 🚀 Setup Instructions

### Step 1: Firebase Admin SDK Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `pilgrim-itinerary-odisha`
3. Go to **Project Settings** > **Service Accounts**
4. Click **Generate New Private Key**
5. Save the downloaded JSON file as `firebase-service-account.json`
6. Place it in `api/config/firebase-service-account.json`
7. Add to `.gitignore`: `config/firebase-service-account.json`

### Step 2: MongoDB Setup

**Option A: Local MongoDB**
```bash
# Make sure MongoDB is running locally
# Update .env with: MONGODB_URI=mongodb://localhost:27017/patha-gamini
```

**Option B: MongoDB Atlas (Cloud)**
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get your connection string
4. Update `.env` with your connection string

### Step 3: Environment Variables

Update `api/.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_connection_string
```

---

## 🔄 How It Works

### **Authentication Flow:**

1. **User signs up/logs in** → Firebase handles authentication (Frontend)
2. **Firebase returns token** → Store in localStorage/state
3. **Send token to backend** → Include in Authorization header
4. **Backend verifies token** → Firebase Admin verifies token validity
5. **Create/Update user in MongoDB** → Store user data
6. **Return user data** → Send back to frontend

### **Frontend Example (React):**

```javascript
import { auth } from './config/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

// Sign up
const signUp = async (email, password, name) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const token = await userCredential.user.getIdToken();
  
  // Sync with MongoDB
  await fetch('http://localhost:5000/api/auth/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      firebaseUid: userCredential.user.uid,
      email: userCredential.user.email,
      name: name
    })
  });
  
  return token;
};

// Login
const login = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const token = await userCredential.user.getIdToken();
  return token;
};

// Make authenticated requests
const getProfile = async (token) => {
  const response = await fetch('http://localhost:5000/api/auth/profile', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
};
```

---

## 📡 API Endpoints

### Public Routes:
- **POST** `/api/auth/sync` - Sync Firebase user to MongoDB
  ```json
  {
    "firebaseUid": "firebase_user_id",
    "email": "user@example.com",
    "name": "User Name",
    "phone": "1234567890"
  }
  ```

### Protected Routes (Require Token):
- **GET** `/api/auth/profile` - Get current user profile
  - Headers: `Authorization: Bearer <firebase_token>`

- **PUT** `/api/auth/profile` - Update user profile
  - Headers: `Authorization: Bearer <firebase_token>`
  ```json
  {
    "name": "Updated Name",
    "phone": "9876543210"
  }
  ```

---

## 🔒 Security Notes

1. **Never commit** `firebase-service-account.json` to GitHub
2. **Always verify tokens** on the backend using Firebase Admin
3. **Store sensitive data** in `.env` file
4. **Use HTTPS** in production
5. **Implement rate limiting** for API endpoints

---

## 🧪 Testing

1. Start MongoDB (if local)
2. Start backend: `cd api && npm run dev`
3. Start frontend: `cd client && npm run dev`
4. Test authentication flow in your React app

---

## 📝 Next Steps

1. Create login/signup components in React
2. Implement protected routes in frontend
3. Add more user-related endpoints
4. Set up family tracking features
5. Implement trip management
