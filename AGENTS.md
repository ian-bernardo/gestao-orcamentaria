# AGENTS.md

## 1. Visão Geral do Projeto

Este projeto é um dashboard financeiro de gestão orçamentária com foco em DFC (Demonstração do Fluxo de Caixa), construído para permitir análise, edição e revisão de valores orçamentários em uma estrutura hierárquica.

A hierarquia principal do domínio é:

- DFC
- Conta
- Subconta

Cada linha pode trabalhar com três tipos de valor:

- `anterior`
- `proposta`
- `orcamento`

O sistema possui foco forte em comparação de valores, edição de proposta, identificação de pendências e resumo de salvamento com base no contexto atual da tela.

## 2. Stack Tecnológica

- Next.js com App Router
- React
- TypeScript
- Tailwind CSS
- `react-hot-toast`

## 3. Estrutura de Pastas

Estrutura principal esperada:

```text
src/
  app/
    budget/
      components/
      hooks/
      utils/
      types/
    user/
      components/
    shared/
      ui/
    lib/
    utils/
    data/
    App.tsx
    layout.tsx
    page.tsx
  imports/
  styles/
```

Responsabilidades:

- `src/`
  Raiz do código-fonte da aplicação. Tudo que participa diretamente da construção do dashboard deve ficar organizado a partir daqui.

- `src/app/budget/`
  Domínio principal do sistema. Tudo que pertence diretamente ao contexto orçamentário deve ficar aqui.

- `src/app/budget/components/`
  Componentes visuais do domínio de orçamento.

- `src/app/budget/components/BudgetHeader.tsx`
  Cabeçalho principal do dashboard. Centraliza identidade visual, título ou contexto global da tela.

- `src/app/budget/components/BudgetFilters.tsx`
  Bloco de filtros da tela. Controla grupo de negócio, unidade de negócio, período, ações de limpar, buscar e salvar.

- `src/app/budget/components/BudgetTable.tsx`
  Componente central do projeto. Renderiza a hierarquia DFC -> Conta -> Subconta, calcula totais, controla expansão das linhas e executa ações como edição, cópia, reset e preenchimento.

- `src/app/budget/hooks/`
  Espaço reservado para hooks específicos do domínio de orçamento.

- `src/app/budget/utils/`
  Regras utilitárias do domínio orçamentário. Ideal para filtros, comparação de snapshots, detecção de alterações, pendências e transformações da árvore DFC.

- `src/app/budget/utils/budgetInsights.ts`
  Lógica de comparação e leitura do orçamento. Centraliza `filteredData`, detecção de mudanças, pendências e visibilidade do resumo.

- `src/app/budget/utils/csvParser.ts`
  Conversão de dados importados para a estrutura hierárquica usada pela aplicação.

- `src/app/budget/types/`
  Tipagens do domínio orçamentário.

- `src/app/budget/types/budget.ts`
  Tipos centrais do domínio de orçamento, incluindo estrutura de linha, dados mensais e metadados como `changeType`.

- `src/app/user/`
  Domínio de usuário e contexto de perfil.

- `src/app/user/components/`
  Componentes relacionados a perfil, papel ou contexto de usuário.

- `src/app/user/components/UserSwitcher.tsx`
  Controle secundário para alternar o perfil de usuário entre `gestor` e `financeiro`. Deve ser discreto, isolado e sem impacto no layout principal.

- `src/app/shared/ui/`
  Design system local da aplicação. Contém componentes de interface reutilizáveis e agnósticos de domínio.

- `src/app/shared/ui/button.tsx`
  Botão base reutilizado em toda a aplicação.

- `src/app/shared/ui/dialog.tsx`
  Modal base usado para confirmações e resumos de salvamento.

- `src/app/shared/ui/popover.tsx`
  Base para menus flutuantes e popovers, como o seletor de perfil.

- `src/app/shared/ui/select.tsx`
  Componente de seleção usado nos filtros.

- `src/app/shared/ui/tooltip.tsx`
  Exibe dicas contextuais e indicadores auxiliares da interface.

- `src/app/lib/`
  Utilitários globais, constantes compartilhadas e artefatos que podem ser consumidos por mais de um domínio.

- `src/app/lib/business.ts`
  Constantes globais relacionadas a grupos e unidades de negócio.

- `src/app/utils/`
  Espaço reservado para utilitários genéricos que não pertencem a um domínio específico.

- `src/app/data/`
  Camada de dados mock e ponto de integração futura com backend.

- `src/app/data/mockData.ts`
  Ponto de entrada dos dados simulados usados na aplicação.

- `src/app/App.tsx`
  Componente orquestrador da tela principal. Controla estado global da página, snapshots, resumo de salvamento, filtros, tipo de usuário e ligação entre componentes.

- `src/app/layout.tsx`
  Layout global do App Router. Deve concentrar estrutura base da aplicação e wrappers globais.

- `src/app/page.tsx`
  Entry point da rota principal.

- `src/imports/`
  Arquivos de importação e insumos estáticos de dados, como CSVs usados para montar a estrutura inicial do DFC.

- `src/styles/`
  Estilos globais ou arquivos auxiliares de estilo, quando existirem.

- `src/global.d.ts`
  Declarações globais de tipos TypeScript usadas pelo projeto quando necessário.

Observação importante sobre componentes:

- Nem todo componente de `shared/ui` é usado ao mesmo tempo
- O agente deve priorizar reaproveitar componentes já existentes antes de criar novos
- Sempre que uma funcionalidade nova puder ser implementada com `dialog`, `popover`, `select`, `button` ou `tooltip`, essa abordagem deve ser preferida

## 4. Estrutura e Imports

Regras obrigatórias para organização e importação:

- Não usar imports relativos profundos como `../../../`
- Sempre usar alias `@/`
- Componentes de domínio não devem importar diretamente de outros domínios sem necessidade clara
- `shared/ui` é reutilizável por todo o sistema
- `lib` deve concentrar utilidades globais e constantes compartilhadas

Exemplos corretos:

```ts
import { Button } from '@/app/shared/ui/button';
import { Popover } from '@/app/shared/ui/popover';
import { BudgetTable } from '@/app/budget/components/BudgetTable';
```

Evitar:

```ts
import { Button } from '../../../shared/ui/button';
import { Popover } from './ui/popover';
```

## 5. Organização por Domínio

A aplicação segue organização por domínio + camadas.

Princípios:

- Cada domínio deve ser o mais independente possível
- Lógica de `budget` não deve ficar em componentes genéricos
- Componentes de UI base devem existir apenas em `shared/ui`
- Regras de negócio do orçamento devem permanecer dentro de `budget`
- Componentes de `user` devem cuidar apenas de contexto de usuário, perfil e permissões visuais

Quando criar novo código:

- Se for regra do orçamento, colocar em `budget`
- Se for controle de usuário, colocar em `user`
- Se for componente base reutilizável, colocar em `shared/ui`
- Se for utilitário global sem domínio específico, colocar em `lib` ou `utils`

## 6. Regras de Negócio (CRÍTICO)

### Alterações de valores

A lógica de alteração da `proposta` é sensível ao tipo de ação executada.

- Edição manual: conta como alteração
- Copiar `anterior -> proposta`: conta como alteração
- Zerar proposta: nao conta como alteração no resumo
- Editar após zerar: conta como alteração

O rastreamento dessas ações deve ser feito por metadado no valor mensal, usando `changeType`, por exemplo:

- `manual`
- `copy`
- `reset`
- `null`

Regras práticas:

- Se `proposta` mudou e `changeType` for `manual` ou `copy`, a alteração deve entrar no resumo
- Se `changeType` for `reset`, a alteração nao deve entrar no resumo
- Se o usuário editar manualmente após um reset, o `changeType` deve passar a `manual`

### Resumo de salvamento

O resumo de salvamento deve considerar apenas o contexto filtrado atual da UI.

Ele deve:

- considerar apenas o filtro ativo
- usar `baselineSnapshot` como base de comparação
- mostrar alterações reais
- mostrar pendências quando `proposta === 0`

O fluxo correto de comparação é:

- `baselineSnapshot -> data`

Observação importante:

- `originalSnapshot` representa histórico/base persistida
- `baselineSnapshot` representa a base atual da interface para comparação de mudanças depois de ações automáticas como reset

### Hierarquia

A estrutura do domínio deve sempre respeitar:

- DFC
- Conta
- Subconta

Mudanças de visualização, filtros, cálculos e resumos não devem quebrar essa estrutura. O agente deve preservar a árvore e evitar remover nós estruturalmente importantes sem necessidade explícita.

## 7. Estado da Aplicação

Estados conceituais importantes:

- `data`
  Estado principal da aplicação. É a fonte de verdade.

- `filteredData`
  Derivação visual via `useMemo`. Serve para exibição e leitura contextual, não para persistência nem como base primária de edição.

- `originalSnapshot`
  Histórico base do ciclo persistido/carregado.

- `baselineSnapshot`
  Base usada pela UI para comparação de alterações no resumo atual.

Regras obrigatórias:

- Nunca usar `filteredData` como fonte de verdade
- Nunca sobrescrever snapshots automaticamente sem motivo de negócio claro
- Atualizar `originalSnapshot` apenas em eventos que representem nova base persistida ou recarregada
- Atualizar `baselineSnapshot` apenas quando a regra de negócio exigir uma nova base visual de comparação, como após reset ou save

## 8. Padrões de Código

- Sempre usar imutabilidade com `map`, `spread`, `Object.fromEntries` e padrões equivalentes
- Não mutar objetos diretamente
- Componentes devem ser reutilizáveis e bem isolados
- Separar lógica em `utils` quando possível
- Preferir funções puras para transformação de dados
- Manter tipagem explícita e legível
- Evitar acoplamento excessivo entre componentes visuais e regras de negócio

## 9. UX/UI Guidelines

- A interface deve ser limpa, moderna e consistente com o dashboard atual
- Evitar `alert()` nativo
- Preferir `toast`, `dialog`, `popover` e componentes visuais customizados
- Usar FAB apenas para ações secundárias ou auxiliares
- Manter coerência visual com as cores já usadas no dashboard
- Não poluir a interface principal com controles experimentais
- Preservar legibilidade de tabela, modais e filtros

## 10. Perfis de Usuário

Existem dois modos de usuário planejados:

### Financeiro

- acesso completo
- pode editar valores
- vê todos os botões e ações

### Gestor

- visão simplificada
- sem ações destrutivas
- foco em leitura e análise

Ao implementar diferenças entre perfis, o agente deve preservar a consistência do layout e evitar duplicação de interface.

## 11. O que o agente DEVE fazer

- Seguir a estrutura existente do projeto
- Respeitar rigorosamente as regras de negócio
- Preservar a hierarquia DFC -> Conta -> Subconta
- Manter consistência visual com a UI atual
- Escrever código limpo, legível e tipado
- Isolar lógica de transformação em utilitários quando fizer sentido
- Tratar `filteredData` como derivação visual
- Manter comportamento previsível no resumo de salvamento

## 12. O que o agente NÃO deve fazer

- Não alterar a estrutura do projeto sem necessidade real
- Não quebrar regras de negócio já definidas
- Não usar `alert()`
- Não duplicar lógica em múltiplos componentes
- Não usar `any` sem necessidade real
- Não transformar `filteredData` em fonte de verdade
- Não mutar snapshots diretamente
- Não esconder nós estruturais da hierarquia sem intenção explícita do produto

## 13. Comandos úteis

```bash
npm run dev
npm run build
```

## 14. Observações importantes

- O projeto usa dados mock por enquanto
- Filtros devem afetar apenas visualização e contexto de leitura
- Salvamento deve respeitar o contexto atual exibido ao usuário
- O resumo de alterações e pendências depende fortemente da consistência entre `data`, `baselineSnapshot` e `originalSnapshot`
- Mudanças em regras de comparação devem ser feitas com cuidado, pois afetam diretamente a confiança do usuário no sistema
