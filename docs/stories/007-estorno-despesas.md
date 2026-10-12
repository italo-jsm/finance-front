# História: Estorno de despesas à vista

**Tipo:** Feature / evolução
**Escopo:** Frontend
**Referência:** contratos existentes no repositório `finance`, consultados em 12/10/2026.

## História de usuário

Como usuário do controle financeiro, quero estornar uma despesa paga à vista e identificar as despesas estornadas na lista, para corrigir um lançamento sem perder seu histórico e acompanhar a devolução do valor à conta relacionada.

## Contexto e contratos existentes

O backend já registra o débito de despesas pagas no cadastro por `PIX`, `DEBIT`, `CASH` ou `TRANSFER`. O estorno integral preserva a despesa, o pagamento e o débito original, cria um crédito na mesma conta e não transforma a despesa em pendente.

- `GET /expenses?beginDate=YYYY-MM-DD&endDate=YYYY-MM-DD`: mantém despesas estornadas na consulta e retorna, em cada item, `reversedDate` (data do estorno ou `null`), `canReverse` (disponibilidade da ação) e `paymentMovementId` (débito vinculado ou `null`).
- `POST /expenses/{id}/reverse`: recebe o identificador da despesa e **não recebe corpo**. Retorna `204`, sem corpo, quando concluído; `400` para despesa já estornada ou não elegível; `404` para despesa inexistente ou indisponível ao tenant autenticado.
- A data do estorno é definida pelo backend. Não solicitar nem enviar data, valor, conta ou motivo.
- Despesas históricas sem débito vinculado e despesas pagas por outros fluxos não são elegíveis. Usar `canReverse` como fonte da disponibilidade; não deduzir elegibilidade a partir da forma de pagamento ou de `isPaid`.
- O backend exclui estornadas dos totais de despesas efetivas retornados pela consulta por competência. O frontend não deve calcular créditos ou modificar saldos localmente.

Fontes no `finance`: `src/main/resources/META-INF/openapi.yaml`, `ExpenseController.kt`, `ExpenseItemDto.kt`, `FindExpenseHandler.kt`, `ReverseExpenseService.kt` e `ExpenseReversalTest.kt`.

## Experiência proposta

**Decisão de simplicidade:** reutilizar as listagens existentes de **Últimas despesas** e **Todas as despesas**, com a mesma ação e identificação de estorno. Não criar rota, menu ou tela adicional.

Preservar `reversedDate` e `canReverse` no tipo e na normalização da resposta da API. Campos ausentes em registros antigos equivalem a ausência de estorno e ação indisponível.

Oferecer **Estornar** somente para uma despesa com identificador, `canReverse === true` e sem `reversedDate`. Ao acionar, pedir confirmação simples, seguindo o padrão existente da aplicação, com descrição, valor e aviso de que o valor integral será devolvido à conta relacionada. Cancelar não envia requisição.

Após confirmar, enviar o POST e sinalizar **Estornando…**, impedindo requisições simultâneas para a mesma despesa, inclusive se aparecer nas duas listagens. Não marcar como estornada antes do sucesso. Tratar `204` sem tentar ler JSON.

Após sucesso, apresentar mensagem e consultar novamente as últimas despesas, o histórico se já tiver sido consultado e as contas para atualizar os saldos. Preservar os filtros aplicados e a ordenação do histórico. Não executar uma busca de histórico ainda não solicitada pelo usuário. A despesa permanece nas listagens em que atende aos filtros da data original.

Uma despesa com `reversedDate` deve apresentar fundo ou borda de cor distinta e o texto **Estornada em DD/MM/AAAA**, com contraste adequado nos temas claro e escuro. Aplicar a identificação nas linhas da tabela e nos cartões para dispositivos móveis, sem depender apenas da cor. Preservar descrição, data original e valor original; não exibir valor negativo nem situação pendente para representar estorno. Exibir a data recebida sem deslocamento de dia por fuso horário. Não oferecer novo estorno.

Em falha do POST, apresentar mensagem e não indicar conclusão. Para `400` ou `404`, atualizar a listagem para refletir eventual mudança de estado e informar que a despesa já foi estornada ou não está disponível para a ação. Não repetir o POST automaticamente. Em falha de rede com resultado incerto, orientar a atualização da consulta antes de tentar novamente.

Se o POST tiver sucesso e alguma atualização falhar, informar que o estorno foi concluído, mas os dados não puderam ser atualizados, oferecendo nova consulta sem repetir o estorno. Manter a ação bloqueada para o item confirmado e não apresentar saldo anterior como atualizado.

## Critérios de aceite

1. Despesa elegível apresenta Estornar nas listagens existentes; despesas com `canReverse` falso ou ausente, sem identificador ou já estornadas não apresentam a ação.
2. Cancelar a confirmação não altera a despesa nem envia requisição. Confirmar envia um único `POST /expenses/{expenseId}/reverse`, sem corpo, com autenticação existente.
3. Durante o envio há indicação de processamento e bloqueio de envios simultâneos para a mesma despesa. `204` é tratado como sucesso sem leitura de corpo.
4. Após sucesso, a despesa permanece visível quando atende aos filtros, apresenta a data retornada pelo backend e não permite novo estorno, inclusive após recarregar a página.
5. Despesas estornadas e não estornadas aparecem juntas. As estornadas têm destaque de cor e texto com a data nas últimas despesas, na tabela do histórico e nos cartões móveis, em ambos os temas.
6. O estorno preserva os dados originais e não apresenta a despesa como pendente. Filtros e ordenação continuam usando a data original da despesa.
7. Para uma conta com saldo de R$ 1.000,00, uma despesa à vista de R$ 200,00 reduz o saldo retornado pela API para R$ 800,00; após estorná-la, a nova consulta apresenta R$ 1.000,00. O frontend não soma ou subtrai valores do saldo.
8. Após estorno, as últimas despesas, o histórico previamente consultado e os saldos são atualizados por consulta, preservando os filtros e a ordenação escolhidos, sem buscar histórico ainda não solicitado.
9. Erros `400`, `404` e demais falhas apresentam mensagem, sem sucesso fictício ou repetição automática do POST. A consulta permite reconciliar o estado real da despesa.
10. Falha de atualização após `204` informa sucesso do estorno e falha de consulta separadamente, permite tentar atualizar e não habilita outro estorno do item confirmado.
11. Registros antigos sem os novos campos continuam sendo exibidos, sem disponibilizar estorno por inferência.
12. A ação funciona pelo teclado, permanece legível em dispositivos móveis e reutiliza autenticação e isolamento por tenant, sem solicitar tenant no formulário.

## Fora do escopo

Estorno parcial, estorno em lote, escolha de data ou conta de devolução, motivo obrigatório, desfazer estorno, integração bancária, alterações no cadastro de despesas ou nas ações existentes de edição e exclusão, filtros exclusivos de estorno, novas telas, alterações no backend, novas dependências e abstrações para necessidades futuras.

## Diretrizes e definição de pronto

Seguir KISS e YAGNI: reutilizar os componentes, confirmação, mensagens, autenticação e estilos existentes; centralizar apenas o fluxo necessário para as duas listagens. Validar elegibilidade, confirmação/cancelamento, contrato sem corpo e resposta `204`, bloqueio de envio duplicado, destaque e data, atualização das consultas e tratamento de erros. Executar lint, TypeScript e build na implementação futura. Validação integrada depende de backend autenticado disponível. Esta entrega contém somente a história, sem implementação.
