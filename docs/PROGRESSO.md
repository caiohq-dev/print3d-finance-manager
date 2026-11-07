# Progresso

Este arquivo é a **memória entre sessões**. O agente lê no início e atualiza no fim de cada etapa.

Última atualização: 06/11/2026 — etapa 01 concluída.

## Etapas

- [x] 01 — Fundação do projeto
- [ ] 02 — Utilitários (dinheiro e datas) + Categorias
- [ ] 03 — Despesas
- [ ] 04 — Vendas
- [ ] 05 — Resumo mensal
- [ ] 06 — Conforto e qualidade
- [ ] 07 — Backup, exportar e importar
- [ ] 08 — Empacotamento (instalador)
- [ ] 09 — (opcional) Insumos e calculadora de custo

### Etapa 01 — o que foi feito

- Projeto montado com electron-vite (template `react-ts`), TypeScript estrito, `react-router` com `HashRouter`, Vitest e electron-builder.
- Janela principal com `contextIsolation`, `sandbox`, sem `nodeIntegration`, CSP no `index.html`, navegação e janelas novas bloqueadas, DevTools só em desenvolvimento, menu padrão removido em produção e instância única (`requestSingleInstanceLock`).
- Banco: `src/main/db/conexao.ts` (pasta `-dev` em desenvolvimento, `FINANCEIRO_DB` sobrescreve, `PRAGMA foreign_keys = ON`, sem WAL, fecha ao sair) e `src/main/db/migrar.ts` (migrations em transação, registradas em `schema_migrations`, idempotente, roda antes de abrir a janela).
- `001_inicial.sql` com tabelas, índices e as 11 categorias iniciais, importada com `?raw` e listada em `migrations/index.ts`.
- IPC base: `Resultado<T>` em `src/shared/tipos.ts`, preload expondo `window.api` com `app.info()` (versão + caminho do banco) e declaração de tipos derivada do contrato.
- Renderer: layout com menu (Resumo · Vendas · Despesas · Categorias), páginas placeholder "Em construção", `estilo.css`; a Resumo mostra caminho do banco e versão em letra pequena.
- `README.md`, `.gitignore`, repositório git iniciado, smoke de empacotamento (`npm run pack`) executado.

## Versões usadas

| Ferramenta | Versão |
|---|---|
| Node.js | 24.21.0 (mínimo exigido: 22.16) |
| npm | 11.19.0 |
| Electron | 45.2.3 (estável mais recente na etapa 01) |
| electron-vite | 6.0.0 |
| Vite | 8.3.6 |
| React / ReactDOM | 19.3.1 |
| react-router | 7.18.5 |
| TypeScript | 5.9.3 |
| @types/node | 24.19.2 |
| Vitest | 5.1.0 |
| electron-builder | 26.18.0 |
| ESLint | 9.39.5 |

## Como rodar

```bash
npm install        # instala as dependências (Node LTS ≥ 22.16)
npm run dev        # app em desenvolvimento — banco na pasta -dev
npm run typecheck  # tsc --noEmit nos projetos main/preload e renderer
npm test           # Vitest uma vez (Node puro, TZ=America/Sao_Paulo)
npm run build      # compila para out/ sem empacotar
npm run pack       # empacota sem instalador (electron-builder --dir) → dist/win-unpacked
npm run dist       # instalador (etapa 08)
```

- **Desenvolvimento:** `%APPDATA%\impressao3d-financeiro-dev\dados\financeiro.db`
- **Produção (app empacotado):** `%APPDATA%\impressao3d-financeiro\dados\financeiro.db`
- `FINANCEIRO_DB` (arquivo completo) sobrescreve o local do banco.

## Decisões

- 06/11/2026 — **Spike do SQLite aprovado, sem troca de biblioteca.** Com Electron 45.2.3 (Node 24.22.2 embutido): `node:sqlite` importa e abre banco no main; `backup` (função do módulo) disponível e funcional; `PRAGMA foreign_keys = ON` efetivo (rejeitou registro órfão); e o mesmo funciona nos testes Vitest em Node puro (24.21.0). Os 4 pontos da seção "Decisão técnica a validar" passaram.
- 06/11/2026 — Removidos `@electron-toolkit/preload` e `@electron-toolkit/utils` do template: o `electronAPI` exporia `ipcRenderer` ao renderer, proibido pelo `AGENTS.md`. `is.dev` virou `!app.isPackaged` e `electronApp.setAppUserModelId` virou `app.setAppUserModelId`.
- 06/11/2026 — Menu padrão do Electron mantido **só** em desenvolvimento (contém devtools e recarregar); em produção `Menu.setApplicationMenu(null)` + bloqueio de F12/Ctrl+R/Shift+Ctrl+I.
- 06/11/2026 — `react-router` (v7) adicionado como dependência de runtime conforme o doc; `react`/`react-dom` movidos para `dependencies`. Nada além de `react`, `react-dom` e `react-router` em runtime.
- 06/11/2026 — Categorias do seed seguem **exatamente** a tabela de `docs/MODELO_DE_DADOS.md`, com `Equipamento (investimento)` em `conta_no_lucro = 0`.
- 06/11/2026 — Espaço em `C:` estava crítico durante a instalação: o cache do npm foi apontado para `E:\Users\aluno\npm-cache` e os caches do Electron/electron-builder foram **movidos** para `E:\Users\aluno\` com junctions (nada apagado; é cache). Só afeta esta máquina.

## Pendências / dúvidas

- Nenhuma impeditiva. Observações da etapa 01:
  - **Não rode dois `npm run dev` ao mesmo tempo:** o electron-vite recompila `out/` e os dois processos se derrubam (é a ferramenta, não o app). O bloqueio de segunda instância foi testado isolado: segunda abertura sai com código 0 em ~0,1s e só foca a primeira — tanto no dev quanto no exe empacotado.
  - `npm run pack` avisa `author is missed` e `no code signing certificate configured, signing is skipped` (sem assinatura de código — resolvido na etapa 08 junto com o instalador).
  - Ao abrir uma segunda instância junto com a primeira, o Chromium pode logar `Unable to move the cache / Gpu Cache Creation failed`: é ruído de duas instâncias disputando o perfil, não é erro do app.
  - Para conferir manualmente: `npm run dev` → janela com menu, caminho do banco na Resumo apontando para a pasta `-dev`; apagar a pasta `dados` e reabrir recria as 11 categorias; abrir o app duas vezes não cria segunda janela; `dist\win-unpacked\financeiro-impressao-3d.exe` cria o banco em produção.

## Ideias futuras

- (nenhuma — etapa 01 sem bônus)

## Histórico de sessões

- 06/11/2026 — etapa 01 — concluída: esqueleto rodando (janela + menu, SQLite por migrations no main, IPC tipado `app.info()`, 5 testes passando, `typecheck` ok e smoke de empacotamento aprovado).
