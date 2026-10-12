# Pagamento de despesas fixas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Quitar despesa fixa nas listagens e refletir o débito na conta corrente escolhida.
**Architecture:** Normalizar os campos de pagamento retornados pela API, compartilhar ação de exibição e um formulário controlado pela página. Reconsultar despesas e contas após confirmação; servidor continua responsável pelo saldo.
**Tech Stack:** Next.js, React, TypeScript, Tailwind, node:test; sem novas dependências.
**Spec:** docs/stories/008-pagamento-despesas-fixas.md

## Global Constraints

- YAGNI e KISS; reutilizar listagens, autenticação, consultas e estilos existentes.
- POST contém exatamente paidFromAccountId, paymentDate e paymentMethod; resposta 204 sem corpo.
- Pagamento integral, conta corrente ativa, saldo negativo permitido.
- Não ampliar estorno nem reconstruir pagamentos históricos.
- Branch feature/pagamento-despesas-fixas a partir da main atualizada; preservar arquivos locais alheios.

## Review Focus

- Respostas atrasadas de consulta não podem restaurar pendência depois de pagamento.
- Falha de rede exige reconciliação antes de novo envio.
- Falha de consulta após sucesso não libera segundo pagamento.
- Sessão encerrada não pode aplicar respostas ou reenviar operação anterior.
- Resumos históricos parciais ou ausentes não significam quitação integral.

### Task 1: Integrar pagamento e situação nas duas listagens

**Files:** Criar lib/expensePayment.ts, lib/expensePaymentApi.ts, hooks/useExpensePayment.ts, components/ExpensePaymentAction.tsx, components/ExpensePaymentForm.tsx e tests/expensePayment*.test.mjs. Modificar types/expense.ts, app/page.tsx, components/ExpenseList.tsx e components/ExpenseHistoryTable.tsx.

**Interfaces:** Normalização produz paymentStatus, canPay, totalPaid, payment e isPaid compatível. payExpense(id, payload, token): Promise<void>. Ação recebe despesa, contas, bloqueio e callback. Hook mantém seleção, locks, resultado confirmado/incerto e reconciliação; página fornece refresh(): Promise<void> que rejeita se qualquer consulta falhar.

- [x] Escrever testes de contrato, validação de formulário, normalização, elegibilidade e renderização das duas listagens; executar e confirmar falha pela feature ausente.
- [x] Implementar helpers e API com contrato exato e erros HTTP/rede distintos; preservar campos de estorno sem inferir elegibilidade.
- [x] Implementar ação compartilhada e formulário com conta corrente ativa, data local e forma explícita; cancelar sem envio.
- [x] Integrar hook único na página para bloquear duplicidade nas duas listagens, confirmar somente após 204 e reconciliar erros; proteger resultados por geração de sessão.
- [x] Atualizar consultas com filtros preservados, sem abrir histórico não consultado; impedir respostas anteriores de sobrescrever o resultado. Movimentações existentes são remontadas ao abrir Contas.
- [x] Testar bloqueio, sucesso com refresh falho, rede incerta e sessão; executar npm test, npm run lint, npx tsc --noEmit e npm run build.
- [x] Revisar diff e registrar evidências; manter branch pronta para revisão, sem merge ou push.

## Evidências e decisões

- Main atualizada por `git pull --ff-only` antes de criar a branch. Trabalho realizado no checkout atual, preservando os arquivos locais alheios.
- Baseline: 39 testes aprovados. Feature: 54 testes aprovados, incluindo regressões de saldo atrasado, invalidação de movimentações e filtros de histórico.
- Revisão independente identificou duas condições de dados desatualizados; ambas reproduzidas em teste antes da correção e aprovadas depois.
- Corrigido contrato de tipagem para aceitar conta de origem nula nas respostas da API.
- Lint dos arquivos alterados e TypeScript aprovados. Lint global mantém dois erros preexistentes em `components/Sidebar.tsx` (set-state-in-effect); arquivo fora do escopo preservado.
- Build precisa de rede para as fontes Google existentes. Build com acesso autorizado à rede aprovado.
- Sem validação com backend autenticado ou operação bancária real. Sem merge ou push.
