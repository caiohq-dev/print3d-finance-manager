# Financeiro — Impressão 3D

App desktop (Electron) para registrar **vendas** e **despesas** de uma oficina de impressão 3D e ver **faturamento e lucro mês a mês**. Substitui a planilha. Tudo local, sem servidor e sem internet.

## Pré-requisitos

- **Node.js LTS** (22.16 ou mais novo) e npm — <https://nodejs.org>

## Como rodar

```bash
npm install      # instala as dependências
npm run dev      # abre o app em modo desenvolvimento (banco na pasta -dev)
npm test         # roda os testes (Vitest)
npm run typecheck # verifica os tipos
npm run build    # compila sem empacotar
npm run pack     # empacota sem instalador (verificação)
```

## Onde ficam os dados

- **Desenvolvimento** (`npm run dev`): `%APPDATA%\impressao3d-financeiro-dev\dados\financeiro.db` (pasta `-dev`, separada dos dados reais).
- **App instalado (produção)**: `%APPDATA%\impressao3d-financeiro\dados\financeiro.db` (junto dele ficam `backups\` e `logs\`, nas etapas 07/08). Os dados sobrevivem a reinstalações.
- A variável de ambiente `FINANCEIRO_DB` (caminho completo de um arquivo) sobrescreve o local do banco, para testes e depuração.

Mais detalhes em [`docs/`](docs/).
