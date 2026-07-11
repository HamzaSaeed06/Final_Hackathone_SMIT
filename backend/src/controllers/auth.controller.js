const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

// Register controller - Admin Only
const register = asyncHandler(async (req, res, next) => {
  const { name, email, password, role, phone } = req.body;

  if (!name || !email || !password || !role) {
    return next(new ApiError(400, 'Name, email, password, and role are required', 'BAD_REQUEST'));
  }

  if (role !== 'admin' && role !== 'technician') {
    return next(new ApiError(400, 'Role must be either admin or technician', 'BAD_REQUEST'));
  }

  // Check unique email
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new ApiError(400, 'Email is already registered', 'EMAIL_ALREADY_EXISTS'));
  }

  // Create User
  const newUser = await User.create({
    name,
    email,
    password,
    role,
    phone
  });

  // Remove password from response
  const userResponse = newUser.toObject();
  delete userResponse.password;

  res.status(201).json(new ApiResponse(201, userResponse, 'User registered successfully'));
});

// Login controller
const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ApiError(400, 'Email and password are required', 'BAD_REQUEST'));
  }

  // Find user and include password for comparison
  const user = await User.findOne({ email });
  if (!user) {
    return next(new ApiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS'));
  }

  // Compare passwords
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return next(new ApiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS'));
  }

  // Generate JWT token
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

  // Remove password
  const userResponse = user.toObject();
  delete userResponse.password;

  res.status(200).json(new ApiResponse(200, { user: userResponse, token }, 'Logged in successfully'));
});

// Get current user details
const me = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, req.user, 'Current user loaded successfully'));
});

module.exports = {
  register,
  login,
  me,
};
