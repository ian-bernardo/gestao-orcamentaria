export interface MonthlyData {
  anterior: number;
  proposta: number;
  orcamento: number;
  percentAnterior?: number;
  percentProposta?: number;
  percentOrcamento?: number;
}

export interface BudgetRow {
  id: string;
  dfc: string;
  conta: string;
  subconta: string;
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
