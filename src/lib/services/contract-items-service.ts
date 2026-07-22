import { createClient } from '../supabase/client';
import { ContractItem, CreateContractItemDto, UpdateContractItemDto } from '../types/metres';

const supabase = createClient();

export const contractItemsService = {
  async getByProjectId(projectId: string): Promise<ContractItem[]> {
    const { data, error } = await supabase
      .from('contract_items')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })
      .order('item_number', { ascending: true });

    if (error) {
      console.error('[ContractItems] Fetch error:', error.message);
      throw error;
    }

    return (data || []) as ContractItem[];
  },

  async getById(id: string): Promise<ContractItem | null> {
    const { data, error } = await supabase
      .from('contract_items')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data as ContractItem;
  },

  async create(dto: CreateContractItemDto): Promise<ContractItem> {
    const { data, error } = await supabase
      .from('contract_items')
      .insert(dto)
      .select()
      .single();

    if (error) {
      console.error('[ContractItems] Create error:', error.message);
      throw error;
    }

    return data as ContractItem;
  },

  async createMany(dtos: CreateContractItemDto[]): Promise<ContractItem[]> {
    const { data, error } = await supabase
      .from('contract_items')
      .insert(dtos)
      .select();

    if (error) {
      console.error('[ContractItems] CreateMany error:', error.message);
      throw error;
    }

    return (data || []) as ContractItem[];
  },

  async update(id: string, dto: UpdateContractItemDto): Promise<ContractItem> {
    const { data, error } = await supabase
      .from('contract_items')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[ContractItems] Update error:', error.message);
      throw error;
    }

    return data as ContractItem;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('contract_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[ContractItems] Delete error:', error.message);
      throw error;
    }
  },

  subscribe(projectId: string, callback: () => void) {
    const channel = supabase
      .channel(`contract-items-${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contract_items', filter: `project_id=eq.${projectId}` },
        () => callback()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  },
};
