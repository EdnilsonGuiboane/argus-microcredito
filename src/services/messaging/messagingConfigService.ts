import { supabase } from '@/lib/supabase';

export type MessagingChannel = 'whatsapp' | 'sms';

export interface MessagingSettingsDb {
  id: string;
  tenantId: string;
  defaultChannel: MessagingChannel;
  allowedHoursStart: string;
  allowedHoursEnd: string;
  reminderDaysBefore: number[];
  lateDaysAfter: number[];
  createdAt: string;
  updatedAt: string;
}

export interface MessageTemplateDb {
  id: string;
  tenantId: string;
  name: string;
  type: string;
  body: string;
  isDefault: boolean;
  isActive: boolean;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

type MessagingSettingsRow = {
  id: string;
  tenant_id: string;
  default_channel: MessagingChannel;
  allowed_hours_start: string;
  allowed_hours_end: string;
  reminder_days_before: number[] | string;
  late_days_after: number[] | string;
  created_at: string;
  updated_at: string;
};

type MessageTemplateRow = {
  id: string;
  tenant_id: string;
  name: string;
  type: string;
  body: string;
  is_default: boolean;
  is_active: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

function parseNumberArray(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map(Number).filter((n) => !isNaN(n));
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map(Number).filter((n) => !isNaN(n));
      }
    } catch {
      return [];
    }
  }

  return [];
}

function mapSettingsFromDb(row: MessagingSettingsRow): MessagingSettingsDb {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    defaultChannel: row.default_channel,
    allowedHoursStart: row.allowed_hours_start,
    allowedHoursEnd: row.allowed_hours_end,
    reminderDaysBefore: parseNumberArray(row.reminder_days_before),
    lateDaysAfter: parseNumberArray(row.late_days_after),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTemplateFromDb(row: MessageTemplateRow): MessageTemplateDb {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    type: row.type,
    body: row.body,
    isDefault: row.is_default,
    isActive: row.is_active,
    updatedBy: row.updated_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class MessagingConfigService {
  async getSettings(tenantId: string): Promise<MessagingSettingsDb | null> {
    const { data, error } = await supabase
      .from('messaging_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data ? mapSettingsFromDb(data as MessagingSettingsRow) : null;
  }

  async saveSettings(payload: {
    tenantId: string;
    defaultChannel: MessagingChannel;
    allowedHoursStart: string;
    allowedHoursEnd: string;
    reminderDaysBefore: number[];
    lateDaysAfter: number[];
  }): Promise<MessagingSettingsDb> {
    const existing = await this.getSettings(payload.tenantId);

    if (existing) {
      const { data, error } = await supabase
        .from('messaging_settings')
        .update({
          default_channel: payload.defaultChannel,
          allowed_hours_start: payload.allowedHoursStart,
          allowed_hours_end: payload.allowedHoursEnd,
          reminder_days_before: payload.reminderDaysBefore,
          late_days_after: payload.lateDaysAfter,
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', payload.tenantId)
        .select('*')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return mapSettingsFromDb(data as MessagingSettingsRow);
    }

    const { data, error } = await supabase
      .from('messaging_settings')
      .insert({
        tenant_id: payload.tenantId,
        default_channel: payload.defaultChannel,
        allowed_hours_start: payload.allowedHoursStart,
        allowed_hours_end: payload.allowedHoursEnd,
        reminder_days_before: payload.reminderDaysBefore,
        late_days_after: payload.lateDaysAfter,
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapSettingsFromDb(data as MessagingSettingsRow);
  }

  async listTemplates(tenantId: string): Promise<MessageTemplateDb[]> {
    const { data, error } = await supabase
      .from('message_templates')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return ((data as MessageTemplateRow[] | null) ?? []).map(mapTemplateFromDb);
  }

  async updateTemplate(
    id: string,
    payload: {
      body?: string;
      isActive?: boolean;
      updatedBy?: string;
    }
  ): Promise<MessageTemplateDb> {
    const { data, error } = await supabase
      .from('message_templates')
      .update({
        ...(payload.body !== undefined ? { body: payload.body } : {}),
        ...(payload.isActive !== undefined ? { is_active: payload.isActive } : {}),
        updated_by: payload.updatedBy ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapTemplateFromDb(data as MessageTemplateRow);
  }
}

export const messagingConfigService = new MessagingConfigService();