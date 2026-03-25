import { ReactElement, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { BudgetRow, MonthlyData } from '../types/budget';

interface BudgetTableProps {
  data: BudgetRow[];
  onDataChange: (data: BudgetRow[]) => void;
  startMonth: number;
  endMonth: number;
}

const DFC_COLUMN_WIDTH = 180;
const CONTA_COLUMN_WIDTH = 200;
const SUBCONTA_COLUMN_WIDTH = 220;

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
];

const highlightedRows = new Set([
  'Receita',
  'Margem Bruta',
  'Resultado Operacional',
  'Resultado Liquido',
]);

function createEmptyMonthlyData(): Record<number, MonthlyData> {
  const monthlyData: Record<number, MonthlyData> = {} as Record<number, MonthlyData>;

  for (let month = 1; month <= 12; month++) {
    monthlyData[month] = {
      anterior: 0,
      proposta: 0,
      orcamento: 0,
    };
  }

  return monthlyData;
}

function combineMonthlyData(
  first: Record<number, MonthlyData>,
  second: Record<number, MonthlyData>,
  operator: 1 | -1
): Record<number, MonthlyData> {
  const result = createEmptyMonthlyData();

  for (let month = 1; month <= 12; month++) {
    result[month] = {
      anterior: first[month].anterior + second[month].anterior * operator,
      proposta: first[month].proposta + second[month].proposta * operator,
      orcamento: first[month].orcamento + second[month].orcamento * operator,
    };
  }

  return result;
}

function sumChildrenMonthlyData(
  row: BudgetRow,
  computedDataById: Map<string, Record<number, MonthlyData>>
): Record<number, MonthlyData> {
  const total = createEmptyMonthlyData();

  row.children?.forEach((child) => {
    const childMonthlyData = computedDataById.get(child.id) ?? child.monthlyData;

    for (let month = 1; month <= 12; month++) {
      total[month] = {
        anterior: total[month].anterior + childMonthlyData[month].anterior,
        proposta: total[month].proposta + childMonthlyData[month].proposta,
        orcamento: total[month].orcamento + childMonthlyData[month].orcamento,
      };
    }
  });

  return total;
}

function buildRowComputedData(
  row: BudgetRow,
  computedDataById: Map<string, Record<number, MonthlyData>>
): Record<number, MonthlyData> {
  if (!row.children?.length) {
    computedDataById.set(row.id, row.monthlyData);
    return row.monthlyData;
  }

  row.children.forEach((child) => {
    buildRowComputedData(child, computedDataById);
  });

  const monthlyData = sumChildrenMonthlyData(row, computedDataById);
  computedDataById.set(row.id, monthlyData);
  return monthlyData;
}

export function BudgetTable({ data, onDataChange, startMonth, endMonth }: BudgetTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(
    new Set(data.filter((row) => row.isExpanded).map((row) => row.id))
  );

  const toggleRow = (rowId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);

      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }

      return next;
    });
  };

  const computedDataById = useMemo(() => {
    const map = new Map<string, Record<number, MonthlyData>>();

    data.forEach((row) => {
      buildRowComputedData(row, map);
    });

    const receita = map.get('receita') ?? createEmptyMonthlyData();
    const custo = map.get('custo') ?? createEmptyMonthlyData();
    const imposto = map.get('imposto') ?? createEmptyMonthlyData();
    const despesa = map.get('despesa') ?? createEmptyMonthlyData();
    const investimento = map.get('investimento') ?? createEmptyMonthlyData();

    const margemBruta = combineMonthlyData(
      combineMonthlyData(receita, custo, -1),
      imposto,
      -1
    );
    const resultadoOperacional = combineMonthlyData(margemBruta, despesa, -1);
    const resultadoLiquido = combineMonthlyData(resultadoOperacional, investimento, -1);

    map.set('margem-bruta', margemBruta);
    map.set('resultado-operacional', resultadoOperacional);
    map.set('resultado-liquido', resultadoLiquido);

    return map;
  }, [data]);

  const showContaColumn = data.some(
    (row) => row.level === 'dfc' && row.children?.length && expandedRows.has(row.id)
  );
  const showSubcontaColumn = data.some((row) =>
    row.children?.some(
      (child) => child.level === 'conta' && child.children?.length && expandedRows.has(child.id)
    )
  );

  const formatNumber = (num: number) =>
    new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);

  const formatPercent = (num: number) =>
    `${new Intl.NumberFormat('pt-BR', {
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
    field: 'proposta' | 'orcamento',
    value: string
  ) => {
    const numValue = parseFloat(value.replace(/\D/g, '')) || 0;

    const updateRow = (row: BudgetRow): BudgetRow => {
      if (row.id === rowId) {
        return {
          ...row,
          monthlyData: {
            ...row.monthlyData,
            [month]: {
              ...row.monthlyData[month],
              [field]: numValue,
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

  const visibleMonths = Array.from(
    { length: endMonth - startMonth + 1 },
    (_, index) => startMonth + index
  );
  const lastStickyShadow = '2px 0 0 #d1d5db, 10px 0 12px -12px rgba(15, 23, 42, 0.35)';

  const renderToggle = (rowId: string, isExpanded: boolean) => (
    <button
      onClick={() => toggleRow(rowId)}
      className="hover:bg-gray-200 rounded p-0.5 transition-colors"
    >
      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
    </button>
  );

  const renderRow = (row: BudgetRow): ReactElement[] => {
    const rowMonthlyData = computedDataById.get(row.id) ?? row.monthlyData;
    const isExpanded = expandedRows.has(row.id);
    const hasChildren = Boolean(row.children?.length);
    const isSummaryRow = highlightedRows.has(row.dfc);
    const isLeafRow = !hasChildren;
    const canEditValues = row.editable && isLeafRow && !isSummaryRow;
    const hidePercentages = row.dfc === 'Receita';
    const rowClassName = isSummaryRow
      ? 'bg-[#0066A1] text-white font-semibold'
      : 'bg-white text-gray-900';
    const stickyCellClassName = isSummaryRow
      ? 'bg-[#0066A1] text-white'
      : 'bg-white text-gray-900';
    const totalColumnClassName = isSummaryRow
      ? 'bg-[#0066A1] text-white border-r border-gray-200 p-0'
      : 'bg-white text-gray-900 border-r border-gray-200 p-0';

    const rows: ReactElement[] = [
      <tr key={row.id} className={`${rowClassName} border-b border-gray-200`}>
        <td
          className={`sticky z-30 border-r border-gray-200 px-4 py-3 min-w-[180px] w-[180px] ${stickyCellClassName}`}
          style={{
            left: 0,
            boxShadow: !showContaColumn ? lastStickyShadow : undefined,
          }}
        >
          {row.level === 'dfc' ? (
            <div className="flex items-center gap-2">
              {hasChildren && renderToggle(row.id, isExpanded)}
              <span className={isSummaryRow ? 'font-semibold' : ''}>{row.dfc}</span>
            </div>
          ) : null}
        </td>

        {showContaColumn && (
          <td
            className={`sticky z-30 border-r border-gray-200 px-4 py-3 min-w-[200px] w-[200px] ${stickyCellClassName}`}
            style={{
              left: DFC_COLUMN_WIDTH,
              boxShadow: !showSubcontaColumn ? lastStickyShadow : undefined,
            }}
          >
            {row.level === 'conta' ? (
              <div className="flex items-center gap-2">
                {hasChildren && renderToggle(row.id, isExpanded)}
                <span>{row.conta}</span>
              </div>
            ) : null}
          </td>
        )}

        {showSubcontaColumn && (
          <td
            className={`sticky z-30 border-r border-gray-200 px-4 py-3 min-w-[220px] w-[220px] ${stickyCellClassName}`}
            style={{
              left: DFC_COLUMN_WIDTH + CONTA_COLUMN_WIDTH,
              boxShadow: lastStickyShadow,
            }}
          >
            {row.level === 'subconta' ? row.subconta : null}
          </td>
        )}

        {visibleMonths.map((month) => {
          const monthData = rowMonthlyData[month];
          const percentAnterior = calculatePercent(monthData.proposta, monthData.anterior);
          const percentProposta = calculatePercent(monthData.orcamento, monthData.proposta);

          return (
            <td key={`${row.id}-month-${month}`} colSpan={5} className="p-0 border-r border-gray-200">
              <div className="flex">
                <div className="flex-1 px-3 py-3 text-right border-r border-gray-100 min-w-[100px]">
                  <span>{formatNumber(monthData.anterior)}</span>
                </div>

                <div className="flex-1 px-3 py-3 text-right border-r border-gray-100 min-w-[80px] text-sm">
                  {hidePercentages ? '' : formatPercent(percentAnterior)}
                </div>

                <div className="flex-1 px-3 py-3 text-right border-r border-gray-100 min-w-[100px]">
                  {canEditValues ? (
                    <input
                      type="text"
                      value={formatNumber(monthData.proposta)}
                      onChange={(event) =>
                        handleValueChange(row.id, month, 'proposta', event.target.value)
                      }
                      className="w-full text-right bg-transparent border-none outline-none focus:bg-blue-50 rounded px-1"
                    />
                  ) : (
                    <span>{formatNumber(monthData.proposta)}</span>
                  )}
                </div>

                <div className="flex-1 px-3 py-3 text-right border-r border-gray-100 min-w-[80px] text-sm">
                  {hidePercentages ? '' : formatPercent(percentProposta)}
                </div>

                <div className="flex-1 px-3 py-3 text-right min-w-[100px]">
                  {canEditValues ? (
                    <input
                      type="text"
                      value={formatNumber(monthData.orcamento)}
                      onChange={(event) =>
                        handleValueChange(row.id, month, 'orcamento', event.target.value)
                      }
                      className="w-full text-right bg-transparent border-none outline-none focus:bg-blue-50 rounded px-1"
                    />
                  ) : (
                    <span>{formatNumber(monthData.orcamento)}</span>
                  )}
                </div>
              </div>
            </td>
          );
        })}

        {(['anterior', 'proposta', 'orcamento'] as const).map((field) => {
          const totalValue = Object.values(rowMonthlyData).reduce(
            (sum, monthData) => sum + monthData[field],
            0
          );

          return (
            <td key={`${row.id}-${field}-total`} colSpan={2} className={totalColumnClassName}>
              <div className="flex">
                <div className="flex-1 px-3 py-3 text-right min-w-[100px]">
                  {formatNumber(totalValue)}
                </div>
                <div className="flex-1 px-3 py-3 text-right min-w-[80px]">
                  {hidePercentages ? '' : formatPercent(0)}
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
                  0
                ) / visibleMonths.length
              )}
            </div>
            <div className="flex-1 px-3 py-3 text-right min-w-[80px]">
              {hidePercentages ? '' : formatPercent(0)}
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
      <div className="overflow-auto max-h-[calc(100vh-280px)]" style={{ maxWidth: '100%' }}>
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
                    boxShadow: !showSubcontaColumn ? lastStickyShadow : undefined,
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

              <th colSpan={2} className="bg-[#0066A1] px-4 py-3 text-center border-r border-white font-semibold">
                Total Anterior
              </th>
              <th colSpan={2} className="bg-[#0066A1] px-4 py-3 text-center border-r border-white font-semibold">
                Total Proposta
              </th>
              <th colSpan={2} className="bg-[#0066A1] px-4 py-3 text-center border-r border-white font-semibold">
                Total Orcamento
              </th>
              <th colSpan={2} className="bg-[#0066A1] px-4 py-3 text-center border-r border-white font-semibold">
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
                    boxShadow: !showSubcontaColumn ? lastStickyShadow : undefined,
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
                <th key={`header-${month}`} colSpan={5} className="bg-[#3399CC] p-0 border-r border-white">
                  <div className="flex text-center">
                    <div className="flex-1 px-2 py-2 border-r border-white min-w-[100px]">Anterior R$</div>
                    <div className="flex-1 px-2 py-2 border-r border-white min-w-[80px]">%</div>
                    <div className="flex-1 px-2 py-2 border-r border-white min-w-[100px]">Proposta R$</div>
                    <div className="flex-1 px-2 py-2 border-r border-white min-w-[80px]">%</div>
                    <div className="flex-1 px-2 py-2 min-w-[100px]">Orcamento</div>
                  </div>
                </th>
              ))}

              <th colSpan={2} className="bg-[#3399CC] p-0 border-r border-white">
                <div className="flex text-center">
                  <div className="flex-1 px-2 py-2 border-r border-white min-w-[100px]">R$</div>
                  <div className="flex-1 px-2 py-2 min-w-[80px]">%</div>
                </div>
              </th>
              <th colSpan={2} className="bg-[#3399CC] p-0 border-r border-white">
                <div className="flex text-center">
                  <div className="flex-1 px-2 py-2 border-r border-white min-w-[100px]">R$</div>
                  <div className="flex-1 px-2 py-2 min-w-[80px]">%</div>
                </div>
              </th>
              <th colSpan={2} className="bg-[#3399CC] p-0 border-r border-white">
                <div className="flex text-center">
                  <div className="flex-1 px-2 py-2 border-r border-white min-w-[100px]">R$</div>
                  <div className="flex-1 px-2 py-2 min-w-[80px]">%</div>
                </div>
              </th>
              <th colSpan={2} className="bg-[#3399CC] p-0 border-r border-white">
                <div className="flex text-center">
                  <div className="flex-1 px-2 py-2 border-r border-white min-w-[100px]">R$</div>
                  <div className="flex-1 px-2 py-2 min-w-[80px]">%</div>
                </div>
              </th>
            </tr>
          </thead>

          <tbody>{data.map((row) => renderRow(row))}</tbody>
        </table>
      </div>
    </div>
  );
}
