'use client';
import { forwardRef, ReactElement, useImperativeHandle, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ChevronDown, ChevronRight, Lock, Pencil } from "lucide-react";
import { BudgetRow, MonthlyData } from "../types/budget";
import { Tooltip } from "../../shared/ui/tooltip";

interface BudgetTableProps {
  data: BudgetRow[];
  visibleData: BudgetRow[];
  onDataChange: (data: BudgetRow[]) => void;
  onBaselineChange: (data: BudgetRow[]) => void;
  onManualProposalEdit: (rowId: string, month: number) => void;
  startMonth: number;
  endMonth: number;
  userType: 'gestor' | 'financeiro';
  classificacao?: 'A' | 'S';
  filters: {
    businessGroup: string;
    businessUnits: string[];
  };
}

export interface BudgetTableActions {
  openFillPropostaOrcamento: () => void;
  openResetPropostaOrcamento: () => void;
  clearCopySnapshot: () => void;
}

const DFC_COLUMN_WIDTH = 180;
const CONTA_COLUMN_WIDTH = 200;
const SUBCONTA_COLUMN_WIDTH = 220;

const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const highlightedRows = new Set([
  "Receita",
  "Margem Bruta",
  "Resultado Operacional",
  "Resultado Líquido",
]);

function isMonthVisible(month: number, startMonth: number, endMonth: number) {
  return month >= startMonth && month <= endMonth;
}

function getDisplayedPropostaValue(
  monthData: MonthlyData,
  _userType: "gestor" | "financeiro",
) {
  return monthData.proposta;
}

function isPendingForUserType(
  monthData: MonthlyData,
  userType: "gestor" | "financeiro",
) {
  if (userType === "gestor") {
    const displayedProposta = getDisplayedPropostaValue(monthData, userType);
    return (
      displayedProposta === 0 &&
      (userType === "gestor" || monthData.changeType != null)
    );
  }

  return monthData.orcamento === 0;
}

function getZeroPropostaCount(
  row: BudgetRow,
  startMonth: number,
  endMonth: number,
  userType: "gestor" | "financeiro",
  isSintetico?: boolean,
): number {
  if (isSintetico) {
    const hasZero = Object.entries(row.monthlyData).some(([monthKey, monthData]) => {
      const month = Number(monthKey);
      return isMonthVisible(month, startMonth, endMonth) &&
        isPendingForUserType(monthData, userType);
    });
    return hasZero ? 1 : 0;
  }

  let count = 0;

  const visit = (current: BudgetRow) => {
    if (current.level === "subconta") {
      const hasZero = Object.entries(current.monthlyData).some(
        ([monthKey, monthData]) => {
          const month = Number(monthKey);
          const isPendente = isPendingForUserType(monthData, userType);

          return isMonthVisible(month, startMonth, endMonth) && isPendente;
        },
      );

      if (hasZero) {
        count += 1;
      }

      return;
    }

    current.children?.forEach(visit);
  };

  row.children?.forEach(visit);
  return count;
}

function getZeroPropostaMonths(
  row: BudgetRow,
  startMonth: number,
  endMonth: number,
  userType: "gestor" | "financeiro",
  isSintetico?: boolean,
): number[] {
  const months = new Set<number>();

  if (isSintetico) {
    Object.entries(row.monthlyData).forEach(([monthKey, monthData]) => {
      const month = Number(monthKey);
      if (isMonthVisible(month, startMonth, endMonth) &&
        isPendingForUserType(monthData, userType)) {
        months.add(month);
      }
    });
    return Array.from(months).sort((a, b) => a - b);
  }

  const visit = (current: BudgetRow) => {
    if (current.level === "subconta") {
      Object.entries(current.monthlyData).forEach(([monthKey, monthData]) => {
        const month = Number(monthKey);
        const isPendente = isPendingForUserType(monthData, userType);

        if (isMonthVisible(month, startMonth, endMonth) && isPendente) {
          months.add(month);
        }
      });
      return;
    }

    current.children?.forEach(visit);
  };

  row.children?.forEach(visit);
  return Array.from(months).sort((a, b) => a - b);
}

function formatPendingTooltip(
  months: number[],
  userType: "gestor" | "financeiro",
) {
  if (months.length === 12) {
    return userType === "gestor"
      ? "Proposta zerada em todos os meses"
      : "Orçamento não preenchido em todos os meses";
  }

  if (months.length > 4) {
    return userType === "gestor"
      ? `Proposta zerada em ${months.length} meses`
      : `Orçamento não preenchido em ${months.length} meses`;
  }

  if (months.length === 1) {
    return userType === "gestor"
      ? `Proposta zerada em ${monthNames[months[0] - 1]}`
      : `Orçamento não preenchido em ${monthNames[months[0] - 1]}`;
  }

  const labels = months.map((month) => monthNames[month - 1]);
  const lastLabel = labels.pop();
  return userType === "gestor"
    ? `Proposta zerada em ${labels.join(", ")} e ${lastLabel}`
    : `Orçamento não preenchido em ${labels.join(", ")} e ${lastLabel}`;
}

interface ConfirmationModalProps {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onClose: () => void;
  isLoading: boolean;
}

function ConfirmationModal({
  open,
  title,
  description,
  onConfirm,
  onClose,
  isLoading,
}: ConfirmationModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl transition duration-200 ease-out transform">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        <div className="mt-6 flex flex-wrap gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
          >
            {isLoading ? "Aguarde..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function createEmptyMonthlyData(): Record<number, MonthlyData> {
  const monthlyData: Record<number, MonthlyData> = {} as Record<
    number,
    MonthlyData
  >;

  for (let month = 1; month <= 12; month++) {
    monthlyData[month] = {
      anterior: 0,
      proposta: 0,
      orcamento: 0,
    };
  }

  return monthlyData;
}

function getSafeMonthData(
  monthlyData: Record<number, MonthlyData>,
  month: number,
): MonthlyData {
  return (
    monthlyData[month] ?? {
      anterior: 0,
      proposta: 0,
      orcamento: 0,
      changeType: null,
    }
  );
}

function normalizeMonthlyData(
  monthlyData: Record<number, MonthlyData>,
): Record<number, MonthlyData> {
  const normalized = createEmptyMonthlyData();

  for (let month = 1; month <= 12; month++) {
    const current = getSafeMonthData(monthlyData, month);
    normalized[month] = {
      anterior: current.anterior ?? 0,
      proposta: current.proposta ?? 0,
      orcamento: current.orcamento ?? 0,
      changeType: current.changeType ?? null,
    };
  }

  return normalized;
}

function combineMonthlyData(
  first: Record<number, MonthlyData>,
  second: Record<number, MonthlyData>,
  operator: 1 | -1,
): Record<number, MonthlyData> {
  const result = createEmptyMonthlyData();

  for (let month = 1; month <= 12; month++) {
    const firstMonth = getSafeMonthData(first, month);
    const secondMonth = getSafeMonthData(second, month);

    result[month] = {
      anterior: firstMonth.anterior + secondMonth.anterior * operator,
      proposta: firstMonth.proposta + secondMonth.proposta * operator,
      orcamento: firstMonth.orcamento + secondMonth.orcamento * operator,
    };
  }

  return result;
}

function sumChildrenMonthlyData(
  row: BudgetRow,
  computedDataById: Map<string, Record<number, MonthlyData>>,
): Record<number, MonthlyData> {
  const total = createEmptyMonthlyData();

  row.children?.forEach((child) => {
    const childMonthlyData =
      computedDataById.get(child.id) ?? normalizeMonthlyData(child.monthlyData);

    for (let month = 1; month <= 12; month++) {
      const childMonth = getSafeMonthData(childMonthlyData, month);

      total[month] = {
        anterior: total[month].anterior + childMonth.anterior,
        proposta: total[month].proposta + childMonth.proposta,
        orcamento: total[month].orcamento + childMonth.orcamento,
      };
    }
  });

  return total;
}

function buildRowComputedData(
  row: BudgetRow,
  computedDataById: Map<string, Record<number, MonthlyData>>,
): Record<number, MonthlyData> {
  if (!row.children?.length) {
    const normalized = normalizeMonthlyData(row.monthlyData);
    computedDataById.set(row.id, normalized);
    return normalized;
  }

  row.children.forEach((child) => {
    buildRowComputedData(child, computedDataById);
  });

  const monthlyData = sumChildrenMonthlyData(row, computedDataById);
  computedDataById.set(row.id, monthlyData);
  return monthlyData;
}

function collectDescendantIds(row: BudgetRow): string[] {
  if (!row.children?.length) return [];

  return row.children.flatMap((child) => [
    child.id,
    ...collectDescendantIds(child),
  ]);
}

export const BudgetTable = forwardRef<BudgetTableActions, BudgetTableProps>(function BudgetTable({
  data,
  visibleData,
  onDataChange,
  onBaselineChange,
  onManualProposalEdit,
  startMonth,
  endMonth,
  userType,
  classificacao = 'A',
}: BudgetTableProps, ref) {
  const isSintetico = classificacao === 'S';
  const [expandedRows, setExpandedRows] = useState<Set<string>>(
    new Set(visibleData.filter((row) => row.isExpanded).map((row) => row.id)),
  );

  const dfcRowIds = visibleData
    .filter((row) => row.level === "dfc" && row.children?.length)
    .map((row) => row.id);
  const contaRowIds = visibleData.flatMap(
    (row) =>
      row.children
        ?.filter((child) => child.level === "conta" && child.children?.length)
        .map((child) => child.id) ?? [],
  );
  const rowById = useMemo(() => {
    const map = new Map<string, BudgetRow>();

    const visit = (row: BudgetRow) => {
      map.set(row.id, row);
      row.children?.forEach(visit);
    };

    visibleData.forEach(visit);
    return map;
  }, [visibleData]);

  const toggleRow = (rowId: string) => {
    if (isSintetico) return;
    setExpandedRows((prev) => {
      const next = new Set(prev);
      const row = rowById.get(rowId);

      if (next.has(rowId)) {
        next.delete(rowId);
        row?.children?.forEach((child) => {
          next.delete(child.id);
          collectDescendantIds(child).forEach((descendantId) =>
            next.delete(descendantId),
          );
        });
      } else {
        next.add(rowId);
      }

      return next;
    });
  };

  const setExpansionMode = (mode: "dfc" | "contas" | "subcontas") => {
    if (mode === "dfc") {
      setExpandedRows(new Set());
      return;
    }

    if (mode === "contas") {
      setExpandedRows(new Set(dfcRowIds));
      return;
    }

    setExpandedRows(new Set([...dfcRowIds, ...contaRowIds]));
  };

  const computedDataById = useMemo(() => {
    const map = new Map<string, Record<number, MonthlyData>>();

    visibleData.forEach((row) => {
      buildRowComputedData(row, map);
    });

    const receita = map.get("receita") ?? createEmptyMonthlyData();
    const custo = map.get("custo") ?? map.get("dfc-Custo") ?? createEmptyMonthlyData();
    const imposto = map.get("imposto") ?? map.get("dfc-Imposto") ?? createEmptyMonthlyData();
    const despesa = map.get("despesa") ?? map.get("dfc-Despesa") ?? createEmptyMonthlyData();
    const investimento = map.get("investimento") ?? map.get("dfc-Investimento") ?? createEmptyMonthlyData();

    const receitaMenosCusto = combineMonthlyData(receita, custo, -1);

    const margemBruta = combineMonthlyData(
      receitaMenosCusto,
      imposto,
      -1
    );

    const resultadoOperacional = combineMonthlyData(
      margemBruta,
      despesa,
      -1
    );

    const resultadoLiquido = combineMonthlyData(
      resultadoOperacional,
      investimento,
      -1
    );

    map.set("margem-bruta", margemBruta);
    map.set("resultado-operacional", resultadoOperacional);
    map.set("resultado-liquido", resultadoLiquido);

    return map;
  }, [visibleData]);

  const zeroPropostaByGroup = useMemo(() => {
    console.log('recalculando zeroPropostaByGroup');
    const map = new Map<
      string,
      {
        count: number;
        months: number[];
      }
    >();

    const visit = (row: BudgetRow) => {
      const isSummary = highlightedRows.has(row.dfc);
      if (row.level === "dfc" && !isSummary && (row.children?.length || isSintetico)) {
        // No Sintético, usar computedDataById para refletir edições
        const monthlyData = isSintetico
          ? (computedDataById.get(row.id) ?? row.monthlyData)
          : row.monthlyData;

        const rowForCount = isSintetico
          ? { ...row, monthlyData } as BudgetRow
          : row;
        console.log('row:', row.id, 'monthlyData jan proposta:', row.monthlyData[1]?.proposta, 'computed jan proposta:', monthlyData[1]?.proposta);
        map.set(row.id, {
          count: getZeroPropostaCount(rowForCount, startMonth, endMonth, userType, isSintetico),
          months: getZeroPropostaMonths(rowForCount, startMonth, endMonth, userType, isSintetico),
        });
      }

      row.children?.forEach(visit);
    };

    visibleData.forEach(visit);
    return map;
  }, [visibleData, computedDataById, startMonth, endMonth, userType, isSintetico]);

  const getZeroPropostaCountForGroup = (groupId: string) =>
    zeroPropostaByGroup.get(groupId)?.count ?? 0;

  const getZeroPropostaMonthsForGroup = (groupId: string) =>
    zeroPropostaByGroup.get(groupId)?.months ?? [];

  const showContaColumn = visibleData.some(
    (row) => row.children?.length && expandedRows.has(row.id),
  );
  const showSubcontaColumn = visibleData.some(
    (row) =>
      expandedRows.has(row.id) &&
      row.children?.some(
        (child) =>
          child.level === "conta" &&
          child.children?.length &&
          expandedRows.has(child.id),
      ),
  );

  const formatNumber = (num: number) =>
    new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);

  const formatPercent = (num: number) =>
    `${new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num)}%`;

  const calculatePercent = (value: number, base: number) => {
    if (base === 0) return 0;
    return (value / base) * 100;
  };

  const handleValueChange = (
    rowId: string,
    month: number,
    field: "proposta" | "orcamento",
    value: string,
  ) => {
    const numValue = parseFloat(value.replace(/\D/g, "")) || 0;

    if (field === "proposta") {
      onManualProposalEdit(rowId, month);
    }

    const updateRow = (row: BudgetRow): BudgetRow => {
      if (row.id === rowId) {
        return {
          ...row,
          monthlyData: {
            ...row.monthlyData,
            [month]: {
              ...row.monthlyData[month],
              [field]: numValue,
              ...(field === "proposta" ? { changeType: "manual" } : {}),
            },
          },
        };
      }

      if (row.children) {
        return {
          ...row,
          children: row.children.map(updateRow),
        };
      }

      return row;
    };

    onDataChange(data.map(updateRow));
  };

  const updateMonthlyDataRows = (
    rows: BudgetRow[],
    updater: (monthData: MonthlyData) => MonthlyData,
  ): BudgetRow[] => {
    return rows.map((row) => ({
      ...row,
      monthlyData: Object.fromEntries(
        Object.entries(row.monthlyData).map(([month, monthData]) => [
          month,
          updater(monthData),
        ]),
      ) as { [month: number]: MonthlyData },
      children: row.children
        ? updateMonthlyDataRows(row.children, updater)
        : row.children,
    }));
  };

  const [confirmationState, setConfirmationState] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  const [isActionLoading, setIsActionLoading] = useState(false);
  const [preCopySnapshot, setPreCopySnapshot] = useState<BudgetRow[] | null>(null);

  const showSuccessToast = (message: string) =>
    toast.success(message, { position: "top-right", duration: 3000 });

  const showErrorToast = (message: string) =>
    toast.error(message, { position: "top-right", duration: 3000 });

  const openConfirmationModal = (
    title: string,
    description: string,
    onConfirm: () => void,
  ) => {
    setConfirmationState({ title, description, onConfirm });
  };

  const closeConfirmationModal = () => setConfirmationState(null);

  const performAction = (
    action: () => void,
    successMessage: string,
  ) => {
    setIsActionLoading(true);

    try {
      action();
      showSuccessToast(successMessage);
    } catch (error) {
      console.error("Erro ao executar operação:", error);
      showErrorToast("Não foi possível realizar a operação.");
    } finally {
      setIsActionLoading(false);
      closeConfirmationModal();
    }
  };

  const performCopy = (
    sourceField: "anterior" | "proposta" | "orcamento",
    targetField: "anterior" | "proposta" | "orcamento",
    successMessage: string,
  ) => {
    performAction(
      () =>
        onDataChange(
          updateMonthlyDataRows(data, (monthData) => ({
            ...monthData,
            [targetField]: monthData[sourceField],
            ...(targetField === "proposta" || targetField === "orcamento"
              ? { changeType: "copy" }
              : {}),
          })),
        ),
      successMessage,
    );
  };

  const copyAnteriorToProposta = () => {
    const snapshot = JSON.parse(JSON.stringify(data)) as BudgetRow[];
    openConfirmationModal(
      "Confirmar ação",
      "Deseja copiar os valores de Anterior para Proposta?",
      () => {
        setPreCopySnapshot(snapshot);
        performCopy("anterior", "proposta", "Dados copiados com sucesso!");
      },
    );
  };

  const copyPropostaToOrcamento = () => {
    const snapshot = JSON.parse(JSON.stringify(data)) as BudgetRow[];
    openConfirmationModal(
      "Confirmar ação",
      "Deseja copiar os valores de Proposta para Orçamento?",
      () => {
        setPreCopySnapshot(snapshot);
        performCopy("proposta", "orcamento", "Dados copiados com sucesso!");
      },
    );
  };

  const revertCopy = (field: "proposta" | "orcamento") => {
    if (!preCopySnapshot) return;

    const snapshotMap = new Map<string, BudgetRow>();
    const buildSnapshotMap = (rows: BudgetRow[]) => {
      rows.forEach((row) => {
        snapshotMap.set(row.id, row);
        if (row.children) buildSnapshotMap(row.children);
      });
    };
    buildSnapshotMap(preCopySnapshot);

    const revertRow = (row: BudgetRow): BudgetRow => {
      if (row.level === "subconta") {
        const snapshotRow = snapshotMap.get(row.id);
        if (!snapshotRow) return row;

        return {
          ...row,
          monthlyData: Object.fromEntries(
            Object.entries(row.monthlyData).map(([monthKey, monthData]) => {
              if (monthData.changeType === "copy") {
                const snapshotMonth = snapshotRow.monthlyData[Number(monthKey)];
                return [
                  monthKey,
                  {
                    ...monthData,
                    [field]: snapshotMonth?.[field] ?? 0,
                    changeType: null,
                  },
                ];
              }
              return [monthKey, monthData];
            }),
          ) as BudgetRow["monthlyData"],
        };
      }

      return { ...row, children: row.children?.map(revertRow) };
    };

    performAction(
      () => {
        onDataChange(data.map(revertRow));
        setPreCopySnapshot(null);
      },
      "Cópia desfeita com sucesso!",
    );
  };

  const handleRevertCopy = () => {
    const field = userType === "gestor" ? "proposta" : "orcamento";
    const label =
      userType === "gestor"
        ? "Os valores de Proposta copiados de Anterior serão revertidos. "
        : "Os valores de Orçamento copiados da Proposta serão revertidos. ";

    openConfirmationModal(
      "Desfazer cópia",
      label + "Atenção: edições manuais feitas após a cópia serão mantidas.",
      () => revertCopy(field),
    );
  };

  const handleResetPropostaOrcamento = () =>
    openConfirmationModal(
      "Confirmar ação",
      "Deseja zerar todos os valores de Proposta e Orçamento?",
      () =>
        performAction(
          () =>
            onDataChange(
              updateMonthlyDataRows(data, (monthData) => ({
                ...monthData,
                proposta: 0,
                orcamento: 0,
                changeType: "reset",
              })),
            ),
          "Operação realizada com sucesso!",
        ),
    );

  const handleFillPropostaOrcamento = () =>
    openConfirmationModal(
      "Confirmar ação",
      "Deseja preencher todos os valores de Proposta e Orçamento para teste?",
      () =>
        performAction(
          () =>
            onDataChange(
              updateMonthlyDataRows(data, (monthData) => {
                const fillValue = monthData.anterior || 1000;
                return {
                  ...monthData,
                  proposta: fillValue,
                  orcamento: fillValue,
                  changeType: "copy",
                };
              }),
            ),
          "Operação realizada com sucesso!",
        ),
    );

  useImperativeHandle(
    ref,
    () => ({
      openFillPropostaOrcamento: handleFillPropostaOrcamento,
      openResetPropostaOrcamento: handleResetPropostaOrcamento,
      clearCopySnapshot: () => setPreCopySnapshot(null),
    }),
    [],
  );

  const visibleMonths = Array.from(
    { length: endMonth - startMonth + 1 },
    (_, index) => startMonth + index,
  );
  const lastStickyShadow = "8px 0 10px -12px rgba(15, 23, 42, 0.22)";
  const controlButtonClassName =
    "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900";

  const renderToggle = (rowId: string, isExpanded: boolean) => {
    if (isSintetico) return null;
    return (
      <button
        onClick={() => toggleRow(rowId)}
        className="hover:bg-gray-200 rounded p-0.5 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>
    );
  };

  const renderTotalLabel = () => (
    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-800">
      Total
    </span>
  );

  const renderRow = (row: BudgetRow): ReactElement[] => {
    const rowMonthlyData = computedDataById.get(row.id) ?? row.monthlyData;
    const isGestor = userType === "gestor";
    const isFinanceiro = userType === "financeiro";
    const isExpanded = expandedRows.has(row.id);
    const hasChildren = Boolean(row.children?.length);
    const isSummaryRow = highlightedRows.has(row.dfc);
    const isLeafRow = !hasChildren;
    const isRevenueEditable = row.id === "receita";
    const isSinteticoDfcEditable = isSintetico && row.level === "dfc" && !isSummaryRow;
    const canEditValues =
      (row.editable && isLeafRow && !isSummaryRow) ||
      isRevenueEditable ||
      isSinteticoDfcEditable;
    const canEditProposta = canEditValues && isGestor;
    const canEditOrcamento = canEditValues && isFinanceiro;
    const hidePercentages = row.dfc === "Receita";
    const showInlineTotal = isExpanded && hasChildren && !isSummaryRow;
    const outerDividerClassName = showInlineTotal
      ? "border-slate-300"
      : isSummaryRow
        ? "border-white/20"
        : "border-gray-200";
    const innerDividerClassName = showInlineTotal
      ? "border-slate-300"
      : isSummaryRow
        ? "border-white/15"
        : "border-gray-100";
    const rowClassName = isSummaryRow
      ? "bg-[#0066A1] text-white font-semibold"
      : showInlineTotal
        ? "bg-[#cbd5e1] text-slate-950 font-semibold"
        : "bg-white text-gray-900";
    const stickyCellClassName = isSummaryRow
      ? "bg-[#0066A1] text-white"
      : showInlineTotal
        ? "bg-[#cbd5e1] text-slate-950 font-semibold"
        : "bg-white text-gray-900";
    const totalColumnClassName = isSummaryRow
      ? "bg-[#0066A1] text-white border-r border-white/20 p-0"
      : showInlineTotal
        ? "bg-[#cbd5e1] text-slate-950 font-semibold border-r border-slate-300 p-0"
        : "bg-white text-gray-900 border-r border-gray-200 p-0";

    const zeroPropostaCount =
      row.level === "dfc" && (row.children?.length || isSintetico)
        ? getZeroPropostaCountForGroup(row.id)
        : 0;
    const zeroPropostaMonths =
      row.level === "dfc" && zeroPropostaCount > 0
        ? getZeroPropostaMonthsForGroup(row.id)
        : [];
    const zeroPropostaTooltip =
      zeroPropostaMonths.length > 0
        ? formatPendingTooltip(zeroPropostaMonths, userType)
        : undefined;

    const rows: ReactElement[] = [
      <tr key={row.id} className={`${rowClassName} border-b border-gray-200`}>
        <td
          className={`sticky z-30 border-r px-4 py-3 min-w-[180px] w-[180px] ${stickyCellClassName} ${outerDividerClassName}`}
          style={{
            left: 0,
            boxShadow: !showContaColumn ? lastStickyShadow : undefined,
          }}
        >
          {row.level === "dfc" ? (
            <div className="flex items-center gap-2">
              {hasChildren && renderToggle(row.id, isExpanded)}
              <span className={isSummaryRow ? "font-semibold" : ""}>
                {row.dfc}
              </span>
              {zeroPropostaCount > 0 ? (
                <Tooltip
                  content={
                    <div className="space-y-1">
                      <span className="block text-[10px] font-semibold uppercase tracking-wide text-[#0066A1]">
                        Pendência
                      </span>
                      <span className="block leading-snug text-slate-700">
                        {zeroPropostaTooltip}
                      </span>
                    </div>
                  }
                  variant="light-accent"
                  side="top"
                  align="center"
                >
                  <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-100 px-2 text-xs font-semibold text-rose-600">
                    {zeroPropostaCount}
                  </span>
                </Tooltip>
              ) : null}
            </div>
          ) : null}
        </td>

        {showContaColumn && (
          <td
            className={`sticky z-30 border-r px-4 py-3 min-w-[200px] w-[200px] ${stickyCellClassName} ${outerDividerClassName}`}
            style={{
              left: DFC_COLUMN_WIDTH,
              boxShadow: !showSubcontaColumn ? lastStickyShadow : undefined,
            }}
          >
            {row.level === "conta" ? (
              <div className="flex items-center gap-2">
                {hasChildren && renderToggle(row.id, isExpanded)}
                <span>{row.conta}</span>
              </div>
            ) : row.level === "dfc" && showInlineTotal ? (
              <div className="pl-6">{renderTotalLabel()}</div>
            ) : null}
          </td>
        )}

        {showSubcontaColumn && (
          <td
            className={`sticky z-30 border-r px-4 py-3 min-w-[220px] w-[220px] ${stickyCellClassName} ${outerDividerClassName}`}
            style={{
              left: DFC_COLUMN_WIDTH + CONTA_COLUMN_WIDTH,
              boxShadow: lastStickyShadow,
            }}
          >
            {row.level === "subconta" ? (
              row.subconta
            ) : row.level === "conta" && showInlineTotal ? (
              <div className="pl-6">{renderTotalLabel()}</div>
            ) : null}
          </td>
        )}

        {visibleMonths.map((month) => {
          const monthData = rowMonthlyData[month];
          const displayedProposta = getDisplayedPropostaValue(
            monthData,
            userType,
          );
          const displayedOrcamento = isGestor ? 0 : monthData.orcamento;
          const percentAnterior = calculatePercent(
            displayedProposta,
            monthData.anterior,
          );
          const percentProposta = calculatePercent(
            displayedOrcamento,
            displayedProposta,
          );

          return (
            <td
              key={`${row.id}-month-${month}`}
              colSpan={5}
              className={`p-0 border-r ${outerDividerClassName}`}
            >
              <div className="flex">
                <div
                  className={`flex-1 px-3 py-3 text-right border-r min-w-[100px] ${innerDividerClassName}`}
                >
                  <span>{formatNumber(monthData.anterior)}</span>
                </div>

                <div
                  className={`flex-1 px-3 py-3 text-right border-r min-w-[80px] text-sm ${innerDividerClassName}`}
                >
                  {hidePercentages ? "" : formatPercent(percentAnterior)}
                </div>

                <div
                  className={`flex-1 px-3 py-3 text-right border-r min-w-[100px] ${innerDividerClassName}`}
                >
                  {canEditValues ? (
                    <div className="relative">
                      <input
                        type="text"
                        value={formatNumber(displayedProposta)}
                        disabled={isFinanceiro}
                        onChange={(event) => {
                          if (isFinanceiro) return;

                          handleValueChange(
                            row.id,
                            month,
                            "proposta",
                            event.target.value,
                          );
                        }}
                        className={`w-full text-right border-none outline-none rounded px-1 pr-4 ${
                          isRevenueEditable
                            ? "bg-transparent text-white placeholder:text-white/70 focus:bg-white focus:text-slate-900"
                            : "bg-transparent text-inherit focus:bg-blue-50"
                        } ${isFinanceiro ? "cursor-not-allowed opacity-80" : ""}`}
                      />
                      {isFinanceiro ? (
                        <Lock className="pointer-events-none absolute right-0.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-slate-400/80" />
                      ) : (
                        <Pencil className="pointer-events-none absolute right-0.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-slate-400/80" />
                      )}
                    </div>
                  ) : (
                    <span>{formatNumber(displayedProposta)}</span>
                  )}
                </div>

                <div
                  className={`flex-1 px-3 py-3 text-right border-r min-w-[80px] text-sm ${innerDividerClassName}`}
                >
                  {hidePercentages ? "" : formatPercent(percentProposta)}
                </div>

                <div className="flex-1 px-3 py-3 text-right min-w-[100px]">
                  {canEditValues ? (
                    <div className="relative">
                      <input
                        type="text"
                        value={formatNumber(displayedOrcamento)}
                        disabled={isGestor}
                        onChange={(event) => {
                          if (isGestor) return;

                          handleValueChange(
                            row.id,
                            month,
                            "orcamento",
                            event.target.value,
                          );
                        }}
                        className={`w-full text-right border-none outline-none rounded px-1 pr-4 ${
                          isRevenueEditable
                            ? "bg-transparent text-white placeholder:text-white/70 focus:bg-white focus:text-slate-900"
                            : "bg-transparent text-inherit focus:bg-blue-50"
                        } ${isGestor ? "cursor-not-allowed opacity-80" : ""}`}
                      />
                      {isGestor ? (
                        <Lock className="pointer-events-none absolute right-0.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-slate-400/80" />
                      ) : (
                        <Pencil className="pointer-events-none absolute right-0.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-slate-400/80" />
                      )}
                    </div>
                  ) : (
                    <span>{formatNumber(displayedOrcamento)}</span>
                  )}
                </div>
              </div>
            </td>
          );
        })}

        {(["anterior", "proposta", "orcamento"] as const).map((field) => {
          const totalValue = Object.values(rowMonthlyData).reduce(
            (sum, monthData) => sum + monthData[field],
            0,
          );

          return (
            <td
              key={`${row.id}-${field}-total`}
              colSpan={2}
              className={totalColumnClassName}
            >
              <div className="flex">
                <div className="flex-1 px-3 py-3 text-right min-w-[100px]">
                  {formatNumber(totalValue)}
                </div>
                <div className="flex-1 px-3 py-3 text-right min-w-[80px]">
                  {hidePercentages ? "" : formatPercent(0)}
                </div>
              </div>
            </td>
          );
        })}

        <td colSpan={2} className={totalColumnClassName}>
          <div className="flex">
            <div className="flex-1 px-3 py-3 text-right min-w-[100px]">
              {formatNumber(
                Object.values(rowMonthlyData).reduce(
                  (sum, monthData) => sum + monthData.orcamento,
                  0,
                ) / visibleMonths.length,
              )}
            </div>
            <div className="flex-1 px-3 py-3 text-right min-w-[80px]">
              {hidePercentages ? "" : formatPercent(0)}
            </div>
          </div>
        </td>
      </tr>,
    ];

    if (isExpanded && hasChildren) {
      row.children!.forEach((child) => {
        rows.push(...renderRow(child));
      });
    }

    return rows;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-slate-50 px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Exibicao
        </span>
        {!isSintetico && (
          <>
            <button
              className={controlButtonClassName}
              onClick={() => setExpansionMode("dfc")}
            >
              Somente DFC
            </button>
            <button
              className={controlButtonClassName}
              onClick={() => setExpansionMode("contas")}
            >
              Abrir Contas
            </button>
            <button
              className={controlButtonClassName}
              onClick={() => setExpansionMode("subcontas")}
            >
              Abrir Subcontas
            </button>
          </>
        )}
        {userType === "gestor" ? (
          <button
            className={controlButtonClassName}
            onClick={copyAnteriorToProposta}
          >
            Copiar Anterior → Proposta
          </button>
        ) : null}
        {userType === "gestor" && preCopySnapshot !== null ? (
          <button
            className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:border-amber-300 hover:bg-amber-100"
            onClick={handleRevertCopy}
          >
            Desfazer cópia
          </button>
        ) : null}
        {userType !== "gestor" ? (
          <button
            className={controlButtonClassName}
            onClick={copyPropostaToOrcamento}
          >
            Copiar Proposta → Orçamento
          </button>
        ) : null}
        {userType !== "gestor" && preCopySnapshot !== null ? (
          <button
            className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:border-amber-300 hover:bg-amber-100"
            onClick={handleRevertCopy}
          >
            Desfazer cópia
          </button>
        ) : null}
      </div>
      <ConfirmationModal
        open={Boolean(confirmationState)}
        title={confirmationState?.title ?? "Confirmar ação"}
        description={confirmationState?.description ?? "Deseja confirmar essa ação?"}
        onConfirm={() => confirmationState?.onConfirm()}
        onClose={closeConfirmationModal}
        isLoading={isActionLoading}
      />
      <div
        className="overflow-auto max-h-[calc(100vh-280px)]"
        style={{ maxWidth: "100%" }}
      >
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead className="sticky top-0 z-40">
            <tr className="bg-[#0066A1] text-white border-b border-white">
              <th
                className="sticky z-50 bg-[#0066A1] border-r border-white px-4 py-3 text-left min-w-[180px]"
                style={{
                  left: 0,
                  width: DFC_COLUMN_WIDTH,
                  boxShadow: !showContaColumn ? lastStickyShadow : undefined,
                }}
              >
                DFC
              </th>

              {showContaColumn && (
                <th
                  className="sticky z-50 bg-[#0066A1] border-r border-white px-4 py-3 text-left min-w-[200px]"
                  style={{
                    left: DFC_COLUMN_WIDTH,
                    width: CONTA_COLUMN_WIDTH,
                    boxShadow: !showSubcontaColumn
                      ? lastStickyShadow
                      : undefined,
                  }}
                >
                  Conta
                </th>
              )}

              {showSubcontaColumn && (
                <th
                  className="sticky z-50 bg-[#0066A1] border-r border-white px-4 py-3 text-left min-w-[220px]"
                  style={{
                    left: DFC_COLUMN_WIDTH + CONTA_COLUMN_WIDTH,
                    width: SUBCONTA_COLUMN_WIDTH,
                    boxShadow: lastStickyShadow,
                  }}
                >
                  Subconta
                </th>
              )}

              {visibleMonths.map((month) => (
                <th
                  key={month}
                  colSpan={5}
                  className="bg-[#0066A1] px-4 py-3 text-center border-r border-white font-semibold"
                >
                  {monthNames[month - 1]}
                </th>
              ))}

              <th
                colSpan={2}
                className="bg-[#0066A1] px-4 py-3 text-center border-r border-white font-semibold"
              >
                Total Anterior
              </th>
              <th
                colSpan={2}
                className="bg-[#0066A1] px-4 py-3 text-center border-r border-white font-semibold"
              >
                Total Proposta
              </th>
              <th
                colSpan={2}
                className="bg-[#0066A1] px-4 py-3 text-center border-r border-white font-semibold"
              >
                Total Orcamento
              </th>
              <th
                colSpan={2}
                className="bg-[#0066A1] px-4 py-3 text-center border-r border-white font-semibold"
              >
                Media Mensal Orcamentaria
              </th>
            </tr>

            <tr className="bg-[#3399CC] text-white text-xs">
              <th
                className="sticky z-50 bg-[#3399CC] border-r border-white px-4 py-2"
                style={{
                  left: 0,
                  width: DFC_COLUMN_WIDTH,
                  boxShadow: !showContaColumn ? lastStickyShadow : undefined,
                }}
              ></th>

              {showContaColumn && (
                <th
                  className="sticky z-50 bg-[#3399CC] border-r border-white px-4 py-2"
                  style={{
                    left: DFC_COLUMN_WIDTH,
                    width: CONTA_COLUMN_WIDTH,
                    boxShadow: !showSubcontaColumn
                      ? lastStickyShadow
                      : undefined,
                  }}
                ></th>
              )}

              {showSubcontaColumn && (
                <th
                  className="sticky z-50 bg-[#3399CC] border-r border-white px-4 py-2"
                  style={{
                    left: DFC_COLUMN_WIDTH + CONTA_COLUMN_WIDTH,
                    width: SUBCONTA_COLUMN_WIDTH,
                    boxShadow: lastStickyShadow,
                  }}
                ></th>
              )}

              {visibleMonths.map((month) => (
                <th
                  key={`header-${month}`}
                  colSpan={5}
                  className="bg-[#3399CC] p-0 border-r border-white"
                >
                  <div className="flex text-center">
                    <div className="flex-1 px-2 py-2 border-r border-white min-w-[100px]">
                      Anterior R$
                    </div>
                    <div className="flex-1 px-2 py-2 border-r border-white min-w-[80px]">
                      %
                    </div>
                    <div className="flex-1 px-2 py-2 border-r border-white min-w-[100px]">
                      Proposta R$
                    </div>
                    <div className="flex-1 px-2 py-2 border-r border-white min-w-[80px]">
                      %
                    </div>
                    <div className="flex-1 px-2 py-2 min-w-[100px]">
                      Orcamento R$
                    </div>
                  </div>
                </th>
              ))}

              <th
                colSpan={2}
                className="bg-[#3399CC] p-0 border-r border-white"
              >
                <div className="flex text-center">
                  <div className="flex-1 px-2 py-2 border-r border-white min-w-[100px]">
                    R$
                  </div>
                  <div className="flex-1 px-2 py-2 min-w-[80px]">%</div>
                </div>
              </th>
              <th
                colSpan={2}
                className="bg-[#3399CC] p-0 border-r border-white"
              >
                <div className="flex text-center">
                  <div className="flex-1 px-2 py-2 border-r border-white min-w-[100px]">
                    R$
                  </div>
                  <div className="flex-1 px-2 py-2 min-w-[80px]">%</div>
                </div>
              </th>
              <th
                colSpan={2}
                className="bg-[#3399CC] p-0 border-r border-white"
              >
                <div className="flex text-center">
                  <div className="flex-1 px-2 py-2 border-r border-white min-w-[100px]">
                    R$
                  </div>
                  <div className="flex-1 px-2 py-2 min-w-[80px]">%</div>
                </div>
              </th>
              <th
                colSpan={2}
                className="bg-[#3399CC] p-0 border-r border-white"
              >
                <div className="flex text-center">
                  <div className="flex-1 px-2 py-2 border-r border-white min-w-[100px]">
                    R$
                  </div>
                  <div className="flex-1 px-2 py-2 min-w-[80px]">%</div>
                </div>
              </th>
            </tr>
          </thead>

          <tbody>{visibleData.map((row) => renderRow(row))}</tbody>
        </table>
      </div>
    </div>
  );
});