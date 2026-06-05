const Supplier = require('../models/Supplier');
const logAudit = require('../utils/auditLogger');

// @desc    Add a new supplier
// @route   POST /api/suppliers
// @access  Private
exports.addSupplier = async (req, res) => {
  const {
    supplierCode,
    supplierName,
    fatherName,
    mobile,
    village,
    status,
    joiningDate,
  } = req.body;

  try {
    // Check if supplierCode already exists
    const existing = await Supplier.findOne({ supplierCode });
    if (existing) {
      return res.status(400).json({ success: false, message: `Supplier Code #${supplierCode} is already registered` });
    }

    const supplier = await Supplier.create({
      supplierCode,
      supplierName,
      fatherName,
      mobile,
      village,
      status,
      joiningDate: joiningDate || new Date(),
    });

    await logAudit(
      `${req.user.name} (${req.user.phone})`,
      'SUPPLIER_ADD',
      `Supplier Code #${supplierCode}`,
      null,
      supplier
    );

    res.status(201).json({ success: true, data: supplier });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all suppliers with filters & search
// @route   GET /api/suppliers
// @access  Private
exports.getSuppliers = async (req, res) => {
  const { search, village, status } = req.query;

  try {
    let query = {};

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    // Filter by village if provided
    if (village) {
      query.village = new RegExp(village, 'i');
    }

    // Search query matching supplierCode or supplierName or village
    if (search) {
      const searchNum = parseInt(search);
      if (!isNaN(searchNum)) {
        query.$or = [{ supplierCode: searchNum }];
      } else {
        query.$or = [
          { supplierName: new RegExp(search, 'i') },
          { village: new RegExp(search, 'i') },
        ];
      }
    }

    const suppliers = await Supplier.find(query).sort({ supplierCode: 1 });
    res.status(200).json({ success: true, count: suppliers.length, data: suppliers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single supplier details
// @route   GET /api/suppliers/:id
// @access  Private
exports.getSupplierById = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    res.status(200).json({ success: true, data: supplier });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get supplier details by supplierCode
// @route   GET /api/suppliers/code/:code
// @access  Private
exports.getSupplierByCode = async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ supplierCode: req.params.code });
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    res.status(200).json({ success: true, data: supplier });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update supplier details
// @route   PUT /api/suppliers/:id
// @access  Private
exports.updateSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    // Capture old value for audit trail
    const oldValue = supplier.toObject();

    // Check if supplierCode is updated and already exists
    if (req.body.supplierCode && req.body.supplierCode !== supplier.supplierCode) {
      const existing = await Supplier.findOne({ supplierCode: req.body.supplierCode });
      if (existing) {
        return res.status(400).json({ success: false, message: `Supplier Code #${req.body.supplierCode} is already registered` });
      }
    }

    const updatedSupplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    await logAudit(
      `${req.user.name} (${req.user.phone})`,
      'SUPPLIER_EDIT',
      `Supplier Code #${updatedSupplier.supplierCode}`,
      oldValue,
      updatedSupplier
    );

    res.status(200).json({ success: true, data: updatedSupplier });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete supplier
// @route   DELETE /api/suppliers/:id
// @access  Private
exports.deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const oldValue = supplier.toObject();

    await supplier.deleteOne();

    await logAudit(
      `${req.user.name} (${req.user.phone})`,
      'SUPPLIER_DELETE',
      `Supplier Code #${supplier.supplierCode}`,
      oldValue,
      null
    );

    res.status(200).json({ success: true, message: 'Supplier deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk upload suppliers
// @route   POST /api/suppliers/bulk
// @access  Private
exports.bulkUploadSuppliers = async (req, res) => {
  const { suppliers } = req.body;

  try {
    if (!suppliers || !Array.isArray(suppliers)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid array of suppliers' });
    }

    const supplierCodes = suppliers.map((s) => parseInt(s.supplierCode, 10)).filter((code) => !isNaN(code));
    
    // Check for existing supplier codes in DB
    const existingSuppliers = await Supplier.find({ supplierCode: { $in: supplierCodes } });
    const existingCodes = new Set(existingSuppliers.map((s) => s.supplierCode));

    const toInsert = [];
    const skipped = [];

    for (const s of suppliers) {
      const code = parseInt(s.supplierCode, 10);
      if (isNaN(code)) {
        skipped.push({ supplier: s, reason: 'Invalid or missing Supplier Code' });
        continue;
      }
      if (existingCodes.has(code)) {
        skipped.push({ supplier: s, reason: `Supplier Code #${code} already exists` });
        continue;
      }
      if (!s.supplierName || !s.village) {
        skipped.push({ supplier: s, reason: 'Missing required field (Name or Village)' });
        continue;
      }

      toInsert.push({
        supplierCode: code,
        supplierName: s.supplierName.trim(),
        fatherName: s.fatherName ? s.fatherName.trim() : '',
        mobile: s.mobile ? s.mobile.toString().trim() : '',
        village: s.village.trim(),
        status: s.status === 'inactive' ? 'inactive' : 'active',
        joiningDate: s.joiningDate && !isNaN(Date.parse(s.joiningDate)) ? new Date(s.joiningDate) : new Date(),
      });

      // Avoid inserting duplicates that are in the same payload
      existingCodes.add(code);
    }

    if (toInsert.length > 0) {
      await Supplier.insertMany(toInsert);
      await logAudit(
        `${req.user.name} (${req.user.phone})`,
        'SUPPLIER_BULK_ADD',
        `Bulk uploaded ${toInsert.length} suppliers`
      );
    }

    res.status(200).json({
      success: true,
      insertedCount: toInsert.length,
      skippedCount: skipped.length,
      skipped,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
