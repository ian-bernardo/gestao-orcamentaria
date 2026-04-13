import { BudgetRow } from '../types/budget';

const monthNames = [
  'Janeiro',
  'Fevereiro',
  'Marco',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const;

export interface BudgetFiltersState {
  businessGroupId?: number;
  businessUnitIds: number[];
  businessGroup: string;
  businessUnits: string[];
  startMonth: number;
  endMonth: number;
}

export interface ChangeMonthItem {
  month: number;
  monthLabel: (typeof monthNames)[number];
  previousValue: number;
  nextValue: number;
}

export interface ChangeItem {
  rowId: string;
  dfc: string;
  conta: string;
  subconta: string;
  businessGroupId?: number;
  businessUnitId?: number;
  businessGroup?: string;
  businessUnit?: string;
  months: ChangeMonthItem[];
}

export interface PendingItem {
  rowId: string;
  dfc: string;
  conta: string;
  subconta: string;
  businessGroupId?: number;
  businessUnitId?: number;
  businessGroup?: string;
  businessUnit?: string;
  months: string[];
}

function isMonthInRange(month: number, filters: BudgetFiltersState) {
  return month >= filters.startMonth && month <= filters.endMonth;
}

function rowMatchesFilters(row: BudgetRow, filters: BudgetFiltersState) {
  const matchesGroup =
    filters.businessGroupId == null || row.businessGroupId === filters.businessGroupId;
  const matchesUnit =
    filters.businessUnitIds.length === 0 ||
    (row.businessUnitId != null && filters.businessUnitIds.includes(row.businessUnitId));

  return matchesGroup && matchesUnit;
}

function isActionableRow(row: BudgetRow, classificacao?: 'A' | 'S') {
  if (classificacao === 'S') {
    return row.editable && row.level === 'dfc';
  }
  return row.editable && (row.level === 'conta' || row.level === 'subconta');
}

export function getFilteredData(
  rows: BudgetRow[],
  _filters: BudgetFiltersState,
): BudgetRow[] {
  const visit = (row: BudgetRow): BudgetRow => {
    return {
      ...row,
      monthlyData: { ...row.monthlyData },
      children: row.children?.map(visit),
    };
  };

  return rows.map(visit);
}

export function getChanges(
  originalRows: BudgetRow[],
  currentRows: BudgetRow[],
  userType: 'gestor' | 'financeiro',
  classificacao?: 'A' | 'S',
): ChangeItem[] {
  const originalById = new Map<string, BudgetRow>();

  const indexRows = (rows: BudgetRow[]) => {
    rows.forEach((row) => {
      originalById.set(row.id, row);
      row.children?.forEach((child) => indexRows([child]));
    });
  };

  indexRows(originalRows);

  const changes: ChangeItem[] = [];

  const visit = (row: BudgetRow) => {
    const originalRow = originalById.get(row.id);

    if (originalRow) {
      const months = Object.entries(row.monthlyData)
        .map(([monthKey, monthData]) => {
          const month = Number(monthKey);

          if (userType === 'gestor') {
            const previousValue = originalRow.monthlyData[month]?.proposta ?? 0;
            const isChanged = monthData.proposta !== previousValue;

            if (!isChanged || monthData.changeType === 'reset') {
              return null;
            }

            return {
              month,
              monthLabel: monthNames[month - 1],
              previousValue,
              nextValue: monthData.proposta,
            };
          } else {
            const previousValue = originalRow.monthlyData[month]?.orcamento ?? 0;
            const isChanged = monthData.orcamento !== previousValue;

            if (!isChanged) {
              return null;
            }

            return {
              month,
              monthLabel: monthNames[month - 1],
              previousValue,
              nextValue: monthData.orcamento,
            };
          }
        })
        .filter((item): item is ChangeMonthItem => item !== null);

      if (isActionableRow(row, classificacao) && months.length > 0) {
        changes.push({
          rowId: row.id,
          dfc: row.dfc,
          conta: row.conta,
          subconta: row.subconta,
          businessGroupId: row.businessGroupId,
          businessUnitId: row.businessUnitId,
          businessGroup: row.businessGroup,
          businessUnit: row.businessUnit,
          months,
        });
      }
    }

    row.children?.forEach(visit);
  };

  currentRows.forEach(visit);
  return changes;
}

export function getPendencias(
  rows: BudgetRow[],
  filters: BudgetFiltersState,
  userType: 'gestor' | 'financeiro',
  classificacao?: 'A' | 'S',
): PendingItem[] {
  const pendencias: PendingItem[] = [];

  const visit = (row: BudgetRow) => {
    const months = Object.entries(row.monthlyData)
      .map(([monthKey, monthData]) => {
        const month = Number(monthKey);

        if (
          !isMonthInRange(month, filters) ||
          !rowMatchesFilters(row, filters) ||
          (userType === 'gestor'
            ? monthData.proposta !== 0
            : monthData.orcamento !== 0)
        ) {
          return null;
        }

        return monthNames[month - 1];
      })
      .filter(
        (month): month is (typeof monthNames)[number] => month !== null,
      );

    if (isActionableRow(row, classificacao) && months.length > 0) {
      pendencias.push({
        rowId: row.id,
        dfc: row.dfc,
        conta: row.conta,
        subconta: row.subconta,
        businessGroupId: row.businessGroupId,
        businessUnitId: row.businessUnitId,
        businessGroup: row.businessGroup,
        businessUnit: row.businessUnit,
        months,
      });
    }

    row.children?.forEach(visit);
  };

  rows.forEach(visit);
  return pendencias;
}

export function getVisibleChanges(
  changes: ChangeItem[],
  filters: BudgetFiltersState,
): ChangeItem[] {
  return changes
    .map((change) => {
      const months = change.months.filter((month) =>
        isMonthInRange(month.month, filters),
      );

      return {
        ...change,
        months,
      };
    })
    .filter((change) => {
      const matchesGroup =
        filters.businessGroupId == null || change.businessGroupId === filters.businessGroupId;
      const matchesUnit =
        filters.businessUnitIds.length === 0 ||
        (change.businessUnitId != null &&
          filters.businessUnitIds.includes(change.businessUnitId));

      return matchesGroup && matchesUnit && change.months.length > 0;
    });
}
