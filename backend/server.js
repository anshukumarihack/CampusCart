require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const connectDB = require('./src/config/db');

// Connect to local MongoDB Database
connectDB();

const app = express();
const server = http.createServer(app);

// Setup Socket.IO Server for real-time buyer-seller chat and notifications
const io = new Server(server, {
  cors: {
    origin: '*', // Allows access from any port in local development
    methods: ['GET', 'POST'],
  },
});

// Make socket server globally available for controllers to push messages
app.set('io', io);

// Configure Secure HTTP Headers using Helmet (permitting local resource fetching)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Configure Rate Limiter for Authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per 15 minutes
  message: { message: 'Too many authentication attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Express Middleware
app.use(cors());

// Mount Payment Routes (Mounted before express.json to preserve raw webhook streams)
app.use('/api/payments', require('./src/routes/paymentRoutes'));

app.use(express.json());
// Serve local image uploads statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount Auth Routes (with Rate Limiting)
app.use('/api/auth', authLimiter, require('./src/routes/authRoutes'));

// Mount Other Feature Routes
app.use('/api/listings', require('./src/routes/listingRoutes'));
app.use('/api/users', require('./src/routes/userRoutes'));
app.use('/api/chats', require('./src/routes/chatRoutes'));
app.use('/api/offers', require('./src/routes/offerRoutes'));
app.use('/api/reviews', require('./src/routes/reviewRoutes'));
app.use('/api/reports', require('./src/routes/reportRoutes'));
app.use('/api/admin', require('./src/routes/adminRoutes'));
app.use('/api/transactions', require('./src/routes/transactionRoutes'));
app.use('/api/notifications', require('./src/routes/notificationRoutes'));

// Root Status check endpoint
app.get('/', (req, res) => {
  res.json({ message: 'CampusCart Backend API is running successfully.' });
});

// Socket.IO events for instant messenger & notifications
io.on('connection', (socket) => {
  console.log(`Client socket connected: ${socket.id}`);

  // Socket joining chat rooms
  socket.on('join_chat', (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room: ${roomId}`);
  });

  // Socket joining individual student notification channels
  socket.on('join_notifications', (userId) => {
    socket.join(`notify_${userId}`);
    console.log(`Socket ${socket.id} registered notification room: notify_${userId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Client socket disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5050; // Align with .env configuration
server.listen(PORT, () => {
  console.log(`Server is running in development mode on port ${PORT}`);
});
