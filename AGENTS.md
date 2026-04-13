# AGENTS.md

## 1. Visao Geral

Este projeto e um dashboard de gestao orcamentaria orientado a DFC (Demonstracao de Fluxo de Caixa), com foco em:

- analise por hierarquia DFC -> Conta -> Subconta
- edicao de valores mensais
- comparacao de alteracoes e pendencias
- filtros por grupo/unidade e periodo
- consumo de dados reais via API com adaptacao para estrutura interna

O app trabalha com duas frentes de dados:

- dados vindos da API (`getBudget`) e transformados pelo `budgetAdapter`
- snapshots em memoria para comparacao, resumo e simulacao de salvamento

## 2. O Que Ja Foi Implantado (estado atual)

### 2.1 Perfis de usuario

- alternancia entre `gestor` e `financeiro` via FAB no canto inferior esquerdo
- `gestor` usa filtros fixos e edita `proposta`
- `financeiro` usa filtros livres e edita `orcamento`

### 2.2 Filtros com IDs e labels

- filtros migrados para IDs numericos na logica:
  - `businessGroupId?: number`
  - `businessUnitIds: number[]`
- labels mantidas para exibicao:
  - `businessGroup: string`
  - `businessUnits: string[]`
- suporte a selecao multipla de unidades com checkbox em popover
- debounce na busca por filtros para evitar loops e chamadas excessivas

### 2.3 Fluxo de API

- busca por API via `src/app/budget/services/getBudget.ts`
- payload principal:
  - `anoorcamento`
  - `idgrupo`
  - `idunidade` (quando aplicavel)
- resposta adaptada por `src/app/budget/adapters/budgetAdapter.ts`
- adapter monta estrutura `BudgetRow` hierarquica consumida pela tabela

### 2.4 Tabela orcamentaria

- tabela hierarquica com colunas sticky (DFC/Conta/Subconta)
- expansao por nivel: somente DFC, abrir contas, abrir subcontas
- totais por coluna e media mensal orcamentaria
- linhas derivadas calculadas:
  - Margem Bruta = Receita - Custo - Imposto
  - Resultado Operacional = Margem Bruta - Despesa
  - Resultado Liquido = Resultado Operacional - Investimento
- protecao para meses ausentes (normalizacao de `monthlyData` com zeros)

### 2.5 Acoes em massa e confirmacao

- copiar `anterior -> proposta` (gestor)
- copiar `proposta -> orcamento` (financeiro)
- zerar proposta e orcamento (acao auxiliar via UserSwitcher)
- preencher proposta e orcamento para teste (acao auxiliar via UserSwitcher)
- todas as acoes criticas passam por modal de confirmacao e toast

### 2.6 Resumo e snapshots

- modal de resumo com total de alteracoes e pendencias
- lista detalhada por linha e mes
- comparacao por snapshot com regras de `changeType`
- armazenamento mock em memoria por chave de filtro (`savedData`)

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
    components/
      UserSwitcher.tsx
      figma/
        ImageWithFallback.tsx
      ui/
        popover.tsx
        utils.ts
    data/
      mockData.ts
    lib/
      business.ts
    shared/
      ui/
        ...componentes base reutilizaveis
  imports/
    dfc_contas_subcontas.csv
  styles/
    fonts.css
    index.css
    tailwind.css
    theme.css
```

Observacao:

- `src/app/components/UserSwitcher.tsx` e re-export para `src/app/user/components/UserSwitcher.tsx`
- padrao preferencial de import para novos codigos: alias `@/`

## 5. Responsabilidade de Cada Parte

### 5.1 Entradas da aplicacao

- `src/app/page.tsx`
  - entrypoint da rota principal

- `src/app/layout.tsx`
  - layout global e `Toaster`

- `src/app/App.tsx`
  - orquestra estado principal
  - integra filtros, perfis, busca API, snapshots, resumo e render da tabela

### 5.2 Dominio budget

- `src/app/budget/services/getBudget.ts`
  - chamada HTTP da API de orcamento
  - montagem de query params

- `src/app/budget/adapters/budgetAdapter.ts`
  - transforma payload da API em `BudgetRow[]`
  - normaliza meses
  - calcula linhas derivadas (Margem/Resultados)
  - inclui placeholders para unidades sem estrutura de conta/subconta

- `src/app/budget/components/BudgetFilters.tsx`
  - UI de filtros (grupo, unidades, periodo)
  - multi-select de unidades

- `src/app/budget/components/BudgetTable.tsx`
  - renderizacao hierarquica da grade
  - edicao de celulas por perfil
  - calculo de totais e exibicao de pendencias

- `src/app/budget/utils/budgetInsights.ts`
  - calculo de alteracoes, pendencias e visibilidade por contexto de filtro

### 5.3 Dominio user

- `src/app/user/components/UserSwitcher.tsx`
  - troca de perfil e acoes auxiliares

## 6. Modelo de Estado Atual

Estados principais em `App.tsx`:

- `filters`
  - IDs para logica/API
  - labels para exibicao

- `budgetData`
  - fonte de verdade da tela

- `catalogData`
  - base para catalogos visuais (grupos/unidades)

- `originalDataSnapshot`
  - base comparativa para resumo de mudancas

- `savedData`
  - simulacao de dados salvos em memoria

Regras importantes:

- nao usar `filteredData` como fonte de verdade
- evitar `setFilters` sem guarda de igualdade
- evitar efeitos circulares entre filtro -> busca -> filtro

## 7. Regras de Negocio Ativas

### 7.1 Hierarquia

- preservar: DFC -> Conta -> Subconta
- nao remover niveis estruturais sem solicitacao explicita

### 7.2 Alteracoes e pendencias

- `changeType` suportado: `manual`, `copy`, `reset`, `null`
- `reset` nao entra no resumo de alteracoes
- pendencia:
  - gestor: `proposta === 0`
  - financeiro: `orcamento === 0`

### 7.3 Filtros

- grupo deve limpar unidades selecionadas quando houver troca de grupo
- selecao multipla de unidades deve ser acumulativa
- filtros por ID dirigem API e logica de comparacao

### 7.4 Perfil gestor

- filtros fixos
- bloqueio de acoes de filtro livres
- proposta zerada conforme regra de perfil

## 8. Padrões de Implementacao

- usar atualizacao imutavel com `map`, `spread`, `Object.fromEntries`
- evitar mutacao direta de objetos/snapshots
- manter tipagem explicita e evitar `any`
- proteger calculos contra dados incompletos da API (ex.: meses ausentes)

## 9. UX/UI Guidelines

- nao usar `alert()` nativo
- usar `toast`, `dialog`, `popover`, `tooltip`
- manter legibilidade da tabela como prioridade
- preservar consistencia visual da paleta atual

## 10. Comandos Uteis

```bash
npm install
npm run dev
npm run build
```

## 11. Cuidados para Evolucao

- qualquer ajuste no resumo deve validar impacto em:
  - `getChanges`
  - `getPendencias`
  - `getVisibleChanges`
- mudancas no adapter devem validar:
  - calculo das linhas derivadas
  - normalizacao de meses
  - presenca de unidades sem estrutura
- mudancas de filtro nao podem reintroduzir loop de renderizacao
- ao mexer na busca API, validar combinacao `idgrupo`/`idunidade` e comportamento com multi-select
