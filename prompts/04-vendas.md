# Etapa 04 — Vendas

Leia `AGENTS.md` e `docs/PROGRESSO.md`. Esta é a **ETAPA 04**. Pré-requisito: etapa 03 concluída. Se o `PROGRESSO.md` disser que não está, pare e me avise.

## Objetivo

CRUD completo de **vendas**, listadas por mês, com totais. Siga o mesmo padrão de código e de interface do CRUD de despesas (mesma navegação de mês, mesmos tipos de mensagem, mesma estrutura de serviço, IPC e páginas). Não reinvente: reaproveite.

## Tarefas

### 1. Camadas

- Serviço `src/main/servicos/vendas.ts` (recebe a conexão): listar por mês (com totais), buscar por id, criar, atualizar, excluir, e listar canais já usados.
- Handlers IPC e métodos em `window.api.vendas`, com `Resultado<T>` e validação no main.
- Páginas: `/vendas`, `/vendas/nova`, `/vendas/:id/editar`.

### 2. Lista

- Colunas: Data, Cliente, Descrição, Canal, Valor, Taxas, Líquido (valor − taxas), ações.
- Ordem: data decrescente, depois id decrescente.
- Rodapé: **faturamento bruto**, **taxas** e **receita líquida** do mês.
- Mês sem registros: mensagem amigável e botão para adicionar.

### 3. Formulário

- Data (padrão: hoje), Cliente (opcional), Descrição (obrigatória; ex.: "Suporte de headset, PLA preto"), Canal, Valor cobrado (obrigatório, maior que zero), Taxas (opcional, padrão 0), Observação.
- **Canal:** campo de texto com sugestões (`<datalist>`) formadas pelos canais já usados nas vendas, somados a Shopee, Mercado Livre, Instagram, WhatsApp e Presencial, sem repetir.
- Validações: data válida, descrição não vazia, valor maior que zero, taxas não negativas e **não maiores que o valor** (mensagem clara no campo de taxas).
- Em erro, **mantenha o que foi digitado**.
- Ao salvar, volte para a lista do mês da data salva, com mensagem de sucesso.
- Excluir com `ConfirmarModal`.

### 4. Testes (Vitest, serviço com banco `:memory:`)

- Criar venda com valor `150,00` e taxas `12,50` → grava `15000` e `1250`; o líquido calculado é `13750`.
- Taxas maiores que o valor → erro no campo taxas, nada gravado.
- Campos opcionais vazios são salvos como `NULL`.
- Editar, excluir, bordas de mês (31/10, 01/11, 30/11, 01/12) e ID inexistente → erro "não encontrado".
- A lista de canais não duplica e inclui os canais já cadastrados.

## Critérios de aceite

- `npm run typecheck` e `npm test` passam.
- No app: lançar vendas em dois meses diferentes e conferir os totais de cada mês.
- `docs/PROGRESSO.md` atualizado.

## Fora do escopo

Resumo mensal, busca/filtros (etapa 06), CSV (etapa 07).

Ao terminar, siga o "Protocolo de encerramento" do `AGENTS.md`.
