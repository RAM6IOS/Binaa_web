export interface ProjectDocument {
  id: string;
  project_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  document_type?: string;
  document_date?: string;
  document_category?: string;
  uploaded_by?: string;
  uploaded_at: string;
  notes?: string;
  gps_coordinates?: string;
}

export interface UploadDocumentInput {
  projectId: string;
  file: File;
  title: string;
  description?: string;
  category?: string;
}
