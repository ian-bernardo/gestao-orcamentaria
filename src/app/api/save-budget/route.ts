import { NextRequest, NextResponse } from 'next/server';

const SAVE_URL =
  'https://homologacao.sistema.romancemoda.com.br/hml/romance/fin/gestaoorcam';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;

    const response = await fetch(SAVE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return NextResponse.json(
        { RETORNO: 'OCORREU FALHA NA ATUALIZACAO. REVISE OS PARAMETROS!' },
        { status: response.status },
      );
    }

    const text = await response.text();
    const safeText = text.replace(/[\u0000-\u001F]+/g, '');
    const json = JSON.parse(safeText) as Record<string, unknown>;

    return NextResponse.json(json);
  } catch (error) {
    console.error('[save-budget/route] Erro:', error);
    return NextResponse.json(
      { RETORNO: 'OCORREU FALHA NA ATUALIZACAO. REVISE OS PARAMETROS!' },
      { status: 500 },
    );
  }
}
