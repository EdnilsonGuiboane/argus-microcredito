// src/services/messages/messageService.ts
import { mapMessageLogFromDb, MessageLog } from '@/lib/mappers/messageMapper';
import { supabase } from '@/lib/supabase';


export class MessageService {
  async list(): Promise<MessageLog[]> {
    const { data, error } = await supabase
      .from('message_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map(mapMessageLogFromDb);
  }

  async listByLoanId(loanId: string): Promise<MessageLog[]> {
    const { data, error } = await supabase
      .from('message_logs')
      .select('*')
      .eq('loan_id', loanId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map(mapMessageLogFromDb);
  }

  async wasSentToday(loanId: string): Promise<boolean> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('message_logs')
      .select('id')
      .eq('loan_id', loanId)
      .gte('created_at', start.toISOString())
      .limit(1);

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).length > 0;
  }

  async createLog(input: {
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
  }): Promise<MessageLog> {
    const payload = {
      tenant_id: input.tenantId,
      client_id: input.clientId,
      loan_id: input.loanId ?? null,
      channel: input.channel,
      type: input.type,
      status: input.status,
      recipient: input.recipient,
      message_text: input.messageText,
      reason: input.reason ?? null,
      sent_by: input.sentBy ?? null,
      sent_at: input.status === 'SENT' ? new Date().toISOString() : null,
    };

    const { data, error } = await supabase
      .from('message_logs')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapMessageLogFromDb(data);
  }
}

export const messageService = new MessageService();