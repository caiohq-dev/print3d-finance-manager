# Etapa 05 — Resumo mensal

Leia `AGENTS.md` e `docs/PROGRESSO.md`. Esta é a **ETAPA 05**. Pré-requisito: etapas 03 e 04 concluídas. Se o `PROGRESSO.md` disser que não estão, pare e me avise.

## Objetivo

A tela mais importante do app: mostrar **faturamento e lucro de cada mês**. Ela substitui a planilha. Siga **exatamente** as definições de "Regras de negócio" em `docs/PROJETO.md`.

## Tarefas

### 1. Tela `/resumo?mes=AAAA-MM` (página inicial do app)

Use o componente `NavegacaoMes`. Para o mês selecionado, mostre em destaque:

- Faturamento bruto
- Taxas
- Receita líquida
- Despesas do lucro
- **Lucro do mês** (em vermelho com sinal `−` se negativo)
- Margem (% sobre o faturamento bruto; `0%` se não houve faturamento)
- Investimentos do mês, **à parte** e com a nota "fora do cálculo do lucro"

Abaixo, três blocos simples (tabelas):

1. **Despesas por categoria** no mês (categoria, valor, % do total de despesas), maiores primeiro. Inclui as de investimento, marcadas como tal.
2. **Vendas por canal** no mês (canal, quantidade, faturamento bruto). Vendas sem canal aparecem como "Sem canal".
3. **Últimos 12 meses** (terminando no mês selecionado): mês, faturamento bruto, despesas do lucro, lucro. Cada mês é um link para `/resumo?mes=...`. Meses sem movimento aparecem com zeros. Uma linha de total no fim.

### 2. Implementação

- Serviço `src/main/servicos/resumo.ts` (recebe a conexão), com uma função por bloco, testável sem interface. IPC `window.api.resumo`.
- Use intervalo de datas (`data >= ? AND data < ?`) e `GROUP BY substr(data, 1, 7)` para a tabela de 12 meses, em uma consulta por bloco (nada de 12 consultas em loop).
- Valores em centavos (inteiros) até a hora de exibir. A margem pode ser calculada no serviço, arredondada a uma casa decimal.

### 3. Testes (com números conhecidos)

Monte este cenário em um mês e confira o resultado:

- Vendas: R$ 100,00 (taxas R$ 10,00) e R$ 50,00 (taxas R$ 0,00)
- Despesas: Filamento R$ 30,00 (conta no lucro) e Equipamento R$ 200,00 (investimento, fora do lucro)

Resultado esperado:

| Indicador | Valor |
|---|---|
| Faturamento bruto | R$ 150,00 |
| Taxas | R$ 10,00 |
| Receita líquida | R$ 140,00 |
| Despesas do lucro | R$ 30,00 |
| Lucro | R$ 110,00 |
| Investimentos | R$ 200,00 |
| Margem | 73,3% |

Outros testes:

- Mês sem nenhum registro: tudo zerado, sem erro, sem divisão por zero.
- Mês de prejuízo: lucro negativo calculado corretamente.
- Registros vizinhos (31/10 e 01/12) não entram no resumo de novembro.
- Tabela de 12 meses cobre virada de ano e preenche meses vazios com zero.

## Critérios de aceite

- `npm run typecheck` e `npm test` passam, incluindo o cenário acima.
- No app, os números do resumo batem com a soma manual das listas de vendas e despesas do mesmo mês. A rota inicial abre o resumo do mês atual.
- `docs/PROGRESSO.md` atualizado.

## Fora do escopo

Gráficos, comparação entre anos, exportação.

Ao terminar, siga o "Protocolo de encerramento" do `AGENTS.md`.
