/**
 * Institutional PDF Service
 * Professional PDF generation for reports, parecers, and institutional documents
 * Formatted for Bank of Mozambique, Board of Directors, and institutional use
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { calcService } from './calcService';

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: { finalY: number };
  }
}

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
  warning: [255, 165, 0] as [number, number, number],
};

function fmtDate(date?: string | Date): string {
  const d = date ? new Date(date) : new Date();
  return d.toLocaleDateString('pt-MZ', {
    timeZone: 'Africa/Maputo',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function fmtDateShort(date?: string | Date): string {
  const d = date ? new Date(date) : new Date();
  return d.toLocaleDateString('pt-MZ', {
    timeZone: 'Africa/Maputo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// ─── Header & Footer ────────────────────────────────────────

function drawInstitutionalHeader(doc: jsPDF, title: string, subtitle?: string): number {
  const pw = doc.internal.pageSize.getWidth();

  // Top bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pw, 4, 'F');

  // Gold accent line
  doc.setFillColor(...COLORS.gold);
  doc.rect(0, 4, pw, 1.5, 'F');

  // Brand area
  let y = 14;
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text(BRAND, 14, y);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.muted);
  doc.text(BRAND_SUBTITLE, 14, y + 5);
  doc.text(BRAND_ADDRESS, 14, y + 9.5);

  // Classification badge (right side)
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.danger);
  doc.text('CONFIDENCIAL — USO INTERNO', pw - 14, 14, { align: 'right' });

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.muted);
  doc.text(`Emitido: ${fmtDate()}`, pw - 14, 19, { align: 'right' });

  // Separator
  y = 30;
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.8);
  doc.line(14, y, pw - 14, y);

  // Document title
  y += 8;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text(title.toUpperCase(), pw / 2, y, { align: 'center' });

  if (subtitle) {
    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.muted);
    doc.text(subtitle, pw / 2, y, { align: 'center' });
  }

  // Thin line after title
  y += 4;
  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(0.3);
  doc.line(pw / 2 - 40, y, pw / 2 + 40, y);

  return y + 8;
}

function drawInstitutionalFooter(doc: jsPDF, pageNum: number, totalPages: number, emittedBy?: string) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  // Footer separator
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(14, ph - 22, pw - 14, ph - 22);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.muted);

  doc.text(BRAND_CONTACT, 14, ph - 16);
  doc.text('Documento gerado electronicamente pelo sistema de gestão MicroLoan Hub', 14, ph - 11);
  if (emittedBy) {
    doc.text(`Emitido por: ${emittedBy}`, 14, ph - 6);
  }

  doc.text(`Página ${pageNum} de ${totalPages}`, pw - 14, ph - 11, { align: 'right' });
  doc.text('Este documento não substitui a documentação oficial exigida pelo Banco de Moçambique', pw - 14, ph - 6, { align: 'right' });

  // Bottom bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, ph - 3, pw, 3, 'F');
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

function drawKeyValue(doc: jsPDF, key: string, value: string, x: number, y: number, valueWidth = 55): number {
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.muted);
  doc.text(key, x, y);
  doc.setTextColor(...COLORS.dark);
  doc.setFont('helvetica', 'bold');
  doc.text(value, x + valueWidth, y);
  return y + 5;
}

function addPageNumbers(doc: jsPDF, emittedBy?: string) {
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawInstitutionalFooter(doc, i, totalPages, emittedBy);
  }
}

// ─── Parecer de Análise de Crédito ──────────────────────────

export interface ParecerData {
  applicationId: string;
  analystName: string;
  analystRole: string;
  client: {
    fullName: string;
    biNumber: string;
    phone: string;
    nuit?: string;
    monthlyIncome: number;
    monthlyExpenses: number;
    employer?: string;
    province?: string;
    district?: string;
  };
  product: {
    name: string;
  };
  requestedAmount: number;
  termMonths: number;
  interestRate: number;
  creditScore: number;
  riskLevel: string;
  dti: number;
  paymentCapacity: number;
  monthlyPayment: number;
  totalInterest: number;
  totalAmount: number;
  documents: { name: string; verified: boolean; rejectedReason?: string }[];
  purpose: string;
  guaranteeType: string;
  guaranteeDescription?: string;
  decision?: string;
  decisionNotes?: string;
}

export function generateParecerPDF(data: ParecerData): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  const PAGE_TOP = 20;
  const PAGE_BOTTOM_SAFE = 30;

  const drawParecerPageChrome = () => {
    drawInstitutionalHeader(
      doc,
      'Parecer de Análise de Crédito',
      `Solicitação Nº ${data.applicationId}`
    );
  };

  drawParecerPageChrome();

  let y = 52;

  // Emitter
  y = drawSectionTitle(doc, 'Identificação do Analista', y);
  y = drawKeyValue(doc, 'Analista:', data.analystName, 16, y);
  y = drawKeyValue(doc, 'Função:', data.analystRole, 16, y);
  y = drawKeyValue(doc, 'Data da Análise:', fmtDate(), 16, y);
  y += 3;

  // Client
  y = drawSectionTitle(doc, 'Dados do Solicitante', y);
  y = drawKeyValue(doc, 'Nome Completo:', data.client.fullName, 16, y);
  y = drawKeyValue(doc, 'Nº do BI:', data.client.biNumber, 16, y);
  y = drawKeyValue(doc, 'Telefone:', data.client.phone, 16, y);
  if (data.client.nuit) y = drawKeyValue(doc, 'NUIT:', data.client.nuit, 16, y);
  y = drawKeyValue(
    doc,
    'Rendimento Mensal:',
    calcService.formatCurrency(data.client.monthlyIncome),
    16,
    y
  );
  y = drawKeyValue(
    doc,
    'Despesas Mensais:',
    calcService.formatCurrency(data.client.monthlyExpenses),
    16,
    y
  );
  if (data.client.employer) y = drawKeyValue(doc, 'Empregador:', data.client.employer, 16, y);
  if (data.client.province) {
    y = drawKeyValue(
      doc,
      'Localização:',
      `${data.client.district || ''}, ${data.client.province}`,
      16,
      y
    );
  }
  y += 3;

  // Product / Loan conditions
  y = drawSectionTitle(doc, 'Condições do Crédito Solicitado', y);
  y = drawKeyValue(doc, 'Produto:', data.product.name, 16, y);
  y = drawKeyValue(
    doc,
    'Valor Solicitado:',
    calcService.formatCurrency(data.requestedAmount),
    16,
    y
  );
  y = drawKeyValue(doc, 'Prazo:', `${data.termMonths} meses`, 16, y);
  y = drawKeyValue(doc, 'Taxa de Juros:', `${data.interestRate}% ao mês`, 16, y);
  y = drawKeyValue(
    doc,
    'Prestação Mensal:',
    calcService.formatCurrency(data.monthlyPayment),
    16,
    y
  );
  y = drawKeyValue(
    doc,
    'Total de Juros:',
    calcService.formatCurrency(data.totalInterest),
    16,
    y
  );
  y = drawKeyValue(
    doc,
    'Total a Pagar:',
    calcService.formatCurrency(data.totalAmount),
    16,
    y
  );
  y = drawKeyValue(doc, 'Finalidade:', data.purpose, 16, y);
  y = drawKeyValue(doc, 'Garantia:', data.guaranteeType, 16, y);
  if (data.guaranteeDescription) {
    y = drawKeyValue(doc, 'Descrição Garantia:', data.guaranteeDescription, 16, y);
  }
  y += 3;

  // Risk analysis
  y = drawSectionTitle(doc, 'Análise de Risco', y);

  autoTable(doc, {
    startY: y,
    margin: { left: 16, right: 16, top: 52, bottom: PAGE_BOTTOM_SAFE },
    head: [['Indicador', 'Valor', 'Avaliação']],
    body: [
      [
        'Score de Crédito',
        `${data.creditScore} / 1000`,
        data.creditScore >= 700 ? 'BOM' : data.creditScore >= 500 ? 'MÉDIO' : 'FRACO',
      ],
      [
        'Nível de Risco',
        data.riskLevel.toUpperCase(),
        data.riskLevel === 'low'
          ? 'APROVÁVEL'
          : data.riskLevel === 'medium'
          ? 'REQUER ATENÇÃO'
          : 'ELEVADO',
      ],
      [
        'DTI (Debt-to-Income)',
        `${data.dti.toFixed(1)}%`,
        data.dti <= 40 ? 'ADEQUADO' : data.dti <= 60 ? 'ELEVADO' : 'EXCESSIVO',
      ],
      [
        'Capacidade de Pagamento',
        calcService.formatCurrency(data.paymentCapacity),
        data.paymentCapacity >= data.monthlyPayment ? 'SUFICIENTE' : 'INSUFICIENTE',
      ],
      [
        'Renda Disponível',
        calcService.formatCurrency(data.client.monthlyIncome - data.client.monthlyExpenses),
        'N/A',
      ],
    ],
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: { fontSize: 8, textColor: COLORS.dark },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    theme: 'grid',
    styles: { cellPadding: 2.5 },
    columnStyles: { 2: { fontStyle: 'bold' } },
    didDrawPage: () => {
      drawParecerPageChrome();
    },
  });

  y = doc.lastAutoTable.finalY + 6;

  // Documents section title
  y = drawSectionTitle(doc, 'Verificação Documental', y);

  autoTable(doc, {
    startY: y,
    margin: { left: 16, right: 16, top: 52, bottom: PAGE_BOTTOM_SAFE },
    head: [['Documento', 'Estado', 'Observações']],
    body:
      data.documents.length > 0
        ? data.documents.map((d) => [
            d.name,
            d.verified ? 'VERIFICADO' : 'PENDENTE',
            d.rejectedReason || '—',
          ])
        : [['Sem documentos anexados', 'N/A', '—']],
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: { fontSize: 8, textColor: COLORS.dark, valign: 'middle' },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    theme: 'grid',
    styles: {
      cellPadding: 2.5,
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: 95 },
      1: { cellWidth: 32, halign: 'center' },
      2: { cellWidth: 45 },
    },
    didParseCell: (cellData) => {
      if (cellData.column.index === 1 && cellData.section === 'body') {
        const text = String(cellData.cell.raw || '');
        if (text.includes('VERIFICADO')) {
          cellData.cell.styles.textColor = COLORS.success;
          cellData.cell.styles.fontStyle = 'bold';
        } else if (text.includes('PENDENTE')) {
          cellData.cell.styles.textColor = COLORS.danger;
          cellData.cell.styles.fontStyle = 'bold';
        }
      }
    },
    didDrawPage: () => {
      drawParecerPageChrome();
    },
  });

  y = doc.lastAutoTable.finalY + 8;

  // Decision block
  if (y > ph - 65) {
    doc.addPage();
    drawParecerPageChrome();
    y = 52;
  }

  if (data.decision) {
    y = drawSectionTitle(doc, 'Decisão / Parecer', y);

    const decisionLabel =
      data.decision === 'approved'
        ? 'APROVADO'
        : data.decision === 'rejected'
        ? 'REJEITADO'
        : 'PENDENTE DE REVISÃO';

    const decisionColor =
      data.decision === 'approved'
        ? COLORS.success
        : data.decision === 'rejected'
        ? COLORS.danger
        : COLORS.warning;

    doc.setFillColor(...decisionColor);
    doc.roundedRect(16, y - 3, 40, 8, 1, 1, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.white);
    doc.text(decisionLabel, 36, y + 2, { align: 'center' });
    y += 10;

    if (data.decisionNotes) {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.dark);
      const lines = doc.splitTextToSize(data.decisionNotes, 165);
      doc.text(lines, 16, y);
      y += lines.length * 4.5 + 4;
    }
  }

  // Signature area
  y += 8;
  if (y > ph - 55) {
    doc.addPage();
    drawParecerPageChrome();
    y = 65;
  }

  doc.setDrawColor(...COLORS.muted);
  doc.setLineWidth(0.3);

  // Left signature
  doc.line(16, y + 15, 85, y + 15);
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'normal');
  doc.text('Analista de Crédito', 16, y + 19);
  doc.text(data.analystName, 16, y + 23);

  // Right signature
  doc.line(pw - 85, y + 15, pw - 16, y + 15);
  doc.text('Director / Supervisor', pw - 85, y + 19);

  // Stamp area
  doc.setDrawColor(...COLORS.light);
  doc.setLineWidth(0.5);
  doc.roundedRect(pw / 2 - 15, y, 30, 30, 2, 2, 'S');
  doc.setFontSize(6);
  doc.setTextColor(...COLORS.light);
  doc.text('CARIMBO', pw / 2, y + 16, { align: 'center' });

  addPageNumbers(doc, data.analystName);

  const filename = `Parecer_Credito_${data.applicationId}_${fmtDateShort().replace(/\//g, '-')}.pdf`;
  doc.save(filename);
}

// ─── Relatório Executivo PDF ────────────────────────────────

export interface ReportData {
  period: string;
  emittedBy: string;
  emitterRole: string;
  summary: {
    totalPortfolio: number;
    activeLoans: number;
    activeClients: number;
    avgLoanSize: number;
    totalDisbursed: number;
    totalReceived: number;
    par30: number;
    par90: number;
    delinquencyRate: number;
    approvalRate: number;
    totalApproved: number;
    totalRejected: number;
    totalSubmitted: number;
    principalReceived: number;
    interestReceived: number;
    penaltyReceived: number;
    collectionRate: number;
  };
  agingData: { name: string; value: number }[];
  provinceData: { name: string; count: number; amount: number }[];
  productData: { name: string; count: number; portfolio: number; overdue: number; par: number }[];
  analystData: { name: string; activeLoans: number; portfolio: number; overdue: number; par: number; approved: number; rejected: number }[];
  portfolioDetail: { loanNumber: string; client: string; bi: string; principal: number; outstanding: number; daysOverdue: number; status: string }[];
}

export function generateReportPDF(data: ReportData): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();

  // ─── PAGE 1: Executive Summary
  let y = drawInstitutionalHeader(doc, 'Relatório de Gestão da Carteira de Crédito', `Período: ${data.period}`);

  y = drawSectionTitle(doc, 'Indicadores Executivos', y);

  autoTable(doc, {
    startY: y,
    margin: { left: 16, right: 16 },
    head: [['Indicador', 'Valor']],
    body: [
      ['Carteira Activa Total', calcService.formatCurrency(data.summary.totalPortfolio)],
      ['Nº Empréstimos Activos', data.summary.activeLoans.toString()],
      ['Nº Clientes Activos', data.summary.activeClients.toString()],
      ['Ticket Médio', calcService.formatCurrency(data.summary.avgLoanSize)],
      ['Total Desembolsado (Período)', calcService.formatCurrency(data.summary.totalDisbursed)],
      ['Total Recebido (Período)', calcService.formatCurrency(data.summary.totalReceived)],
      ['   › Capital Amortizado', calcService.formatCurrency(data.summary.principalReceived)],
      ['   › Juros Recebidos', calcService.formatCurrency(data.summary.interestReceived)],
      ['   › Multas de Mora', calcService.formatCurrency(data.summary.penaltyReceived)],
      ['Taxa de Cobrança', `${data.summary.collectionRate.toFixed(1)}%`],
    ],
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9, textColor: COLORS.dark },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    theme: 'grid',
    styles: { cellPadding: 3 },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
  });

  y = doc.lastAutoTable.finalY + 8;

  // Risk indicators
  y = drawSectionTitle(doc, 'Indicadores de Risco e Qualidade', y);

  autoTable(doc, {
    startY: y,
    margin: { left: 16, right: 16 },
    head: [['Indicador', 'Valor', 'Classificação']],
    body: [
      ['PAR > 30 dias', `${data.summary.par30.toFixed(2)}%`, data.summary.par30 <= 5 ? 'SAUDÁVEL' : data.summary.par30 <= 10 ? 'ATENÇÃO' : 'CRÍTICO'],
      ['PAR > 90 dias', `${data.summary.par90.toFixed(2)}%`, data.summary.par90 <= 2 ? 'SAUDÁVEL' : data.summary.par90 <= 5 ? 'ATENÇÃO' : 'CRÍTICO'],
      ['Taxa de Inadimplência', `${data.summary.delinquencyRate.toFixed(2)}%`, data.summary.delinquencyRate <= 5 ? 'SAUDÁVEL' : 'ATENÇÃO'],
      ['Taxa de Aprovação', `${data.summary.approvalRate.toFixed(1)}%`, 'N/A'],
      ['Solicitações Aprovadas / Rejeitadas', `${data.summary.totalApproved} / ${data.summary.totalRejected}`, `de ${data.summary.totalSubmitted} recebidas`],
    ],
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: COLORS.dark },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    theme: 'grid',
    styles: { cellPadding: 2.5 },
    didParseCell: (cellData) => {
      if (cellData.column.index === 2 && cellData.section === 'body') {
        const text = cellData.cell.raw as string;
        if (text === 'SAUDÁVEL') cellData.cell.styles.textColor = COLORS.success;
        else if (text === 'ATENÇÃO') cellData.cell.styles.textColor = COLORS.warning;
        else if (text === 'CRÍTICO') cellData.cell.styles.textColor = COLORS.danger;
        cellData.cell.styles.fontStyle = 'bold';
      }
    },
  });

  // ─── PAGE 2: Aging & Province
  doc.addPage();
  y = 20;

  y = drawSectionTitle(doc, 'Aging da Carteira — Análise por Faixa de Atraso', y);

  if (data.agingData.length > 0) {
    const totalAging = data.agingData.reduce((s, d) => s + d.value, 0);
    autoTable(doc, {
      startY: y,
      margin: { left: 16, right: 16 },
      head: [['Faixa de Atraso', 'Saldo Devedor (MZN)', '% da Carteira', 'Provisão Sugerida']],
      body: data.agingData.map(d => {
        const pct = totalAging > 0 ? (d.value / totalAging) * 100 : 0;
        const provision = d.name === 'Em Dia' ? '0%' :
          d.name === '1-30 dias' ? '5%' :
            d.name === '31-60 dias' ? '25%' :
              d.name === '61-90 dias' ? '50%' : '100%';
        return [d.name, calcService.formatCurrency(d.value), `${pct.toFixed(1)}%`, provision];
      }),
      foot: [['TOTAL', calcService.formatCurrency(totalAging), '100%', '']],
      headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: COLORS.dark },
      footStyles: { fillColor: COLORS.accent, textColor: COLORS.white, fontSize: 9, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      theme: 'grid',
      styles: { cellPadding: 2.5 },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'center' }, 3: { halign: 'center' } },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // Province
  y = drawSectionTitle(doc, 'Distribuição Geográfica', y);

  if (data.provinceData.length > 0) {
    const totalProv = data.provinceData.reduce((s, d) => s + d.amount, 0);
    autoTable(doc, {
      startY: y,
      margin: { left: 16, right: 16 },
      head: [['Província', 'Nº Empréstimos', 'Saldo Devedor (MZN)', '% da Carteira']],
      body: data.provinceData.map(p => [
        p.name,
        p.count.toString(),
        calcService.formatCurrency(p.amount),
        `${totalProv > 0 ? ((p.amount / totalProv) * 100).toFixed(1) : '0.0'}%`,
      ]),
      headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: COLORS.dark },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      theme: 'grid',
      styles: { cellPadding: 2.5 },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'center' } },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // Products
  if (data.productData.length > 0) {
    y = drawSectionTitle(doc, 'Desempenho por Produto de Crédito', y);

    autoTable(doc, {
      startY: y,
      margin: { left: 16, right: 16 },
      head: [['Produto', 'Nº Contratos', 'Carteira (MZN)', 'Em Atraso (MZN)', 'PAR (%)']],
      body: data.productData.map(p => [
        p.name,
        p.count.toString(),
        calcService.formatCurrency(p.portfolio),
        calcService.formatCurrency(p.overdue),
        `${p.par.toFixed(1)}%`,
      ]),
      headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: COLORS.dark },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      theme: 'grid',
      styles: { cellPadding: 2.5 },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'center' } },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // ─── PAGE 3: Analysts + Portfolio Detail
  if (data.analystData.length > 0) {
    doc.addPage();
    y = 20;

    y = drawSectionTitle(doc, 'Desempenho por Analista', y);

    autoTable(doc, {
      startY: y,
      margin: { left: 16, right: 16 },
      head: [['Analista', 'Empréstimos', 'Carteira (MZN)', 'Em Atraso (MZN)', 'PAR (%)', 'Aprovados', 'Rejeitados']],
      body: data.analystData.map(a => [
        a.name,
        a.activeLoans.toString(),
        calcService.formatCurrency(a.portfolio),
        calcService.formatCurrency(a.overdue),
        `${a.par.toFixed(1)}%`,
        a.approved.toString(),
        a.rejected.toString(),
      ]),
      headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: COLORS.dark },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      theme: 'grid',
      styles: { cellPadding: 2.5 },
      columnStyles: {
        1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' },
        4: { halign: 'center' }, 5: { halign: 'center' }, 6: { halign: 'center' },
      },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // Portfolio detail (top 30 loans)
  if (data.portfolioDetail.length > 0) {
    if (y > 150) { doc.addPage(); y = 20; }

    y = drawSectionTitle(doc, 'Detalhe da Carteira — Top 30 por Saldo', y);

    const topLoans = data.portfolioDetail
      .sort((a, b) => b.outstanding - a.outstanding)
      .slice(0, 30);

    autoTable(doc, {
      startY: y,
      margin: { left: 16, right: 16 },
      head: [['Nº Empréstimo', 'Cliente', 'Capital (MZN)', 'Saldo (MZN)', 'Dias Atraso', 'Estado']],
      body: topLoans.map(l => [
        l.loanNumber,
        l.client,
        calcService.formatCurrency(l.principal),
        calcService.formatCurrency(l.outstanding),
        l.daysOverdue.toString(),
        l.status,
      ]),
      headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7, textColor: COLORS.dark },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      theme: 'grid',
      styles: { cellPadding: 2 },
      columnStyles: {
        2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'center' },
      },
      didParseCell: (cellData) => {
        if (cellData.column.index === 5 && cellData.section === 'body') {
          const text = cellData.cell.raw as string;
          if (text === 'Em Atraso') cellData.cell.styles.textColor = COLORS.danger;
        }
      },
    });
  }

  addPageNumbers(doc, data.emittedBy);

  const filename = `Relatorio_Institucional_${fmtDateShort().replace(/\//g, '-')}.pdf`;
  doc.save(filename);
}

// ─── Contrato de Empréstimo PDF ─────────────────────────────

export interface ContractPdfData {
  contractNumber: string;
  createdAt: string;
  signedAt?: string;
  client: {
    fullName: string;
    biNumber: string;
    phone: string;
    nuit?: string;
    address?: string;
    district?: string;
    province?: string;
    employer?: string;
  };
  principalAmount: number;
  interestRate: number;
  termMonths: number;
  monthlyPayment: number;
  totalInterest: number;
  totalAmount: number;
  adminFee: number;
  netDisbursement: number;
  schedule: { installment: number; principal: number; interest: number; total: number; balance: number; dueDate: string }[];
  emittedBy: string;
}

export function generateContractPDF(data: ContractPdfData): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();

  // ─── PAGE 1: Contract
  let y = drawInstitutionalHeader(doc, 'Contrato de Empréstimo', `Nº ${data.contractNumber}`);

  // Contract info
  y = drawSectionTitle(doc, 'Identificação do Contrato', y);
  y = drawKeyValue(doc, 'Nº do Contrato:', data.contractNumber, 16, y);
  y = drawKeyValue(doc, 'Data de Emissão:', fmtDate(data.createdAt), 16, y);
  if (data.signedAt) y = drawKeyValue(doc, 'Data de Assinatura:', fmtDate(data.signedAt), 16, y);
  y += 3;

  // Client (MUTUÁRIO)
  y = drawSectionTitle(doc, 'Dados do Mutuário', y);
  y = drawKeyValue(doc, 'Nome Completo:', data.client.fullName, 16, y);
  y = drawKeyValue(doc, 'Nº do BI:', data.client.biNumber, 16, y);
  y = drawKeyValue(doc, 'Telefone:', data.client.phone, 16, y);
  if (data.client.nuit) y = drawKeyValue(doc, 'NUIT:', data.client.nuit, 16, y);
  if (data.client.address) y = drawKeyValue(doc, 'Endereço:', `${data.client.address}${data.client.district ? ', ' + data.client.district : ''}`, 16, y);
  if (data.client.province) y = drawKeyValue(doc, 'Província:', data.client.province, 16, y);
  if (data.client.employer) y = drawKeyValue(doc, 'Empregador:', data.client.employer, 16, y);
  y += 3;

  // Loan conditions
  y = drawSectionTitle(doc, 'Condições do Empréstimo', y);

  autoTable(doc, {
    startY: y,
    margin: { left: 16, right: 16 },
    head: [['Descrição', 'Valor']],
    body: [
      ['Capital Mutuado', calcService.formatCurrency(data.principalAmount)],
      ['Taxa de Juros Mensal', `${data.interestRate}%`],
      ['Prazo do Empréstimo', `${data.termMonths} meses`],
      ['Prestação Mensal (Capital + Juros)', calcService.formatCurrency(data.monthlyPayment)],
      ['Total de Juros a Pagar', calcService.formatCurrency(data.totalInterest)],
      ['Valor Total a Pagar', calcService.formatCurrency(data.totalAmount)],
      ['Taxa Administrativa', calcService.formatCurrency(data.adminFee)],
      ['Valor Líquido a Desembolsar', calcService.formatCurrency(data.netDisbursement)],
    ],
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9, textColor: COLORS.dark },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    theme: 'grid',
    styles: { cellPadding: 3 },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
  });

  y = doc.lastAutoTable.finalY + 8;

  // Clauses
  y = drawSectionTitle(doc, 'Cláusulas Contratuais', y);

  const clauses = [
    '1. O Mutuário compromete-se a pagar as prestações mensais nas datas acordadas no plano de amortização anexo.',
    '2. O atraso no pagamento das prestações implica a cobrança de juros de mora à taxa de 2% ao mês sobre o valor em atraso.',
    '3. O Mutuário poderá efectuar o pagamento antecipado, total ou parcial, do saldo devedor sem penalização.',
    '4. Em caso de incumprimento superior a 90 (noventa) dias, a Instituição reserva-se o direito de accionar os mecanismos legais de cobrança previstos na legislação moçambicana.',
    '5. O presente contrato rege-se pela legislação da República de Moçambique, nomeadamente a Lei das Instituições de Crédito e Sociedades Financeiras.',
    '6. Qualquer litígio emergente do presente contrato será dirimido nos tribunais da cidade de Maputo.',
    '7. O Mutuário declara ter lido e compreendido todas as condições do presente contrato, aceitando-as integralmente.',
  ];

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.dark);

  for (const clause of clauses) {
    if (y > 260) { doc.addPage(); y = 20; }
    const lines = doc.splitTextToSize(clause, pw - 32);
    doc.text(lines, 16, y);
    y += lines.length * 4 + 2;
  }

  // Signature area
  y += 8;
  if (y > 235) { doc.addPage(); y = 20; }

  y = drawSectionTitle(doc, 'Assinaturas', y);
  y += 4;

  doc.setDrawColor(...COLORS.muted);
  doc.setLineWidth(0.3);

  // Left - Client
  doc.line(16, y + 20, 90, y + 20);
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'normal');
  doc.text('O Mutuário', 16, y + 24);
  doc.setTextColor(...COLORS.dark);
  doc.text(data.client.fullName, 16, y + 28);
  doc.setTextColor(...COLORS.muted);
  doc.text(`BI: ${data.client.biNumber}`, 16, y + 32);

  // Right - Institution
  doc.line(pw - 90, y + 20, pw - 16, y + 20);
  doc.text('Pela Instituição', pw - 90, y + 24);
  doc.setTextColor(...COLORS.dark);
  doc.text(BRAND, pw - 90, y + 28);

  // Center - stamp
  doc.setDrawColor(...COLORS.light);
  doc.setLineWidth(0.5);
  doc.roundedRect(pw / 2 - 15, y + 2, 30, 30, 2, 2, 'S');
  doc.setFontSize(6);
  doc.setTextColor(...COLORS.light);
  doc.text('CARIMBO', pw / 2, y + 18, { align: 'center' });

  // ─── PAGE 2+: Amortization Schedule
  if (data.schedule.length > 0) {
    doc.addPage();
    let sy = 20;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('PLANO DE AMORTIZAÇÃO', pw / 2, sy, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.muted);
    doc.text(`Contrato: ${data.contractNumber} • Cliente: ${data.client.fullName}`, pw / 2, sy + 5, { align: 'center' });
    sy += 12;

    autoTable(doc, {
      startY: sy,
      margin: { left: 16, right: 16 },
      head: [['Nº', 'Vencimento', 'Capital (MZN)', 'Juros (MZN)', 'Prestação (MZN)', 'Saldo (MZN)']],
      body: data.schedule.map(s => [
        s.installment.toString(),
        s.dueDate,
        calcService.formatCurrency(s.principal),
        calcService.formatCurrency(s.interest),
        calcService.formatCurrency(s.total),
        calcService.formatCurrency(s.balance),
      ]),
      foot: [[
        '', 'TOTAL',
        calcService.formatCurrency(data.principalAmount),
        calcService.formatCurrency(data.totalInterest),
        calcService.formatCurrency(data.totalAmount),
        '',
      ]],
      headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 7.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: COLORS.dark },
      footStyles: { fillColor: COLORS.accent, textColor: COLORS.white, fontSize: 8, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      theme: 'grid',
      styles: { cellPadding: 2 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { cellWidth: 28 },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
      },
    });
  }

  addPageNumbers(doc, data.emittedBy);

  const filename = `Contrato_${data.contractNumber}_${fmtDateShort().replace(/\//g, '-')}.pdf`;
  doc.save(filename);
}
