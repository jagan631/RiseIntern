# RiseIntern Chat Application

A premium, full-stack, real-time chat application built with modern web technologies. This project features a robust Node.js backend and a sleek, responsive React frontend, supporting both group discussions and private one-on-one messaging.

---

## 🚀 Features

### 💬 Messaging & Real-time Interaction
- **Real-time Chat**: Powered by Socket.io for instantaneous message delivery.
- **Group & Private Rooms**: Join global channels (General, Engineering, Design) or start private DMs with other users.
- **Message Management**: Edit or delete your messages after sending.
- **Read Receipts**: Visual indicators for message status (Sent, Delivered, Seen).
- **Typing Indicators**: See when others are typing in real-time.
- **Unread Notifications**: Persistent unread message counts for every chat room.
- **Search**: Search through your message history or find new users to chat with.

### 👤 User Experience & Security
- **Secure Authentication**: JWT-based auth with encrypted password storage via BcryptJS.
- **Password Validation**: Enforced security with minimum 8 characters and special character requirements.
- **Rich Profiles**: Customize your bio and manage privacy settings (Last Seen, Read Receipts).
- **Dark Mode**: A fully integrated dark theme for a comfortable night-time experience.
- **Responsive Design**: Optimized for both desktop and mobile devices.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: [React](https://reactjs.org/) (Vite)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **State/Routing**: React Router DOM
- **Socket**: Socket.io-client

### Backend
- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express](https://expressjs.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) (Mongoose ODM)
- **Real-time**: [Socket.io](https://socket.io/)
- **Security**: JWT & BcryptJS

---

## ⚙️ Setup & Installation

### 1. Clone the Repository
```bash
git clone https://github.com/jagan631/RiseIntern.git
cd RiseIntern
```

### 2. Backend Configuration
Navigate to the `chat-backend` directory and install dependencies:
```bash
cd chat-backend
npm install
```
Create a `.env` file in the `chat-backend` directory:
```env
PORT=5001
MONGO_URL=your_mongodb_connection_string
JWT_SECRET=your_secret_key
FRONTEND_URL=http://localhost:5173
```
Start the backend:
```bash
npm run dev
```

### 3. Frontend Configuration
Navigate to the `Frontend` directory and install dependencies:
```bash
cd ../Frontend
npm install
```
Start the frontend:
```bash
npm run dev
```

---

## 🌐 Deployment

The application is architected to be deployed across separate platforms:
- **Frontend**: Recommended for [Netlify](https://www.netlify.com/) or [Vercel](https://vercel.com/).
- **Backend**: Recommended for [Render](https://render.com/) or [Railway](https://railway.app/).
- **Database**: [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) for managed cloud storage.

---

## 📄 License
This project is part of the RiseIntern program. All rights reserved.
