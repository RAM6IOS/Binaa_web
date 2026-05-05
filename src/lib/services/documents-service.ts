import { createClient } from '../supabase/client';
import { ProjectDocument } from '../types/projects';

const supabase = createClient();

export const documentsService = {
  async getByProjectId(projectId: string) {
    const { data, error } = await supabase
      .from('project_documents')
      .select('*')
      .eq('project_id', projectId)
      .order('uploaded_at', { ascending: false });
    
    if (error) throw error;
    return data as ProjectDocument[];
  },

  async create(document: Omit<ProjectDocument, 'id'>) {
    const { data, error } = await supabase
      .from('project_documents')
      .insert([document])
      .select()
      .single();
    
    if (error) throw error;
    return data as ProjectDocument;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('project_documents')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  async uploadFile(path: string, file: File) {
    const { data, error } = await supabase.storage
      .from('project-documents')
      .upload(path, file);
    
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from('project-documents')
      .getPublicUrl(path);
    
    return publicUrl;
  }
};
