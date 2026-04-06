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
  businessGroup?: string;
  businessUnit?: string;
  months: ChangeMonthItem[];
}

export interface PendingItem {
  rowId: string;
  dfc: string;
  conta: string;
  subconta: string;
  businessGroup?: string;
  businessUnit?: string;
  months: string[];
}

function isMonthInRange(month: number, filters: BudgetFiltersState) {
  return month >= filters.startMonth && month <= filters.endMonth;
}

function rowMatchesFilters(row: BudgetRow, filters: BudgetFiltersState) {
  const matchesGroup =
    !filters.businessGroup || row.businessGroup === filters.businessGroup;
  const matchesUnit =
    filters.businessUnits.length === 0 ||
    (row.businessUnit != null && filters.businessUnits.includes(row.businessUnit));

  return matchesGroup && matchesUnit;
}

function isActionableRow(row: BudgetRow) {
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
        })
        .filter((item): item is ChangeMonthItem => item !== null);

      if (isActionableRow(row) && months.length > 0) {
        changes.push({
          rowId: row.id,
          dfc: row.dfc,
          conta: row.conta,
          subconta: row.subconta,
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

    if (isActionableRow(row) && months.length > 0) {
      pendencias.push({
        rowId: row.id,
        dfc: row.dfc,
        conta: row.conta,
        subconta: row.subconta,
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
        !filters.businessGroup || change.businessGroup === filters.businessGroup;
      const matchesUnit =
        filters.businessUnits.length === 0 ||
        (change.businessUnit != null &&
          filters.businessUnits.includes(change.businessUnit));

      return matchesGroup && matchesUnit && change.months.length > 0;
    });
}
