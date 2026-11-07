# Etapa 03 — Despesas

Leia `AGENTS.md` e `docs/PROGRESSO.md`. Esta é a **ETAPA 03**. Pré-requisito: etapa 02 concluída. Se o `PROGRESSO.md` disser que não está, pare e me avise.

## Objetivo

CRUD completo de **despesas**, listadas por mês, com total do mês. Reaproveite `dinheiro.ts`, `datas.ts`, `validacao.ts`, `Campo` e `ConfirmarModal` da etapa anterior, e siga o mesmo padrão em camadas das categorias.

## Tarefas

### 1. Navegação de mês reutilizável

Componente `NavegacaoMes` com: `← mês anterior`, o nome do mês da tela (ex.: "novembro de 2026"), `próximo mês →` e um link "Mês atual". Será reutilizado em vendas e resumo. O mês vem do parâmetro `?mes=AAAA-MM` na URL (`useSearchParams` + `mesValidoOuAtual`).

### 2. Camadas

- Serviço `src/main/servicos/despesas.ts` (recebe a conexão): listar por mês (com totais), buscar por id, criar, atualizar, excluir.
- Handlers IPC e métodos em `window.api.despesas`, tudo com `Resultado<T>` e validação **no main**.
- Páginas: `/despesas` (lista), `/despesas/nova`, `/despesas/:id/editar`.

### 3. Lista

- Colunas: Data, Categoria, Descrição, Fornecedor, Valor, ações (Editar, Excluir).
- Ordem: data decrescente, depois id decrescente.
- Categoria com `conta_no_lucro = 0` aparece marcada como "(investimento)".
- Rodapé: **total do mês** e, se houver, quanto desse total é investimento (fora do lucro).
- Mês sem registros: mensagem "Nenhuma despesa neste mês" e botão para adicionar.

### 4. Formulário

- Data (padrão: hoje), Categoria (só categorias **ativas**; na edição, inclua também a categoria atual mesmo se estiver inativa), Descrição (obrigatória), Fornecedor, Valor (obrigatório, aceita vírgula), Observação.
- Validações com mensagens ao lado do campo: data válida, categoria existente, descrição não vazia, valor maior que zero.
- Em erro, **mantenha o que foi digitado**.
- Ao salvar, volte para a lista **do mês da data salva**, com mensagem de sucesso.
- Excluir com `ConfirmarModal` e mensagem de sucesso depois.

### 5. Testes (Vitest, serviço com banco `:memory:`)

- Criar com valor `1.234,56` → grava `123456`.
- Valor inválido e data inválida não gravam e devolvem erro por campo.
- Editar altera o registro e atualiza `atualizado_em`.
- Excluir remove.
- A listagem só traz despesas do mês pedido (inclua registros em 31/10, 01/11, 30/11 e 01/12 para testar as bordas) e o total confere, inclusive o de investimentos.
- ID inexistente em editar/excluir → erro "não encontrado" (não exceção).
- Categoria inexistente → erro no campo categoria.

## Critérios de aceite

- `npm run typecheck` e `npm test` passam.
- No app: lançar 3 despesas em meses diferentes e navegar entre os meses mostra só o que pertence a cada um, com totais corretos. Voltar da edição mantém o mês da lista.
- `docs/PROGRESSO.md` atualizado.

## Fora do escopo

Vendas, resumo, busca/filtros (etapa 06), CSV (etapa 07).

Ao terminar, siga o "Protocolo de encerramento" do `AGENTS.md`.
