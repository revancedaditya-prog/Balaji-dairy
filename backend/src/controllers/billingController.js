const CustomerBill = require('../models/CustomerBill');
const CustomerDelivery = require('../models/CustomerDelivery');
const CustomerPayment = require('../models/CustomerPayment');
const Customer = require('../models/Customer');
const logAudit = require('../utils/auditLogger');

const getISTDate = () => {
  const dateObj = new Date();
  const offset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(dateObj.getTime() + offset);
  return istDate.toISOString().split('T')[0];
};

// @desc    Generate / Preview Bill calculation
// @route   POST /api/billing/preview
// @access  Private
exports.previewBill = async (req, res) => {
  const { customerCode, startDate, endDate } = req.body;

  try {
    if (!customerCode || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Please provide customerCode, startDate, and endDate' });
    }

    const customer = await Customer.findOne({ customerCode: parseInt(customerCode, 10) });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // 1. Calculate Previous Balance up to startDate
    const prevDeliveries = await CustomerDelivery.aggregate([
      { $match: { customerCode: customer.customerCode, date: { $lt: startDate }, status: { $in: ['Delivered', 'Changed Qty'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const prevPayments = await CustomerPayment.aggregate([
      { $match: { customerCode: customer.customerCode, date: { $lt: startDate } } },
      { $group: { _id: null, paid: { $sum: '$amountPaid' }, adj: { $sum: '$discountOrAdjustment' } } },
    ]);

    const prevDelAmount = prevDeliveries[0] ? prevDeliveries[0].total : 0;
    const prevPayAmount = prevPayments[0] ? (prevPayments[0].paid + prevPayments[0].adj) : 0;
    const initialOpening = Number(customer.openingBalance) || 0;
    const previousBalance = Math.round((initialOpening + prevDelAmount - prevPayAmount) * 100) / 100;

    // 2. Fetch Period Deliveries
    const periodDeliveries = await CustomerDelivery.find({
      customerCode: customer.customerCode,
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: 1, shift: 1 });

    const totalLitres = Math.round(periodDeliveries.filter(d => d.status === 'Delivered' || d.status === 'Changed Qty').reduce((sum, d) => sum + d.quantity, 0) * 100) / 100;
    const milkAmount = Math.round(periodDeliveries.filter(d => d.status === 'Delivered' || d.status === 'Changed Qty').reduce((sum, d) => sum + d.amount, 0) * 100) / 100;

    // 3. Fetch Period Payments
    const periodPayments = await CustomerPayment.find({
      customerCode: customer.customerCode,
      date: { $gte: startDate, $lte: endDate },
    });

    const paymentsReceived = Math.round(periodPayments.reduce((sum, p) => sum + p.amountPaid, 0) * 100) / 100;
    const adjustments = Math.round(periodPayments.reduce((sum, p) => sum + (p.discountOrAdjustment || 0), 0) * 100) / 100;

    // Final Payable = Previous Balance + Period Milk Amount - (Period Payments + Adjustments)
    const finalPayable = Math.round((previousBalance + milkAmount - paymentsReceived - adjustments) * 100) / 100;

    const billNumber = `BILL-${customer.customerCode}-${startDate.replace(/-/g, '')}-${endDate.replace(/-/g, '')}`;

    res.status(200).json({
      success: true,
      data: {
        billNumber,
        customerCode: customer.customerCode,
        customerName: customer.customerName,
        mobile: customer.mobile,
        village: customer.village,
        address: customer.address,
        customerType: customer.customerType,
        milkType: customer.milkType,
        startDate,
        endDate,
        billDate: getISTDate(),
        previousBalance,
        totalLitres,
        milkAmount,
        paymentsReceived,
        adjustments,
        finalPayable,
        deliveries: periodDeliveries,
        payments: periodPayments,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Save generated bill
// @route   POST /api/billing
// @access  Private
exports.saveBill = async (req, res) => {
  const {
    billNumber,
    customerCode,
    customerName,
    startDate,
    endDate,
    billDate,
    totalLitres,
    milkAmount,
    previousBalance,
    paymentsReceived,
    adjustments,
    finalPayable,
    deliveries,
    notes,
  } = req.body;

  try {
    const existing = await CustomerBill.findOne({ billNumber });
    let savedBill;

    if (existing) {
      savedBill = await CustomerBill.findOneAndUpdate(
        { billNumber },
        {
          totalLitres,
          milkAmount,
          previousBalance,
          paymentsReceived,
          adjustments,
          finalPayable,
          deliveries,
          notes,
        },
        { new: true }
      );
    } else {
      savedBill = await CustomerBill.create({
        billNumber: billNumber || `BILL-${customerCode}-${Date.now()}`,
        customerCode,
        customerName,
        startDate,
        endDate,
        billDate: billDate || getISTDate(),
        totalLitres,
        milkAmount,
        previousBalance,
        paymentsReceived,
        adjustments,
        finalPayable,
        deliveries: deliveries || [],
        notes,
        createdBy: req.user._id,
      });
    }

    await logAudit(
      `${req.user.name} (${req.user.phone || req.user.email})`,
      'BILL_SAVE',
      `Saved bill ${savedBill.billNumber} for ${customerName} of ₹${finalPayable}`
    );

    res.status(201).json({ success: true, data: savedBill });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get bills history
// @route   GET /api/billing
// @access  Private
exports.getBills = async (req, res) => {
  const { customerCode, startDate, endDate, status } = req.query;

  try {
    let query = {};
    if (customerCode) query.customerCode = parseInt(customerCode, 10);
    if (status) query.status = status;
    if (startDate || endDate) {
      query.billDate = {};
      if (startDate) query.billDate.$gte = startDate;
      if (endDate) query.billDate.$lte = endDate;
    }

    const bills = await CustomerBill.find(query).sort({ billDate: -1, createdAt: -1 });
    res.status(200).json({ success: true, count: bills.length, data: bills });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
