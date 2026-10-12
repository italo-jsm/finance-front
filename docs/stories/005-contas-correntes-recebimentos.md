# História: Cadastro de conta corrente e recebimentos

**Tipo:** Feature / evolução
**Escopo:** Frontend
**Referência:** finance PR #6, mergeada na main no commit d109344; cadastro e confirmação de rendimentos disponíveis na API.

## História de usuário

Como usuário do controle financeiro, quero cadastrar uma conta corrente com saldo inicial e registrar meus recebimentos, para acompanhar valores previstos e confirmar sua entrada na conta.

## Tela 1 — Contas

Ampliar a tela de contas existente com o campo obrigatório Saldo inicial, somente no cadastro de conta corrente. Aceitar valores positivos, zero e negativos, com até 13 dígitos inteiros e duas casas decimais, sem arredondamento silencioso. Enviar `initialBalance` no `POST /accounts` com `accountType: CHECKING_ACCOUNT`.

Não permitir editar o saldo inicial ou atual; não enviar esses campos no `PUT /accounts/{id}`. Preservar o cadastro dos demais tipos de conta. Apresentar o saldo atual retornado por `GET /accounts`, mensagens de sucesso/erro e atualizar a lista após salvar.

## Tela 2 — Recebimentos

Adicionar acesso Recebimentos ao menu. Na mesma tela, oferecer formulário de cadastro e listagem por mês da data prevista, inicialmente o mês atual.

Exigir fonte de renda existente, competência (mês/ano), valor positivo, data prevista e conta de destino do tipo conta corrente. Competência é independente das datas. Valores monetários respeitam a precisão do backend. Salvar por `POST /incomes`, sem `receivedDate`; a renda nasce pendente.

Listar por `GET /incomes?month=YYYY-MM`, apresentando fonte, competência, valor, conta, data prevista, situação, data de recebimento e checkbox Recebido. Permitir editar pendentes por `PUT /incomes/{id}` na mesma tela. Atualizar a lista após salvar; se o item pertence a outro mês previsto, exibir esse mês.

## Checkbox Recebido

Disponível somente para registros salvos e pendentes. Ao marcar, chamar imediatamente `POST /incomes/{id}/receive` com `{ "receivedDate": "YYYY-MM-DD" }`.

**Decisão de simplicidade:** usar a data atual local do usuário e explicar isso na tela. Bloquear envios repetidos enquanto a requisição estiver em andamento. Marcar definitivamente somente após sucesso; em erro, manter pendente e apresentar mensagem. Após sucesso, manter marcado/desabilitado e bloquear edição. Atualizar o saldo consultando a API; o frontend não calcula créditos.

## Critérios de aceite

1. Cadastrar conta com R$ 1.000,00 apresenta saldo atual de R$ 1.000,00.
2. Saldo ausente ou com precisão inválida impede cadastro; zero e negativo são aceitos.
3. Cadastro e edição dos outros tipos de conta preservam seu comportamento, sem enviar saldo inicial.
4. Edição de conta corrente não apresenta nem envia saldo editável.
5. Cadastrar renda de R$ 500,00 mantém situação pendente e não altera saldo.
6. Todos os campos obrigatórios são validados; apenas contas correntes são oferecidas como destino.
7. A consulta mensal considera data prevista, preservando competência independente.
8. Marcar Recebido chama receive com a data atual; sucesso bloqueia nova confirmação e edição.
9. Após receber R$ 500,00 na conta com R$ 1.000,00, o saldo consultado é R$ 1.500,00.
10. Falhas não apresentam recebimento como confirmado; cliques repetidos não geram novas requisições simultâneas.
11. A confirmação preserva competência, previsão, fonte, conta e valor.
12. Sem fontes ou contas correntes, orientar o cadastro prévio. Apresentar carregamento, lista vazia e falhas de consulta.
13. Reutilizar autenticação e isolamento por tenant da API; não enviar tenant pelo formulário.

## Fora do escopo

Estornos, exclusão de rendas, recebimentos parciais, recorrência, transferências, extrato, integração bancária, alterações no backend, novas dependências e abstrações para necessidades futuras.

## Diretrizes e definição de pronto

Seguir YAGNI e KISS, reutilizando os padrões React/Next/Tailwind e autenticação existentes. Concluir quando as duas telas atenderem aos critérios, com testes dos contratos e validações, lint, TypeScript e build verificados. Validação integrada com backend autenticado depende de ambiente e credenciais disponíveis.
