const getErrorStatus = (error) => {
  const explicitStatus = Number(error?.status || error?.statusCode);
  if (Number.isInteger(explicitStatus) && explicitStatus >= 400 && explicitStatus <= 599) return explicitStatus;
  if (error?.name === 'ValidationError' || error?.name === 'CastError') return 400;
  if (error?.code === 11000) return 409;
  return 500;
};

const sendControllerError = (res, error) => {
  const status = getErrorStatus(error);
  console.error('[Controller Error]', {
    status,
    message: error?.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : error?.stack,
  });

  return res.status(status).json({
    success: false,
    message: status >= 500 && process.env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : error?.message || 'Internal Server Error',
  });
};

module.exports = { getErrorStatus, sendControllerError };
