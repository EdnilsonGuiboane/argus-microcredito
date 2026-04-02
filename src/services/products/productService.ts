import { supabase } from '@/lib/supabase';
import { mapProductFromDb } from '@/lib/mappers/productMapper';
import { LoanProduct } from '@/models/types';

type ProductInsertPayload = {
  tenant_id: string;
  name: string;
  description?: string | null;
  min_amount: number;
  max_amount: number;
  min_term_months: number;
  max_term_months: number;
  default_interest_rate: number;
  admin_fee_rate: number;
  late_penalty_rate: number;
  grace_period_days: number;
  is_active: boolean;
};

type ProductUpdatePayload = Partial<ProductInsertPayload> & {
  updated_at?: string;
};

export class ProductService {
  async list(): Promise<LoanProduct[]> {
    const { data, error } = await supabase
      .from('loan_products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map(mapProductFromDb);
  }

  async getById(id: string): Promise<LoanProduct | null> {
    const { data, error } = await supabase
      .from('loan_products')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data ? mapProductFromDb(data) : null;
  }

  async create(payload: ProductInsertPayload): Promise<LoanProduct> {
    const { data, error } = await supabase
      .from('loan_products')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapProductFromDb(data);
  }

  async update(id: string, payload: ProductUpdatePayload): Promise<LoanProduct> {
    const { data, error } = await supabase
      .from('loan_products')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapProductFromDb(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('loan_products')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  }
}

export const productService = new ProductService();
