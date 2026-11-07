# Etapa 01 — Fundação do projeto

Leia `AGENTS.md` e todos os arquivos de `docs/` antes de começar. Esta é a **ETAPA 01**. É esperado que a pasta só tenha esses arquivos (e `prompts/`): você vai criar o resto a partir daqui, **sem apagar nem sobrescrever** `AGENTS.md`, `docs/` e `prompts/`.

## Objetivo

Deixar o esqueleto do app rodando: a janela abre com menu, o banco SQLite é criado por migrations no processo main, o renderer consegue falar com o main por uma API tipada, e há testes de fumaça passando. **Ainda sem CRUD.**

## Tarefas

1. **Projeto.** Verifique a versão do Node (precisa ser 22.16 ou mais nova; se não for, pare e avise). Monte o projeto com electron-vite (template `react-ts`), TypeScript estrito, estrutura de pastas conforme `docs/STACK_E_CONVENCOES.md`. Scripts do `package.json` conforme a tabela do doc (`dev`, `typecheck`, `test`, `build`, `pack`). Registre em `docs/PROGRESSO.md` as versões instaladas.
2. **Spike do SQLite (faça antes do resto).** Execute a seção "Decisão técnica a validar na etapa 01" de `docs/STACK_E_CONVENCOES.md`. Se algum ponto falhar, **pare e me avise** com o erro exato; não troque de biblioteca por conta própria.
3. **Janela e segurança.** Janela principal com `contextIsolation`, `sandbox`, sem `nodeIntegration`, CSP no `index.html`, navegação e janelas novas bloqueadas, DevTools só em desenvolvimento, menu padrão do Electron removido em produção. `app.requestSingleInstanceLock()`: abrir uma segunda instância apenas traz a primeira para frente.
4. **Banco.** `src/main/db/conexao.ts`: resolve o caminho conforme "Onde ficam os dados" (pasta `-dev` em desenvolvimento; `FINANCEIRO_DB` sobrescreve), cria as pastas necessárias, abre a conexão com `PRAGMA foreign_keys = ON` (sem WAL). Fecha a conexão ao sair do app. `src/main/db/migrar.ts`: aplica em ordem as migrations ainda não aplicadas, cada uma em transação, registrando em `schema_migrations`; idempotente; roda quando o app inicia, antes de abrir a janela.
5. **Migration.** `001_inicial.sql` com tabelas, índices e categorias iniciais **exatamente** como em `docs/MODELO_DE_DADOS.md`, importada com `?raw` e listada em `migrations/index.ts`.
6. **IPC base.** Tipo `Resultado<T>` em `src/shared/tipos.ts`. Preload expondo `window.api` com um primeiro método `app.info()` que devolve versão do app e caminho do banco em uso. Declaração de tipos de `window.api` para o renderer, derivada do contrato em `tipos.ts`.
7. **Renderer.** `HashRouter`, layout com menu (Resumo, Vendas, Despesas, Categorias), uma página placeholder por item ("Em construção") e `estilo.css` simples e legível. Na página Resumo, mostre em letra pequena o caminho do banco e a versão (vindos de `app.info()`).
8. **README.md** curto: o que é, pré-requisitos (Node LTS), `npm install`, `npm run dev`, `npm test`, onde ficam os dados em desenvolvimento e em produção. `.gitignore` conforme o doc e `git init` se ainda não houver repositório.
9. **Testes (Vitest, Node puro, `TZ=America/Sao_Paulo`).** Banco `:memory:` com as migrations reais: as 3 tabelas existem; aplicar as migrations duas vezes não falha nem duplica nada; as categorias iniciais existem uma única vez; inserir despesa com `categoria_id` inexistente falha (chave estrangeira ativa); inserir venda com valor zero ou taxas maiores que o valor falha (CHECK).
10. **Smoke de empacotamento.** Adicione `electron-builder` como dependência de desenvolvimento e rode `npm run pack` (sem instalador). O app empacotado deve abrir, criar o banco na pasta de dados de produção e mostrar o menu. Se falhar por motivo de ambiente (ícone, assinatura), registre em "Pendências" e siga; a etapa 08 resolve. Se falhar por causa do código (ex.: migrations não encontradas empacotado), conserte agora.

## Critérios de aceite

- `npm run typecheck` e `npm test` passam.
- `npm run dev` abre a janela com o menu; o caminho do banco aparece na página Resumo e aponta para a pasta `-dev`.
- Apagar o arquivo do banco de desenvolvimento e abrir de novo recria tudo com as categorias iniciais.
- Abrir o app duas vezes não cria duas janelas: a segunda tentativa só foca a primeira.
- `docs/PROGRESSO.md` atualizado: etapa 01 marcada, versões e seção "Como rodar" preenchidas.

## Fora do escopo

CRUDs, formatação de dinheiro, resumo, instalador e qualquer coisa das próximas etapas.

Ao terminar, siga o "Protocolo de encerramento" do `AGENTS.md`.
