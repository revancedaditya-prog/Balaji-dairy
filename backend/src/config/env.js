const DEV_JWT_SECRET = 'development-only-change-me-balaji-dairy';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (secret) {
    if (secret.length < 32) {
      throw new Error('JWT_SECRET must contain at least 32 characters');
    }
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }

  return DEV_JWT_SECRET;
};

const getCorsOptions = () => {
  const configuredOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const developmentOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ];

  const allowedOrigins = configuredOrigins.length > 0
    ? configuredOrigins
    : developmentOrigins;

  return {
    origin(origin, callback) {
      // Native apps, curl and server-to-server calls do not send an Origin header.
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      const error = new Error('Origin is not allowed by CORS');
      error.status = 403;
      callback(error);
    },
    credentials: false,
  };
};

const validateEnvironment = () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required');
  }

  getJwtSecret();

  if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGINS) {
    throw new Error('CORS_ORIGINS is required in production');
  }
};

module.exports = { getCorsOptions, getJwtSecret, validateEnvironment };
