// Receipt PDF Service - Professional PDF generation for disbursements and payments
// Uses unified institutional branding
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { calcService } from './calcService';
import { auditService } from './auditService';
import {
  Disbursement,
  Payment,
  Contract,
  Loan,
  Client,
  PAYMENT_METHODS,
} from '@/models/types';

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: { finalY: number };
  }
}

// ─── Unified Brand & Colors (same as institutionalPdfService) ──

const BRAND = 'MicroLoan Hub';
const BRAND_SUBTITLE = 'Instituição de Microcrédito';
const BRAND_ADDRESS = 'Av. 25 de Setembro, Nº 1230, Maputo — Moçambique';
const BRAND_CONTACT = 'Tel: +258 21 XXX XXX • NUIT: XXXXXXXXX • Licença BdM: MC/XXX/2024';

const COLORS = {
  primary: [15, 52, 96] as [number, number, number],
  accent: [0, 102, 153] as [number, number, number],
  gold: [178, 143, 64] as [number, number, number],
  dark: [33, 37, 41] as [number, number, number],
  muted: [108, 117, 125] as [number, number, number],
  light: [241, 243, 245] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  success: [25, 135, 84] as [number, number, number],
  danger: [176, 42, 55] as [number, number, number],
};

// ─── Helpers ───────────────────────────────────────────────

function fmtMT(amount: number): string {
  const formatted = new Intl.NumberFormat('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted} MZN`;
}

function nextReceiptId(prefix: 'RD' | 'RP'): string {
  const key = `receipt_counter_${prefix}`;
  const current = parseInt(localStorage.getItem(key) || '0', 10);
  const next = current + 1;
  localStorage.setItem(key, String(next));
  const year = new Date().getFullYear();
  return `RC-${year}-${String(next).padStart(6, '0')}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-MZ', {
    timeZone: 'Africa/Maputo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function fmtDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-MZ', {
    timeZone: 'Africa/Maputo',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-MZ', {
    timeZone: 'Africa/Maputo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function paymentMethodLabel(method: string): string {
  return PAYMENT_METHODS.find(m => m.value === method)?.label || method;
}

// ─── Unified Header ────────────────────────────────────────

function drawHeader(doc: jsPDF, receiptId: string, receiptType: string, dateStr: string) {
  const pw = doc.internal.pageSize.getWidth();

  // Top bar (primary)
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pw, 4, 'F');

  // Gold accent line
  doc.setFillColor(...COLORS.gold);
  doc.rect(0, 4, pw, 1.5, 'F');

  // Brand
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text(BRAND, 14, 14);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.muted);
  doc.text(BRAND_SUBTITLE, 14, 19);
  doc.text(BRAND_ADDRESS, 14, 23);

  // Receipt type + id (right side)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text(receiptType, pw - 14, 14, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.text(`Nº ${receiptId}`, pw - 14, 19, { align: 'right' });
  doc.text(dateStr, pw - 14, 23, { align: 'right' });

  // Separator
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.8);
  doc.line(14, 28, pw - 14, 28);

  return 34;
}

function drawSectionTitle(doc: jsPDF, title: string, y: number): number {
  const pw = doc.internal.pageSize.getWidth();
  doc.setFillColor(...COLORS.light);
  doc.rect(14, y - 4, pw - 28, 7, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text(title.toUpperCase(), 16, y);
  return y + 8;
}

function drawKeyValue(doc: jsPDF, key: string, value: string, x: number, y: number): number {
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.muted);
  doc.text(key, x, y);
  doc.setTextColor(...COLORS.dark);
  doc.setFont('helvetica', 'bold');
  doc.text(value, x + 55, y);
  return y + 5.5;
}

function drawFooter(doc: jsPDF, processedBy: string) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  const footerY = ph - 42;

  // Signature lines
  doc.setDrawColor(...COLORS.muted);
  doc.setLineWidth(0.3);

  doc.line(14, footerY, 90, footerY);
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'normal');
  doc.text('Caixa / Responsável', 14, footerY + 4);
  doc.setTextColor(...COLORS.dark);
  doc.text(processedBy, 14, footerY + 8);

  doc.line(pw - 90, footerY, pw - 14, footerY);
  doc.setTextColor(...COLORS.muted);
  doc.text('Assinatura do Cliente', pw - 90, footerY + 4);

  // Footer bar
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(14, ph - 22, pw - 14, ph - 22);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.muted);
  doc.text(BRAND_CONTACT, 14, ph - 16);
  doc.text('Documento emitido electronicamente pelo sistema de gestão MicroLoan Hub', 14, ph - 11);
  doc.text(`Emitido: ${fmtDateTime(new Date().toISOString())}`, 14, ph - 6);
  doc.text('Este documento não substitui a factura oficial', pw - 14, ph - 11, { align: 'right' });

  // Bottom bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, ph - 3, pw, 3, 'F');
}

// ─── Disbursement Receipt ──────────────────────────────────

export function generateDisbursementPDF(
  disbursement: Disbursement,
  contract: Contract,
  client: Client,
  userId: string,
  userName: string,
  userRole: string
): string {
  const receiptId = nextReceiptId('RD');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  let y = drawHeader(doc, receiptId, 'COMPROVATIVO DE DESEMBOLSO', fmtDateLong(disbursement.disbursedAt));

  // Emitter
  y = drawSectionTitle(doc, 'Emitido Por', y);
  y = drawKeyValue(doc, 'Utilizador:', userName, 16, y);
  y = drawKeyValue(doc, 'Perfil:', userRole, 16, y);
  y += 3;

  // Client
  y = drawSectionTitle(doc, 'Beneficiário', y);
  y = drawKeyValue(doc, 'Nome:', client.fullName, 16, y);
  y = drawKeyValue(doc, 'Telefone:', client.phone, 16, y);
  y = drawKeyValue(doc, 'BI:', client.biNumber, 16, y);
  if (client.nuit) y = drawKeyValue(doc, 'NUIT:', client.nuit, 16, y);
  y += 3;

  // Contract / Loan info
  y = drawSectionTitle(doc, 'Dados do Contrato', y);
  y = drawKeyValue(doc, 'Contrato:', contract.contractNumber, 16, y);
  y = drawKeyValue(doc, 'Capital:', fmtMT(contract.principalAmount), 16, y);
  y = drawKeyValue(doc, 'Prazo:', `${contract.termMonths} meses`, 16, y);
  y = drawKeyValue(doc, 'Taxa Mensal:', `${contract.interestRate}%`, 16, y);
  y = drawKeyValue(doc, 'Prestação:', fmtMT(contract.monthlyPayment), 16, y);
  y += 3;

  // Financial summary table
  y = drawSectionTitle(doc, 'Resumo Financeiro', y);

  autoTable(doc, {
    startY: y,
    margin: { left: 16, right: 16 },
    head: [['Descrição', 'Valor (MZN)']],
    body: [
      ['Valor Bruto do Empréstimo', fmtMT(disbursement.grossAmount)],
      ['Taxa Administrativa', `- ${fmtMT(disbursement.adminFee)}`],
    ],
    foot: [['VALOR LÍQUIDO ENTREGUE', fmtMT(disbursement.netAmount)]],
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9, textColor: COLORS.dark },
    footStyles: { fillColor: COLORS.accent, textColor: COLORS.white, fontSize: 10, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    theme: 'grid',
    styles: { cellPadding: 3 },
  });

  y = doc.lastAutoTable.finalY + 6;

  // Payment method
  y = drawSectionTitle(doc, 'Forma de Entrega', y);
  y = drawKeyValue(doc, 'Método:', paymentMethodLabel(disbursement.method), 16, y);
  y = drawKeyValue(doc, 'Referência:', disbursement.reference || 'N/A', 16, y);
  if (disbursement.notes) y = drawKeyValue(doc, 'Observações:', disbursement.notes, 16, y);

  drawFooter(doc, userName);

  const filename = `Recibo_Desembolso_${receiptId}.pdf`;
  doc.save(filename);

  auditService.log(userId, userName, 'DISBURSEMENT_RECEIPT_GENERATED', 'disbursement', disbursement.id,
    `Recibo: ${receiptId} | Valor: ${fmtMT(disbursement.netAmount)}`);

  return receiptId;
}

// ─── Payment Receipt ───────────────────────────────────────

export function generatePaymentPDF(
  payment: Payment,
  loan: Loan,
  client: Client,
  userId: string,
  userName: string,
  userRole: string
): string {
  const receiptId = nextReceiptId('RP');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  let y = drawHeader(doc, receiptId, 'RECIBO DE PAGAMENTO', fmtDateLong(payment.paymentDate));

  // Emitter
  y = drawSectionTitle(doc, 'Emitido Por', y);
  y = drawKeyValue(doc, 'Utilizador:', userName, 16, y);
  y = drawKeyValue(doc, 'Perfil:', userRole, 16, y);
  y += 3;

  // Client
  y = drawSectionTitle(doc, 'Cliente', y);
  y = drawKeyValue(doc, 'Nome:', client.fullName, 16, y);
  y = drawKeyValue(doc, 'Telefone:', client.phone, 16, y);
  y = drawKeyValue(doc, 'BI:', client.biNumber, 16, y);
  if (client.nuit) y = drawKeyValue(doc, 'NUIT:', client.nuit, 16, y);
  y += 3;

  // Loan
  y = drawSectionTitle(doc, 'Dados do Empréstimo', y);
  y = drawKeyValue(doc, 'Empréstimo:', loan.loanNumber, 16, y);
  y = drawKeyValue(doc, 'Capital Original:', fmtMT(loan.principalAmount), 16, y);
  y = drawKeyValue(doc, 'Prazo:', `${loan.termMonths} meses`, 16, y);
  y = drawKeyValue(doc, 'Taxa Mensal:', `${loan.interestRate}%`, 16, y);
  y += 3;

  // Balances
  const saldoAnterior = loan.outstandingPrincipal + payment.principalPaid;
  const saldoAtual = loan.outstandingPrincipal;

  y = drawSectionTitle(doc, 'Saldos', y);
  y = drawKeyValue(doc, 'Saldo Anterior:', fmtMT(saldoAnterior), 16, y);
  y = drawKeyValue(doc, 'Saldo Actual:', fmtMT(saldoAtual), 16, y);
  y += 3;

  // Allocation table
  y = drawSectionTitle(doc, 'Alocação do Pagamento', y);

  const allocRows: string[][] = [];
  if (payment.penaltyPaid > 0) allocRows.push(['Multa de Mora', fmtMT(payment.penaltyPaid)]);
  allocRows.push(['Juros', fmtMT(payment.interestPaid)]);
  allocRows.push(['Capital (Amortização)', fmtMT(payment.principalPaid)]);

  autoTable(doc, {
    startY: y,
    margin: { left: 16, right: 16 },
    head: [['Componente', 'Valor (MZN)']],
    body: allocRows,
    foot: [['TOTAL PAGO', fmtMT(payment.amount)]],
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9, textColor: COLORS.dark },
    footStyles: { fillColor: COLORS.accent, textColor: COLORS.white, fontSize: 10, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    theme: 'grid',
    styles: { cellPadding: 3 },
  });

  y = doc.lastAutoTable.finalY + 6;

  // Payment method
  y = drawSectionTitle(doc, 'Detalhes do Pagamento', y);
  y = drawKeyValue(doc, 'Método:', paymentMethodLabel(payment.paymentMethod), 16, y);
  y = drawKeyValue(doc, 'Referência:', payment.reference || 'N/A', 16, y);
  y = drawKeyValue(doc, 'Recibo Interno:', payment.receiptNumber, 16, y);
  if (payment.notes) y = drawKeyValue(doc, 'Observações:', payment.notes, 16, y);

  drawFooter(doc, userName);

  const filename = `Recibo_Pagamento_${receiptId}.pdf`;
  doc.save(filename);

  auditService.log(userId, userName, 'PAYMENT_RECEIPT_GENERATED', 'payment', payment.id,
    `Recibo: ${receiptId} | Valor: ${fmtMT(payment.amount)}`);

  return receiptId;
}
