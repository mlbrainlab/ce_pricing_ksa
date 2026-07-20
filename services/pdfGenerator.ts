import { jsPDF } from 'jspdf';
import autoTablePlugin from 'jspdf-autotable';
import { DealConfiguration, CalculationOutput, ChannelType, DealType } from '../types.js';
import { AVAILABLE_PRODUCTS, EXCHANGE_RATE_SAR } from '../constants.js';
import { SAMIR_WHITE_LOGO_BASE64 } from '../samirLogo.js';
import { WK_LOGO_BASE64 } from '../wkLogo.js';

export async function generateQuotePDF(config: DealConfiguration, data: CalculationOutput, options: any) {
  const doc = new jsPDF();
  const { customerName = "N/A", repName = "Representative", repPhone = "", repEmail = "", isCp = false, showStats = true, showMonthlyCost = false, showTotals = true, showEmrIntegration = false, hasOptOutClause = false, showFLinkIntegration = false, printNotes = false } = options || {};
  
  const isIndirect = config.channel !== ChannelType.DIRECT;
  const currencyPrefix = isIndirect ? 'SAR ' : '$';
  
  const primaryColor: [number, number, number] = [0, 122, 195];
  const docDate = new Date().toLocaleDateString();
  const refId = `REF-${Date.now().toString().slice(-6)}`;
  
  const fontName = 'helvetica';

  const renderHeader = (isFirstPage: boolean) => {
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      if (isFirstPage) {
          doc.rect(0, 0, 210, 45, 'F');
      } else {
          doc.rect(0, 0, 210, 32, 'F');
      }
      try {
          doc.addImage(WK_LOGO_BASE64, 'PNG', 14, 10, 50, 10, 'WK_LOGO', 'FAST');
          if (isCp) {
              doc.addImage(SAMIR_WHITE_LOGO_BASE64, 'PNG', 160, 10, 36, 10, 'SAMIR_LOGO', 'FAST');
          }
      } catch (e) {
          console.warn("Logo rendering error", e);
      }
  };

  const addFooter = (pageNum: number) => {
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      const footerY = 285;
      doc.text(`Ref: ${refId} | Date: ${docDate}`, 14, footerY);
      doc.text(`Page ${pageNum}`, 105, footerY, { align: 'center' });
      doc.text(`© ${new Date().getFullYear()} Wolters Kluwer. All Rights Reserved.`, 196, footerY, { align: 'right' });
  };

  // First Page
  renderHeader(true);
  
  // Title
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.setFont(fontName, 'bold');
  doc.text("BUDGETARY COMMERCIAL PROPOSAL", 14, 33);
  
  let currentY = 55;

  // Introduction
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont(fontName, 'bold');
  doc.text(`Prepared for:`, 14, currentY);
  doc.text(`Prepared by:`, 105, currentY);
  
  doc.setFont(fontName, 'normal');
  currentY += 6;
  doc.text(customerName || "Valued Customer", 14, currentY);
  
  // Custom Rep Override for CP Deals
  let finalRepName = repName;
  let finalRepEmail = repEmail;
  let finalRepPhone = repPhone;
  
  if (isCp) {
      finalRepName = "Samir Group Representative";
      finalRepEmail = "info@samirgroup.com";
      finalRepPhone = ""; // Left empty deliberately
  }

  if (finalRepName) doc.text(finalRepName, 105, currentY);
  currentY += 5;
  if (finalRepEmail) doc.text(finalRepEmail, 105, currentY);
  if (finalRepPhone) {
      currentY += 5;
      doc.text(finalRepPhone, 105, currentY);
  }

  currentY += 15;

  // Deal Context Summary
  doc.setFillColor(245, 245, 245);
  doc.rect(14, currentY, 182, 35, 'F');
  
  doc.setFontSize(10);
  doc.setFont(fontName, 'bold');
  doc.text("Deal Summary", 18, currentY + 7);
  
  doc.setFont(fontName, 'normal');
  doc.text(`Deal Type: ${config.dealType}`, 18, currentY + 14);
  
  if (config.dealType === DealType.EXTENSION) {
    doc.text(`Extension Option: Option ${config.extensionOption}`, 18, currentY + 21);
  } else {
    doc.text(`Duration: ${config.years} Years`, 18, currentY + 21);
  }

  if (config.useStartDate && config.startMonthYear) {
    doc.text(`Start Date: ${config.startMonthYear}`, 18, currentY + 28);
  }

  // Right side of summary
  doc.text(`Application: ${config.selectedProducts.map(id => AVAILABLE_PRODUCTS.find(p => p.id === id)?.name || id).join(' + ')}`, 105, currentY + 14);
  
  if (showStats) {
      const statsList = config.selectedProducts.map(id => {
          const inp = config.productInputs[id];
          if (!inp || !inp.count) return null;
          return `${AVAILABLE_PRODUCTS.find(p => p.id === id)?.shortName}: ${inp.count} ${AVAILABLE_PRODUCTS.find(p => p.id === id)?.countLabel}`;
      }).filter(Boolean).join(' | ');
      if (statsList) {
          doc.text(`Statistics: ${statsList}`, 105, currentY + 21);
      }
  }

  currentY += 45;

  // Commercial Schedule Table
  doc.setFontSize(12);
  doc.setFont(fontName, 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("Commercial Schedule", 14, currentY);
  
  const headers = ['Year'];
  config.selectedProducts.forEach(pid => {
      const p = AVAILABLE_PRODUCTS.find(x => x.id === pid);
      headers.push(`${p?.shortName || p?.name}`);
  });
  headers.push(`Total`);
  
  const body = data.yearlyResults.map(r => {
      const rowData = [`Year ${r.year}`];
      config.selectedProducts.forEach(pid => {
          const bd = r.breakdown.find(x => x.id === pid);
          const val = isIndirect ? (bd?.grossSAR || 0) : (bd?.gross || 0);
          rowData.push(`${currencyPrefix}${val.toLocaleString()}`);
      });
      const totalNum = isIndirect ? r.grossSAR : r.grossUSD;
      rowData.push(`${currencyPrefix}${totalNum.toLocaleString()}`);
      return rowData;
  });

  const applyAutoTable = typeof autoTablePlugin === 'function' ? autoTablePlugin : (autoTablePlugin as any).default;
  
  applyAutoTable(doc, {
      startY: currentY + 5,
      head: [headers],
      body: body,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: 255 },
      styles: { fontSize: 9, cellPadding: 4 },
      margin: { left: 14, right: 14 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // Add Totals Below Table
  if (showTotals) {
      doc.setFont(fontName, 'bold');
      doc.setTextColor(0,0,0);
      doc.text(`Total Contract Value (TCV): ${currencyPrefix}${(isIndirect ? data.totalGrossSAR : data.totalGrossUSD).toLocaleString()}`, 14, currentY);
      
      if (isIndirect) {
          currentY += 6;
          doc.text(`VAT (15%): ${currencyPrefix}${data.totalVatSAR.toLocaleString()}`, 14, currentY);
          currentY += 6;
          doc.text(`Grand Total (Including VAT): ${currencyPrefix}${data.totalGrandTotalSAR.toLocaleString()}`, 14, currentY);
      }
      currentY += 10;
  }

  if (showMonthlyCost && data.acvUSD > 0) {
      doc.setFont(fontName, 'normal');
      const monthly = Math.round(data.acvUSD / 12);
      const monthlyConv = isIndirect ? Math.round(monthly * EXCHANGE_RATE_SAR) : monthly;
      doc.text(`Estimated Average Monthly Investment: ${currencyPrefix}${monthlyConv.toLocaleString()}`, 14, currentY);
      currentY += 10;
  }

  // Optional Notes / Terms
  if (currentY > 240) {
      doc.addPage();
      currentY = 45;
  }
  
  doc.setFontSize(11);
  doc.setFont(fontName, 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("Terms and Highlights", 14, currentY);
  
  currentY += 7;
  doc.setFontSize(9);
  doc.setFont(fontName, 'normal');
  doc.setTextColor(0, 0, 0);
  
  const bullets = [
      "This quotation is budgetary and subject to formal Wolters Kluwer Commercial terms, and internal approval.",
      "Subscription covers all updates, new content, and technical support during the designated term.",
      "Pricing assumes an enterprise site license configuration as indicated above."
  ];

  if (showEmrIntegration) {
      bullets.push("EMR Integration via InfoButton (HL7) is included, subject to technical scoping.");
  }
  if (showFLinkIntegration) {
      bullets.push("F-Link Integration is included for seamless pharmacy application coupling. Requires standard API compatibility.");
  }
  if (hasOptOutClause) {
      bullets.push("This agreement contains an annual opt-out clause executable strictly with 60 days standard written notice prior to anniversary (as per Master Terms).");
  }

  bullets.forEach(b => {
      const splitText = doc.splitTextToSize(`• ${b}`, 180);
      doc.text(splitText, 14, currentY);
      currentY += splitText.length * 5;
  });
  
  currentY += 5;

  const notesArray = data.yearlyResults.length > 0 ? data.yearlyResults[0].notes : [];

  if (printNotes && notesArray && notesArray.length > 0) {
      if (currentY > 220) {
          doc.addPage();
          currentY = 45;
      }
      doc.setFontSize(10);
      doc.setFont(fontName, 'bold');
      doc.setTextColor(150, 0, 0);
      doc.text("Architectural & Commercial Notes:", 14, currentY);
      currentY += 6;
      doc.setFont(fontName, 'normal');
      doc.setTextColor(0, 0, 0);
      
      notesArray.forEach((note: string) => {
          const split = doc.splitTextToSize(`- ${note.replace(/<[^>]+>/g, '')}`, 180);
          doc.text(split, 14, currentY);
          currentY += split.length * 4.5 + 2;
      });
  }

  // Footer loop
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      if (i > 1) renderHeader(false);
      addFooter(i);
  }

  return Buffer.from(doc.output('arraybuffer'));
}
