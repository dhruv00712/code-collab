#  CodeShip - Real-Time Code Collaboration Platform

**CodeShip** is a full-stack collaborative code editor that allows multiple users to write, run, and chat about code in real-time. It's like Google Docs but for programmers — with support for multiple languages, real-time sync using WebSockets, and Google authentication.

## Features

- 🔐 Google Login via NextAuth
- ⚡ Real-time code collaboration using Socket.IO
- 💬 Live chat for each room
- 🧠 Language selection and code execution
- 📜 View room history per user
- 🖥️ Monaco Editor for rich code editing experience
- 🌐 Fully responsive and dark-themed UI (TailwindCSS)
- 💾 MongoDB for persistent room and chat data

---

## 🏗️ Tech Stack

### 🔧 Frontend
- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [NextAuth.js](https://next-auth.js.org/) (Google Auth)
- [Socket.IO-client](https://socket.io/)

### 🔧 Backend
- [Node.js](https://nodejs.org/)
- [Express.js](https://expressjs.com/)
- [Socket.IO](https://socket.io/)
- [MongoDB + Mongoose](https://mongoosejs.com/)
- [JWT](https://jwt.io/) (for session handling)
- [bcrypt](https://www.npmjs.com/package/bcrypt)
- [CORS](https://expressjs.com/en/resources/middleware/cors.html)
- [Judge0 API](https://judge0.com/) for code execution

---

## 📁 Folder Structure
code-collab/
├── frontend/ # Next.js 14 frontend (App Router)
└── backend/ # Express.js + Socket.IO backend server



### 1. Clone the repository
```bash
git clone https://github.com/dhruv00712/code-collab.git
cd code-collab
```
 2. Backend Setup -
    cd backend
    npm install


Create a .env file:
PORT=8000
MONGO_URI=your_mongo_uri
JWT_SECRET=your_jwt_secret


Run the backend:
npm run dev


3️⃣ Frontend Setup-
    cd ../frontend
    npm install
    
* Create a .env.local file:
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXT_PUBLIC_API_URL=http://localhost:8000


Run the frontend:
npm run dev



🌐 Deployment
🔗 Frontend (Next.js):
      https://codeship.vercel.app

🔗 Backend (Express + Socket.IO): 
    https://code-collab-backend-tyrr.onrender.com/

🛡️ Security
Passwords (if used) are hashed with Bcrypt

JWT is used for verifying API calls

CORS ensures frontend-backend access restrictions

Only authenticated users can view/edit rooms or history









