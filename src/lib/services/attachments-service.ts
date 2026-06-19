import { createClient } from '../supabase/client';



export interface Attachment {
    id: string;
    file_name: string;
    file_url: string;
    file_type: string;
    file_size: number;
    uploaded_by: string;
    uploaded_at: string;
    entity_type: 'daily_log' | 'pointage' | 'task' | 'project';
    entity_id: string;
    notes?: string;
}

export const attachmentsService = {

    async uploadAttachment(
        file: File,
        entityType: 'daily_log' | 'pointage' | 'task' | 'project',
        entityId: string,
        notes?: string
    ): Promise<Attachment> {
        const supabase = createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('يجب تسجيل الدخول أولاً');

        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const path = `${entityType}/${entityId}/${fileName}`;

        // رفع الملف
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('project-attachments')
            .upload(path, file, { cacheControl: '3600', upsert: false });

        if (uploadError) throw uploadError;

        // الحصول على الرابط
        const { data: urlData } = supabase.storage
            .from('project-attachments')
            .getPublicUrl(path);

        // حفظ في قاعدة البيانات
        const { data, error } = await supabase
            .from('attachments')
            .insert({
                file_name: file.name,
                file_url: urlData.publicUrl,
                file_type: file.type,
                file_size: file.size,
                entity_type: entityType,
                entity_id: entityId,
                notes,
                uploaded_by: user.id,
            })
            .select()
            .single();

        if (error) throw error;

        return data as Attachment;
    },

    async getAttachmentsByEntity(
        entityType: 'daily_log' | 'pointage' | 'task' | 'project',
        entityId: string
    ): Promise<Attachment[]> {
        const supabase = createClient();

        const { data, error } = await supabase
            .from('attachments')
            .select('*')
            .eq('entity_type', entityType)
            .eq('entity_id', entityId)
            .order('uploaded_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async deleteAttachment(attachmentId: string): Promise<boolean> {
        const supabase = createClient();

        const { data: attachment } = await supabase
            .from('attachments')
            .select('file_url')
            .eq('id', attachmentId)
            .single();

        if (attachment?.file_url) {
            const path = attachment.file_url.split('/').slice(-3).join('/');
            await supabase.storage.from('project-attachments').remove([path]);
        }

        const { error } = await supabase
            .from('attachments')
            .delete()
            .eq('id', attachmentId);

        if (error) throw error;
        return true;
    }
};