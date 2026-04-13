import { BudgetRow, MonthlyData } from '../types/budget';

interface BudgetApiItem {
  IDGESTAOORCAMENTARIAUN?: number;
  IDGRUPONEGOCIO?: number;
  IDUNIDADEDENEGOCIO?: number;
  NOMEINDICADOR?: string;
  CONTA?: string;
  SUBCONTA?: string;
  MES?: string;
  VALORANOANTERIOR?: number;
  PROPOSTA?: number;
  ORCADO?: number;
  GRUPONEGOCIO?: string;
  UNIDADENEGOCIO?: string;
}

interface UnitMeta {
  unitId: number;
  unitLabel: string;
  groupId?: number;
  groupLabel?: string;
}

const mesesMap: Record<string, number> = {
  JANEIRO: 1,
  FEVEREIRO: 2,
  MARCO: 3,
  ABRIL: 4,
  MAIO: 5,
  JUNHO: 6,
  JULHO: 7,
  AGOSTO: 8,
  SETEMBRO: 9,
  OUTUBRO: 10,
  NOVEMBRO: 11,
  DEZEMBRO: 12,
};

const DFC_ID_BY_NAME: Record<string, string> = {
  Receita: 'receita',
  Custo: 'custo',
  Imposto: 'imposto',
  Despesa: 'despesa',
  Investimento: 'investimento',
};

// Indicadores que pertencem ao DFC Despesa
const RATEIO_INDICATORS = new Set(['Rateio', 'Rateio Desp.']);

function createEmptyMonthlyData(): Record<number, MonthlyData> {
  const monthlyData = {} as Record<number, MonthlyData>;

  for (let month = 1; month <= 12; month++) {
    monthlyData[month] = {
      anterior: 0,
      proposta: 0,
      orcamento: 0,
      changeType: null,
    };
  }

  return monthlyData;
}

function normalizeMonthlyData(
  monthlyData: Record<number, MonthlyData>,
): Record<number, MonthlyData> {
  const normalized = createEmptyMonthlyData();

  for (let month = 1; month <= 12; month++) {
    const current = monthlyData[month];

    if (!current) {
      continue;
    }

    normalized[month] = {
      anterior: current.anterior ?? 0,
      proposta: current.proposta ?? 0,
      orcamento: current.orcamento ?? 0,
      changeType: current.changeType ?? null,
    };
  }

  return normalized;
}

function computeMonthlyExpression(
  id: string,
  label: string,
  expression: (month: number) => MonthlyData,
): BudgetRow {
  const monthlyData = createEmptyMonthlyData();

  for (let month = 1; month <= 12; month++) {
    monthlyData[month] = expression(month);
  }

  return {
    id,
    dfc: label,
    conta: '',
    subconta: '',
    level: 'dfc',
    editable: false,
    children: [],
    monthlyData,
  };
}

function getDfcId(dfcName: string): string {
  return DFC_ID_BY_NAME[dfcName] ?? `dfc-${dfcName}`;
}

function getDfcNode(dfcMap: Map<string, BudgetRow>, dfcName: string): BudgetRow {
  const existing = dfcMap.get(dfcName);

  if (existing) {
    return existing;
  }

  const node: BudgetRow = {
    id: getDfcId(dfcName),
    dfc: dfcName,
    conta: '',
    subconta: '',
    level: 'dfc',
    editable: false,
    children: [],
    monthlyData: createEmptyMonthlyData(),
  };

  dfcMap.set(dfcName, node);
  return node;
}

function getContaNode(dfcNode: BudgetRow, contaName: string): BudgetRow {
  const contaKey = contaName || 'Sem Conta';
  const found = dfcNode.children?.find((child) => child.conta === contaKey);

  if (found) {
    return found;
  }

  const contaNode: BudgetRow = {
    id: `conta-${dfcNode.id}-${contaKey}`,
    dfc: dfcNode.dfc,
    conta: contaKey,
    subconta: '',
    level: 'conta',
    editable: false,
    children: [],
    monthlyData: createEmptyMonthlyData(),
  };

  dfcNode.children?.push(contaNode);
  return contaNode;
}

function getSubcontaNode(
  contaNode: BudgetRow,
  subcontaName: string,
  item: BudgetApiItem,
  fallbackId: string,
): BudgetRow {
  const subcontaKey = subcontaName || `Sem Subconta ${fallbackId}`;
  const found = contaNode.children?.find((child) => child.subconta === subcontaKey);

  if (found) {
    return found;
  }

  const node: BudgetRow = {
    id: item.IDGESTAOORCAMENTARIAUN != null
      ? `sub-${item.IDGESTAOORCAMENTARIAUN}`
      : `sub-placeholder-${fallbackId}`,
    idGestao: item.IDGESTAOORCAMENTARIAUN,
    businessGroupId: item.IDGRUPONEGOCIO,
    businessUnitId: item.IDUNIDADEDENEGOCIO,
    dfc: contaNode.dfc,
    conta: contaNode.conta,
    subconta: subcontaKey,
    businessGroup: item.GRUPONEGOCIO,
    businessUnit: item.UNIDADENEGOCIO,
    level: 'subconta',
    editable: true,
    children: [],
    monthlyData: createEmptyMonthlyData(),
  };

  contaNode.children?.push(node);
  return node;
}

function accumulateValue(target: MonthlyData, source: BudgetApiItem): MonthlyData {
  return {
    anterior: target.anterior + (source.VALORANOANTERIOR ?? 0),
    proposta: target.proposta + (source.PROPOSTA ?? 0),
    orcamento: target.orcamento + (source.ORCADO ?? 0),
    changeType: null,
  };
}

function addUnitPlaceholderRows(
  dfcMap: Map<string, BudgetRow>,
  unitsRegistry: Map<number, UnitMeta>,
  unitsWithRealData: Set<number>,
) {
  unitsRegistry.forEach((unitMeta) => {
    if (unitsWithRealData.has(unitMeta.unitId)) {
      return;
    }

    const placeholderItem: BudgetApiItem = {
      IDUNIDADEDENEGOCIO: unitMeta.unitId,
      IDGRUPONEGOCIO: unitMeta.groupId,
      UNIDADENEGOCIO: unitMeta.unitLabel,
      GRUPONEGOCIO: unitMeta.groupLabel,
      IDGESTAOORCAMENTARIAUN: undefined,
    };

    const dfcNode = getDfcNode(dfcMap, 'Sem Classificacao');
    const contaNode = getContaNode(dfcNode, 'Sem Conta');
    const placeholderSubconta = getSubcontaNode(
      contaNode,
      `Sem Subconta - ${unitMeta.unitLabel}`,
      placeholderItem,
      String(unitMeta.unitId),
    );

    placeholderSubconta.monthlyData = createEmptyMonthlyData();
  });
}

function getMonthlyTotalsFromDfc(row?: BudgetRow): Record<number, MonthlyData> {
  if (!row) {
    return createEmptyMonthlyData();
  }

  return normalizeMonthlyData(row.monthlyData);
}

function sumChildrenIntoMonthlyData(row: BudgetRow): Record<number, MonthlyData> {
  if (!row.children?.length) {
    return normalizeMonthlyData(row.monthlyData);
  }

  const total = createEmptyMonthlyData();

  row.children.forEach((contaNode) => {
    contaNode.children?.forEach((subcontaNode) => {
      const normalized = normalizeMonthlyData(subcontaNode.monthlyData);

      for (let month = 1; month <= 12; month++) {
        total[month] = {
          anterior: total[month].anterior + normalized[month].anterior,
          proposta: total[month].proposta + normalized[month].proposta,
          orcamento: total[month].orcamento + normalized[month].orcamento,
          changeType: null,
        };
      }
    });
  });

  row.monthlyData = total;
  return total;
}

export function budgetAdapter(
  apiData: BudgetApiItem[],
  tipoorcamento?: string,
): BudgetRow[] {
  const rows = Array.isArray(apiData) ? apiData : [];
  const dfcMap = new Map<string, BudgetRow>();

  const unitsRegistry = new Map<number, UnitMeta>();
  const unitsWithRealData = new Set<number>();

  const isSintetico = tipoorcamento === 'S';

  const receitaRow: BudgetRow = {
    id: 'receita',
    dfc: 'Receita',
    conta: '',
    subconta: '',
    level: 'dfc',
    editable: true,
    children: [],
    monthlyData: createEmptyMonthlyData(),
  };

  rows.forEach((item) => {
    if (item.IDUNIDADEDENEGOCIO != null) {
      unitsRegistry.set(item.IDUNIDADEDENEGOCIO, {
        unitId: item.IDUNIDADEDENEGOCIO,
        unitLabel: item.UNIDADENEGOCIO ?? `Unidade ${item.IDUNIDADEDENEGOCIO}`,
        groupId: item.IDGRUPONEGOCIO,
        groupLabel: item.GRUPONEGOCIO,
      });
    }

    const mes = item.MES ? mesesMap[item.MES] : undefined;
    if (!mes) return;

    if (isSintetico) {
      const dfcName = item.NOMEINDICADOR || 'Sem Classificacao';
      if (dfcName === 'Sem Classificacao') return;

      if (dfcName === 'Receita') {
        receitaRow.monthlyData[mes] = accumulateValue(receitaRow.monthlyData[mes], item);
        if (!receitaRow.idGestao && item.IDGESTAOORCAMENTARIAUN != null) {
          receitaRow.idGestao = item.IDGESTAOORCAMENTARIAUN;
          receitaRow.businessGroupId = item.IDGRUPONEGOCIO;
          receitaRow.businessUnitId = item.IDUNIDADEDENEGOCIO;
          receitaRow.businessGroup = item.GRUPONEGOCIO;
          receitaRow.businessUnit = item.UNIDADENEGOCIO;
        }
        return;
      }

      const dfcNode = getDfcNode(dfcMap, dfcName);

      if (!dfcNode.idGestao && item.IDGESTAOORCAMENTARIAUN != null) {
        dfcNode.idGestao = item.IDGESTAOORCAMENTARIAUN;
        dfcNode.businessGroupId = item.IDGRUPONEGOCIO;
        dfcNode.businessUnitId = item.IDUNIDADEDENEGOCIO;
        dfcNode.businessGroup = item.GRUPONEGOCIO;
        dfcNode.businessUnit = item.UNIDADENEGOCIO;
        dfcNode.editable = true;
      }

      dfcNode.monthlyData[mes] = accumulateValue(dfcNode.monthlyData[mes], item);
      return;
    }

    if (item.NOMEINDICADOR === 'Receita') {
      receitaRow.monthlyData[mes] = accumulateValue(receitaRow.monthlyData[mes], item);
      return;
    }

    const isRateio = item.NOMEINDICADOR
      ? RATEIO_INDICATORS.has(item.NOMEINDICADOR)
      : false;
    const dfcName = isRateio
      ? 'Despesa'
      : (item.NOMEINDICADOR || 'Sem Classificacao');
    const dfcNode = getDfcNode(dfcMap, dfcName);
    const contaNode = getContaNode(dfcNode, item.CONTA || 'Sem Conta');

    const hasStructuralData = Boolean(item.CONTA) || Boolean(item.SUBCONTA);

    if (hasStructuralData && item.IDUNIDADEDENEGOCIO != null) {
      unitsWithRealData.add(item.IDUNIDADEDENEGOCIO);
    }

    const fallbackId = `${item.IDUNIDADEDENEGOCIO ?? 'sem-unidade'}-${item.IDGESTAOORCAMENTARIAUN ?? 'sem-gestao'}-${dfcName}`;
    const subcontaNode = getSubcontaNode(
      contaNode,
      item.SUBCONTA || '',
      item,
      fallbackId,
    );

    if (!mes) {
      return;
    }

    subcontaNode.monthlyData[mes] = accumulateValue(subcontaNode.monthlyData[mes], item);
  });

  addUnitPlaceholderRows(dfcMap, unitsRegistry, unitsWithRealData);

  dfcMap.forEach((dfcNode) => {
    if (dfcNode.children?.length) {
      sumChildrenIntoMonthlyData(dfcNode);
    }
  });

  receitaRow.monthlyData = normalizeMonthlyData(receitaRow.monthlyData);

  const custoTotals = getMonthlyTotalsFromDfc(dfcMap.get('Custo'));
  const impostoTotals = getMonthlyTotalsFromDfc(dfcMap.get('Imposto'));
  const despesaTotals = getMonthlyTotalsFromDfc(dfcMap.get('Despesa'));
  const investimentoTotals = getMonthlyTotalsFromDfc(dfcMap.get('Investimento'));

  const margemBruta = computeMonthlyExpression(
    'margem-bruta',
    'Margem Bruta',
    (month) => ({
      anterior:
        receitaRow.monthlyData[month].anterior -
        custoTotals[month].anterior -
        impostoTotals[month].anterior,
      proposta:
        receitaRow.monthlyData[month].proposta -
        custoTotals[month].proposta -
        impostoTotals[month].proposta,
      orcamento:
        receitaRow.monthlyData[month].orcamento -
        custoTotals[month].orcamento -
        impostoTotals[month].orcamento,
      changeType: null,
    }),
  );

  const resultadoOperacional = computeMonthlyExpression(
    'resultado-operacional',
    'Resultado Operacional',
    (month) => ({
      anterior: margemBruta.monthlyData[month].anterior - despesaTotals[month].anterior,
      proposta: margemBruta.monthlyData[month].proposta - despesaTotals[month].proposta,
      orcamento: margemBruta.monthlyData[month].orcamento - despesaTotals[month].orcamento,
      changeType: null,
    }),
  );

  const resultadoLiquido = computeMonthlyExpression(
    'resultado-liquido',
    'Resultado Líquido',
    (month) => ({
      anterior:
        resultadoOperacional.monthlyData[month].anterior -
        investimentoTotals[month].anterior,
      proposta:
        resultadoOperacional.monthlyData[month].proposta -
        investimentoTotals[month].proposta,
      orcamento:
        resultadoOperacional.monthlyData[month].orcamento -
        investimentoTotals[month].orcamento,
      changeType: null,
    }),
  );

  return [
    receitaRow,
    dfcMap.get('Custo') ?? getDfcNode(dfcMap, 'Custo'),
    dfcMap.get('Imposto') ?? getDfcNode(dfcMap, 'Imposto'),
    margemBruta,
    dfcMap.get('Despesa') ?? getDfcNode(dfcMap, 'Despesa'),
    resultadoOperacional,
    dfcMap.get('Investimento') ?? getDfcNode(dfcMap, 'Investimento'),
    resultadoLiquido,
  ];
}
