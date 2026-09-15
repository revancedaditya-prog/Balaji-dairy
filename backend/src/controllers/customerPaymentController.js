const CustomerPayment = require('../models/CustomerPayment');
const CustomerDelivery = require('../models/CustomerDelivery');
const Customer = require('../models/Customer');
const logAudit = require('../utils/auditLogger');

const getISTDate = () => {
  const dateObj = new Date();
  const offset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(dateObj.getTime() + offset);
  return istDate.toISOString().split('T')[0];
};

// @desc    Record a customer payment
// @route   POST /api/customer-payments
// @access  Private
exports.recordPayment = async (req, res) => {
  const { customerCode, amountPaid, discountOrAdjustment, paymentMode, remarks, date } = req.body;

  try {
    if (!customerCode || (Number(amountPaid) <= 0 && Number(discountOrAdjustment) <= 0)) {
      return res.status(400).json({ success: false, message: 'Please provide customerCode and payment amount' });
    }

    const customer = await Customer.findOne({ customerCode });
    if (!customer) {
      return res.status(404).json({ success: false, message: `Customer #${customerCode} does not exist` });
    }

    const payDate = date || getISTDate();

    const payment = await CustomerPayment.create({
      customerCode,
      customerName: customer.customerName,
      date: payDate,
      amountPaid: Number(amountPaid) || 0,
      discountOrAdjustment: Number(discountOrAdjustment) || 0,
      paymentMode: paymentMode || 'Cash',
      remarks: remarks || '',
      createdBy: req.user._id,
    });

    await logAudit(
      `${req.user.name} (${req.user.phone || req.user.email})`,
      'CUSTOMER_PAYMENT',
      `Payment recorded for Customer ${customer.customerName} (#${customerCode}) of ₹${amountPaid} via ${paymentMode}`
    );

    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get customer payments list
// @route   GET /api/customer-payments
// @access  Private
exports.getPayments = async (req, res) => {
  const { customerCode, startDate, endDate, limit } = req.query;

  try {
    let query = {};
    if (customerCode) query.customerCode = parseInt(customerCode, 10);
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    let q = CustomerPayment.find(query).sort({ date: -1, createdAt: -1 });
    if (limit) q = q.limit(parseInt(limit, 10));

    const payments = await q;
    res.status(200).json({ success: true, count: payments.length, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all customers ledger summary with outstanding balances & ageing
// @route   GET /api/customer-payments/ledger
// @access  Private
exports.getLedgerList = async (req, res) => {
  const { search, village, customerType } = req.query;

  try {
    let custQuery = {};
    if (village) custQuery.village = new RegExp(village, 'i');
    if (customerType) custQuery.customerType = customerType;
    if (search) {
      const searchNum = parseInt(search, 10);
      if (!isNaN(searchNum)) {
        custQuery.$or = [{ customerCode: searchNum }, { customerName: new RegExp(search, 'i') }, { mobile: new RegExp(search, 'i') }];
      } else {
        custQuery.$or = [{ customerName: new RegExp(search, 'i') }, { village: new RegExp(search, 'i') }, { mobile: new RegExp(search, 'i') }];
      }
    }

    const customers = await Customer.find(custQuery).sort({ customerCode: 1 });
    const codes = customers.map((c) => c.customerCode);

    // Aggregate deliveries
    const deliveryAgg = await CustomerDelivery.aggregate([
      { $match: { customerCode: { $in: codes }, status: { $in: ['Delivered', 'Changed Qty'] } } },
      {
        $group: {
          _id: '$customerCode',
          totalMilk: { $sum: '$quantity' },
          totalSalesAmount: { $sum: '$amount' },
        },
      },
    ]);

    // Aggregate payments
    const paymentAgg = await CustomerPayment.aggregate([
      { $match: { customerCode: { $in: codes } } },
      {
        $group: {
          _id: '$customerCode',
          totalPaid: { $sum: '$amountPaid' },
          totalAdjusted: { $sum: '$discountOrAdjustment' },
        },
      },
    ]);

    const deliveryMap = {};
    deliveryAgg.forEach((d) => { deliveryMap[d._id] = d; });

    const paymentMap = {};
    paymentAgg.forEach((p) => { paymentMap[p._id] = p; });

    const todayDate = new Date();

    const ledgerList = customers.map((cust) => {
      const code = cust.customerCode;
      const dInfo = deliveryMap[code] || { totalMilk: 0, totalSalesAmount: 0 };
      const pInfo = paymentMap[code] || { totalPaid: 0, totalAdjusted: 0 };

      const openingBal = Number(cust.openingBalance) || 0;
      const totalSales = Math.round(dInfo.totalSalesAmount * 100) / 100;
      const totalMilk = Math.round(dInfo.totalMilk * 100) / 100;
      const totalPaid = Math.round(pInfo.totalPaid * 100) / 100;
      const totalAdjusted = Math.round(pInfo.totalAdjusted * 100) / 100;

      // Pending Receivable = Opening + Total Sales - (Total Paid + Adjustments)
      const pendingBalance = Math.round((openingBal + totalSales - totalPaid - totalAdjusted) * 100) / 100;

      return {
        customerId: cust._id,
        customerCode: code,
        customerName: cust.customerName,
        mobile: cust.mobile,
        village: cust.village,
        customerType: cust.customerType,
        milkType: cust.milkType,
        status: cust.status,
        openingBalance: openingBal,
        totalMilk,
        totalSales,
        totalPaid,
        totalAdjusted,
        pendingBalance,
      };
    });

    // Summary counters
    const totalReceivable = Math.round(ledgerList.reduce((sum, item) => sum + (item.pendingBalance > 0 ? item.pendingBalance : 0), 0) * 100) / 100;
    const totalSalesAll = Math.round(ledgerList.reduce((sum, item) => sum + item.totalSales, 0) * 100) / 100;
    const totalCollectedAll = Math.round(ledgerList.reduce((sum, item) => sum + item.totalPaid, 0) * 100) / 100;

    res.status(200).json({
      success: true,
      summary: {
        totalCustomers: ledgerList.length,
        totalSalesAll,
        totalCollectedAll,
        totalReceivable,
      },
      data: ledgerList,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get detailed running ledger for individual customer
// @route   GET /api/customer-payments/ledger/:code
// @access  Private
exports.getCustomerLedger = async (req, res) => {
  const code = parseInt(req.params.code, 10);

  try {
    const customer = await Customer.findOne({ customerCode: code });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const deliveries = await CustomerDelivery.find({ customerCode: code }).sort({ date: 1, shift: 1 });
    const payments = await CustomerPayment.find({ customerCode: code }).sort({ date: 1, createdAt: 1 });

    let runningBalance = Number(customer.openingBalance) || 0;
    const ledgerHistory = [];

    // Opening Balance entry
    if (runningBalance !== 0) {
      ledgerHistory.push({
        id: 'opening-bal',
        date: customer.startDate ? new Date(customer.startDate).toISOString().split('T')[0] : '2026-01-01',
        time: '00:00',
        type: 'Opening Balance',
        description: 'Initial Opening Balance',
        amount: Math.abs(runningBalance),
        txnType: runningBalance > 0 ? 'debit' : 'credit',
        balance: runningBalance,
      });
    }

    // Map Deliveries (Debit: Customer owes Dairy)
    deliveries.forEach((del) => {
      if (del.status === 'Delivered' || del.status === 'Changed Qty') {
        ledgerHistory.push({
          id: del._id,
          date: del.date,
          time: del.shift === 'Morning' ? '06:30' : '18:00',
          type: 'Milk Delivery',
          description: `${del.shift} • Qty: ${del.quantity}L @ ₹${del.rate}/L`,
          amount: del.amount,
          txnType: 'debit',
        });
      }
    });

    // Map Payments (Credit: Customer paid Dairy)
    payments.forEach((pay) => {
      ledgerHistory.push({
        id: pay._id,
        date: pay.date,
        time: pay.createdAt ? pay.createdAt.toISOString().substring(11, 16) : '12:00',
        type: 'Payment Received',
        description: `Paid via ${pay.paymentMode}${pay.discountOrAdjustment > 0 ? ` (Disc: ₹${pay.discountOrAdjustment})` : ''}${pay.remarks ? ` - ${pay.remarks}` : ''}`,
        amount: pay.amountPaid + (pay.discountOrAdjustment || 0),
        txnType: 'credit',
      });
    });

    // Sort combined ledger chronologically
    ledgerHistory.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate dynamic running balance
    let bal = 0;
    const sortedHistory = ledgerHistory.map((item) => {
      if (item.id === 'opening-bal') {
        bal = item.balance;
      } else if (item.txnType === 'debit') {
        bal += item.amount;
      } else {
        bal -= item.amount;
      }
      item.balance = Math.round(bal * 100) / 100;
      return item;
    });

    const totalMilk = Math.round(deliveries.filter(d => d.status === 'Delivered' || d.status === 'Changed Qty').reduce((sum, d) => sum + d.quantity, 0) * 100) / 100;
    const totalSales = Math.round(deliveries.filter(d => d.status === 'Delivered' || d.status === 'Changed Qty').reduce((sum, d) => sum + d.amount, 0) * 100) / 100;
    const totalPaid = Math.round(payments.reduce((sum, p) => sum + p.amountPaid, 0) * 100) / 100;
    const totalAdjusted = Math.round(payments.reduce((sum, p) => sum + (p.discountOrAdjustment || 0), 0) * 100) / 100;
    const pendingBalance = Math.round(((Number(customer.openingBalance) || 0) + totalSales - totalPaid - totalAdjusted) * 100) / 100;

    res.status(200).json({
      success: true,
      customer: {
        customerCode: customer.customerCode,
        customerName: customer.customerName,
        village: customer.village,
        address: customer.address,
        mobile: customer.mobile,
        customerType: customer.customerType,
        milkType: customer.milkType,
        billingCycle: customer.billingCycle,
        defaultRate: customer.defaultRate,
      },
      summary: {
        openingBalance: Number(customer.openingBalance) || 0,
        totalMilk,
        totalSales,
        totalPaid,
        totalAdjusted,
        pendingBalance,
      },
      history: sortedHistory.reverse(), // latest first in table
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
