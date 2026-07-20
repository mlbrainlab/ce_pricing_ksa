import ExcelJS from 'exceljs';
import { DealConfiguration, CalculationOutput, ChannelType, DealType } from '../types.js';
import { AVAILABLE_PRODUCTS } from '../constants.js';

export async function generateQuoteExcel(config: DealConfiguration, data: CalculationOutput, options: any) {
  const { customerName = "N/A", repName = "Representative" } = options || {};
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Pricing Quote');

  const isIndirect = config.channel !== ChannelType.DIRECT;
  const currency = isIndirect ? 'SAR' : 'USD';
  const currencyFmt = isIndirect ? '"SAR "#,##0' : '"$"#,##0.00';

  // Styles
  const fontStyle = { name: 'Aptos Display', size: 11 };
  const headerStyle: Partial<ExcelJS.Style> = {
    font: { ...fontStyle, bold: true, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF007AC3' } },
    alignment: { horizontal: 'center', vertical: 'middle' }
  };
  const boldStyle = { font: { ...fontStyle, bold: true } };

  // --- 1. Deal Context ---
  sheet.addRow(['DEAL CONTEXT']).font = { ...fontStyle, bold: true, size: 14 };
  sheet.addRow(['Customer Name', customerName]).font = fontStyle;
  sheet.addRow(['Rep Name', repName]).font = fontStyle;
  sheet.addRow(['Deal Type', config.dealType]).font = fontStyle;
  sheet.addRow(['Channel', config.channel]).font = fontStyle;
  
  if (config.dealType === DealType.EXTENSION) {
    sheet.addRow(['Extension Option', `Option ${config.extensionOption}`]).font = fontStyle;
    if (config.extensionPercentage) {
      sheet.addRow(['Extension %', `${config.extensionPercentage}%`]).font = fontStyle;
    }
  } else {
    sheet.addRow(['Duration', `${config.years} Years`]).font = fontStyle;
  }
  
  if (config.useStartDate && config.startMonthYear) {
    sheet.addRow(['Start Date', config.startMonthYear]).font = fontStyle;
  }

  sheet.addRow([]);

  // --- 2. Product Inputs ---
  sheet.addRow(['PRODUCT INPUTS']).font = { ...fontStyle, bold: true, size: 14 };
  const inputHeaders = ['Product', 'Variant', 'Stats (HC/BC)', 'Expiring Amount', 'Uplift applied'];
  const inputHeaderRow = sheet.addRow(inputHeaders);
  inputHeaderRow.eachCell(cell => cell.style = headerStyle);

  config.selectedProducts.forEach(pid => {
    const p = AVAILABLE_PRODUCTS.find(x => x.id === pid);
    const inp = config.productInputs[pid];
    if (!inp) return;
    const addedRow = sheet.addRow([
      p?.name || pid,
      inp.variant || 'N/A',
      inp.count || 0,
      inp.expiringAmount || 0,
      ((config.renewalUpliftRates && config.renewalUpliftRates[pid]) || 0) + '%'
    ]);
    addedRow.font = fontStyle;
    addedRow.getCell(4).numFmt = currencyFmt;
  });

  sheet.addRow([]);

  // --- 3. Commercial Schedule ---
  sheet.addRow(['COMMERCIAL SCHEDULE']).font = { ...fontStyle, bold: true, size: 14 };
  const scheduleHeaders = ['Year'];
  config.selectedProducts.forEach(pid => {
    const p = AVAILABLE_PRODUCTS.find(x => x.id === pid);
    scheduleHeaders.push(`${p?.shortName || p?.name} (${currency})`);
  });
  scheduleHeaders.push(`Total (${currency})`);
  
  const scheduleHeaderRow = sheet.addRow(scheduleHeaders);
  scheduleHeaderRow.eachCell(cell => cell.style = headerStyle);

  data.yearlyResults.forEach(r => {
    const rowData: any[] = [`Year ${r.year}`];
    let rowTotal = 0;
    
    config.selectedProducts.forEach(pid => {
      const bd = r.breakdown.find(x => x.id === pid);
      const val = isIndirect ? (bd?.grossSAR || 0) : (bd?.gross || 0);
      rowData.push(val);
      rowTotal += val;
    });
    
    rowData.push(isIndirect ? r.grossSAR : r.grossUSD);
    const row = sheet.addRow(rowData);
    row.font = fontStyle;
    for (let i = 2; i <= rowData.length; i++) {
        row.getCell(i).numFmt = currencyFmt;
    }
  });

  // Footer / Totals
  sheet.addRow([]);
  const tcvRow = sheet.addRow(['', 'Total Contract Value (TCV)', isIndirect ? data.totalGrossSAR : data.totalGrossUSD]);
  tcvRow.font = boldStyle.font;
  tcvRow.getCell(3).numFmt = currencyFmt;

  if (isIndirect) {
    const vatRow = sheet.addRow(['', 'VAT (15%)', data.totalVatSAR]);
    vatRow.font = fontStyle;
    vatRow.getCell(3).numFmt = currencyFmt;

    const grandRow = sheet.addRow(['', 'Grand Total (incl. VAT)', data.totalGrandTotalSAR]);
    grandRow.font = boldStyle.font;
    grandRow.getCell(3).numFmt = currencyFmt;
  }

  // Set columns width
  sheet.getColumn(1).width = 25;
  sheet.getColumn(2).width = 25;
  sheet.getColumn(3).width = 20;
  sheet.getColumn(4).width = 20;

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
