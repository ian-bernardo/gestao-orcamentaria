export async function getBudget(params: {
  anoorcamento: number;
  idgrupo?: number;
  idunidade?: number;
  tipoorcamento?: string;
}) {
  const query = new URLSearchParams({
    anoorcamento: String(params.anoorcamento),
    ...(params.idgrupo != null && { idgrupo: String(params.idgrupo) }),
    ...(params.idunidade != null && { idunidade: String(params.idunidade) }),
    ...(params.tipoorcamento && { tipoorcamento: params.tipoorcamento }),
  });

  const response = await fetch(`/api/budget?${query.toString()}`);

  if (!response.ok) {
    throw new Error('Erro ao buscar dados');
  }

  return response.json();
}
