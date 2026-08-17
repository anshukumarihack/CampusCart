# CampusCart — Campus Marketplace Platform

CampusCart is a secure, real-time, peer-to-peer marketplace designed specifically for university campuses. Verified students can list items for sale, make offers, negotiate prices (counter-offers), chat instantly, perform secure online checkouts via Stripe, schedule safe meetups, and track trade progression.

---

## Features

*   **Credentials & OTP Verification**: High-security user registration requiring a college email, student ID, and secure hashed password. Live OTP verification activated upon registration.
*   **Inventory Management**: Users can publish listings with multiple photo uploads, set condition tags, edit titles, pricing, descriptions, and categories, or soft-delete them.
*   **Negotiation Hub (Offers)**: Instant bid placements, counter-offer negotiations, and status progressions.
*   **Transaction Tracker**: Visual trade steppers tracking status transitions (`Listed → Interested → Offer Made → Accepted → Meetup Scheduled → Completed`). Meetup scheduling coordinates location and times, requiring mutual confirmation from both parties to finalize.
*   **Real-Time Chats**: Persistent messaging rooms using Socket.IO to coordinate deals.
*   **Live Notification Center**: Live notification feed (with sound/socket push and unread badge count) for chat messages, counter-offers, trade milestones, and moderation.
*   **Admin Panel Dashboard**: Global overview widgets (stats), ban/unban moderation operations, listing overrides, and reported violations management.

---

## Directory Structure

```
campus-cart/
├── backend/
│   ├── src/
│   │   ├── config/              # MongoDB and NodeMailer setup
│   │   ├── controllers/         # Business logic handlers
│   │   ├── middleware/          # JWT auth, uploading, rate-limiting & validation
│   │   ├── models/              # Mongoose database schemas
│   │   └── routes/              # Express API endpoint routes
│   ├── uploads/                 # Static local images
│   ├── .env                     # Server configuration variables
│   ├── server.js                # Express app & Socket.IO server
│   └── package.json
│
└── frontend/
    ├── public/                  # Static assets
    ├── src/
    │   ├── assets/              # Icons and styling sheets
    │   ├── components/          # Reusable UI widgets (Navbar, Toast, Loader)
    │   ├── context/             # Global Auth, Socket & Toast React Contexts
    │   ├── pages/               # Main Page views
    │   ├── App.jsx              # Routing config & main wrappers
    │   └── main.jsx             # React DOM entry point
    ├── index.html
    └── package.json
```

---

## Environment Variables

### Backend Configuration (`backend/.env`)

Create a `.env` file in the `backend/` directory and populate it:

```env
# Server Port
PORT=5050

# MongoDB URI (use local for development, Atlas for production)
MONGO_URI=mongodb://127.0.0.1:27017/campuscart

# Authentication Secrets
JWT_SECRET=campuscart_secret_jwt_key_2026_dev_only
REFRESH_SECRET=campuscart_refresh_secret_key_2026

# Nodemailer SMTP Configuration (optional - fallbacks to console log for OTPs in dev mode)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=your_email@gmail.com
# SMTP_PASS=your_app_password

# Stripe Checkout Payment Keys (optional - activates Mock engine checkouts if empty)
# STRIPE_SECRET_KEY=sk_test_your_secret_key
# STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_key
```

---

## Local Setup & Run Guide

### Prerequisites
*   Node.js (v18+)
*   MongoDB running locally (`mongodb://127.0.0.1:27017`)

### Step 1: Run Backend
1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm start
    ```
    *The API will run on `http://127.0.0.1:5050`.*

### Step 2: Run Frontend
1.  Navigate to the `frontend` directory:
    ```bash
    cd ../frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the Vite dev server:
    ```bash
    npm run dev
    ```
    *The app will load at `http://127.0.0.1:5173`.*

---

## Production Deployment Steps

### 1. Database (MongoDB Atlas)
1.  Register at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and spin up a free M10/Serverless database cluster.
2.  Under **Network Access**, whitelist `0.0.0.0/32` (or your web server's outbound IPs) and add a database user.
3.  Copy the connection string (e.g. `mongodb+srv://<user>:<password>@cluster.mongodb.net/campuscart`) and use it as `MONGO_URI`.

### 2. Backend (Render / Heroku)
1.  Connect your GitHub repository to [Render](https://render.com/).
2.  Create a new **Web Service** pointing to the `backend/` directory.
3.  Configure variables:
    *   **Build Command**: `npm install`
    *   **Start Command**: `node server.js`
4.  In the Web Service dashboard, navigate to **Environment** and add the variables defined in `backend/.env`.

### 3. Frontend (Vercel / Netlify)
1.  Link your repository to [Vercel](https://vercel.com/).
2.  Create a new project, select the directory `frontend/`.
3.  In the Vite client configurations, ensure your API endpoints point to the deployed Render backend URL (e.g., `https://campuscart-api.onrender.com/api`) instead of `http://127.0.0.1:5050/api`.
4.  Click **Deploy**.
