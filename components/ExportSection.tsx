
import React, { useState } from 'react';
import { CalculationOutput, DealConfiguration, ChannelType, DealType, PricingMethod } from '../types';
import { AVAILABLE_PRODUCTS, EXCHANGE_RATE_SAR } from '../constants';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';

import { SAMIR_WHITE_LOGO_BASE64 } from '../samirLogo';
import { WK_LOGO_BASE64 } from '../wkLogo';

interface ExportSectionProps {
  data: CalculationOutput;
  config: DealConfiguration;
  useStartDate: boolean;
  setUseStartDate: (val: boolean) => void;
  startMonthYear: string;
  setStartMonthYear: (val: string) => void;
  isExtensionQuote?: boolean;
  extensionResults?: any;
}

// Logo URLs
// WK_LOGO_URL is now imported as a base64 string from wkLogo.ts
// Use wsrv.nl as a reliable image proxy/resizer that handles CORS headers correctly
// SAMIR_LOGO_URL is now imported as a base64 string from samirLogo.ts

// Reliable Font URLs
const FONT_URLS = {
  Inter: {
    regular: "https://cdn.jsdelivr.net/gh/zingrx/fonts_inter_ttf@main/ttf/Inter-Regular.ttf",
    bold: "https://cdn.jsdelivr.net/gh/zingrx/fonts_inter_ttf@main/ttf/Inter-Bold.ttf"
  },
  FiraSans: {
    regular: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/firasans/FiraSans-Regular.ttf",
    bold: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/firasans/FiraSans-Bold.ttf"
  }
};

type FontType = 'Inter' | 'FiraSans';

export const PRODUCT_FULL_NAMES: Record<string, string> = {
  "ANYWHERE": "UpToDate® Anywhere",
  "UTDADV": "UpToDate® Advanced™",
  "UTDEE": "UpToDate® Enterprise™",
  "SM": "UpToDate® Small Market",
  "BASE PKG": "Lexidrug® Base Package",
  "BASE PKG+FLINK": "Lexidrug® Base Package + Formulary Link",
  "BASE PKG+FLINK+IPE": "Lexidrug® Base Package + Formulary Link + IPE",
  "EE-Combo": "Lexidrug® Enterprise Combo",
  "EE-Combo+FLINK": "Lexidrug® Enterprise Combo + Formulary Link",
  "EE-Combo+FLINK+IPE": "Lexidrug® Enterprise Combo + Formulary Link + IPE",
  "Hospital Pharmacy Model": "Lexidrug® Hospital Pharmacy Model"
};

interface SiteBreakdownItem {
  id: string; // unique id for list management
  name: string;
  counts: Record<string, number>; // productId -> count
}

export const ExportSection: React.FC<ExportSectionProps> = ({ 
  data, 
  config,
  useStartDate,
  setUseStartDate,
  startMonthYear,
  setStartMonthYear,
  isExtensionQuote,
  extensionResults
}) => {
  const [customerName, setCustomerName] = useState('');
  const [repName, setRepName] = useState('');
  const [repPhone, setRepPhone] = useState('');
  const [repEmail, setRepEmail] = useState('');
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isExcelLoading, setIsExcelLoading] = useState(false);
  
  // Auto Credential Capture
  React.useEffect(() => {
    const authName = localStorage.getItem('wk_auth_name');
    if (authName) {
      const initials = authName.toLowerCase();
      const credentials: Record<string, { name: string, email: string, phone: string }> = {
        'aa': { name: 'REDACTED', email: 'REDACTED', phone: 'REDACTED' },
        'ma': { name: 'REDACTED', email: 'REDACTED', phone: 'REDACTED' },
        'ai': { name: 'REDACTED', email: 'REDACTED', phone: 'REDACTED' },
        'mn': { name: 'REDACTED', email: 'REDACTED', phone: 'REDACTED' }
      };
      
      if (credentials[initials]) {
        setRepName(credentials[initials].name);
        setRepEmail(credentials[initials].email);
        setRepPhone(credentials[initials].phone);
      }
    }
  }, []);
  
  // Font State - Default to FiraSans as requested
  const [selectedFont] = useState<FontType>('FiraSans');
  const [fontCache, setFontCache] = useState<Record<FontType, { regular: string | null, bold: string | null }>>({
    Inter: { regular: null, bold: null },
    FiraSans: { regular: null, bold: null }
  });
  const [isFontLoading, setIsFontLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // PDF Options
  const [showMonthlyCost, setShowMonthlyCost] = useState(true);
  const [showTotals, setShowTotals] = useState(true);
  const [showEmrIntegration, setShowEmrIntegration] = useState(true); // Default true for EMR term
  const [hasOptOutClause, setHasOptOutClause] = useState(false); // Opt-out clause for multi-year

  // Sites Logic
  const [hasDesignatedSites, setHasDesignatedSites] = useState(false);
  const [designatedSites, setDesignatedSites] = useState('');
  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
  const [isStartDateModalOpen, setIsStartDateModalOpen] = useState(false);
  
  // Site Breakdown Logic
  const [isBreakdownPerSite, setIsBreakdownPerSite] = useState(false);
  const [showSitesOnly, setShowSitesOnly] = useState(false); // New state for showing sites only
  const [siteBreakdown, setSiteBreakdown] = useState<SiteBreakdownItem[]>([]);
  const [bulkPasteText, setBulkPasteText] = useState(''); // State for bulk pasting

  // ... (existing code)

  // Function to process bulk paste
  const handleBulkPaste = () => {
    const lines = bulkPasteText.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return;

    const newSites: SiteBreakdownItem[] = lines.map((line, index) => ({
      id: Date.now().toString() + index,
      name: line.trim(),
      counts: {} // Counts still need to be filled manually
    }));
    
    setSiteBreakdown(prev => {
      // If the first row is completely empty (no name, no counts), replace it
      if (prev.length > 0 && prev[0].name.trim() === '' && Object.keys(prev[0].counts).length === 0) {
        return [...newSites, ...prev.slice(1)];
      }
      return [...prev, ...newSites];
    });
    setBulkPasteText(''); // Clear text area
  };

  // ... (existing code)

  const handlePDFExport = async () => {
    setIsPdfLoading(true);
    setPdfError(null);
    try {
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
               
               const fetchWithTimeout = (url: string, timeout = 5000) => {
                   return Promise.race([
                       fetch(url).then(res => {
                           if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                           return res.blob();
                       }),
                       new Promise<Blob>((_, reject) => 
                           setTimeout(() => reject(new Error('Request timeout')), timeout)
                       )
                   ]);
               };

               const [regBlob, boldBlob] = await Promise.all([
                   fetchWithTimeout(FONT_URLS[fontName].regular),
                   fetchWithTimeout(FONT_URLS[fontName].bold)
               ]);

               const blobToBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
                   const reader = new FileReader();
                   reader.onloadend = () => {
                       if (reader.result) resolve(reader.result as string);
                       else reject(new Error('Failed to read blob'));
                   };
                   reader.onerror = reject;
                   reader.readAsDataURL(blob);
               });

               regularFontB64 = (await blobToBase64(regBlob)).split(',')[1];
               boldFontB64 = (await blobToBase64(boldBlob)).split(',')[1];

               setFontCache(prev => ({
                   ...prev,
                   [fontName]: { regular: regularFontB64, bold: boldFontB64 }
               }));
          }

          if (regularFontB64 && boldFontB64) {
              doc.addFileToVFS(`${fontName}-Regular.ttf`, regularFontB64);
              doc.addFont(`${fontName}-Regular.ttf`, fontName, 'normal');
              doc.addFileToVFS(`${fontName}-Bold.ttf`, boldFontB64);
              doc.addFont(`${fontName}-Bold.ttf`, fontName, 'bold');
          }
      } catch (e) {
          console.error("Font loading error", e);
      } finally {
          setIsFontLoading(false);
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
              // Add WK Logo - Made slightly smaller than before (using white base64 version)
              doc.addImage(WK_LOGO_BASE64, 'PNG', 14, 10, 50, 10, 'WK_LOGO', 'FAST');
              
              // Add Samir Logo if Indirect (using white base64 version)
              if (isIndirect) {
                  doc.addImage(SAMIR_WHITE_LOGO_BASE64, 'PNG', 162, 10, 36, 10, 'SAMIR_LOGO', 'FAST');
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
          doc.text(`©${new Date().getFullYear()} UpToDate, Inc. and its affiliates and/or licensors. All rights reserved.`, 14, pageHeight - 10);
      };

      const formatMoney = (amount: number, currency: string) => {
          return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
      };

      // Initial Header
      renderHeader(true);
      doc.setFontSize(26);
      doc.setFont(fontName, 'bold');
      doc.setTextColor(255, 255, 255); // White text for title on blue background
      
      let proposalTitle = "BUDGETARY COMMERCIAL\nPROPOSAL";
      if (config.dealType === DealType.RENEWAL) {
          proposalTitle = "BUDGETARY COMMERCIAL\nPROPOSAL [RENEWAL]";
      } else if (config.dealType === DealType.EXTENSION) {
          proposalTitle = "BUDGETARY COMMERCIAL\nPROPOSAL [EXTENSION]";
      }
      doc.text(proposalTitle, 105, 95, { align: 'center' });

    let currentY = 170;
    doc.setTextColor(60, 60, 60);
    const hasUTD = config.selectedProducts.includes('utd');
    const hasLXD = config.selectedProducts.includes('lxd');
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
    if (hasLXD) {
        const variant = config.productInputs['lxd']?.variant || '';
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
    let currentFooterY = 250;
    doc.text(`Customer: ${customerName || 'N/A'}`, 14, currentFooterY);
    currentFooterY += 5;
    doc.text(`Prepared by: ${repName || 'N/A'}`, 14, currentFooterY);
    currentFooterY += 5;
    
    if (repEmail) {
        doc.text(`Email: ${repEmail}`, 14, currentFooterY);
        currentFooterY += 5;
    }
    if (repPhone) {
        // Format Saudi Phone: +966 xx xxx xxxx
        let formattedPhone = repPhone;
        const digits = repPhone.replace(/\D/g, '');
        if ((digits.startsWith('05') && digits.length === 10) || (digits.startsWith('5') && digits.length === 9)) {
             const core = digits.startsWith('05') ? digits.substring(1) : digits;
             formattedPhone = `+966 ${core.substring(0, 2)} ${core.substring(2, 5)} ${core.substring(5, 9)}`;
        }
        doc.text(`Phone: ${formattedPhone}`, 14, currentFooterY);
        currentFooterY += 5;
    }
    
    doc.text(`Date: ${docDate}`, 14, currentFooterY);
    currentFooterY += 5;
    doc.text(`Ref: ${refId}`, 14, currentFooterY);

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
    
    doc.setLineHeightFactor(1.5);
    doc.text(splitText, 14, 60);
    doc.setLineHeightFactor(1.15); // Reset to default
    // Footer added dynamically at the end

    doc.addPage();
    // Header rendered in loop at end
    doc.setFontSize(16);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont(fontName, 'bold');
    doc.text(isExtensionQuote ? "Extension Quote Details" : "Pricing Details", 14, 45);

    const getYearLabel = (yearIndex: number) => {
        if (useStartDate && startMonthYear) {
            const [yearStr, monthStr] = startMonthYear.split('-');
            const startYear = parseInt(yearStr);
            const startMonth = parseInt(monthStr);
            
            const start = new Date(startYear + yearIndex, startMonth - 1, 1);
            const end = new Date(start);
            end.setFullYear(end.getFullYear() + 1);
            end.setDate(end.getDate() - 1);
            
            const formatD = (d: Date) => {
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const day = d.getDate().toString().padStart(2, '0');
                const month = monthNames[d.getMonth()];
                return `${month} ${day}, ${d.getFullYear()}`;
            };
            
            return `Year ${yearIndex + 1}:\n${formatD(start)} to ${formatD(end)}`;
        }
        return `Year ${yearIndex + 1}`;
    };

    let tableHead: string[][] = [];
    let tableBody: string[][] = [];
    const columnStyles: any = {};

    const getExtensionDates = () => {
        if (useStartDate && startMonthYear && extensionResults) {
            const [yearStr, monthStr] = startMonthYear.split('-');
            const startYear = parseInt(yearStr);
            const startMonth = parseInt(monthStr);
            
            const start = new Date(startYear, startMonth - 1, 1);
            const end = new Date(start);
            
            if (extensionResults.useFullExtension) {
                end.setMonth(end.getMonth() + extensionResults.integerMonths);
                end.setDate(end.getDate() + extensionResults.extraDays - 1);
            } else {
                end.setMonth(end.getMonth() + (extensionResults.type === 'A' ? extensionResults.integerMonths : extensionResults.monthsCovered));
                end.setDate(end.getDate() - 1);
            }
            
            const formatD = (d: Date) => {
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const day = d.getDate().toString().padStart(2, '0');
                const month = monthNames[d.getMonth()];
                return `${month} ${day}, ${d.getFullYear()}`;
            };
            
            return `${formatD(start)} to ${formatD(end)}`;
        }
        return 'N/A';
    };

    if (isExtensionQuote && extensionResults) {
      if (extensionResults.type === 'A') {
        const durationText = extensionResults.useFullExtension 
            ? `${extensionResults.days} days (${extensionResults.integerMonths} months${extensionResults.extraDays > 0 ? ` and ${extensionResults.extraDays} days` : ''})`
            : `${Math.round(extensionResults.monthsAvailable * 30)} days (${extensionResults.monthsAvailable.toFixed(2)} months)`;

        tableHead = [['Description', 'Value']];
        tableBody = [
          ['Product', PRODUCT_FULL_NAMES[extensionResults.variant] || extensionResults.variant],
          ['Dates', getExtensionDates()],
          ['Total Contract\'s Value (SAR)', formatMoney(extensionResults.customerTCV * EXCHANGE_RATE_SAR, 'SAR')],
          ['Extension Percentage', `${extensionResults.extensionPercentage.toFixed(2)}%`],
          ['Extension Value (SAR)', formatMoney(extensionResults.customerExtension * EXCHANGE_RATE_SAR, 'SAR')],
          ['Current Spend of Last Year (SAR)', formatMoney(extensionResults.currentSpend * EXCHANGE_RATE_SAR, 'SAR')],
          ['Daily Cost (SAR)', formatMoney((extensionResults.monthlyCost / 30) * EXCHANGE_RATE_SAR, 'SAR')],
          ['Extension Duration', durationText],
          ['End-User Price (SAR)', formatMoney(extensionResults.endUserPrice * EXCHANGE_RATE_SAR, 'SAR')],
          ['VAT (15%) (SAR)', formatMoney(extensionResults.endUserPrice * EXCHANGE_RATE_SAR * 0.15, 'SAR')],
          ['Total (SAR)', formatMoney(extensionResults.endUserPrice * EXCHANGE_RATE_SAR * 1.15, 'SAR')]
        ];
      } else {
        tableHead = [['Description', 'Value']];
        tableBody = [
          ['Product', PRODUCT_FULL_NAMES[extensionResults.variant] || extensionResults.variant],
          ['Dates', getExtensionDates()],
          ['Current Spend of Last Year (SAR)', formatMoney(extensionResults.currentSpend * EXCHANGE_RATE_SAR, 'SAR')],
          ['Daily Cost (SAR)', formatMoney((extensionResults.monthlyCost / 30) * EXCHANGE_RATE_SAR, 'SAR')],
          ['Extension Duration', `${Math.round(extensionResults.monthsCovered * 30)} days (${extensionResults.monthsCovered} months)`],
          ['End-User Price (SAR)', formatMoney(extensionResults.endUserPrice * EXCHANGE_RATE_SAR, 'SAR')],
          ['VAT (15%) (SAR)', formatMoney(extensionResults.endUserPrice * EXCHANGE_RATE_SAR * 0.15, 'SAR')],
          ['Total (SAR)', formatMoney(extensionResults.endUserPrice * EXCHANGE_RATE_SAR * 1.15, 'SAR')]
        ];
      }
    } else {
      // isIndirect already defined
      const productColIndices: Record<string, number> = {};
      config.selectedProducts.forEach((pid, idx) => { productColIndices[pid] = 1 + idx; });
      const totalStartIndex = 1 + config.selectedProducts.length;
      if (productColIndices['utd'] !== undefined) columnStyles[productColIndices['utd']] = { fillColor: [220, 252, 231] };
      if (productColIndices['lxd'] !== undefined) columnStyles[productColIndices['lxd']] = { fillColor: [224, 242, 254] };
      columnStyles[totalStartIndex] = { fontStyle: 'bold' };
      if (isIndirect) columnStyles[totalStartIndex + 2] = { fontStyle: 'bold' };

      if (isIndirect) {
        const prodCols = config.selectedProducts.map(pid => {
           let label = pid;
           if (pid === 'utd') label = 'UpToDate';
           if (pid === 'lxd') label = 'Lexidrug';
           return `${label} (SAR)`;
        });
        tableHead = [['Year', ...prodCols, 'Total (SAR)', 'VAT (15%)', 'Grand Total\n(SAR)']];
        tableBody = data.yearlyResults.map(r => {
          const pValues = config.selectedProducts.map(pid => {
             const bd = r.breakdown.find(x => x.id === pid);
             return bd ? formatMoney(bd.grossSAR, 'SAR') : '-';
          });
          return [ getYearLabel(r.year - 1), ...pValues, formatMoney(r.grossSAR, 'SAR'), formatMoney(r.vatSAR, 'SAR'), formatMoney(r.grandTotalSAR, 'SAR') ];
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
           if (pid === 'lxd') label = 'Lexidrug';
           return `${label} (USD)`;
        });
        tableHead = [['Year', ...prodCols, 'Total (USD)']];
        tableBody = data.yearlyResults.map(r => {
          const pValues = config.selectedProducts.map(pid => {
             const bd = r.breakdown.find(x => x.id === pid);
             return bd ? formatMoney(bd.gross, 'USD') : '-';
          });
          return [ getYearLabel(r.year - 1), ...pValues, formatMoney(r.grossUSD, 'USD') ];
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
    }

    autoTable(doc, {
      startY: 55, 
      head: tableHead,
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: 255, font: fontName, fontStyle: 'bold', valign: 'middle' },
      styles: { fontSize: 9, font: fontName, overflow: 'linebreak', cellPadding: 2, valign: 'middle', halign: 'left' }, 
      columnStyles: columnStyles,
      margin: { top: 35, left: 14, right: 14 },
      didParseCell: (data) => {
        if (isExtensionQuote) {
            const boldRows = ['Dates', 'Extension Duration', 'End-User Price (SAR)', 'Total (SAR)'];
            const firstCell = Array.isArray(data.row.raw) ? String(data.row.raw[0]) : '';
            if (data.section === 'body' && boldRows.includes(firstCell)) {
                data.cell.styles.fontStyle = 'bold';
            }
        } else {
            // Only bold the last row if showTotals is true
            if (showTotals && data.section === 'body' && data.row.index === tableBody.length - 1) { 
                data.cell.styles.fontStyle = 'bold'; 
            }
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

    // Helper for rich text with <b> tags
    const renderRichText = (text: string, x: number, startY: number, maxWidth: number) => {
      const tokens = text.split(/(<b>.*?<\/b>)/g);
      let currentX = x;
      let currentY = startY;
      
      for (const token of tokens) {
        if (!token) continue;
        const isBold = token.startsWith('<b>') && token.endsWith('</b>');
        const content = isBold ? token.slice(3, -4) : token;
        
        doc.setFont(fontName, isBold ? 'bold' : 'normal');
        
        const words = content.split(/(\s+)/);
        for (const word of words) {
          if (!word) continue;
          if (word.match(/^\s+$/)) {
            const spaceWidth = doc.getTextWidth(word);
            if (currentX + spaceWidth <= x + maxWidth) {
              currentX += spaceWidth;
            }
            continue;
          }
          
          const wordWidth = doc.getTextWidth(word);
          if (currentX + wordWidth > x + maxWidth && currentX > x) {
            currentX = x;
            currentY += 4;
          }
          
          doc.text(word, currentX, currentY);
          currentX += wordWidth;
        }
      }
      return currentY;
    };

    // --- OPERATING STATISTICS SECTION ---
    if (!isExtensionQuote) {
      doc.setFontSize(14);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont(fontName, 'bold');
      doc.text("Operating Statistics", 14, finalY);
      finalY += 6;
      doc.setFontSize(9);
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
              if (pid === 'lxd') productName = 'Lexidrug';
              
              // Text Replacement Logic: HC->clinicians, BC->active beds
              let countLabelText = p.countLabel;
              if (p.countLabel === 'HC') countLabelText = 'clinicians';
              if (p.countLabel === 'BC') countLabelText = 'active beds';
              
              // Override for Lexidrug Seats variant
              if (pid === 'lxd' && inp.variant && (inp.variant.includes('Seats') || inp.variant === 'Hospital Pharmacy Model')) {
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
          finalY += (splitStats.length * 4) + 1.5;
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
              finalY += 5;
          }

          if (config.selectedProducts.includes('lxd')) {
              const count = config.productInputs['lxd'].count || 1;
              const totalGrossUSD = data.yearlyResults.reduce((sum, r) => {
                  const bd = r.breakdown.find(x => x.id === 'lxd');
                  return sum + (bd ? bd.gross : 0);
              }, 0);
              const totalGrossSAR = data.yearlyResults.reduce((sum, r) => {
                  const bd = r.breakdown.find(x => x.id === 'lxd');
                  return sum + (bd ? bd.grossSAR : 0);
              }, 0);
              const acv = getValue(totalGrossUSD, totalGrossSAR) / config.years;
              const monthlyPerUnit = acv / count / 12;
              const valStr = `${displayCurrency} ${monthlyPerUnit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
              renderBoldLine(finalY, "Your Lexidrug subscription costs ", valStr, " monthly per bed.");
              finalY += 5;
          }
          
          // Add a small gap after monthly costs if they exist
          if (config.selectedProducts.includes('utd') || config.selectedProducts.includes('lxd')) {
              finalY += 2;
          }
      }
    }

    // 2. Designated Sites (Moved outside of Operating Statistics)
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
                    const displayCost = isIndirect ? (siteTotalCost * EXCHANGE_RATE_SAR) : siteTotalCost; 
                    row.push(formatMoney(displayCost, displayCurrency));
                }
                return row;
            });

            autoTable(doc, {
                startY: finalY,
                head: [siteHeaders],
                body: siteBody,
                theme: 'grid',
                headStyles: { fillColor: [240, 240, 240], textColor: 0, font: fontName, fontStyle: 'bold', valign: 'middle' },
                styles: { fontSize: 9, font: fontName, overflow: 'linebreak', cellPadding: 2, valign: 'middle', halign: 'left' },
                margin: { top: 35, left: 14, right: 14 },
            });
            
            finalY = (doc as any).lastAutoTable.finalY + 6;

        } else if (designatedSites.trim().length > 0) {
            // STANDARD LIST LOGIC - Two Column Table
            doc.setFont(fontName, 'bold');
            doc.text("Sites included in the above pricing:", 14, finalY);
            finalY += 5;
            
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
            
            finalY = (doc as any).lastAutoTable.finalY + 6;
        }
    }

    // --- TERMS & CONDITIONS SECTION ---
    finalY += 2; 
    
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
    finalY += 6;
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.setFont(fontName, 'normal');
    
    const terms: { text: string, isRich?: boolean }[] = [];
    
    if (isExtensionQuote) {
        terms.push({ text: "The prices mentioned above are not final and subject to change in case of releasing an official RFP." });
        terms.push({ text: "The Internet access is a must for this subscription to be utilized." });
        terms.push({ text: "This budgetary proposal is valid for 30-days." });
    } else {
        terms.push({ text: "The prices mentioned above are not final and subject to change in case of releasing an official RFP." });
        if (config.years > 1) {
            if (!hasOptOutClause) {
                terms.push({ text: "The prices above are tied to a multi-year non-opt-out contract for the same number of years." });
            } else {
                const yearsList = Array.from({length: config.years - 1}, (_, i) => i + 2);
                let yearsStr = "";
                if (yearsList.length === 1) yearsStr = `Year ${yearsList[0]}`;
                else if (yearsList.length === 2) yearsStr = `Years ${yearsList[0]} and ${yearsList[1]}`;
                else {
                    const last = yearsList.pop();
                    yearsStr = `Years ${yearsList.join(', ')}, and ${last}`;
                }
                terms.push({ 
                    text: `<b>Opt-out option:</b> Customer may opt not to renew for ${yearsStr} of this proposal term by providing written notice to UpToDate, Inc. <b>90 days</b> prior to the start date of each respective year of the proposal term. If such notice is not received, Customer will automatically be invoiced for the next year of the proposal term. This clause requires internal approvals from Wolters Kluwer before consideration.`,
                    isRich: true
                });
            }
        }
        if (config.channel === ChannelType.DIRECT) terms.push({ text: "The price above is exempt from 15% VAT." });
        
        if (config.years > 1 && config.channel === ChannelType.DIRECT) {
            terms.push({ text: "Payment of the above prices will be made against annual invoices issued each year, with payment due 30 days from the activation start date." });
        }

        terms.push({ text: "Upon renewing the subscription, a statistics recount will be executed, considering the standard price of the exit year." });
        terms.push({ text: "The Internet access is a must for this subscription to be utilized." });
        terms.push({ text: "This budgetary proposal is valid for 60-days." });
        
        // Conditional EMR Term
        if (showEmrIntegration) {
            terms.push({ text: "Integrating UpToDate® or Lexidrug® with your EMR is included in the prices above, even if the EMR changed during the subscription.*" });
        }

        const hasHospitalPharmacyModel = config.selectedProducts.includes('lxd') && config.productInputs['lxd']?.variant === 'Hospital Pharmacy Model';
        if (hasHospitalPharmacyModel) {
            terms.push({ text: "This subscription is limited to the above number of seats." });
        }
    }

    terms.forEach(term => {
      if (finalY > 260) {
        doc.addPage();
        // Header rendered in loop at end
        finalY = 55;
      }
      
      if (term.isRich) {
        doc.text("• ", 14, finalY);
        const newY = renderRichText(term.text, 18, finalY, 176);
        finalY = newY + 5.5;
      } else {
        const splitTerm = doc.splitTextToSize(`• ${term.text}`, 180);
        doc.text(splitTerm, 14, finalY);
        finalY += (splitTerm.length * 4) + 1.5;
      }
    });

    if (finalY > 260) {
        doc.addPage();
        // Header rendered in loop at end
        finalY = 55;
    }
    
    // Conditional Footnote
    if (!isExtensionQuote && showEmrIntegration) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        const footnote = "* Some EMR providers put additional charges to integrate our solutions, we’re neither responsible nor covering these costs. It has to be discussed with the EMR provider directly.";
        const splitFootnote = doc.splitTextToSize(footnote, 180);
        const pageHeight = doc.internal.pageSize.height || 297;
        doc.text(splitFootnote, 14, pageHeight - 22);
    } else {
        finalY += 4;
    }

    // --- TECHNICAL SPECIFICATIONS SECTION ---
    if (!isExtensionQuote) {
      if (finalY > 245) {
          doc.addPage();
          // Header rendered in loop at end
          finalY = 55;
      } else {
          finalY += 10; // Add padding above Technical Specifications
      }

      doc.setFontSize(14);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont(fontName, 'bold');
      doc.text("Technical Specifications", 14, finalY);
      finalY += 6;
      
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.setFont(fontName, 'normal');
      const tsBody = "Full technical specifications for the products above can be found in the below links. Check section II: Licensed Materials for more details.";
      const splitTsBody = doc.splitTextToSize(tsBody, 180);
      doc.text(splitTsBody, 14, finalY);
      finalY += (splitTsBody.length * 4) + 3;

      const techSpecs = [];
      const utdVariant = hasUTD ? config.productInputs['utd']?.variant : null;
      const lxdVariant = hasLXD ? config.productInputs['lxd']?.variant : null;

      if (hasUTD) {
         techSpecs.push({ name: "AI is less a revolution", url: "https://eng2e.seismic.com/i/ovTkGm8yPiA6OqxgeQb3GZ7BWsurXdNFHBn6PLUSSIGNa55QQJIZlhafyQNpCw38LWggzMt5i2DUCp6zhZlJG0ufaPLUSSIGN36DQnF01FSaK12p8J3u2___dWYq8PLUSSIGN5mQgaRFxL3mOqKYo___n" });
         
         if (utdVariant === 'UTDEE') {
             if (hasLXD) {
                 if (lxdVariant?.includes('FLINK') && lxdVariant?.includes('IPE')) {
                     techSpecs.push({ name: "TS_UTD PRO FLINK+IPE", url: "https://eng2e.seismic.com/i/ovTkGm8yPiA6OqxgeQb3GZ7BWsurXdNFHBn6PLUSSIGNa55QQJIZlhafyQNpCw38LWggzMtZUXeskXsITPadJQRrdQhtuNZ2RDkEWAE1Bl7BCJSMgnhauADmOlYVesjiWw7dfVJ" });
                 } else if (lxdVariant?.includes('FLINK')) {
                     techSpecs.push({ name: "TS_UTD PRO FLINK", url: "https://eng2e.seismic.com/i/ovTkGm8yPiA6OqxgeQb3GZ7BWsurXdNFHBn6PLUSSIGNa55QQJIZlhafyQNpCw38LWggzMtGZjdQPLUSSIGNWLFpJk1KeLMVDDS9qT7P4gJNtGXD2___WecaRRtQkMZI2aabVnixTWUE8xU7" });
                 } else {
                     techSpecs.push({ name: "TS_UTD PRO", url: "https://eng2e.seismic.com/i/ovTkGm8yPiA6OqxgeQb3GZ7BWsurXdNFHBn6PLUSSIGNa55QQJIZlhafyQNpCw38LWggzMtAcmsDDuk3S7LGxDrktOrDv3ot___ZTAjaSBXQYSKn2k4oPLUSSIGNxLC7yyS0HWudcZHB2Yuj" });
                 }
             } else {
                 techSpecs.push({ name: "Enterprise Overview", url: "https://clinicaleffectiveness.seismic.com/Link/Content/DCRVMVjqfHp8M8CMjVpfjBFRTR8G" });
                 techSpecs.push({ name: "TS_UTD Enterprise", url: "https://eng2e.seismic.com/i/ovTkGm8yPiA6OqxgeQb3GZ7BWsurXdNFHBn6PLUSSIGNa55QQJIZlhafyQNpCw38LWggzMt8IbgN8n0uDSOBiyENPLUSSIGN4ro6TzG28oYDl81xTREOMKK34Z3wZLXGTRVR4kesIPLUSSIGNLugr" });
             }
         } else if (utdVariant === 'ANYWHERE') {
             techSpecs.push({ name: "TS_UTD ANYWHERE", url: "https://eng2e.seismic.com/i/ovTkGm8yPiA6OqxgeQb3GZ7BWsurXdNFHBn6PLUSSIGNa55QQJIZlhafyQNpCw38LWggzMtTiPjiZ___2NsX8OtyK6sZSznVFmyFFsg4kgMUFuVqKXRKZIMQdKikAY7xPnOGAiMGq" });
         } else if (utdVariant === 'UTDADV') {
             techSpecs.push({ name: "TS_UTD ADV", url: "https://eng2e.seismic.com/i/ovTkGm8yPiA6OqxgeQb3GZ7BWsurXdNFHBn6PLUSSIGNa55QQJIZlhafyQNpCw38LWggzMtcIzCVYJxWoPVidQjIsK5Nsfab1MH9ZkAonZcZkjoYhSgh5HAfnPLUSSIGN0UW2XhnMRkMrh" });
         }

         techSpecs.push({ name: "UTD Facts-at-a-glance", url: "https://eng2e.seismic.com/i/ovTkGm8yPiA6OqxgeQb3GZ7BWsurXdNFHBn6PLUSSIGNa55QQJIZlhafyQNpCw38LWggzMtTG3c8ANMBhZRuFWZyPLUSSIGNbZadPLUSSIGNWRqxIsdRKRbxLt1m8oMBdYYMOn8grPVgEz2RpGQbG" });
      }

      if (hasLXD && (utdVariant !== 'UTDEE')) {
          if (lxdVariant?.includes('FLINK') && lxdVariant?.includes('IPE')) {
              techSpecs.push({ name: "TS_LXD FLINK+IPE", url: "https://eng2e.seismic.com/i/ovTkGm8yPiA6OqxgeQb3GZ7BWsurXdNFHBn6PLUSSIGNa55QQJIZlhafyQNpCw38LWggzMt4VgDwBbSHbScqX___9fVqHlKhXWnm2Fae55SMM7fc9tUrmJtoGCyc19xa___3YGozWh___" });
          } else if (lxdVariant?.includes('FLINK')) {
              techSpecs.push({ name: "TS_LXD FLINK", url: "https://eng2e.seismic.com/i/ovTkGm8yPiA6OqxgeQb3GZ7BWsurXdNFHBn6PLUSSIGNa55QQJIZlhafyQNpCw38LWggzMtgLqWFPdYXbhE14___Mu53BeKKXWoLf___4MSQSPVb7vmVoXjICTCkDzs5YJPLUSSIGNWDmL3s6___" });
          } else {
              techSpecs.push({ name: "TS_LXD", url: "https://eng2e.seismic.com/i/ovTkGm8yPiA6OqxgeQb3GZ7BWsurXdNFHBn6PLUSSIGNa55QQJIZlhafyQNpCw38LWggzMtB9PLUSSIGNXU4wChIjFDE15Pr5xxrFlXHbAJp3PLUSSIGNh3P42mH1hAaeOLSTiZVVPVaI0P0yPgct" });
          }
      }

      const tsSpecs = techSpecs.filter(s => s.name.startsWith('TS_'));
      const otherSpecs = techSpecs.filter(s => !s.name.startsWith('TS_'));

      const renderLinks = (specs: any[]) => {
          doc.setFontSize(9);
          doc.setTextColor(0, 0, 255); // Blue for links
          specs.forEach(spec => {
              if (finalY > 265) {
                  doc.addPage();
                  finalY = 55;
              }
              doc.textWithLink(`• ${spec.name}`, 14, finalY, { url: spec.url });
              // Underline the link
              const textWidth = doc.getTextWidth(`• ${spec.name}`);
              doc.setDrawColor(0, 0, 255);
              doc.line(14, finalY + 1, 14 + textWidth, finalY + 1);
              finalY += 5;
          });
      };

      if (tsSpecs.length > 0) {
          renderLinks(tsSpecs);
          finalY += 4;
      }

      if (otherSpecs.length > 0) {
          if (finalY > 255) {
              doc.addPage();
              finalY = 55;
          }
          doc.setFontSize(14);
          doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          doc.setFont(fontName, 'bold');
          doc.text("Overview Documents", 14, finalY);
          finalY += 6;
          
          doc.setFontSize(9);
          doc.setFont(fontName, 'normal');
          renderLinks(otherSpecs);
      }
    }

    // Add Headers and Footers to all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        if (i > 1) {
            renderHeader(false);
        }
        addFooter(i);
    }

    const filename = customerName 
       ? `Quote_${customerName.replace(/\s+/g,'_')}_${config.dealType}_${new Date().toISOString().slice(0,10)}.pdf`
       : `Quote_${config.dealType}_${new Date().toISOString().slice(0,10)}.pdf`;
    doc.save(filename);
    } catch (error) {
      console.error("Error generating PDF:", error);
      setPdfError(error instanceof Error ? error.message : "An unknown error occurred while generating the PDF.");
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handleExcelExport = async () => {
    setIsExcelLoading(true);
    
    try {
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

      // --- 4. Commercial Schedule / Extension Quote ---
      if (isExtensionQuote && extensionResults) {
        sheet.addRow(['EXTENSION QUOTE']).font = { ...fontStyle, bold: true, size: 14 };
        const extHeaderRow = sheet.addRow(['Description', 'Value']);
        extHeaderRow.eachCell(cell => cell.style = headerStyle);

        if (extensionResults.type === 'A') {
          sheet.addRow(['Variant', extensionResults.variant]);
          sheet.addRow(['Customer TCV (USD)', extensionResults.customerTCV]).getCell(2).numFmt = '"$"#,##0.00';
          sheet.addRow(['Extension Percentage', extensionResults.extensionPercentage / 100]).getCell(2).numFmt = '0.00%';
          sheet.addRow(['Customer Extension (USD)', extensionResults.customerExtension]).getCell(2).numFmt = '"$"#,##0.00';
          sheet.addRow(['Current Spend (Exit Year) (USD)', extensionResults.currentSpend]).getCell(2).numFmt = '"$"#,##0.00';
          sheet.addRow(['Monthly Cost (USD)', extensionResults.monthlyCost]).getCell(2).numFmt = '"$"#,##0.00';
          sheet.addRow(['Months Available', extensionResults.monthsAvailable]).getCell(2).numFmt = '0.00';
          sheet.addRow(['Integer Months', extensionResults.integerMonths]);
          sheet.addRow(['Difference to Extension (FPI %)', (extensionResults.fpiPercentage || 0) / 100]).getCell(2).numFmt = '0.00%';
          sheet.addRow(['End-User Price (USD)', extensionResults.endUserPrice]).getCell(2).numFmt = '"$"#,##0.00';
          
          if (config.channel !== ChannelType.DIRECT) {
            sheet.addRow(['End-User Price (SAR)', extensionResults.endUserPrice * EXCHANGE_RATE_SAR]).getCell(2).numFmt = '"SAR "#,##0.00';
            sheet.addRow(['VAT (15%) (SAR)', extensionResults.endUserPrice * EXCHANGE_RATE_SAR * 0.15]).getCell(2).numFmt = '"SAR "#,##0.00';
            sheet.addRow(['Total (SAR)', extensionResults.endUserPrice * EXCHANGE_RATE_SAR * 1.15]).getCell(2).numFmt = '"SAR "#,##0.00';
          }
        } else {
          sheet.addRow(['Variant', extensionResults.variant]);
          sheet.addRow(['Current Spend (Exit Year) (USD)', extensionResults.currentSpend]).getCell(2).numFmt = '"$"#,##0.00';
          sheet.addRow(['Monthly Cost (USD)', extensionResults.monthlyCost]).getCell(2).numFmt = '"$"#,##0.00';
          sheet.addRow(['Monthly Cost (SAR)', extensionResults.monthlyCostSAR]).getCell(2).numFmt = '"SAR "#,##0.00';
          sheet.addRow(['Eligible Months (<100k SAR)', extensionResults.monthsCovered]);
          sheet.addRow(['End-User Price (USD)', extensionResults.endUserPrice]).getCell(2).numFmt = '"$"#,##0.00';
          
          if (config.channel !== ChannelType.DIRECT) {
            sheet.addRow(['End-User Price (SAR)', extensionResults.endUserPrice * EXCHANGE_RATE_SAR]).getCell(2).numFmt = '"SAR "#,##0.00';
            sheet.addRow(['VAT (15%) (SAR)', extensionResults.endUserPrice * EXCHANGE_RATE_SAR * 0.15]).getCell(2).numFmt = '"SAR "#,##0.00';
            sheet.addRow(['Total (SAR)', extensionResults.endUserPrice * EXCHANGE_RATE_SAR * 1.15]).getCell(2).numFmt = '"SAR "#,##0.00';
          }
        }
      } else {
        // --- 4. Commercial Schedule (With Formulas) ---
        sheet.addRow(['COMMERCIAL SCHEDULE']).font = { ...fontStyle, bold: true, size: 14 };

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

        const getYearLabelExcel = (yearIndex: number) => {
            if (useStartDate && startMonthYear) {
                const [yearStr, monthStr] = startMonthYear.split('-');
                const startYear = parseInt(yearStr);
                const startMonth = parseInt(monthStr);
                
                const start = new Date(startYear + yearIndex, startMonth - 1, 1);
                const end = new Date(start);
                end.setFullYear(end.getFullYear() + 1);
                end.setDate(end.getDate() - 1);
                
                const formatD = (d: Date) => {
                    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    const day = d.getDate().toString().padStart(2, '0');
                    const month = monthNames[d.getMonth()];
                    return `${month} ${day}, ${d.getFullYear()}`;
                };
                
                return `Year ${yearIndex + 1}:\n${formatD(start)} to ${formatD(end)}`;
            }
            return `Year ${yearIndex + 1}`;
        };

        data.yearlyResults.forEach((r, yearIdx) => {
            const rowData: any[] = [getYearLabelExcel(r.year - 1)];
            
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
            addedRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
            
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

  const handleStartDateCheckboxChange = (checked: boolean) => {
    setUseStartDate(checked);
    if (checked) {
      setIsStartDateModalOpen(true);
    }
  };

  return (
    <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
      


      {/* Start Date Modal */}
      {isStartDateModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Select Start Date</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Month and Year
              </label>
              <input 
                type="month" 
                value={startMonthYear}
                onChange={(e) => setStartMonthYear(e.target.value)}
                className="block w-full text-sm border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-sans"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => {
                  setUseStartDate(false);
                  setIsStartDateModalOpen(false);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button 
                onClick={() => setIsStartDateModalOpen(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
            readOnly
            className="block w-full text-sm border-gray-300 rounded-md shadow-sm border p-2 bg-gray-100 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-300 font-sans cursor-not-allowed"
          />
        </div>
        <div>
           <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Rep Email</label>
           <input 
             type="email" 
             placeholder="first.last@wolterskluwer.com"
             value={repEmail}
             readOnly
             className="block w-full text-sm border-gray-300 rounded-md shadow-sm border p-2 bg-gray-100 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-300 font-sans cursor-not-allowed"
           />
        </div>
        <div>
           <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Rep Phone</label>
           <input 
             type="tel" 
             placeholder="+966..."
             value={repPhone}
             readOnly
             className="block w-full text-sm border-gray-300 rounded-md shadow-sm border p-2 bg-gray-100 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-300 font-sans cursor-not-allowed"
           />
        </div>
      </div>
      
      {/* Checkboxes Section */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {!isExtensionQuote && (
            <>
              <div className="flex items-center">
                  <input 
                    id="show-monthly-cost"
                    type="checkbox" 
                    checked={showMonthlyCost} 
                    onChange={(e) => setShowMonthlyCost(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded bg-white dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label htmlFor="show-monthly-cost" className="ml-2 text-xs font-medium text-gray-600 dark:text-gray-300 cursor-pointer">
                      Show Monthly Cost
                  </label>
              </div>

              <div className="flex items-center">
                  <input 
                    id="show-totals"
                    type="checkbox" 
                    checked={showTotals} 
                    onChange={(e) => setShowTotals(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded bg-white dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label htmlFor="show-totals" className="ml-2 text-xs font-medium text-gray-600 dark:text-gray-300 cursor-pointer">
                      Show Totals
                  </label>
              </div>

              <div className="flex items-center">
                  <input 
                    id="show-emr-integration"
                    type="checkbox" 
                    checked={showEmrIntegration} 
                    onChange={(e) => setShowEmrIntegration(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded bg-white dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label htmlFor="show-emr-integration" className="ml-2 text-xs font-medium text-gray-600 dark:text-gray-300 cursor-pointer">
                      Include EMR Term
                  </label>
              </div>

              <div className="flex items-center">
                  <input 
                    id="has-opt-out"
                    type="checkbox" 
                    checked={hasOptOutClause} 
                    onChange={(e) => setHasOptOutClause(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded bg-white dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label htmlFor="has-opt-out" className="ml-2 text-xs font-medium text-gray-600 dark:text-gray-300 cursor-pointer">
                      Include Opt-out Clause
                  </label>
              </div>
            </>
          )}

          <div className="flex items-center">
              <input 
                id="designated-sites-check"
                type="checkbox" 
                checked={hasDesignatedSites} 
                onChange={(e) => handleSiteCheckboxChange(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded bg-white dark:bg-gray-700 dark:border-gray-600"
              />
              <label htmlFor="designated-sites-check" className="ml-2 text-xs font-medium text-gray-600 dark:text-gray-300 cursor-pointer">
                  Add designated sites
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

          <div className="flex items-center">
              <input 
                id="start-date-check"
                type="checkbox" 
                checked={useStartDate} 
                onChange={(e) => handleStartDateCheckboxChange(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded bg-white dark:bg-gray-700 dark:border-gray-600"
              />
              <label htmlFor="start-date-check" className="ml-2 text-xs font-medium text-gray-600 dark:text-gray-300 cursor-pointer">
                  Include Start Date
              </label>
              {useStartDate && (
                  <button 
                    onClick={() => setIsStartDateModalOpen(true)}
                    className="ml-2 text-[10px] text-blue-600 underline hover:text-blue-800"
                  >
                    (Edit Date)
                  </button>
              )}
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
      {pdfError && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm font-sans">
          <strong>Error generating PDF:</strong> {pdfError}
        </div>
      )}
    </div>
  );
};
