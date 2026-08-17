const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'campuscart_jwt_secret_key_2026'
      );

      // Get user from the token, check if blocked
      const user = await User.findById(decoded.id).select('-otp -otpExpires');
      if (!user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      if (user.isBlocked) {
        return res.status(403).json({ message: 'User account has been suspended by administrators.' });
      }

      req.user = user;
      return next();
    } catch (error) {
      console.error('Auth Middleware Error:', error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied: Admin resource only' });
  }
};

module.exports = { protect, admin };
