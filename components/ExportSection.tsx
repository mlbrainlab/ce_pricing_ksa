
import React, { useState, useEffect } from 'react';
import { CalculationOutput, DealConfiguration, ChannelType } from '../types';
import { AVAILABLE_PRODUCTS } from '../constants';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
          // Don't alert immediately on load, just log. Alert only on PDF gen attempt if missing.
        }
      } catch (e) {
        console.error(`Exception loading ${selectedFont}:`, e);
      } finally {
        setIsFontLoading(false);
      }
    };

    loadSelectedFont();
  }, [selectedFont]); // Only run when selectedFont changes

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
    const currentFontData = fontCache[selectedFont];
    if (!currentFontData.regular || !currentFontData.bold) {
      alert("Fonts are not loaded. Please wait or check your connection.");
      return;
    }

    setIsPdfLoading(true);
    const doc = new jsPDF();
    
    // Wolters Kluwer Blue
    const primaryColor: [number, number, number] = [0, 122, 195]; 
    const docDate = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    const refId = `REF-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`;

    // --- 1. Load Resources ---
    let wkLogoData = "";
    let samirLogoData = "";
    
    // Add Fonts
    doc.addFileToVFS('Custom-Regular.ttf', currentFontData.regular);
    doc.addFileToVFS('Custom-Bold.ttf', currentFontData.bold);
    doc.addFont('Custom-Regular.ttf', 'CustomFont', 'normal');
    doc.addFont('Custom-Bold.ttf', 'CustomFont', 'bold');
    
    const fontName = 'CustomFont';
    doc.setFont(fontName);

    try {
        wkLogoData = await getBase64FromUrl(WK_LOGO_URL);
    } catch (e) { console.log('WK Logo fail', e) }

    if (config.channel !== ChannelType.DIRECT) {
        try {
            samirLogoData = await getBase64FromUrl(SAMIR_LOGO_URL);
        } catch (e) { console.log('Partner Logo fail', e) }
    }

    const addFooter = (pageNum: number) => {
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      const footerText = `Wolters Kluwer | ${docDate} | ${refId} | ${customerName || 'Draft Quote'}`;
      doc.text(footerText, 14, 285);
      doc.text(`Page ${pageNum}`, 190, 285);
    };

    // --- Header Render Function ---
    const renderHeader = (isCover: boolean) => {
       const pageWidth = doc.internal.pageSize.getWidth(); // 210 normally

       if (isCover) {
          // Full Blue Top Half
          doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          doc.rect(0, 0, pageWidth, 150, 'F'); 
          
          // Proprietary & Confidential label
          doc.setFontSize(10);
          doc.setTextColor(255, 255, 255);
          doc.setFont(fontName, 'bold');
          doc.text("Proprietary & Confidential", pageWidth - 14, 28, { align: 'right' });
       } else {
          // Standard Header Bar
          doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          doc.rect(0, 0, pageWidth, 30, 'F'); 
       }
       
       const xOffset = 14;

       // Add WK Logo (Left)
       if (wkLogoData) {
         if (isCover) {
             // White box behind WK logo on blue bg for visibility
             doc.setFillColor(255, 255, 255);
             doc.roundedRect(xOffset - 2, 8, 54, 14, 1, 1, 'F');
         }
         doc.addImage(wkLogoData, 'PNG', xOffset, 10.5, 50, 9); 
       } else {
         doc.setFontSize(14);
         doc.setTextColor(255, 255, 255);
         doc.text("Wolters Kluwer", xOffset, 20);
       }

       // Add Partner Logo (Right) if Indirect
       if (config.channel !== ChannelType.DIRECT && samirLogoData) {
         const logoW = 50;
         const logoH = 10; 
         const margin = 14;
         const logoX = pageWidth - margin - logoW; // Explicitly calculated right align
         
         if (isCover) {
             // White box behind Partner logo
             doc.setFillColor(255, 255, 255);
             doc.roundedRect(logoX - 2, 8, logoW + 4, 14, 1, 1, 'F');
         }
         doc.addImage(samirLogoData, 'PNG', logoX, 10, logoW, logoH);
       }
    };

    // --- PAGE 1: COVER ---
    renderHeader(true);
    
    // Background (Bottom Half)
    doc.setFillColor(245, 245, 245);
    doc.rect(0, 150, 210, 147, 'F'); 
    
    // Title inside Blue Area
    doc.setFontSize(32);
    doc.setTextColor(255, 255, 255);
    doc.setFont(fontName, 'bold');
    doc.text("Wolters Kluwer", 105, 100, { align: 'center' });

    doc.setFontSize(18);
    doc.setFont(fontName, 'normal');
    doc.text("Budgetary Commercial Proposal", 105, 115, { align: 'center' });

    // --- Product Info Section (Below Blue, on Gray) ---
    let currentY = 170;
    doc.setTextColor(60, 60, 60);

    const hasUTD = config.selectedProducts.includes('utd');
    const hasLD = config.selectedProducts.includes('ld');

    if (hasUTD) {
        const variant = config.productInputs['utd']?.variant || '';
        let title = "UpToDate\u00AE"; // Default
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
            if (variant.includes('IPE')) {
                subHeading = "including Formulink\u2122 and Integrated Patient Education";
            } else {
                subHeading = "including Formulink\u2122";
            }
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

    // Bottom Left Info (Footer Area of Page 1)
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.setFont(fontName, 'normal');
    doc.text(`Customer: ${customerName || 'N/A'}`, 14, 265);
    doc.text(`Prepared by: ${repName || 'N/A'}`, 14, 270);
    doc.text(`Date: ${docDate}`, 14, 275);
    doc.text(`Ref: ${refId}`, 14, 280);

    // Copyright Footer for Page 1
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`©${new Date().getFullYear()} UpToDate, Inc. and its affiliates and/or licensors. All rights reserved.`, 14, 290);

    // --- PAGE 2: CONFIDENTIALITY ---
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

    // --- PAGE 3: PRICING DETAILS & TERMS ---
    doc.addPage();
    renderHeader(false);
    
    doc.setFontSize(16);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont(fontName, 'bold');
    doc.text("Pricing Details", 14, 45);

    // --- Table Configuration based on Channel ---
    let tableHead: string[][] = [];
    let tableBody: string[][] = [];
    
    const isIndirect = config.channel !== ChannelType.DIRECT;

    const productColIndices: Record<string, number> = {};
    config.selectedProducts.forEach((pid, idx) => {
        productColIndices[pid] = 1 + idx;
    });

    const totalStartIndex = 1 + config.selectedProducts.length;
    const columnStyles: any = {};

    // UTD Styling
    if (productColIndices['utd'] !== undefined) {
        columnStyles[productColIndices['utd']] = { fillColor: [220, 252, 231] };
    }
    // LXD Styling
    if (productColIndices['ld'] !== undefined) {
        columnStyles[productColIndices['ld']] = { fillColor: [224, 242, 254] };
    }

    // Totals Styling (Columns)
    columnStyles[totalStartIndex] = { fontStyle: 'bold' };
    if (isIndirect) {
        columnStyles[totalStartIndex + 2] = { fontStyle: 'bold' };
    }

    if (isIndirect) {
      // INDIRECT
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
        return [
           `Year ${r.year}`,
           ...pValues,
           formatMoney(r.grossSAR, 'SAR'),
           formatMoney(r.vatSAR, 'SAR'),
           formatMoney(r.grandTotalSAR, 'SAR'),
        ];
      });

      const productTotalsSAR = config.selectedProducts.map(pid => {
          const total = data.yearlyResults.reduce((sum, r) => {
              const bd = r.breakdown.find(x => x.id === pid);
              return sum + (bd ? bd.grossSAR : 0);
          }, 0);
          return formatMoney(total, 'SAR');
      });

      const totalRow = [
        'TOTAL',
        ...productTotalsSAR,
        formatMoney(data.totalGrossSAR, 'SAR'),
        formatMoney(data.totalVatSAR, 'SAR'),
        formatMoney(data.totalGrandTotalSAR, 'SAR'),
      ];
      tableBody.push(totalRow);

    } else {
      // DIRECT
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
        return [
           `Year ${r.year}`,
           ...pValues,
           formatMoney(r.grossUSD, 'USD'),
        ];
      });

      const productTotalsUSD = config.selectedProducts.map(pid => {
          const total = data.yearlyResults.reduce((sum, r) => {
              const bd = r.breakdown.find(x => x.id === pid);
              return sum + (bd ? bd.gross : 0);
          }, 0);
          return formatMoney(total, 'USD');
      });

      const totalRow = [
        'TOTAL',
        ...productTotalsUSD,
        formatMoney(data.totalGrossUSD, 'USD'),
      ];
      tableBody.push(totalRow);
    }

    autoTable(doc, {
      startY: 55, 
      head: tableHead,
      body: tableBody,
      theme: 'grid',
      headStyles: { 
          fillColor: primaryColor, 
          textColor: 255, 
          font: fontName, 
          fontStyle: 'bold', 
          valign: 'middle' 
      },
      styles: { 
          fontSize: 9, 
          font: fontName, 
          overflow: 'linebreak',
          cellPadding: 2
      }, 
      columnStyles: columnStyles,
      margin: { left: 14, right: 14 },
      didParseCell: (data) => {
        // Bold the entire last row (Totals)
        if (data.section === 'body' && data.row.index === tableBody.length - 1) {
            data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 10;

    // --- Monthly Cost Analysis (with Bold parts) ---
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

    finalY += 4; // Spacing before Terms

    // --- Terms & Conditions ---
    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont(fontName, 'bold');
    doc.text("Terms & Conditions", 14, finalY);
    
    finalY += 8;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont(fontName, 'normal');

    const terms: string[] = [];
    
    // Generate statistics string with full names
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
    if(statsParts.length > 0) {
        terms.push(`This proposal is based on the following statistics: ${statsParts.join(', ')}.`);
    }

    terms.push("The prices mentioned above are not final and subject to change in case of releasing an official RFP.");

    if (config.years > 1) {
        terms.push("The prices above are tied to a multi-year non-opt-out contract for the same number of years.");
    }

    if (config.channel === ChannelType.DIRECT) {
        terms.push("The price above is exempt from 15% VAT.");
    }

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

    // Footnote
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

  const handleExcelExport = () => {
    // Helper to sanitize CSV fields
    const q = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
    
    const contextRows = [
      ['Customer Name', q(customerName)],
      ['Rep Name', q(repName)],
      ['Deal Type', q(config.dealType)],
      ['Channel', q(config.channel)],
      ['Duration (Years)', config.years],
      ['Pricing Method', q(config.method)],
      ['Currency Display', q(data.currencyToDisplay)],
      []
    ];

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
    
    const productTotals = config.selectedProducts.map(pid => {
        const total = data.yearlyResults.reduce((sum, r) => {
            const bd = r.breakdown.find(x => x.id === pid);
            return sum + (bd ? bd.gross : 0);
        }, 0);
        return total.toFixed(2);
    });

    const totalsRow = [
      'TOTAL',
      ...productTotals,
      data.totalGrossUSD.toFixed(2),
      data.totalGrossSAR.toFixed(0),
      data.totalVatSAR.toFixed(0),
      data.totalGrandTotalSAR.toFixed(0),
    ];

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
    
    if (config.channel !== ChannelType.DIRECT) {
       metricsRows.push([]);
       metricsRows.push(['Product', 'Net Total (USD)']);
       config.selectedProducts.forEach(pid => {
         const p = AVAILABLE_PRODUCTS.find(x => x.id === pid);
         metricsRows.push([p?.shortName || pid, data.productNetTotals[pid].toFixed(2)]);
       });
    }

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
            className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Rep Name</label>
          <input 
            type="text" 
            placeholder="Enter Rep Name"
            value={repName}
            onChange={(e) => setRepName(e.target.value)}
            className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
          />
        </div>
        <div>
           <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">PDF Font</label>
           <div className="flex items-center space-x-2">
             <select
               value={selectedFont}
               onChange={(e) => setSelectedFont(e.target.value as FontType)}
               className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
          className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          Export Excel (.csv)
        </button>
        <button 
          onClick={handlePDFExport}
          disabled={isPdfLoading || isFontLoading}
          className={`flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${isPdfLoading || isFontLoading ? 'bg-red-400' : 'bg-red-600 hover:bg-red-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}
        >
          {isPdfLoading ? 'Processing...' : (isFontLoading ? 'Loading Fonts...' : 'Export PDF Quote')}
        </button>
      </div>
    </div>
  );
};
