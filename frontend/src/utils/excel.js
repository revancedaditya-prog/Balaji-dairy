const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

const loadExcel = async () => {
  const module = await import('exceljs');
  return module.default || module;
};

const downloadBuffer = (buffer, filename) => {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const plainCellValue = (value) => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value !== 'object') return value;
  if ('result' in value) return value.result ?? '';
  if ('text' in value) return value.text ?? '';
  if (Array.isArray(value.richText)) return value.richText.map((part) => part.text).join('');
  return String(value);
};

export const exportRowsToExcel = async (rows, sheetName, filename) => {
  const ExcelJS = await loadExcel();
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName.slice(0, 31));
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  if (headers.length > 0) {
    worksheet.columns = headers.map((header) => ({
      header,
      key: header,
      width: Math.min(40, Math.max(12, header.length + 2)),
    }));
    worksheet.addRows(rows);
    worksheet.getRow(1).font = { bold: true };
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  }

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBuffer(buffer, filename);
};

export const readFirstWorksheet = async (file) => {
  if (!file || file.size > MAX_IMPORT_BYTES) {
    throw new Error('Excel file must be 5 MB or smaller');
  }

  const ExcelJS = await loadExcel();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount < 2) return [];

  const headers = [];
  worksheet.getRow(1).eachCell((cell, columnNumber) => {
    headers[columnNumber] = String(plainCellValue(cell.value)).trim();
  });

  const rows = [];
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const item = {};
    let hasValue = false;
    headers.forEach((header, columnNumber) => {
      if (!header) return;
      const value = plainCellValue(row.getCell(columnNumber).value);
      item[header] = value;
      if (value !== '') hasValue = true;
    });
    if (hasValue) rows.push(item);
  }

  return rows;
};
