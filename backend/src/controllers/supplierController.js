const Supplier = require('../models/Supplier');
const MilkEntry = require('../models/MilkEntry');
const Payment = require('../models/Payment');
const logAudit = require('../utils/auditLogger');

const normalizeSupplier = (body) => ({
  supplierCode: Number(body.supplierCode),
  supplierName: typeof body.supplierName === 'string' ? body.supplierName.trim() : '',
  fatherName: typeof body.fatherName === 'string' ? body.fatherName.trim() : '',
  mobile: body.mobile == null ? '' : String(body.mobile).trim(),
  village: typeof body.village === 'string' ? body.village.trim() : '',
  status: body.status || 'active',
  joiningDate: body.joiningDate || undefined,
});

exports.addSupplier = async (req, res) => {
  try {
    const data = normalizeSupplier(req.body);
    if (!Number.isInteger(data.supplierCode) || data.supplierCode <= 0 || !data.supplierName || !data.village) {
      return res.status(400).json({ success: false, message: 'Valid supplier code, name and village are required' });
    }
    if (!['active', 'inactive'].includes(data.status)) return res.status(400).json({ success: false, message: 'Invalid supplier status' });
    if (await Supplier.exists({ supplierCode: data.supplierCode })) return res.status(400).json({ success: false, message: `Supplier Code #${data.supplierCode} is already registered` });

    const supplier = await Supplier.create(data);
    await logAudit(`${req.user.name} (${req.user.phone})`, 'SUPPLIER_ADD', `Supplier Code #${data.supplierCode}`, null, supplier);
    return res.status(201).json({ success: true, data: supplier });
  } catch (error) {
    console.error('Add supplier failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to add supplier' });
  }
};

exports.getSuppliers = async (req, res) => {
  const { search, village, status } = req.query;
  try {
    const query = {};
    if (status) query.status = status;
    if (village) query.village = new RegExp(village, 'i');
    if (search) {
      const trimmed = search.trim();
      query.$or = /^\d+$/.test(trimmed)
        ? [{ supplierCode: Number(trimmed) }]
        : [{ supplierName: new RegExp(trimmed, 'i') }, { village: new RegExp(trimmed, 'i') }];
    }
    const suppliers = await Supplier.find(query).sort({ supplierCode: 1 });
    return res.status(200).json({ success: true, count: suppliers.length, data: suppliers });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load suppliers' });
  }
};

exports.getSupplierById = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });
    return res.status(200).json({ success: true, data: supplier });
  } catch (error) {
    return res.status(400).json({ success: false, message: 'Invalid supplier id' });
  }
};

exports.getSupplierByCode = async (req, res) => {
  try {
    const code = Number(req.params.code);
    if (!Number.isInteger(code)) return res.status(400).json({ success: false, message: 'Invalid supplier code' });
    const supplier = await Supplier.findOne({ supplierCode: code });
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });
    return res.status(200).json({ success: true, data: supplier });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load supplier' });
  }
};

exports.updateSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });
    const oldValue = supplier.toObject();

    if (req.body.supplierCode !== undefined && Number(req.body.supplierCode) !== supplier.supplierCode) {
      const newCode = Number(req.body.supplierCode);
      if (!Number.isInteger(newCode) || newCode <= 0) return res.status(400).json({ success: false, message: 'Invalid supplier code' });
      if (await Supplier.exists({ supplierCode: newCode })) return res.status(400).json({ success: false, message: `Supplier Code #${newCode} is already registered` });
      const [milkHistory, paymentHistory] = await Promise.all([
        MilkEntry.exists({ supplierCode: supplier.supplierCode }),
        Payment.exists({ supplierCode: supplier.supplierCode }),
      ]);
      if (milkHistory || paymentHistory) return res.status(409).json({ success: false, message: 'Supplier code cannot be changed after milk/payment history exists. Edit the other supplier details instead.' });
      supplier.supplierCode = newCode;
    }

    if (req.body.supplierName !== undefined) {
      const name = String(req.body.supplierName).trim();
      if (!name) return res.status(400).json({ success: false, message: 'Supplier name is required' });
      supplier.supplierName = name;
    }
    if (req.body.village !== undefined) {
      const village = String(req.body.village).trim();
      if (!village) return res.status(400).json({ success: false, message: 'Village is required' });
      supplier.village = village;
    }
    if (req.body.fatherName !== undefined) supplier.fatherName = String(req.body.fatherName || '').trim();
    if (req.body.mobile !== undefined) supplier.mobile = String(req.body.mobile || '').trim();
    if (req.body.status !== undefined) {
      if (!['active', 'inactive'].includes(req.body.status)) return res.status(400).json({ success: false, message: 'Invalid supplier status' });
      supplier.status = req.body.status;
    }
    if (req.body.joiningDate !== undefined) supplier.joiningDate = req.body.joiningDate;

    const updatedSupplier = await supplier.save();
    await logAudit(`${req.user.name} (${req.user.phone})`, 'SUPPLIER_EDIT', `Supplier Code #${updatedSupplier.supplierCode}`, oldValue, updatedSupplier);
    return res.status(200).json({ success: true, data: updatedSupplier });
  } catch (error) {
    console.error('Update supplier failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to update supplier' });
  }
};

exports.deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });

    const [milkCount, paymentCount] = await Promise.all([
      MilkEntry.countDocuments({ supplierCode: supplier.supplierCode }),
      Payment.countDocuments({ supplierCode: supplier.supplierCode }),
    ]);
    if (milkCount > 0 || paymentCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete Supplier #${supplier.supplierCode}: ${milkCount} milk entries and ${paymentCount} payments are linked. Mark the supplier inactive to preserve financial history.`,
      });
    }

    const oldValue = supplier.toObject();
    await supplier.deleteOne();
    await logAudit(`${req.user.name} (${req.user.phone})`, 'SUPPLIER_DELETE', `Supplier Code #${supplier.supplierCode}`, oldValue, null);
    return res.status(200).json({ success: true, message: 'Supplier deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete supplier' });
  }
};

exports.bulkUploadSuppliers = async (req, res) => {
  const { suppliers } = req.body;
  try {
    if (!Array.isArray(suppliers) || suppliers.length === 0) return res.status(400).json({ success: false, message: 'Please provide a non-empty array of suppliers' });
    if (suppliers.length > 5000) return res.status(413).json({ success: false, message: 'Bulk upload is limited to 5000 suppliers per request' });

    const supplierCodes = suppliers.map((s) => Number(s.supplierCode)).filter(Number.isInteger);
    const existingSuppliers = await Supplier.find({ supplierCode: { $in: supplierCodes } }).select('supplierCode');
    const existingCodes = new Set(existingSuppliers.map((s) => s.supplierCode));
    const toInsert = [];
    const skipped = [];

    for (const raw of suppliers) {
      const s = normalizeSupplier(raw);
      if (!Number.isInteger(s.supplierCode) || s.supplierCode <= 0) { skipped.push({ supplier: raw, reason: 'Invalid or missing Supplier Code' }); continue; }
      if (existingCodes.has(s.supplierCode)) { skipped.push({ supplier: raw, reason: `Supplier Code #${s.supplierCode} already exists` }); continue; }
      if (!s.supplierName || !s.village) { skipped.push({ supplier: raw, reason: 'Missing required field (Name or Village)' }); continue; }
      toInsert.push(s);
      existingCodes.add(s.supplierCode);
    }

    if (toInsert.length) {
      await Supplier.insertMany(toInsert, { ordered: false });
      await logAudit(`${req.user.name} (${req.user.phone})`, 'SUPPLIER_BULK_ADD', `Bulk uploaded ${toInsert.length} suppliers`);
    }
    return res.status(200).json({ success: true, insertedCount: toInsert.length, skippedCount: skipped.length, skipped });
  } catch (error) {
    console.error('Bulk supplier upload failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to bulk upload suppliers' });
  }
};
