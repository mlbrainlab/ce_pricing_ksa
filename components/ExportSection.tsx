import React, { useState } from 'react';
import { CalculationOutput, DealConfiguration, ChannelType } from '../types';
import { AVAILABLE_PRODUCTS } from '../constants';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportSectionProps {
  data: CalculationOutput;
  config: DealConfiguration;
}

// Logo URLs provided
const WK_LOGO_URL = "https://cdn.wolterskluwer.io/wk/jumpstart-v3-assets/0.x.x/logo/large.svg";
const SAMIR_LOGO_URL = "https://samirgroup.com/wp-content/uploads/2021/05/logo.png";

export const ExportSection: React.FC<ExportSectionProps> = ({ data, config }) => {
  const [customerName, setCustomerName] = useState('');
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  const formatMoney = (amount: number, currency: string) => {
    return currency === 'SAR' 
      ? `SAR ${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
      : amount.toLocaleString('en-US', { style: 'currency', currency: currency });
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
      'VAT (SAR)',
      'Grand Total (SAR)',
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
        r.vatSAR.toFixed(0),
        r.grandTotalSAR.toFixed(0),
      ];
    });
    
    // Totals Row
    const totalProdValues = config.selectedProducts.map(() => ''); 
    const totalsRow = [
      'TOTAL',
      ...totalProdValues,
      data.totalGrossUSD.toFixed(2),
      data.totalGrossSAR.toFixed(0),
      data.totalVatSAR.toFixed(0),
      data.totalGrandTotalSAR.toFixed(0),
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

  // Robust Image Loader for Mixed Formats (SVG/PNG/JPG)
  const getBase64FromUrl = async (url: string): Promise<string> => {
    try {
      // 1. Attempt standard Fetch
      // Note: This relies on the server sending CORS headers.
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
      
      const blob = await response.blob();
      
      // 2. If SVG, rasterize to PNG via Canvas
      if (blob.type.includes('svg') || url.toLowerCase().endsWith('.svg')) {
         return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    // Scale up for better PDF resolution
                    canvas.width = img.width * 2;
                    canvas.height = img.height * 2;
                    const ctx = canvas.getContext('2d');
                    if(ctx) {
                        ctx.scale(2, 2);
                        ctx.drawImage(img, 0, 0);
                        resolve(canvas.toDataURL('image/png'));
                    } else {
                        reject(new Error("Canvas context failed"));
                    }
                };
                img.onerror = (e) => reject(new Error("SVG Image render failed"));
                img.src = reader.result as string;
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
         });
      }
      
      // 3. If standard image (PNG/JPG), return Base64 directly from Blob
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

    } catch (error) {
      console.warn(`Fetch loader failed for ${url}, attempting fallback Image load.`, error);
      
      // 4. Fallback: Standard Image Object (Can sometimes bypass strict fetch policies if cached or simple GET)
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        
        const timer = setTimeout(() => reject(new Error("Image load timeout")), 8000);

        img.onload = () => {
          clearTimeout(timer);
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            try {
              resolve(canvas.toDataURL('image/png'));
            } catch (e) {
              reject(new Error("Canvas tainted - CORS blocked"));
            }
          } else {
            reject(new Error("Canvas context failed"));
          }
        };
        
        img.onerror = () => {
            clearTimeout(timer);
            reject(new Error(`Image fallback failed for ${url}`));
        };
        
        img.src = url;
      });
    }
  };

  // Convert ArrayBuffer to Base64 (For Fonts)
  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  const handlePDFExport = async () => {
    setIsPdfLoading(true);
    const doc = new jsPDF();
    
    // Wolters Kluwer Blue
    const primaryColor = [0, 122, 195]; 
    const docDate = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    const refId = `REF-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`;

    // --- 1. Load Resources ---
    let wkLogoData = "";
    let samirLogoData = "";
    
    try {
        // Load Fira Sans
        const fontResponse = await fetch('https://fonts.gstatic.com/s/firasans/v17/va9E4kDNxMZdWfMOD5Vvl4jO.ttf');
        if (fontResponse.ok) {
           const fontBuffer = await fontResponse.arrayBuffer();
           const fontBase64 = arrayBufferToBase64(fontBuffer);
           doc.addFileToVFS('FiraSans-Regular.ttf', fontBase64);
           doc.addFont('FiraSans-Regular.ttf', 'FiraSans', 'normal');
           doc.setFont('FiraSans');
        }
    } catch (error) {
        console.warn("Font loading failed, falling back", error);
        doc.setFont("helvetica");
    }

    try {
        // Load WK Logo
        wkLogoData = await getBase64FromUrl(WK_LOGO_URL);
    } catch (e) {
        console.warn("WK Logo failed to load", e);
    }

    if (config.channel !== ChannelType.DIRECT) {
        try {
            // Load Samir Logo
            samirLogoData = await getBase64FromUrl(SAMIR_LOGO_URL);
        } catch (e) {
            console.warn("Samir Logo failed to load", e);
        }
    }

    const addFooter = (pageNum: number) => {
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      const footerText = `Wolters Kluwer | ${docDate} | ${refId} | ${customerName || 'Draft Quote'}`;
      doc.text(footerText, 14, 285);
      doc.text(`Page ${pageNum}`, 190, 285);
    };

    // --- Header Render Function ---
    const renderHeader = () => {
       // Header Color Background
       doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
       doc.rect(0, 0, 210, 30, 'F'); 
       
       // Add WK Logo (Left)
       if (wkLogoData) {
         doc.addImage(wkLogoData, 'PNG', 14, 7, 50, 16); 
       } else {
         doc.setFontSize(14);
         doc.setTextColor(255, 255, 255);
         doc.text("Wolters Kluwer", 14, 20);
       }

       // Add Samir Group Logo (Right) if Indirect
       if (config.channel !== ChannelType.DIRECT && samirLogoData) {
         doc.addImage(samirLogoData, 'PNG', 150, 7, 45, 16);
       }
    };

    // --- PAGE 1: COVER ---
    // Background bar
    doc.setFillColor(245, 245, 245);
    doc.rect(0, 30, 210, 267, 'F'); 
    
    renderHeader();
    
    // Large Title Block
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 100, 210, 50, 'F');

    // Title
    doc.setFontSize(32);
    doc.setTextColor(255, 255, 255);
    doc.text("Wolters Kluwer", 105, 125, { align: 'center' });

    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text("Budgetary Commercial Proposal", 105, 140, { align: 'center' });

    // Client Info Center
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(14);
    if (customerName) {
      doc.text(`Prepared for: ${customerName}`, 105, 170, { align: 'center' });
    }
    doc.setFontSize(11);
    doc.text(`Date: ${docDate}`, 105, 180, { align: 'center' });
    doc.text(`Reference: ${refId}`, 105, 188, { align: 'center' });

    // Bottom Left Info
    doc.setFontSize(10);
    doc.text(`Customer: ${customerName || 'N/A'}`, 14, 270);
    doc.text(`Date: ${docDate}`, 14, 275);
    doc.text(`Ref: ${refId}`, 14, 280);

    // --- PAGE 2: CONFIDENTIALITY ---
    doc.addPage();
    renderHeader();
    doc.setFillColor(255, 255, 255);
    
    doc.setFontSize(16);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("Confidentiality Notice", 14, 45); 

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    
    const disclaimer = `This proposal and the information contained herein is proprietary and confidential information of Wolters Kluwer. 

It is intended solely for the use of the individual or entity to whom it is addressed. This document contains sensitive commercial and technical information that should not be disclosed to any third party without the prior written consent of Wolters Kluwer.

The pricing and terms outlined in this document are budgetary in nature and subject to final contract negotiation and execution.

By accepting this document, the recipient agrees to keep its contents confidential and to use them solely for the purpose of evaluating the proposed business relationship.`;

    const splitText = doc.splitTextToSize(disclaimer, 180);
    doc.text(splitText, 14, 60);
    
    addFooter(2);

    // --- PAGE 3: PRICING DETAILS & TERMS ---
    doc.addPage();
    renderHeader();
    
    doc.setFontSize(16);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("Pricing Details", 14, 45);

    // --- Table Configuration based on Channel ---
    let tableHead: string[][] = [];
    let tableBody: string[][] = [];
    
    const isIndirect = config.channel !== ChannelType.DIRECT;

    // Calculate Styling Indices
    const productColIndices: Record<string, number> = {};
    config.selectedProducts.forEach((pid, idx) => {
        // Col 0 is Year, Products start at 1
        productColIndices[pid] = 1 + idx;
    });

    const totalStartIndex = 1 + config.selectedProducts.length;
    const totalColsCount = isIndirect ? 3 : 1; 

    const columnStyles: any = {};

    // UTD Styling - Light Green
    if (productColIndices['utd'] !== undefined) {
        columnStyles[productColIndices['utd']] = { fillColor: [220, 252, 231] };
    }
    // LXD (ld) Styling - Light Blue
    if (productColIndices['ld'] !== undefined) {
        columnStyles[productColIndices['ld']] = { fillColor: [224, 242, 254] };
    }

    // Totals Styling - Bold
    for(let i = 0; i < totalColsCount; i++) {
        columnStyles[totalStartIndex + i] = { fontStyle: 'bold' };
    }

    if (isIndirect) {
      // INDIRECT: Only SAR, with VAT
      const prodCols = config.selectedProducts.map(pid => {
         const p = AVAILABLE_PRODUCTS.find(x => x.id === pid);
         return `${p?.shortName || pid} (SAR)`;
      });
      tableHead = [['Year', ...prodCols, 'Total (SAR)', 'VAT (15%)', 'Grand Total (SAR)']];
      
      tableBody = data.yearlyResults.map(r => {
        const pValues = config.selectedProducts.map(pid => {
           const bd = r.breakdown.find(x => x.id === pid);
           return bd ? formatMoney(bd.grossSAR, 'SAR') : '-';
        });
        return [
           `Year ${r.year}`,
           ...pValues,
           formatMoney(r.grossSAR, 'SAR'),
           formatMoney(r.vatSAR, 'SAR'),
           formatMoney(r.grandTotalSAR, 'SAR'),
        ];
      });

      const totalRow = [
        'TOTAL',
        ...config.selectedProducts.map(() => ''),
        formatMoney(data.totalGrossSAR, 'SAR'),
        formatMoney(data.totalVatSAR, 'SAR'),
        formatMoney(data.totalGrandTotalSAR, 'SAR'),
      ];
      tableBody.push(totalRow);

    } else {
      // DIRECT: USD
      const prodCols = config.selectedProducts.map(pid => {
         const p = AVAILABLE_PRODUCTS.find(x => x.id === pid);
         return `${p?.shortName || pid} (USD)`;
      });
      tableHead = [['Year', ...prodCols, 'Total (USD)']];

      tableBody = data.yearlyResults.map(r => {
        const pValues = config.selectedProducts.map(pid => {
           const bd = r.breakdown.find(x => x.id === pid);
           return bd ? formatMoney(bd.gross, 'USD') : '-';
        });
        return [
           `Year ${r.year}`,
           ...pValues,
           formatMoney(r.grossUSD, 'USD'),
        ];
      });

      const totalRow = [
        'TOTAL',
        ...config.selectedProducts.map(() => ''),
        formatMoney(data.totalGrossUSD, 'USD'),
      ];
      tableBody.push(totalRow);
    }

    // Use current active font family for table
    const currentFont = doc.getFont().fontName;

    autoTable(doc, {
      startY: 55, // Adjusted Y for header
      head: tableHead,
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: 255, font: currentFont },
      styles: { fontSize: 9, font: currentFont }, 
      columnStyles: columnStyles,
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
        renderHeader();
        finalY = 55;
      }
      doc.text(`• ${term}`, 14, finalY);
      finalY += 6;
    });

    addFooter(3);

    const filename = customerName 
       ? `Quote_${customerName.replace(/\s+/g,'_')}_${config.dealType}_${new Date().toISOString().slice(0,10)}.pdf`
       : `Quote_${config.dealType}_${new Date().toISOString().slice(0,10)}.pdf`;

    doc.save(filename);
    setIsPdfLoading(false);
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
          disabled={isPdfLoading}
          className={`flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${isPdfLoading ? 'bg-red-400' : 'bg-red-600 hover:bg-red-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}
        >
          {isPdfLoading ? 'Processing...' : 'Export PDF Quote'}
        </button>
      </div>
    </div>
  );
};