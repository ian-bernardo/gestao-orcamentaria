import { BudgetRow } from '../types/budget';

interface DFCStructure {
  [dfc: string]: {
    [conta: string]: Set<string>;
  };
}

function generateMonthlyData() {
  const data: any = {};

  for (let month = 1; month <= 12; month++) {
    data[month] = {
      anterior: Math.floor(Math.random() * 100000) + 10000,
      proposta: Math.floor(Math.random() * 100000) + 10000,
      orcamento: Math.floor(Math.random() * 100000) + 10000,
    };
  }

  return data;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function createSummaryRow(id: string, dfc: string): BudgetRow {
  return {
    id,
    dfc,
    conta: '',
    subconta: '',
    level: 'dfc',
    editable: false,
    monthlyData: generateMonthlyData(),
  };
}

function buildBudgetRows(csvData: string): BudgetRow[] {
  const lines = csvData.split('\n');
  const structure: DFCStructure = {};

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const match = line.match(/"([^"]*)","([^"]*)","([^"]*)"/);
    if (!match) continue;

    const [, dfc, conta, subconta] = match;

    if (!structure[dfc]) {
      structure[dfc] = {};
    }

    if (!structure[dfc][conta]) {
      structure[dfc][conta] = new Set();
    }

    if (subconta) {
      structure[dfc][conta].add(subconta);
    }
  }

  const structuredRows = new Map<string, BudgetRow>();
  const dfcOrder = ['Custo', 'Imposto', 'Despesa', 'Investimento'];

  dfcOrder.forEach((dfcName) => {
    if (!structure[dfcName]) return;

    const contaKeys = Object.keys(structure[dfcName]).sort();
    const children: BudgetRow[] = [];

    contaKeys.forEach((contaName) => {
      const subcontas = Array.from(structure[dfcName][contaName]).sort();
      const subcontaChildren: BudgetRow[] = [];

      subcontas.forEach((subcontaName) => {
        subcontaChildren.push({
          id: `${slugify(dfcName)}-${slugify(contaName)}-${slugify(subcontaName)}`,
          dfc: dfcName,
          conta: contaName,
          subconta: subcontaName,
          level: 'subconta',
          editable: true,
          monthlyData: generateMonthlyData(),
        });
      });

      children.push({
        id: `${slugify(dfcName)}-${slugify(contaName)}`,
        dfc: dfcName,
        conta: contaName,
        subconta: '',
        level: 'conta',
        editable: true,
        isExpanded: false,
        monthlyData: generateMonthlyData(),
        children: subcontaChildren,
      });
    });

    structuredRows.set(dfcName, {
      id: slugify(dfcName),
      dfc: dfcName,
      conta: '',
      subconta: '',
      level: 'dfc',
      editable: true,
      isExpanded: true,
      monthlyData: generateMonthlyData(),
      children,
    });
  });

  return [
    createSummaryRow('receita', 'Receita'),
    structuredRows.get('Custo') ?? createSummaryRow('custo', 'Custo'),
    structuredRows.get('Imposto') ?? createSummaryRow('imposto', 'Imposto'),
    createSummaryRow('margem-bruta', 'Margem Bruta'),
    structuredRows.get('Despesa') ?? createSummaryRow('despesa', 'Despesa'),
    createSummaryRow('resultado-operacional', 'Resultado Operacional'),
    structuredRows.get('Investimento') ?? createSummaryRow('investimento', 'Investimento'),
    createSummaryRow('resultado-liquido', 'Resultado Liquido'),
  ];
}

export async function parseCSVData(): Promise<BudgetRow[]> {
  const response = await fetch('/dfc_contas_subcontas.csv');

  if (!response.ok) {
    throw new Error('Nao foi possivel carregar o arquivo CSV.');
  }

  return buildBudgetRows(await response.text());
}
