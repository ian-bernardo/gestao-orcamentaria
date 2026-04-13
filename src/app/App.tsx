'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { BudgetHeader } from './budget/components/BudgetHeader';
import { BudgetFilters } from './budget/components/BudgetFilters';
import { BudgetTable, BudgetTableActions } from './budget/components/BudgetTable';
import { getBudget } from './budget/services/getBudget';
import { saveBudgetEntry, collectSaveEntries, SaveBudgetResult } from './budget/services/saveBudget';
import { budgetAdapter } from '@/app/budget/adapters/budgetAdapter';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './shared/ui/dialog';
import { Button } from './shared/ui/button';
import { BudgetRow } from './budget/types/budget';
import {
  BudgetFiltersState,
  ChangeItem,
  PendingItem,
  getChanges,
  getFilteredData,
  getPendencias,
  getVisibleChanges,
} from './budget/utils/budgetInsights';

interface SavedBudgetEntry {
  key: string;
  data: BudgetRow[];
}

interface SelectOption {
  label: string;
  value: number;
}

const GESTOR_FIXED_GROUP_LABEL = 'Grupo Norte';
const GESTOR_FIXED_FILTERS: BudgetFiltersState = {
  businessGroupId: undefined,
  businessUnitIds: [],
  businessGroup: GESTOR_FIXED_GROUP_LABEL,
  businessUnits: [],
  startMonth: 4,
  endMonth: 5,
};

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function SummarySection({
  title,
  emptyText,
  items,
  type,
}: {
  title: string;
  emptyText: string;
  items: ChangeItem[] | PendingItem[];
  type: 'changes' | 'pendencias';
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <span className="shrink-0 whitespace-nowrap pt-0.5 text-xs text-slate-500">
          {items.length} linhas
        </span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={`${item.dfc}-${item.conta}-${item.subconta}-${index}`}
              className={`rounded-2xl border px-4 py-4 ${
                type === 'changes'
                  ? 'border-sky-100 bg-sky-50/70'
                  : 'border-rose-100 bg-rose-50/70'
              }`}
            >
              <div className="space-y-1">
                <div className="text-sm font-semibold text-slate-900">
                  {item.dfc}
                </div>
                {item.conta ? (
                  <div className="text-sm text-slate-700">{item.conta}</div>
                ) : null}
                {item.subconta ? (
                  <div className="text-sm text-slate-500">{item.subconta}</div>
                ) : null}
              </div>

              <div className="mt-3 space-y-2">
                {'months' in item &&
                item.months.length > 0 &&
                typeof item.months[0] === 'string'
                  ? (item.months as string[]).map((month) => (
                      <div
                        key={month}
                        className="rounded-xl bg-white/70 px-3 py-2 text-sm text-rose-700"
                      >
                        {month}
                      </div>
                    ))
                  : (item.months as ChangeItem['months']).map((month) => (
                      <div
                        key={`${item.dfc}-${month.month}`}
                        className="flex items-center justify-between rounded-xl bg-white/75 px-3 py-2 text-sm text-sky-900"
                      >
                        <span>{month.monthLabel}</span>
                        <span className="font-medium">
                          {formatNumber(month.previousValue)} {'->'} {formatNumber(month.nextValue)}
                        </span>
                      </div>
                    ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [userType, setUserType] = useState<'gestor' | 'financeiro'>(
    'financeiro',
  );
  const [classificacao, setClassificacao] = useState<'A' | 'S'>('A');
  const [viewMode, setViewMode] = useState<'consolidado' | 'por_unidade'>(
    'consolidado',
  );
  const [filters, setFilters] = useState<BudgetFiltersState>({
    businessGroupId: undefined,
    businessUnitIds: [],
    businessGroup: '',
    businessUnits: [],
    startMonth: 1,
    endMonth: 12,
  });
  const [budgetData, setBudgetData] = useState<BudgetRow[]>([]);
  const [catalogData, setCatalogData] = useState<BudgetRow[]>([]);
  const [savedData, setSavedData] = useState<SavedBudgetEntry[]>([]);
  const [originalDataSnapshot, setOriginalDataSnapshot] = useState<BudgetRow[]>(
    [],
  );
  const [lastFinanceiroFilters, setLastFinanceiroFilters] =
    useState<BudgetFiltersState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveErrors, setSaveErrors] = useState<Pick<SaveBudgetResult, 'idgestao' | 'nrmes' | 'message'>[]>([]);
  const [filtersLockedByUrl, setFiltersLockedByUrl] = useState(false);
  const budgetTableActionsRef = useRef<BudgetTableActions | null>(null);
  const isFirstRenderRef = useRef(true);

  const deepClone = <T,>(data: T): T => JSON.parse(JSON.stringify(data));

  const numberArrayEquals = (a: number[], b: number[]) =>
    a.length === b.length && a.every((value, index) => value === b[index]);

  const stringArrayEquals = (a: string[], b: string[]) =>
    a.length === b.length && a.every((value, index) => value === b[index]);

  const createSnapshot = (rows: BudgetRow[]): BudgetRow[] => {
    const clonedRows = deepClone(rows);

    const normalizeRows = (currentRows: BudgetRow[]): BudgetRow[] =>
      currentRows.map((row) => ({
        ...row,
        monthlyData: Object.fromEntries(
          Object.entries(row.monthlyData).map(([month, monthData]) => [
            month,
            {
              ...monthData,
              changeType: null,
            },
          ]),
        ) as BudgetRow['monthlyData'],
        children: row.children ? normalizeRows(row.children) : row.children,
      }));

    return normalizeRows(clonedRows);
  };

  const getFilterKey = (currentFilters: BudgetFiltersState) =>
    [
      currentFilters.businessGroupId ?? 'all',
      [...currentFilters.businessUnitIds].sort((a, b) => a - b).join(','),
      currentFilters.startMonth,
      currentFilters.endMonth,
    ].join('|');

  const getAllGroupOptions = (rows: BudgetRow[]): SelectOption[] => {
    const groups = new Map<number, string>();

    const visit = (currentRows: BudgetRow[]) => {
      currentRows.forEach((row) => {
        if (row.businessGroupId != null && row.businessGroup) {
          groups.set(row.businessGroupId, row.businessGroup);
        }

        if (row.children?.length) {
          visit(row.children);
        }
      });
    };

    visit(rows);

    return Array.from(groups.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  };

  const getAllUnitOptions = (rows: BudgetRow[]): SelectOption[] => {
    const units = new Map<number, string>();

    const visit = (currentRows: BudgetRow[]) => {
      currentRows.forEach((row) => {
        if (row.businessUnitId != null && row.businessUnit) {
          units.set(row.businessUnitId, row.businessUnit);
        }

        if (row.children?.length) {
          visit(row.children);
        }
      });
    };

    visit(rows);

    return Array.from(units.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  };

  const getAvailableUnitsForGroup = (
    rows: BudgetRow[],
    businessGroupId?: number,
  ): SelectOption[] => {
    const units = new Map<number, string>();

    const visit = (currentRows: BudgetRow[]) => {
      currentRows.forEach((row) => {
        const matchesGroup =
          businessGroupId == null || row.businessGroupId === businessGroupId;

        if (matchesGroup && row.businessUnitId != null && row.businessUnit) {
          units.set(row.businessUnitId, row.businessUnit);
        }

        if (row.children?.length) {
          visit(row.children);
        }
      });
    };

    visit(rows);

    return Array.from(units.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  };

  const hydrateRowsForUnit = (
    rows: BudgetRow[],
    businessGroupId?: number,
    businessUnitId?: number,
  ): BudgetRow[] => {
    const visit = (row: BudgetRow): BudgetRow => {
      const children = row.children?.map(visit);

      if (children?.length) {
        return {
          ...row,
          children,
        };
      }

      const matchesGroup =
        businessGroupId == null || row.businessGroupId === businessGroupId;
      const matchesUnit =
        businessUnitId == null || row.businessUnitId === businessUnitId;
      const shouldKeepValues = matchesGroup && matchesUnit;

      return {
        ...row,
        monthlyData: Object.fromEntries(
          Object.entries(row.monthlyData).map(([monthKey, monthData]) => [
            monthKey,
            {
              ...monthData,
              proposta: shouldKeepValues ? monthData.proposta : 0,
              orcamento: shouldKeepValues ? monthData.orcamento : 0,
            },
          ]),
        ) as BudgetRow['monthlyData'],
      };
    };

    return rows.map(visit);
  };

  const groupByUnit = (
    rows: BudgetRow[],
    units: SelectOption[],
    businessGroupId?: number,
  ) =>
    units.reduce<Record<number, BudgetRow[]>>((acc, unit) => {
      acc[unit.value] = hydrateRowsForUnit(rows, businessGroupId, unit.value);
      return acc;
    }, {} as Record<number, BudgetRow[]>);

  const resetPropostasForGestor = (rows: BudgetRow[]): BudgetRow[] =>
    rows.map((row) => ({
      ...row,
      monthlyData: Object.fromEntries(
        Object.entries(row.monthlyData).map(([month, monthData]) => [
          month,
          {
            ...monthData,
            proposta: 0,
          },
        ]),
      ) as BudgetRow['monthlyData'],
      children: row.children
        ? resetPropostasForGestor(row.children)
        : row.children,
    }));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const idgrupo = params.get('p_gn');
    const idunidade = params.get('p_un');
    const mesInicial = params.get('p_mes_inicial');
    const mesFinal = params.get('p_mes_final');
    const permissao = params.get('p_permissao');
    const tipo = params.get('v_tipo');

    const nextGroupId = idgrupo ? Number(idgrupo) : undefined;
    const nextUnitIds = idunidade ? [Number(idunidade)] : [];
    const nextStartMonth = mesInicial ? Number(mesInicial) : 1;
    const nextEndMonth = mesFinal ? Number(mesFinal) : 12;
    const nextClassificacao: 'A' | 'S' = tipo === 'S' ? 'S' : 'A';

    setClassificacao(nextClassificacao);

    setFilters((prev) => {
      const unchanged =
        prev.businessGroupId === nextGroupId &&
        numberArrayEquals(prev.businessUnitIds, nextUnitIds) &&
        prev.startMonth === nextStartMonth &&
        prev.endMonth === nextEndMonth &&
        prev.businessGroup === '' &&
        prev.businessUnits.length === 0;

      if (unchanged) {
        return prev;
      }

      return {
        ...prev,
        businessGroupId: nextGroupId,
        businessUnitIds: nextUnitIds,
        businessGroup: '',
        businessUnits: [],
        startMonth: nextStartMonth,
        endMonth: nextEndMonth,
      };
    });

    setUserType(permissao === 'S' ? 'financeiro' : 'gestor');
    setFiltersLockedByUrl(Boolean(idgrupo || idunidade || mesInicial || mesFinal));

    // Busca automática somente quando p_gn vier pela URL
    if (idgrupo) {
      void handleSearch(
        {
          businessGroupId: nextGroupId,
          businessUnitIds: nextUnitIds,
          businessGroup: '',
          businessUnits: [],
          startMonth: nextStartMonth,
          endMonth: nextEndMonth,
        },
        { tipoorcamento: nextClassificacao === 'S' ? 'S' : undefined },
      );
    }
  }, []);

  // Carregar catálogo de grupos e unidades na inicialização
  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const apiData = await getBudget({
          anoorcamento: 2026,
        });
        const adapted = budgetAdapter(apiData);
        const snapshot = createSnapshot(adapted);
        setCatalogData(snapshot);
      } catch (error) {
        console.error('Erro ao carregar catálogo:', error);
      }
    };

    loadCatalog();
  }, []);

  const handleSearch = async (
    currentFilters: BudgetFiltersState,
    options?: { tipoorcamento?: 'S' },
  ) => {
    try {
      setIsLoading(true);
      setLoadError('');

      const idunidade =
        currentFilters.businessUnitIds.length === 1
          ? currentFilters.businessUnitIds[0]
          : undefined;

      const apiData = await getBudget({
        anoorcamento: 2026,
        idgrupo: currentFilters.businessGroupId,
        idunidade,
        ...(options?.tipoorcamento && {
          tipoorcamento: options.tipoorcamento,
        }),
      });

      const adapted = budgetAdapter(apiData);
      const data = deepClone(adapted);

      setBudgetData(data);
      // Atualizar catálogo apenas se ainda não foi carregado
      setCatalogData((prev) =>
        prev.length === 0 ? createSnapshot(data) : prev
      );
      setOriginalDataSnapshot(createSnapshot(data));
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      setLoadError('Erro ao buscar dados da API');
    } finally {
      setIsLoading(false);
    }
  };

  const normalizedUnitIdsKey = useMemo(
    () => [...filters.businessUnitIds].sort((a, b) => a - b).join(','),
    [filters.businessUnitIds],
  );

  const filtersSearchKey = `${filters.businessGroupId ?? 'all'}|${normalizedUnitIdsKey}|${filters.startMonth}|${filters.endMonth}`;

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    setBudgetData([]);
    setOriginalDataSnapshot([]);
  }, [filtersSearchKey]);

  const allGroups = useMemo(
    () => getAllGroupOptions(catalogData),
    [catalogData],
  );

  const allUnits = useMemo(
    () => getAllUnitOptions(catalogData),
    [catalogData],
  );

  useEffect(() => {
    setFilters((prev) => {
      const nextGroupLabel =
        prev.businessGroupId == null
          ? ''
          : allGroups.find((group) => group.value === prev.businessGroupId)?.label ?? '';
      const nextUnitLabels = allUnits
        .filter((unit) => prev.businessUnitIds.includes(unit.value))
        .map((unit) => unit.label);

      const groupUnchanged = prev.businessGroup === nextGroupLabel;
      const unitsUnchanged = stringArrayEquals(prev.businessUnits, nextUnitLabels);

      if (groupUnchanged && unitsUnchanged) {
        return prev;
      }

      return {
        ...prev,
        businessGroup: nextGroupLabel,
        businessUnits: nextUnitLabels,
      };
    });
  }, [allGroups, allUnits]);

  const filteredData = useMemo(
    () => getFilteredData(budgetData, filters),
    [budgetData, filters],
  );

  const isGestor = userType === 'gestor';
  const isAllGroups = filters.businessGroupId == null;
  const availableUnits = useMemo(
    () => getAvailableUnitsForGroup(catalogData, filters.businessGroupId),
    [catalogData, filters.businessGroupId],
  );

  const selectedUnits = useMemo(() => {
    if (filters.businessUnitIds.length > 0) {
      return availableUnits.filter((unit) =>
        filters.businessUnitIds.includes(unit.value),
      );
    }

    return availableUnits;
  }, [availableUnits, filters.businessUnitIds]);

  const groupedDataByUnit = useMemo(
    () => groupByUnit(filteredData, selectedUnits, filters.businessGroupId),
    [filteredData, selectedUnits, filters.businessGroupId],
  );

  const shouldSplitByUnit =
    userType === 'financeiro' && viewMode === 'por_unidade';

  const allChanges = useMemo(
    () => getChanges(originalDataSnapshot, budgetData, userType),
    [originalDataSnapshot, budgetData, userType],
  );

  const changes = useMemo(
    () => getVisibleChanges(allChanges, filters),
    [allChanges, filters],
  );

  const pendencias = useMemo(
    () => getPendencias(filteredData, filters, userType),
    [filteredData, filters, userType],
  );

  const changeCount = useMemo(
    () => changes.reduce((total, item) => total + item.months.length, 0),
    [changes],
  );

  const pendenciaCount = useMemo(
    () => pendencias.reduce((total, item) => total + item.months.length, 0),
    [pendencias],
  );

  const handleFilterChange = (
    key: string,
    value: string | number | string[] | number[] | undefined,
  ) => {
    if (isGestor) {
      return;
    }

    setFilters((prev) => {
      if (key === 'businessGroupId') {
        const groupId = typeof value === 'number' ? value : undefined;
        const group =
          groupId == null ? undefined : allGroups.find((g) => g.value === groupId);

        const unchanged =
          prev.businessGroupId === groupId &&
          prev.businessGroup === (group?.label ?? '') &&
          prev.businessUnitIds.length === 0 &&
          prev.businessUnits.length === 0;

        if (unchanged) {
          return prev;
        }

        return {
          ...prev,
          businessGroupId: groupId,
          businessGroup: group?.label ?? '',
          businessUnitIds: [],
          businessUnits: [],
        };
      }

      if (key === 'businessUnitIds') {
        const unitIds = Array.isArray(value)
          ? (value as number[])
          : [];
        const unitLabels = allUnits
          .filter((unit) => unitIds.includes(unit.value))
          .map((unit) => unit.label);

        if (
          numberArrayEquals(prev.businessUnitIds, unitIds) &&
          stringArrayEquals(prev.businessUnits, unitLabels)
        ) {
          return prev;
        }

        return {
          ...prev,
          businessUnitIds: unitIds,
          businessUnits: unitLabels,
        };
      }

      if (key === 'businessUnits') {
        return prev;
      }

      if (key === 'businessGroup') {
        if (typeof value !== 'string' || prev.businessGroup === value) {
          return prev;
        }

        return {
          ...prev,
          businessGroup: value,
        };
      }

      if (key === 'startMonth') {
        const month = typeof value === 'number' ? value : prev.startMonth;
        if (prev.startMonth === month) {
          return prev;
        }

        return {
          ...prev,
          startMonth: month,
        };
      }

      if (key === 'endMonth') {
        const month = typeof value === 'number' ? value : prev.endMonth;
        if (prev.endMonth === month) {
          return prev;
        }

        return {
          ...prev,
          endMonth: month,
        };
      }

      return { ...prev, [key]: value } as BudgetFiltersState;
    });
  };

  const handleClear = () => {
    if (isGestor) {
      return;
    }

    setFilters((prev) => {
      const nextFilters: BudgetFiltersState = {
        businessGroupId: undefined,
        businessUnitIds: [],
        businessGroup: '',
        businessUnits: [],
        startMonth: 1,
        endMonth: 12,
      };

      const unchanged =
        prev.businessGroupId == null &&
        prev.businessUnitIds.length === 0 &&
        prev.businessGroup === '' &&
        prev.businessUnits.length === 0 &&
        prev.startMonth === 1 &&
        prev.endMonth === 12;

      return unchanged ? prev : nextFilters;
    });
  };

  useEffect(() => {
    if (userType === 'gestor') {
      setLastFinanceiroFilters(filters);
      const gestorGroup = allGroups.find(
        (group) => group.label === GESTOR_FIXED_GROUP_LABEL,
      );

      const nextGestorFilters: BudgetFiltersState = {
        ...GESTOR_FIXED_FILTERS,
        businessGroupId: gestorGroup?.value,
        businessGroup: gestorGroup?.label ?? GESTOR_FIXED_GROUP_LABEL,
      };

      setFilters((prev) => {
        const unchanged =
          prev.businessGroupId === nextGestorFilters.businessGroupId &&
          numberArrayEquals(prev.businessUnitIds, nextGestorFilters.businessUnitIds) &&
          prev.businessGroup === nextGestorFilters.businessGroup &&
          stringArrayEquals(prev.businessUnits, nextGestorFilters.businessUnits) &&
          prev.startMonth === nextGestorFilters.startMonth &&
          prev.endMonth === nextGestorFilters.endMonth;

        return unchanged ? prev : nextGestorFilters;
      });
      return;
    }

    setFilters((prev) => {
      const isUsingGestorFilters =
        prev.businessGroup === GESTOR_FIXED_GROUP_LABEL &&
        prev.businessUnitIds.length === 0 &&
        prev.startMonth === GESTOR_FIXED_FILTERS.startMonth &&
        prev.endMonth === GESTOR_FIXED_FILTERS.endMonth;

      if (isUsingGestorFilters && lastFinanceiroFilters) {
        const unchanged =
          prev.businessGroupId === lastFinanceiroFilters.businessGroupId &&
          numberArrayEquals(prev.businessUnitIds, lastFinanceiroFilters.businessUnitIds) &&
          prev.businessGroup === lastFinanceiroFilters.businessGroup &&
          stringArrayEquals(prev.businessUnits, lastFinanceiroFilters.businessUnits) &&
          prev.startMonth === lastFinanceiroFilters.startMonth &&
          prev.endMonth === lastFinanceiroFilters.endMonth;

        if (unchanged) {
          return prev;
        }

        return lastFinanceiroFilters;
      }

      return prev;
    });
  }, [allGroups, lastFinanceiroFilters, userType]);

  useEffect(() => {
    if (userType !== 'gestor') {
      return;
    }

    setBudgetData((prev) => {
      const nextData = resetPropostasForGestor(prev);
      const nextSnapshot = createSnapshot(nextData);

      setOriginalDataSnapshot(nextSnapshot);

      return nextData;
    });
  }, [userType]);

  const handleManualProposalEdit = (_rowId: string, _month: number) => {};

  const handleBudgetDataChange = (nextData: BudgetRow[]) => {
    setBudgetData(nextData);
  };

  const handleOpenSaveModal = () => setIsSaveModalOpen(true);
  const handleCloseSaveModal = () => {
    setIsSaveModalOpen(false);
    setSaveErrors([]);
  };

  const handleConfirmSave = async () => {
    setIsSaving(true);
    setSaveErrors([]);

    try {
      const tipoorcamento = userType === 'gestor' ? 'P' : 'O';

      const entries = collectSaveEntries(
        filteredData,
        tipoorcamento,
        filters.startMonth,
        filters.endMonth,
      );

      const results = await Promise.all(
        entries.map((entry) => saveBudgetEntry(entry)),
      );

      const failures = results.filter((r) => !r.success);

      if (failures.length > 0) {
        setSaveErrors(failures);
        toast.error(
          `${failures.length} ${failures.length === 1 ? 'registro falhou' : 'registros falharam'} ao salvar.`,
          { position: 'top-right', duration: 5000 },
        );
        return;
      }

      const key = getFilterKey(filters);
      const nextSavedData = createSnapshot(filteredData);
      const nextSnapshot = createSnapshot(budgetData);

      setSavedData((prev) => [
        ...prev.filter((item) => item.key !== key),
        { key, data: nextSavedData },
      ]);
      setOriginalDataSnapshot(nextSnapshot);
      budgetTableActionsRef.current?.clearCopySnapshot();

      toast.success('Dados salvos com sucesso!', {
        position: 'top-right',
        duration: 3000,
      });
      setIsSaveModalOpen(false);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro inesperado ao salvar. Tente novamente.', {
        position: 'top-right',
        duration: 4000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <BudgetHeader />

      <div className="px-6 py-4">
        <BudgetFilters
          filters={filters}
          availableUnits={availableUnits}
          allGroups={allGroups}
          isReadOnly={isGestor}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onFilterChange={handleFilterChange}
          onClear={handleClear}
          onSave={handleOpenSaveModal}
          onSearch={() => void handleSearch(filters, {
            tipoorcamento: classificacao === 'S' ? 'S' : undefined,
          })}
        />

        <Dialog open={isSaveModalOpen} onOpenChange={setIsSaveModalOpen}>
          <DialogContent className="max-h-[85vh] max-w-4xl overflow-hidden">
            <DialogHeader>
              <DialogTitle>Resumo do salvamento</DialogTitle>
              <DialogDescription>
                O resumo abaixo considera apenas o filtro ativo e os meses dentro do periodo selecionado.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 border-y border-slate-200 py-4 md:grid-cols-2">
              <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3">
                <div className="flex items-center gap-2 text-sky-700">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Alterações realizadas</span>
                </div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">
                  {changeCount}
                </div>
              </div>

              <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3">
                <div className="flex items-center gap-2 text-rose-700">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">Pendencias</span>
                </div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">
                  {pendenciaCount}
                </div>
              </div>
            </div>

            <div className="grid max-h-[52vh] gap-6 overflow-y-auto pr-2 lg:grid-cols-2">
              <SummarySection
                title={
                  userType === 'gestor'
                    ? 'Alterações na proposta'
                    : 'Alterações no orçamento'
                }
                emptyText={
                  userType === 'gestor'
                    ? 'Nenhuma alteração manual encontrada neste recorte.'
                    : 'Nenhuma alteração no orçamento encontrada neste recorte.'
                }
                items={changes}
                type="changes"
              />
              <SummarySection
                title={
                  userType === 'gestor'
                    ? 'Pendencias da proposta'
                    : 'Pendencias do orçamento'
                }
                emptyText={
                  userType === 'gestor'
                    ? 'Nenhuma pendencia com proposta zerada neste recorte.'
                    : 'Nenhuma pendencia com orçamento zerado neste recorte.'
                }
                items={pendencias}
                type="pendencias"
              />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleCloseSaveModal}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button onClick={() => void handleConfirmSave()} disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Confirmar'}
              </Button>
            </DialogFooter>

            {saveErrors.length > 0 ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="mb-2 text-sm font-semibold text-red-700">
                  Falhas no salvamento ({saveErrors.length} {saveErrors.length === 1 ? 'registro' : 'registros'})
                </p>
                <ul className="max-h-32 space-y-1 overflow-y-auto">
                  {saveErrors.map((err, i) => (
                    <li key={i} className="text-xs text-red-600">
                      ID {err.idgestao} · Mês {err.nrmes}: {err.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        <div className="mt-6">
          {loadError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {loadError}
            </div>
          ) : isLoading ? (
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-sm text-gray-500">
              Carregando dados do orcamento...
            </div>
          ) : (
            (shouldSplitByUnit ? (
              <div className="space-y-8">
                {selectedUnits.map((unit) => (
                  <div key={unit.value} className="mb-6 space-y-2">
                    <div className="px-1">
                      <h3 className="text-sm font-semibold text-slate-700">{unit.label}</h3>
                    </div>
                    <BudgetTable
                      data={budgetData}
                      visibleData={groupedDataByUnit[unit.value] ?? filteredData}
                      onDataChange={handleBudgetDataChange}
                      onBaselineChange={() => {}}
                      onManualProposalEdit={handleManualProposalEdit}
                      startMonth={filters.startMonth}
                      endMonth={filters.endMonth}
                      userType={userType}
                      classificacao={classificacao}
                      filters={filters}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {userType === 'financeiro' && !isAllGroups && selectedUnits.length === 1 ? (
                  <div className="px-1">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {selectedUnits[0].label}
                    </h3>
                  </div>
                ) : null}
                <BudgetTable
                  ref={budgetTableActionsRef}
                  data={budgetData}
                  visibleData={
                    userType === 'financeiro' && selectedUnits.length === 1
                      ? groupedDataByUnit[selectedUnits[0].value] ?? filteredData
                      : filteredData
                  }
                  onDataChange={handleBudgetDataChange}
                  onBaselineChange={() => {}}
                  onManualProposalEdit={handleManualProposalEdit}
                  startMonth={filters.startMonth}
                  endMonth={filters.endMonth}
                  userType={userType}
                  classificacao={classificacao}
                  filters={filters}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
