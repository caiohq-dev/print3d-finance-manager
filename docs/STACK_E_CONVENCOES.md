# Stack e convenções

## Stack (fixa, não troque sem perguntar)

- **Node.js LTS** (22.16 ou mais novo) e **npm**
- **Electron** (versão estável mais recente no momento da etapa 01)
- **TypeScript** com `strict: true`
- **React** no renderer, projeto montado com **electron-vite** (template `react-ts`), roteamento com `react-router` usando `HashRouter` (a janela carrega por `file://`)
- **SQLite** pelo módulo embutido **`node:sqlite`** (`DatabaseSync`, API síncrona, SQL puro, sem ORM, sem módulo nativo para compilar)
- **CSS puro** em um único arquivo (`src/renderer/src/estilo.css`)
- **Vitest** para testes
- **electron-builder** para empacotar (smoke test na etapa 01, instalador na etapa 08)
- Dependências de runtime esperadas: `react`, `react-dom`, `react-router`. Todo o resto é dev. A etapa 07 pode adicionar `papaparse`. Qualquer outra: perguntar.

### Decisão técnica a validar na etapa 01 (spike do SQLite)

A escolha é `node:sqlite` porque evita recompilar módulo nativo para o Electron e permite rodar os mesmos testes no Node puro. Na etapa 01, antes de construir qualquer coisa em cima, **confirme** com a versão instalada do Electron que:

1. `node:sqlite` importa e abre um banco no processo main;
2. funciona também nos testes (Vitest, Node puro);
3. a função `backup` do módulo está disponível (será usada na etapa 07);
4. `PRAGMA foreign_keys = ON` está efetivo.

Se algum ponto falhar, **pare e avise o dono antes de trocar**. A alternativa conhecida é `better-sqlite3` (maduro, mas exige recompilar para o Electron e causa conflito de versão do módulo nativo entre Electron e testes em Node). Não faça essa troca por conta própria.

## Estrutura de pastas

```
impressao3d-financeiro/
├── AGENTS.md
├── README.md
├── package.json
├── tsconfig.json (+ node/web, conforme o template)
├── electron.vite.config.ts
├── electron-builder.yml          # etapa 08 (smoke na 01)
├── vitest.config.ts
├── .gitignore
├── src/
│   ├── main/                     # processo main (Node): único que toca no banco
│   │   ├── index.ts              # janela, ciclo de vida, instância única
│   │   ├── db/
│   │   │   ├── conexao.ts        # caminho do banco, abre conexão, PRAGMAs
│   │   │   ├── migrar.ts         # aplica migrations pendentes
│   │   │   └── migrations/       # 001_inicial.sql, ... + index.ts (lista ordenada, import ?raw)
│   │   ├── servicos/             # categorias.ts, despesas.ts, vendas.ts, resumo.ts, dados.ts
│   │   └── ipc/                  # um arquivo por área: registra os handlers
│   ├── preload/
│   │   └── index.ts              # expõe window.api via contextBridge
│   ├── renderer/
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx, App.tsx
│   │       ├── paginas/          # Resumo, Vendas, Despesas, Categorias, Dados
│   │       ├── componentes/      # NavegacaoMes, ConfirmarModal, CampoDinheiro, ...
│   │       └── estilo.css
│   └── shared/                   # código puro (sem Electron nem DOM), usado por main e renderer
│       ├── dinheiro.ts
│       ├── datas.ts
│       ├── validacao.ts
│       └── tipos.ts              # DTOs, Resultado<T>, contrato de window.api
└── docs/
```

Testes ficam ao lado do código, como `dinheiro.test.ts`.

## Scripts do `package.json`

| Script | Para quê |
|---|---|
| `npm run dev` | abre o app em modo desenvolvimento (banco `-dev`) |
| `npm run typecheck` | `tsc --noEmit` para main, preload e renderer |
| `npm test` | roda o Vitest uma vez |
| `npm run build` | compila o app (sem empacotar) |
| `npm run pack` | empacota sem instalador (`electron-builder --dir`), só para verificação |
| `npm run dist` | gera o instalador (etapa 08) |

## Onde ficam os dados

- Banco: `<userData>/dados/financeiro.db`. Backups: `<userData>/backups/`. Logs de erro: `<userData>/logs/`.
- No Windows, `<userData>` é algo como `%APPDATA%\<nome-do-app>`.
- **Em desenvolvimento** (`!app.isPackaged`), use `<userData>-dev`, definido com `app.setPath('userData', ...)` **antes** de qualquer outra coisa usar o caminho. Assim, desenvolver e testar nunca encosta nos dados reais.
- A variável de ambiente `FINANCEIRO_DB` (caminho completo de um arquivo) sobrescreve o local do banco. Serve para testes e depuração.
- Não ativar WAL. `PRAGMA foreign_keys = ON` sempre.

## Arquitetura (resumo)

```
React (renderer) → window.api.<area>.<metodo>() → preload → ipcMain.handle → serviço → node:sqlite
```

- **Serviços** (`src/main/servicos/`) recebem a conexão como parâmetro (para testar com `:memory:`), contêm o SQL e a regra de negócio, e devolvem objetos tipados em `camelCase`.
- **IPC** (`src/main/ipc/`): handlers finos. Canais no formato `area:acao` (`despesas:listar`). Validam a entrada, chamam o serviço e devolvem `Resultado<T>`.
- **Contrato** em `src/shared/tipos.ts`:

```ts
export type Resultado<T> =
  | { ok: true; dados: T }
  | { ok: false; erro: string; campos?: Record<string, string> }
```

  `erro` é uma mensagem pronta para mostrar ao usuário; `campos` leva mensagens por campo do formulário.
- **Validação** em `src/shared/validacao.ts`, usada no renderer (resposta imediata) **e** no main (a validação que vale).
- **Migrations:** arquivos `.sql` numerados em `src/main/db/migrations/`, importados com `?raw` e listados em ordem em `index.ts`, para irem junto no bundle e funcionarem empacotado. Cada migration roda em uma transação e é registrada em `schema_migrations`. Idempotente.

## Convenções de código

- TypeScript estrito, sem `any` (use `unknown` e estreite).
- SQL sempre com parâmetros (`?` ou nomeados). Nunca concatenar texto do usuário no SQL.
- Consultas por mês usam intervalo (`data >= ? AND data < ?`) para aproveitar o índice, nunca `strftime` no `WHERE`.
- Escritas com mais de uma instrução (importações, por exemplo) dentro de transação (`BEGIN` / `COMMIT` / `ROLLBACK`).
- Funções pequenas, sem classes onde uma função resolve.
- Mensagens ao usuário em português claro ("Informe um valor maior que zero"), nunca stack trace. Erros inesperados são registrados em `<userData>/logs/` e o usuário vê uma mensagem genérica.
- Formulários: componentes controlados; em erro, mostrar a mensagem ao lado do campo **sem perder o que foi digitado**.
- Estado da lista (mês, busca, filtros) vive na URL (`useSearchParams`), para voltar da edição e cair no mesmo lugar.

## Regras para dinheiro e datas (armadilhas conhecidas)

- Converter texto digitado em centavos **por manipulação de string**, não com `parseFloat` (`1.005 * 100` não dá 100,5). Limite máximo razoável: R$ 999.999.999,99.
- Formatar com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` é permitido, mas ele usa espaço não separável (U+00A0) entre `R$` e o número. Os testes devem considerar isso.
- **Nunca** `new Date('2026-11-06')` (vira UTC, e no Brasil mostra 05/11). Manipule `AAAA-MM-DD` como texto e, quando precisar de `Date`, use `new Date(ano, mes - 1, dia)`. Para "hoje", monte a string a partir de `getFullYear/getMonth/getDate` locais.
- No Vitest, fixe `process.env.TZ = 'America/Sao_Paulo'` (setup global) e teste "hoje" às 23h30 locais: o resultado tem que ser o dia local, não o dia seguinte em UTC.

## Convenções de interface

- Layout único com menu: Resumo · Vendas · Despesas · Categorias (e Dados, a partir da etapa 07).
- Valores monetários alinhados à direita, formato `R$ 1.234,56`. Datas `dd/mm/aaaa`.
- Campo de data: `<input type="date">`. Campo de valor: `type="text" inputmode="decimal"`, aceitando vírgula.
- Prejuízo (lucro negativo) em vermelho; não depender só de cor (mostrar o sinal −).
- Ações destrutivas (excluir) sempre com confirmação via `ConfirmarModal` (nunca `window.confirm`).

## Testes

- Vitest roda em Node puro. Serviços são testados com banco `:memory:` e as migrations reais aplicadas.
- Cobrir: dinheiro, datas, validação, as consultas do resumo (com números conhecidos), e o fluxo criar/editar/excluir de cada serviço. Testes de interface (React) não são obrigatórios; os critérios de aceite manuais cobrem a tela.
- Todo bug corrigido ganha um teste que o reproduz.

## Git

- Um commit por etapa (ou mais, se fizer sentido), mensagem em português curta e no imperativo: `Adiciona CRUD de despesas`.
- Nunca commitar `node_modules/`, `out/`, `dist/`, `release/` nem qualquer banco `.db`.
