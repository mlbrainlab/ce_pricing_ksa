
import React, { useState } from 'react';
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
const WK_LOGO_URL = "https://wsrv.nl/?url=cdn.wolterskluwer.io/wk/jumpstart-v3-assets/0.x.x/logo/large.svg&output=png";
// Use wsrv.nl as a reliable image proxy/resizer that handles CORS headers correctly
const SAMIR_LOGO_URL = "https://wsrv.nl/?url=samirgroup.com/wp-content/uploads/2021/05/logo.png&output=png";

// Reliable Font URLs
const FONT_URLS = {
  Inter: {
    regular: "https://raw.githubusercontent.com/zingrx/fonts_inter_ttf/refs/heads/main/ttf/Inter-Regular.ttf",
    bold: "https://raw.githubusercontent.com/zingrx/fonts_inter_ttf/refs/heads/main/ttf/Inter-Bold.ttf"
  },
  FiraSans: {
    regular: "https://raw.githubusercontent.com/google/fonts/main/ofl/firasans/FiraSans-Regular.ttf",
    bold: "https://raw.githubusercontent.com/google/fonts/main/ofl/firasans/FiraSans-Bold.ttf"
  }
};

type FontType = 'Inter' | 'FiraSans';

interface SiteBreakdownItem {
  id: string; // unique id for list management
  name: string;
  counts: Record<string, number>; // productId -> count
}

export const ExportSection: React.FC<ExportSectionProps> = ({ data, config }) => {
  const [customerName, setCustomerName] = useState('');
  const [repName, setRepName] = useState('');
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isExcelLoading, setIsExcelLoading] = useState(false);
  
  // Font State - Default to FiraSans as requested
  const [selectedFont, setSelectedFont] = useState<FontType>('FiraSans');
  const [fontCache, setFontCache] = useState<Record<FontType, { regular: string | null, bold: string | null }>>({
    Inter: { regular: null, bold: null },
    FiraSans: { regular: null, bold: null }
  });
  const [isFontLoading, setIsFontLoading] = useState(false);

  // PDF Options
  const [showMonthlyCost, setShowMonthlyCost] = useState(true);
  const [showTotals, setShowTotals] = useState(true);
  const [showEmrIntegration, setShowEmrIntegration] = useState(true); // Default true for EMR term

  // Sites Logic
  const [hasDesignatedSites, setHasDesignatedSites] = useState(false);
  const [designatedSites, setDesignatedSites] = useState('');
  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
  
  // Site Breakdown Logic
  const [isBreakdownPerSite, setIsBreakdownPerSite] = useState(false);
  const [showSitesOnly, setShowSitesOnly] = useState(false); // New state for showing sites only
  const [siteBreakdown, setSiteBreakdown] = useState<SiteBreakdownItem[]>([]);
  const [bulkPasteText, setBulkPasteText] = useState(''); // State for bulk pasting

  // ... (existing code)

  // Function to process bulk paste
  const handleBulkPaste = () => {
    const lines = bulkPasteText.split('\n').filter(line => line.trim() !== '');
    const newSites: SiteBreakdownItem[] = lines.map((line, index) => ({
      id: Date.now().toString() + index,
      name: line.trim(),
      counts: {} // Counts still need to be filled manually
    }));
    
    setSiteBreakdown(prev => [...prev, ...newSites]);
    setBulkPasteText(''); // Clear text area
  };

  // ... (existing code)

  const handlePDFExport = async () => {
    setIsPdfLoading(true);
    const doc = new jsPDF();
    const fontName = selectedFont;
    const isIndirect = config.channel !== ChannelType.DIRECT;
    const displayCurrency = isIndirect ? 'SAR' : 'USD';
    
    // Font Loading Logic
    try {
        let regularFontB64 = fontCache[fontName].regular;
        let boldFontB64 = fontCache[fontName].bold;

        if (!regularFontB64 || !boldFontB64) {
             setIsFontLoading(true);
             const [regBlob, boldBlob] = await Promise.all([
                 fetch(FONT_URLS[fontName].regular).then(res => res.blob()),
                 fetch(FONT_URLS[fontName].bold).then(res => res.blob())
             ]);

             const blobToBase64 = (blob: Blob) => new Promise<string>((resolve) => {
                 const reader = new FileReader();
                 reader.onloadend = () => resolve(reader.result as string);
                 reader.readAsDataURL(blob);
             });

             regularFontB64 = (await blobToBase64(regBlob)).split(',')[1];
             boldFontB64 = (await blobToBase64(boldBlob)).split(',')[1];

             setFontCache(prev => ({
                 ...prev,
                 [fontName]: { regular: regularFontB64, bold: boldFontB64 }
             }));
             setIsFontLoading(false);
        }

        doc.addFileToVFS(`${fontName}-Regular.ttf`, regularFontB64!);
        doc.addFont(`${fontName}-Regular.ttf`, fontName, 'normal');
        doc.addFileToVFS(`${fontName}-Bold.ttf`, boldFontB64!);
        doc.addFont(`${fontName}-Bold.ttf`, fontName, 'bold');
    } catch (e) {
        console.error("Font loading error", e);
    }

    const primaryColor: [number, number, number] = [0, 122, 195];
    const docDate = new Date().toLocaleDateString();
    const refId = `REF-${Date.now().toString().slice(-6)}`;
    let finalY = 60;

    const renderHeader = (_isFirstPage: boolean) => {
        // Blue Header Background
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        if (_isFirstPage) {
            doc.rect(0, 0, 210, 135, 'F'); // Large blue background for first page
        } else {
            doc.rect(0, 0, 210, 32, 'F'); // Standard header for other pages
        }

        try {
            // Add WK Logo
            doc.addImage(WK_LOGO_URL, 'PNG', 14, 10, 40, 10);
            
            // Add Samir Logo if Indirect
            if (isIndirect) {
                doc.addImage(SAMIR_LOGO_URL, 'PNG', 160, 8, 35, 14);
            }
        } catch (e) {
            console.warn("Logo load error", e);
        }
        
        doc.setFontSize(12);
        doc.setTextColor(255, 255, 255);
        // doc.text("Wolters Kluwer Health", 14, 25); // Removed as requested
    };

    const addFooter = (pageNumber: number) => {
        const pageHeight = doc.internal.pageSize.height || 297;
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${pageNumber}`, 196, pageHeight - 10, { align: 'right' });
        doc.text("Confidential - Wolters Kluwer Health", 14, pageHeight - 10);
    };

    const formatMoney = (amount: number, currency: string) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
    };

    // Initial Header
    renderHeader(true);
    doc.setFontSize(18);
    doc.setFont(fontName, 'normal');
    doc.setTextColor(255, 255, 255); // White text for title on blue background
    const proposalTitle = config.dealType === DealType.RENEWAL 
        ? "Budgetary Commercial Proposal [Renewal]" 
        : "Budgetary Commercial Proposal";
    doc.text(proposalTitle, 105, 115, { align: 'center' });
  // ...

    // Removed duplicate Designated Sites logic

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
    // Header rendered in loop at end
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
    // Footer added dynamically at the end

    doc.addPage();
    // Header rendered in loop at end
    doc.setFontSize(16);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont(fontName, 'bold');
    doc.text("Pricing Details", 14, 45);

    let tableHead: string[][] = [];
    let tableBody: string[][] = [];
    // isIndirect already defined
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
      
      // Totals Row - Conditionally Added
      if (showTotals) {
          const productTotalsSAR = config.selectedProducts.map(pid => {
              const total = data.yearlyResults.reduce((sum, r) => {
                  const bd = r.breakdown.find(x => x.id === pid);
                  return sum + (bd ? bd.grossSAR : 0);
              }, 0);
              return formatMoney(total, 'SAR');
          });
          tableBody.push(['TOTAL', ...productTotalsSAR, formatMoney(data.totalGrossSAR, 'SAR'), formatMoney(data.totalVatSAR, 'SAR'), formatMoney(data.totalGrandTotalSAR, 'SAR')]);
      }
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
      
      // Totals Row - Conditionally Added
      if (showTotals) {
          const productTotalsUSD = config.selectedProducts.map(pid => {
              const total = data.yearlyResults.reduce((sum, r) => {
                  const bd = r.breakdown.find(x => x.id === pid);
                  return sum + (bd ? bd.gross : 0);
              }, 0);
              return formatMoney(total, 'USD');
          });
          tableBody.push(['TOTAL', ...productTotalsUSD, formatMoney(data.totalGrossUSD, 'USD')]);
      }
    }

    autoTable(doc, {
      startY: 55, 
      head: tableHead,
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: 255, font: fontName, fontStyle: 'bold', valign: 'middle' },
      styles: { fontSize: 9, font: fontName, overflow: 'linebreak', cellPadding: 2 }, 
      columnStyles: columnStyles,
      margin: { top: 35, left: 14, right: 14 },
      didParseCell: (data) => {
        // Only bold the last row if showTotals is true
        if (showTotals && data.section === 'body' && data.row.index === tableBody.length - 1) { 
            data.cell.styles.fontStyle = 'bold'; 
        }
      }
    });

    finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    // displayCurrency already defined
    const getValue = (valUSD: number, valSAR: number) => isIndirect ? valSAR : valUSD;

    // Helper for Bold/Regular mixed text line
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

    // --- OPERATING STATISTICS SECTION ---
    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont(fontName, 'bold');
    doc.text("Operating Statistics", 14, finalY);
    finalY += 8;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    // Order Requested: 1. Stats Line, 2. Designated Sites, 3. Monthly Cost

    // 1. Stats Line (Moved to top)
    const statsParts: string[] = [];
    config.selectedProducts.forEach(pid => {
        const p = AVAILABLE_PRODUCTS.find(x => x.id === pid);
        const inp = config.productInputs[pid];
        if(p && inp) {
            let productName = p.name;
            if (pid === 'utd') productName = 'UpToDate';
            if (pid === 'ld') productName = 'Lexidrug';
            
            // Text Replacement Logic: HC->clinicians, BC->active beds
            let countLabelText = p.countLabel;
            if (p.countLabel === 'HC') countLabelText = 'clinicians';
            if (p.countLabel === 'BC') countLabelText = 'active beds';
            
            // Override for Lexidrug Seats variant
            if (pid === 'ld' && inp.variant && inp.variant.includes('Seats')) {
                countLabelText = 'seats';
            }

            // STATS LOGIC:
            const statsToPrint = inp.count > 0 ? inp.count : (inp.existingCount || 0);

            if (statsToPrint > 0) {
               // Apply locale string formatting
               statsParts.push(`${statsToPrint.toLocaleString('en-US')} ${countLabelText} for ${productName}`);
            }
        }
    });
    
    if(statsParts.length > 0) {
        doc.setFont(fontName, 'normal');
        const statsText = `This proposal is based on the following statistics for ${customerName}: ${statsParts.join(', ')}.`;
        const splitStats = doc.splitTextToSize(statsText, 180);
        doc.text(splitStats, 14, finalY);
        finalY += (splitStats.length * 5) + 4;
    }

    // 2. Designated Sites (Moved to middle)
    if (hasDesignatedSites) {
        if (isBreakdownPerSite && siteBreakdown.length > 0) {
            // BREAKDOWN TABLE LOGIC
            doc.setFont(fontName, 'bold');
            doc.text("Price Breakdown per Site:", 14, finalY);
            finalY += 6;
            
            // Table Headers
            const siteHeaders = ['Site Name'];
            config.selectedProducts.forEach(pid => {
                const p = AVAILABLE_PRODUCTS.find(x => x.id === pid);
                siteHeaders.push(`${p?.shortName || p?.name} Count`);
            });
            
            if (!showSitesOnly) {
                siteHeaders.push(`Est. Annual Cost (${displayCurrency})`);
            }

            const siteBody = siteBreakdown.map(site => {
                const row = [site.name];
                let siteTotalCost = 0;

                config.selectedProducts.forEach(pid => {
                    const count = site.counts[pid] || 0;
                    row.push(count.toLocaleString());
                    
                    // Calculate Prorated Cost
                    if (!showSitesOnly) {
                        const totalCount = config.productInputs[pid]?.count || 1; 
                        const productTotalNet = data.productNetTotals[pid] / config.years; 
                        
                        if (totalCount > 0) {
                            const siteProductCost = (count / totalCount) * productTotalNet;
                            siteTotalCost += siteProductCost;
                        }
                    }
                });

                if (!showSitesOnly) {
                    const displayCost = isIndirect ? (siteTotalCost * 3.76) : siteTotalCost; 
                    row.push(formatMoney(displayCost, displayCurrency));
                }
                return row;
            });

            autoTable(doc, {
                startY: finalY,
                head: [siteHeaders],
                body: siteBody,
                theme: 'grid',
                headStyles: { fillColor: [240, 240, 240], textColor: 0, font: fontName, fontStyle: 'bold' },
                styles: { fontSize: 9, font: fontName, overflow: 'linebreak', cellPadding: 2 },
                margin: { top: 35, left: 14, right: 14 },
            });
            
            finalY = (doc as any).lastAutoTable.finalY + 8;

        } else if (designatedSites.trim().length > 0) {
            // STANDARD LIST LOGIC - Two Column Table
            doc.setFont(fontName, 'bold');
            doc.text("Sites included in the above pricing:", 14, finalY);
            finalY += 6;
            
            const sites = designatedSites.split('\n').filter(s => s.trim().length > 0);
            const tableBody = [];
            for (let i = 0; i < sites.length; i += 2) {
                const row = [
                    `${i + 1}. ${sites[i].trim()}`,
                    sites[i + 1] ? `${i + 2}. ${sites[i + 1].trim()}` : ''
                ];
                tableBody.push(row);
            }

            autoTable(doc, {
                startY: finalY,
                body: tableBody,
                theme: 'plain', // Clean look
                styles: { 
                    fontSize: 9, 
                    font: fontName, 
                    cellPadding: 3,
                    lineColor: [220, 220, 220], // Light grey borders
                    lineWidth: 0.1,
                },
                columnStyles: {
                    0: { cellWidth: 90 },
                    1: { cellWidth: 90 }
                },
                margin: { top: 35, left: 14, right: 14 },
                didDrawCell: (data) => {
                    // Draw border for every cell to ensure grid look
                    doc.setDrawColor(220, 220, 220);
                    doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height);
                }
            });
            
            finalY = (doc as any).lastAutoTable.finalY + 8;
        }
    }

    // 3. Monthly Cost (Moved to bottom)
    if (showMonthlyCost) {
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
            renderBoldLine(finalY, "Your UpToDate subscription costs ", valStr, " monthly per physician.");
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
            renderBoldLine(finalY, "Your Lexidrug subscription costs ", valStr, " monthly per bed.");
            finalY += 6;
        }
        
        // Add a small gap after monthly costs if they exist
        if (config.selectedProducts.includes('utd') || config.selectedProducts.includes('ld')) {
            finalY += 4;
        }
    }

    // --- TERMS & CONDITIONS SECTION ---
    finalY += 4; 
    
    // Check page break before starting new section
    if (finalY > 250) {
        doc.addPage();
        // Header rendered in loop at end
        finalY = 55;
    }

    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont(fontName, 'bold');
    doc.text("Terms & Conditions", 14, finalY);
    finalY += 8;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont(fontName, 'normal');
    
    const terms: string[] = [];
    
    terms.push("The prices mentioned above are not final and subject to change in case of releasing an official RFP.");
    if (config.years > 1) terms.push("The prices above are tied to a multi-year non-opt-out contract for the same number of years.");
    if (config.channel === ChannelType.DIRECT) terms.push("The price above is exempt from 15% VAT.");
    terms.push("Upon renewing the subscription, a statistics recount will be executed, considering the standard price of the exit year.");
    terms.push("The Internet access is a must for this subscription to be utilized.");
    terms.push("This budgetary proposal is valid for 60-days.");
    
    // Conditional EMR Term
    if (showEmrIntegration) {
        terms.push("Integrating UpToDate® or Lexidrug® with your EMR is included in the prices above, even if the EMR changed during the subscription.*");
    }

    terms.forEach(term => {
      if (finalY > 260) {
        doc.addPage();
        // Header rendered in loop at end
        finalY = 55;
      }
      const splitTerm = doc.splitTextToSize(`• ${term}`, 180);
      doc.text(splitTerm, 14, finalY);
      finalY += (splitTerm.length * 5) + 2;
    });

    if (finalY > 260) {
        doc.addPage();
        // Header rendered in loop at end
        finalY = 55;
    }
    
    // Conditional Footnote
    if (showEmrIntegration) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        const footnote = "* Some EMR providers put additional charges to integrate our solutions, we’re neither responsible nor covering these costs. It has to be discussed with the EMR provider directly.";
        const splitFootnote = doc.splitTextToSize(footnote, 180);
        doc.text(splitFootnote, 14, finalY + 2);
    }

    // Add Headers and Footers to all pages (except Page 1 which has custom layout)
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        if (i > 1) {
            renderHeader(false);
            addFooter(i);
        }
    }

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
          
          config.selectedProducts.forEach((pid) => { // Removed unused prodIdx
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
               config.selectedProducts.forEach((_, prodIdx) => { // Replaced unused pid with _
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
          if (config.channel !== ChannelType.DIRECT) {
              sheet.addRow(['Net Renewal Base ACV (USD)', data.netRenewalBaseACV]).getCell(2).numFmt = '"$"#,##0.00';
          }
          sheet.addRow(['Upsell ACV (USD)', data.upsellACV]).getCell(2).numFmt = '"$"#,##0.00';
          if (config.channel !== ChannelType.DIRECT) {
              sheet.addRow(['Net Upsell ACV (USD)', data.netUpsellACV]).getCell(2).numFmt = '"$"#,##0.00';
          }
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

  const handleSiteCheckboxChange = (checked: boolean) => {
    setHasDesignatedSites(checked);
    if (checked) {
      setIsSiteModalOpen(true);
    }
  };

  return (
    <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
      
      {/* Site Entry Modal */}
      {isSiteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6 border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Designated Sites</h3>
            
            <div className="mb-4 flex items-center justify-between">
                <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                        type="checkbox"
                        checked={isBreakdownPerSite}
                        onChange={(e) => {
                            setIsBreakdownPerSite(e.target.checked);
                            if (e.target.checked && siteBreakdown.length === 0) {
                                // Initialize with one empty site
                                setSiteBreakdown([{ id: Date.now().toString(), name: '', counts: {} }]);
                            }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Price Breakdown per Site</span>
                </label>
                
                {isBreakdownPerSite && (
                    <label className="flex items-center space-x-2 cursor-pointer ml-4">
                        <input 
                            type="checkbox"
                            checked={showSitesOnly}
                            onChange={(e) => setShowSitesOnly(e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Show Sites Only (No Price)</span>
                    </label>
                )}
            </div>

            {!isBreakdownPerSite ? (
                <>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Enter the names of the sites included in this pricing (one per line). These will be listed in the PDF.
                    </p>
                    <textarea
                    className="w-full h-40 p-3 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-sans text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Site 1&#10;Site 2&#10;Site 3"
                    value={designatedSites}
                    onChange={(e) => setDesignatedSites(e.target.value)}
                    />
                </>
            ) : (
                <div className="space-y-4">
                    {/* Bulk Paste Section */}
                    <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Bulk Add Sites (Paste names, one per line):
                        </label>
                        <div className="flex space-x-2">
                            <textarea
                                className="flex-grow h-20 p-2 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                                placeholder="Paste site names here..."
                                value={bulkPasteText}
                                onChange={(e) => setBulkPasteText(e.target.value)}
                            />
                            <button
                                onClick={handleBulkPaste}
                                disabled={!bulkPasteText.trim()}
                                className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed h-fit self-end"
                            >
                                Add
                            </button>
                        </div>
                    </div>

                    {/* Stats Summary Header */}
                    <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700 text-xs">
                        <div className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Stats Validation:</div>
                        <div className="grid grid-cols-1 gap-2">
                            {config.selectedProducts.map(pid => {
                                const p = AVAILABLE_PRODUCTS.find(x => x.id === pid);
                                const totalRequired = config.productInputs[pid]?.count || 0;
                                const currentSum = siteBreakdown.reduce((sum, site) => sum + (site.counts[pid] || 0), 0);
                                const diff = totalRequired - currentSum;
                                const isMatch = diff === 0;
                                
                                return (
                                    <div key={pid} className="flex justify-between items-center">
                                        <span className="font-medium">{p?.name}:</span>
                                        <div className="flex space-x-3">
                                            <span>Total: {totalRequired}</span>
                                            <span>Sum: {currentSum}</span>
                                            <span className={isMatch ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                                                {isMatch ? "Match" : `Diff: ${diff > 0 ? '-' : '+'}${Math.abs(diff)}`}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Sites List */}
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {siteBreakdown.map((site, idx) => (
                            <div key={site.id} className="flex items-center space-x-2 p-2 border border-gray-100 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 text-xs">
                                <div className="flex-grow grid grid-cols-12 gap-2 items-center">
                                    <div className="col-span-4">
                                        <input 
                                            type="text"
                                            placeholder="Site Name"
                                            value={site.name}
                                            onChange={(e) => {
                                                const newSites = [...siteBreakdown];
                                                newSites[idx].name = e.target.value;
                                                setSiteBreakdown(newSites);
                                            }}
                                            className="block w-full border-gray-300 dark:border-gray-600 rounded p-1 bg-white dark:bg-gray-800"
                                        />
                                    </div>
                                    <div className="col-span-8 flex flex-wrap gap-2 justify-end">
                                        {config.selectedProducts.map(pid => {
                                            const p = AVAILABLE_PRODUCTS.find(x => x.id === pid);
                                            return (
                                                <div key={pid} className="flex items-center space-x-1">
                                                    <label className="text-[10px] text-gray-500 uppercase">{p?.shortName || p?.name}:</label>
                                                    <input 
                                                        type="number"
                                                        value={site.counts[pid] || ''}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value) || 0;
                                                            const newSites = [...siteBreakdown];
                                                            newSites[idx].counts[pid] = val;
                                                            setSiteBreakdown(newSites);
                                                        }}
                                                        className="w-16 border-gray-300 dark:border-gray-600 rounded p-1 bg-white dark:bg-gray-800 text-right"
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => {
                                        const newSites = siteBreakdown.filter((_, i) => i !== idx);
                                        setSiteBreakdown(newSites);
                                    }}
                                    className="text-red-500 hover:text-red-700 p-1 flex-shrink-0"
                                    title="Remove Site"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            </div>
                        ))}
                    </div>

                    <button 
                        onClick={() => setSiteBreakdown([...siteBreakdown, { id: Date.now().toString(), name: '', counts: {} }])}
                        className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded text-gray-500 hover:border-blue-500 hover:text-blue-500 text-sm font-medium transition-colors"
                    >
                        + Add Site Manually
                    </button>
                </div>
            )}

            <div className="flex justify-end space-x-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button 
                 onClick={() => {
                   setIsSiteModalOpen(false);
                   if (!isBreakdownPerSite && designatedSites.trim().length === 0) setHasDesignatedSites(false);
                   if (isBreakdownPerSite && siteBreakdown.length === 0) setHasDesignatedSites(false);
                 }}
                 className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

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
      
      {/* PDF Export Options */}
      <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-6 mb-4 flex-wrap">
        <div className="flex items-center">
            <input 
              id="pdf-monthly-cost"
              type="checkbox" 
              checked={showMonthlyCost} 
              onChange={(e) => setShowMonthlyCost(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded bg-white dark:bg-gray-700 dark:border-gray-600"
            />
            <label htmlFor="pdf-monthly-cost" className="ml-2 text-xs font-medium text-gray-600 dark:text-gray-300">
              PDF: Show Monthly Unit Cost
            </label>
        </div>
        <div className="flex items-center">
            <input 
              id="pdf-totals-row"
              type="checkbox" 
              checked={showTotals} 
              onChange={(e) => setShowTotals(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded bg-white dark:bg-gray-700 dark:border-gray-600"
            />
            <label htmlFor="pdf-totals-row" className="ml-2 text-xs font-medium text-gray-600 dark:text-gray-300">
              PDF: Show Totals Row
            </label>
        </div>
        <div className="flex items-center">
            <input 
              id="pdf-emr-term"
              type="checkbox" 
              checked={showEmrIntegration} 
              onChange={(e) => setShowEmrIntegration(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded bg-white dark:bg-gray-700 dark:border-gray-600"
            />
            <label htmlFor="pdf-emr-term" className="ml-2 text-xs font-medium text-gray-600 dark:text-gray-300">
              PDF: Add EMR Integration term
            </label>
        </div>
      </div>
      
      {/* Designated Sites Checkbox - Moved below options */}
      <div className="flex items-center mb-6">
          <input 
            id="designated-sites-check"
            type="checkbox" 
            checked={hasDesignatedSites} 
            onChange={(e) => handleSiteCheckboxChange(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded bg-white dark:bg-gray-700 dark:border-gray-600"
          />
          <label htmlFor="designated-sites-check" className="ml-2 text-xs font-medium text-gray-600 dark:text-gray-300 cursor-pointer">
              More than one designated site?
          </label>
          {hasDesignatedSites && (
              <button 
                onClick={() => setIsSiteModalOpen(true)}
                className="ml-2 text-[10px] text-blue-600 underline hover:text-blue-800"
              >
                (Edit Sites)
              </button>
          )}
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
