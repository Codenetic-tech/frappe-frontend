import * as XLSX from 'xlsx';

/**
 * Exports JSON data to an Excel file.
 * @param data The array of objects to export.
 * @param fileName The desired name of the Excel file (without extension).
 * @param sheetName The name of the worksheet.
 */
export const exportToExcel = (data: any[], fileName: string = 'Export', sheetName: string = 'Data') => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Create a worksheet
  const ws = XLSX.utils.json_to_sheet(data);

  // Create a workbook and add the worksheet
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Generate Excel file and trigger download
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};
