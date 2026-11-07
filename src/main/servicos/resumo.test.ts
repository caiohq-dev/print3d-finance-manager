import { DatabaseSync } from 'node:sqlite'
import { beforeEach, describe, expect, it } from 'vitest'
import type { ResumoMensal } from '../../shared/tipos'
import { migrar } from '../db/migrar'
import { obterResumo } from './resumo'

// Serviço do resumo testado com as migrations reais em `:memory:`.
// Números conhecidos: o cenário do prompt (vendas de 100 e 50, despesas de 30
// no lucro e 200 de investimento).

let banco: DatabaseSync

beforeEach(() => {
  banco = new DatabaseSync(':memory:')
  banco.exec('PRAGMA foreign_keys = ON')
  migrar(banco)
})

function venda(
  data: string,
  valorCentavos: number,
  taxasCentavos = 0,
  canal: string | null = null
): void {
  banco
    .prepare(
      `INSERT INTO vendas (data, descricao, canal, valor_centavos, taxas_centavos)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(data, 'Venda de teste', canal, valorCentavos, taxasCentavos)
}

function despesa(data: string, categoriaNome: string, valorCentavos: number): void {
  const categoria = banco.prepare('SELECT id FROM categorias WHERE nome = ?').get(categoriaNome) as
    { id: number } | undefined
  if (!categoria) throw new Error(`categoria de teste não encontrada: ${categoriaNome}`)

  banco
    .prepare(
      `INSERT INTO despesas (data, categoria_id, descricao, valor_centavos)
       VALUES (?, ?, ?, ?)`
    )
    .run(data, categoria.id, 'Despesa de teste', valorCentavos)
}

/** Cenário do prompt, em novembro de 2026. */
function cenarioNovembro(): ResumoMensal {
  venda('2026-11-05', 10000, 1000, 'Shopee')
  venda('2026-11-20', 5000, 0, null)
  despesa('2026-11-08', 'Filamento / Resina', 3000)
  despesa('2026-11-15', 'Equipamento (investimento)', 20000)

  const resultado = obterResumo(banco, '2026-11')
  if (!resultado.ok) throw new Error(resultado.erro)
  return resultado.dados
}

describe('indicadores do mês', () => {
  it('bate com o cenário de números conhecidos do prompt', () => {
    const { indicadores } = cenarioNovembro()

    expect(indicadores).toEqual({
      mes: '2026-11',
      faturamentoBrutoCentavos: 15000,
      taxasCentavos: 1000,
      receitaLiquidaCentavos: 14000,
      despesasLucroCentavos: 3000,
      lucroCentavos: 11000,
      investimentosCentavos: 20000,
      margem: 73.3
    })
  })

  it('mês sem nenhum registro fica zerado, sem erro nem divisão por zero', () => {
    const resultado = obterResumo(banco, '2026-05')

    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return

    expect(resultado.dados.indicadores).toEqual({
      mes: '2026-05',
      faturamentoBrutoCentavos: 0,
      taxasCentavos: 0,
      receitaLiquidaCentavos: 0,
      despesasLucroCentavos: 0,
      lucroCentavos: 0,
      investimentosCentavos: 0,
      margem: 0
    })
    expect(resultado.dados.despesasPorCategoria).toEqual([])
    expect(resultado.dados.vendasPorCanal).toEqual([])
    expect(resultado.dados.ultimosMeses).toHaveLength(12)
    expect(resultado.dados.ultimosMeses.every((mes) => mes.lucroCentavos === 0)).toBe(true)
  })

  it('mês de prejuízo calcula o lucro negativo e a margem negativa', () => {
    venda('2026-07-10', 10000)
    despesa('2026-07-12', 'Filamento / Resina', 25000)

    const resultado = obterResumo(banco, '2026-07')
    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return

    expect(resultado.dados.indicadores.receitaLiquidaCentavos).toBe(10000)
    expect(resultado.dados.indicadores.despesasLucroCentavos).toBe(25000)
    expect(resultado.dados.indicadores.lucroCentavos).toBe(-15000)
    expect(resultado.dados.indicadores.margem).toBe(-150)

    const julho = resultado.dados.ultimosMeses.find((mes) => mes.mes === '2026-07')
    expect(julho).toEqual({
      mes: '2026-07',
      faturamentoBrutoCentavos: 10000,
      despesasLucroCentavos: 25000,
      lucroCentavos: -15000
    })
  })

  it('registros de 31/10 e 01/12 ficam fora do resumo de novembro', () => {
    venda('2026-10-31', 7000, 700, 'Shopee')
    venda('2026-11-01', 1000, 0, 'Shopee')
    venda('2026-11-30', 2000, 0, 'Shopee')
    venda('2026-12-01', 9000, 900, 'Shopee')
    despesa('2026-10-31', 'Energia', 4000)
    despesa('2026-12-01', 'Energia', 6000)

    const resultado = obterResumo(banco, '2026-11')
    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return

    expect(resultado.dados.indicadores).toMatchObject({
      faturamentoBrutoCentavos: 3000,
      taxasCentavos: 0,
      receitaLiquidaCentavos: 3000,
      despesasLucroCentavos: 0,
      lucroCentavos: 3000,
      investimentosCentavos: 0
    })
    expect(resultado.dados.vendasPorCanal).toEqual([
      { canal: 'Shopee', quantidade: 2, faturamentoBrutoCentavos: 3000 }
    ])
  })

  it('recusa mês inválido com mensagem, sem consultar', () => {
    expect(obterResumo(banco, '2026-13')).toEqual({ ok: false, erro: 'Mês inválido.' })
    expect(obterResumo(banco, 'novembro')).toEqual({ ok: false, erro: 'Mês inválido.' })
  })
})

describe('despesas por categoria', () => {
  it('ordena das maiores para as menores, marca investimento e calcula o percentual do total', () => {
    const { despesasPorCategoria } = cenarioNovembro()

    expect(despesasPorCategoria).toEqual([
      {
        categoriaId: expect.any(Number),
        categoriaNome: 'Equipamento (investimento)',
        contaNoLucro: false,
        valorCentavos: 20000,
        percentualDoTotal: 87
      },
      {
        categoriaId: expect.any(Number),
        categoriaNome: 'Filamento / Resina',
        contaNoLucro: true,
        valorCentavos: 3000,
        percentualDoTotal: 13
      }
    ])
  })
})

describe('vendas por canal', () => {
  it('agrupa por canal, conta as vendas e usa "Sem canal" quando falta o canal', () => {
    const { vendasPorCanal } = cenarioNovembro()

    expect(vendasPorCanal).toEqual([
      { canal: 'Shopee', quantidade: 1, faturamentoBrutoCentavos: 10000 },
      { canal: 'Sem canal', quantidade: 1, faturamentoBrutoCentavos: 5000 }
    ])
  })
})

describe('últimos 12 meses', () => {
  it('termina no mês selecionado, cobre a virada do ano e zera os meses vazios', () => {
    venda('2025-02-28', 9999, 0, 'Shopee')
    venda('2025-03-10', 10000, 500, 'Shopee')
    despesa('2025-03-20', 'Filamento / Resina', 2000)
    venda('2026-02-01', 5000, 0, 'Shopee')

    const resultado = obterResumo(banco, '2026-02')
    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return

    const meses = resultado.dados.ultimosMeses
    expect(meses).toHaveLength(12)
    expect(meses[0].mes).toBe('2025-03')
    expect(meses[11].mes).toBe('2026-02')

    expect(meses.find((mes) => mes.mes === '2025-03')).toEqual({
      mes: '2025-03',
      faturamentoBrutoCentavos: 10000,
      despesasLucroCentavos: 2000,
      lucroCentavos: 7500
    })
    expect(meses.find((mes) => mes.mes === '2025-04')).toEqual({
      mes: '2025-04',
      faturamentoBrutoCentavos: 0,
      despesasLucroCentavos: 0,
      lucroCentavos: 0
    })
    expect(meses.find((mes) => mes.mes === '2026-02')).toEqual({
      mes: '2026-02',
      faturamentoBrutoCentavos: 5000,
      despesasLucroCentavos: 0,
      lucroCentavos: 5000
    })
    // 28/02/2025 ficou fora do intervalo.
    expect(meses.some((mes) => mes.faturamentoBrutoCentavos === 9999)).toBe(false)
  })

  it('tabela de novembro traz o lucro já descontando taxas e investimentos não entram', () => {
    const { ultimosMeses } = cenarioNovembro()

    expect(ultimosMeses).toHaveLength(12)
    expect(ultimosMeses[0].mes).toBe('2025-12')
    expect(ultimosMeses[11].mes).toBe('2026-11')
    expect(ultimosMeses.find((mes) => mes.mes === '2026-11')).toEqual({
      mes: '2026-11',
      faturamentoBrutoCentavos: 15000,
      despesasLucroCentavos: 3000,
      lucroCentavos: 11000
    })
    expect(ultimosMeses.find((mes) => mes.mes === '2026-10')).toEqual({
      mes: '2026-10',
      faturamentoBrutoCentavos: 0,
      despesasLucroCentavos: 0,
      lucroCentavos: 0
    })
  })
})
