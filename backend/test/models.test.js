const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const MilkEntry = require('../src/models/MilkEntry');
const Payment = require('../src/models/Payment');
const Supplier = require('../src/models/Supplier');
const User = require('../src/models/User');

const userId = new mongoose.Types.ObjectId();

test('new users default to the least-privileged worker role', async () => {
  const user = new User({ name: 'Worker', phone: '9876543210', password: 'secret1' });
  assert.equal(user.role, 'worker');
  await user.validate();
});

test('milk entry schema rejects impossible dates and invalid times', async () => {
  const entry = new MilkEntry({
    supplierCode: 1,
    supplierName: 'Farmer',
    date: '2026-02-30',
    time: '25:00',
    shift: 'Morning',
    milkQuantity: 10,
    amount: 500,
    createdBy: userId,
  });
  await assert.rejects(entry.validate(), (error) => {
    assert.ok(error.errors.date);
    assert.ok(error.errors.time);
    return true;
  });
});

test('payment and supplier schemas enforce financial and phone constraints', async () => {
  const payment = new Payment({
    supplierCode: 1,
    date: '2026-09-15',
    amountPaid: -1,
    createdBy: userId,
  });
  await assert.rejects(payment.validate(), (error) => Boolean(error.errors.amountPaid));

  const supplier = new Supplier({
    supplierCode: 1,
    supplierName: 'Farmer',
    village: 'Kasganj',
    mobile: '123',
  });
  await assert.rejects(supplier.validate(), (error) => Boolean(error.errors.mobile));
});
