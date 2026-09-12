const Payment = require('../models/Payment');
const MilkEntry = require('../models/MilkEntry');
const Supplier = require('../models/Supplier');
const logAudit = require('../utils/auditLogger');

const getISTDate = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());

exports.recordPayment = async (req, res) => {
  const { supplierCode, paymentMode, remarks, date } = req.body;
  try {
    const code = Number(supplierCode);
    const amountPaid = Number(req.body.amountPaid);
    if (!Number.isInteger(code) || code <= 0 || !Number.isFinite(amountPaid) || amountPaid <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide a valid supplier code and payment amount greater than zero' });
    }

    const supplier = await Supplier.findOne({ supplierCode: code });
    if (!supplier) return res.status(404).json({ success: false, message: `Supplier Code #${code} does not exist` });

    const allowedModes = ['Cash', 'Bank Transfer', 'Cheque'];
    const mode = paymentMode || 'Cash';
    if (!allowedModes.includes(mode)) return res.status(400).json({ success: false, message: 'Invalid payment mode' });

    const payment = await Payment.create({
      supplierCode: code,
      date: date || getISTDate(),
      amountPaid,
      paymentMode: mode,
      remarks: remarks || '',
      createdBy: req.user._id,
    });

    await logAudit(`${req.user.name} (${req.user.phone})`, 'PAYMENT_RECORD', `Payment recorded for Supplier #${code} of amount Rs. ${amountPaid}`, null, payment);
    return res.status(201).json({ success: true, data: payment });
  } catch (error) {
    console.error('Record payment failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to record payment' });
  }
};

exports.getPayments = async (req, res) => {
  const { supplierCode, startDate, endDate } = req.query;
  try {
    const query = {};
    if (supplierCode) {
      const code = Number(supplierCode);
      if (!Number.isInteger(code)) return res.status(400).json({ success: false, message: 'Invalid supplier code' });
      query.supplierCode = code;
    }
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }
    const payments = await Payment.find(query).sort({ date: -1, createdAt: -1 });
    return res.status(200).json({ success: true, count: payments.length, data: payments });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load payments' });
  }
};

exports.getLedger = async (req, res) => {
  const { search, village } = req.query;
  try {
    const supplierQuery = {};
    if (village) supplierQuery.village = new RegExp(village, 'i');
    if (search) {
      const exactCode = /^\d+$/.test(search.trim()) ? Number(search.trim()) : null;
      supplierQuery.$or = exactCode !== null
        ? [{ supplierCode: exactCode }]
        : [{ supplierName: new RegExp(search, 'i') }, { village: new RegExp(search, 'i') }];
    }

    const suppliers = await Supplier.find(supplierQuery).sort({ supplierCode: 1 });
    const supplierCodes = suppliers.map((s) => s.supplierCode);

    const [milkAgg, paymentAgg] = await Promise.all([
      MilkEntry.aggregate([
        { $match: { supplierCode: { $in: supplierCodes } } },
        { $group: { _id: '$supplierCode', totalMilk: { $sum: '$milkQuantity' }, totalAmount: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
        { $match: { supplierCode: { $in: supplierCodes } } },
        { $group: { _id: '$supplierCode', totalPaid: { $sum: '$amountPaid' } } },
      ]),
    ]);

    const milkMap = new Map(milkAgg.map((item) => [item._id, item]));
    const paymentMap = new Map(paymentAgg.map((item) => [item._id, item.totalPaid]));
    const round = (value) => Math.round(value * 100) / 100;

    const ledger = suppliers.map((supplier) => {
      const milk = milkMap.get(supplier.supplierCode) || { totalMilk: 0, totalAmount: 0 };
      const totalPaid = round(paymentMap.get(supplier.supplierCode) || 0);
      const totalAmount = round(milk.totalAmount || 0);
      return {
        supplierId: supplier._id,
        supplierCode: supplier.supplierCode,
        supplierName: supplier.supplierName,
        mobile: supplier.mobile,
        village: supplier.village,
        status: supplier.status,
        totalMilk: round(milk.totalMilk || 0),
        totalAmount,
        totalPaid,
        pendingAmount: round(totalAmount - totalPaid),
      };
    });

    return res.status(200).json({ success: true, count: ledger.length, data: ledger });
  } catch (error) {
    console.error('Ledger load failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to load payment ledger' });
  }
};

exports.getSupplierLedger = async (req, res) => {
  const code = Number(req.params.code);
  if (!Number.isInteger(code)) return res.status(400).json({ success: false, message: 'Invalid supplier code' });

  try {
    const supplier = await Supplier.findOne({ supplierCode: code });
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });

    const [milkEntries, payments] = await Promise.all([
      MilkEntry.find({ supplierCode: code }).sort({ date: 1, time: 1, createdAt: 1 }),
      Payment.find({ supplierCode: code }).sort({ date: 1, createdAt: 1 }),
    ]);

    const history = [
      ...milkEntries.map((entry) => ({
        id: entry._id, date: entry.date, time: entry.time, createdAt: entry.createdAt,
        type: 'Milk Entry', description: `Qty: ${entry.milkQuantity}L | Fat: ${entry.fat}% | SNF: ${entry.snf}%`,
        amount: entry.amount, txnType: 'debit',
      })),
      ...payments.map((pay) => ({
        id: pay._id, date: pay.date, time: pay.createdAt.toISOString().substring(11, 19), createdAt: pay.createdAt,
        type: 'Payment', description: `Paid via ${pay.paymentMode}${pay.remarks ? ' - ' + pay.remarks : ''}`,
        amount: pay.amountPaid, txnType: 'credit',
      })),
    ];

    history.sort((a, b) => {
      const aKey = `${a.date}T${a.time || '00:00:00'}`;
      const bKey = `${b.date}T${b.time || '00:00:00'}`;
      const byBusinessTime = aKey.localeCompare(bKey);
      if (byBusinessTime !== 0) return byBusinessTime;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    let balance = 0;
    const round = (value) => Math.round(value * 100) / 100;
    const sortedHistory = history.map(({ createdAt, ...item }) => {
      balance += item.txnType === 'debit' ? item.amount : -item.amount;
      return { ...item, balance: round(balance) };
    });

    const totalMilk = milkEntries.reduce((sum, entry) => sum + entry.milkQuantity, 0);
    const totalAmount = milkEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const totalPaid = payments.reduce((sum, pay) => sum + pay.amountPaid, 0);

    return res.status(200).json({
      success: true,
      supplier: { supplierCode: supplier.supplierCode, supplierName: supplier.supplierName, village: supplier.village, mobile: supplier.mobile },
      summary: { totalMilk: round(totalMilk), totalAmount: round(totalAmount), totalPaid: round(totalPaid), pendingAmount: round(totalAmount - totalPaid) },
      history: sortedHistory.reverse(),
    });
  } catch (error) {
    console.error('Supplier ledger failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to load supplier ledger' });
  }
};
