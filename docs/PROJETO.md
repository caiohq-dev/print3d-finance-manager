# Projeto — Financeiro da oficina de impressão 3D

## Contexto

O dono tem uma pequena empresa de impressão 3D e controla faturamento e lucro de cada mês em anotações/planilha, o que está ficando confuso. Este app substitui isso por algo mais confortável: um CRUD desktop, rápido de preencher, que mostra o resultado de cada mês.

## Objetivo

Registrar **vendas** e **despesas** e ver, por mês: faturamento, taxas, despesas, lucro e margem.

## Usuário e ambiente

- Uma pessoa só, no próprio computador. Sem login, sem servidor, sem nuvem, sem internet.
- Desenvolvedor com experiência em Electron, JavaScript e TypeScript: o código deve ser convencional para quem vem desse mundo e fácil de ler.
- No dia a dia o app é usado **instalado** (atalho/ícone, sem terminal). Durante o desenvolvimento roda com `npm run dev`.
- Visual simples e limpo. Funcionalidade vem antes de beleza.
- Interface em português do Brasil: R$, dd/mm/aaaa, vírgula decimal.

## Escopo do MVP (etapas 01 a 08)

- CRUD de vendas, despesas e categorias de despesa.
- Resumo mensal com navegação entre meses e visão dos últimos 12 meses.
- Busca e filtros, entrada rápida de dados (salvar e adicionar outro, duplicar).
- Backup do banco, exportação CSV e importação CSV (para trazer o histórico da planilha).
- Empacotamento: instalador ou executável para usar o app sem terminal.

## Opcional (etapa 09)

- Cadastro de insumos (filamento/resina) e calculadora de custo e preço sugerido por peça. É informativa e **não altera o lucro**.

## Fora de escopo

Login/usuários, multiempresa, nota fiscal, estoque com baixa automática, contas a receber/pagar, integração com marketplaces, app mobile, atualização automática, assinatura de código, gráficos sofisticados.

## Regras de negócio (cálculo do mês)

O mês de um registro é o mês da sua `data`. Não existe "data de pagamento" no MVP.

| Indicador | Cálculo |
|---|---|
| Faturamento bruto | soma de `vendas.valor_centavos` |
| Taxas | soma de `vendas.taxas_centavos` (marketplace, maquininha, etc.) |
| Receita líquida | faturamento bruto − taxas |
| Despesas do lucro | soma das despesas cuja categoria tem `conta_no_lucro = 1` |
| Investimentos | soma das despesas cuja categoria tem `conta_no_lucro = 0` (ex.: compra de impressora). Aparece à parte, fora do lucro |
| **Lucro do mês** | receita líquida − despesas do lucro |
| Margem | lucro ÷ faturamento bruto (0% se não houve faturamento) |

Observações importantes:

- O filamento comprado entra como **despesa** (categoria Filamento). Por isso **não** existe "custo por venda" subtraído do lucro: isso contaria o mesmo filamento duas vezes.
- O lucro pode ser negativo (mês de prejuízo). Mostre isso claramente.
- Devolução/estorno no MVP: editar a venda (reduzindo o valor) ou excluí-la.

## Requisitos não funcionais

- 100% offline e local. Nenhuma requisição de rede feita pelo app.
- Dados em um único arquivo SQLite, fácil de copiar para backup.
- Os dados sobrevivem a reinstalações e atualizações do app (ficam na pasta de dados do usuário, não na pasta de instalação).
- Os cálculos têm testes automatizados.

## Definição de pronto (por etapa)

`npm run typecheck` e `npm test` passando, critérios de aceite do prompt cumpridos, `docs/PROGRESSO.md` atualizado e commit feito.
