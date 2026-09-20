const Supplier = require('../models/Supplier');
const MilkEntry = require('../models/MilkEntry');
const Payment = require('../models/Payment');
const logAudit = require('../utils/auditLogger');
const {
  isIsoDate,
  normalizePhone,
  safeRegex,
  toPositiveInteger,
} = require('../utils/validation');
const { sendControllerError } = require('../utils/http');

const SUPPLIER_STATUSES = ['active', 'inactive'];
const parseOptionalPhone = (value) => {
  if (value === undefined || value === null || String(value).trim() === '') return '';
  return normalizePhone(value);
};

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
    const parsedSupplierCode = toPositiveInteger(supplierCode);
    if (!parsedSupplierCode || !supplierName?.trim() || !village?.trim()) {
      return res.status(400).json({ success: false, message: 'Valid supplier code, name and village are required' });
    }
    if (status !== undefined && !SUPPLIER_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be active or inactive' });
    }
    if (joiningDate && !isIsoDate(joiningDate)) {
      return res.status(400).json({ success: false, message: 'Joining date must be a valid YYYY-MM-DD date' });
    }
    const normalizedMobile = parseOptionalPhone(mobile);
    if (normalizedMobile === null) {
      return res.status(400).json({ success: false, message: 'Mobile number must contain 7 to 15 digits' });
    }

    // Check if supplierCode already exists
    const existing = await Supplier.findOne({ supplierCode: parsedSupplierCode });
    if (existing) {
      return res.status(400).json({ success: false, message: `Supplier Code #${supplierCode} is already registered` });
    }

    const supplier = await Supplier.create({
      supplierCode: parsedSupplierCode,
      supplierName: supplierName.trim(),
      fatherName: fatherName ? String(fatherName).trim() : '',
      mobile: normalizedMobile,
      village: village.trim(),
      status,
      joiningDate: joiningDate ? new Date(`${joiningDate}T00:00:00.000Z`) : new Date(),
    });

    await logAudit(
      `${req.user.name} (${req.user.phone})`,
      'SUPPLIER_ADD',
      `Supplier Code #${parsedSupplierCode}`,
      null,
      supplier
    );

    res.status(201).json({ success: true, data: supplier });
  } catch (error) {
    sendControllerError(res, error);
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
      if (!SUPPLIER_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, message: 'Status must be active or inactive' });
      }
      query.status = status;
    }

    // Filter by village if provided
    if (village) {
      query.village = safeRegex(village);
    }

    // Search query matching supplierCode or supplierName or village
    if (search) {
      const searchNum = toPositiveInteger(search);
      if (searchNum) {
        query.$or = [{ supplierCode: searchNum }];
      } else {
        query.$or = [
          { supplierName: safeRegex(search) },
          { village: safeRegex(search) },
        ];
      }
    }

    const suppliers = await Supplier.find(query).sort({ supplierCode: 1 });
    res.status(200).json({ success: true, count: suppliers.length, data: suppliers });
  } catch (error) {
    sendControllerError(res, error);
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
    sendControllerError(res, error);
  }
};

// @desc    Get supplier details by supplierCode
// @route   GET /api/suppliers/code/:code
// @access  Private
exports.getSupplierByCode = async (req, res) => {
  try {
    const supplierCode = toPositiveInteger(req.params.code);
    if (!supplierCode) {
      return res.status(400).json({ success: false, message: 'Supplier code must be a positive integer' });
    }
    const supplier = await Supplier.findOne({ supplierCode });
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    res.status(200).json({ success: true, data: supplier });
  } catch (error) {
    sendControllerError(res, error);
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

    // Normalize the numeric code before comparing it with the stored number.
    if (req.body.supplierCode !== undefined) {
      const parsedSupplierCode = toPositiveInteger(req.body.supplierCode);
      if (!parsedSupplierCode) {
        return res.status(400).json({ success: false, message: 'Supplier code must be a positive integer' });
      }

      const existing = await Supplier.findOne({
        supplierCode: parsedSupplierCode,
        _id: { $ne: supplier._id },
      });
      if (existing) {
        return res.status(400).json({ success: false, message: `Supplier Code #${parsedSupplierCode} is already registered` });
      }

      if (parsedSupplierCode !== supplier.supplierCode) {
        const [hasMilkEntries, hasPayments] = await Promise.all([
          MilkEntry.exists({ supplierCode: supplier.supplierCode }),
          Payment.exists({ supplierCode: supplier.supplierCode }),
        ]);
        if (hasMilkEntries || hasPayments) {
          return res.status(409).json({
            success: false,
            message: 'Supplier code cannot be changed after financial entries exist. Update the name or status instead.',
          });
        }
      }
      req.body.supplierCode = parsedSupplierCode;
    }

    const allowedUpdates = ['supplierCode', 'supplierName', 'fatherName', 'mobile', 'village', 'status', 'joiningDate'];
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => allowedUpdates.includes(key))
    );
    if (updates.supplierName !== undefined) {
      updates.supplierName = String(updates.supplierName).trim();
      if (!updates.supplierName) return res.status(400).json({ success: false, message: 'Supplier name cannot be empty' });
    }
    if (updates.village !== undefined) {
      updates.village = String(updates.village).trim();
      if (!updates.village) return res.status(400).json({ success: false, message: 'Village cannot be empty' });
    }
    if (updates.fatherName !== undefined) updates.fatherName = String(updates.fatherName).trim();
    if (updates.mobile !== undefined) {
      updates.mobile = parseOptionalPhone(updates.mobile);
      if (updates.mobile === null) {
        return res.status(400).json({ success: false, message: 'Mobile number must contain 7 to 15 digits' });
      }
    }
    if (updates.status !== undefined && !SUPPLIER_STATUSES.includes(updates.status)) {
      return res.status(400).json({ success: false, message: 'Status must be active or inactive' });
    }
    if (updates.joiningDate !== undefined) {
      if (!isIsoDate(updates.joiningDate)) {
        return res.status(400).json({ success: false, message: 'Joining date must be a valid YYYY-MM-DD date' });
      }
      updates.joiningDate = new Date(`${updates.joiningDate}T00:00:00.000Z`);
    }

    const updatedSupplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      updates,
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
    sendControllerError(res, error);
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

    const [hasMilkEntries, hasPayments] = await Promise.all([
      MilkEntry.exists({ supplierCode: supplier.supplierCode }),
      Payment.exists({ supplierCode: supplier.supplierCode }),
    ]);
    if (hasMilkEntries || hasPayments) {
      return res.status(409).json({
        success: false,
        message: 'Supplier has financial history and cannot be deleted. Mark the supplier inactive instead.',
      });
    }

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
    sendControllerError(res, error);
  }
};

// @desc    Bulk upload suppliers
// @route   POST /api/suppliers/bulk
// @access  Private
exports.bulkUploadSuppliers = async (req, res) => {
  const { suppliers } = req.body;

  try {
    if (!Array.isArray(suppliers) || suppliers.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide a valid array of suppliers' });
    }
    if (suppliers.length > 500) {
      return res.status(413).json({ success: false, message: 'A maximum of 500 suppliers can be uploaded at once' });
    }

    const supplierCodes = suppliers.map((s) => toPositiveInteger(s.supplierCode)).filter(Boolean);
    
    // Check for existing supplier codes in DB
    const existingSuppliers = await Supplier.find({ supplierCode: { $in: supplierCodes } });
    const existingCodes = new Set(existingSuppliers.map((s) => s.supplierCode));

    const toInsert = [];
    const skipped = [];

    for (const s of suppliers) {
      const code = toPositiveInteger(s.supplierCode);
      if (!code) {
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
      if (s.status && !SUPPLIER_STATUSES.includes(s.status)) {
        skipped.push({ supplier: s, reason: 'Status must be active or inactive' });
        continue;
      }
      if (s.joiningDate && !isIsoDate(s.joiningDate)) {
        skipped.push({ supplier: s, reason: 'Joining Date must use a valid YYYY-MM-DD date' });
        continue;
      }
      const normalizedMobile = parseOptionalPhone(s.mobile);
      if (normalizedMobile === null) {
        skipped.push({ supplier: s, reason: 'Mobile number must contain 7 to 15 digits' });
        continue;
      }

      toInsert.push({
        supplierCode: code,
        supplierName: s.supplierName.trim(),
        fatherName: s.fatherName ? s.fatherName.trim() : '',
        mobile: normalizedMobile,
        village: s.village.trim(),
        status: s.status === 'inactive' ? 'inactive' : 'active',
        joiningDate: s.joiningDate ? new Date(`${s.joiningDate}T00:00:00.000Z`) : new Date(),
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
    sendControllerError(res, error);
  }
};
