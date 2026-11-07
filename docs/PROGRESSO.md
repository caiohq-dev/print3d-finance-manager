# Progresso

Este arquivo é a **memória entre sessões**. O agente lê no início e atualiza no fim de cada etapa.

Última atualização: 07/11/2026 — etapa 04 concluída.

## Etapas

- [x] 01 — Fundação do projeto
- [x] 02 — Utilitários (dinheiro e datas) + Categorias
- [x] 03 — Despesas
- [x] 04 — Vendas
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

### Etapa 02 — o que foi feito

- `src/shared/dinheiro.ts`: `paraCentavos` converte **só por manipulação de string** (nunca `parseFloat`) — aceita `12`, `12,5`, `12,50`, `1.234,56`, `R$ 1.234,56`, `12.50`, `1.234` (= 1234 reais), `1.234.567` e rejeita vazio, texto, negativo, mais de 2 casas decimais e valores acima de R$ 999.999.999,99, **cada rejeição com a sua mensagem**. Mais `formatarBRL` (Intl `pt-BR`, respeitando o espaço não separável U+00A0) e `centavosParaCampo`.
- `src/shared/datas.ts`: `hoje()`/`mesAtual()` (dia e mês **locais**, por getters locais), `dataBR`, `nomeDoMes` (lista própria de nomes em português), `mesAnterior`/`mesProximo` (viram o ano), `intervaloDoMes` → `[inicio, fimExclusivo)`, `mesValidoOuAtual` e `dataValida` (rejeita `2026-02-30`). Nenhum `new Date('AAAA-MM-DD')`.
- `src/shared/validacao.ts`: `obrigatorio`, `monetario`, `data` (devolvem `{ ok, erro }`) e `errosPorCampo` (mapa de mensagens por campo), usados no renderer (resposta imediata) e no main.
- Componentes base: `Campo` (rótulo + ajuda + input + mensagem de erro, com `aria-invalid`/`aria-describedby`), `ConfirmarModal` (Esc fecha, foco inicial no **Cancelar** e o foco volta para o elemento que estava ativo antes de abrir) e o hook `useConfirmar` para usar o modal em duas linhas.
- **CRUD de categorias ponta a ponta**: serviço `src/main/servicos/categorias.ts` (recebe a conexão, tem o SQL e a regra de negócio, devolve `Resultado<T>`), 6 handlers finos em `src/main/ipc/categorias.ts` (canais `categorias:listar|obter|criar|atualizar|definirAtiva|excluir`, validando id e entrada), `window.api.categorias` no preload e as páginas `/categorias`, `/categorias/nova` e `/categorias/:id/editar`.
- Lista mostra nome, "Conta no lucro?" (Sim/Não), situação (Ativa/Inativa) e quantidade de despesas (a consulta usa subconsulta e funciona mesmo sem despesas).
- Nome único comparando `TRIM(nome) COLLATE NOCASE` (maiúsculas/minúsculas e espaços nas pontas ignorados); duplicado devolve a mensagem **no campo** `nome`.
- Desativar/reativar por botão; excluir só sem despesas e sempre com `ConfirmarModal`. Se a categoria tem despesas, a própria tela mostra a mensagem do serviço mandando desativar (sem abrir modal) e o `ON DELETE RESTRICT` do banco segura por baixo.
- Rotas nova/edição usam `key` para não compartilhar o estado do formulário.
- Testes novos (Vitest, banco `:memory:` com as migrations reais): `src/shared/dinheiro.test.ts`, `src/shared/datas.test.ts`, `src/shared/validacao.test.ts` e `src/main/servicos/categorias.test.ts` (criar, duplicado variando maiúsculas/espaços, editar, desativar/reativar, excluir, exclusão bloqueada com despesa inserida direto no banco). Total: **70 testes passando**.

### Etapa 03 — o que foi feito

- **Navegação de mês reutilizável:** `NavegacaoMes` lê `?mes=AAAA-MM` da URL (via `useMesDaUrl`, que usa `useSearchParams` + `mesValidoOuAtual`) e mostra `← mês anterior`, o nome do mês (ex.: "novembro de 2026"), `próximo mês →` e o link "Mês atual". Os links mantêm os demais parâmetros da tela, então serve para despesas, vendas e resumo.
- **Camadas de despesas:** serviço `src/main/servicos/despesas.ts` (listar por mês com totais, obter, criar, atualizar, excluir; recebe a conexão), handlers finos em `src/main/ipc/despesas.ts` (canais `despesas:listar|obter|criar|atualizar|excluir`), `window.api.despesas` no preload e contrato em `src/shared/tipos.ts` (`Despesa`, `ListaDespesas`, `EntradaDespesa`).
- **Validação no main:** data válida, categoria existente, descrição obrigatória e valor maior que zero, com mensagens por campo (`data`, `categoriaId`, `descricao`, `valor`). O formulário repete a validação para resposta imediata e, em erro, mantém tudo o que foi digitado. `valor` chega como texto e o serviço converte com `paraCentavos` (aceita `1.234,56`). Helper novo `valorPositivo` em `validacao.ts` centraliza a regra "maior que zero".
- **Lista `/despesas`:** colunas Data, Categoria, Descrição, Fornecedor, Valor e ações (Editar/Excluir); ordem `data DESC, id DESC`; categoria com `conta_no_lucro = 0` marcada como "(investimento)"; rodapé com **total do mês** e, quando houver, o total de investimento (fora do lucro). Mês vazio mostra "Nenhuma despesa neste mês" e botão para adicionar. Exclusão com `ConfirmarModal` e mensagem de sucesso.
- **Formulário `/despesas/nova` e `/despesas/:id/editar`:** data padrão hoje, categoria só entre as **ativas** (na edição, a categoria atual entra mesmo inativa), descrição, fornecedor, valor (vírgula aceita) e observação. Ao salvar, volta para a lista **do mês da data salva** com mensagem de sucesso; "Voltar"/"Cancelar" usam o `?mes=` de origem, então a edição mantém o mês da lista.
- **`Campo`** ganhou uma variante para `<select>` (prop `select` + `children`), sem `cloneElement` e sem quebrar o uso com `input` nas categorias. CSS ganhou estilo de `select`/`input[type=date]`, navegação de mês, rodapé de tabela e mensagem de sucesso.
- **Testes novos:** `src/main/servicos/despesas.test.ts` (10 testes) cobrindo conversão `1.234,56` → `123456`, valor/data inválidos sem gravar, valor zero, categoria inexistente, edição com atualização de `atualizado_em`, exclusão, id inexistente (erro, não exceção), bordas de mês (31/10, 01/11, 30/11, 01/12), totais (inclusive investimento) e ordenação no mesmo dia. Total: **80 testes passando**.

### Etapa 04 — o que foi feito

- **Camadas de vendas**, no mesmo padrão das despesas: serviço `src/main/servicos/vendas.ts` (listar por mês com totais, obter, criar, atualizar, excluir e listar canais; recebe a conexão), handlers finos em `src/main/ipc/vendas.ts` (canais `vendas:listar|obter|criar|atualizar|excluir|canais`), `window.api.vendas` no preload e contrato em `src/shared/tipos.ts` (`Venda`, `ListaVendas`, `EntradaVenda`).
- **Lista `/vendas?mes=AAAA-MM`:** colunas Data, Cliente, Descrição, Canal, Valor, Taxas, Líquido (valor − taxas) e ações; ordem `data DESC, id DESC`; rodapé com **faturamento bruto**, **taxas** e **receita líquida** do mês. Mês vazio mostra "Nenhuma venda neste mês." e botão para adicionar. Exclusão com `ConfirmarModal` e mensagem de sucesso.
- **Formulário `/vendas/nova` e `/vendas/:id/editar`:** data padrão hoje, cliente opcional, descrição obrigatória (exemplo "Suporte de headset, PLA preto"), canal como texto livre com `<datalist>` (canais já usados + Shopee, Mercado Livre, Instagram, WhatsApp e Presencial, sem repetir), valor cobrado, taxas opcionais (em branco conta como 0) e observação. Ao salvar, volta para a lista **do mês da data salva** com mensagem de sucesso.
- **Validação no main** (repetida no formulário para resposta imediata): data válida, descrição não vazia, valor maior que zero, taxas não negativas e **não maiores que o valor** — esta última com mensagem no campo `taxas` ("As taxas não podem ser maiores que o valor cobrado."). Em erro, o formulário mantém tudo o que foi digitado.
- **Testes novos:** `src/main/servicos/vendas.test.ts` (14 testes) cobrindo `150,00`/`12,50` → `15000`/`1250`/líquido `13750`, taxas maiores que o valor sem gravar, campos opcionais como `NULL`, taxas vazias = 0, validações, edição com `atualizado_em`, exclusão, id inexistente (erro "não encontrada", não exceção), bordas de mês (31/10, 01/11, 30/11, 01/12), totais, ordenação no mesmo dia e canais sem duplicata; mais 4 testes de `taxasOpcionais` em `validacao.test.ts`. Total: **99 testes passando**.

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
- 06/11/2026 — **Dinheiro (conversão):** com vírgula, ela é sempre o decimal e os pontos são milhar; sem vírgula, ponto com 1–2 dígitos depois é decimal (`12.50` = R$ 12,50) e com 3 dígitos é milhar (`1.234` = R$ 1.234). Fora do padrão o texto é rejeitado, com mensagem específica para cada caso (vazio, positivo, texto, casas decimais, milhar, limite de R$ 999.999.999,99).
- 06/11/2026 — **Datas:** `hoje()`/`mesAtual()` montam a string a partir dos getters **locais**; nenhum `new Date('AAAA-MM-DD')`. Teste às 23h30 locais garante o dia local (não o dia seguinte em UTC).
- 06/11/2026 — **`ConfirmarModal`:** guarda o elemento com foco antes de abrir e o devolve ao fechar (é isso que mantém os campos utilizáveis depois de confirmar uma exclusão). Foco inicial no Cancelar, Esc fecha, clique fora também cancela. Nada de `window.confirm`.
- 06/11/2026 — **Exclusão com despesas:** se a categoria já tem despesa, a tela (que sabe `quantidadeDespesas`) mostra direto a mensagem do serviço, **sem** abrir o modal — confirmar uma ação que vai falhar só confundiria. Sem despesas, abre o `ConfirmarModal`.
- 06/11/2026 — **Nome único** garantido em duas camadas: a consulta usa `TRIM(nome) COLLATE NOCASE` (pega o seed e nomes não aparados) e o `UNIQUE` da tabela ainda cobre corrida (erros `UNIQUE` viram a mesma mensagem amigável).
- 06/11/2026 — IPC: `registrarIpcCategorias(banco)` **recebe a conexão aberta** (mesmo padrão do serviço e testável), em vez de importar a global de `conexao.ts`.
- 06/11/2026 — Lista de categorias ordena por **ativas primeiro e depois nome** (NOCASE); as inativas aparecem no fim.
- 06/11/2026 — `Campo` recebe o input pela prop `input` (sem `cloneElement`), para manter a tipagem simples e o lint limpo.
- 06/11/2026 — Nenhuma dependência nova na etapa 02 (só `react`, `react-dom` e `react-router` em runtime).
- 07/11/2026 — **Entrada de despesa leva `valor` como texto** (o que o usuário digitou), não centavos. Assim o serviço aplica `paraCentavos` e devolve o erro no campo `valor`; o formulário usa a mesma regra (`valorPositivo`) só para resposta imediata. A conversão de dinheiro continua num lugar só.
- 07/11/2026 — **Totais da lista são calculados sobre as linhas do mês já carregadas** (uma consulta só), não com um `SUM` separado. Como a lista já vem inteira, o total e o total de investimento ficam sempre coerentes com o que está na tela.
- 07/11/2026 — **`Campo` aceita `<select>`** pela prop `select` + `children`, mantendo o input pela prop `input` (sem `cloneElement`, como decidido na etapa 02). Nenhuma mudança de uso nas categorias.
- 07/11/2026 — **`useMesDaUrl` mora em arquivo próprio** (`componentes/useMesDaUrl.ts`) porque a regra `react-refresh/only-export-components` exige que um arquivo de componente exporte só componentes.
- 07/11/2026 — **Marca "(investimento)" não é repetida** quando o nome da categoria já termina com ela (caso da seed "Equipamento (investimento)"); a marca aparece em qualquer categoria com `conta_no_lucro = 0`.
- 07/11/2026 — **Voltar para o mês certo:** o "Editar" da lista leva `?mes=AAAA-MM`, o formulário usa esse mês no "Voltar"/"Cancelar" e, ao salvar, navega para o mês da **data salva** com a mensagem de sucesso no `state` da navegação.
- 07/11/2026 — **Exclusão de despesa só na lista** (o formulário não tem botão Excluir), sempre com `ConfirmarModal`; depois de excluir, a lista recarrega e mostra "Despesa excluída.".
- 07/11/2026 — Nenhuma dependência nova na etapa 03.
- 07/11/2026 — **Venda recebe `valor` e `taxas` como texto** (como na despesa), e o serviço converte no main. O helper `taxasOpcionais` em `validacao.ts` centraliza a regra: texto vazio = 0, negativo recusado pelo `paraCentavos` e "maiores que o valor cobrado" com mensagem própria no campo `taxas`. A mesma função é usada pelo formulário, então a mensagem é idêntica nas duas camadas.
- 07/11/2026 — **Totais de vendas calculados sobre as linhas do mês já carregadas** (mesma decisão das despesas): `totalCentavos`, `totalTaxasCentavos` e `totalLiquidoCentavos = bruto − taxas`. O `liquidoCentavos` de cada venda é calculado no mapeamento do serviço, não no renderer.
- 07/11/2026 — **Lista de canais:** primeiro os cinco padrão (Shopee, Mercado Livre, Instagram, WhatsApp, Presencial), depois os canais já usados que não são padrão, em ordem alfabética; a comparação ignora maiúsculas/minúsculas e espaços nas pontas, e o resultado não repete. Exposição por `vendas:canais`.
- 07/11/2026 — **Campo de taxas começa vazio no formulário** (`placeholder 0,00` e ajuda "em branco conta como 0"), coerente com a regra do serviço; na edição vem preenchido com o valor gravado. O rodapé da lista usa três linhas rotuladas (faturamento bruto, taxas, receita líquida), como no padrão de totais das despesas.
- 07/11/2026 — Nenhuma dependência nova na etapa 04.

## Pendências / dúvidas

- Nenhuma impeditiva. Observações da etapa 04:
  - `npm run typecheck`, `npm test` (99 testes), `npm run build` e `npm run lint` passam. O lint termina com **0 erros**; os avisos que restam são de fim de linha CRLF em arquivos antigos (o checkout usa `core.autocrlf=true` e o prettier espera LF) — nenhum é da etapa 04.
  - O `npm run dev` subiu sem erro de inicialização (main, preload e renderer compilando e o Electron abrindo). A interação com a janela não é automatizada aqui; conferir manualmente:
    1. Vendas → lançar vendas em dois meses diferentes (mudando a data) e conferir que cada mês mostra só as suas, com faturamento bruto, taxas e receita líquida corretos.
    2. Lançar uma venda de `150,00` com taxas `12,50` → coluna Líquido `R$ 137,50` e rodapé coerente.
    3. No campo Canal, conferir as sugestões (Shopee, Mercado Livre, Instagram, WhatsApp, Presencial); salvar uma venda com um canal novo e reabrir o formulário para ver a sugestão sem duplicar.
    4. Testar validações: descrição vazia, valor `0`/`abc`, taxas maiores que o valor (mensagem no campo taxas) e taxas negativas; os campos devem manter o texto digitado.
    5. Abrir "Editar" a partir de um mês, salvar e conferir que a lista volta para o mês da data salva; cancelar deve voltar ao mês de origem.
    6. Excluir uma venda → `ConfirmarModal` com foco no Cancelar, Esc cancela; confirmar remove e mostra "Venda excluída.".
- Observações da etapa 03 (continuam valendo):
  - `npm run typecheck`, `npm test` (80 testes) e `npm run build` passam. `npm run lint` termina com **0 erros**; os avisos que restam são de fim de linha CRLF em arquivos antigos (o checkout usa `core.autocrlf=true` e o prettier espera LF) — nenhum é da etapa 03.
  - O `npm run dev` subiu sem erro de inicialização (main, preload e renderer compilando e o Electron abrindo). A interação com a janela não é automatizada aqui; conferir manualmente:
    1. Despesas → lançar 3 despesas em meses diferentes (mudando a data) e conferir que cada mês mostra só as suas, com total correto.
    2. Lançar uma despesa na categoria "Equipamento (investimento)" e conferir a marca "(investimento)" e a linha "Desse total, investimento (fora do lucro)".
    3. Navegar com `←`/`→` e "Mês atual"; conferir que a URL muda (`?mes=AAAA-MM`) e que mês sem registros mostra a mensagem e o botão de adicionar.
    4. Abrir "Editar" a partir de um mês, salvar e conferir que a lista volta para o mês da data salva; cancelar deve voltar ao mês de origem.
    5. Tentar salvar com data vazia/inválida, sem categoria, descrição vazia e valor `0`/`abc` → mensagens ao lado dos campos e texto preservado.
    6. Excluir uma despesa → `ConfirmarModal` com foco no Cancelar, Esc cancela; confirmar remove e mostra "Despesa excluída.".
- Observações da etapa 02 (continuam valendo):
  - `npm run lint` passa com **0 erros**; ainda restam 3 avisos de formatação (prettier) em arquivos da etapa 01 — `migrar.ts`, `migrar.test.ts` e a linha 6 de `tipos.ts` — que não foram tocados para não alterar código antigo. Se quiser zerar: `npx prettier --write` neles.
  - O app subiu no `npm run dev` (main + preload + renderer compilando, banco `-dev` aberto) **sem erro de inicialização**, mas a interação com a janela não é automatizada aqui: conferir o checklist manual:
    1. Categorias → "Nova categoria" → criar com nome repetido de outra (ex.: `energia` para a seed "Energia", ou `  ENERGIA `) → erro **no campo**, com o texto digitado preservado.
    2. Editar uma categoria (mudar nome e "Conta no lucro?") e salvar.
    3. Desativar e reativar pela lista.
    4. Excluir sem despesas → `ConfirmarModal` abre com foco no **Cancelar**, Esc cancela, e o foco volta para onde estava.
    5. Excluir uma categoria que tem despesa → mensagem explicando que ela deve ser **desativada** (sem modal).
    6. Depois de confirmar a exclusão, a página segue respondendo ao teclado (sem perder foco como faria `window.confirm`).
    7. Na edição, conferir a ajuda ao lado de "Conta no lucro?" e o texto "Esta categoria está em uso por N despesa(s)".
  - O aviso do Vitest sobre `configLoader: 'native'` (carregando `vitest.config.ts`) é ruído da ferramenta, não da etapa; os testes rodam normais.
- Observações da etapa 01 (continuam valendo):
  - **Não rode dois `npm run dev` ao mesmo tempo:** o electron-vite recompila `out/` e os dois processos se derrubam (é a ferramenta, não o app). O bloqueio de segunda instância foi testado isolado: segunda abertura sai com código 0 em ~0,1s e só foca a primeira — tanto no dev quanto no exe empacotado.
  - `npm run pack` avisa `author is missed` e `no code signing certificate configured, signing is skipped` (sem assinatura de código — resolvido na etapa 08 junto com o instalador).
  - Ao abrir uma segunda instância junto com a primeira, o Chromium pode logar `Unable to move the cache / Gpu Cache Creation failed`: é ruído de duas instâncias disputando o perfil, não é erro do app.
  - Para conferir manualmente: `npm run dev` → janela com menu, caminho do banco na Resumo apontando para a pasta `-dev`; apagar a pasta `dados` e reabrir recria as 11 categorias; abrir o app duas vezes não cria segunda janela; `dist\win-unpacked\financeiro-impressao-3d.exe` cria o banco em produção.

## Ideias futuras

- Enquadrar o foco dentro do `ConfirmarModal` (Tab só entre Cancelar e Confirmar): hoje dá para sair do modal com Shift+Tab e mexer na lista por trás. Não atrapalha o uso normal — só se virar incomodação.

## Histórico de sessões

- 06/11/2026 — etapa 01 — concluída: esqueleto rodando (janela + menu, SQLite por migrations no main, IPC tipado `app.info()`, 5 testes passando, `typecheck` ok e smoke de empacotamento aprovado).
- 06/11/2026 — etapa 02 — concluída: utilitários de dinheiro/datas/validação, componentes `Campo` e `ConfirmarModal` (com o hook `useConfirmar`) e CRUD de categorias ponta a ponta (tela → IPC → serviço → banco) nas três rotas; 70 testes passando, `typecheck` e `lint` sem erros, `build` ok e `npm run dev` abriu sem erro de inicialização.
- 07/11/2026 — etapa 03 — concluída: `NavegacaoMes` reutilizável por `?mes=AAAA-MM`, CRUD de despesas ponta a ponta com validação no main, lista por mês com total e investimento, formulário com categorias ativas (e a atual na edição) e retorno ao mês da data salva; 80 testes passando, `typecheck` e `build` ok e `npm run dev` abriu sem erro de inicialização.
- 07/11/2026 — etapa 04 — concluída: CRUD de vendas ponta a ponta (serviço, IPC, preload e contrato), lista por mês com faturamento bruto, taxas e receita líquida, formulário com sugestões de canal (`datalist`) e validação de taxas no main e na tela; 99 testes passando, `typecheck`, `build` e `lint` (0 erros) ok e `npm run dev` abriu sem erro de inicialização.
