export type ProposalChangeType = 'manual' | 'copy' | 'reset' | null;

export interface MonthlyData {
  anterior: number;
  proposta: number;
  orcamento: number;
  changeType?: ProposalChangeType;
  percentAnterior?: number;
  percentProposta?: number;
  percentOrcamento?: number;
}

export interface BudgetRow {
  id: string;
  dfc: string;
  conta: string;
  subconta: string;
  businessGroup?: string;
  businessUnit?: string;
  level: 'dfc' | 'conta' | 'subconta';
  editable: boolean;
  isExpanded?: boolean;
  children?: BudgetRow[];
  monthlyData: {
    [month: number]: MonthlyData;
  };
}

export interface BudgetData {
  rows: BudgetRow[];
}
