# Estorno de despesas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Estornar despesas elegíveis e identificar estornadas nas duas listagens existentes.

**Architecture:** Um hook compartilhado pela página controla confirmação, bloqueio síncrono, POST e reconciliação. Um componente pequeno apresenta a situação e ação nas listas; a página mantém consultas e filtros existentes.

**Tech Stack:** Next.js, React, TypeScript, Tailwind e node:test, sem novas dependências.

**Spec:** docs/stories/007-estorno-despesas.md

## Global Constraints

- POST /expenses/{id}/reverse sem corpo; 204 sem leitura de JSON.
- Elegibilidade vem de canReverse; reversedDate vem do servidor.
- Não calcular saldo, criar telas, alterar cadastro ou ações de edição/exclusão.
- Preservar filtros, ordenação e arquivos locais de outras histórias.

## Review Focus

- Cliques antes do próximo render não podem duplicar POST.
- Falha após 204 deve permitir somente consulta, preservando bloqueio.
- Falha de rede exige reconciliação antes de novo envio.
- Histórico não consultado não deve ser buscado; filtros aplicados devem ser preservados.
- Registros antigos e datas devem renderizar corretamente em ambos os layouts.

### Task 1: Contrato e fluxo compartilhado

**Files:** lib/expenseReversalApi.ts; hooks/useExpenseReversal.ts; tests/expenseReversal.test.mjs.
**Interfaces:** reverseExpense(id: string, token: string): Promise<void>; useExpenseReversal(getAccessToken, refresh): estado, reverse(expense), reload(). refresh(): Promise<void> rejeita quando alguma consulta falha.

- [x] Escrever testes para POST autenticado sem corpo/204, erros HTTP/rede, confirmação/cancelamento, elegibilidade, bloqueio duplicado, sucesso seguido de falha de consulta e reconciliação sem repetir POST.
- [x] Executar node --test tests/expenseReversal.test.mjs; confirmar falha antes da implementação.
- [x] Implementar API e hook mínimos. Bloquear IDs confirmados até encerrar a sessão; em resultado incerto bloquear até consulta bem-sucedida. Não repetir POST automaticamente.
- [x] Executar os testes e confirmar sucesso.

### Task 2: Listagens e integração

**Files:** types/expense.ts; app/page.tsx; components/ExpenseReversalAction.tsx; components/ExpenseList.tsx; components/ExpenseHistoryTable.tsx; tests/expenseReversalUi.test.mjs.
**Interfaces:** componente recebe expense, busy, blocked, onReverse; página fornece o mesmo hook às duas listas e guarda os últimos filtros aplicados.

- [x] Escrever testes de renderização para elegíveis, antigos, estornadas, processamento e ambos os layouts. Confirmar falha antes da implementação.
- [x] Preservar canReverse/reversedDate na normalização; adicionar ação, data e fundo/borda distintos com contraste claro/escuro.
- [x] Integrar atualização independente de contas, últimas despesas e histórico previamente consultado usando Promise.allSettled; erros de saldo ocultam valores anteriores, e falhas rejeitam refresh. Preservar ordenação no componente existente.
- [x] Exibir feedback acessível e Atualizar dados nas duas telas, sem reenviar estorno. Invalidar respostas de consultas anteriores à reconciliação e de sessões encerradas.
- [x] Executar npm test, npm run lint, npx tsc --noEmit e npm run build; revisar diff contra a história.
- [x] Commitar somente arquivos desta história na branch feature/estorno-despesas; manter sem merge/push.

## Resultado da execução

- Branch `feature/estorno-despesas`, criada da `main` atualizada em `01752d3`.
- 50 testes passaram, incluindo contrato HTTP, hook, renderização e integração das consultas da página; os testes iniciais falharam antes da implementação.
- Revisão independente identificou falha de obtenção do token após estorno mantendo saldo anterior. Corrigida com teste de regressão que falhou antes da correção e passou depois.
- TypeScript e ESLint dos arquivos desta entrega passaram. O lint global mantém duas falhas anteriores em `components/Sidebar.tsx`, idêntico à `main` e preservado nesta entrega.
- Primeiro build bloqueado pelo download das fontes Google; build repetido com acesso à rede e concluído com sucesso.
- Sem merge ou push; arquivos locais da história 006 e de seu plano preservados fora do commit.
