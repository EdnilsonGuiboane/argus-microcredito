// src/lib/mappers/collectionMapper.ts
import {
  CollectionInteraction,
  CollectionTask,
} from '@/models/types';

type CollectionInteractionRow = {
  id: string;
  tenant_id: string;
  loan_id: string;
  client_id: string;
  type: CollectionInteraction['type'];
  outcome: CollectionInteraction['outcome'];
  notes: string;
  next_action: string | null;
  next_action_date: string | null;
  created_by: string;
  created_at: string;
};

type CollectionTaskRow = {
  id: string;
  tenant_id: string;
  loan_id: string;
  client_id: string;
  type: CollectionTask['type'];
  status: CollectionTask['status'];
  scheduled_for: string;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  promise_date: string | null;
  promise_amount: number | string | null;
  created_at: string;
};

export function mapCollectionInteractionFromDb(
  row: CollectionInteractionRow
): CollectionInteraction {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    loanId: row.loan_id,
    clientId: row.client_id,
    type: row.type,
    outcome: row.outcome,
    notes: row.notes,
    nextAction: row.next_action ?? undefined,
    nextActionDate: row.next_action_date ?? undefined,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export function mapCollectionTaskFromDb(
  row: CollectionTaskRow
): CollectionTask {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    loanId: row.loan_id,
    clientId: row.client_id,
    type: row.type,
    status: row.status,
    scheduledFor: row.scheduled_for,
    completedAt: row.completed_at ?? undefined,
    completedBy: row.completed_by ?? undefined,
    notes: row.notes ?? undefined,
    promiseDate: row.promise_date ?? undefined,
    promiseAmount:
      row.promise_amount != null ? Number(row.promise_amount) : undefined,
    createdAt: row.created_at,
  };
}