import React, { useState } from 'react';
import { CalculationOutput, DealConfiguration, ChannelType } from '../types';
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
    // For PDF usage specifically with Fira Sans or compatible font, we use unicode
    if (currency === 'SAR') {
       return `﷼ ${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    }
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
    const prodCols = config.selectedProducts.map(pid => {
      const p = AVAILABLE_PRODUCTS.find(x => x.id === pid);
      return `${p?.shortName || pid} (USD)`;
    });
    
    const scheduleHeader = [
      'Year',
      ...prodCols,
      'Total Gross (USD)',
      'Total Gross (SAR)',
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
        q(r.notes.join('; '))
      ];
    });
    
    // Totals Row
    const totalProdValues = config.selectedProducts.map(() => ''); 
    const totalsRow = [
      'TOTAL',
      ...totalProdValues,
      data.totalGrossUSD.toFixed(2),
      data.totalGrossSAR.toFixed(0),
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
    
    // Add Net Breakdown to CSV
    if (config.channel !== ChannelType.DIRECT) {
       metricsRows.push([]);
       metricsRows.push(['Product', 'Net Total (USD)']);
       config.selectedProducts.forEach(pid => {
         const p = AVAILABLE_PRODUCTS.find(x => x.id === pid);
         metricsRows.push([p?.shortName || pid, data.productNetTotals[pid].toFixed(2)]);
       });
    }

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
    
    // Wolters Kluwer Blue
    const primaryColor = [0, 122, 195]; 
    const docDate = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    const refId = `REF-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`;

    // --- Fira Sans Font Setup ---
    // Note: To make this work, you must replace the empty string below with the actual Base64 encoded string of FiraSans-Regular.ttf
    // For the purpose of this architecture code, the logic is implemented but the asset is not embedded to avoid file size limits in response.
    const firaSansBase64 = ""; 
    
    if (firaSansBase64) {
      try {
        doc.addFileToVFS("FiraSans-Regular.ttf", firaSansBase64);
        doc.addFont("FiraSans-Regular.ttf", "FiraSans", "normal");
        doc.setFont("FiraSans");
      } catch (e) {
        console.warn("Error loading Fira Sans, falling back to Helvetica");
        doc.setFont("helvetica");
      }
    } else {
        // Fallback if no base64 provided in code
        doc.setFont("helvetica");
    }

    // Placeholder Base64 for a logo (Simple colorful box to simulate logo presence)
    const logoData = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH5gIeEzgZ6b78TAAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAACxklEQVRo3u2aTUtCURSG33uvFq2ChFpE0CpoE9QmaBPUJmgTtAlqE7QJahO0CWoTtAmCamGQ5i+QlnP13hO6g9t7r849L/swMHj3Oec9555z77kCOTk5OTk5/x8lhw+FQsF5/8658H0/yLIs12g0+PF47O7t7f1Yw0Kh4DQaDUE+n3d3d3fFMAx3b2/v1y0LhYLTbDbF5eWlOzs7E5VKxd3f3/9xy0Kh4DSbTXFxcSGOj4/FwcGBODk5EcfHx+Li4kKs1+vC9/0ftSwUCk6j0RBnZ2f/WBaNRlF8JpPJpwyIoshZLBb/WBbL5fJTAyIIAmcymfxjWTCZTD41IIqiOIvF4h/Lgtls9qkBEQTBmUwmfywLJpPJpwZEURRnsVj8sSyYzWafGhBBEJzJZPLHsmAymXxqQBRFcRaLxR/Lgtls9qkBEQTBmUwmfywLJpPJpwZEURRnsVj8sSyYzWafGhBBEJzJZPLHsmAymXxqQBRFcRaLxR/Lgtls9qkBEQTBmUwmfywLJpPJpwZEURRnsVj8sSyYzWafGhBBEJzJZPLHsmAymXxqQBRFcRaLxR/Lgtls9qkBEQTBmUwmfywLJpPJpwZEURRnsVj8sSyYzWafGhBBEJzJZPLHsmAymXxqQBRFcRaLxR/Lgtls9qkBEQTBmUwmfywLJpPJpwZEURRnsVj8sSyYzWafGhBBEJzJZPLHsmAymXxqQBRFcRaLxR/Lgtls9qkBEQTBmUwmfywLJpPJpwZEURRnsVj8sSyYzWafGhBBEJzJZPLHsmAymXxqQBRFcRaLxR/Lgtls9qkBEQTBmUwmfywLJpPJpwZEURRnsVj8sSyYzWafGhBBEJzJZPLHsmAymXxqQBRFcRaLxR/Lgtls9qkBEQTBmUwmfywLJpPJpwZEURRnsVj8sSyYzWafGhBBEJzJZPLHsmAymXxqQG5ubpx2uy1833f39vbE1tZWyD/n5OTk5OQ05g8j25y0o/CjLAAAAABJRU5ErkJggg==";

    const addFooter = (pageNum: number) => {
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      const footerText = `Wolters Kluwer | ${docDate} | ${refId} | ${customerName || 'Draft Quote'}`;
      doc.text(footerText, 14, 285);
      doc.text(`Page ${pageNum}`, 190, 285);
    };

    // --- PAGE 1: COVER ---
    // Background bar
    doc.setFillColor(245, 245, 245);
    doc.rect(0, 0, 210, 297, 'F');
    
    // Header Color
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 90, 210, 50, 'F');

    // Logo
    try {
      doc.addImage(logoData, 'PNG', 100, 70, 10, 10);
    } catch (e) {
      console.warn("Could not load logo", e);
    }

    // Title
    // Use FiraSans if available, else standard font logic implied
    doc.setFontSize(32);
    doc.setTextColor(255, 255, 255);
    doc.text("Wolters Kluwer", 105, 115, { align: 'center' });

    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text("Budgetary Commercial Proposal", 105, 130, { align: 'center' });

    // Client Info Center
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(14);
    if (customerName) {
      doc.text(`Prepared for: ${customerName}`, 105, 160, { align: 'center' });
    }
    doc.setFontSize(11);
    doc.text(`Date: ${docDate}`, 105, 170, { align: 'center' });
    doc.text(`Reference: ${refId}`, 105, 178, { align: 'center' });

    // Bottom Left Info
    doc.setFontSize(10);
    doc.text(`Customer: ${customerName || 'N/A'}`, 14, 270);
    doc.text(`Date: ${docDate}`, 14, 275);
    doc.text(`Ref: ${refId}`, 14, 280);

    // --- PAGE 2: CONFIDENTIALITY ---
    doc.addPage();
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 210, 297, 'F');
    
    doc.setFontSize(16);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("Confidentiality Notice", 14, 25);

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    
    const disclaimer = `This proposal and the information contained herein is proprietary and confidential information of Wolters Kluwer. 

It is intended solely for the use of the individual or entity to whom it is addressed. This document contains sensitive commercial and technical information that should not be disclosed to any third party without the prior written consent of Wolters Kluwer.

The pricing and terms outlined in this document are budgetary in nature and subject to final contract negotiation and execution.

By accepting this document, the recipient agrees to keep its contents confidential and to use them solely for the purpose of evaluating the proposed business relationship.`;

    const splitText = doc.splitTextToSize(disclaimer, 180);
    doc.text(splitText, 14, 40);
    
    addFooter(2);

    // --- PAGE 3: PRICING DETAILS & TERMS ---
    doc.addPage();
    
    doc.setFontSize(16);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("Pricing Details", 14, 25);

    // Prepare table data
    const tableHead = [['Year', ...config.selectedProducts.map(pid => {
       const p = AVAILABLE_PRODUCTS.find(x => x.id === pid);
       return p?.shortName || pid;
    }), 'Total (USD)', 'Total (SAR)']]; // Strictly Gross values

    const tableBody = data.yearlyResults.map(r => {
       const pValues = config.selectedProducts.map(pid => {
          const bd = r.breakdown.find(x => x.id === pid);
          return bd ? formatMoney(bd.gross, 'USD') : '-';
       });
       return [
          `Year ${r.year}`,
          ...pValues,
          formatMoney(r.grossUSD, 'USD'),
          config.channel === ChannelType.DIRECT ? '-' : formatMoney(r.grossSAR, 'SAR')
       ];
    });

    const totalRow = [
      'TOTAL',
      ...config.selectedProducts.map(() => ''),
      formatMoney(data.totalGrossUSD, 'USD'),
      config.channel === ChannelType.DIRECT ? '-' : formatMoney(data.totalGrossSAR, 'SAR')
    ];
    tableBody.push(totalRow);

    // Use current active font family for table
    const currentFont = doc.getFont().fontName;

    autoTable(doc, {
      startY: 35,
      head: tableHead,
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: 255, font: currentFont },
      styles: { fontSize: 9, font: currentFont }, // Ensure custom font is used in table if loaded
      margin: { left: 14, right: 14 },
    });

    let finalY = (doc as any).lastAutoTable.finalY + 15;

    // --- Terms & Conditions ---
    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("Terms & Conditions", 14, finalY);
    
    finalY += 8;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    const paymentTermText = config.channel === ChannelType.DIRECT
      ? "30 days from invoice date."
      : "As per the entity's regulations.";

    // Build Statistics String
    const statsList = [];
    if (config.selectedProducts.includes('utd')) {
       statsList.push(`${config.productInputs['utd'].count} Physicians`);
    }
    if (config.selectedProducts.includes('ld')) {
       statsList.push(`${config.productInputs['ld'].count} Active Beds`);
    }
    const statsString = statsList.length > 0 ? `Statistics: ${statsList.join(' & ')}` : '';

    const terms = [
      `Price validity: 60 days.`,
      `Subscription Duration: ${config.years} Years`,
      `Payment terms: ${paymentTermText}`,
      `EMR integration is free of charge over the course of the subscription even if the EMR changed.`,
    ];
    
    // Add statistics if exists
    if (statsString) {
      terms.push(statsString);
    }

    terms.push(`Refer to the technical proposal for access methods, licensed material and product description.`);

    terms.forEach(term => {
      // Simple pagination check
      if (finalY > 270) {
        doc.addPage();
        finalY = 20;
      }
      doc.text(`• ${term}`, 14, finalY);
      finalY += 6;
    });

    addFooter(3);

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