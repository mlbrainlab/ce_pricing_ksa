// @ts-nocheck
import React, { useState } from 'react';
import { Download, FileText, Table } from 'lucide-react';
import { CalculationOutput, DealConfiguration, ChannelType, DealType } from '../types';
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
  renewalNotes?: string[];
}

const FONT_URLS = {
  Inter: {
    regular: "https://cdn.jsdelivr.net/gh/zingrx/fonts_inter_ttf@main/ttf/Inter-Regular.ttf",
    bold: "https://cdn.jsdelivr.net/gh/zingrx/fonts_inter_ttf@main/ttf/Inter-Bold.ttf"
  },
  FiraSans: {
    regular: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/firasans/FiraSans-Regular.ttf",
    bold: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/firasans/FiraSans-Bold.ttf"
  },
  NotoSansArabic: {
    regular: "https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/unhinted/ttf/NotoSansArabic/NotoSansArabic-Regular.ttf",
    bold: "https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/unhinted/ttf/NotoSansArabic/NotoSansArabic-Bold.ttf"
  }
};

type FontType = 'Inter' | 'FiraSans' | 'NotoSansArabic';

export const PRODUCT_FULL_NAMES: Record<string, string> = {
  "ANYWHERE": "UpToDate® Anywhere",
  "UTDADV": "UpToDate® Advanced™",
  "UTDEE": "UpToDate® Enterprise™",
  "SM": "UpToDate® Subscriber Manager",
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
  data, config, useStartDate, setUseStartDate, startMonthYear, setStartMonthYear,
  isExtensionQuote, extensionResults, renewalNotes = []
}) => {
  const [customerName, setCustomerName] = useState('');
  const [repName, setRepName] = useState(() => localStorage.getItem('wk_rep_name') || '');
  const [repPhone, setRepPhone] = useState(() => localStorage.getItem('wk_rep_phone') || '');
  const [repEmail, setRepEmail] = useState(() => localStorage.getItem('wk_rep_email') || '');
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isExcelLoading, setIsExcelLoading] = useState(false);
  
  const [includeRenewalIncreaseInfo, setIncludeRenewalIncreaseInfo] = useState(false);
  React.useEffect(() => {
    const authName = localStorage.getItem('wk_auth_name');
    if (authName) {
      setRepName(authName.toUpperCase());
    }
  }, []);
  
  const [selectedFont] = useState<FontType>('FiraSans');
  const [fontCache, setFontCache] = useState<Record<FontType, { regular: string | null, bold: string | null }>>({
    Inter: { regular: null, bold: null },
    FiraSans: { regular: null, bold: null },
    NotoSansArabic: { regular: null, bold: null }
  });
  const [isFontLoading, setIsFontLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const isUtdSm = config.selectedProducts.includes('utd') && config.productInputs['utd']?.variant === 'SM';
  const [showStats, setShowStats] = useState(true);
  const [showMonthlyCost, setShowMonthlyCost] = useState(false);
  const [showTotals, setShowTotals] = useState(true);
  const [showEmrIntegration, setShowEmrIntegration] = useState(true);
  const [hasOptOutClause, setHasOptOutClause] = useState(false);
  
  const canShowFLinkIntegration = config.selectedProducts.includes('utd') && config.selectedProducts.includes('lxd') && (config.productInputs['lxd']?.variant || '').includes('FLINK');
  const [showFLinkIntegration, setShowFLinkIntegration] = useState(false);

  const [hasDesignatedSites, setHasDesignatedSites] = useState(false);
  const [designatedSites, setDesignatedSites] = useState('');
  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
  const [isStartDateModalOpen, setIsStartDateModalOpen] = useState(false);
  
  const [isBreakdownPerSite, setIsBreakdownPerSite] = useState(false);
  const [showSitesOnly, setShowSitesOnly] = useState(false);
  const [siteBreakdown, setSiteBreakdown] = useState<SiteBreakdownItem[]>([]);
  const [bulkPasteText, setBulkPasteText] = useState('');

  const [showCpModal, setShowCpModal] = useState(false);

  const handleBulkPaste = () => {
    const lines = bulkPasteText.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return;

    const newSites: SiteBreakdownItem[] = lines.map((line, index) => ({
      id: Date.now().toString() + index, name: line.trim(), counts: {}
    }));
    
    setSiteBreakdown(prev => {
      if (prev.length > 0 && prev[0].name.trim() === '' && Object.keys(prev[0].counts).length === 0) {
        return [...newSites, ...prev.slice(1)];
      }
      return [...prev, ...newSites];
    });
    setBulkPasteText('');
  };

  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewFilename, setPreviewFilename] = useState<string>('');

  const handlePDFPreview = async () => {
    if (!customerName.trim()) { alert("Please enter a Customer Name before previewing."); return; }
    setIsPreviewModalOpen(true);
    await refreshPreview();
  };

  const refreshPreview = async () => {
    const isCp = config.channel === ChannelType.PARTNER_SOURCED || config.channel === ChannelType.FULFILMENT;
    const result = await executePDFExport(isCp, true);
    if (result) {
        if (previewPdfUrl) {
            URL.revokeObjectURL(previewPdfUrl);
        }
        const url = URL.createObjectURL(result.blob);
        setPreviewPdfUrl(url);
        setPreviewFilename(result.filename);
    }
  };

  React.useEffect(() => {
    if (isPreviewModalOpen) {
        refreshPreview();
    }
  }, [showStats, showMonthlyCost, showTotals, showEmrIntegration, hasOptOutClause, showFLinkIntegration, hasDesignatedSites, useStartDate, includeRenewalIncreaseInfo, designatedSites, siteBreakdown, isBreakdownPerSite, showSitesOnly, customerName, repName, repEmail, repPhone]);

  const handlePDFExport = () => {
    if (!customerName.trim()) { alert("Please enter a Customer Name before exporting."); return; }
    if (config.channel === ChannelType.PARTNER_SOURCED) { executePDFExport(true); } 
    else if (config.channel === ChannelType.FULFILMENT) { setShowCpModal(true); } 
    else { executePDFExport(false); }
  };

  const executePDFExport = async (isCp: boolean, isPreview: boolean = false) => {
    setShowCpModal(false);
    setIsPdfLoading(true);
    setPdfError(null);
    try {
      const doc = new jsPDF();
      const fontName = selectedFont;
      const isIndirect = config.channel !== ChannelType.DIRECT;
      const displayCurrency = isIndirect ? 'SAR' : 'USD';
      
      try {
          let regularFontB64 = fontCache[fontName].regular;
          let boldFontB64 = fontCache[fontName].bold;
          let arabicRegB64 = fontCache['NotoSansArabic'].regular;
          let arabicBoldB64 = fontCache['NotoSansArabic'].bold;

          const needsMain = !regularFontB64 || !boldFontB64;
          const needsArabic = isCp && (!arabicRegB64 || !arabicBoldB64);

          if (needsMain || needsArabic) {
               setIsFontLoading(true);
               
               const fetchWithTimeout = (url: string, timeout = 5000) => {
                   return Promise.race([
                       fetch(`/api/proxy-font?url=${encodeURIComponent(url)}`).then(res => {
                           if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                           return res.blob();
                       }),
                       new Promise<Blob>((_, reject) => setTimeout(() => reject(new Error('Request timeout')), timeout))
                   ]);
               };
               
               const blobToBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
                   const reader = new FileReader();
                   reader.onloadend = () => { if (reader.result) resolve(reader.result as string); else reject(new Error('Failed to read blob')); };
                   reader.onerror = reject;
                   reader.readAsDataURL(blob);
               });

               if (needsMain) {
                   const [regBlob, boldBlob] = await Promise.all([
                       fetchWithTimeout(FONT_URLS[fontName].regular),
                       fetchWithTimeout(FONT_URLS[fontName].bold)
                   ]);
                   regularFontB64 = (await blobToBase64(regBlob)).split(',')[1];
                   boldFontB64 = (await blobToBase64(boldBlob)).split(',')[1];
                   setFontCache(prev => ({ ...prev, [fontName]: { regular: regularFontB64, bold: boldFontB64 } }));
               }
               
               if (needsArabic) {
                   const [arRegBlob, arBoldBlob] = await Promise.all([
                       fetchWithTimeout(FONT_URLS['NotoSansArabic'].regular),
                       fetchWithTimeout(FONT_URLS['NotoSansArabic'].bold)
                   ]);
                   arabicRegB64 = (await blobToBase64(arRegBlob)).split(',')[1];
                   arabicBoldB64 = (await blobToBase64(arBoldBlob)).split(',')[1];
                   setFontCache(prev => ({ ...prev, 'NotoSansArabic': { regular: arabicRegB64, bold: arabicBoldB64 } }));
               }
          }

          if (regularFontB64 && boldFontB64) {
              doc.addFileToVFS(`${fontName}-Regular.ttf`, regularFontB64);
              doc.addFont(`${fontName}-Regular.ttf`, fontName, 'normal');
              doc.addFileToVFS(`${fontName}-Bold.ttf`, boldFontB64);
              doc.addFont(`${fontName}-Bold.ttf`, fontName, 'bold');
          }
          
          if (isCp && arabicRegB64 && arabicBoldB64) {
              doc.addFileToVFS(`NotoSansArabic-Regular.ttf`, arabicRegB64);
              doc.addFont(`NotoSansArabic-Regular.ttf`, 'NotoSansArabic', 'normal');
              doc.addFileToVFS(`NotoSansArabic-Bold.ttf`, arabicBoldB64);
              doc.addFont(`NotoSansArabic-Bold.ttf`, 'NotoSansArabic', 'bold');
          }
      } catch (e) {
          console.error("Font loading error", e);
      } finally { setIsFontLoading(false); }

      const primaryColor: [number, number, number] = [0, 122, 195];
      const docDate = new Date().toLocaleDateString();
      const refId = `REF-${Date.now().toString().slice(-6)}`;
      let finalY = 60;

      const renderHeader = (_isFirstPage: boolean) => {
          doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          if (_isFirstPage) { doc.rect(0, 0, 210, 135, 'F'); } else { doc.rect(0, 0, 210, 32, 'F'); }
          try {
              doc.addImage(WK_LOGO_BASE64, 'PNG', 14, 10, 50, 10, 'WK_LOGO', 'FAST');
              if (isIndirect) { doc.addImage(SAMIR_WHITE_LOGO_BASE64, 'PNG', 162, 10, 36, 10, 'SAMIR_LOGO', 'FAST'); }
          } catch (e) { console.warn("Logo load error", e); }
          doc.setFontSize(12); doc.setTextColor(255, 255, 255);
      };

      const addFooter = (pageNumber: number) => {
          const pageHeight = doc.internal.pageSize.height || 297;
          if (isCp) {
              const footerY = pageHeight - 16;
              doc.setDrawColor(220, 38, 38); doc.setLineWidth(0.5); doc.line(14, footerY - 4, 196, footerY - 4);
              doc.setFontSize(8); doc.setTextColor(50, 50, 50); doc.setFont(fontName, 'normal');
              const p1 = "Samir Trading & Marketing - CJSC. Tel: "; const p2 = "9200 00062"; const p3 = " - www.samirgroup.com";
              const w1 = doc.getTextWidth(p1);
              doc.setFont(fontName, 'bold'); const w2 = doc.getTextWidth(p2); doc.setFont(fontName, 'normal'); const w3 = doc.getTextWidth(p3);
              const totalW = w1 + w2 + w3; const startX = 105 - (totalW / 2);
              doc.text(p1, startX, footerY); doc.setTextColor(220, 38, 38); doc.setFont(fontName, 'bold'); doc.text(p2, startX + w1, footerY);
              doc.setTextColor(50, 50, 50); doc.setFont(fontName, 'normal'); doc.text(p3, startX + w1 + w2, footerY);
              doc.setFontSize(6);
              doc.text(`C.R. 4030045960 C.O.C. 21625. Capital S.R. 75,000,000. Jeddah P.O. Box 599, Jeddah 21421. Tel: (012) 682-8219. Fax: (012) 683-0820.`, 105, footerY + 4, { align: 'center' });
              doc.setFont('NotoSansArabic', 'normal');
              doc.text(`شركة سمير للتجارة والتسويق - مساهمة مقفلة. سابقاً شركة سمير لمعدات التصوير - مساهمة مقفلة.`, 105, footerY + 8, { align: 'center' });
              doc.setFont(fontName, 'normal'); doc.setTextColor(150, 150, 150); doc.text(`Page ${pageNumber}`, 196, footerY + 8, { align: 'right' });
          } else {
              doc.setFontSize(8); doc.setTextColor(150, 150, 150); doc.text(`Page ${pageNumber}`, 196, pageHeight - 10, { align: 'right' });
              doc.text(`©${new Date().getFullYear()} UpToDate, Inc. and its affiliates and/or licensors. All rights reserved.`, 14, pageHeight - 10);
          }
      };

      const formatMoney = (amount: number, currency: string) => { return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount); };

      renderHeader(true);
      doc.setFontSize(26); doc.setFont(fontName, 'bold'); doc.setTextColor(255, 255, 255);
      
      let proposalTitle = "BUDGETARY COMMERCIAL\nPROPOSAL";
      if (config.dealType === DealType.RENEWAL) proposalTitle = "BUDGETARY COMMERCIAL\nPROPOSAL [RENEWAL]";
      else if (config.dealType === DealType.EXTENSION) proposalTitle = "BUDGETARY COMMERCIAL\nPROPOSAL [EXTENSION]";
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
        if (variant === 'SM') title = "UpToDate\u00AE Subscriber Manager";
        doc.setFontSize(22); doc.setFont(fontName, 'bold'); doc.text(title, 105, currentY, { align: 'center' }); currentY += 8;
        doc.setFontSize(12); doc.setFont(fontName, 'normal'); doc.text("Clinical Decision Support Solution", 105, currentY, { align: 'center' }); currentY += 20;
    }
    
    if (hasLXD) {
        const variant = config.productInputs['lxd']?.variant || '';
        let subHeading = "Drug Referential Solution";
        if (variant.includes('FLINK')) subHeading = variant.includes('IPE') ? "including Formulink\u2122 and Integrated Patient Education" : "including Formulink\u2122";
        doc.setFontSize(22); doc.setFont(fontName, 'bold'); doc.text("Lexidrug\u00AE", 105, currentY, { align: 'center' }); currentY += 8;
        doc.setFontSize(12); doc.setFont(fontName, 'normal'); doc.text(subHeading, 105, currentY, { align: 'center' }); currentY += 15;
    }
    
    const finalRepName = isCp ? "Alaa Hanafy" : repName;
    const finalRepEmail = isCp ? "alaa.hanafy@samirgroup.com" : repEmail;
    
    let finalRepPhone = repPhone;
    if (isCp) {
        finalRepPhone = "0566872868";
    }

    doc.setFontSize(10); doc.setTextColor(50, 50, 50); doc.setFont(fontName, 'normal');
    let currentFooterY = 250;
    doc.text(`Customer: ${customerName || 'N/A'}`, 14, currentFooterY); currentFooterY += 5;
    doc.text(`Prepared by: ${finalRepName || 'N/A'}`, 14, currentFooterY); currentFooterY += 5;
    
    if (finalRepEmail) { doc.text(`Email: ${finalRepEmail}`, 14, currentFooterY); currentFooterY += 5; }
    if (finalRepPhone) {
        let formattedPhone = finalRepPhone;
        const digits = finalRepPhone.replace(/\D/g, '');
        if ((digits.startsWith('05') && digits.length === 10) || (digits.startsWith('5') && digits.length === 9)) {
             const core = digits.startsWith('05') ? digits.substring(1) : digits;
             formattedPhone = `+966 ${core.substring(0, 2)} ${core.substring(2, 5)} ${core.substring(5, 9)}`;
        }
        doc.text(`Phone: ${formattedPhone}`, 14, currentFooterY); currentFooterY += 5;
    }
    doc.text(`Date: ${docDate}`, 14, currentFooterY); currentFooterY += 5;
    
    let displayRef = refId;
    if (isCp) {
        const storedCounter = sessionStorage.getItem('wk_ah_counter');
        const currentCounter = storedCounter ? parseInt(storedCounter, 10) : 1;
        const padCounter = currentCounter.toString().padStart(2, '0');
        const d = new Date(); const dd = d.getDate().toString().padStart(2, '0'); const mm = (d.getMonth() + 1).toString().padStart(2, '0'); const yy = d.getFullYear().toString().slice(-2);
        displayRef = `AH/${dd}${mm}${yy}/${padCounter}`;
        sessionStorage.setItem('wk_ah_counter', (currentCounter + 1).toString());
    }
    doc.text(`Ref: ${displayRef}`, 14, currentFooterY);

    doc.addPage();
    doc.setFillColor(255, 255, 255); doc.setFontSize(16); doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont(fontName, 'bold'); doc.text("Confidentiality Notice", 14, 45); 
    doc.setFontSize(11); doc.setTextColor(0, 0, 0); doc.setFont(fontName, 'normal');
    const disclaimer = `The information contained within this Proposal is confidential and proprietary and may be used solely for the purpose of evaluating the potential license of offerings and/or services provided by the Wolters Kluwer Health, Inc. entities (sometimes collectively referred to as “Wolters Kluwer”) identified in this Proposal. This Proposal is non-binding on each party. Neither this Proposal, nor any oral or written communication concerning the matters covered by this Proposal, shall create any binding obligations on any party; only those obligations set forth in a separate written definitive agreement negotiated and executed by all parties in a form approved by each party shall be binding upon the parties. Any information contained within this Proposal may only be disclosed to directors, officers, employees, and agents of the recipient organization who need to know such information for the purpose of evaluating this Proposal. The information contained within this Proposal shall not be communicated to anyone outside of the recipient organization without the express written permission of Wolters Kluwer.`;
    doc.setLineHeightFactor(1.5); doc.text(doc.splitTextToSize(disclaimer, 180), 14, 60); doc.setLineHeightFactor(1.15); // Reset to default

    doc.addPage();
    doc.setFontSize(16); doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont(fontName, 'bold'); doc.text(isExtensionQuote ? "Extension Quote Details" : "Pricing Details", 14, 45);

    const getYearLabel = (yearIndex: number) => {
        if (useStartDate && startMonthYear) {
            const [yearStr, monthStr] = startMonthYear.split('-');
            const start = new Date(parseInt(yearStr) + yearIndex, parseInt(monthStr) - 1, 1);
            const end = new Date(start); end.setFullYear(end.getFullYear() + 1); end.setDate(end.getDate() - 1);
            const formatD = (d: Date) => { const mo = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]; return `${mo[d.getMonth()]} ${d.getDate().toString().padStart(2, '0')}, ${d.getFullYear()}`; };
            return `Year ${yearIndex + 1}:\n${formatD(start)} to ${formatD(end)}`;
        }
        return `Year ${yearIndex + 1}`;
    };

    let tableHead: string[][] = []; let tableBody: string[][] = []; const columnStyles: any = {};
    const getExtensionDates = () => {
        if (useStartDate && startMonthYear && extensionResults) {
            const [yearStr, monthStr] = startMonthYear.split('-');
            const start = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
            const end = new Date(start);
            if (extensionResults.useFullExtension) { end.setMonth(end.getMonth() + extensionResults.integerMonths); end.setDate(end.getDate() + extensionResults.extraDays - 1); } 
            else { end.setMonth(end.getMonth() + (extensionResults.type === 'A' ? extensionResults.integerMonths : extensionResults.monthsCovered)); end.setDate(end.getDate() - 1); }
            const formatD = (d: Date) => { const mo = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]; return `${mo[d.getMonth()]} ${d.getDate().toString().padStart(2, '0')}, ${d.getFullYear()}`; };
            return `${formatD(start)} to ${formatD(end)}`;
        }
        return 'N/A';
    };

    if (isExtensionQuote && extensionResults) {
      if (extensionResults.type === 'A') {
        const durationText = extensionResults.useFullExtension ? `${extensionResults.days} days (${extensionResults.integerMonths} months${extensionResults.extraDays > 0 ? ` and ${extensionResults.extraDays} days` : ''})` : `${Math.round(extensionResults.monthsAvailable * 30)} days (${extensionResults.monthsAvailable.toFixed(2)} months)`;
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
      const productColIndices: Record<string, number> = {};
      config.selectedProducts.forEach((pid, idx) => { productColIndices[pid] = 1 + idx; });
      const totalStartIndex = 1 + config.selectedProducts.length;
      if (productColIndices['utd'] !== undefined) columnStyles[productColIndices['utd']] = { fillColor: [220, 252, 231] };
      if (productColIndices['lxd'] !== undefined) columnStyles[productColIndices['lxd']] = { fillColor: [224, 242, 254] };
      columnStyles[totalStartIndex] = { fontStyle: 'bold' };
      if (isIndirect) columnStyles[totalStartIndex + 2] = { fontStyle: 'bold' };

      if (isIndirect) {
        const prodCols = config.selectedProducts.map(pid => { return `${pid === 'utd' ? 'UpToDate' : pid === 'lxd' ? 'Lexidrug' : pid} (SAR)`; });
        tableHead = [['Year', ...prodCols, 'Total (SAR)', 'VAT (15%)', 'Grand Total\n(SAR)']];
        tableBody = data.yearlyResults.map(r => {
          const pValues = config.selectedProducts.map(pid => { const bd = r.breakdown.find(x => x.id === pid); return bd ? formatMoney(bd.grossSAR, 'SAR') : '-'; });
          return [ getYearLabel(r.year - 1), ...pValues, formatMoney(r.grossSAR, 'SAR'), formatMoney(r.vatSAR, 'SAR'), formatMoney(r.grandTotalSAR, 'SAR') ];
        });
        if (showTotals) {
            const productTotalsSAR = config.selectedProducts.map(pid => {
                const total = data.yearlyResults.reduce((sum, r) => sum + (r.breakdown.find(x => x.id === pid)?.grossSAR || 0), 0);
                return formatMoney(total, 'SAR');
            });
            tableBody.push(['TOTAL', ...productTotalsSAR, formatMoney(data.totalGrossSAR, 'SAR'), formatMoney(data.totalVatSAR, 'SAR'), formatMoney(data.totalGrandTotalSAR, 'SAR')]);
        }
      } else {
        const prodCols = config.selectedProducts.map(pid => `${pid === 'utd' ? 'UpToDate' : pid === 'lxd' ? 'Lexidrug' : pid} (USD)`);
        tableHead = [['Year', ...prodCols, 'Total (USD)']];
        tableBody = data.yearlyResults.map(r => {
          const pValues = config.selectedProducts.map(pid => { const bd = r.breakdown.find(x => x.id === pid); return bd ? formatMoney(bd.gross, 'USD') : '-'; });
          return [ getYearLabel(r.year - 1), ...pValues, formatMoney(r.grossUSD, 'USD') ];
        });
        if (showTotals) {
            const productTotalsUSD = config.selectedProducts.map(pid => {
                const total = data.yearlyResults.reduce((sum, r) => sum + (r.breakdown.find(x => x.id === pid)?.gross || 0), 0);
                return formatMoney(total, 'USD');
            });
            tableBody.push(['TOTAL', ...productTotalsUSD, formatMoney(data.totalGrossUSD, 'USD')]);
        }
      }
    }

    autoTable(doc, {
      startY: 55, head: tableHead, body: tableBody, theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: 255, font: fontName, fontStyle: 'bold', valign: 'middle' },
      styles: { fontSize: 9, font: fontName, overflow: 'linebreak', cellPadding: 2, valign: 'middle', halign: 'left' }, 
      columnStyles: columnStyles, margin: { top: 35, left: 14, right: 14 },
      didParseCell: (data) => {
        if (isExtensionQuote) {
            if (data.section === 'body' && ['Dates', 'Extension Duration', 'End-User Price (SAR)', 'Total (SAR)'].includes(Array.isArray(data.row.raw) ? String(data.row.raw[0]) : '')) data.cell.styles.fontStyle = 'bold';
        } else {
            if (showTotals && data.section === 'body' && data.row.index === tableBody.length - 1) data.cell.styles.fontStyle = 'bold'; 
        }
      }
    });

    finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10); doc.setTextColor(0, 0, 0);

    const renderRichText = (text: string, x: number, startY: number, maxWidth: number) => {
      const tokens = text.split(/(<b>.*?<\/b>)/g);
      let currentX = x; let currentY = startY;
      for (const token of tokens) {
        if (!token) continue;
        const isBold = token.startsWith('<b>') && token.endsWith('</b>');
        const content = isBold ? token.slice(3, -4) : token;
        doc.setFont(fontName, isBold ? 'bold' : 'normal');
        for (const word of content.split(/(\s+)/)) {
          if (!word) continue;
          if (word.match(/^\s+$/)) {
            const spaceWidth = doc.getTextWidth(word);
            if (currentX + spaceWidth <= x + maxWidth) currentX += spaceWidth;
            continue;
          }
          const wordWidth = doc.getTextWidth(word);
          if (currentX + wordWidth > x + maxWidth && currentX > x) { currentX = x; currentY += 4; }
          doc.text(word, currentX, currentY); currentX += wordWidth;
        }
      }
      return currentY;
    };

    if (!isExtensionQuote) {
      doc.setFontSize(14); doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont(fontName, 'bold'); doc.text("Operating Statistics", 14, finalY); finalY += 6;
      doc.setFontSize(9); doc.setTextColor(0, 0, 0);

      const statsParts: string[] = [];
      config.selectedProducts.forEach(pid => {
          const p = AVAILABLE_PRODUCTS.find(x => x.id === pid); const inp = config.productInputs[pid];
          if(p && inp) {
              let productName = p.name;
              if (pid === 'utd') productName = 'UpToDate'; if (pid === 'lxd') productName = 'Lexidrug';
              let countLabelText = p.countLabel;
              if (p.countLabel === 'HC') countLabelText = 'clinicians'; if (p.countLabel === 'BC') countLabelText = 'active beds';
              if (pid === 'lxd' && inp.variant && (inp.variant.includes('Seats') || inp.variant === 'Hospital Pharmacy Model')) countLabelText = 'seats';
              const statsToPrint = inp.count > 0 ? inp.count : (inp.existingCount || 0);
              if (statsToPrint > 0) statsParts.push(`${statsToPrint.toLocaleString('en-US')} ${countLabelText} for ${productName}`);
          }
      });
      
      if(statsParts.length > 0 && showStats) {
          doc.setFont(fontName, 'normal');
          const splitStats = doc.splitTextToSize(`This proposal is based on the following statistics for ${customerName}: ${statsParts.join(', ')}.`, 180);
          doc.text(splitStats, 14, finalY); finalY += (splitStats.length * 4) + 1.5;
      }

      if (config.dealType === DealType.RENEWAL && includeRenewalIncreaseInfo && renewalNotes.length > 0) {
          finalY += 2; doc.setFont(fontName, 'normal');
          renewalNotes.forEach(note => { const splitNote = doc.splitTextToSize(`* ${note}`, 180); doc.text(splitNote, 14, finalY); finalY += (splitNote.length * 4); });
          finalY += 1.5;
      }

      if (showMonthlyCost) {
          const getValue = (valUSD: number, valSAR: number) => isIndirect ? valSAR : valUSD;
          if (config.selectedProducts.includes('utd')) {
              const count = config.productInputs['utd'].count || 1;
              const totalGrossUSD = data.yearlyResults.reduce((sum, r) => sum + (r.breakdown.find(x => x.id === 'utd')?.gross || 0), 0);
              const totalGrossSAR = data.yearlyResults.reduce((sum, r) => sum + (r.breakdown.find(x => x.id === 'utd')?.grossSAR || 0), 0);
              const valStr = `${displayCurrency} ${((getValue(totalGrossUSD, totalGrossSAR) / config.years) / count / 12).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
              doc.setFont(fontName, 'normal'); doc.text("Your UpToDate subscription costs ", 14, finalY);
              const w1 = doc.getTextWidth("Your UpToDate subscription costs "); doc.setFont(fontName, 'bold'); doc.text(valStr, 14 + w1, finalY);
              const w2 = doc.getTextWidth(valStr); doc.setFont(fontName, 'normal'); doc.text(" monthly per physician.", 14 + w1 + w2, finalY); finalY += 5;
          }
          if (config.selectedProducts.includes('lxd')) {
              const count = config.productInputs['lxd'].count || 1;
              const totalGrossUSD = data.yearlyResults.reduce((sum, r) => sum + (r.breakdown.find(x => x.id === 'lxd')?.gross || 0), 0);
              const totalGrossSAR = data.yearlyResults.reduce((sum, r) => sum + (r.breakdown.find(x => x.id === 'lxd')?.grossSAR || 0), 0);
              const valStr = `${displayCurrency} ${((getValue(totalGrossUSD, totalGrossSAR) / config.years) / count / 12).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
              doc.setFont(fontName, 'normal'); doc.text("Your Lexidrug subscription costs ", 14, finalY);
              const w1 = doc.getTextWidth("Your Lexidrug subscription costs "); doc.setFont(fontName, 'bold'); doc.text(valStr, 14 + w1, finalY);
              const w2 = doc.getTextWidth(valStr); doc.setFont(fontName, 'normal'); doc.text(" monthly per bed.", 14 + w1 + w2, finalY); finalY += 5;
          }
          if (config.selectedProducts.includes('utd') || config.selectedProducts.includes('lxd')) finalY += 2;
      }
    }

    if (hasDesignatedSites) {
        if (isBreakdownPerSite && siteBreakdown.length > 0) {
            doc.setFont(fontName, 'bold'); doc.text("Price Breakdown per Site:", 14, finalY); finalY += 6;
            const siteHeaders = ['Site Name'];
            config.selectedProducts.forEach(pid => siteHeaders.push(`${AVAILABLE_PRODUCTS.find(x => x.id === pid)?.shortName || AVAILABLE_PRODUCTS.find(x => x.id === pid)?.name} Count`));
            if (!showSitesOnly) siteHeaders.push(`Est. Annual Cost (${displayCurrency})`);

            const siteBody = siteBreakdown.map(site => {
                const row = [site.name]; let siteTotalCost = 0;
                config.selectedProducts.forEach(pid => {
                    const count = site.counts[pid] || 0; row.push(count.toLocaleString());
                    if (!showSitesOnly) {
                        const totalCount = config.productInputs[pid]?.count || 1; 
                        const productTotalNet = data.productNetTotals[pid] / config.years; 
                        if (totalCount > 0) siteTotalCost += (count / totalCount) * productTotalNet;
                    }
                });
                if (!showSitesOnly) row.push(formatMoney(isIndirect ? (siteTotalCost * EXCHANGE_RATE_SAR) : siteTotalCost, displayCurrency));
                return row;
            });

            autoTable(doc, {
                startY: finalY, head: [siteHeaders], body: siteBody, theme: 'grid',
                headStyles: { fillColor: [240, 240, 240], textColor: 0, font: fontName, fontStyle: 'bold', valign: 'middle' },
                styles: { fontSize: 9, font: fontName, overflow: 'linebreak', cellPadding: 2, valign: 'middle', halign: 'left' },
                margin: { top: 35, left: 14, right: 14, bottom: isCp ? 25 : 20 },
            });
            finalY = (doc as any).lastAutoTable.finalY + 6;
        } else if (designatedSites.trim().length > 0) {
            doc.setFont(fontName, 'bold'); doc.text("Sites included in the above pricing:", 14, finalY); finalY += 5;
            const sites = designatedSites.split('\n').filter(s => s.trim().length > 0);
            const tableBody = [];
            for (let i = 0; i < sites.length; i += 2) tableBody.push([`${i + 1}. ${sites[i].trim()}`, sites[i + 1] ? `${i + 2}. ${sites[i + 1].trim()}` : '']);
            autoTable(doc, {
                startY: finalY, body: tableBody, theme: 'plain', 
                styles: { fontSize: 9, font: fontName, cellPadding: 3, lineColor: [220, 220, 220], lineWidth: 0.1 },
                columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 90 } },
                margin: { top: 35, left: 14, right: 14, bottom: isCp ? 25 : 20 },
                didDrawCell: (data) => { doc.setDrawColor(220, 220, 220); doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height); }
            });
            finalY = (doc as any).lastAutoTable.finalY + 6;
        }
    }

    finalY += 2; 
    if (finalY > 250) { doc.addPage(); finalY = 55; }

    doc.setFontSize(14); doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont(fontName, 'bold'); doc.text("Terms & Conditions", 14, finalY); finalY += 6;
    doc.setFontSize(9); doc.setTextColor(0, 0, 0); doc.setFont(fontName, 'normal');
    
    const terms: { text: string, isRich?: boolean }[] = [];
    if (isExtensionQuote) {
        terms.push({ text: "The prices mentioned above are not final and subject to change in case of releasing an official RFP." });
        terms.push({ text: "The Internet access is a must for this subscription to be utilized." });
        terms.push({ text: "This budgetary proposal is valid for 30-days." });
    } else {
        terms.push({ text: "The prices mentioned above are not final and subject to change in case of releasing an official RFP." });
        if (config.years > 1) {
            if (!hasOptOutClause) terms.push({ text: "The prices above are tied to a multi-year non-opt-out contract for the same number of years." });
            else {
                const yearsList = Array.from({length: config.years - 1}, (_, i) => i + 2);
                let yearsStr = yearsList.length === 1 ? `Year ${yearsList[0]}` : yearsList.length === 2 ? `Years ${yearsList[0]} and ${yearsList[1]}` : `Years ${yearsList.slice(0,-1).join(', ')}, and ${yearsList[yearsList.length-1]}`;
                terms.push({ text: `<b>Opt-out option:</b> Customer may opt not to renew for ${yearsStr} of this proposal term by providing written notice to UpToDate, Inc. <b>90 days</b> prior to the start date of each respective year of the proposal term. If such notice is not received, Customer will automatically be invoiced for the next year of the proposal term. This clause requires internal approvals from Wolters Kluwer before consideration.`, isRich: true });
            }
        }
        if (config.channel === ChannelType.DIRECT) terms.push({ text: "The price above is exempt from 15% VAT." });
        if (config.years > 1 && config.channel === ChannelType.DIRECT) terms.push({ text: "Payment of the above prices will be made against annual invoices issued each year, with payment due 30 days from the activation start date." });
        terms.push({ text: "Upon renewing the subscription, a statistics recount will be executed, considering the standard price of the exit year." });
        terms.push({ text: "The Internet access is a must for this subscription to be utilized." });
        terms.push({ text: "This budgetary proposal is valid for 60-days." });
        if (showEmrIntegration) terms.push({ text: "Integrating UpToDate® or Lexidrug® with your EMR is included in the prices above, even if the EMR changed during the subscription.*" });
        if (canShowFLinkIntegration && showFLinkIntegration) terms.push({ text: "With this subscription, your formulary will be integrated into UpToDate directly at no additional cost." });
        if (config.selectedProducts.includes('lxd') && config.productInputs['lxd']?.variant === 'Hospital Pharmacy Model') terms.push({ text: "This subscription is limited to the above number of seats." });
        if (isUtdSm) terms.push({ text: "This subscription is limited to the number of seats mentioned above." });
    }

    terms.forEach(term => {
      if (finalY > (isCp ? 245 : 260)) { doc.addPage(); finalY = 55; }
      if (term.isRich) { doc.text("• ", 14, finalY); finalY = renderRichText(term.text, 18, finalY, 176) + 5.5; } 
      else { const splitTerm = doc.splitTextToSize(`• ${term.text}`, 180); doc.text(splitTerm, 14, finalY); finalY += (splitTerm.length * 4) + 1.5; }
    });

    if (finalY > (isCp ? 250 : 260)) { doc.addPage(); finalY = 55; }
    
    // --- TECHNICAL SPECIFICATIONS SECTION ---
    if (!isExtensionQuote) {
      if (finalY > (isCp ? 230 : 245)) {
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
      const hasUTD = config.selectedProducts.includes('utd');
      const hasLXD = config.selectedProducts.includes('lxd');
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

      const renderLinks = (specs: {name: string, url: string}[]) => {
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
    
    if (!isExtensionQuote && showEmrIntegration) {
        doc.setFontSize(8); doc.setTextColor(100, 100, 100);
        doc.text(doc.splitTextToSize("* Some EMR providers put additional charges to integrate our solutions, we’re neither responsible nor covering these costs. It has to be discussed with the EMR provider directly.", 180), 14, (doc.internal.pageSize.height || 297) - (isCp ? 28 : 22));
    } else { finalY += 4; }

      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) { 
          doc.setPage(i); 
          if (i > 1) {
              renderHeader(false);
          }
          addFooter(i); 
      }

      const productMix = config.selectedProducts.map(p => p.toUpperCase()).join('_');
      const filename = customerName 
       ? `Quote_${customerName.replace(/\s+/g,'_')}_${config.dealType}_${productMix}_${new Date().toISOString().slice(0,10)}.pdf`
       : `Quote_${config.dealType}_${productMix}_${new Date().toISOString().slice(0,10)}.pdf`;
      
      const pdfBlob = doc.output('blob');
      
      if (isPreview) {
          return { blob: pdfBlob, filename };
      }
      
      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = blobUrl; link.download = filename; link.click();
      URL.revokeObjectURL(blobUrl);

    } catch (error) {
      console.error('PDF generation error:', error);
      setPdfError(error instanceof Error ? error.message : 'Unknown error');
    } finally { setIsPdfLoading(false); }
  };

  const getColLetter = (colIndex: number) => { let letter = ''; while (colIndex > 0) { let remainder = (colIndex - 1) % 26; letter = String.fromCharCode(65 + remainder) + letter; colIndex = Math.floor((colIndex - 1) / 26); } return letter; };

  const handleExcelExport = async () => {
    if (!customerName.trim()) { alert("Please enter a Customer Name before exporting."); return; }
    setIsExcelLoading(true);
    try {
      const isIndirect = config.channel !== ChannelType.DIRECT;
      const displayCurrency = isIndirect ? 'SAR' : 'USD';
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Pricing Details');
      const prodNames = config.selectedProducts.map(p => PRODUCT_FULL_NAMES[p] || PRODUCT_FULL_NAMES[config.productInputs[p]?.variant] || p);
      
      const titleRow = ws.addRow([isExtensionQuote ? "Extension Quote Details" : "Pricing Details"]);
      titleRow.font = { bold: true, size: 16, color: { argb: 'FF007AC3' } };
      ws.addRow([]); ws.addRow(['Customer Name:', customerName]); ws.addRow(['Date:', new Date().toLocaleDateString()]);
      ws.addRow(['Currency:', displayCurrency]); ws.addRow([]);

      let contentRowStart = 7;
      if (isExtensionQuote && extensionResults) {
         if (extensionResults.type === 'A') {
             const headRow = ws.addRow(['Description', 'Value']); headRow.font = { bold: true };
             ws.addRow(['Product', PRODUCT_FULL_NAMES[extensionResults.variant] || extensionResults.variant]);
             ws.addRow(['Dates', extensionResults.useFullExtension ? 'Full Term' : `${extensionResults.monthsAvailable.toFixed(2)} months`]);
             ws.addRow(['Total Contract\'s Value (SAR)', extensionResults.customerTCV * EXCHANGE_RATE_SAR]).numFmt = '#,##0.00';
             ws.addRow(['Extension Percentage', `${extensionResults.extensionPercentage.toFixed(2)}%`]);
             ws.addRow(['Extension Value (SAR)', extensionResults.customerExtension * EXCHANGE_RATE_SAR]).numFmt = '#,##0.00';
             ws.addRow(['Current Spend of Last Year (SAR)', extensionResults.currentSpend * EXCHANGE_RATE_SAR]).numFmt = '#,##0.00';
             ws.addRow(['Daily Cost (SAR)', (extensionResults.monthlyCost / 30) * EXCHANGE_RATE_SAR]).numFmt = '#,##0.00';
             ws.addRow(['Extension Duration', extensionResults.useFullExtension ? `${extensionResults.days} days` : `${Math.round(extensionResults.monthsAvailable * 30)} days`]);
             
             const euRow = ws.addRow(['End-User Price (SAR)', extensionResults.endUserPrice * EXCHANGE_RATE_SAR]); euRow.font = { bold: true }; euRow.numFmt = '#,##0.00';
             const vatRow = ws.addRow(['VAT (15%) (SAR)', extensionResults.endUserPrice * EXCHANGE_RATE_SAR * 0.15]); vatRow.font = { bold: true }; vatRow.numFmt = '#,##0.00';
             const totRow = ws.addRow(['Total (SAR)', extensionResults.endUserPrice * EXCHANGE_RATE_SAR * 1.15]); totRow.font = { bold: true }; totRow.numFmt = '#,##0.00';
             contentRowStart = 19;
         } else {
             const headRow = ws.addRow(['Description', 'Value']); headRow.font = { bold: true };
             ws.addRow(['Product', PRODUCT_FULL_NAMES[extensionResults.variant] || extensionResults.variant]);
             ws.addRow(['Current Spend of Last Year (SAR)', extensionResults.currentSpend * EXCHANGE_RATE_SAR]).numFmt = '#,##0.00';
             ws.addRow(['Daily Cost (SAR)', (extensionResults.monthlyCost / 30) * EXCHANGE_RATE_SAR]).numFmt = '#,##0.00';
             ws.addRow(['Extension Duration', `${Math.round(extensionResults.monthsCovered * 30)} days`]);
             
             const euRow = ws.addRow(['End-User Price (SAR)', extensionResults.endUserPrice * EXCHANGE_RATE_SAR]); euRow.font = { bold: true }; euRow.numFmt = '#,##0.00';
             const vatRow = ws.addRow(['VAT (15%) (SAR)', extensionResults.endUserPrice * EXCHANGE_RATE_SAR * 0.15]); vatRow.font = { bold: true }; vatRow.numFmt = '#,##0.00';
             const totRow = ws.addRow(['Total (SAR)', extensionResults.endUserPrice * EXCHANGE_RATE_SAR * 1.15]); totRow.font = { bold: true }; totRow.numFmt = '#,##0.00';
             contentRowStart = 16;
         }
      } else {
          let headers = ['Year', ...prodNames];
          if (isIndirect) headers.push('Total Net (USD)', 'Total (SAR)', 'VAT (15%)', 'Grand Total (SAR)');
          else headers.push('Total (USD)');

          const headerRow = ws.addRow(headers);
          headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          headerRow.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF007AC3' } }; cell.alignment = { vertical: 'middle', horizontal: 'center' }; });

          const startRowIndex = ws.rowCount + 1;
          data.yearlyResults.forEach((r, idx) => {
              const rowData: any[] = [`Year ${r.year}`];
              config.selectedProducts.forEach(pid => { const bd = r.breakdown.find(x => x.id === pid); rowData.push(bd ? (isIndirect ? bd.net : bd.gross) : 0); });
              if (isIndirect) rowData.push(r.netUSD, r.grossSAR, r.vatSAR, r.grandTotalSAR); else rowData.push(r.grossUSD);
              const newRow = ws.addRow(rowData);
              newRow.eachCell((cell, colNum) => { if (colNum > 1) cell.numFmt = '#,##0.00'; });
          });

          if (showTotals) {
              const totalRowData: any[] = ['TOTAL'];
              config.selectedProducts.forEach(pid => {
                  const prodTotal = data.yearlyResults.reduce((sum, r) => { const bd = r.breakdown.find(x => x.id === pid); return sum + (bd ? (isIndirect ? bd.net : bd.gross) : 0); }, 0);
                  totalRowData.push(prodTotal);
              });
              if (isIndirect) totalRowData.push(data.totalNetUSD, data.totalGrossSAR, data.totalVatSAR, data.totalGrandTotalSAR); 
              else totalRowData.push(data.totalGrossUSD);
              
              const totalRow = ws.addRow(totalRowData);
              totalRow.font = { bold: true };
              totalRow.eachCell((cell, colNum) => { if (colNum > 1) cell.numFmt = '#,##0.00'; });
          }
          contentRowStart = ws.rowCount + 2;
      }

      if (hasDesignatedSites && siteBreakdown.length > 0) {
          ws.addRow([]); ws.addRow([]);
          const siteTitle = ws.addRow(["Price Breakdown per Site"]); siteTitle.font = { bold: true, size: 14, color: { argb: 'FF007AC3' } };
          ws.addRow([]);
          const siteHeaders = ['Site Name', ...prodNames]; if (!showSitesOnly) siteHeaders.push(`Est. Annual Cost (${displayCurrency})`);
          const sHeaderRow = ws.addRow(siteHeaders); sHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          sHeaderRow.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF007AC3' } }; cell.alignment = { vertical: 'middle', horizontal: 'center' }; });

          siteBreakdown.forEach(site => {
              const row = [site.name]; let siteTotalCost = 0;
              config.selectedProducts.forEach(pid => {
                  const count = site.counts[pid] || 0; row.push(count);
                  if (!showSitesOnly) {
                      const totalCount = config.productInputs[pid]?.count || 1; 
                      const productTotalNet = data.productNetTotals[pid] / config.years; 
                      if (totalCount > 0) siteTotalCost += (count / totalCount) * productTotalNet;
                  }
              });
              if (!showSitesOnly) row.push(isIndirect ? siteTotalCost * EXCHANGE_RATE_SAR : siteTotalCost);
              const addedRow = ws.addRow(row);
              addedRow.eachCell((c, cnum) => { if (cnum > 1 + config.selectedProducts.length) c.numFmt = '#,##0.00'; else if (cnum > 1) c.numFmt = '#,##0'; });
          });
      }

      ws.columns.forEach(column => { let maxL = 15; column.eachCell({ includeEmpty: true }, cell => { const L = cell.value ? cell.value.toString().length : 0; if (L > maxL) maxL = L; }); column.width = maxL + 2; });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const tempLink = document.createElement('a'); tempLink.href = url; 
      const productMix = config.selectedProducts.map(p => p.toUpperCase()).join('_');
      const filename = customerName 
       ? `Quote_${customerName.replace(/\s+/g,'_')}_${config.dealType}_${productMix}_${new Date().toISOString().slice(0,10)}.xlsx`
       : `Quote_${config.dealType}_${productMix}_${new Date().toISOString().slice(0,10)}.xlsx`;
      tempLink.download = filename; tempLink.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e); alert("Failed to export Excel");
    } finally { setIsExcelLoading(false); }
  };

  const handleSiteCheckboxChange = () => { if (hasDesignatedSites) { setHasDesignatedSites(false); setIsBreakdownPerSite(false); setShowSitesOnly(false); } else { setHasDesignatedSites(true); setIsSiteModalOpen(true); } };
  const handleStartDateCheckboxChange = () => { if (useStartDate) { setUseStartDate(false); } else { setUseStartDate(true); setIsStartDateModalOpen(true); } };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden mt-8 transition-all duration-300">
      <div className="px-6 py-4 bg-blue-600 dark:bg-blue-800 border-b border-blue-700 dark:border-blue-900">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Download className="w-5 h-5 text-white" /> Export Options
        </h2>
      </div>

      <div className="p-6 space-y-8">
        <div className="space-y-6 max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Customer Information</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Name <span className="text-red-500">*</span></label>
                <input type="text" required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Enter customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Seller Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sales Rep Name</label>
                  <input type="text" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={repName} onChange={(e) => {setRepName(e.target.value); localStorage.setItem('wk_rep_name', e.target.value);}} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                  <input type="tel" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={repPhone} onChange={(e) => {setRepPhone(e.target.value); localStorage.setItem('wk_rep_phone', e.target.value);}} />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Export Contents</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {!isExtensionQuote && (
                <>
                  <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input type="checkbox" checked={showStats} onChange={(e) => setShowStats(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
                    <span>Include Statistics</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input type="checkbox" checked={isUtdSm ? false : showMonthlyCost} onChange={(e) => setShowMonthlyCost(e.target.checked)} disabled={isUtdSm} className="rounded text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 disabled:opacity-50" />
                    <span>Show Monthly Cost</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input type="checkbox" checked={showTotals} onChange={(e) => setShowTotals(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
                    <span>Show Grand Totals</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input type="checkbox" checked={isUtdSm ? false : showEmrIntegration} onChange={(e) => setShowEmrIntegration(e.target.checked)} disabled={isUtdSm} className="rounded text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 disabled:opacity-50" />
                    <span>Include EMR Term</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input type="checkbox" checked={isUtdSm ? false : hasOptOutClause} onChange={(e) => setHasOptOutClause(e.target.checked)} disabled={isUtdSm} className="rounded text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 disabled:opacity-50" />
                    <span>Opt-Out Clause</span>
                  </label>
                  {canShowFLinkIntegration && (
                    <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                      <input type="checkbox" checked={showFLinkIntegration} onChange={(e) => setShowFLinkIntegration(e.target.checked)} className="rounded text-purple-600 focus:ring-purple-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
                      <span>Formulink Term</span>
                    </label>
                  )}
                </>
              )}
              {config.dealType === DealType.RENEWAL && renewalNotes.length > 0 && (
                <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={includeRenewalIncreaseInfo} onChange={(e) => setIncludeRenewalIncreaseInfo(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
                  <span>Renewal Increase Info</span>
                </label>
              )}
              
              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={hasDesignatedSites} onChange={handleSiteCheckboxChange} className="rounded text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
                  <span>Add Designated Sites</span>
                </label>
                {hasDesignatedSites && (
                    <button 
                      onClick={() => setIsSiteModalOpen(true)}
                      className="text-[10px] text-blue-600 underline hover:text-blue-800"
                    >
                      (Edit)
                    </button>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={useStartDate} onChange={handleStartDateCheckboxChange} className="rounded text-green-600 focus:ring-green-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
                  <span>Include Start Date</span>
                </label>
                {useStartDate && (
                    <button 
                      onClick={() => setIsStartDateModalOpen(true)}
                      className="text-[10px] text-blue-600 underline hover:text-blue-800"
                    >
                      (Edit)
                    </button>
                )}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-4">
            <button 
              onClick={handlePDFPreview} 
              disabled={isPdfLoading || isFontLoading || !customerName.trim() || (config.dealType !== DealType.NEW_LOGO && !useStartDate)} 
              className="flex-1 min-w-[200px] flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all active:scale-95"
            >
              {isPdfLoading || isFontLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FileText className="w-5 h-5" />}
              {isFontLoading ? 'Loading Fonts...' : isPdfLoading ? 'Generating Preview...' : 'Preview Quote'}
            </button>
            <button 
              onClick={handlePDFExport} 
              disabled={isPdfLoading || isFontLoading || !customerName.trim() || (config.dealType !== DealType.NEW_LOGO && !useStartDate)} 
              className="flex-1 min-w-[200px] flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all active:scale-95"
            >
              {isPdfLoading || isFontLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Download className="w-5 h-5" />}
              {isFontLoading ? 'Loading Fonts...' : isPdfLoading ? 'Generating PDF...' : 'Download Quote'}
            </button>
            <button 
              onClick={handleExcelExport} 
              disabled={isExcelLoading || !customerName.trim() || (config.dealType !== DealType.NEW_LOGO && !useStartDate)} 
              className="flex-1 min-w-[200px] flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all active:scale-95"
            >
              {isExcelLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Table className="w-5 h-5" />}
              {isExcelLoading ? 'Generating Excel...' : 'Export to Excel'}
            </button>
          </div>
          {(config.dealType !== DealType.NEW_LOGO && !useStartDate) && (
            <div className="mt-2 text-xs text-red-500 font-medium">
              Please select "Include Start Date" to enable exporting for Renewals and Extensions.
            </div>
          )}
          {pdfError && <div className="text-red-500 text-sm mt-2">{pdfError}</div>}
        </div>
      </div>
      {showCpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-96">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Export Mode</h3>
            <p className="mb-4 text-gray-700 dark:text-gray-300">Do you want to generate the quote as a Channel Partner (Samir Group)?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => executePDFExport(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white">No, Standard</button>
              <button onClick={() => executePDFExport(true)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Yes, Samir Group</button>
            </div>
          </div>
        </div>
      )}

      {isSiteModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Designated Sites</h3>
            
            <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer mb-4">
              <input type="checkbox" checked={isBreakdownPerSite} onChange={e => setIsBreakdownPerSite(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
              <span>Allow Price Breakdown per Site</span>
            </label>

            {!isBreakdownPerSite ? (
              <textarea
                className="w-full h-48 px-3 py-2 border rounded text-sm mb-4 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Paste sites here, one per line..."
                value={designatedSites}
                onChange={e => setDesignatedSites(e.target.value)}
              />
            ) : (
              <>
                <textarea
                  className="w-full h-24 px-3 py-2 border rounded text-sm mb-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Paste sites here, one per line..."
                  value={bulkPasteText}
                  onChange={e => setBulkPasteText(e.target.value)}
                />
                <button onClick={handleBulkPaste} className="mb-4 bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm font-medium hover:bg-blue-200">
                  Add Sites to List
                </button>
                <div className="space-y-2 mb-4">
                  {siteBreakdown.map(site => (
                    <div key={site.id} className="flex gap-2">
                      <input
                        type="text"
                        className="flex-1 px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="Site name"
                        value={site.name}
                        onChange={e => {
                          setSiteBreakdown(prev => prev.map(s => s.id === site.id ? { ...s, name: e.target.value } : s));
                        }}
                      />
                      <button
                        onClick={() => setSiteBreakdown(prev => prev.filter(s => s.id !== site.id))}
                        className="text-red-500 hover:text-red-700 font-bold px-2"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setSiteBreakdown(prev => [...prev, { id: Date.now().toString(), name: '', counts: {} }])}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    + Add row
                  </button>
                </div>
              </>
            )}
            <div className="flex justify-end gap-3 mt-6 border-t pt-4 border-gray-200 dark:border-gray-700">
              <button 
                onClick={() => {
                  if (!isBreakdownPerSite && designatedSites.trim().length === 0) setHasDesignatedSites(false);
                  if (isBreakdownPerSite && siteBreakdown.length === 0) setHasDesignatedSites(false);
                  setIsSiteModalOpen(false);
                }} 
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {isStartDateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-80">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Start Date</h3>
            <input
              type="month"
              value={startMonthYear}
              onChange={e => setStartMonthYear(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white mb-6"
            />
            <div className="flex justify-end">
              <button 
                onClick={() => {
                   if (!startMonthYear) setUseStartDate(false);
                   setIsStartDateModalOpen(false);
                }} 
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-70">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><FileText className="w-5 h-5" /> PDF Preview</h3>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => {
                                const link = document.createElement('a');
                                link.href = previewPdfUrl!;
                                link.download = previewFilename;
                                link.click();
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium flex gap-2 items-center text-sm"
                        >
                            <Download className="w-4 h-4" /> Download PDF
                        </button>
                        <button onClick={() => setIsPreviewModalOpen(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium">Close</button>
                    </div>
                </div>
                <div className="flex-1 flex flex-col md:flex-row bg-gray-100 dark:bg-gray-700 overflow-hidden">
                    <div className="w-full md:w-64 p-6 flex flex-col gap-4 overflow-y-auto bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-2">Export Options</h4>
                        {!isExtensionQuote && (
                          <>
                            <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                <input type="checkbox" checked={showStats} onChange={(e) => setShowStats(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
                                <span>Include Statistics</span>
                            </label>
                            <label className={`flex items-center space-x-2 text-sm ${isUtdSm ? 'text-gray-400 cursor-not-allowed opacity-50' : 'text-gray-700 dark:text-gray-300 cursor-pointer'}`}>
                                <input type="checkbox" checked={isUtdSm ? false : showMonthlyCost} onChange={(e) => setShowMonthlyCost(e.target.checked)} disabled={isUtdSm} className="rounded text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 disabled:opacity-50" />
                                <span>Show Monthly Cost</span>
                            </label>
                            <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                <input type="checkbox" checked={showTotals} onChange={(e) => setShowTotals(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
                                <span>Show Grand Totals</span>
                            </label>
                            <label className={`flex items-center space-x-2 text-sm ${isUtdSm ? 'text-gray-400 cursor-not-allowed opacity-50' : 'text-gray-700 dark:text-gray-300 cursor-pointer'}`}>
                                <input type="checkbox" checked={isUtdSm ? false : showEmrIntegration} onChange={(e) => setShowEmrIntegration(e.target.checked)} disabled={isUtdSm} className="rounded text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 disabled:opacity-50" />
                                <span>Include EMR Term</span>
                            </label>
                            <label className={`flex items-center space-x-2 text-sm ${isUtdSm ? 'text-gray-400 cursor-not-allowed opacity-50' : 'text-gray-700 dark:text-gray-300 cursor-pointer'}`}>
                                <input type="checkbox" checked={isUtdSm ? false : hasOptOutClause} onChange={(e) => setHasOptOutClause(e.target.checked)} disabled={isUtdSm} className="rounded text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 disabled:opacity-50" />
                                <span>Opt-Out Clause</span>
                            </label>
                            {canShowFLinkIntegration && (
                                <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                    <input type="checkbox" checked={showFLinkIntegration} onChange={(e) => setShowFLinkIntegration(e.target.checked)} className="rounded text-purple-600 focus:ring-purple-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
                                    <span>Formulink Term</span>
                                </label>
                            )}
                          </>
                        )}
                        {config.dealType === DealType.RENEWAL && renewalNotes.length > 0 && (
                          <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <input type="checkbox" checked={includeRenewalIncreaseInfo} onChange={(e) => setIncludeRenewalIncreaseInfo(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
                            <span>Renewal Increase Info</span>
                          </label>
                        )}
                        
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                           <div className="flex items-center justify-between">
                              <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                <input type="checkbox" checked={hasDesignatedSites} onChange={handleSiteCheckboxChange} className="rounded text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
                                <span>Designated Sites</span>
                              </label>
                           </div>
                           <div className="flex items-center justify-between mt-2">
                              <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                <input type="checkbox" checked={useStartDate} onChange={handleStartDateCheckboxChange} className="rounded text-green-600 focus:ring-green-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
                                <span>Include Start Date</span>
                              </label>
                           </div>
                        </div>

                    </div>
                    <div className="flex-1 p-4 md:p-8 bg-gray-200 dark:bg-gray-900 border-l border-gray-300 dark:border-gray-700 overflow-hidden relative">
                      {isPdfLoading || isFontLoading ? (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                              <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                              <span className="font-medium">Updating preview...</span>
                          </div>
                      ) : previewPdfUrl ? (
                          <iframe src={`${previewPdfUrl}#view=FitH`} className="w-full h-full bg-white dark:bg-gray-100 rounded-lg shadow-indigo-500/20 shadow-2xl border border-gray-300 dark:border-gray-600" />
                      ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">Failed to load preview</div>
                      )}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
