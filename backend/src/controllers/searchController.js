const Supplier = require('../models/Supplier');
const Customer = require('../models/Customer');
const MilkEntry = require('../models/MilkEntry');
const CustomerDelivery = require('../models/CustomerDelivery');

// @desc    Global entity search
// @route   GET /api/search
// @access  Private
exports.globalSearch = async (req, res) => {
  const { q } = req.query;

  try {
    if (!q || q.trim().length === 0) {
      return res.status(200).json({
        success: true,
        data: { suppliers: [], customers: [], milkEntries: [], deliveries: [] },
      });
    }

    const queryStr = q.trim();
    const queryNum = parseInt(queryStr, 10);

    let supQuery = {};
    let custQuery = {};

    if (!isNaN(queryNum)) {
      supQuery.$or = [{ supplierCode: queryNum }, { mobile: new RegExp(queryStr, 'i') }, { supplierName: new RegExp(queryStr, 'i') }];
      custQuery.$or = [{ customerCode: queryNum }, { mobile: new RegExp(queryStr, 'i') }, { customerName: new RegExp(queryStr, 'i') }];
    } else {
      supQuery.$or = [
        { supplierName: new RegExp(queryStr, 'i') },
        { village: new RegExp(queryStr, 'i') },
        { mobile: new RegExp(queryStr, 'i') },
      ];
      custQuery.$or = [
        { customerName: new RegExp(queryStr, 'i') },
        { village: new RegExp(queryStr, 'i') },
        { address: new RegExp(queryStr, 'i') },
        { mobile: new RegExp(queryStr, 'i') },
      ];
    }

    const [suppliers, customers] = await Promise.all([
      Supplier.find(supQuery).limit(5),
      Customer.find(custQuery).limit(5),
    ]);

    res.status(200).json({
      success: true,
      data: {
        suppliers,
        customers,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
