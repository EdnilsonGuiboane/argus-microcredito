// src/services/clients/clientService.ts
import { supabase } from '@/lib/supabase';
import { mapClientFromDb } from '@/lib/mappers/clientMapper';
import { Client } from '@/models/types';
import {
  normalizeBi,
  normalizeNuit,
  normalizePhone,
  validateBi,
  validateNuit,
  validateMzPhone,
} from '@/lib/validators/identityValidators';

type ClientInsertPayload = {
  tenant_id: string;
  full_name: string;
  date_of_birth: string | null;
  gender: 'M' | 'F' | 'Outro';
  phone: string;
  email: string | null;
  address: string;
  province: string;
  district: string;
  bi_number: string;
  nuit: string | null;
  employer: string | null;
  occupation: string;
  monthly_income: number;
  monthly_expenses: number;

  reference1_name: string;
  reference1_phone: string;
  reference1_relationship: string;

  reference2_name: string;
  reference2_phone: string;
  reference2_relationship: string;

  notes: string | null;
  status: Client['status'];
  created_at?: string;
  updated_at?: string;
  created_by?: string;
};

type ClientUpdatePayload = {
  full_name?: string;
  date_of_birth?: string | null;
  gender?: 'M' | 'F' | 'Outro';
  phone?: string;
  email?: string | null;
  address?: string;
  province?: string;
  district?: string;
  bi_number?: string;
  nuit?: string | null;
  employer?: string | null;
  occupation?: string;
  monthly_income?: number;
  monthly_expenses?: number;

  reference1_name?: string;
  reference1_phone?: string;
  reference1_relationship?: string;

  reference2_name?: string;
  reference2_phone?: string;
  reference2_relationship?: string;

  notes?: string | null;
  status?: Client['status'];
  updated_at?: string;
};

function validateClientIdentity(payload: {
  bi_number?: string;
  nuit?: string | null;
  phone?: string;
  reference1_phone?: string;
  reference2_phone?: string;
}) {
  if (payload.bi_number !== undefined) {
    const biValidation = validateBi(payload.bi_number);
    if (!biValidation.valid) {
      throw new Error(biValidation.message || 'Número do BI inválido.');
    }
  }

  if (payload.nuit !== undefined) {
    const nuitValidation = validateNuit(payload.nuit);
    if (!nuitValidation.valid) {
      throw new Error(nuitValidation.message || 'NUIT inválido.');
    }
  }

  if (payload.phone !== undefined) {
    const phoneValidation = validateMzPhone(payload.phone);
    if (!phoneValidation.valid) {
      throw new Error(phoneValidation.message || 'Telefone inválido.');
    }
  }

  if (payload.reference1_phone !== undefined) {
    const ref1PhoneValidation = validateMzPhone(payload.reference1_phone);
    if (!ref1PhoneValidation.valid) {
      throw new Error('Telefone da referência 1 inválido.');
    }
  }

  if (payload.reference2_phone !== undefined) {
    const ref2PhoneValidation = validateMzPhone(payload.reference2_phone);
    if (!ref2PhoneValidation.valid) {
      throw new Error('Telefone da referência 2 inválido.');
    }
  }
}

export class ClientService {
  async list(): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map(mapClientFromDb);
  }

  async getById(id: string): Promise<Client | null> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data ? mapClientFromDb(data) : null;
  }

  async create(payload: ClientInsertPayload): Promise<Client> {
    const normalizedPayload: ClientInsertPayload = {
      ...payload,
      phone: normalizePhone(payload.phone),
      bi_number: normalizeBi(payload.bi_number),
      nuit: payload.nuit ? normalizeNuit(payload.nuit) : null,
      reference1_phone: normalizePhone(payload.reference1_phone),
      reference2_phone: normalizePhone(payload.reference2_phone),
    };

    validateClientIdentity({
      bi_number: normalizedPayload.bi_number,
      nuit: normalizedPayload.nuit,
      phone: normalizedPayload.phone,
      reference1_phone: normalizedPayload.reference1_phone,
      reference2_phone: normalizedPayload.reference2_phone,
    });

    // Check duplicate BI
    const { data: existingBi, error: biCheckError } = await supabase
      .from('clients')
      .select('id, full_name')
      .eq('tenant_id', normalizedPayload.tenant_id)
      .eq('bi_number', normalizedPayload.bi_number)
      .maybeSingle();

    if (biCheckError) {
      throw new Error(biCheckError.message);
    }

    if (existingBi) {
      throw new Error(`BI já registado para: ${existingBi.full_name}`);
    }

    // Check duplicate NUIT
    if (normalizedPayload.nuit) {
      const { data: existingNuit, error: nuitCheckError } = await supabase
        .from('clients')
        .select('id, full_name')
        .eq('tenant_id', normalizedPayload.tenant_id)
        .eq('nuit', normalizedPayload.nuit)
        .maybeSingle();

      if (nuitCheckError) {
        throw new Error(nuitCheckError.message);
      }

      if (existingNuit) {
        throw new Error(`NUIT já registado para: ${existingNuit.full_name}`);
      }
    }

    const { data, error } = await supabase
      .from('clients')
      .insert(normalizedPayload)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapClientFromDb(data);
  }

  async update(id: string, payload: ClientUpdatePayload): Promise<Client> {
    const current = await this.getById(id);

    if (!current) {
      throw new Error('Cliente não encontrado.');
    }

    const normalizedPayload: ClientUpdatePayload = {
      ...payload,
      phone: payload.phone !== undefined ? normalizePhone(payload.phone) : undefined,
      bi_number:
        payload.bi_number !== undefined ? normalizeBi(payload.bi_number) : undefined,
      nuit:
        payload.nuit !== undefined
          ? payload.nuit
            ? normalizeNuit(payload.nuit)
            : null
          : undefined,
      reference1_phone:
        payload.reference1_phone !== undefined
          ? normalizePhone(payload.reference1_phone)
          : undefined,
      reference2_phone:
        payload.reference2_phone !== undefined
          ? normalizePhone(payload.reference2_phone)
          : undefined,
    };

    validateClientIdentity({
      bi_number: normalizedPayload.bi_number,
      nuit: normalizedPayload.nuit,
      phone: normalizedPayload.phone,
      reference1_phone: normalizedPayload.reference1_phone,
      reference2_phone: normalizedPayload.reference2_phone,
    });

    // Check duplicate BI
    if (normalizedPayload.bi_number) {
      const { data: existingBi, error: biCheckError } = await supabase
        .from('clients')
        .select('id, full_name')
        .eq('tenant_id', current.tenantId)
        .eq('bi_number', normalizedPayload.bi_number)
        .neq('id', id)
        .maybeSingle();

      if (biCheckError) {
        throw new Error(biCheckError.message);
      }

      if (existingBi) {
        throw new Error(`BI já registado para: ${existingBi.full_name}`);
      }
    }

    // Check duplicate NUIT
    if (normalizedPayload.nuit) {
      const { data: existingNuit, error: nuitCheckError } = await supabase
        .from('clients')
        .select('id, full_name')
        .eq('tenant_id', current.tenantId)
        .eq('nuit', normalizedPayload.nuit)
        .neq('id', id)
        .maybeSingle();

      if (nuitCheckError) {
        throw new Error(nuitCheckError.message);
      }

      if (existingNuit) {
        throw new Error(`NUIT já registado para: ${existingNuit.full_name}`);
      }
    }

    const { data, error } = await supabase
      .from('clients')
      .update(normalizedPayload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapClientFromDb(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('clients').delete().eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  }
}

export const clientService = new ClientService();