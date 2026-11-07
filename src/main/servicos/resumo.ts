// Serviço do resumo mensal: uma função por bloco, todas recebendo a conexão
// para poderem ser testadas com banco `:memory:`. Dinheiro em centavos até a
// hora de exibir; a margem e os percentuais são calculados aqui com uma casa
// decimal.
import type { DatabaseSync } from 'node:sqlite'
import { intervaloDoMes, mesAnterior, mesProximo } from '../../shared/datas'
import type {
  DespesaCategoriaResumo,
  MesResumo,
  ResumoIndicadores,
  ResumoMensal,
  Resultado,
  VendaCanalResumo
} from '../../shared/tipos'

const MENSAGEM_MES = 'Mês inválido.'
const MENSAGEM_CARREGAR = 'Não foi possível carregar o resumo.'

/** Quantidade de meses na tabela final (inclui o mês selecionado). */
const MESES_NA_TABELA = 12

const SQL_INDICADORES = `
  SELECT
    COALESCE((SELECT SUM(valor_centavos) FROM vendas
              WHERE data >= ? AND data < ?), 0) AS faturamento_centavos,
    COALESCE((SELECT SUM(taxas_centavos) FROM vendas
              WHERE data >= ? AND data < ?), 0) AS taxas_centavos,
    COALESCE((SELECT SUM(d.valor_centavos)
              FROM despesas d JOIN categorias c ON c.id = d.categoria_id
              WHERE c.conta_no_lucro = 1 AND d.data >= ? AND d.data < ?), 0) AS despesas_lucro_centavos,
    COALESCE((SELECT SUM(d.valor_centavos)
              FROM despesas d JOIN categorias c ON c.id = d.categoria_id
              WHERE c.conta_no_lucro = 0 AND d.data >= ? AND d.data < ?), 0) AS investimentos_centavos`

type LinhaIndicadores = {
  faturamento_centavos: number
  taxas_centavos: number
  despesas_lucro_centavos: number
  investimentos_centavos: number
}

/** Bloco de destaque: faturamento, taxas, receita, despesas, lucro e margem. */
export function calcularIndicadores(
  banco: DatabaseSync,
  mes: string
): Resultado<ResumoIndicadores> {
  if (!ehMes(mes)) return { ok: false, erro: MENSAGEM_MES }

  try {
    const [inicio, fim] = intervaloDoMes(mes)
    const linha = banco
      .prepare(SQL_INDICADORES)
      .get(inicio, fim, inicio, fim, inicio, fim, inicio, fim) as LinhaIndicadores | undefined

    const faturamentoBrutoCentavos = Number(linha?.faturamento_centavos ?? 0)
    const taxasCentavos = Number(linha?.taxas_centavos ?? 0)
    const receitaLiquidaCentavos = faturamentoBrutoCentavos - taxasCentavos
    const despesasLucroCentavos = Number(linha?.despesas_lucro_centavos ?? 0)
    const lucroCentavos = receitaLiquidaCentavos - despesasLucroCentavos

    return {
      ok: true,
      dados: {
        mes,
        faturamentoBrutoCentavos,
        taxasCentavos,
        receitaLiquidaCentavos,
        despesasLucroCentavos,
        lucroCentavos,
        investimentosCentavos: Number(linha?.investimentos_centavos ?? 0),
        margem: calcularPercentual(lucroCentavos, faturamentoBrutoCentavos)
      }
    }
  } catch {
    return { ok: false, erro: MENSAGEM_CARREGAR }
  }
}

type LinhaCategoria = {
  categoria_id: number
  categoria_nome: string
  conta_no_lucro: number
  valor_centavos: number
}

/** Bloco 1: despesas do mês agrupadas por categoria, maiores primeiro. */
export function listarDespesasPorCategoria(
  banco: DatabaseSync,
  mes: string
): Resultado<DespesaCategoriaResumo[]> {
  if (!ehMes(mes)) return { ok: false, erro: MENSAGEM_MES }

  try {
    const [inicio, fim] = intervaloDoMes(mes)
    const linhas = banco
      .prepare(
        `SELECT c.id AS categoria_id, c.nome AS categoria_nome, c.conta_no_lucro,
                SUM(d.valor_centavos) AS valor_centavos
         FROM despesas d
         JOIN categorias c ON c.id = d.categoria_id
         WHERE d.data >= ? AND d.data < ?
         GROUP BY c.id, c.nome, c.conta_no_lucro
         ORDER BY valor_centavos DESC, c.nome COLLATE NOCASE`
      )
      .all(inicio, fim) as unknown as LinhaCategoria[]

    // O percentual é sobre o total de despesas do mês, incluindo investimentos.
    const totalCentavos = linhas.reduce((soma, linha) => soma + Number(linha.valor_centavos), 0)

    return {
      ok: true,
      dados: linhas.map((linha) => ({
        categoriaId: linha.categoria_id,
        categoriaNome: linha.categoria_nome,
        contaNoLucro: linha.conta_no_lucro === 1,
        valorCentavos: Number(linha.valor_centavos),
        percentualDoTotal: calcularPercentual(Number(linha.valor_centavos), totalCentavos)
      }))
    }
  } catch {
    return { ok: false, erro: MENSAGEM_CARREGAR }
  }
}

type LinhaCanal = {
  canal: string
  quantidade: number
  faturamento_bruto_centavos: number
}

/** Bloco 2: vendas do mês por canal; sem canal vira "Sem canal". */
export function listarVendasPorCanal(
  banco: DatabaseSync,
  mes: string
): Resultado<VendaCanalResumo[]> {
  if (!ehMes(mes)) return { ok: false, erro: MENSAGEM_MES }

  try {
    const [inicio, fim] = intervaloDoMes(mes)
    const linhas = banco
      .prepare(
        `SELECT COALESCE(NULLIF(TRIM(canal), ''), 'Sem canal') AS canal,
                COUNT(*) AS quantidade,
                SUM(valor_centavos) AS faturamento_bruto_centavos
         FROM vendas
         WHERE data >= ? AND data < ?
         GROUP BY COALESCE(NULLIF(TRIM(canal), ''), 'Sem canal')
         ORDER BY faturamento_bruto_centavos DESC, canal COLLATE NOCASE`
      )
      .all(inicio, fim) as unknown as LinhaCanal[]

    return {
      ok: true,
      dados: linhas.map((linha) => ({
        canal: linha.canal,
        quantidade: Number(linha.quantidade),
        faturamentoBrutoCentavos: Number(linha.faturamento_bruto_centavos)
      }))
    }
  } catch {
    return { ok: false, erro: MENSAGEM_CARREGAR }
  }
}

type LinhaMes = {
  mes: string
  faturamento_centavos: number
  taxas_centavos: number
  despesas_lucro_centavos: number
}

/**
 * Bloco 3: últimos 12 meses terminando no mês selecionado. Uma consulta só,
 * com `GROUP BY substr(data, 1, 7)`; os meses sem movimento entram zerados.
 */
export function listarUltimosMeses(banco: DatabaseSync, mes: string): Resultado<MesResumo[]> {
  if (!ehMes(mes)) return { ok: false, erro: MENSAGEM_MES }

  try {
    const meses = mesesTerminandoEm(mes, MESES_NA_TABELA)
    const inicio = `${meses[0]}-01`
    const fim = `${mesProximo(mes)}-01`

    // Vendas e despesas do lucro no mesmo resultado, uma única consulta.
    const linhas = banco
      .prepare(
        `SELECT mes,
                SUM(faturamento_centavos) AS faturamento_centavos,
                SUM(taxas_centavos) AS taxas_centavos,
                SUM(despesas_lucro_centavos) AS despesas_lucro_centavos
         FROM (
           SELECT substr(data, 1, 7) AS mes,
                  valor_centavos AS faturamento_centavos,
                  taxas_centavos AS taxas_centavos,
                  0 AS despesas_lucro_centavos
           FROM vendas
           WHERE data >= ? AND data < ?
           UNION ALL
           SELECT substr(d.data, 1, 7) AS mes,
                  0 AS faturamento_centavos,
                  0 AS taxas_centavos,
                  d.valor_centavos AS despesas_lucro_centavos
           FROM despesas d
           JOIN categorias c ON c.id = d.categoria_id
           WHERE c.conta_no_lucro = 1 AND d.data >= ? AND d.data < ?
         )
         GROUP BY mes
         ORDER BY mes`
      )
      .all(inicio, fim, inicio, fim) as unknown as LinhaMes[]

    const porMes = new Map(linhas.map((linha) => [linha.mes, linha]))

    return {
      ok: true,
      dados: meses.map((mesDaTabela) => {
        const linha = porMes.get(mesDaTabela)
        const faturamentoBrutoCentavos = Number(linha?.faturamento_centavos ?? 0)
        const taxasCentavos = Number(linha?.taxas_centavos ?? 0)
        const despesasLucroCentavos = Number(linha?.despesas_lucro_centavos ?? 0)
        return {
          mes: mesDaTabela,
          faturamentoBrutoCentavos,
          despesasLucroCentavos,
          lucroCentavos: faturamentoBrutoCentavos - taxasCentavos - despesasLucroCentavos
        }
      })
    }
  } catch {
    return { ok: false, erro: MENSAGEM_CARREGAR }
  }
}

/**
 * Tudo o que a tela precisa: os indicadores e os três blocos, com uma
 * chamada por bloco (nenhuma consulta dentro de laço de meses).
 */
export function obterResumo(banco: DatabaseSync, mes: string): Resultado<ResumoMensal> {
  const indicadores = calcularIndicadores(banco, mes)
  if (!indicadores.ok) return indicadores

  const despesas = listarDespesasPorCategoria(banco, mes)
  if (!despesas.ok) return despesas

  const canais = listarVendasPorCanal(banco, mes)
  if (!canais.ok) return canais

  const ultimosMeses = listarUltimosMeses(banco, mes)
  if (!ultimosMeses.ok) return ultimosMeses

  return {
    ok: true,
    dados: {
      indicadores: indicadores.dados,
      despesasPorCategoria: despesas.dados,
      vendasPorCanal: canais.dados,
      ultimosMeses: ultimosMeses.dados
    }
  }
}

function ehMes(mes: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(mes)
}

/** `[mes - 11, ..., mes]`, em ordem crescente. */
function mesesTerminandoEm(mes: string, quantidade: number): string[] {
  const meses = [mes]
  let atual = mes
  for (let i = 1; i < quantidade; i++) {
    atual = mesAnterior(atual)
    meses.unshift(atual)
  }
  return meses
}

/**
 * Percentual inteiro em décimos (ex.: 733 → 73,3%), para nunca usar float
 * na conta. Sem base (0), devolve 0 — evita divisão por zero.
 */
function calcularPercentual(parteCentavos: number, totalCentavos: number): number {
  if (totalCentavos === 0) return 0
  return Math.round((parteCentavos * 1000) / totalCentavos) / 10
}
