const numeric = (value) => value === '' || value === null || value === undefined ? 0 : Number(value);

const editableFields = ['fat', 'snf', 'milkQuantity', 'amount'];

export const calculateRate = (milkQuantity, amount) => {
  if (String(milkQuantity ?? '').trim() === '' || String(amount ?? '').trim() === '') return null;
  const quantity = Number(milkQuantity);
  const total = Number(amount);
  if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(total) || total < 0) return null;
  return total / quantity;
};

export const hasMilkEntryInput = (row) =>
  editableFields.some((field) => String(row[field] ?? '').trim() !== '');

export const isMilkEntryDirty = (row) => {
  if (!row.original) return hasMilkEntryInput(row);
  return editableFields.some((field) => numeric(row[field]) !== numeric(row.original[field]));
};

export const validateMilkEntryRow = (row) => {
  if (String(row.milkQuantity ?? '').trim() === '') return 'Milk quantity is required';
  const quantity = Number(row.milkQuantity);
  if (!Number.isFinite(quantity) || quantity <= 0) return 'Milk quantity must be greater than zero';
  if (String(row.amount ?? '').trim() === '') return 'Amount is required';
  const amount = Number(row.amount);
  if (!Number.isFinite(amount) || amount < 0) return 'Amount must be zero or more';
  for (const field of ['fat', 'snf']) {
    if (String(row[field] ?? '').trim() === '') continue;
    const value = Number(row[field]);
    if (!Number.isFinite(value) || value < 0) return field === 'fat' ? 'FAT must be zero or more' : 'SNF must be zero or more';
  }
  return '';
};

export const csvEscape = (value) => {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
