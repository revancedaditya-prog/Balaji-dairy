import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRate, hasMilkEntryInput, isMilkEntryDirty, validateMilkEntryRow, csvEscape } from './milkEntryGridUtils.js';

test('calculates rate as amount divided by litres', () => {
  assert.equal(calculateRate('10', '600'), 60);
  assert.equal(calculateRate('12.5', '750'), 60);
  assert.equal(calculateRate('3', '10'), 10 / 3);
});

test('rate is unavailable for missing or invalid quantity/amount', () => {
  assert.equal(calculateRate('', '600'), null);
  assert.equal(calculateRate('0', '600'), null);
  assert.equal(calculateRate('10', ''), null);
  assert.equal(calculateRate('10', '-1'), null);
});

test('blank supplier rows are not considered entries', () => {
  assert.equal(hasMilkEntryInput({ fat: '', snf: '', milkQuantity: '', amount: '' }), false);
  assert.equal(hasMilkEntryInput({ fat: '6.5', snf: '', milkQuantity: '', amount: '' }), true);
});

test('new rows are dirty when any value is entered', () => {
  assert.equal(isMilkEntryDirty({ original: null, fat: '', snf: '', milkQuantity: '', amount: '' }), false);
  assert.equal(isMilkEntryDirty({ original: null, fat: '', snf: '', milkQuantity: '10', amount: '600' }), true);
});

test('saved row compares numeric values to avoid formatting-only edits', () => {
  const row = { original: { fat: '6.50', snf: '8.5', milkQuantity: '10', amount: '600' }, fat: '6.5', snf: '8.50', milkQuantity: '10.00', amount: '600.00' };
  assert.equal(isMilkEntryDirty(row), false);
  assert.equal(isMilkEntryDirty({ ...row, amount: '601' }), true);
});

test('quantity and amount are compulsory; fat and snf remain optional', () => {
  assert.equal(validateMilkEntryRow({ milkQuantity: '10', amount: '600', fat: '', snf: '' }), '');
  assert.equal(validateMilkEntryRow({ milkQuantity: '', amount: '600', fat: '', snf: '' }), 'Milk quantity is required');
  assert.equal(validateMilkEntryRow({ milkQuantity: '0', amount: '600', fat: '', snf: '' }), 'Milk quantity must be greater than zero');
  assert.equal(validateMilkEntryRow({ milkQuantity: '10', amount: '', fat: '', snf: '' }), 'Amount is required');
  assert.equal(validateMilkEntryRow({ milkQuantity: '10', amount: '-5', fat: '', snf: '' }), 'Amount must be zero or more');
});

test('CSV values containing commas or quotes are escaped', () => {
  assert.equal(csvEscape('Milk, evening'), '"Milk, evening"');
  assert.equal(csvEscape('He said "yes"'), '"He said ""yes"""');
  assert.equal(csvEscape('plain'), 'plain');
});
