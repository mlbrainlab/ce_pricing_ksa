
import React, { useState, useEffect } from 'react';
import { CalculationOutput, DealConfiguration, ChannelType, DealType, PricingMethod } from '../types';
import { AVAILABLE_PRODUCTS } from '../constants';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';

interface ExportSectionProps {
  data: CalculationOutput;
  config: DealConfiguration;
}

// Logo URLs
const WK_LOGO_URL = "https://cdn.wolterskluwer.io/wk/jumpstart-v3-assets/0.x.x/logo/large.svg";
// Using CORS proxy to ensure the image loads in the browser
const SAMIR_LOGO_URL = "https://corsproxy.io/?https://samirgroup.com/wp-content/uploads/2021/05/logo.png"; 

// Reliable Font URLs (jsDelivr CDN for GitHub raw)
const FONT_URLS = {
  Inter: {
    regular: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/inter/static/Inter-Regular.ttf",
    bold: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/inter/static/Inter-Bold.ttf"
  },
  FiraSans: {
    regular: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/firasans/FiraSans-Regular.ttf",
    bold: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/firasans/FiraSans-Bold.ttf"
  }
};

type FontType = 'Inter' | 'FiraSans';

export const ExportSection: React.FC<ExportSectionProps> = ({ data, config }) => {
  const [customerName, setCustomerName] = useState('');
  const [repName, setRepName] = useState('');
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isExcelLoading, setIsExcelLoading] = useState(false);
  
  // Font State - Default to FiraSans
  const [selectedFont, setSelectedFont] = useState<FontType>('FiraSans');
  const [fontCache, setFontCache] = useState<Record<FontType, { regular: string | null, bold: string | null }>>({
    Inter: { regular: null, bold: null },
    FiraSans: { regular: null, bold: null }
  });
  const [isFontLoading, setIsFontLoading] = useState(false);

  // Load font when selection changes
  useEffect(() => {
    const loadSelectedFont = async () => {
      // If already loaded, do nothing
      if (fontCache[selectedFont].regular && fontCache[selectedFont].bold) return;

      setIsFontLoading(true);
      try {
        console.log(`Fetching ${selectedFont}...`);
        const urls = FONT_URLS[selectedFont];
        const [regRes, boldRes] = await Promise.all([
          fetch(urls.regular),
          fetch(urls.bold)
        ]);

        if (regRes.ok && boldRes.ok) {
          const regBuf = await regRes.arrayBuffer();
          const boldBuf = await boldRes.arrayBuffer();
          
          setFontCache(prev => ({
            ...prev,
            [selectedFont]: {
              regular: arrayBufferToBase64(regBuf),
              bold: arrayBufferToBase64(boldBuf)
            }
          }));
          console.log(`${selectedFont} loaded successfully.`);
        } else {
          console.error(`Failed to fetch ${selectedFont}: Status ${regRes.status}/${boldRes.status}`);
        }
      } catch (e) {
        console.error(`Exception loading ${selectedFont}:`, e);
      } finally {
        setIsFontLoading(false);
      }
    };

    loadSelectedFont();
  }, [selectedFont]);

  const formatMoney = (amount: number, currency: string) => {
    return currency === 'SAR' 
      ? `SAR ${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
      : amount.toLocaleString('en-US', { style: 'currency', currency: currency });
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  // Robust Image Loader
  const getBase64FromUrl = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url, { cache: 'force-cache' });
      if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
      const blob = await response.blob();
      
      if (blob.type.includes('svg') || url.toLowerCase().endsWith('.svg')) {
         return new Promise((resolve) => { 
            const reader = new FileReader();
            reader.onload = () => {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width * 2;
                    canvas.height = img.height * 2;
                    const ctx = canvas.getContext('2d');
                    if(ctx) {
                        ctx.scale(2, 2);
                        ctx.drawImage(img, 0, 0);
                        resolve(canvas.toDataURL('image/png'));
                    } else {
                        resolve('');
                    }
                };
                img.onerror = () => resolve('');
                img.src = reader.result as string;
            };
            reader.onerror = () => resolve('');
            reader.readAsDataURL(blob);
         });
      }
      
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(blob);
      });

    } catch (error) {
      // Fallback
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        const timer = setTimeout(() => resolve(''), 3000); 
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
              resolve(''); 
            }
          } else {
            resolve('');
          }
        };
        img.onerror = () => {
            clearTimeout(timer);
            resolve('');
        };
        img.src = url;
      });
    }
  };

  const handlePDFExport = async () => {
    // ... (Existing PDF logic unchanged)
    const currentFontData = fontCache[selectedFont];
    if (!currentFontData.regular || !currentFontData.bold) {
      alert("Fonts are not loaded. Please wait or check your connection.");
      return;
    }

    setIsPdfLoading(true);
    const doc = new jsPDF();
    const primaryColor: [number, number, number] = [0, 122, 195]; 
    const docDate = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    const refId = `REF-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`;
    let wkLogoData = "";
    let samirLogoData = "";
    doc.addFileToVFS('Custom-Regular.ttf', currentFontData.regular);
    doc.addFileToVFS('Custom-Bold.ttf', currentFontData.bold);
    doc.addFont('Custom-Regular.ttf', 'CustomFont', 'normal');
    doc.addFont('Custom-Bold.ttf', 'CustomFont', 'bold');
    const fontName = 'CustomFont';
    doc.setFont(fontName);
    try { wkLogoData = await getBase64FromUrl(WK_LOGO_URL); } catch (e) { console.log('WK Logo fail', e) }
    if (config.channel !== ChannelType.DIRECT) { try { samirLogoData = await getBase64FromUrl(SAMIR_LOGO_URL); } catch (e) { console.log('Partner Logo fail', e) } }

    const addFooter = (pageNum: number) => {
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Wolters Kluwer | ${docDate} | ${refId} | ${customerName || 'Draft Quote'}`, 14, 285);
      doc.text(`Page ${pageNum}`, 190, 285);
    };

    const renderHeader = (isCover: boolean) => {
       const pageWidth = doc.internal.pageSize.getWidth();
       if (isCover) {
          doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          doc.rect(0, 0, pageWidth, 150, 'F'); 
          doc.setFontSize(10);
          doc.setTextColor(255, 255, 255);
          doc.setFont(fontName, 'bold');
          doc.text("Proprietary & Confidential", pageWidth - 14, 28, { align: 'right' });
       } else {
          doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          doc.rect(0, 0, pageWidth, 30, 'F'); 
       }
       const xOffset = 14;
       if (wkLogoData) {
         if (isCover) {
             doc.setFillColor(255, 255, 255);
             doc.roundedRect(xOffset - 2, 8, 54, 14, 1, 1, 'F');
         }
         doc.addImage(wkLogoData, 'PNG', xOffset, 10.5, 50, 9); 
       } else {
         doc.setFontSize(14);
         doc.setTextColor(255, 255, 255);
         doc.text("Wolters Kluwer", xOffset, 20);
       }
       if (config.channel !== ChannelType.DIRECT && samirLogoData) {
         const logoX = pageWidth - 14 - 50; 
         if (isCover) {
             doc.setFillColor(255, 255, 255);
             doc.roundedRect(logoX - 2, 8, 54, 14, 1, 1, 'F');
         }
         doc.addImage(samirLogoData, 'PNG', logoX, 10, 50, 10);
       }
    };

    renderHeader(true);
    doc.setFillColor(245, 245, 245);
    doc.rect(0, 150, 210, 147, 'F'); 
    doc.setFontSize(32);
    doc.setTextColor(255, 255, 255);
    doc.setFont(fontName, 'bold');
    doc.text("Wolters Kluwer", 105, 100, { align: 'center' });
    doc.setFontSize(18);
    doc.setFont(fontName, 'normal');
    doc.text("Budgetary Commercial Proposal", 105, 115, { align: 'center' });
    let currentY = 170;
    doc.setTextColor(60, 60, 60);
    const hasUTD = config.selectedProducts.includes('utd');
    const hasLD = config.selectedProducts.includes('ld');
    if (hasUTD) {
        const variant = config.productInputs['utd']?.variant || '';
        let title = "UpToDate\u00AE";
        if (variant === 'ANYWHERE') title = "UpToDate\u00AE Anywhere";
        if (variant === 'UTDADV') title = "UpToDate\u00AE Advanced";
        if (variant === 'UTDEE') title = "UpToDate\u00AE Enterprise";
        doc.setFontSize(22);
        doc.setFont(fontName, 'bold');
        doc.text(title, 105, currentY, { align: 'center' });
        currentY += 8;
        doc.setFontSize(12);
        doc.setFont(fontName, 'normal');
        doc.text("Clinical Decision Support Solution", 105, currentY, { align: 'center' });
        currentY += 20;
    }
    if (hasLD) {
        const variant = config.productInputs['ld']?.variant || '';
        let subHeading = "Drug Referential Solution";
        if (variant.includes('FLINK')) {
            subHeading = variant.includes('IPE') ? "including Formulink\u2122 and Integrated Patient Education" : "including Formulink\u2122";
        }
        doc.setFontSize(22);
        doc.setFont(fontName, 'bold');
        doc.text("Lexidrug\u00AE", 105, currentY, { align: 'center' });
        currentY += 8;
        doc.setFontSize(12);
        doc.setFont(fontName, 'normal');
        doc.text(subHeading, 105, currentY, { align: 'center' });
        currentY += 15;
    }
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.setFont(fontName, 'normal');
    doc.text(`Customer: ${customerName || 'N/A'}`, 14, 265);
    doc.text(`Prepared by: ${repName || 'N/A'}`, 14, 270);
    doc.text(`Date: ${docDate}`, 14, 275);
    doc.text(`Ref: ${refId}`, 14, 280);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`©${new Date().getFullYear()} UpToDate, Inc. and its affiliates and/or licensors. All rights reserved.`, 14, 290);

    doc.addPage();
    renderHeader(false);
    doc.setFillColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont(fontName, 'bold');
    doc.text("Confidentiality Notice", 14, 45); 
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont(fontName, 'normal');
    const disclaimer = `The information contained within this Proposal is confidential and proprietary and may be used solely for the purpose of evaluating the potential license of offerings and/or services provided by the Wolters Kluwer Health, Inc. entities (sometimes collectively referred to as “Wolters Kluwer”) identified in this Proposal. This Proposal is non-binding on each party. Neither this Proposal, nor any oral or written communication concerning the matters covered by this Proposal, shall create any binding obligations on any party; only those obligations set forth in a separate written definitive agreement negotiated and executed by all parties in a form approved by each party shall be binding upon the parties. Any information contained within this Proposal may only be disclosed to directors, officers, employees, and agents of the recipient organization who need to know such information for the purpose of evaluating this Proposal. The information contained within this Proposal shall not be communicated to anyone outside of the recipient organization without the express written permission of Wolters Kluwer.`;
    const splitText = doc.splitTextToSize(disclaimer, 180);
    doc.text(splitText, 14, 60);
    addFooter(2);

    doc.addPage();
    renderHeader(false);
    doc.setFontSize(16);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont(fontName, 'bold');
    doc.text("Pricing Details", 14, 45);

    let tableHead: string[][] = [];
    let tableBody: string[][] = [];
    const isIndirect = config.channel !== ChannelType.DIRECT;
    const productColIndices: Record<string, number> = {};
    config.selectedProducts.forEach((pid, idx) => { productColIndices[pid] = 1 + idx; });
    const totalStartIndex = 1 + config.selectedProducts.length;
    const columnStyles: any = {};
    if (productColIndices['utd'] !== undefined) columnStyles[productColIndices['utd']] = { fillColor: [220, 252, 231] };
    if (productColIndices['ld'] !== undefined) columnStyles[productColIndices['ld']] = { fillColor: [224, 242, 254] };
    columnStyles[totalStartIndex] = { fontStyle: 'bold' };
    if (isIndirect) columnStyles[totalStartIndex + 2] = { fontStyle: 'bold' };

    if (isIndirect) {
      const prodCols = config.selectedProducts.map(pid => {
         let label = pid;
         if (pid === 'utd') label = 'UpToDate';
         if (pid === 'ld') label = 'Lexidrug';
         return `${label} (SAR)`;
      });
      tableHead = [['Year', ...prodCols, 'Total (SAR)', 'VAT (15%)', 'Grand Total\n(SAR)']];
      tableBody = data.yearlyResults.map(r => {
        const pValues = config.selectedProducts.map(pid => {
           const bd = r.breakdown.find(x => x.id === pid);
           return bd ? formatMoney(bd.grossSAR, 'SAR') : '-';
        });
        return [ `Year ${r.year}`, ...pValues, formatMoney(r.grossSAR, 'SAR'), formatMoney(r.vatSAR, 'SAR'), formatMoney(r.grandTotalSAR, 'SAR') ];
      });
      const productTotalsSAR = config.selectedProducts.map(pid => {
          const total = data.yearlyResults.reduce((sum, r) => {
              const bd = r.breakdown.find(x => x.id === pid);
              return sum + (bd ? bd.grossSAR : 0);
          }, 0);
          return formatMoney(total, 'SAR');
      });
      tableBody.push(['TOTAL', ...productTotalsSAR, formatMoney(data.totalGrossSAR, 'SAR'), formatMoney(data.totalVatSAR, 'SAR'), formatMoney(data.totalGrandTotalSAR, 'SAR')]);
    } else {
      const prodCols = config.selectedProducts.map(pid => {
         let label = pid;
         if (pid === 'utd') label = 'UpToDate';
         if (pid === 'ld') label = 'Lexidrug';
         return `${label} (USD)`;
      });
      tableHead = [['Year', ...prodCols, 'Total (USD)']];
      tableBody = data.yearlyResults.map(r => {
        const pValues = config.selectedProducts.map(pid => {
           const bd = r.breakdown.find(x => x.id === pid);
           return bd ? formatMoney(bd.gross, 'USD') : '-';
        });
        return [ `Year ${r.year}`, ...pValues, formatMoney(r.grossUSD, 'USD') ];
      });
      const productTotalsUSD = config.selectedProducts.map(pid => {
          const total = data.yearlyResults.reduce((sum, r) => {
              const bd = r.breakdown.find(x => x.id === pid);
              return sum + (bd ? bd.gross : 0);
          }, 0);
          return formatMoney(total, 'USD');
      });
      tableBody.push(['TOTAL', ...productTotalsUSD, formatMoney(data.totalGrossUSD, 'USD')]);
    }

    autoTable(doc, {
      startY: 55, 
      head: tableHead,
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: 255, font: fontName, fontStyle: 'bold', valign: 'middle' },
      styles: { fontSize: 9, font: fontName, overflow: 'linebreak', cellPadding: 2 }, 
      columnStyles: columnStyles,
      margin: { left: 14, right: 14 },
      didParseCell: (data) => {
        if (data.section === 'body' && data.row.index === tableBody.length - 1) { data.cell.styles.fontStyle = 'bold'; }
      }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const displayCurrency = isIndirect ? 'SAR' : 'USD';
    const getValue = (valUSD: number, valSAR: number) => isIndirect ? valSAR : valUSD;

    const renderBoldLine = (startY: number, prefix: string, boldText: string, suffix: string) => {
       doc.setFont(fontName, 'normal');
       doc.text(prefix, 14, startY);
       const w1 = doc.getTextWidth(prefix);
       doc.setFont(fontName, 'bold');
       doc.text(boldText, 14 + w1, startY);
       const w2 = doc.getTextWidth(boldText);
       doc.setFont(fontName, 'normal');
       doc.text(suffix, 14 + w1 + w2, startY);
    };

    if (config.selectedProducts.includes('utd')) {
        const count = config.productInputs['utd'].count || 1;
        const totalGrossUSD = data.yearlyResults.reduce((sum, r) => {
            const bd = r.breakdown.find(x => x.id === 'utd');
            return sum + (bd ? bd.gross : 0);
        }, 0);
        const totalGrossSAR = data.yearlyResults.reduce((sum, r) => {
            const bd = r.breakdown.find(x => x.id === 'utd');
            return sum + (bd ? bd.grossSAR : 0);
        }, 0);
        const acv = getValue(totalGrossUSD, totalGrossSAR) / config.years;
        const monthlyPerUnit = acv / count / 12;
        const valStr = `${displayCurrency} ${monthlyPerUnit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        renderBoldLine(finalY, "Your UTD subscription costs ", valStr, " monthly per physician.");
        finalY += 6;
    }

    if (config.selectedProducts.includes('ld')) {
        const count = config.productInputs['ld'].count || 1;
        const totalGrossUSD = data.yearlyResults.reduce((sum, r) => {
            const bd = r.breakdown.find(x => x.id === 'ld');
            return sum + (bd ? bd.gross : 0);
        }, 0);
        const totalGrossSAR = data.yearlyResults.reduce((sum, r) => {
            const bd = r.breakdown.find(x => x.id === 'ld');
            return sum + (bd ? bd.grossSAR : 0);
        }, 0);
        const acv = getValue(totalGrossUSD, totalGrossSAR) / config.years;
        const monthlyPerUnit = acv / count / 12;
        const valStr = `${displayCurrency} ${monthlyPerUnit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        renderBoldLine(finalY, "Your LXD subscription costs ", valStr, " monthly per bed.");
        finalY += 6;
    }

    finalY += 4; 
    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont(fontName, 'bold');
    doc.text("Terms & Conditions", 14, finalY);
    finalY += 8;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont(fontName, 'normal');
    const terms: string[] = [];
    const statsParts: string[] = [];
    config.selectedProducts.forEach(pid => {
        const p = AVAILABLE_PRODUCTS.find(x => x.id === pid);
        const inp = config.productInputs[pid];
        if(p && inp && inp.count > 0 && p.countLabel) {
            let productName = p.name;
            if (pid === 'utd') productName = 'UpToDate';
            if (pid === 'ld') productName = 'Lexidrug';
            statsParts.push(`${inp.count} ${p.countLabel} for ${productName}`);
        }
    });
    if(statsParts.length > 0) terms.push(`This proposal is based on the following statistics: ${statsParts.join(', ')}.`);
    terms.push("The prices mentioned above are not final and subject to change in case of releasing an official RFP.");
    if (config.years > 1) terms.push("The prices above are tied to a multi-year non-opt-out contract for the same number of years.");
    if (config.channel === ChannelType.DIRECT) terms.push("The price above is exempt from 15% VAT.");
    terms.push("Upon renewing the subscription, a statistics recount will be executed, considering the standard price of the exit year.");
    terms.push("The Internet access is a must for this subscription to be utilized.");
    terms.push("This budgetary proposal is valid for 60-days.");
    terms.push("Integrating UpToDate® or Lexidrug® with your EMR is included in the prices above, even if the EMR changed during the subscription.*");

    terms.forEach(term => {
      if (finalY > 260) {
        doc.addPage();
        renderHeader(false);
        finalY = 55;
      }
      const splitTerm = doc.splitTextToSize(`• ${term}`, 180);
      doc.text(splitTerm, 14, finalY);
      finalY += (splitTerm.length * 5) + 2;
    });

    if (finalY > 260) {
        doc.addPage();
        renderHeader(false);
        finalY = 55;
    }
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const footnote = "* Some EMR providers put additional charges to integrate our solutions, we’re neither responsible nor covering these costs. It has to be discussed with the EMR provider directly.";
    const splitFootnote = doc.splitTextToSize(footnote, 180);
    doc.text(splitFootnote, 14, finalY + 2);
    addFooter(3);
    const filename = customerName 
       ? `Quote_${customerName.replace(/\s+/g,'_')}_${config.dealType}_${new Date().toISOString().slice(0,10)}.pdf`
       : `Quote_${config.dealType}_${new Date().toISOString().slice(0,10)}.pdf`;
    doc.save(filename);
    setIsPdfLoading(false);
  };

  const handleExcelExport = async () => {
    setIsExcelLoading(true);
    
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Pricing Quote');

      // Styles
      const fontStyle = { name: 'Aptos Display', size: 11 };
      
      const headerStyle: Partial<ExcelJS.Style> = {
        font: { ...fontStyle, bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF007AC3' } },
        alignment: { horizontal: 'center', vertical: 'middle' }
      };

      // --- 1. Deal Context ---
      sheet.addRow(['DEAL CONTEXT']).font = { ...fontStyle, bold: true, size: 14 };
      sheet.addRow(['Customer Name', customerName]);
      sheet.addRow(['Rep Name', repName]);
      sheet.addRow(['Deal Type', config.dealType]);
      sheet.addRow(['Channel', config.channel]);
      sheet.addRow(['Duration', `${config.years} Years`]);
      sheet.addRow(['Pricing Method', config.method]);
      sheet.addRow(['Flat Pricing', config.flatPricing ? 'Yes' : 'No']);
      sheet.addRow(['Rounding', config.rounding ? 'Yes' : 'No']);
      sheet.addRow(['Apply WHT', config.applyWHT ? 'Yes' : 'No']);
      
      sheet.addRow([]);

      // --- 2. Product Inputs (Enhanced) ---
      sheet.addRow(['PRODUCT INPUTS']).font = { ...fontStyle, bold: true, size: 14 };
      
      const inputHeaders = ['Product', 'Variant', 'Count', 'Base Discount %'];
      if (config.dealType === DealType.RENEWAL) {
         inputHeaders.push('Expiring Amount (USD)');
         inputHeaders.push('Existing Variant');
         inputHeaders.push('Existing Count');
         inputHeaders.push('DPH (UTD Only)');
         inputHeaders.push('Usage (Auto)');
         inputHeaders.push('Stats Changed?');
      }

      const inputHeaderRow = sheet.addRow(inputHeaders);
      inputHeaderRow.eachCell(cell => {
          cell.style = headerStyle;
      });

      config.selectedProducts.forEach(pid => {
        const p = AVAILABLE_PRODUCTS.find(x => x.id === pid);
        const inp = config.productInputs[pid];
        
        const rowData = [
            p?.name || pid,
            inp.variant,
            inp.count,
            inp.baseDiscount / 100 // Format as % later
        ];

        if (config.dealType === DealType.RENEWAL) {
            rowData.push(inp.expiringAmount || 0);
            rowData.push(inp.existingVariant || '-');
            rowData.push(inp.existingCount || 0);
            
            // DPH & Usage for UTD
            if (pid === 'utd') {
                rowData.push(inp.dph || 0);
                const usage = (inp.dph && inp.dph > 0 && inp.expiringAmount) ? (inp.expiringAmount / inp.dph) : 0;
                rowData.push(usage);
                rowData.push(inp.changeInStats ? 'Yes' : 'No');
            } else {
                rowData.push('-');
                rowData.push('-');
                rowData.push('-');
            }
        }

        const addedRow = sheet.addRow(rowData);
        // Format Discount Column
        addedRow.getCell(4).numFmt = '0.00%';
        
        if (config.dealType === DealType.RENEWAL) {
             addedRow.getCell(5).numFmt = '"$"#,##0.00'; // Expiring
             if (pid === 'utd') {
                 addedRow.getCell(8).numFmt = '"$"#,##0.00'; // DPH
                 addedRow.getCell(9).numFmt = '#,##0'; // Usage
             }
        }
      });

      sheet.addRow([]);

      // --- 3. Rates Configuration (New) ---
      sheet.addRow(['RATES CONFIGURATION']).font = { ...fontStyle, bold: true, size: 14 };
      
      const rateHeaders = ['Metric'];
      config.selectedProducts.forEach(pid => {
         const p = AVAILABLE_PRODUCTS.find(x => x.id === pid);
         rateHeaders.push(`${p?.shortName || p?.name}`);
      });
      const rateHeaderRow = sheet.addRow(rateHeaders);
      rateHeaderRow.eachCell(cell => cell.style = headerStyle);
      
      // Row 1: Annual Increase/Discount Rate
      const structureRateRowData: any[] = [config.method === PricingMethod.MYFPI ? 'Annual FPI %' : 'Annual Discount %'];
      config.selectedProducts.forEach(pid => {
          const rates = config.productRates[pid] || config.rates;
          structureRateRowData.push((rates[0] || 0) / 100);
      });
      const addedRateRow = sheet.addRow(structureRateRowData);
      for(let i = 2; i <= config.selectedProducts.length + 1; i++) {
          addedRateRow.getCell(i).numFmt = '0.00%';
      }
      
      const rateRowNumber = addedRateRow.number;

      // Row 2: Renewal Uplift (if applicable)
      if (config.dealType === DealType.RENEWAL) {
          const upliftRowData: any[] = ['Renewal Uplift %'];
          config.selectedProducts.forEach(pid => {
             const uplift = config.renewalUpliftRates ? (config.renewalUpliftRates[pid] || 0) : 0;
             upliftRowData.push(uplift / 100);
          });
          const addedUpliftRow = sheet.addRow(upliftRowData);
          for(let i = 2; i <= config.selectedProducts.length + 1; i++) {
             addedUpliftRow.getCell(i).numFmt = '0.00%';
          }
      }

      sheet.addRow([]);

      // --- 4. Commercial Schedule (With Formulas) ---
      sheet.addRow(['COMMERCIAL SCHEDULE']).font = { ...fontStyle, bold: true, size: 14 };

      const isIndirect = config.channel !== ChannelType.DIRECT;
      const currency = isIndirect ? 'SAR' : 'USD';
      const currencyFmt = isIndirect ? '"SAR "#,##0' : '"$"#,##0.00';

      const scheduleHeaders = ['Year'];
      config.selectedProducts.forEach(pid => {
          const p = AVAILABLE_PRODUCTS.find(x => x.id === pid);
          scheduleHeaders.push(`${p?.shortName || p?.name} (${currency})`);
      });
      scheduleHeaders.push(`Total (${currency})`);

      if (isIndirect) {
          scheduleHeaders.push('VAT (15%)');
          scheduleHeaders.push('Grand Total (SAR)');
      }

      const scheduleHeaderRow = sheet.addRow(scheduleHeaders);
      scheduleHeaderRow.eachCell(cell => cell.style = headerStyle);

      const startRowIndex = sheet.rowCount + 1;
      let prevRowNumber = 0;

      data.yearlyResults.forEach((r, yearIdx) => {
          const rowData: any[] = [`Year ${r.year}`];
          
          config.selectedProducts.forEach((pid, prodIdx) => {
              const bd = r.breakdown.find(x => x.id === pid);
              const val = isIndirect ? bd?.grossSAR : bd?.gross;
              rowData.push(val || 0);
          });
          
          // Placeholders
          rowData.push(null); // Total
          if (isIndirect) { rowData.push(null); rowData.push(null); }

          const addedRow = sheet.addRow(rowData);
          const currentRowNumber = addedRow.number;

          if (!config.flatPricing && yearIdx > 0 && prevRowNumber > 0) {
               config.selectedProducts.forEach((pid, prodIdx) => {
                   const colIndex = prodIdx + 2; 
                   const colLetter = getColLetter(colIndex);
                   const rateColLetter = getColLetter(colIndex); 
                   
                   if (config.channel === ChannelType.DIRECT) {
                       const formula = `${colLetter}${prevRowNumber}*(1+${rateColLetter}${rateRowNumber})`;
                       addedRow.getCell(colIndex).value = {
                           formula: formula,
                           result: rowData[colIndex - 1] 
                       };
                   }
               });
          }

          const lastProdColLetter = getColLetter(1 + config.selectedProducts.length);
          const totalColIndex = 1 + config.selectedProducts.length + 1;
          addedRow.getCell(totalColIndex).value = {
              formula: `SUM(B${currentRowNumber}:${lastProdColLetter}${currentRowNumber})`,
              result: isIndirect ? r.grossSAR : r.grossUSD
          };

          if (isIndirect) {
             const totalColLetter = getColLetter(totalColIndex);
             const vatColIndex = totalColIndex + 1;
             addedRow.getCell(vatColIndex).value = {
                 formula: `${totalColLetter}${currentRowNumber}*0.15`,
                 result: r.vatSAR
             };
             const vatColLetter = getColLetter(vatColIndex);
             const grandTotalColIndex = vatColIndex + 1;
             addedRow.getCell(grandTotalColIndex).value = {
                 formula: `${totalColLetter}${currentRowNumber}+${vatColLetter}${currentRowNumber}`,
                 result: r.grandTotalSAR
             };
          }

          for (let c = 2; c <= scheduleHeaders.length; c++) {
              addedRow.getCell(c).numFmt = currencyFmt;
          }
          
          prevRowNumber = currentRowNumber;
      });

      const endRowIndex = sheet.rowCount;
      const totalRow = sheet.addRow(['TOTAL']);
      totalRow.font = { ...fontStyle, bold: true };

      for (let c = 2; c <= scheduleHeaders.length; c++) {
          const colLetter = getColLetter(c);
          totalRow.getCell(c).value = {
              formula: `SUM(${colLetter}${startRowIndex}:${colLetter}${endRowIndex})`,
              result: 0
          };
          totalRow.getCell(c).numFmt = currencyFmt;
      }

      sheet.addRow([]);

      // --- 5. Metrics ---
      sheet.addRow(['KEY METRICS']).font = { ...fontStyle, bold: true, size: 14 };
      const tcvVal = isIndirect ? data.totalGrossSAR : data.totalGrossUSD;
      sheet.addRow(['Customer TCV', tcvVal]).getCell(2).numFmt = currencyFmt;
      sheet.addRow(['Customer ACV (USD)', data.acvUSD]).getCell(2).numFmt = '"$"#,##0.00';

      if (config.dealType === DealType.RENEWAL) {
          sheet.addRow(['Renewal Base ACV (USD)', data.renewalBaseACV]).getCell(2).numFmt = '"$"#,##0.00';
          sheet.addRow(['Upsell ACV (USD)', data.upsellACV]).getCell(2).numFmt = '"$"#,##0.00';
      }

      // Column Widths and Font Application
      const maxColCount = sheet.columnCount;
      for (let i = 1; i <= maxColCount; i++) {
         sheet.getColumn(i).width = 22;
      }
      sheet.getColumn(1).width = 25;

      // Apply font to all cells that don't have explicit style
      sheet.eachRow((row) => {
         row.eachCell((cell) => {
             if (!cell.font) {
                 cell.font = fontStyle;
             }
         });
      });

      // Save
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      const filename = customerName 
       ? `Quote_${customerName.replace(/\s+/g,'_')}_${config.dealType}_${new Date().toISOString().slice(0,10)}.xlsx`
       : `Quote_${config.dealType}_${new Date().toISOString().slice(0,10)}.xlsx`;
      link.download = filename;
      link.click();

    } catch (e) {
      console.error('Excel Gen Error', e);
      alert('Failed to generate Excel file.');
    } finally {
      setIsExcelLoading(false);
    }
  };

  // Helper for Excel Columns (1->A, 2->B...)
  const getColLetter = (colIndex: number) => {
      let temp, letter = '';
      while (colIndex > 0) {
          temp = (colIndex - 1) % 26;
          letter = String.fromCharCode(temp + 65) + letter;
          colIndex = (colIndex - temp - 1) / 26;
      }
      return letter;
  };

  return (
    <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Customer Name</label>
          <input 
            type="text" 
            placeholder="Enter Customer Name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 font-sans"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Rep Name</label>
          <input 
            type="text" 
            placeholder="Enter Rep Name"
            value={repName}
            onChange={(e) => setRepName(e.target.value)}
            className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 font-sans"
          />
        </div>
        <div>
           <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">PDF Font</label>
           <div className="flex items-center space-x-2">
             <select
               value={selectedFont}
               onChange={(e) => setSelectedFont(e.target.value as FontType)}
               className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white font-sans"
             >
               <option value="Inter">Inter (Sans)</option>
               <option value="FiraSans">Fira Sans</option>
             </select>
             {isFontLoading && (
               <span className="text-xs text-blue-500 animate-pulse">Loading...</span>
             )}
           </div>
        </div>
      </div>
      <div className="flex space-x-4">
        <button 
          onClick={handleExcelExport}
          disabled={isExcelLoading}
          className={`flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${isExcelLoading ? 'bg-green-400' : 'bg-green-600 hover:bg-green-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 font-sans`}
        >
          {isExcelLoading ? 'Generating...' : 'Export Excel (.xlsx)'}
        </button>
        <button 
          onClick={handlePDFExport}
          disabled={isPdfLoading || isFontLoading}
          className={`flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${isPdfLoading || isFontLoading ? 'bg-red-400' : 'bg-red-600 hover:bg-red-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 font-sans`}
        >
          {isPdfLoading ? 'Processing...' : (isFontLoading ? 'Loading Fonts...' : 'Export PDF Quote')}
        </button>
      </div>
    </div>
  );
};
