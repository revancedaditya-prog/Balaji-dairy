const getJwtSecret = () => {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }

  // Development-only fallback. Never used in production.
  return 'balaji_dairy_dev_only_jwt_secret';
};

const getJwtExpiry = () => process.env.JWT_EXPIRE || '30d';

module.exports = { getJwtSecret, getJwtExpiry };
