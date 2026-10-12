# Fontes de renda — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar o menu “Fontes de renda” e interfaces para listar, cadastrar e editar fontes de renda.

**Architecture:** Manter a navegação por `activeMenu` em `app/page.tsx`, seguindo Contas. Encapsular a funcionalidade em um componente de seção, componentes de apresentação e um hook próprio, evitando aumentar a lógica de API na página principal. Usar a autenticação Keycloak existente.

**Tech Stack:** Next.js 16, React 19, TypeScript e Tailwind CSS 4, sem novas dependências de produção.

**Spec:** Requisitos e decisões de interface descritos neste documento, a partir da solicitação de planejamento. Implementação autorizada pelo usuário na branch `feature/us-001-transferencia-entre-contas`.

## Contrato existente

Contrato conferido no checkout local `../finance`, commit `4fbab39`; não foi conferido o estado remoto do PR nem o ambiente publicado.

| Operação | Contrato atual |
| --- | --- |
| Listar | `GET /income-sources` → `200`, array de fontes |
| Consultar | `GET /income-sources/{id}` → `200`, fonte |
| Cadastrar | `POST /income-sources` → `201`, sem corpo |
| Editar | `PUT /income-sources/{id}` → `200`, fonte atualizada |

Fonte: `{ id: string, name: string, type: IncomeSourceType, description: string | null }`. Cadastro e edição enviam `{ name, type, description }`. O PUT substitui os dados; descrição omitida ou nula limpa o valor anterior. Nomes são únicos por tenant, ignorando diferenças entre maiúsculas/minúsculas e espaços nas pontas; duplicidade retorna `409`. Identificador inválido retorna `400`; fonte ausente ou de outro tenant retorna `404`.

**Escopo atualizado:** exclusão adiada por decisão do usuário. Esta entrega utiliza os endpoints existentes e não requer alterações no backend.

## Interface proposta

- Menu “Fontes de renda” na seção Finanças, próximo de Contas, com destaque de seleção, título correspondente no Header e fechamento do menu no celular.
- Listagem como entrada da seção: nome, tipo traduzido, descrição e ação “Editar”; botão “Nova fonte de renda”. Não acrescentar paginação ou filtros nesta entrega, pois a API retorna um array completo.
- Cadastro e edição como modos da mesma seção, reutilizando formulário. Campos: “Nome” obrigatório, “Tipo” obrigatório com opção inicial “Selecione”, “Descrição” opcional. Ações “Salvar fonte de renda” ou “Salvar alterações” e “Cancelar”.
- Editar consulta a fonte por ID antes de abrir o formulário. Cancelar retorna à listagem sem salvar. Após salvar, retornar à lista, recarregar os dados e mostrar confirmação.
- Manter aparência, tema escuro e comportamento responsivo existentes. Formulários com labels; mensagens anunciadas por `role="alert"`/`role="status"`.

Tipos exibidos: `SALARY` → Salário; `SERVICES` → Prestação de serviços; `RENT` → Aluguel; `BENEFIT_OR_PENSION` → Benefício ou pensão; `INVESTMENT_RETURNS` → Rendimentos de investimentos; `OTHER` → Outros.

## Restrições globais

- Sem alterações no cadastro de receitas, despesas, contas ou indicadores do dashboard.
- Obter token via `useAuth().getAccessToken()` antes das requisições e enviar `Authorization: Bearer …`; não enviar tenant escolhido pelo navegador.
- Não inventar limites de caracteres que não estejam no contrato. Recusar nome vazio ou composto apenas de espaços e exigir um dos seis tipos.
- Converter descrição vazia para `null`; edição deve permitir apagar uma descrição existente.
- Preservar campos em erros de envio, bloquear envios duplicados e distinguir falha de gravação de falha ao atualizar a listagem depois de uma gravação bem-sucedida.
- Implementar somente listagem, cadastro e edição de fontes de renda.

## Review Focus

1. POST sem corpo: sucesso não pode depender de `response.json()`.
2. Fonte alterada/removida em outra sessão: tratar `404` sem exibir dados antigos como atuais.
3. Duplicidade de nome: traduzir `409` para mensagem útil e preservar formulário.
4. Requisições concorrentes/navegação: resposta antiga não pode sobrescrever seleção nova; cancelar ou ignorar respostas após desmontagem.
5. Gravação concluída com falha no reload: informar sucesso da gravação e permitir recarregar sem duplicar a operação.

## Arquivos e responsabilidades

| Arquivo | Alteração |
| --- | --- |
| `types/menu.ts` | Acrescentar `incomeSources` |
| `components/Sidebar.tsx` | Acrescentar item do menu |
| `components/Header.tsx` | Acrescentar título da seção |
| `app/page.tsx` | Renderizar `IncomeSourcesSection` no menu correspondente |
| `lib/config.ts` | Exportar `incomeSourcesApiUrl` com base em `financeApiBaseUrl` |
| `types/incomeSource.ts` (novo) | Tipos, valores iniciais e labels dos seis tipos |
| `lib/incomeSourcesApi.ts` (novo) | Chamadas HTTP tipadas e tradução de erros |
| `hooks/useIncomeSources.ts` (novo) | Carregamento, mutações, feedback e controle de concorrência |
| `components/IncomeSourcesSection.tsx` (novo) | Coordenar lista, cadastro e edição |
| `components/IncomeSourceList.tsx` (novo) | Listagem e estados de carregamento/erro/vazio |
| `components/IncomeSourceForm.tsx` (novo) | Formulário compartilhado |

## Tarefa 1: modelos e cliente HTTP

**Arquivos:** `types/incomeSource.ts`, `lib/incomeSourcesApi.ts`, `lib/config.ts`.

**Interfaces:** `IncomeSourceType` como união dos seis enums; `IncomeSource` conforme contrato; `IncomeSourceFormValues` com `name`, `type: IncomeSourceType | ""`, `description: string`; `SaveIncomeSourcePayload` com nome, tipo válido e descrição anulável.

Cliente: `listIncomeSources(token, signal?): Promise<IncomeSource[]>`, `getIncomeSource(id, token, signal?): Promise<IncomeSource>`, `createIncomeSource(payload, token): Promise<void>`, `updateIncomeSource(id, payload, token): Promise<IncomeSource>`.

- [ ] Exportar URL `${financeApiBaseUrl}/income-sources` e os modelos/opções em português.
- [ ] Implementar cliente com validação de status antes de interpretar corpo; POST não faz parse de JSON de sucesso.
- [ ] Traduzir `400`, `401/403`, `404`, `409`, falha de rede e `5xx`; preservar código de erro para o coordenador decidir o tratamento.
- [ ] Verificar com respostas controladas: array vazio, seis tipos, POST 201 vazio, PUT com descrição nula, 409 e erro não JSON.

## Tarefa 2: listagem e navegação

**Arquivos:** `types/menu.ts`, `components/Sidebar.tsx`, `components/Header.tsx`, `app/page.tsx`, novos `hooks/useIncomeSources.ts`, `components/IncomeSourcesSection.tsx` e `components/IncomeSourceList.tsx`.

**Interfaces:** `IncomeSourcesSection()` obtém autenticação e usa o hook; `useIncomeSources()` expõe lista, carregamento, erro e `reload(): Promise<void>`. A lista recebe fontes e callbacks por ID, nunca por índice.

- [ ] Integrar menu `incomeSources`, título e renderização da seção no fluxo autenticado existente.
- [ ] Carregar ao entrar na seção e oferecer “Tentar novamente” em falhas; diferenciar carregamento, erro e lista vazia.
- [ ] Renderizar nome, tipo e descrição, com quebra de textos longos; ordenar por nome no cliente para apresentação estável.
- [ ] Cancelar/ignorar requisições antigas e limpar estado ao sair da seção.
- [ ] Verificar entrada pelo menu, fechamento no celular, tema escuro, lista vazia, falha seguida de retry e saída da seção durante carregamento.

## Tarefa 3: cadastro e edição

**Arquivos:** `components/IncomeSourceForm.tsx`, `components/IncomeSourcesSection.tsx`, `hooks/useIncomeSources.ts`.

**Interfaces:** seção controla modo `list | create | edit`, ID e valores; hook acrescenta `create(payload): Promise<void>` e `update(id, payload): Promise<void>`, estados de envio e resultado. Formulário recebe valores, `onChange`, `onSubmit`, `onCancel`, estado de envio e mensagens.

- [ ] Implementar formulário compartilhado, tipo inicial vazio e validação de nome/tipo; converter descrição vazia para null no payload.
- [ ] “Nova fonte de renda” inicia formulário limpo; editar consulta `GET /{id}` antes de preencher e bloqueia submissão enquanto carrega.
- [ ] Salvar via POST/PUT, bloquear envio repetido e preservar valores em erros; 409 mostra “Já existe uma fonte de renda com esse nome.”
- [ ] Após gravação, voltar à listagem e atualizar dados. Se apenas o reload falhar, informar que a fonte foi salva e oferecer nova tentativa de carregar, sem reenviar mutação.
- [ ] Verificar os seis tipos, campos obrigatórios, cancelamento, edição por ID, remoção de descrição, 409, 404 ao carregar/salvar, duplo clique em salvar e falha de reload após gravação bem-sucedida.

## Tarefa 4: validação integrada

- [ ] Executar `npm run lint`, `npx tsc --noEmit` e `npm run build`, registrando falhas preexistentes separadamente.
- [ ] Validar fluxo completo autenticado contra os endpoints existentes do backend e repetir com dois tenants para confirmar isolamento.

Usar `node:test` com o TypeScript já instalado para testes do contrato HTTP em `tests/incomeSources.test.mjs`, executados por `npm test`, sem novas dependências. Validar a interface autenticada em ambiente com credenciais de teste.

## Critérios de aceite

- Menu e título corretos em desktop e celular; UI utilizável em ambos os temas.
- Usuário consegue listar, cadastrar e editar fontes persistidas no backend.
- Tipos e payloads correspondem exatamente ao contrato, inclusive descrição anulável e POST sem corpo.
- Erros não apagam o formulário nem aparentam sucesso.
- Nenhum dado de outro tenant é exibido ou alterado; nenhuma regressão nas telas existentes.

## Revisão do plano

Escopo atualizado coberto pelas tarefas 1–4, sem dependência de novos endpoints. Exclusão permanece fora desta entrega. Contrato extraído do checkout local. Os cinco riscos do Review Focus possuem verificações nas tarefas correspondentes. Implementação local autorizada; publicação fora do escopo.

## Registro de execução

- Branch criada localmente: `feature/us-001-transferencia-entre-contas`.
- Execução no checkout atual para preservar os arquivos locais existentes; `keycloak/` não faz parte da alteração.
- Modelos, cliente HTTP, navegação, listagem e formulário implementados.
- Testes HTTP executados antes do cliente (falharam por módulo ausente) e depois (seis passaram).
- Verificação autenticada com dois tenants depende de credenciais de teste e permanece pendente.
- Revisão independente: nenhum problema material encontrado no escopo implementado.
- Verificações finais: `npm test` (6/6), `npx tsc --noEmit`, ESLint dos arquivos novos e `git diff --check` passaram.
- `npm run lint`: dois erros `react-hooks/set-state-in-effect` preexistentes em `components/Sidebar.tsx`, confirmados também no conteúdo de `HEAD` antes da alteração.
- `npm run build`: bloqueado por falha de conexão ao baixar Geist e Geist Mono de Google Fonts; não foi possível confirmar o build completo.
- Testes de interface no navegador e fluxo autenticado com dois tenants não foram executados.
