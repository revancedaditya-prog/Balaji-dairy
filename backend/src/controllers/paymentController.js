const Payment = require('../models/Payment');
const MilkEntry = require('../models/MilkEntry');
const Supplier = require('../models/Supplier');
const logAudit = require('../utils/auditLogger');

// Helper to get current Indian standard date
const getISTDate = () => {
  const dateObj = new Date();
  const offset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(dateObj.getTime() + offset);
  return istDate.toISOString().split('T')[0];
};

// @desc    Record a new payment
// @route   POST /api/payments
// @access  Private
exports.recordPayment = async (req, res) => {
  const { supplierCode, amountPaid, paymentMode, remarks, date } = req.body;

  try {
    if (!supplierCode || !amountPaid) {
      return res.status(400).json({ success: false, message: 'Please provide supplierCode and amountPaid' });
    }

    // Verify supplier exists
    const supplier = await Supplier.findOne({ supplierCode });
    if (!supplier) {
      return res.status(404).json({ success: false, message: `Supplier Code #${supplierCode} does not exist` });
    }

    const payDate = date || getISTDate();

    const payment = await Payment.create({
      supplierCode,
      date: payDate,
      amountPaid,
      paymentMode: paymentMode || 'Cash',
      remarks,
      createdBy: req.user._id,
    });

    await logAudit(
      `${req.user.name} (${req.user.phone})`,
      'PAYMENT_RECORD',
      `Payment recorded for Supplier #${supplierCode} of amount Rs. ${amountPaid}`,
      null,
      payment
    );

    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get payments history
// @route   GET /api/payments
// @access  Private
exports.getPayments = async (req, res) => {
  const { supplierCode, startDate, endDate } = req.query;

  try {
    let query = {};

    if (supplierCode) {
      query.supplierCode = parseInt(supplierCode, 10);
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    const payments = await Payment.find(query).sort({ date: -1, createdAt: -1 });
    res.status(200).json({ success: true, count: payments.length, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get suppliers payment ledger list
// @route   GET /api/payments/ledger
// @access  Private
exports.getLedger = async (req, res) => {
  const { search, village } = req.query;

  try {
    // 1. Fetch suppliers matching search filters
    let supplierQuery = {};
    if (village) {
      supplierQuery.village = new RegExp(village, 'i');
    }
    if (search) {
      const searchNum = parseInt(search);
      if (!isNaN(searchNum)) {
        supplierQuery.$or = [{ supplierCode: searchNum }];
      } else {
        supplierQuery.$or = [
          { supplierName: new RegExp(search, 'i') },
          { village: new RegExp(search, 'i') },
        ];
      }
    }

    const suppliers = await Supplier.find(supplierQuery).sort({ supplierCode: 1 });
    const supplierCodes = suppliers.map((s) => s.supplierCode);

    // 2. Aggregate Milk Entries in bulk
    const milkAgg = await MilkEntry.aggregate([
      { $match: { supplierCode: { $in: supplierCodes } } },
      {
        $group: {
          _id: '$supplierCode',
          totalMilk: { $sum: '$milkQuantity' },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    // 3. Aggregate Payments in bulk
    const paymentAgg = await Payment.aggregate([
      { $match: { supplierCode: { $in: supplierCodes } } },
      {
        $group: {
          _id: '$supplierCode',
          totalPaid: { $sum: '$amountPaid' },
        },
      },
    ]);

    // Create lookup maps
    const milkMap = {};
    milkAgg.forEach((item) => {
      milkMap[item._id] = item;
    });

    const paymentMap = {};
    paymentAgg.forEach((item) => {
      paymentMap[item._id] = item.totalPaid;
    });

    // 4. Merge results
    const ledger = suppliers.map((supplier) => {
      const code = supplier.supplierCode;
      const milkInfo = milkMap[code] || { totalMilk: 0, totalAmount: 0 };
      const paid = paymentMap[code] || 0;

      const totalMilk = Math.round(milkInfo.totalMilk * 100) / 100;
      const totalAmount = Math.round(milkInfo.totalAmount * 100) / 100;
      const totalPaid = Math.round(paid * 100) / 100;
      const pendingAmount = Math.round((totalAmount - totalPaid) * 100) / 100;

      return {
        supplierId: supplier._id,
        supplierCode: code,
        supplierName: supplier.supplierName,
        mobile: supplier.mobile,
        village: supplier.village,
        status: supplier.status,
        totalMilk,
        totalAmount,
        totalPaid,
        pendingAmount,
      };
    });

    res.status(200).json({ success: true, count: ledger.length, data: ledger });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get individual supplier detailed ledger
// @route   GET /api/payments/ledger/:code
// @access  Private
exports.getSupplierLedger = async (req, res) => {
  const code = parseInt(req.params.code, 10);

  try {
    const supplier = await Supplier.findOne({ supplierCode: code });
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    // Get all milk entries and payments for this supplier
    const milkEntries = await MilkEntry.find({ supplierCode: code }).sort({ date: 1, time: 1 });
    const payments = await Payment.find({ supplierCode: code }).sort({ date: 1, createdAt: 1 });

    // Combine them chronologically into a running ledger
    // A ledger item can be either a Debit (milk collection, center owes supplier) or a Credit (payment made, center paid supplier)
    let runningBalance = 0;
    const ledgerHistory = [];

    // Map milk entries
    milkEntries.forEach((entry) => {
      runningBalance += entry.amount;
      ledgerHistory.push({
        id: entry._id,
        date: entry.date,
        time: entry.time,
        type: 'Milk Entry',
        description: `Qty: ${entry.milkQuantity}L | Fat: ${entry.fat}% | SNF: ${entry.snf}%`,
        amount: entry.amount,
        txnType: 'debit', // Center owes supplier
        balance: Math.round(runningBalance * 100) / 100,
      });
    });

    // Map payments
    payments.forEach((pay) => {
      runningBalance -= pay.amountPaid;
      ledgerHistory.push({
        id: pay._id,
        date: pay.date,
        time: pay.createdAt.toISOString().substring(11, 19),
        type: 'Payment',
        description: `Paid via ${pay.paymentMode}${pay.remarks ? ' - ' + pay.remarks : ''}`,
        amount: pay.amountPaid,
        txnType: 'credit', // Paid to supplier
        balance: Math.round(runningBalance * 100) / 100,
      });
    });

    // Sort combined by date
    ledgerHistory.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Recalculate balance dynamically after chronological sorting
    let bal = 0;
    const sortedHistory = ledgerHistory.map((item) => {
      if (item.txnType === 'debit') {
        bal += item.amount;
      } else {
        bal -= item.amount;
      }
      item.balance = Math.round(bal * 100) / 100;
      return item;
    });

    // Summaries
    const totalMilk = milkEntries.reduce((sum, entry) => sum + entry.milkQuantity, 0);
    const totalAmount = milkEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const totalPaid = payments.reduce((sum, pay) => sum + pay.amountPaid, 0);

    res.status(200).json({
      success: true,
      supplier: {
        supplierCode: supplier.supplierCode,
        supplierName: supplier.supplierName,
        village: supplier.village,
        mobile: supplier.mobile,
      },
      summary: {
        totalMilk: Math.round(totalMilk * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        pendingAmount: Math.round((totalAmount - totalPaid) * 100) / 100,
      },
      history: sortedHistory.reverse(), // Show latest first in UI table
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
