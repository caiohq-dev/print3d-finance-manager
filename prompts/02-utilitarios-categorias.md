# Etapa 02 — Utilitários (dinheiro e datas) + Categorias

Leia `AGENTS.md` e `docs/PROGRESSO.md`. Esta é a **ETAPA 02**. Pré-requisito: etapa 01 concluída. Se o `PROGRESSO.md` disser que não está, pare e me avise.

## Objetivo

Criar as peças reutilizáveis que todas as telas vão usar (dinheiro, datas, validação, modal de confirmação) e entregar o primeiro CRUD completo, ponta a ponta (tela → IPC → serviço → banco): **categorias de despesa**.

## Tarefas

### 1. `src/shared/dinheiro.ts`

- `paraCentavos(texto: string)` devolve `{ ok: true; valor: number } | { ok: false; erro: string }` (mensagem em português), convertendo **por manipulação de string**, sem `parseFloat`.
  - Aceita: `12`, `12,5`, `12,50`, `1.234,56`, `R$ 1.234,56`, `12.50`, `1.234` (= 1234; ponto com 3 dígitos é separador de milhar), `1.234.567`.
  - Se houver vírgula: a vírgula é o decimal e os pontos são milhar.
  - Rejeita: vazio, texto, negativo, mais de 2 casas decimais (ex.: `1,234` ou `1,234.56`) e valores acima de R$ 999.999.999,99.
- `formatarBRL(centavos: number): string`: `123456` → `R$ 1.234,56`; negativos → `-R$ 1.234,56`. Pode usar `Intl.NumberFormat`, lembrando do espaço não separável (veja o doc).
- `centavosParaCampo(centavos: number): string`: `123456` → `1234,56` (para preencher campos de edição, sem `R$` nem milhar).

### 2. `src/shared/datas.ts`

Todas trabalham com strings, sem `new Date('AAAA-MM-DD')`.

- `hoje(): string` (`AAAA-MM-DD`, dia **local**) e `mesAtual(): string` (`AAAA-MM`).
- `dataBR('2026-11-06') → '06/11/2026'`.
- `nomeDoMes('2026-11') → 'novembro de 2026'` (lista própria de nomes em português).
- `mesAnterior(mes)`, `mesProximo(mes)`.
- `intervaloDoMes(mes) → [inicio, fimExclusivo]`, ex.: `['2026-11-01', '2026-12-01']`.
- `mesValidoOuAtual(texto)`: devolve o texto se for `AAAA-MM` válido; senão, o mês atual.
- `dataValida(texto): boolean` (rejeita `2026-02-30`).

### 3. `src/shared/validacao.ts` e componentes base

- Funções de validação reutilizáveis que devolvem `{ ok, erro }` ou mapa de erros por campo (obrigatório, valor monetário, data).
- Componente `ConfirmarModal` (renderer) para confirmar ações destrutivas: título, mensagem, botões Cancelar/Confirmar, fecha com Esc, foco no botão seguro. Hook ou helper para usá-lo de forma simples nas telas.
- Componente `Campo` (rótulo + input + mensagem de erro ao lado) para padronizar formulários.

### 4. CRUD de categorias (`/categorias`)

Siga a arquitetura do doc: serviço em `src/main/servicos/categorias.ts` (recebe a conexão), handlers em `src/main/ipc/`, métodos em `window.api.categorias`, página no renderer. Tudo devolvendo `Resultado<T>`.

- **Lista:** nome, "Conta no lucro?" (Sim/Não), situação (ativa/inativa) e quantidade de despesas da categoria (a consulta já funciona mesmo sem despesas cadastradas).
- **Nova / editar** (rotas `/categorias/nova` e `/categorias/:id/editar`): campos nome (obrigatório) e "Conta no lucro" (caixa de seleção, marcada por padrão). Ajuda curta ao lado: "Desmarque para investimentos (ex.: compra de impressora), que ficam fora do cálculo do lucro."
- **Nome único** sem diferenciar maiúsculas/minúsculas e ignorando espaços nas pontas. Duplicado → mensagem amigável no campo.
- **Desativar/reativar** por botão. **Excluir** só funciona para categoria sem despesas, com `ConfirmarModal`. Tentar excluir categoria com despesas → mensagem explicando que deve desativar.

### 5. Testes (Vitest)

- `paraCentavos` com todos os casos aceitos e rejeitados acima; `formatarBRL` incluindo zero, negativo e valores grandes.
- Datas, incluindo virada de ano (`2026-12` → próximo `2027-01`; `2026-01` → anterior `2025-12`), `2026-02-30` inválida e `hoje()` com relógio simulado às 23h30 locais (deve devolver o dia local, não o seguinte).
- Serviço de categorias com banco `:memory:`: criar, nome duplicado (variando maiúsculas e espaços), editar, desativar/reativar, excluir, excluir bloqueado quando houver despesa (insira a despesa direto no banco no teste).

## Critérios de aceite

- `npm run typecheck` e `npm test` passam.
- No app: criar, editar, desativar/reativar e excluir categorias funciona, com mensagens claras, e os campos continuam editáveis (foco) depois de confirmar uma exclusão.
- `docs/PROGRESSO.md` atualizado.

## Fora do escopo

Telas de despesas e vendas, resumo.

Ao terminar, siga o "Protocolo de encerramento" do `AGENTS.md`.
