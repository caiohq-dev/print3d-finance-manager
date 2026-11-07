# Etapa 08 — Empacotamento (instalador)

Leia `AGENTS.md` e `docs/PROGRESSO.md`. Esta é a **ETAPA 08**. Pré-requisito: etapa 07 concluída. Se o `PROGRESSO.md` disser que não está, pare e me avise.

## Objetivo

Gerar um instalador (ou executável) para o dono usar o app no dia a dia, com ícone e atalho, **sem terminal**, e com a garantia de que os dados reais ficam seguros em atualizações e reinstalações.

## Antes de começar

Pergunte ao dono, em **uma única pergunta**, qual é o sistema operacional do computador onde o app vai ser usado (Windows, macOS ou Linux) e se ele quer instalador ou versão portátil (Windows). Gere o pacote **apenas para esse sistema**. Se ele não responder, assuma Windows com instalador NSIS e registre a decisão.

## Tarefas

1. **Configuração do electron-builder** (`electron-builder.yml`): `appId`, `productName` (sem acentos nem caracteres especiais, ex.: "Financeiro 3D"), saída em `release/`, alvo conforme a resposta acima (Windows: NSIS por usuário, sem exigir administrador; macOS: dmg; Linux: AppImage). Inclua só o necessário no pacote.
2. **Dados protegidos.** Confirme que o banco, os backups e os logs ficam em `<userData>` (fora da pasta de instalação) e que **desinstalar ou reinstalar não apaga os dados** (no NSIS, nada de apagar dados do app na desinstalação).
3. **Ícone.** Se o dono tiver um ícone, use-o. Senão, use o padrão do Electron por enquanto e registre em "Ideias futuras" a criação de um ícone próprio.
4. **App empacotado.** Sem DevTools, sem menu de desenvolvimento, título da janela com o nome e a versão, versão vinda do `package.json`. O app empacotado usa os dados de **produção** (sem `-dev`) e `FINANCEIRO_DB` continua funcionando como sobrescrita.
5. **Script `npm run dist`** que compila e gera o instalador em `release/` (e `release/` no `.gitignore`).
6. **Verificação do pacote**, passo a passo, registrando o resultado em `PROGRESSO.md`: o app empacotado abre; cria o banco na pasta de dados de produção na primeira execução; as migrations rodam; consegue criar categoria, despesa e venda; o resumo funciona; o backup automático cria arquivo; a segunda instância só foca a primeira.
7. **README.md**: como gerar o instalador (`npm run dist`), onde ele fica, como instalar, onde ficam dados e backups no sistema do dono, como levar os dados para outro computador (copiar `financeiro.db`) e como restaurar um backup manualmente. Avise que, sem assinatura de código, o Windows pode mostrar o aviso "Windows protegeu seu computador" (SmartScreen) na instalação, e explique em uma frase como prosseguir ("Mais informações" → "Executar assim mesmo").

## Critérios de aceite

- `npm run typecheck` e `npm test` passam.
- `npm run dist` gera o instalador em `release/`, e instalá-lo cria atalho e abre o app.
- Dados criados no app instalado continuam lá depois de fechar, reabrir e reinstalar por cima.
- `docs/PROGRESSO.md` atualizado com o resultado da verificação do pacote.

## Fora do escopo

Assinatura de código, atualização automática, pacotes para outros sistemas, publicação em loja.

Ao terminar, siga o "Protocolo de encerramento" do `AGENTS.md`.
