// Messaging Service - WhatsApp/SMS deep links with templates, anti-spam, audit

import { storageService } from './storageService';
import { auditService } from './auditService';
import { calcService } from './calcService';
import { Loan, Client } from '@/models/types';

// ── Types ──────────────────────────────────────────────────────────

export type MessageChannel = 'whatsapp' | 'sms';
export type MessageType = 'REMINDER' | 'LATE';
export type MessageStatus = 'SENT' | 'SKIPPED' | 'FAILED';

export interface MessageLog {
  id: string;
  type: MessageType;
  channel: MessageChannel;
  clientId: string;
  loanId: string;
  createdAt: string;
  createdBy: string;
  messageText: string;
  status: MessageStatus;
  reason?: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  type: MessageType;
  body: string;
  isDefault: boolean;
  updatedAt: string;
  updatedBy?: string;
}

export interface MessagingSettings {
  defaultChannel: MessageChannel;
  allowedHoursStart: string; // "08:00"
  allowedHoursEnd: string;   // "18:00"
  reminderDaysBefore: number[];
  lateDaysAfter: number[];
  updatedAt: string;
}

// ── Default templates ──────────────────────────────────────────────

const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tpl-late-short',
    name: 'Atraso (curta)',
    type: 'LATE',
    body: 'Olá {clientName}, informamos que existe uma prestação em atraso de {amountDue} (atraso: {daysLate} dias). Vencimento: {dueDate}. Por favor regularize. {institutionName}.',
    isDefault: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tpl-late-promise',
    name: 'Atraso (com promessa)',
    type: 'LATE',
    body: 'Olá {clientName}. A sua prestação de {amountDue} venceu em {dueDate} ({daysLate} dias). Pode confirmar o pagamento até {promiseDate}? {institutionName}.',
    isDefault: false,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tpl-reminder-before',
    name: 'Lembrete (antes do vencimento)',
    type: 'REMINDER',
    body: 'Olá {clientName}, lembrete: o seu pagamento de {amountDue} está previsto para {nextInstallmentDate}. Obrigado. {institutionName}.',
    isDefault: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tpl-reminder-monthly',
    name: 'Lembrete (dia mensal)',
    type: 'REMINDER',
    body: 'Olá {clientName}, lembramos que o seu pagamento mensal está agendado para o dia {nextInstallmentDate}. Valor: {amountDue}. {institutionName}.',
    isDefault: false,
    updatedAt: new Date().toISOString(),
  },
];

const DEFAULT_SETTINGS: MessagingSettings = {
  defaultChannel: 'whatsapp',
  allowedHoursStart: '08:00',
  allowedHoursEnd: '18:00',
  reminderDaysBefore: [3, 1, 0],
  lateDaysAfter: [1, 3, 7, 14, 30],
  updatedAt: new Date().toISOString(),
};

// ── Helpers ────────────────────────────────────────────────────────

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('258')) cleaned = '+' + cleaned;
  if (cleaned.startsWith('84') || cleaned.startsWith('85') || cleaned.startsWith('86') || cleaned.startsWith('87')) {
    cleaned = '+258' + cleaned;
  }
  if (!cleaned.startsWith('+258')) return '';
  return cleaned;
}

export function isValidMozambiquePhone(phone: string): boolean {
  return /^\+258(8[4-7])\d{7}$/.test(normalizePhone(phone));
}

// ── Service ────────────────────────────────────────────

class MessagingService {
  // -- Settings --
  getSettings(): MessagingSettings {
    const key = 'microcredito_messaging_settings';
    try {
      const stored = localStorage.getItem(key);
      if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return { ...DEFAULT_SETTINGS };
  }

  saveSettings(settings: MessagingSettings): void {
    settings.updatedAt = new Date().toISOString();
    localStorage.setItem('microcredito_messaging_settings', JSON.stringify(settings));
  }

  // -- Templates --
  getTemplates(): MessageTemplate[] {
    const key = 'microcredito_message_templates';
    try {
      const stored = localStorage.getItem(key);
      if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return [...DEFAULT_TEMPLATES];
  }

  saveTemplates(templates: MessageTemplate[]): void {
    localStorage.setItem('microcredito_message_templates', JSON.stringify(templates));
  }

  getDefaultTemplate(type: MessageType): MessageTemplate | undefined {
    return this.getTemplates().find(t => t.type === type && t.isDefault);
  }

  // -- Logs --
  getLogs(): MessageLog[] {
    const key = 'microcredito_message_logs';
    try {
      const stored = localStorage.getItem(key);
      if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return [];
  }

  private saveLogs(logs: MessageLog[]): void {
    localStorage.setItem('microcredito_message_logs', JSON.stringify(logs));
  }

  addLog(log: MessageLog): void {
    const logs = this.getLogs();
    logs.unshift(log);
    this.saveLogs(logs);
  }

  getLogsByLoan(loanId: string): MessageLog[] {
    return this.getLogs().filter(l => l.loanId === loanId);
  }

  getLogsByClient(clientId: string): MessageLog[] {
    return this.getLogs().filter(l => l.clientId === clientId);
  }

  // -- Anti-spam --
  canSendToday(loanId: string, type: MessageType): boolean {
    const today = new Date().toISOString().slice(0, 10);
    return !this.getLogs().some(
      l => l.loanId === loanId && l.type === type && l.status === 'SENT' && l.createdAt.startsWith(today)
    );
  }

  todaySentBadge(loanId: string): boolean {
    const today = new Date().toISOString().slice(0, 10);
    return this.getLogs().some(
      l => l.loanId === loanId && l.status === 'SENT' && l.createdAt.startsWith(today)
    );
  }

  // -- Template interpolation --
  interpolate(
    template: string,
    vars: {
      client: Client;
      loan: Loan;
      institutionName?: string;
      agentName?: string;
      promiseDate?: string;
    }
  ): string {
    const nextDue = vars.loan.schedule?.find(s => s.status === 'pending' || s.status === 'overdue');
    const amountDue = nextDue ? calcService.formatCurrency(nextDue.totalAmount) : calcService.formatCurrency(vars.loan.nextPaymentAmount || 0);
    const dueDate = nextDue?.dueDate ? new Date(nextDue.dueDate).toLocaleDateString('pt-MZ') : '';
    const nextInstallmentDate = vars.loan.nextPaymentDate ? new Date(vars.loan.nextPaymentDate).toLocaleDateString('pt-MZ') : dueDate;

    return template
      .replace(/\{clientName\}/g, vars.client.fullName)
      .replace(/\{amountDue\}/g, amountDue)
      .replace(/\{daysLate\}/g, String(vars.loan.daysOverdue || 0))
      .replace(/\{dueDate\}/g, dueDate)
      .replace(/\{nextInstallmentDate\}/g, nextInstallmentDate)
      .replace(/\{loanId\}/g, vars.loan.loanNumber || vars.loan.id)
      .replace(/\{institutionName\}/g, vars.institutionName || 'MicroLoan Hub')
      .replace(/\{supportPhone\}/g, '+258 84 000 0000')
      .replace(/\{paymentMethods\}/g, 'M-Pesa, Cash, Banco')
      .replace(/\{promiseDate\}/g, vars.promiseDate || '')
      .replace(/\{agentName\}/g, vars.agentName || '');
  }

  // -- Deep link generation --
  generateWhatsAppLink(phone: string, message: string): string | null {
    const normalized = normalizePhone(phone);
    if (!normalized) return null;
    const num = normalized.replace('+', '');
    return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
  }

  generateSmsLink(phone: string, message: string): string | null {
    const normalized = normalizePhone(phone);
    if (!normalized) return null;
    return `sms:${normalized}?&body=${encodeURIComponent(message)}`;
  }

  // -- Send (open deep link + log) --
  send(
    channel: MessageChannel,
    client: Client,
    loan: Loan,
    messageText: string,
    type: MessageType,
    userId: string,
    userName: string
  ): { success: boolean; reason?: string } {
    // Check opt-out
    if ((client as any).allowMessages === false) {
      const log: MessageLog = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        type, channel, clientId: client.id, loanId: loan.id,
        createdAt: new Date().toISOString(), createdBy: userId,
        messageText, status: 'SKIPPED', reason: 'Cliente optou por não receber mensagens',
      };
      this.addLog(log);
      auditService.log(userId, userName, 'MESSAGE_BLOCKED_OPT_OUT', 'messageLog', log.id, `Cliente: ${client.fullName}`);
      return { success: false, reason: 'Cliente optou por não receber mensagens (opt-out).' };
    }

    // Check anti-spam
    if (!this.canSendToday(loan.id, type)) {
      const log: MessageLog = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        type, channel, clientId: client.id, loanId: loan.id,
        createdAt: new Date().toISOString(), createdBy: userId,
        messageText, status: 'SKIPPED', reason: 'Já foi enviada mensagem hoje para este empréstimo',
      };
      this.addLog(log);
      auditService.log(userId, userName, 'MESSAGE_BLOCKED_RATE_LIMIT', 'messageLog', log.id, `Loan: ${loan.loanNumber}`);
      return { success: false, reason: 'Já foi enviada uma mensagem deste tipo hoje para este empréstimo.' };
    }

    // Validate phone
    if (!isValidMozambiquePhone(client.phone)) {
      const log: MessageLog = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        type, channel, clientId: client.id, loanId: loan.id,
        createdAt: new Date().toISOString(), createdBy: userId,
        messageText, status: 'FAILED', reason: 'Número de telefone inválido',
      };
      this.addLog(log);
      return { success: false, reason: `Número de telefone inválido: ${client.phone}. Use formato +258 8X XXX XXXX.` };
    }

    // Generate link
    const link = channel === 'whatsapp'
      ? this.generateWhatsAppLink(client.phone, messageText)
      : this.generateSmsLink(client.phone, messageText);

    if (!link) {
      return { success: false, reason: 'Não foi possível gerar o link de envio.' };
    }

    // Open deep link
    window.open(link, '_blank');

    // Log success
    const log: MessageLog = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type, channel, clientId: client.id, loanId: loan.id,
      createdAt: new Date().toISOString(), createdBy: userId,
      messageText, status: 'SENT',
    };
    this.addLog(log);
    auditService.log(userId, userName, 'MESSAGE_SENT', 'messageLog', log.id,
      `${type} via ${channel.toUpperCase()} para ${client.fullName} (${loan.loanNumber})`);

    return { success: true };
  }

  // -- Reminders: upcoming installments within N days --
  getUpcomingReminders(daysAhead: number = 7): Array<{ loan: Loan; client: Client; dueDate: string; amount: number; daysUntil: number }> {
    const loans = storageService.getAll<Loan>('loans').filter(l => l.status === 'active' || l.status === 'disbursed');
    const clients = storageService.getAll<Client>('clients');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const results: Array<{ loan: Loan; client: Client; dueDate: string; amount: number; daysUntil: number }> = [];

    for (const loan of loans) {
      const nextInstallment = loan.schedule?.find(s => s.status === 'pending');
      if (!nextInstallment) continue;
      const due = new Date(nextInstallment.dueDate);
      due.setHours(0, 0, 0, 0);
      const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diff >= 0 && diff <= daysAhead) {
        const client = clients.find(c => c.id === loan.clientId);
        if (client) {
          results.push({ loan, client, dueDate: nextInstallment.dueDate, amount: nextInstallment.totalAmount, daysUntil: diff });
        }
      }
    }

    return results.sort((a, b) => a.daysUntil - b.daysUntil);
  }
}

export const messagingService = new MessagingService();
