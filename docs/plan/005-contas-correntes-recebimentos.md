# Plano de implementação — Contas correntes e recebimentos

> Executar com superpowers:executing-plans, tarefa a tarefa; sem alterações no backend.

**Objetivo:** permitir cadastrar conta corrente com saldo inicial e cadastrar/editar rendas pendentes e confirmar recebimentos pelo checkbox.
**Arquitetura:** ampliar AccountForm/AccountList e manter a integração existente de contas em app/page.tsx. Adicionar tipos, validação, cliente REST e uma seção React para recebimentos, seguindo a seção de fontes existente. Usar o saldo retornado pelo servidor.
**Stack:** Next.js, React, TypeScript, Tailwind, node:test; sem novas dependências.
**História:** ../stories/005-contas-correntes-recebimentos.md

## Restrições

- YAGNI/KISS; preservar demais tipos de conta e autenticação Bearer existente.
- Precisão máxima: 13 dígitos inteiros e duas casas decimais; saldo pode ser zero/negativo, renda deve ser positiva.
- Confirmar usando data local atual; não incluir receivedDate no cadastro/edição.
- Não alterar backend, publicar, criar PR ou fazer push.
- Executar no checkout atual e deixar alterações revisáveis, sem commit automático.

## Pontos de revisão

- Saldo inicial omitido no PUT e em tipos diferentes de CHECKING_ACCOUNT.
- Datas e competência inválidas; separação entre mês previsto e competência.
- POST de cadastro retorna 201 sem corpo: recarregar lista para obter identificador.
- Falha de atualização após uma escrita bem-sucedida não deve induzir novo cadastro/confirmação.
- Cliques repetidos, respostas de meses antigos e desmontagem não devem sobrescrever estado atual.

## Tarefa 1 — Saldo inicial e apresentação de saldo

**Arquivos:** types/account.ts, lib/money.ts, lib/accountForm.ts, components/AccountForm.tsx, components/AccountList.tsx, app/page.tsx, tests/accounts.test.mjs.
**Interface:** buildAccountPayload(values: AccountFormValues, editing: boolean), parseMoney(value: string, allowNonPositive: boolean): number.

- [x] Criar testes para saldo zero/negativo, ausência, limites monetários, omissão no PUT e demais tipos.
- [x] Rodar testes e observar falha antes da implementação.
- [x] Implementar validação monetária e payload de conta, campo de cadastro e exibição do saldo retornado.
- [x] Executar testes de contas e verificar regressões de cadastro/edição.

## Tarefa 2 — Contratos de recebimentos

**Arquivos:** types/income.ts, lib/incomeForm.ts, lib/incomesApi.ts, lib/config.ts, tests/incomes.test.mjs.
**Interfaces:** buildIncomePayload(values: IncomeFormValues): SaveIncomePayload; getLocalDate(date?: Date): string; listIncomes(month, token, signal?), createIncome(payload, token), updateIncome(id, payload, token), receiveIncome(id, receivedDate, token).

- [x] Criar testes para campos obrigatórios, calendário, competência independente, valor, cadastro 201 vazio, filtro mensal, PUT e receive.
- [x] Rodar testes e observar falha.
- [x] Implementar tipos/validações e cliente com autenticação, erros HTTP/rede e AbortSignal nas consultas.
- [x] Executar testes dos contratos, incluindo falha de receive e data local perto da mudança de dia UTC.

## Tarefa 3 — Tela de recebimentos e navegação

**Arquivos:** components/IncomesSection.tsx, components/IncomeForm.tsx, components/IncomeList.tsx, types/menu.ts, components/Sidebar.tsx, components/Header.tsx, app/page.tsx.
**Consome:** interfaces da tarefa 2, useIncomeSources, useAuth e dados de contas da página.

- [x] Criar testes de renderização para formulário, destinos correntes e checkbox de pendentes/recebidos.
- [x] Observar falha dos testes antes de criar componentes.
- [x] Implementar formulário, edição pendente, listagem mensal, estados vazios/carregamento/erro.
- [x] Implementar checkbox com trava síncrona de envio, confirmação somente após sucesso e recarga do saldo; manter escrita confirmada mesmo se a recarga falhar.
- [x] Integrar menu/cabeçalho/página; evitar sobrescrita por consultas antigas com AbortController.
- [x] Rodar testes, lint, TypeScript e build. Revisar critérios e solicitar revisão independente; corrigir achados relevantes.

## Registro de execução

- Baseline: 11 testes existentes aprovados.
- Decisão: implementação no checkout atual para manter alterações visíveis no workspace do usuário.

- Tarefas 1–3 implementadas. Testes inicialmente falharam pela ausência dos módulos/componentes; após implementação, 26 testes aprovados.
- Revisão independente: corrigida a apresentação de falha após conta salva e recarga malsucedida. Formulário é limpo e sucesso preservado; erro de consulta é exibido separadamente.
- TypeScript e build de produção aprovados (build precisou de rede para baixar Geist via next/font).
- Lint dos arquivos novos e alterados, exceto Sidebar, aprovado. Lint geral bloqueado por dois erros preexistentes react-hooks/set-state-in-effect em components/Sidebar.tsx (a alteração nesse arquivo apenas acrescenta o item de menu).
- Limite da validação: testes de contratos e renderização estática; fluxo completo no navegador contra backend autenticado não executado.
