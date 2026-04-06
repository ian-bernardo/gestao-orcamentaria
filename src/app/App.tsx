'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { BudgetHeader } from './budget/components/BudgetHeader';
import { BudgetFilters } from './budget/components/BudgetFilters';
import { BudgetTable, BudgetTableActions } from './budget/components/BudgetTable';
import { UserSwitcher } from './user/components/UserSwitcher';
import { BUSINESS_GROUPS, BUSINESS_UNITS } from './lib/business';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './shared/ui/dialog';
import { Button } from './shared/ui/button';
import { generateMockData } from './data/mockData';
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

const GESTOR_FIXED_FILTERS: BudgetFiltersState = {
  businessGroup: 'Grupo Norte',
  businessUnits: [BUSINESS_UNITS[0]],
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
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <span className="text-xs text-slate-500">{items.length} linhas</span>
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
  const [viewMode, setViewMode] = useState<'consolidado' | 'por_unidade'>(
    'consolidado',
  );
  const [filters, setFilters] = useState<BudgetFiltersState>({
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
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const budgetTableActionsRef = useRef<BudgetTableActions | null>(null);

  const deepClone = <T,>(data: T): T => JSON.parse(JSON.stringify(data));

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
      currentFilters.businessGroup,
      [...currentFilters.businessUnits].sort().join(','),
      currentFilters.startMonth,
      currentFilters.endMonth,
    ].join('|');

  const getAvailableUnitsForGroup = (
    rows: BudgetRow[],
    businessGroup: string,
  ) => {
    const units = new Set<string>();

    const visit = (currentRows: BudgetRow[]) => {
      currentRows.forEach((row) => {
        const matchesGroup =
          !businessGroup || row.businessGroup === businessGroup;

        if (matchesGroup && row.businessUnit) {
          units.add(row.businessUnit);
        }

        if (row.children?.length) {
          visit(row.children);
        }
      });
    };

    visit(rows);

    return BUSINESS_UNITS.filter((unit) => units.has(unit));
  };

  const hydrateRowsForUnit = (
    rows: BudgetRow[],
    businessGroup: string,
    businessUnit: string,
  ): BudgetRow[] => {
    const visit = (row: BudgetRow): BudgetRow => {
      const children = row.children?.map(visit);

      if (children?.length) {
        return {
          ...row,
          children,
        };
      }

      const matchesGroup = !businessGroup || row.businessGroup === businessGroup;
      const matchesUnit =
        !businessUnit || row.businessUnit === businessUnit;
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
    units: string[],
    businessGroup: string,
  ) =>
    units.reduce<Record<string, BudgetRow[]>>((acc, unit) => {
      acc[unit] = hydrateRowsForUnit(rows, businessGroup, unit);
      return acc;
    }, {});

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

  const applySavedDataToFinanceiro = (persistedRows: BudgetRow[]): BudgetRow[] => {
    const savedById = new Map<string, BudgetRow>();

    const indexRows = (rows: BudgetRow[]) => {
      rows.forEach((row) => {
        savedById.set(row.id, row);
        row.children?.forEach((child) => indexRows([child]));
      });
    };

    indexRows(persistedRows);

    const visit = (rows: BudgetRow[]): BudgetRow[] =>
      rows.map((row) => {
        const savedRow = savedById.get(row.id);

        return {
          ...row,
          monthlyData: Object.fromEntries(
            Object.entries(row.monthlyData).map(([monthKey, monthData]) => {
              const savedMonth = savedRow?.monthlyData[Number(monthKey)];

              return [
                monthKey,
                {
                  ...monthData,
                  proposta: savedMonth?.proposta ?? 0,
                  orcamento: 0,
                  changeType: null,
                },
              ];
            }),
          ) as BudgetRow['monthlyData'],
          children: row.children ? visit(row.children) : row.children,
        };
      });

    return visit(persistedRows);
  };

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        setLoadError('');
        const data = deepClone(await generateMockData());
        setBudgetData(data);
        setCatalogData(createSnapshot(data));
        const nextSnapshot = createSnapshot(data);
        setOriginalDataSnapshot(nextSnapshot);
      } catch (error) {
        console.error('Erro ao carregar dados do orcamento:', error);
        setLoadError('Nao foi possivel carregar os dados iniciais.');
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();
  }, []);

  const filteredData = useMemo(
    () => getFilteredData(budgetData, filters),
    [budgetData, filters],
  );

  const isGestor = userType === 'gestor';
  const isAllGroups = filters.businessGroup === '';
  const availableUnits = useMemo(
    () => getAvailableUnitsForGroup(catalogData, filters.businessGroup),
    [catalogData, filters.businessGroup],
  );
  const selectedUnits = useMemo(() => {
    if (filters.businessUnits.length > 0) {
      return filters.businessUnits;
    }

    return availableUnits;
  }, [availableUnits, filters.businessUnits]);
  const groupedDataByUnit = useMemo(
    () => groupByUnit(filteredData, selectedUnits, filters.businessGroup),
    [filteredData, selectedUnits, filters.businessGroup],
  );
  const shouldSplitByUnit =
    userType === 'financeiro' && viewMode === 'por_unidade';

  const allChanges = useMemo(
    () => getChanges(originalDataSnapshot, budgetData),
    [originalDataSnapshot, budgetData],
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
    value: string | number | string[],
  ) => {
    if (isGestor) {
      return;
    }

    setFilters((prev) => {
      if (key === 'businessGroup') {
        return {
          ...prev,
          businessGroup: String(value),
          businessUnits: [],
        };
      }

      return { ...prev, [key]: value };
    });
  };

  const handleClear = () => {
    if (isGestor) {
      return;
    }

    setFilters({
      businessGroup: '',
      businessUnits: [],
      startMonth: 1,
      endMonth: 12,
    });
  };

  useEffect(() => {
    if (isGestor) {
      return;
    }

    setFilters((prev) => {
      const nextUnits = prev.businessUnits.filter((unit) =>
        availableUnits.includes(unit),
      );

      if (nextUnits.length === prev.businessUnits.length) {
        return prev;
      }

      return {
        ...prev,
        businessUnits: nextUnits,
      };
    });
  }, [availableUnits, isGestor]);

  useEffect(() => {
    if (userType === 'gestor') {
      setLastFinanceiroFilters(filters);
      setFilters(GESTOR_FIXED_FILTERS);
      return;
    }

    setFilters((prev) => {
      const isUsingGestorFilters =
        prev.businessGroup === GESTOR_FIXED_FILTERS.businessGroup &&
        prev.businessUnits.length === GESTOR_FIXED_FILTERS.businessUnits.length &&
        prev.businessUnits.every(
          (unit, index) => unit === GESTOR_FIXED_FILTERS.businessUnits[index],
        ) &&
        prev.startMonth === GESTOR_FIXED_FILTERS.startMonth &&
        prev.endMonth === GESTOR_FIXED_FILTERS.endMonth;

      if (isUsingGestorFilters && lastFinanceiroFilters) {
        return lastFinanceiroFilters;
      }

      return prev;
    });
  }, [lastFinanceiroFilters, userType]);

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
  const handleCloseSaveModal = () => setIsSaveModalOpen(false);

  const handleConfirmSave = () => {
    setIsSaving(true);

    try {
      console.log('Salvando dados filtrados...', {
        filters,
        filteredData,
        changes,
        pendencias,
      });
      const key = getFilterKey(filters);
      const nextSavedData = createSnapshot(filteredData);
      const nextSnapshot = createSnapshot(budgetData);

      setSavedData((prev) => [
        ...prev.filter((item) => item.key !== key),
        {
          key,
          data: nextSavedData,
        },
      ]);
      setOriginalDataSnapshot(nextSnapshot);
      toast.success('Dados salvos com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
      toast.error('Nao foi possivel salvar os dados.');
    } finally {
      setIsSaving(false);
      setIsSaveModalOpen(false);
    }
  };

  const handleSearch = () => {
    console.log('Buscando com filtros:', filters);

    try {
      const key = getFilterKey(filters);
      const found = savedData.find((item) => item.key === key);

      if (!found) {
        toast('Nenhum dado salvo encontrado para este filtro.');
        return;
      }

      const nextData =
        userType === 'financeiro'
          ? applySavedDataToFinanceiro(createSnapshot(found.data))
          : createSnapshot(found.data);
      const nextSnapshot = createSnapshot(nextData);

      setLoadError('');
      setBudgetData(nextData);
      setOriginalDataSnapshot(nextSnapshot);
    } catch (error) {
      console.error('Erro ao buscar dados filtrados:', error);
      setLoadError('Nao foi possivel atualizar os dados.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <BudgetHeader />

      <div className="px-6 py-4">
        <BudgetFilters
          filters={filters}
          availableUnits={availableUnits}
          allGroups={BUSINESS_GROUPS}
          isReadOnly={isGestor}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onFilterChange={handleFilterChange}
          onClear={handleClear}
          onSave={handleOpenSaveModal}
          onSearch={handleSearch}
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
                  <span className="text-sm font-medium">Alteracoes reais</span>
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
                title="Alteracoes na proposta"
                emptyText="Nenhuma alteracao manual encontrada neste recorte."
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
              <Button onClick={handleConfirmSave} disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Confirmar'}
              </Button>
            </DialogFooter>
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
                {Object.entries(groupedDataByUnit).map(([unit, unitData]) => (
                  <div key={unit} className="mb-6 space-y-2">
                    <div className="px-1">
                      <h3 className="text-sm font-semibold text-slate-700">{unit}</h3>
                    </div>
                    <BudgetTable
                      data={budgetData}
                      visibleData={unitData}
                      onDataChange={handleBudgetDataChange}
                      onBaselineChange={() => {}}
                      onManualProposalEdit={handleManualProposalEdit}
                      startMonth={filters.startMonth}
                      endMonth={filters.endMonth}
                      userType={userType}
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
                      {selectedUnits[0]}
                    </h3>
                  </div>
                ) : null}
                <BudgetTable
                  ref={budgetTableActionsRef}
                  data={budgetData}
                  visibleData={
                    userType === 'financeiro' && selectedUnits.length === 1
                      ? groupedDataByUnit[selectedUnits[0]] ?? filteredData
                      : filteredData
                  }
                  onDataChange={handleBudgetDataChange}
                  onBaselineChange={() => {}}
                  onManualProposalEdit={handleManualProposalEdit}
                  startMonth={filters.startMonth}
                  endMonth={filters.endMonth}
                  userType={userType}
                  filters={filters}
                />
              </div>
            ))
          )}
        </div>
      </div>

      <UserSwitcher
        userType={userType}
        onChange={setUserType}
        onFillPropostaOrcamento={() =>
          budgetTableActionsRef.current?.openFillPropostaOrcamento()
        }
        onResetPropostaOrcamento={() =>
          budgetTableActionsRef.current?.openResetPropostaOrcamento()
        }
      />
    </div>
  );
}
