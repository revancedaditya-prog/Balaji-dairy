const express = require('express');
const router = express.Router();
const {
  addEntry,
  getEntries,
  getEntryById,
  updateEntry,
  deleteEntry,
} = require('../controllers/milkEntryController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect); // Guard all routes

router.route('/')
  .post(addEntry)
  .get(getEntries);

router.route('/:id')
  .get(getEntryById)
  .put(authorize('owner', 'manager'), updateEntry)
  .delete(authorize('owner', 'manager'), deleteEntry);

module.exports = router;
