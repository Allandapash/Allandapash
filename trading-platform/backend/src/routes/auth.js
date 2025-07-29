const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth, optionalAuth } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    platform: 'ALALIZ.COM',
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for registration
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registration attempts per hour
  message: {
    platform: 'ALALIZ.COM',
    error: 'Too many registration attempts, please try again later.',
    retryAfter: '1 hour'
  }
});

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      issuer: 'ALALIZ.COM',
      audience: 'trading-platform'
    }
  );
};

// Register
router.post('/register', registerLimiter, validate(schemas.register), async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.exists(email);
    if (existingUser) {
      return res.status(400).json({ 
        platform: 'ALALIZ.COM',
        error: 'An account with this email already exists' 
      });
    }

    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      phone
    });

    // Generate JWT token
    const token = generateToken(user.id);

    res.status(201).json({
      platform: 'ALALIZ.COM',
      message: 'Welcome to ALALIZ.COM! Your account has been created successfully.',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        role: user.role,
        isVerified: false,
        joinedAt: user.created_at
      }
    });

  } catch (error) {
    console.error('ALALIZ.COM - Registration error:', error);
    res.status(500).json({ 
      platform: 'ALALIZ.COM',
      error: 'Registration failed. Please try again.' 
    });
  }
});

// Login
router.post('/login', authLimiter, validate(schemas.login), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findByEmail(email.toLowerCase());
    if (!user) {
      return res.status(400).json({ 
        platform: 'ALALIZ.COM',
        error: 'Invalid email or password' 
      });
    }

    // Verify password
    const isValidPassword = await User.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ 
        platform: 'ALALIZ.COM',
        error: 'Invalid email or password' 
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(400).json({ 
        platform: 'ALALIZ.COM',
        error: 'Your account has been deactivated. Please contact support.' 
      });
    }

    // Generate JWT token
    const token = generateToken(user.id);

    // Get user stats
    const stats = await User.getStats(user.id);

    res.json({
      platform: 'ALALIZ.COM',
      message: 'Welcome back to ALALIZ.COM!',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        role: user.role,
        isActive: user.is_active,
        isVerified: user.is_verified,
        stats
      }
    });

  } catch (error) {
    console.error('ALALIZ.COM - Login error:', error);
    res.status(500).json({ 
      platform: 'ALALIZ.COM',
      error: 'Login failed. Please try again.' 
    });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const stats = await User.getStats(req.user.id);
    
    res.json({
      platform: 'ALALIZ.COM',
      user: {
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.first_name,
        lastName: req.user.last_name,
        phone: req.user.phone,
        role: req.user.role,
        isActive: req.user.is_active,
        isVerified: req.user.is_verified,
        stats
      }
    });
  } catch (error) {
    console.error('ALALIZ.COM - Get user error:', error);
    res.status(500).json({ 
      platform: 'ALALIZ.COM',
      error: 'Failed to fetch user information' 
    });
  }
});

// Refresh token
router.post('/refresh', auth, async (req, res) => {
  try {
    const token = generateToken(req.user.id);

    res.json({ 
      platform: 'ALALIZ.COM',
      token,
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    console.error('ALALIZ.COM - Token refresh error:', error);
    res.status(500).json({ 
      platform: 'ALALIZ.COM',
      error: 'Failed to refresh token' 
    });
  }
});

// Update profile
router.put('/profile', auth, validate(schemas.updateProfile), async (req, res) => {
  try {
    const updateData = {};
    
    if (req.body.firstName) updateData.first_name = req.body.firstName;
    if (req.body.lastName) updateData.last_name = req.body.lastName;
    if (req.body.phone !== undefined) updateData.phone = req.body.phone;

    const updatedUser = await User.update(req.user.id, updateData);

    res.json({
      platform: 'ALALIZ.COM',
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        phone: updatedUser.phone,
        role: updatedUser.role
      }
    });

  } catch (error) {
    console.error('ALALIZ.COM - Profile update error:', error);
    res.status(500).json({ 
      platform: 'ALALIZ.COM',
      error: 'Failed to update profile' 
    });
  }
});

// Change password
router.put('/password', auth, validate(schemas.changePassword), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user with password hash
    const user = await User.findByEmail(req.user.email);
    
    // Verify current password
    const isValidPassword = await User.verifyPassword(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ 
        platform: 'ALALIZ.COM',
        error: 'Current password is incorrect' 
      });
    }

    // Update password
    await User.updatePassword(req.user.id, newPassword);

    res.json({
      platform: 'ALALIZ.COM',
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('ALALIZ.COM - Password change error:', error);
    res.status(500).json({ 
      platform: 'ALALIZ.COM',
      error: 'Failed to change password' 
    });
  }
});

// Logout (client-side token removal, but we can log the event)
router.post('/logout', optionalAuth, async (req, res) => {
  try {
    if (req.user) {
      console.log(`ALALIZ.COM - User ${req.user.email} logged out`);
    }
    
    res.json({
      platform: 'ALALIZ.COM',
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('ALALIZ.COM - Logout error:', error);
    res.status(500).json({ 
      platform: 'ALALIZ.COM',
      error: 'Logout failed' 
    });
  }
});

// Verify token (for client-side validation)
router.get('/verify', auth, async (req, res) => {
  res.json({
    platform: 'ALALIZ.COM',
    valid: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      isActive: req.user.is_active,
      isVerified: req.user.is_verified
    }
  });
});

module.exports = router;