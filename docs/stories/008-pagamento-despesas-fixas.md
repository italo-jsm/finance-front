# História: Pagamento de despesas fixas

**Tipo:** Feature / evolução
**Escopo:** Frontend
**Referência:** implementação local do repositório `finance`, consultada em 12/10/2026.

## História de usuário

Como usuário do controle financeiro, quero marcar uma despesa fixa, como a conta de luz, como paga, escolhendo a conta corrente de origem, para registrar sua quitação e acompanhar o débito no saldo dessa conta.

## Verificação da implementação existente

O backend já oferece o fluxo necessário. `FixedBillPaymentController.kt` recebe a confirmação; `PaymentService.kt` usa o valor integral da despesa e grava pagamento e débito na mesma transação. O bloqueio da despesa e a verificação de pagamentos anteriores impedem duplicidade, inclusive concorrente. A conta fixa e a competência original são preservadas. Somente a conta corrente escolhida sofre o débito, com origem `PAYMENT`, na data informada.

`FindExpenseHandler.kt` expõe a situação e a elegibilidade nas consultas por período e competência. `FixedBillPaymentTest.kt` contém cobertura de saldo, formas de pagamento, repetição, concorrência, rollback, contas inativas, dados históricos e isolamento por tenant. Esta verificação foi feita por leitura de código, contrato e testes; a suíte do backend não foi executada nesta entrega.

No frontend, `types/expense.ts` e a normalização em `app/page.tsx` ainda não preservam esses novos campos. A inferência atual de `isPaid` usa campos de pagamento no primeiro nível e não reconhece o resumo aninhado retornado por este fluxo. As listagens existentes são `components/ExpenseList.tsx` e `components/ExpenseHistoryTable.tsx`. A tela Contas já consulta saldos e movimentações.

Fontes no `finance`: `src/main/resources/META-INF/openapi.yaml`, `src/main/kotlin/br/com/italo/controller/FixedBillPaymentController.kt`, `domain/service/PaymentService.kt`, `application/handler/FindExpenseHandler.kt`, `application/handler/dto/ExpenseItemDto.kt`, `domain/model/ExpensePaymentSummary.kt` e `src/test/kotlin/br/com/italo/controller/FixedBillPaymentTest.kt` (caminhos Kotlin relativos a `src/main/kotlin/br/com/italo/`, quando abreviados).

## Contrato da API

- `POST /expenses/{id}/pay`, com autenticação existente e JSON contendo **exatamente** `paidFromAccountId` (UUID), `paymentDate` (data válida `YYYY-MM-DD`, ano entre 0001 e 9999) e `paymentMethod` (`PIX`, `DEBIT`, `CASH` ou `TRANSFER`). Não enviar valor, tenant ou outros campos: propriedades extras são rejeitadas.
- Sucesso: `204`, sem corpo. Erros: `400` para dados inválidos, despesa não elegível ou com pagamento anterior, conta de origem inativa ou de tipo incorreto; `404` para despesa ou conta inexistente ou inacessível ao tenant.
- Consultas de despesas retornam `paymentStatus` (`PENDING`, `PAID`, `PARTIALLY_PAID`, `REVERSED`), `canPay`, `totalPaid` e `payment`. Este último contém `id`, `amount`, `paymentDate`, `paymentMethod`, `paidFromAccountId` e `movementId`, ou é `null` quando não há pagamento ou existem vários pagamentos históricos. Conta de origem e movimento podem ser nulos em dados antigos.
- `canPay` é verdadeiro somente para despesa de `FIXED_BILL` pendente e sem pagamentos. Uma conta fixa inativa pode ter sua despesa quitada; a conta corrente de origem precisa estar ativa. Saldo negativo é permitido.
- Pagamentos anteriores, inclusive parciais e sem movimentação vinculada, impedem nova confirmação. Não inferir elegibilidade pelo valor restante.
- `paymentMovementId` e `canReverse` pertencem ao fluxo de estorno já existente. Não copiar `payment.movementId` para `paymentMovementId` nem habilitar estorno para este novo pagamento.

## Experiência proposta

Reutilizar **Últimas despesas** e **Todas as despesas**, oferecendo **Marcar como paga** apenas quando houver identificador e `canPay === true`, sem estorno registrado. A disponibilidade vem do backend; não exigir que a conta fixa esteja na lista de contas ativas. Campos ausentes não habilitam a ação.

Abrir um formulário simples na própria experiência existente, com descrição e valor integral somente para leitura. Solicitar conta corrente ativa, data e forma de pagamento. Proposta de simplicidade: iniciar a data no dia atual local e exigir seleção explícita da conta e da forma. Não criar rota, menu, biblioteca ou fluxo genérico de pagamentos.

Listar somente contas `CHECKING_ACCOUNT` ativas como origem. Sem conta disponível, explicar que é necessário cadastrar ou ativar uma conta corrente e impedir confirmação. Não bloquear por saldo insuficiente. Cancelar fecha o formulário sem enviar requisição.

Confirmar envia uma única requisição e apresenta **Registrando pagamento…**, bloqueando novos envios para a mesma despesa nas duas listagens. Não indicar quitação nem alterar saldo antes do sucesso. Tratar `204` sem ler JSON.

Após sucesso, consultar novamente as últimas despesas, o histórico se já consultado e as contas para atualizar saldos. Preservar filtros e ordenação; não abrir nem consultar histórico ainda não solicitado. A visualização existente de movimentações deve refletir o pagamento na próxima abertura ou atualização; invalidar dados carregados que possam aparecer como atuais. Não somar ou subtrair saldo no frontend.

Exibir situação com texto: **Pendente**, **Paga**, **Parcialmente paga** ou a identificação de estorno existente. `paymentStatus`, quando presente, é a fonte da situação; manter a compatibilidade atual para respostas antigas sem esse campo, mas sem disponibilizar pagamento por inferência. Não tratar qualquer `payment` como quitação integral. Quando houver resumo único, apresentar data, forma e conta de origem disponível; ausência de resumo ou de conta histórica não deve impedir a exibição da situação. Formatar datas sem deslocamento por fuso e valores em reais. Preservar conta fixa, data, categoria, valor e competência da despesa; pagamento em outro mês não muda os filtros nem os totais de despesas.

Em falha do POST, mostrar mensagem sem indicar sucesso ou repetir automaticamente. Para `400` ou `404`, reconciliar a listagem por nova consulta: esses erros podem representar indisponibilidade, dados inválidos ou pagamento anterior, sem afirmar que toda falha significa quitação. Em falha de rede com resultado incerto, exigir atualização antes de liberar nova tentativa.

Se o POST concluir e a atualização falhar, informar **Pagamento registrado, mas não foi possível atualizar os dados**, permitir repetir apenas a consulta e manter bloqueada nova confirmação do item já concluído. Não apresentar saldo anterior como atualizado. Reutilizar autenticação, mensagens, estilos e tratamento de sessão existentes.

## Critérios de aceite

1. Despesa fixa com identificador e `canPay === true` oferece a ação nas duas listagens, inclusive nos cartões móveis. Despesas sem elegibilidade, parcialmente pagas, pagas ou estornadas não permitem nova confirmação.
2. O formulário apresenta valor integral sem edição e exige conta corrente ativa, data válida e uma das quatro formas aceitas. Cancelar não envia requisição; ausência de conta de origem impede confirmar.
3. Confirmar envia somente os três campos contratados para `POST /expenses/{expenseId}/pay`, com autenticação existente. `204` é aceito sem leitura de corpo.
4. Envios simultâneos da mesma despesa ficam bloqueados, inclusive quando ela aparece nas duas listagens. Não há quitação otimista ou repetição automática do POST.
5. Uma conta de luz de R$ 200,00 paga usando uma conta corrente com R$ 1.000,00 passa a Paga e a consulta do saldo retorna R$ 800,00. Outra conta corrente permanece com seu saldo anterior; a conta fixa permanece vinculada à despesa.
6. O pagamento aparece nas movimentações da conta de origem como saída de R$ 200,00, origem Pagamento e data informada, após abertura ou atualização da visualização existente.
7. O fluxo funciona para PIX, débito, dinheiro e transferência. Conta de origem inativa ou de outro tipo não é oferecida; saldo insuficiente não bloqueia a confirmação.
8. Uma despesa de conta fixa inativa continua quitável se a API informar `canPay === true`. Pagamento em mês posterior preserva competência, data original, categoria e totais de despesas.
9. As consultas refletem a situação após sucesso e após recarregar a página. Filtros e ordenação são preservados; histórico não consultado não é buscado automaticamente.
10. Dados históricos com pagamento parcial, múltiplos pagamentos, conta de origem ausente ou movimento ausente são exibidos sem falha e sem liberar novo pagamento. `paymentStatus` prevalece sobre inferências antigas de `isPaid`.
11. Falhas `400`, `404` e de rede exibem mensagem e permitem reconciliar o estado sem sucesso fictício. Falha de consulta após `204` permite atualizar sem repetir o pagamento e identifica dados desatualizados.
12. A quitação não habilita Estornar nem modifica a elegibilidade do fluxo de estorno existente. Controles funcionam pelo teclado e permanecem legíveis no celular e nos temas existentes, sem depender apenas de cor.

## Fora do escopo

Pagamento parcial ou em lote, valor editável, juros, multas, descontos, recorrência automática, agendamento, integração bancária, transferências entre contas, estorno deste pagamento, regularização de dados históricos, novas telas, mudanças no backend, novas dependências e abstrações para necessidades futuras.

## Diretrizes e definição de pronto

Aplicar YAGNI e KISS: aproveitar listagens, seleção de contas, autenticação, mensagens e formatação existentes; compartilhar apenas o necessário para a mesma ação nas duas listagens. Na implementação futura, validar contrato, elegibilidade, situação, bloqueio de duplicidade, atualização de saldo e erros; executar testes pertinentes, lint, TypeScript e build. Validar o exemplo financeiro com backend autenticado disponível. Esta entrega contém somente a história, sem implementação de código de produto.
