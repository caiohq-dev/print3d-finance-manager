# AGENTS.md — Financeiro da oficina de impressão 3D

Este arquivo é lido no início de cada sessão e vale para o projeto inteiro. Siga-o à risca.

## O que é este projeto

App **desktop** (Electron) pessoal para registrar **vendas** e **despesas** de uma pequena empresa de impressão 3D e ver **faturamento e lucro mês a mês**. Substitui uma planilha do Excel. Um único usuário, dados só no computador dele, sem servidor e sem internet. **Funcional vale mais que bonito.**

## Comece toda sessão assim

1. Leia `docs/PROGRESSO.md`: diz em que etapa estamos, quais decisões já foram tomadas e o que está pendente.
2. Leia `docs/PROJETO.md`, `docs/MODELO_DE_DADOS.md` e `docs/STACK_E_CONVENCOES.md` (se ainda não estiverem no seu contexto).
3. Olhe o código existente antes de criar qualquer coisa. Reaproveite o que já existe (utilitários, componentes, serviços).
4. Faça **somente a etapa pedida no prompt**. Se existir uma pasta `prompts/`, ela contém as etapas futuras: não leia nem implemente etapas que não foram pedidas.
5. Se o prompt tiver um pré-requisito (etapa anterior concluída) e o `PROGRESSO.md` disser que não está, pare e avise o dono antes de continuar.

## Stack (fixa)

Electron + TypeScript (strict) + React (com electron-vite) + SQLite pelo módulo embutido `node:sqlite` + Vitest. Detalhes em `docs/STACK_E_CONVENCOES.md`. Qualquer biblioteca fora disso: **pergunte antes**.

## Princípios

- **Simples vence esperto.** Poucas dependências, pouca abstração, nada de padrões "enterprise". O dono conhece JavaScript, TypeScript e Electron e vai ler e mexer neste código: funções curtas, nomes claros, comentários curtos em português onde ajudarem.
- **Sem** Redux/Zustand, biblioteca de UI ou CSS (MUI, Tailwind etc.), ORM, Express/servidor HTTP ou login. Estado do React com `useState`/`useEffect` basta.
- **Dinheiro é inteiro em centavos.** Nunca use float para valores monetários e **nunca** `parseFloat` no que o usuário digita: converta o texto por manipulação de string.
- **Datas são strings** (`AAAA-MM-DD`, mês `AAAA-MM`). **Nunca** use `new Date('2026-11-06')`: ele interpreta como UTC e, no Brasil, mostra o dia anterior. Veja as regras em `docs/STACK_E_CONVENCOES.md`.
- **Idioma:** interface em pt-BR; nomes de domínio em português sem acento no código (`vendas`, `despesas`, `valorCentavos`); comentários e mensagens de commit em português.
- Mudança de schema só por **nova migration numerada**. Nunca edite uma migration já aplicada.
- **Dados reais ficam fora do repositório**, na pasta de dados do app (`userData` do Electron). Em desenvolvimento o app usa uma pasta **separada** (`-dev`). **Nunca** apague, sobrescreva nem aponte testes para o banco real. Testes usam `:memory:` ou arquivo temporário.
- Não instale nada globalmente. Dependência nova só se for realmente necessária, e registre a justificativa em `docs/PROGRESSO.md`.

## Segurança do Electron (não negociável)

- O banco é acessado **só no processo main**. O renderer fala com ele apenas por `window.api` (preload + `contextBridge`), com métodos específicos. Nunca exponha `ipcRenderer`, `fs` ou `require` ao renderer.
- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity` ligado.
- CSP restritiva no `index.html`. Bloqueie navegação e janelas novas (`setWindowOpenHandler` negando, `will-navigate` cancelando). Nada de conteúdo remoto.
- Todo handler IPC **valida os dados recebidos** (não confie no renderer) e devolve `Resultado<T>`. Nunca deixe exceção crua chegar ao renderer.
- Não use `window.alert`, `window.confirm` nem `window.prompt` (causam perda de foco nos campos no Electron/Windows). Use o componente `ConfirmarModal` do projeto.

## Quando perguntar e quando decidir

- **Pergunte antes** se a dúvida muda o modelo de dados, muda o cálculo de lucro, muda a stack ou envolve apagar dados.
- **Decida sozinho** se for detalhe de interface, texto ou nome de variável, e registre em "Decisões" no `docs/PROGRESSO.md`.
- Se os docs e o código divergirem, o código que funciona vence, mas avise o dono e registre a divergência.

## Protocolo de encerramento (toda etapa)

1. Rode `npm run typecheck` e `npm test` e confira os critérios de aceite do prompt. Se algo falhar, conserte antes de encerrar. Se não conseguir, diga claramente o que ficou faltando. Se não puder abrir a janela do app no seu ambiente, diga isso e liste o que o dono deve conferir manualmente.
2. Atualize `docs/PROGRESSO.md`: marque a etapa, liste o que foi feito, decisões, pendências e como rodar.
3. Faça commit (se houver git) com mensagem em português descrevendo a etapa. **Não** faça push.
4. Responda ao dono com: (a) o que foi feito, em poucas linhas; (b) um passo a passo curto para testar no app (`npm run dev`); (c) pendências ou dúvidas.

## O que não fazer

- Não crie funcionalidades "bônus" fora do prompt. Sugira no fim, em `docs/PROGRESSO.md` → "Ideias futuras".
- Não refatore código de etapas anteriores sem necessidade. Se for preciso, explique o motivo.
- Não adicione autenticação, multiusuário, nuvem, atualização automática ou qualquer acesso pela rede.
- Não coloque dados reais nem segredos no git.
