const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const errorHandler = require('./middleware/errorHandler');
const ApiError = require('./utils/apiError');
const ApiResponse = require('./utils/apiResponse');
const authRoutes = require('./routes/auth.routes');
const assetRoutes = require('./routes/asset.routes');
const publicRoutes = require('./routes/public.routes');

const app = express();

// Set security HTTP headers
app.use(helmet());

// Enable CORS
app.use(cors());

// Compress all responses
app.use(compression());

// Request logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Parse json request body
app.use(express.json());

// Parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/public', publicRoutes);

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json(new ApiResponse(200, { uptime: process.uptime() }, 'Server is healthy'));
});

// Root path response
app.get('/', (req, res) => {
  res.status(200).json(new ApiResponse(200, { project: 'MaintainIQ API' }, 'Welcome to MaintainIQ API'));
});

// Send back 404 error for any unknown api request
app.use((req, res, next) => {
  next(new ApiError(404, 'API endpoint not found', 'ENDPOINT_NOT_FOUND'));
});

// Global error handler
app.use(errorHandler);

module.exports = app;
