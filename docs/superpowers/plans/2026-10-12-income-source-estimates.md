# Dia e valor estimado das fontes de renda — implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Atualizar cadastro, edição e listagem na branch `feature/003-dia-valor-estimado-fontes-renda`.
**Architecture:** Estender os modelos e o formulário existentes, com conversão/validação compartilhada para construir payload e preencher edição.
**Tech Stack:** React, Next.js, TypeScript e testes Node existentes; sem dependências novas.
**Spec:** Contrato conferido via `git show` na branch homônima do finance, commit `6b19901`; sem modificar seu checkout.

## Contrato e restrições

- `expectedDay`: número inteiro obrigatório entre 1 e 31 em POST/PUT.
- `estimatedAmount`: número obrigatório positivo, com até duas casas decimais em POST/PUT.
- GET pode retornar ambos como null para registros anteriores; apresentar “Não informado” e preencher edição com campos vazios.
- Formulário: “Dia previsto do recebimento” e “Valor estimado (R$)” obrigatórios. Aceitar valor decimal com vírgula ou ponto, sem separadores de milhar; explicar com exemplo.
- Listagem: dia previsto e valor formatado em BRL/pt-BR.
- Preservar nome, tipo, descrição, autenticação, endpoint e fluxos existentes. Exclusão fora de escopo.
- Recusar valores monetários cuja conversão para número JSON perca centavos; não arredondar entrada inválida silenciosamente.

## Tarefa 1: modelos e conversão

Arquivos: `types/incomeSource.ts`, novo `lib/incomeSourceForm.ts`, `tests/incomeSources.test.mjs`.

- [x] Testar conversão de formulário para payload numérico, limites 1/31, campos vazios, dia fracionário e fora do intervalo, valores negativos/zero/mais de duas casas, vírgula e ponto decimal.
- [x] Adicionar campos nullable na resposta, strings no formulário e números obrigatórios no payload.
- [x] Implementar `buildIncomeSourcePayload(values): SaveIncomeSourcePayload` (lança erro de validação) e `incomeSourceToForm(source): IncomeSourceFormValues`.
- [x] Verificar preenchimento com zero/null sem mascarar ausência e preservação de centavos em edição.

## Tarefa 2: formulário, listagem e erros HTTP

Arquivos: `components/IncomeSourceForm.tsx`, `components/IncomeSourcesSection.tsx`, `components/IncomeSourceList.tsx`, `lib/incomeSourcesApi.ts`.

- [x] Acrescentar os dois campos com labels, required, limites do dia e ajuda para valor decimal.
- [x] Utilizar as conversões compartilhadas em cadastro e edição; preservar campos em erro.
- [x] Exibir dia e valor estimado; distinguir ausência de zero sem valores fictícios.
- [x] Traduzir os quatro códigos `INCOME_SOURCE_EXPECTED_DAY_REQUIRED/INVALID` e `INCOME_SOURCE_ESTIMATED_AMOUNT_REQUIRED/INVALID`.
- [x] Verificar POST/PUT com os novos números e erros de validação em testes HTTP.

## Tarefa 3: verificação

- [x] Executar `npm test`, `npx tsc --noEmit`, ESLint dos arquivos alterados e `git diff --check`.
- [x] Executar lint completo e build, registrando falhas preexistentes ou limitações de rede.
- [x] Revisão independente das alterações, seguida de correções relevantes.
- [ ] Validar interface autenticada no navegador: pendente, sem sessão de teste disponível nesta execução.

## Review Focus

- Descrição nula ainda deve limpar valor no PUT.
- Campos ausentes em registros antigos não devem aparecer como dia 0 ou renda zero.
- Valor com três casas deve ser rejeitado, sem arredondamento.
- Cadastro e edição devem enviar números JSON, não strings localizadas.
- Falha no reload após salvar continua distinta de falha de gravação.

## Registro de execução

- Implementação realizada na branch solicitada, a partir da branch anterior com o cadastro de fontes de renda.
- Primeiro teste: seis cenários existentes passaram; cinco novos falharam pela ausência das conversões e das traduções de erro.
- Revisão independente identificou perda de um centavo em `90071992547400.09`; regressão reproduzida antes da correção. Agora a validação compara centavos exatos com a representação serializada do número JSON.
- Verificações finais: `npm test` 11/11, `npx tsc --noEmit`, ESLint dos arquivos alterados e `git diff --check` passaram.
- Lint completo: permanecem os dois erros preexistentes `react-hooks/set-state-in-effect` em `components/Sidebar.tsx`.
- Build: bloqueado por falha de conexão ao baixar Geist/Geist Mono de Google Fonts.
- Backend de destino preservado: `https://finance.italomariano.dev.br/income-sources`. O ambiente deve disponibilizar o novo contrato para aceitar os campos.
