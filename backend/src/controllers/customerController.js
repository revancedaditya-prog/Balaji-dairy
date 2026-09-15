const Customer = require('../models/Customer');
const CustomerDelivery = require('../models/CustomerDelivery');
const CustomerPayment = require('../models/CustomerPayment');
const logAudit = require('../utils/auditLogger');

// @desc    Get all customers with filters
// @route   GET /api/customers
// @access  Private
exports.getCustomers = async (req, res) => {
  const { search, customerType, village, status } = req.query;

  try {
    let query = {};

    if (status) {
      query.status = status;
    }

    if (customerType) {
      query.customerType = customerType;
    }

    if (village) {
      query.village = new RegExp(village, 'i');
    }

    if (search) {
      const searchNum = parseInt(search, 10);
      if (!isNaN(searchNum)) {
        query.$or = [
          { customerCode: searchNum },
          { mobile: new RegExp(search, 'i') },
          { customerName: new RegExp(search, 'i') },
        ];
      } else {
        query.$or = [
          { customerName: new RegExp(search, 'i') },
          { mobile: new RegExp(search, 'i') },
          { village: new RegExp(search, 'i') },
          { address: new RegExp(search, 'i') },
        ];
      }
    }

    const customers = await Customer.find(query).sort({ customerCode: 1 });
    res.status(200).json({ success: true, count: customers.length, data: customers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single customer by ID
// @route   GET /api/customers/:id
// @access  Private
exports.getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get next auto-generated customer code
// @route   GET /api/customers/next-code
// @access  Private
exports.getNextCustomerCode = async (req, res) => {
  try {
    const lastCustomer = await Customer.findOne().sort({ customerCode: -1 });
    const nextCode = lastCustomer && lastCustomer.customerCode ? lastCustomer.customerCode + 1 : 1;
    res.status(200).json({ success: true, nextCode });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new customer
// @route   POST /api/customers
// @access  Private
exports.createCustomer = async (req, res) => {
  const {
    customerCode,
    customerName,
    mobile,
    address,
    village,
    customerType,
    milkType,
    morningDefaultQty,
    eveningDefaultQty,
    defaultRate,
    billingCycle,
    openingBalance,
    notes,
  } = req.body;

  try {
    if (!customerName) {
      return res.status(400).json({ success: false, message: 'Customer name is required' });
    }

    let code = customerCode;
    if (!code) {
      const lastCust = await Customer.findOne().sort({ customerCode: -1 });
      code = lastCust && lastCust.customerCode ? lastCust.customerCode + 1 : 1;
    }

    const existing = await Customer.findOne({ customerCode: code });
    if (existing) {
      return res.status(400).json({ success: false, message: `Customer Code #${code} already exists` });
    }

    const customer = await Customer.create({
      customerCode: code,
      customerName,
      mobile,
      address,
      village,
      customerType: customerType || 'Household',
      milkType: milkType || 'Mixed',
      morningDefaultQty: Number(morningDefaultQty) || 0,
      eveningDefaultQty: Number(eveningDefaultQty) || 0,
      defaultRate: Number(defaultRate) || 0,
      billingCycle: billingCycle || 'Monthly',
      openingBalance: Number(openingBalance) || 0,
      notes,
    });

    await logAudit(
      `${req.user.name} (${req.user.phone || req.user.email})`,
      'CUSTOMER_CREATE',
      `Customer created: ${customer.customerName} (Code #${customer.customerCode})`,
      null,
      customer
    );

    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private
exports.updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const oldData = customer.toObject();
    const updated = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    await logAudit(
      `${req.user.name} (${req.user.phone || req.user.email})`,
      'CUSTOMER_UPDATE',
      `Customer updated: ${updated.customerName} (Code #${updated.customerCode})`,
      oldData,
      updated
    );

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Private (Owner/Manager only)
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Check if customer has deliveries
    const hasDeliveries = await CustomerDelivery.exists({ customerCode: customer.customerCode });
    if (hasDeliveries) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete customer with historical deliveries. You can mark them inactive instead.',
      });
    }

    await Customer.findByIdAndDelete(req.params.id);

    await logAudit(
      `${req.user.name} (${req.user.phone || req.user.email})`,
      'CUSTOMER_DELETE',
      `Customer deleted: ${customer.customerName} (Code #${customer.customerCode})`,
      customer,
      null
    );

    res.status(200).json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
