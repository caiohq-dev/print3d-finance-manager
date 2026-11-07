# Etapa 07 — Backup, exportar e importar

Leia `AGENTS.md` e `docs/PROGRESSO.md`. Esta é a **ETAPA 07**. Pré-requisito: etapa 06 concluída. Se o `PROGRESSO.md` disser que não está, pare e me avise.

## Objetivo

Proteger os dados (backup), permitir levá-los para o Excel (exportar) e **trazer o histórico da planilha atual** (importar). Os dados reais são o ativo mais importante do projeto: nesta etapa, cuidado extra com tudo que escreve no banco. Esta etapa pode adicionar `papaparse` como dependência (aprovada); registre em `PROGRESSO.md`.

## Tarefas

### 1. Página "Dados" (`/dados`)

Nova entrada no menu, com três seções: Backup, Exportar e Importar. Serviço `src/main/servicos/dados.ts`, handlers IPC e `window.api.dados`. Diálogos de arquivo (`dialog.showSaveDialog` / `showOpenDialog`) são abertos no **main**, nunca no renderer.

### 2. Backup

- Botão "Fazer backup agora": usa a função `backup` do `node:sqlite` (**não** copie o arquivo "na unha" com o app aberto). Grava em `<userData>/backups/financeiro-AAAAMMDD-HHMMSS.db`.
- **Backup automático** ao iniciar o app, se ainda não existir backup do dia (depois das migrations, antes de abrir a janela; falha de backup não impede o app de abrir, só é registrada no log).
- Mantém os **30 backups mais recentes**; remove os mais antigos.
- A página lista os backups existentes (nome, data, tamanho) e tem o botão "Abrir pasta de backups" (`shell.openPath` na pasta de backups, caminho fixo e nunca vindo do renderer). **Sem restauração pela interface**: documente no `README.md` o passo a passo manual (fechar o app, copiar o arquivo escolhido por cima de `financeiro.db`).

### 3. Exportar CSV

- Botões para exportar vendas e despesas, com filtro opcional de período (de/até). O main abre a janela "Salvar como" e grava o arquivo.
- Formato que o Excel em português abre direto: **UTF-8 com BOM**, separador **`;`**, valores monetários como `1234,56` (sem `R$`), datas `dd/mm/aaaa`, campos com `;`, aspas ou quebra de linha entre aspas (aspas duplicadas).
- Colunas de vendas: `data;cliente;descricao;canal;valor;taxas;observacao`. Colunas de despesas: `data;categoria;descricao;fornecedor;valor;observacao`.

### 4. Importar CSV

- Escolha do tipo (vendas ou despesas) e do arquivo (diálogo "Abrir"). Botão para salvar um **modelo CSV** de cada tipo (com as colunas acima e uma linha de exemplo).
- Detecção automática do separador (`;` ou `,`) e da codificação (UTF-8 estrito, com fallback para `windows-1252`). Nomes de coluna sem diferenciar maiúsculas/minúsculas, e aceitando BOM.
- Datas aceitas: `dd/mm/aaaa` e `AAAA-MM-DD`. Valores aceitos: os mesmos de `paraCentavos`.
- **Duas etapas:** (1) **pré-visualização** com as primeiras linhas, total de linhas, total de valor e lista de erros no formato "linha N: motivo"; (2) **confirmação**, que grava tudo em **uma única transação**. Se houver qualquer erro, nada é gravado: o usuário corrige o CSV e escolhe de novo. A confirmação **relê o mesmo arquivo** e repete a validação (não guarde linhas em memória entre as etapas).
- Para despesas, categoria que não existe: caixa de seleção "Criar categorias que não existem (contam no lucro)". Sem marcar, vira erro de linha.
- **Aviso de possível duplicata:** informe quantas linhas parecem já existir (mesma data, descrição e valor). Não bloqueia, só avisa.
- Faça um **backup automático logo antes de confirmar uma importação**.

### 5. Testes (Vitest)

- Backup cria um arquivo válido e abrível (use pasta temporária do sistema), a rotação mantém só 30, o automático roda uma vez por dia.
- Exportar: formato (BOM, `;`, vírgula decimal, datas `dd/mm/aaaa`, escape de aspas e `;`) e filtro por período.
- Importar: CSV válido grava tudo; CSV com 1 linha ruim não grava nada e aponta a linha; separador `;` e `,`; codificação `windows-1252`; categoria inexistente com e sem a opção de criar; aviso de duplicata.
- **Ida e volta:** exportar e importar o resultado em um banco vazio reproduz os mesmos registros.

## Critérios de aceite

- `npm run typecheck` e `npm test` passam.
- No app: importar um CSV pequeno de vendas e outro de despesas, ver os dados nas telas e no resumo, exportar e abrir no Excel sem caracteres quebrados.
- `README.md` documenta backup, restauração manual e formato do CSV.
- `docs/PROGRESSO.md` atualizado.

## Fora do escopo

Restauração pela interface, importar `.xlsx` diretamente, sincronização com nuvem.

Ao terminar, siga o "Protocolo de encerramento" do `AGENTS.md`.
