# AGENTS.md

## 1. Visao Geral

Este projeto e um dashboard de gestao orcamentaria orientado a DFC (Demonstracao de Fluxo de Caixa), com foco em:

- analise por hierarquia DFC -> Conta -> Subconta (modo Analitico) ou somente DFC (modo Sintetico)
- edicao de valores mensais por perfil (gestor edita proposta, financeiro edita orcamento)
- comparacao de alteracoes e pendencias com suporte a modo A/S
- filtros por grupo/unidade e periodo, com sincronizacao de URL
- consumo de dados reais via API com adaptacao para estrutura interna

O app trabalha com duas frentes de dados:

- dados vindos da API (`getBudget`) e transformados pelo `budgetAdapter`
- snapshots em memoria para comparacao, resumo e simulacao de salvamento

## 2. O Que Ja Foi Implantado (estado atual)

### 2.1 Perfis de usuario

- alternancia entre `gestor` e `financeiro` via FAB no canto inferior esquerdo (`UserSwitcher`)
- `gestor`: filtros bloqueados (vem pela URL), edita campo `proposta`
- `financeiro`: filtros livres, edita campo `orcamento`
- troca de perfil nao altera os dados carregados

### 2.2 Modo Analitico / Sintetico

- `classificacao: 'A' | 'S'` controlado em `App.tsx`
- toggle visivel somente para `financeiro` na barra de filtros (`BudgetFilters`)
- ao trocar modo: limpa filtros de grupo/unidade, limpa dados, escreve URL
- sincronizacao de URL via `syncUrl()` — parametro `v_tipo` na query string
- lido no boot via `useEffect` inicial (param `v_tipo`)

Comportamento por modo:

| Aspecto                  | Analitico                        | Sintetico                     |
|--------------------------|----------------------------------|-------------------------------|
| Niveis editaveis         | conta / subconta                 | dfc (exceto linhas derivadas) |
| Expansao de linhas       | habilitada                       | bloqueada                     |
| Botoes de expansao       | visiveis                         | ocultos                       |
| Flechas de toggle        | visiveis                         | ocultas                       |
| Badges de pendencia      | baseados em subcontas            | baseados em monthlyData da DFC|
| Parametro API            | sem `tipoorcamento`              | `tipoorcamento: 'S'`          |
| Catalogo de grupos/uns   | `catalogData`                    | `catalogDataSintetico`        |

### 2.3 Filtros e URL

- filtros com IDs numericos na logica, labels para exibicao:
  - `businessGroupId?: number`, `businessGroup: string`
  - `businessUnitIds: number[]`, `businessUnits: string[]`
  - `startMonth: number`, `endMonth: number`
- multi-select de unidades com checkbox em popover
- `syncUrl()` escreve URL ao clicar em Filtrar ou trocar modo A/S
- parametros de URL reconhecidos:
  - `p_gn` — businessGroupId
  - `p_un` — businessUnitId unico
  - `p_permissao` — `S` = financeiro, `N` = gestor
  - `p_mes_inicial` / `p_mes_final`
  - `v_tipo` — `A` ou `S`
- `filtersLockedByUrl: boolean` — indica que URL definiu filtros iniciais (gestor nao sobrescreve)

### 2.4 Fluxo de API

- busca por `src/app/budget/services/getBudget.ts`
- parametros enviados:
  - `anoorcamento`, `idgrupo`, `idunidade` (quando aplicavel)
  - `tipoorcamento: 'S'` — somente no modo Sintetico
- mapeamento de campos da API para campos internos:
  - `anterior` <- `PROPOSTA`
  - `proposta` <- `CONTRAPROPOSTA`
  - `orcamento` <- `ORCADO`
- resposta adaptada por `src/app/budget/adapters/budgetAdapter.ts`

### 2.5 Adapter (`budgetAdapter`)

- assinatura: `budgetAdapter(apiData, tipoorcamento?)`
- `isSintetico = tipoorcamento === 'S'`
- modo Analitico:
  - monta hierarquia DFC -> Conta -> Subconta
  - `RATEIO_INDICATORS` (`Rateio`, `Rateio Desp.`) sao roteados para DFC `Despesa`
  - inclui placeholders para unidades sem estrutura de conta/subconta
  - acumula filhos em DFC via `sumChildrenIntoMonthlyData` (guardado por `children.length`)
- modo Sintetico:
  - acumula direto no nivel DFC
  - `Receita` tratada separadamente (linha propria `receitaRow` com `editable: true`)
  - `Sem Classificacao` ignorado
  - `editable: true` e metadados setados no `dfcNode` ao processar primeiro item
- linhas derivadas calculadas por ambos os modos:
  - Margem Bruta = Receita - Custo - Imposto
  - Resultado Operacional = Margem Bruta - Despesa
  - Resultado Liquido = Resultado Operacional - Investimento
  - IDs no Sintetico: `"receita"`, `"custo"`, `"imposto"`, etc.
  - IDs no Analitico: `"dfc-Custo"`, `"dfc-Imposto"`, etc.
  - lookup em `computedDataById` tenta ambos os prefixos

### 2.6 Tabela orcamentaria (`BudgetTable`)

- prop `classificacao?: 'A' | 'S'` determina comportamento
- `isSintetico` derivado internamente
- edicao de celulas por perfil e nivel:
  - gestor: edita `proposta` em subcontas (A) ou DFC (S)
  - financeiro: edita `orcamento` em subcontas (A) ou DFC (S)
  - `Receita` e sempre editavel por gestor
  - linhas derivadas (Margem Bruta, Resultados) nao sao editaveis
- `computedDataById`: `useMemo` que recalcula linhas derivadas ao editar
- `zeroPropostaByGroup`: badges de pendencia por DFC
  - ignora linhas derivadas via `highlightedRows`
  - no Sintetico: usa `computedDataById` para refletir edicoes em tempo real
- acoes em massa: copiar anterior->proposta (gestor), copiar proposta->orcamento (financeiro), desfazer copia
- todas as acoes criticas passam por modal de confirmacao e toast

### 2.7 Catalogos duais

- `catalogData`: snapshot do adapter Analitico, usado para grupos/unidades no modo A
- `catalogDataSintetico`: snapshot do adapter Sintetico, usado para grupos/unidades no modo S
- ambos carregados em paralelo no boot via `Promise.all`
- `activeCatalog` derivado de `classificacao` — alimenta `allGroups`, `allUnits`, `availableUnits`

### 2.8 Resumo de alteracoes e pendencias

- `getChanges(originalRows, currentRows, userType, classificacao)` — detecta mudancas
- `getPendencias(rows, filters, userType, classificacao)` — detecta zeros
- `isActionableRow(row, classificacao)` — nivel editavel por modo:
  - Analitico: `conta` ou `subconta`
  - Sintetico: `dfc`
- `getVisibleChanges` filtra por periodo e grupo/unidade ativo
- modal de resumo com contadores e lista detalhada por linha/mes

## 3. Stack Tecnologica

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- react-hot-toast
- lucide-react

## 4. Estrutura Real de Pastas

```text
src/
  app/
    App.tsx
    layout.tsx
    page.tsx
    budget/
      adapters/
        budgetAdapter.ts
      components/
        BudgetHeader.tsx
        BudgetFilters.tsx
        BudgetTable.tsx
      services/
        getBudget.ts
      types/
        budget.ts
      utils/
        budgetInsights.ts
        csvParser.ts
    user/
      components/
        UserSwitcher.tsx
    shared/
      ui/
        ...componentes base reutilizaveis
```

## 5. Responsabilidade de Cada Parte

### 5.1 Entradas da aplicacao

- `src/app/page.tsx` — entrypoint da rota principal
- `src/app/layout.tsx` — layout global e `Toaster`
- `src/app/App.tsx` — orquestra estado principal: filtros, perfis, classificacao, busca API, snapshots, resumo, render da tabela

### 5.2 Dominio budget

- `src/app/budget/services/getBudget.ts`
  - chamada HTTP da API de orcamento
  - `tipoorcamento: 'S'` enviado condicionalmente no modo Sintetico

- `src/app/budget/adapters/budgetAdapter.ts`
  - transforma payload da API em `BudgetRow[]`
  - suporta modo Analitico (hierarquia) e Sintetico (somente DFC)
  - calcula linhas derivadas (Margem/Resultados)
  - mapeamento: `anterior` <- PROPOSTA, `proposta` <- CONTRAPROPOSTA, `orcamento` <- ORCADO

- `src/app/budget/components/BudgetFilters.tsx`
  - UI de filtros (grupo, unidades, periodo)
  - toggle Analitico/Sintetico (somente financeiro)
  - botao Filtrar chama `syncUrl` + `handleSearch`

- `src/app/budget/components/BudgetTable.tsx`
  - renderizacao hierarquica da grade
  - suporta modos A/S via prop `classificacao`
  - edicao de celulas por perfil e modo
  - badges de pendencia por DFC

- `src/app/budget/utils/budgetInsights.ts`
  - calculo de alteracoes, pendencias e visibilidade
  - ciente de `classificacao` para determinar nivel editavel

### 5.3 Dominio user

- `src/app/user/components/UserSwitcher.tsx`
  - troca de perfil (gestor/financeiro)
  - interface minima: `{ userType, onChange }`

## 6. Modelo de Estado Atual

Estados principais em `App.tsx`:

- `filters` — IDs para logica/API, labels para exibicao
- `classificacao: 'A' | 'S'` — modo atual
- `userType: 'gestor' | 'financeiro'` — perfil ativo
- `budgetData` — fonte de verdade da tela
- `catalogData` — catalogo Analitico (grupos/unidades)
- `catalogDataSintetico` — catalogo Sintetico (grupos/unidades)
- `activeCatalog` — derivado de `classificacao`, alimenta selects
- `originalDataSnapshot` — base comparativa para resumo
- `savedData` — simulacao de dados salvos em memoria
- `filtersLockedByUrl` — URL definiu filtros iniciais

Regras importantes:

- nao usar `filteredData` como fonte de verdade
- evitar `setFilters` sem guarda de igualdade
- evitar efeitos circulares entre filtro -> busca -> filtro
- `syncUrl` deve ser chamado ao pesquisar e ao trocar modo A/S

## 7. Regras de Negocio Ativas

### 7.1 Hierarquia

- preservar: DFC -> Conta -> Subconta no Analitico
- no Sintetico: apenas nivel DFC e exibido e editado

### 7.2 Alteracoes e pendencias

- `changeType` suportado: `manual`, `copy`, `reset`, `null`
- `reset` nao entra no resumo de alteracoes
- pendencia:
  - gestor: `proposta === 0`
  - financeiro: `orcamento === 0`
- nivel avaliado depende do modo:
  - Analitico: conta/subconta
  - Sintetico: dfc (exceto linhas derivadas)

### 7.3 Filtros

- troca de grupo limpa unidades selecionadas
- selecao multipla de unidades e acumulativa
- troca de modo A/S limpa grupo, unidades e dados carregados
- filtros por ID dirigem API e logica de comparacao

### 7.4 Perfil gestor

- filtros sempre vindos pela URL (useEffect do gestor retorna early)
- proposta zerada conforme regra de perfil ao trocar para gestor

## 8. Padroes de Implementacao

- atualizacao imutavel com `map`, `spread`, `Object.fromEntries`
- evitar mutacao direta de objetos/snapshots
- tipagem explicita, evitar `any`
- proteger calculos contra dados incompletos da API (meses ausentes)
- `useMemo` com dependencias precisas para evitar recalculos desnecessarios

## 9. UX/UI Guidelines

- nao usar `alert()` nativo
- usar `toast`, `dialog`, `popover`, `tooltip`
- manter legibilidade da tabela como prioridade
- preservar consistencia visual da paleta atual (`#0066A1`)

## 10. Comandos Uteis

```bash
npm install
npm run dev
npm run build
```

## 11. Cuidados para Evolucao

- qualquer ajuste no resumo deve validar impacto em:
  - `getChanges`, `getPendencias`, `getVisibleChanges`
  - `isActionableRow` (nivel por modo A/S)
- mudancas no adapter devem validar:
  - calculo das linhas derivadas (IDs diferentes entre A e S)
  - normalizacao de meses
  - presenca de unidades sem estrutura (Analitico)
- mudancas de filtro nao podem reintroduzir loop de renderizacao
- ao mexer na busca API, validar: `idgrupo`/`idunidade`, `tipoorcamento`, multi-select
- ao mexer em `computedDataById`, validar lookup de IDs (Sintetico usa `"custo"`, Analitico usa `"dfc-Custo"`)
- badges de pendencia no Sintetico dependem de `computedDataById` — nao de `visibleData` diretamente
