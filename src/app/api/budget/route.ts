import { NextRequest, NextResponse } from 'next/server';

const ORACLE_BASE_URL =
  process.env.ORACLE_ENV === 'prod'
    ? process.env.ORACLE_API_URL_PROD
    : process.env.ORACLE_API_URL_HML;

const BASE_URL = `${ORACLE_BASE_URL}/buscadados`;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const query = new URLSearchParams();

  const anoorcamento = searchParams.get('anoorcamento');
  const idgrupo = searchParams.get('idgrupo');
  const idunidade = searchParams.get('idunidade');
  const tipoorcamento = searchParams.get('tipoorcamento');
  const tipoclassificacao = searchParams.get('tipoclassificacao');

  if (anoorcamento) query.set('anoorcamento', anoorcamento);
  if (idgrupo) query.set('idgrupo', idgrupo);
  if (idunidade) query.set('idunidade', idunidade);
  if (tipoorcamento) query.set('tipoorcamento', tipoorcamento);
  if (tipoclassificacao) query.set('tipoclassificacao', tipoclassificacao);

  const url = `${BASE_URL}?${query.toString()}`;

  try {
    const response = await fetch(url, {
  cache: 'no-store',
  headers: {
    'Referer': 'https://homologacao.sistema.romancemoda.com.br/',
    'Origin': 'https://homologacao.sistema.romancemoda.com.br',
  },
});

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[budget/route] API externa retornou:', response.status, errorText);
      return NextResponse.json(
        { error: 'Erro ao buscar dados da API externa' },
        { status: response.status },
      );
    }

    const text = await response.text();
    const safeText = text.replace(/[\u0000-\u001F]+/g, '');
    const json = JSON.parse(safeText) as Record<string, unknown>;
    const data = json.retorno ?? json;

    return NextResponse.json(data);
  } catch (error) {
    console.error('[budget/route] Erro:', error);
    return NextResponse.json(
      { error: 'Falha na comunicação com a API externa' },
      { status: 500 },
    );
  }
}
