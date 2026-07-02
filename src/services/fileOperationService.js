import { jsPDF } from 'jspdf';
import JSZip from 'jszip';

/**
 * Triggers file saving to user selected directory (Tauri shell or Browser fallback)
 * @param {string} filename Name of the file
 * @param {Blob} blob File Blob content
 */
export async function saveFileToUserDirectory(filename, blob) {
  try {
    // If running in Tauri Native Shell
    if (window.__TAURI_INTERNALS__) {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeFile } = await import('@tauri-apps/plugin-fs');

      console.log(`[File Operation] Opening native save dialog for ${filename}...`);
      
      const filePath = await save({
        defaultPath: filename,
        filters: [{
          name: filename.endsWith('.zip') ? 'ZIP Archive' : 'PDF Document',
          extensions: [filename.split('.').pop()]
        }]
      });

      if (filePath) {
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        await writeFile(filePath, uint8Array);
        console.log(`[File Operation] Successfully saved file natively to: ${filePath}`);
        alert(`File saved successfully to:\n${filePath}`);
        return filePath;
      } else {
        console.log(`[File Operation] Native save canceled by user.`);
        return null;
      }
    }
  } catch (error) {
    console.error('[File Operation] Tauri native save failed. Falling back to browser trigger:', error);
  }

  // Browser Fallback Download
  console.log(`[File Operation] Triggering browser download trigger for ${filename}...`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return 'downloaded';
}

/**
 * Generates a beautiful professional PDF estimate/invoice
 * @param {Object} data Invoice content
 * @returns {Promise<Blob>} The generated PDF Blob
 */
export async function generatePdfInvoice(data) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const PW = 210; // page width
  const M  = 15; // margin

  // ── Extracted data ──────────────────────────────────────────────────────
  const invoiceNo    = data.invoiceNumber || data.invoice_number || `INV-${Date.now().toString().slice(-6)}`;
  const invoiceDate  = data.date || new Date().toLocaleDateString('en-IN');
  const dueDate      = data.dueDate || data.due_date || '';
  const clientName   = data.clientName || data.client_name || 'Client';
  const clientGstin  = data.clientGstin || '';
  const clientAddr   = data.clientAddress || '';
  const items        = data.lineItems || data.items || [];
  const subtotal     = data.subtotalInr  || (data.subtotal_inr  ? data.subtotal_inr  / 100 : 0);
  const gstAmt       = data.gstAmountInr || (data.gst_amount_inr ? data.gst_amount_inr / 100 : 0);
  const total        = data.totalInr     || (data.total_inr     ? data.total_inr     / 100 : 0);
  const notes        = data.notes || 'Payment due within 7 days. Thank you for your business!';

  const fmtINR = (n) => `Rs. ${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // ── HEADER BAND ─────────────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42);          // dark navy
  doc.rect(0, 0, PW, 42, 'F');

  // Brand name
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('Mabishion AI', M, 16);

  // Tagline
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Private Digital Agency & AI Product Studio', M, 22);
  doc.text('India · Freelance & Digital Services', M, 27);

  // TAX INVOICE label — right side
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(99, 102, 241);
  doc.text('TAX INVOICE', PW - M, 16, { align: 'right' });

  // Invoice number + date — right side
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(200, 210, 230);
  doc.text(`Invoice No: ${invoiceNo}`, PW - M, 24, { align: 'right' });
  doc.text(`Date: ${invoiceDate}`, PW - M, 30, { align: 'right' });
  if (dueDate) doc.text(`Due: ${dueDate}`, PW - M, 36, { align: 'right' });

  // ── BILLED TO / FROM ────────────────────────────────────────────────────
  let y = 52;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(99, 102, 241);
  doc.text('BILLED FROM', M, y);
  doc.text('BILLED TO', PW / 2 + 5, y);

  y += 5;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Mabishion AI', M, y);
  doc.text(clientName, PW / 2 + 5, y);

  y += 5;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Digital Agency · AI Automation Services', M, y);
  if (clientAddr) doc.text(clientAddr, PW / 2 + 5, y);

  y += 5;
  doc.text('India', M, y);
  if (clientGstin) {
    y += 4;
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`GSTIN: ${clientGstin}`, PW / 2 + 5, y);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
  }

  // ── DIVIDER ─────────────────────────────────────────────────────────────
  y += 10;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(M, y, PW - M, y);

  // ── LINE ITEMS TABLE ────────────────────────────────────────────────────
  y += 6;
  // Table header
  doc.setFillColor(241, 245, 249);
  doc.rect(M, y - 4, PW - M * 2, 8, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('#',   M + 2, y + 1);
  doc.text('Description / Service',    M + 10, y + 1);
  doc.text('HSN',  PW - 85, y + 1);
  doc.text('Qty',  PW - 65, y + 1);
  doc.text('Rate', PW - 48, y + 1);
  doc.text('Amount', PW - M, y + 1, { align: 'right' });

  y += 8;
  doc.setLineWidth(0.2);
  doc.line(M, y - 3, PW - M, y - 3);

  // Items
  const lineItems = items.length > 0 ? items : [
    { desc: data.title || 'Digital Service', hsn: '998314', qty: 1, rate: subtotal || total / 1.18 }
  ];

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);

  lineItems.forEach((item, idx) => {
    const desc   = typeof item === 'string' ? item.replace(/^\d+\.\s*/, '') : (item.desc || item);
    const hsn    = item.hsn || '998314';
    const qty    = item.qty || 1;
    const rate   = item.rate || (item.amount ? item.amount / qty : subtotal / lineItems.length);
    const amount = qty * rate;

    if (y > 230) {
      doc.addPage();
      y = 20;
    }

    // Alternating row tint
    if (idx % 2 === 0) {
      doc.setFillColor(250, 251, 255);
      doc.rect(M, y - 3.5, PW - M * 2, 7, 'F');
    }

    doc.text(String(idx + 1), M + 2, y + 1);
    // Wrap long descriptions
    const descLines = doc.splitTextToSize(desc, PW - M * 2 - 95);
    doc.text(descLines[0], M + 10, y + 1);
    doc.text(String(hsn),              PW - 85, y + 1);
    doc.text(String(qty),              PW - 65, y + 1);
    doc.text(fmtINR(rate),             PW - 48, y + 1);
    doc.text(fmtINR(amount),           PW - M,  y + 1, { align: 'right' });

    y += 8;
    doc.setDrawColor(226, 232, 240);
    doc.line(M, y - 1, PW - M, y - 1);
  });

  // ── TOTALS BOX ──────────────────────────────────────────────────────────
  y += 4;
  const boxX = PW / 2 + 10;
  const boxW = PW - M - boxX;

  const totalsData = [
    ['Subtotal',        fmtINR(subtotal || total / 1.18)],
    ['CGST @9%',        fmtINR((gstAmt || total - subtotal) / 2)],
    ['SGST @9%',        fmtINR((gstAmt || total - subtotal) / 2)],
  ];

  doc.setFontSize(8.5);
  totalsData.forEach(([label, val]) => {
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(label, boxX, y);
    doc.setTextColor(30, 41, 59);
    doc.text(val, PW - M, y, { align: 'right' });
    y += 6;
    doc.setDrawColor(226, 232, 240);
    doc.line(boxX, y - 2, PW - M, y - 2);
  });

  // Total row — highlighted
  y += 2;
  doc.setFillColor(15, 23, 42);
  doc.rect(boxX - 3, y - 4, boxW + 6, 10, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL (incl. GST)',  boxX, y + 2);
  doc.setTextColor(99, 102, 241);
  doc.text(fmtINR(total || subtotal * 1.18), PW - M, y + 2, { align: 'right' });

  // ── AMOUNT IN WORDS ─────────────────────────────────────────────────────
  y += 16;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const totalWords = Math.round(total || subtotal * 1.18);
  doc.text(`Amount in Words: Rupees ${totalWords.toLocaleString('en-IN')} Only`, M, y);

  // ── PAYMENT & NOTES ─────────────────────────────────────────────────────
  y += 10;
  doc.setDrawColor(226, 232, 240);
  doc.line(M, y, PW - M, y);
  y += 6;

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Payment Terms', M, y);
  doc.text('Notes', PW / 2 + 5, y);

  y += 5;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('UPI / Bank Transfer', M, y);
  doc.text(doc.splitTextToSize(notes, 85), PW / 2 + 5, y);
  y += 5;
  doc.text('Due within 7 days of invoice date', M, y);

  // ── FOOTER ──────────────────────────────────────────────────────────────
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 272, PW, 25, 'F');
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('This is a computer-generated invoice. No signature required.', PW / 2, 280, { align: 'center' });
  doc.text('Mabishion AI · Digital Services · India · DPDP Act 2023 Compliant', PW / 2, 286, { align: 'center' });
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(99, 102, 241);
  doc.text('Thank you for your business!', PW / 2, 292, { align: 'center' });

  return doc.output('blob');
}

/**
 * Generates a premium multi-section professional business proposal
 * @param {Object} data Proposal content
 * @returns {Promise<Blob>} The generated PDF Blob
 */
export async function generateProposalPdf(data) {
  const doc = new jsPDF();
  const name = data.name || 'Mabishion Project';
  const client = data.clientName || 'Valued Client';
  const budget = data.budget || '$5,000.00';
  const description = data.description || 'Custom digital platform deployment.';
  const stage = data.stage || 'Discovery';
  const date = new Date().toLocaleDateString();
  const proposalId = `PROP-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  // Premium Header
  doc.setFillColor(15, 23, 42); // Deep Slate background banner
  doc.rect(0, 0, 210, 45, 'F');

  // Logo Placeholder
  doc.setFillColor(99, 102, 241); // Indigo-500 logo square
  doc.rect(20, 10, 12, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('M', 24, 19);

  doc.setTextColor(248, 250, 252);
  doc.setFontSize(16);
  doc.text('MABISHION AI', 38, 19);
  doc.setFontSize(9);
  doc.setFont('Helvetica', 'normal');
  doc.text('PREMIUM COMMERCIAL PROPOSAL', 38, 26);

  // Metadata block
  doc.setTextColor(148, 163, 184);
  doc.text(`ID: ${proposalId}`, 150, 19);
  doc.text(`DATE: ${date}`, 150, 26);

  // Divider Line
  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(0.8);
  doc.line(20, 45, 190, 45);

  let y = 60;

  // Title
  doc.setTextColor(15, 23, 42);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`PROJECT: ${name.toUpperCase()}`, 20, y);
  y += 8;
  doc.setFontSize(11);
  doc.text(`Client: ${client}  |  Current Stage: ${stage}`, 20, y);
  y += 12;

  // Executive Summary Section
  doc.setFillColor(248, 250, 252); // Soft background card
  doc.rect(20, y, 170, 22, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.text('1. EXECUTIVE SUMMARY', 24, y + 6);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  const descText = doc.splitTextToSize(description, 162);
  doc.text(descText, 24, y + 13);
  y += 28;

  // Scope of Work Section
  doc.setTextColor(15, 23, 42);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. SCOPE OF WORK', 20, y);
  y += 6;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`- Fully tailored deployment of the customized ${name} platform.`, 20, y);
  y += 6;
  doc.text('- Premium Responsive Glassmorphic User Interface design framework.', 20, y);
  y += 6;
  doc.text('- Integrations with secure SQLite database schema & Multi-LLM fallbacks.', 20, y);
  y += 6;
  doc.text('- Strict automated human-in-the-loop validation safegates and logging panels.', 20, y);
  y += 12;

  // Timeline Section
  doc.setTextColor(15, 23, 42);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('3. TIMELINE & ESTIMATED DELIVERABLES', 20, y);
  y += 6;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text('• Phase 1 (Discovery & Setup): Core architecture mapping (1-2 Days)', 20, y);
  y += 6;
  doc.text('• Phase 2 (Development & Test): Full component build & sandbox logic (3-5 Days)', 20, y);
  y += 6;
  doc.text('• Phase 3 (Delivery): Automated packaging, compliance check, and handoff (1 Day)', 20, y);
  y += 12;

  // Pricing Section
  doc.setTextColor(15, 23, 42);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('4. ESTIMATED PRICING STRUCTURE', 20, y);
  y += 6;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`- Total Commercial Budget (Flat Rate): ${budget}`, 20, y);
  y += 6;
  doc.text('- Maintenance & Optimization (Optional): Included for first 90 days', 20, y);
  y += 12;

  // Terms Section
  doc.setTextColor(15, 23, 42);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('5. BUSINESS TERMS & CONDITIONS', 20, y);
  y += 6;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text('• Payments terms: 50% upfront initial deposit, 50% upon successful delivery.', 20, y);
  y += 6;
  doc.text('• Intellectual Property: Full ownership transfers to client upon final payment clearance.', 20, y);

  // Footer
  doc.setFillColor(241, 245, 249);
  doc.rect(20, 245, 170, 22, 'F');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('Helvetica', 'oblique');
  doc.text('Mabishion AI Operations Engine. This proposal represents a binding commercial quote.', 24, 252);
  doc.text('Unauthorized distribution of this blueprint document is strictly prohibited.', 24, 257);
  doc.text('Subject to Owner Digital Signature and Client Intake authorization.', 24, 262);

  return doc.output('blob');
}

/**
 * Creates a packed ZIP bundle comprising proposals, deliverables, and blueprints
 * @param {Array} filesList Array of { name: string, content: Blob|string } files
 * @returns {Promise<Blob>} The generated ZIP Blob
 */
export async function generateZipDeliverable(filesList = []) {
  const zip = new JSZip();

  if (filesList.length === 0) {
    // Add default template files if list is empty
    zip.file('MABISHION_BLUEPRINT.md', '# MABISHION PIPELINE BLUEPRINT\nCreated by Mickii AI Worker.');
    zip.file('CLIENT_INSTRUCTIONS.txt', 'Review invoice PDF and trigger payments to initialize code deployment.');
  } else {
    filesList.forEach(file => {
      zip.file(file.name, file.content);
    });
  }

  return await zip.generateAsync({ type: 'blob' });
}
