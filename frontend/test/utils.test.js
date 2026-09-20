import test from 'node:test';
import assert from 'node:assert/strict';
import { detectMilkShift, getISTDateTime } from '../src/utils/dateTime.js';
import { escapeHtml } from '../src/utils/html.js';

test('IST date helper handles the UTC date boundary', () => {
  assert.deepEqual(getISTDateTime(new Date('2026-01-01T20:00:00.000Z')), {
    dateStr: '2026-01-02',
    timeStr: '01:30',
  });
});

test('milk shift boundary matches backend rules', () => {
  assert.equal(detectMilkShift('03:59'), 'Evening');
  assert.equal(detectMilkShift('04:00'), 'Morning');
  assert.equal(detectMilkShift('13:59'), 'Morning');
  assert.equal(detectMilkShift('14:00'), 'Evening');
});

test('print values are escaped before HTML rendering', () => {
  assert.equal(
    escapeHtml('<img src=x onerror="alert(1)">'),
    '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'
  );
});
