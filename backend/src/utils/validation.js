const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const safeRegex = (value) => new RegExp(escapeRegExp(String(value).trim()), 'i');

const toFiniteNumber = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toPositiveNumber = (value) => {
  const parsed = toFiniteNumber(value);
  return parsed !== null && parsed > 0 ? parsed : null;
};

const toNonNegativeNumber = (value) => {
  const parsed = toFiniteNumber(value);
  return parsed !== null && parsed >= 0 ? parsed : null;
};

const toPositiveInteger = (value) => {
  const parsed = toFiniteNumber(value);
  return parsed !== null && Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const isIsoDate = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!match) return false;

  const [, year, month, day] = match.map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
};

const isTime = (value) => /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(String(value || ''));

const normalizePhone = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15 ? digits : null;
};

module.exports = {
  escapeRegExp,
  isIsoDate,
  isTime,
  normalizePhone,
  safeRegex,
  toFiniteNumber,
  toNonNegativeNumber,
  toPositiveInteger,
  toPositiveNumber,
};
