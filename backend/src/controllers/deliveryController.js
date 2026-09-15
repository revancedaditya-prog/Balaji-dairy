const CustomerDelivery = require('../models/CustomerDelivery');
const Customer = require('../models/Customer');
const logAudit = require('../utils/auditLogger');

// Helper for Indian Standard Date
const getISTDate = () => {
  const dateObj = new Date();
  const offset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(dateObj.getTime() + offset);
  return istDate.toISOString().split('T')[0];
};

// @desc    Get deliveries with filters
// @route   GET /api/deliveries
// @access  Private
exports.getDeliveries = async (req, res) => {
  const { date, startDate, endDate, shift, customerCode, status, limit } = req.query;

  try {
    let query = {};

    if (date) {
      query.date = date;
    } else if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    if (shift) {
      query.shift = shift;
    }

    if (customerCode) {
      query.customerCode = parseInt(customerCode, 10);
    }

    if (status) {
      query.status = status;
    }

    let q = CustomerDelivery.find(query).sort({ date: -1, shift: 1, customerCode: 1 });
    if (limit) {
      q = q.limit(parseInt(limit, 10));
    }

    const deliveries = await q;
    res.status(200).json({ success: true, count: deliveries.length, data: deliveries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get daily route sheet for a specific date and shift
// @route   GET /api/deliveries/route-sheet
// @access  Private
exports.getDailyRouteSheet = async (req, res) => {
  const date = req.query.date || getISTDate();
  const shift = req.query.shift || (new Date().getHours() >= 4 && new Date().getHours() < 14 ? 'Morning' : 'Evening');

  try {
    // 1. Get all active customers
    const customers = await Customer.find({ status: 'active' }).sort({ customerCode: 1 });

    // 2. Get existing deliveries for this date and shift
    const existingDeliveries = await CustomerDelivery.find({ date, shift });
    const deliveryMap = {};
    existingDeliveries.forEach((d) => {
      deliveryMap[d.customerCode] = d;
    });

    // 3. Build route sheet items
    const routeItems = customers.map((c) => {
      const defaultQty = shift === 'Morning' ? c.morningDefaultQty : c.eveningDefaultQty;
      const existing = deliveryMap[c.customerCode];

      if (existing) {
        return {
          deliveryId: existing._id,
          customerCode: c.customerCode,
          customerName: c.customerName,
          mobile: c.mobile,
          village: c.village,
          customerType: c.customerType,
          milkType: existing.milkType || c.milkType,
          defaultQty,
          quantity: existing.quantity,
          rate: existing.rate,
          amount: existing.amount,
          status: existing.status,
          remarks: existing.remarks,
          isSaved: true,
        };
      } else {
        const rate = c.defaultRate || 0;
        const qty = defaultQty || 0;
        const amount = Math.round(qty * rate * 100) / 100;

        return {
          deliveryId: null,
          customerCode: c.customerCode,
          customerName: c.customerName,
          mobile: c.mobile,
          village: c.village,
          customerType: c.customerType,
          milkType: c.milkType,
          defaultQty,
          quantity: qty,
          rate,
          amount,
          status: qty > 0 ? 'Delivered' : 'Skipped',
          remarks: '',
          isSaved: false,
        };
      }
    });

    // Calculate totals
    const totalCustomers = routeItems.length;
    const deliveredCount = routeItems.filter((i) => i.status === 'Delivered').length;
    const totalMilk = Math.round(routeItems.reduce((sum, i) => sum + (i.status === 'Delivered' || i.status === 'Changed Qty' ? Number(i.quantity) : 0), 0) * 100) / 100;
    const totalAmount = Math.round(routeItems.reduce((sum, i) => sum + (i.status === 'Delivered' || i.status === 'Changed Qty' ? Number(i.amount) : 0), 0) * 100) / 100;

    res.status(200).json({
      success: true,
      date,
      shift,
      summary: {
        totalCustomers,
        deliveredCount,
        totalMilk,
        totalAmount,
      },
      data: routeItems,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk save / record daily route deliveries
// @route   POST /api/deliveries/bulk
// @access  Private
exports.bulkRecordDeliveries = async (req, res) => {
  const { date, shift, deliveries } = req.body;

  try {
    if (!date || !shift || !Array.isArray(deliveries)) {
      return res.status(400).json({ success: false, message: 'Invalid delivery payload' });
    }

    const savedRecords = [];

    for (const item of deliveries) {
      const { customerCode, customerName, milkType, quantity, rate, amount, status, remarks } = item;

      // Upsert delivery for this customer + date + shift
      const saved = await CustomerDelivery.findOneAndUpdate(
        { customerCode, date, shift },
        {
          customerName,
          milkType: milkType || 'Mixed',
          quantity: Number(quantity) || 0,
          rate: Number(rate) || 0,
          amount: Number(amount) || 0,
          status: status || 'Delivered',
          remarks: remarks || '',
          createdBy: req.user._id,
        },
        { upsert: true, new: true, runValidators: true }
      );
      savedRecords.push(saved);
    }

    await logAudit(
      `${req.user.name} (${req.user.phone || req.user.email})`,
      'BULK_DELIVERY_SAVE',
      `Saved ${savedRecords.length} route deliveries for ${date} (${shift} Shift)`
    );

    res.status(200).json({ success: true, count: savedRecords.length, data: savedRecords });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Record single delivery
// @route   POST /api/deliveries
// @access  Private
exports.recordDelivery = async (req, res) => {
  const { customerCode, date, shift, quantity, rate, amount, milkType, status, remarks } = req.body;

  try {
    if (!customerCode || !quantity) {
      return res.status(400).json({ success: false, message: 'Customer code and quantity are required' });
    }

    const customer = await Customer.findOne({ customerCode });
    if (!customer) {
      return res.status(404).json({ success: false, message: `Customer #${customerCode} not found` });
    }

    const delDate = date || getISTDate();
    const delShift = shift || (new Date().getHours() >= 4 && new Date().getHours() < 14 ? 'Morning' : 'Evening');
    const delRate = rate !== undefined ? Number(rate) : (customer.defaultRate || 0);
    const delAmount = amount !== undefined ? Number(amount) : Math.round(Number(quantity) * delRate * 100) / 100;

    const delivery = await CustomerDelivery.create({
      customerCode,
      customerName: customer.customerName,
      date: delDate,
      shift: delShift,
      quantity: Number(quantity),
      rate: delRate,
      amount: delAmount,
      milkType: milkType || customer.milkType || 'Mixed',
      status: status || 'Delivered',
      remarks: remarks || '',
      createdBy: req.user._id,
    });

    await logAudit(
      `${req.user.name} (${req.user.phone || req.user.email})`,
      'DELIVERY_RECORD',
      `Recorded delivery for ${customer.customerName} (${quantity}L @ ₹${delRate})`
    );

    res.status(201).json({ success: true, data: delivery });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update delivery
// @route   PUT /api/deliveries/:id
// @access  Private
exports.updateDelivery = async (req, res) => {
  try {
    const delivery = await CustomerDelivery.findById(req.params.id);
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery record not found' });
    }

    const oldData = delivery.toObject();
    const updated = await CustomerDelivery.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    await logAudit(
      `${req.user.name} (${req.user.phone || req.user.email})`,
      'DELIVERY_UPDATE',
      `Updated delivery #${updated._id} for customer #${updated.customerCode}`,
      oldData,
      updated
    );

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete delivery
// @route   DELETE /api/deliveries/:id
// @access  Private (Owner/Manager only)
exports.deleteDelivery = async (req, res) => {
  try {
    const delivery = await CustomerDelivery.findById(req.params.id);
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery record not found' });
    }

    await CustomerDelivery.findByIdAndDelete(req.params.id);

    await logAudit(
      `${req.user.name} (${req.user.phone || req.user.email})`,
      'DELIVERY_DELETE',
      `Deleted delivery #${delivery._id} for customer #${delivery.customerCode} (${delivery.quantity}L)`
    );

    res.status(200).json({ success: true, message: 'Delivery deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
