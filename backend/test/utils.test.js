const test = require('node:test');
const assert = require('node:assert/strict');
const { getISTDateTime } = require('../src/utils/dateTime');
const { getErrorStatus } = require('../src/utils/http');
const {
  escapeRegExp,
  isIsoDate,
  isTime,
  normalizePhone,
  safeRegex,
  toNonNegativeNumber,
  toPositiveInteger,
  toPositiveNumber,
} = require('../src/utils/validation');

test('numeric validation rejects invalid and negative business values', () => {
  assert.equal(toPositiveNumber('12.5'), 12.5);
  assert.equal(toPositiveNumber(0), null);
  assert.equal(toPositiveNumber('not-a-number'), null);
  assert.equal(toNonNegativeNumber(0), 0);
  assert.equal(toNonNegativeNumber(-1), null);
  assert.equal(toPositiveInteger('101'), 101);
  assert.equal(toPositiveInteger('10.5'), null);
});

test('search input is treated as literal text, not an executable regex', () => {
  assert.equal(escapeRegExp('a.*(b)'), 'a\\.\\*\\(b\\)');
  assert.equal(safeRegex('a.*(b)').test('A.*(B)'), true);
  assert.equal(safeRegex('a.*(b)').test('anything b'), false);
});

test('IST helper handles the date boundary correctly', () => {
  const value = getISTDateTime(new Date('2026-09-11T20:00:00.000Z'));
  assert.deepEqual(value, { dateStr: '2026-09-12', timeStr: '01:30:00' });
});

test('phone numbers are normalized and invalid values are rejected', () => {
  assert.equal(normalizePhone('+91 98765-43210'), '919876543210');
  assert.equal(normalizePhone('123'), null);
  assert.equal(normalizePhone('not-a-phone'), null);
});

test('date and time validation rejects impossible calendar values', () => {
  assert.equal(isIsoDate('2026-09-15'), true);
  assert.equal(isIsoDate('2026-02-29'), false);
  assert.equal(isIsoDate('2024-02-29'), true);
  assert.equal(isIsoDate('2026-99-15'), false);
  assert.equal(isTime('04:15'), true);
  assert.equal(isTime('23:59:59'), true);
  assert.equal(isTime('24:00'), false);
});

test('HTTP status mapping hides invalid status values and maps database errors', () => {
  assert.equal(getErrorStatus({ status: 403 }), 403);
  assert.equal(getErrorStatus({ status: 999 }), 500);
  assert.equal(getErrorStatus({ name: 'ValidationError' }), 400);
  assert.equal(getErrorStatus({ code: 11000 }), 409);
});
