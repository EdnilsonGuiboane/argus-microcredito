// src/services/collections/collectionService.ts
import { supabase } from '@/lib/supabase';
import {
  mapCollectionInteractionFromDb,
  mapCollectionTaskFromDb,
} from '@/lib/mappers/collectionMapper';
import {
  CollectionInteraction,
  CollectionTask,
} from '@/models/types';

export class CollectionService {
  async listInteractions(): Promise<CollectionInteraction[]> {
    const { data, error } = await supabase
      .from('collection_interactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map(mapCollectionInteractionFromDb);
  }

  async listInteractionsByLoanId(
    loanId: string
  ): Promise<CollectionInteraction[]> {
    const { data, error } = await supabase
      .from('collection_interactions')
      .select('*')
      .eq('loan_id', loanId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map(mapCollectionInteractionFromDb);
  }

  async createInteraction(
    interaction: Omit<CollectionInteraction, 'id' | 'createdAt'>
  ): Promise<CollectionInteraction> {
    const payload = {
      tenant_id: interaction.tenantId,
      loan_id: interaction.loanId,
      client_id: interaction.clientId,
      type: interaction.type,
      outcome: interaction.outcome,
      notes: interaction.notes,
      next_action: interaction.nextAction ?? null,
      next_action_date: interaction.nextActionDate ?? null,
      created_by: interaction.createdBy,
    };

    const { data, error } = await supabase
      .from('collection_interactions')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapCollectionInteractionFromDb(data);
  }

  async listTasks(): Promise<CollectionTask[]> {
    const { data, error } = await supabase
      .from('collection_tasks')
      .select('*')
      .order('scheduled_for', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map(mapCollectionTaskFromDb);
  }

  async listUpcomingTasks(daysAhead = 7): Promise<CollectionTask[]> {
    const now = new Date();
    const end = new Date();
    end.setDate(end.getDate() + daysAhead);

    const { data, error } = await supabase
      .from('collection_tasks')
      .select('*')
      .gte('scheduled_for', now.toISOString())
      .lte('scheduled_for', end.toISOString())
      .eq('status', 'pending')
      .order('scheduled_for', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map(mapCollectionTaskFromDb);
  }

  async createTask(
    task: Omit<CollectionTask, 'id' | 'createdAt'>
  ): Promise<CollectionTask> {
    const payload = {
      tenant_id: task.tenantId,
      loan_id: task.loanId,
      client_id: task.clientId,
      type: task.type,
      status: task.status,
      scheduled_for: task.scheduledFor,
      completed_at: task.completedAt ?? null,
      completed_by: task.completedBy ?? null,
      notes: task.notes ?? null,
      promise_date: task.promiseDate ?? null,
      promise_amount: task.promiseAmount ?? null,
    };

    const { data, error } = await supabase
      .from('collection_tasks')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapCollectionTaskFromDb(data);
  }
}

export const collectionService = new CollectionService();