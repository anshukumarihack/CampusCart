const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { sendOTPEmail } = require('../config/nodemailer');

// Helper to validate college email domain
const isValidCollegeEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return false;
  return true;
};

// @desc    Register a new student account
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  const { name, email, studentId, password } = req.body;

  if (!name || !email || !studentId || !password) {
    return res.status(400).json({ message: 'All registration fields are required' });
  }

  const lowercaseEmail = email.toLowerCase().trim();

  if (!isValidCollegeEmail(lowercaseEmail)) {
    return res.status(400).json({ message: 'Please enter a valid student email address' });
  }

  try {
    let user = await User.findOne({ email: lowercaseEmail });
    if (user) {
      return res.status(400).json({ message: 'A user with this email already exists' });
    }

    // Parse college name from email
    const emailDomain = lowercaseEmail.split('@')[1];
    const collegeName = emailDomain.split('.')[0].toUpperCase();

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

    user = new User({
      name: name.trim(),
      email: lowercaseEmail,
      studentId: studentId.trim(),
      password: hashedPassword,
      college: collegeName,
      verified: false,
      otp,
      otpExpires,
    });

    await user.save();

    // Send the email OTP
    const emailResult = await sendOTPEmail(user.email, otp);

    res.status(201).json({
      success: true,
      message: 'Registration successful! Verification code sent to college email.',
      email: user.email,
      devMode: emailResult.mode === 'console' || emailResult.mode === 'fallback-console',
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
};

// @desc    Request OTP for Login / Registration
// @route   POST /api/auth/send-otp
// @access  Public
exports.sendOTP = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  const lowercaseEmail = email.toLowerCase().trim();

  if (!isValidCollegeEmail(lowercaseEmail)) {
    return res.status(400).json({ message: 'Please enter a valid student email address' });
  }

  try {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

    let user = await User.findOne({ email: lowercaseEmail });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      const prefix = lowercaseEmail.split('@')[0];
      const defaultName = prefix
        .split(/[._-]/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      user = new User({
        email: lowercaseEmail,
        name: defaultName,
        verified: false,
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: 'This account has been suspended by administrators.' });
    }

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    // Send the email OTP
    const emailResult = await sendOTPEmail(user.email, otp);

    res.status(200).json({
      success: true,
      message: 'Verification code sent successfully',
      email: user.email,
      isNewUser,
      devMode: emailResult.mode === 'console' || emailResult.mode === 'fallback-console',
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ message: 'Failed to send verification code. Please try again.' });
  }
};

// @desc    Verify OTP and Log In / Register
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOTP = async (req, res) => {
  const { email, otp, name } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and verification code are required' });
  }

  const lowercaseEmail = email.toLowerCase().trim();

  try {
    const user = await User.findOne({ email: lowercaseEmail });

    if (!user) {
      return res.status(404).json({ message: 'User not found. Please request a new code.' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: 'This account has been suspended by administrators.' });
    }

    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    if (new Date() > user.otpExpires) {
      return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
    }

    user.verified = true;
    user.otp = null;
    user.otpExpires = null;

    if (name && name.trim()) {
      user.name = name.trim();
    }

    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'campuscart_jwt_secret_key_2026',
      { expiresIn: '1d' }
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.REFRESH_SECRET || 'campuscart_refresh_secret_key_2026',
      { expiresIn: '30d' }
    );

    res.status(200).json({
      success: true,
      token,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        verified: user.verified,
        averageRating: user.averageRating,
        ratingCount: user.ratingCount,
      },
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Verification failed. Please try again.' });
  }
};

// @desc    Authenticate User via Credentials
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const lowercaseEmail = email.toLowerCase().trim();

  try {
    const user = await User.findOne({ email: lowercaseEmail });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: 'This account has been suspended by administrators.' });
    }

    if (!user.verified) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.otp = otp;
      user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
      await user.save();
      await sendOTPEmail(user.email, otp);
      return res.status(403).json({
        message: 'Account not verified. A verification code has been sent to your email.',
        unverified: true,
      });
    }

    if (user.password) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
    } else {
      return res.status(401).json({ message: 'Invalid credentials. Password not set.' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'campuscart_jwt_secret_key_2026',
      { expiresIn: '1d' }
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.REFRESH_SECRET || 'campuscart_refresh_secret_key_2026',
      { expiresIn: '30d' }
    );

    res.status(200).json({
      success: true,
      token,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        verified: user.verified,
        averageRating: user.averageRating,
        ratingCount: user.ratingCount,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
};

// @desc    Refresh session token
// @route   POST /api/auth/refresh-token
// @access  Public
exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token is required' });
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_SECRET || 'campuscart_refresh_secret_key_2026'
    );

    const user = await User.findById(decoded.id);
    if (!user || user.isBlocked) {
      return res.status(401).json({ message: 'Invalid or suspended user session' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'campuscart_jwt_secret_key_2026',
      { expiresIn: '1d' }
    );

    res.status(200).json({
      success: true,
      token,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ message: 'Refresh token expired or invalid' });
  }
};

// @desc    Get Current User Profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-otp -otpExpires');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        verified: user.verified,
        averageRating: user.averageRating,
        ratingCount: user.ratingCount,
        wishlist: user.wishlist,
        college: user.college,
        studentId: user.studentId,
      },
    });
  } catch (error) {
    console.error('Get Me error:', error);
    res.status(500).json({ message: 'Server error fetching profile details' });
  }
};

// @desc    Update Name & Profile Photo
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  const { name, avatar } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name.trim();
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        verified: user.verified,
        averageRating: user.averageRating,
        ratingCount: user.ratingCount,
        college: user.college,
        studentId: user.studentId,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
};
