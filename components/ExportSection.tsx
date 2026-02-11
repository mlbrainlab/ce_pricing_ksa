import React, { useState } from 'react';
import { CalculationOutput, DealConfiguration, ProductDefinition } from '../types';
import { AVAILABLE_PRODUCTS } from '../constants';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportSectionProps {
  data: CalculationOutput;
  config: DealConfiguration;
}

export const ExportSection: React.FC<ExportSectionProps> = ({ data, config }) => {
  const [customerName, setCustomerName] = useState('');

  const formatMoney = (amount: number, currency: string) => {
    return amount.toLocaleString('en-US', { style: 'currency', currency: currency });
  };

  const handleExcelExport = () => {
    // Helper to sanitize CSV fields
    const q = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
    
    // 1. Deal Context
    const contextRows = [
      ['Customer Name', q(customerName)],
      ['Deal Type', q(config.dealType)],
      ['Channel', q(config.channel)],
      ['Duration (Years)', config.years],
      ['Pricing Method', q(config.method)],
      ['Currency Display', q(data.currencyToDisplay)],
      [] // spacer
    ];

    // 2. Product Config
    const productHeader = ['Product', 'Variant', 'Count', 'Base Discount %', 'Expiring Amount (USD)'];
    const productRows = config.selectedProducts.map(pid => {
      const p = AVAILABLE_PRODUCTS.find(x => x.id === pid);
      const inp = config.productInputs[pid];
      return [
        q(p?.name || pid),
        q(inp.variant),
        inp.count,
        inp.baseDiscount,
        inp.expiringAmount || 0
      ];
    });
    
    // 3. Main Schedule Header
    // Columns: Year, Prod1 Gross, Prod2 Gross..., Total Gross USD, Total Gross SAR, Net USD
    const prodCols = config.selectedProducts.map(pid => {
      const p = AVAILABLE_PRODUCTS.find(x => x.id === pid);
      return `${p?.shortName || pid} (USD)`;
    });
    
    const scheduleHeader = [
      'Year',
      ...prodCols,
      'Total Gross (USD)',
      'Total Gross (SAR)',
      'Net Recognized (USD)',
      'Notes'
    ];

    const scheduleRows = data.yearlyResults.map(r => {
      const pValues = config.selectedProducts.map(pid => {
         const bd = r.breakdown.find(x => x.id === pid);
         return bd ? bd.gross.toFixed(2) : '0.00';
      });
      return [
        `Year ${r.year}`,
        ...pValues,
        r.grossUSD.toFixed(2),
        r.grossSAR.toFixed(0),
        r.netUSD.toFixed(2),
        q(r.notes.join('; '))
      ];
    });
    
    // Totals Row
    const totalProdValues = config.selectedProducts.map(() => ''); // Empty for per-product totals in this view unless we calculate them
    const totalsRow = [
      'TOTAL',
      ...totalProdValues,
      data.totalGrossUSD.toFixed(2),
      data.totalGrossSAR.toFixed(0),
      data.totalNetUSD.toFixed(2),
      ''
    ];

    // 4. Summary Metrics
    const metricsRows = [
       [],
       ['Metric', 'Value (USD)'],
       ['Customer TCV', data.totalGrossUSD.toFixed(2)],
       ['Customer ACV', data.acvUSD.toFixed(2)],
       ['Net TCV', data.totalNetUSD.toFixed(2)],
       ['Net ACV', data.netACV.toFixed(2)],
       ['Renewal Base ACV', data.renewalBaseACV.toFixed(2)],
       ['Upsell ACV', data.upsellACV.toFixed(2)]
    ];

    // Assemble CSV
    const allRows = [
      ...contextRows,
      productHeader,
      ...productRows,
      [],
      scheduleHeader,
      ...scheduleRows,
      totalsRow,
      ...metricsRows
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + allRows.map(e => e.join(",")).join("\n");
      
    const filename = customerName 
       ? `Quote_${customerName.replace(/\s+/g,'_')}_${config.dealType}_${new Date().toISOString().slice(0,10)}.csv`
       : `Quote_${config.dealType}_${new Date().toISOString().slice(0,10)}.csv`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePDFExport = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica");

    // -- Header --
    doc.setFillColor(41, 128, 185); 
    doc.rect(0, 0, 210, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text("Commercial Quotation", 14, 16);
    
    if (customerName) {
      doc.setFontSize(12);
      doc.text(`Customer: ${customerName}`, 14, 33);
    }
    
    doc.setFontSize(10);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 160, 16);

    let finalY = customerName ? 40 : 35;

    // -- Summary Info --
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Type: ${config.dealType} | Channel: ${config.channel}`, 14, finalY);
    doc.text(`Currency: ${data.currencyToDisplay}`, 140, finalY);
    finalY += 8;

    // -- Loop through Products --
    config.selectedProducts.forEach((pid) => {
      const product = AVAILABLE_PRODUCTS.find(p => p.id === pid);
      if (!product) return;

      doc.setFontSize(11);
      doc.setTextColor(41, 128, 185);
      doc.text(`${product.name}`, 14, finalY);
      doc.setTextColor(0, 0, 0);
      
      const head = [['Year', 'Gross (USD)']];
      const body = data.yearlyResults.map(r => {
        const pData = r.breakdown.find(b => b.id === pid);
        return [
          `Year ${r.year}`,
          pData ? formatMoney(pData.gross, 'USD') : '-'
        ];
      });

      autoTable(doc, {
        startY: finalY + 2,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: 80 },
        styles: { fontSize: 9, font: 'helvetica' },
        margin: { left: 14, right: 14 },
      });

      finalY = (doc as any).lastAutoTable.finalY + 10;
    });

    // -- Grand Total Table --
    doc.setFontSize(11);
    doc.setTextColor(41, 128, 185);
    doc.text("Total Commercial Summary", 14, finalY);

    const totalHead = [['Year', 'Total Gross (USD)', `Total Gross (${data.currencyToDisplay})`, 'Net Recognized (USD)']];
    const totalBody = data.yearlyResults.map(r => [
       `Year ${r.year}`,
       formatMoney(r.grossUSD, 'USD'),
       data.currencyToDisplay === 'SAR' ? `SAR ${r.grossSAR.toLocaleString('en-US')}` : formatMoney(r.grossUSD, 'USD'),
       formatMoney(r.netUSD, 'USD')
    ]);

    totalBody.push([
      'TOTAL',
      formatMoney(data.totalGrossUSD, 'USD'),
      data.currencyToDisplay === 'SAR' ? `SAR ${data.totalGrossSAR.toLocaleString('en-US')}` : formatMoney(data.totalGrossUSD, 'USD'),
      formatMoney(data.totalNetUSD, 'USD')
    ]);

    autoTable(doc, {
      startY: finalY + 2,
      head: totalHead,
      body: totalBody,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      styles: { fontSize: 9, font: 'helvetica' },
      margin: { left: 14, right: 14 },
    });

    finalY = (doc as any).lastAutoTable.finalY + 10;

    // -- Metrics --
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    const col1X = 14;
    const col2X = 80;
    
    doc.text(`Customer TCV: ${formatMoney(data.totalGrossUSD, 'USD')}`, col1X, finalY);
    doc.text(`Customer ACV: ${formatMoney(data.acvUSD, 'USD')}`, col2X, finalY);
    finalY += 6;
    doc.text(`Net TCV: ${formatMoney(data.totalNetUSD, 'USD')}`, col1X, finalY);
    doc.text(`Net ACV: ${formatMoney(data.netACV, 'USD')}`, col2X, finalY);
    
    if (config.dealType === 'Renewal') {
       finalY += 6;
       doc.text(`Renewal Base: ${formatMoney(data.renewalBaseACV, 'USD')}`, col1X, finalY);
       doc.text(`Upsell: ${formatMoney(data.upsellACV, 'USD')}`, col2X, finalY);
    }
    
    const filename = customerName 
       ? `Quote_${customerName.replace(/\s+/g,'_')}_${config.dealType}_${new Date().toISOString().slice(0,10)}.pdf`
       : `Quote_${config.dealType}_${new Date().toISOString().slice(0,10)}.pdf`;

    doc.save(filename);
  };

  return (
    <div className="mt-6 border-t border-gray-200 pt-6">
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-500 mb-1">Customer Name (Optional)</label>
        <input 
          type="text" 
          placeholder="Enter Customer Name"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="block w-full max-w-sm text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
        />
      </div>
      <div className="flex space-x-4">
        <button 
          onClick={handleExcelExport}
          className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          Export Excel (.csv)
        </button>
        <button 
          onClick={handlePDFExport}
          className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          Export PDF Quote
        </button>
      </div>
    </div>
  );
};
