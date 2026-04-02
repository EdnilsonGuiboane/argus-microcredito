import { supabase } from '@/lib/supabase';

export type ApplicationDocumentReviewStatus = 'pending' | 'valid' | 'invalid';

export interface ApplicationDocument {
  id: string;
  tenantId: string;
  applicationId: string;
  clientId: string;
  documentType: string;
  originalName: string;
  filePath: string;
  mimeType?: string;
  fileSize?: number;
  uploadedAt: string;
  uploadedBy?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewStatus: ApplicationDocumentReviewStatus;
  reviewNotes?: string;
  isViewed: boolean;
  createdAt: string;
  updatedAt: string;
}

type ApplicationDocumentRow = {
  id: string;
  tenant_id: string;
  application_id: string;
  client_id: string;
  document_type: string;
  original_name: string;
  file_path: string;
  mime_type: string | null;
  file_size: number | null;
  uploaded_at: string;
  uploaded_by: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_status: ApplicationDocumentReviewStatus | null;
  review_notes: string | null;
  is_viewed: boolean;
  created_at: string;
  updated_at: string;
};

function mapDocumentFromDb(row: ApplicationDocumentRow): ApplicationDocument {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    applicationId: row.application_id,
    clientId: row.client_id,
    documentType: row.document_type,
    originalName: row.original_name,
    filePath: row.file_path,
    mimeType: row.mime_type ?? undefined,
    fileSize: row.file_size ?? undefined,
    uploadedAt: row.uploaded_at,
    uploadedBy: row.uploaded_by ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    reviewedBy: row.reviewed_by ?? undefined,
    reviewStatus: row.review_status ?? 'pending',
    reviewNotes: row.review_notes ?? undefined,
    isViewed: row.is_viewed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ApplicationDocumentService {
  private readonly bucket = 'application-documents';

  async listByApplication(applicationId: string): Promise<ApplicationDocument[]> {
    const { data, error } = await supabase
      .from('application_documents')
      .select('*')
      .eq('application_id', applicationId)
      .order('uploaded_at', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return ((data as ApplicationDocumentRow[] | null) ?? []).map(mapDocumentFromDb);
  }

  async upload(params: {
    tenantId: string;
    applicationId: string;
    clientId: string;
    documentType: string;
    file: File;
    uploadedBy?: string;
  }): Promise<ApplicationDocument> {
    const ext = params.file.name.includes('.')
      ? params.file.name.split('.').pop()
      : 'bin';

    const safeExt = ext || 'bin';

    const filePath = [
      params.tenantId,
      params.applicationId,
      `${Date.now()}-${crypto.randomUUID()}.${safeExt}`,
    ].join('/');

    const { error: uploadError } = await supabase.storage
      .from(this.bucket)
      .upload(filePath, params.file, {
        cacheControl: '3600',
        upsert: false,
        contentType: params.file.type || undefined,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data, error } = await supabase
      .from('application_documents')
      .insert({
        tenant_id: params.tenantId,
        application_id: params.applicationId,
        client_id: params.clientId,
        document_type: params.documentType,
        original_name: params.file.name,
        file_path: filePath,
        mime_type: params.file.type || null,
        file_size: params.file.size,
        uploaded_by: params.uploadedBy || null,
        review_status: 'pending',
        is_viewed: false,
      })
      .select('*')
      .single();

    if (error) {
      await supabase.storage.from(this.bucket).remove([filePath]);
      throw new Error(error.message);
    }

    return mapDocumentFromDb(data as ApplicationDocumentRow);
  }

  async getSignedUrl(filePath: string, expiresIn = 3600): Promise<string> {
    const { data, error } = await supabase.storage
      .from(this.bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      throw new Error(error.message);
    }

    return data.signedUrl;
  }

  async markViewed(documentId: string): Promise<void> {
    const { error } = await supabase
      .from('application_documents')
      .update({
        is_viewed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId);

    if (error) {
      throw new Error(error.message);
    }
  }

  async reviewDocument(params: {
    documentId: string;
    reviewedBy?: string;
    reviewStatus: ApplicationDocumentReviewStatus;
    reviewNotes?: string;
  }): Promise<void> {
    const { error } = await supabase
      .from('application_documents')
      .update({
        reviewed_at: new Date().toISOString(),
        reviewed_by: params.reviewedBy || null,
        review_status: params.reviewStatus,
        review_notes: params.reviewNotes || null,
        is_viewed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.documentId);

    if (error) {
      throw new Error(error.message);
    }
  }

  async deleteDocument(document: ApplicationDocument): Promise<void> {
    const { error: storageError } = await supabase.storage
      .from(this.bucket)
      .remove([document.filePath]);

    if (storageError) {
      throw new Error(storageError.message);
    }

    const { error } = await supabase
      .from('application_documents')
      .delete()
      .eq('id', document.id);

    if (error) {
      throw new Error(error.message);
    }
  }
}

export const applicationDocumentService = new ApplicationDocumentService();