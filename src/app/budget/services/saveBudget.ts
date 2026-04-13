import { BudgetRow } from '../types/budget';

interface SaveBudgetParams {
  idgestao: number;
  nrmes: number;
  tipoorcamento: 'P' | 'O';
  valor: number;
}

export interface SaveBudgetResult {
  idgestao: number;
  nrmes: number;
  success: boolean;
  message: string;
}

export async function saveBudgetEntry(
  params: SaveBudgetParams,
): Promise<SaveBudgetResult> {
  const response = await fetch('/api/save-budget', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parametros: params }),
  });

  const json = await response.json() as { RETORNO?: string };
  const success = json.RETORNO === 'GESTAO ATUALIZADA COM SUCESSO!';

  return {
    idgestao: params.idgestao,
    nrmes: params.nrmes,
    success,
    message: json.RETORNO ?? 'Resposta inválida da API',
  };
}

export function collectSaveEntries(
  rows: BudgetRow[],
  tipoorcamento: 'P' | 'O',
  startMonth: number,
  endMonth: number,
): SaveBudgetParams[] {
  const entries: SaveBudgetParams[] = [];

  const visit = (row: BudgetRow) => {
    if (row.level === 'subconta' && row.idGestao != null) {
      for (let mes = startMonth; mes <= endMonth; mes++) {
        const monthData = row.monthlyData[mes];
        if (!monthData) continue;

        const valor =
          tipoorcamento === 'P' ? monthData.proposta : monthData.orcamento;

        entries.push({
          idgestao: row.idGestao,
          nrmes: mes,
          tipoorcamento,
          valor,
        });
      }
    }

    row.children?.forEach(visit);
  };

  rows.forEach(visit);
  return entries;
}
