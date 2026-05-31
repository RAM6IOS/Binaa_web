export type FinancialCategory = 'labor' | 'equipment' | 'materials' | 'other';

export interface ProjectBudget {
  id: string;
  project_id: string;
  category: FinancialCategory;
  planned_amount: number;
  actual_amount: number;
  created_at?: string;
  updated_at?: string;
}

export interface DailyCost {
  id: string;
  project_id: string;
  date: string;
  labor_cost: number;
  equipment_cost: number;
  materials_cost: number;
  other_cost: number;
  total_cost: number;
  notes?: string;
  created_at?: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';
export type InvoiceType = 'advance' | 'interim' | 'final';

export interface Invoice {
  id: string;
  project_id: string;
  invoice_number: string;
  percentage_complete: number;
  type: InvoiceType;
  amount: number;
  vat_amount: number;
  total_amount: number;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  created_at?: string;
  updated_at?: string;
  invoice_items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  created_at?: string;
}

export interface BudgetOverview {
  totalBudget: number;
  totalActualCost: number;
  categories: {
    category: FinancialCategory;
    planned: number;
    actual: number;
  }[];
  dailyCostHistory: {
    date: string;
    labor: number;
    equipment: number;
    materials: number;
    other: number;
    total: number;
  }[];
  cumulativePlanned: {
    date: string;
    amount: number;
  }[];
  cumulativeActual: {
    date: string;
    amount: number;
  }[];
}
