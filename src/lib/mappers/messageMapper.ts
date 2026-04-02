// src/lib/mappers/messageMapper.ts
export type MessageLog = {
  id: string;
  tenantId: string;
  clientId: string;
  loanId?: string;
  channel: 'sms' | 'whatsapp' | 'email';
  type: 'LATE' | 'REMINDER' | 'CUSTOM';
  status: 'SENT' | 'FAILED' | 'SKIPPED';
  recipient: string;
  messageText: string;
  reason?: string;
  sentBy?: string;
  sentAt?: string;
  createdAt: string;
};

type MessageLogRow = {
  id: string;
  tenant_id: string;
  client_id: string;
  loan_id: string | null;
  channel: MessageLog['channel'];
  type: MessageLog['type'];
  status: MessageLog['status'];
  recipient: string;
  message_text: string;
  reason: string | null;
  sent_by: string | null;
  sent_at: string | null;
  created_at: string;
};

export function mapMessageLogFromDb(row: MessageLogRow): MessageLog {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    clientId: row.client_id,
    loanId: row.loan_id ?? undefined,
    channel: row.channel,
    type: row.type,
    status: row.status,
    recipient: row.recipient,
    messageText: row.message_text,
    reason: row.reason ?? undefined,
    sentBy: row.sent_by ?? undefined,
    sentAt: row.sent_at ?? undefined,
    createdAt: row.created_at,
  };
}