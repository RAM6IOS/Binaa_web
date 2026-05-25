import { createClient as createBrowserClient } from '../supabase/client';
import { SupabaseClient } from '@supabase/supabase-js';
import { ProjectDocument } from '../types/documents';

const getSupabase = (customClient?: SupabaseClient) => {
  return customClient || createBrowserClient();
};

export const documentService = {
  async getProjectDocuments(projectId: string, customClient?: SupabaseClient): Promise<ProjectDocument[]> {
    const supabase = getSupabase(customClient);
    const { data, error } = await supabase
      .from('project_documents')
      .select('*')
      .eq('project_id', projectId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Error in getProjectDocuments:', error.message);
      throw error;
    }
    return data as ProjectDocument[];
  },

  async getDocumentById(documentId: string, customClient?: SupabaseClient): Promise<ProjectDocument> {
    const supabase = getSupabase(customClient);
    const { data, error } = await supabase
      .from('project_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (error) {
      console.error('Error in getDocumentById:', error.message);
      throw error;
    }
    return data as ProjectDocument;
  },

  async uploadDocument(
    projectId: string,
    file: File | { name: string; type: string; arrayBuffer: () => Promise<ArrayBuffer> },
    title: string,
    description?: string,
    category?: string,
    gpsCoordinates?: string,
    customClient?: SupabaseClient
  ): Promise<ProjectDocument> {
    const supabase = getSupabase(customClient);

    // Get current authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User must be authenticated to upload documents');
    }

    // 1. Generate unique file name and path
    const timestamp = Date.now();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${projectId}/${timestamp}-${cleanFileName}`;

    // 2. Upload file to Supabase Storage bucket 'project-documents'
    let buffer: ArrayBuffer;
    if (typeof file.arrayBuffer === 'function') {
      buffer = await file.arrayBuffer();
    } else {
      throw new Error('Invalid file object format');
    }

    const { data: storageData, error: storageError } = await supabase.storage
      .from('project-documents')
      .upload(storagePath, buffer, {
        contentType: file.type,
        duplex: 'half'
      });

    if (storageError) {
      console.error('Storage upload error:', storageError.message);
      throw storageError;
    }

    // 3. Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from('project-documents')
      .getPublicUrl(storagePath);

    // 4. Save metadata in 'project_documents' table
    const { data: dbData, error: dbError } = await supabase
      .from('project_documents')
      .insert([
        {
          project_id: projectId,
          file_name: title || file.name,
          file_url: publicUrl,
          file_type: category || file.type.split('/')[0] || 'document',
          notes: description || '',
          gps_coordinates: gpsCoordinates || null,
          uploaded_by: user.id,
          uploaded_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (dbError) {
      console.error('Database insertion error:', dbError.message);
      // Attempt to clean up uploaded storage file if database save fails
      await supabase.storage.from('project-documents').remove([storagePath]);
      throw dbError;
    }

    return dbData as ProjectDocument;
  },

  async deleteDocument(documentId: string, customClient?: SupabaseClient): Promise<boolean> {
    const supabase = getSupabase(customClient);

    // 1. Get document details to retrieve its storage URL
    const document = await this.getDocumentById(documentId, supabase);

    if (document) {
      // 2. Extract path from the publicUrl or construct it
      // Standard publicUrl: https://.../storage/v1/object/public/project-documents/projectId/timestamp-filename
      const urlParts = document.file_url.split('/project-documents/');
      if (urlParts.length > 1) {
        const storagePath = decodeURIComponent(urlParts[1]);
        // Remove from storage bucket
        const { error: storageRemoveError } = await supabase.storage
          .from('project-documents')
          .remove([storagePath]);
        
        if (storageRemoveError) {
          console.warn('Warning: Failed to delete file from storage:', storageRemoveError.message);
        }
      }
    }

    // 3. Delete DB record
    const { error: dbDeleteError } = await supabase
      .from('project_documents')
      .delete()
      .eq('id', documentId);

    if (dbDeleteError) {
      console.error('Database deletion error:', dbDeleteError.message);
      throw dbDeleteError;
    }

    return true;
  }
};
