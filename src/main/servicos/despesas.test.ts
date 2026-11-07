import { DatabaseSync } from 'node:sqlite'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Despesa, EntradaDespesa } from '../../shared/tipos'
import { migrar } from '../db/migrar'
import {
  atualizarDespesa,
  criarDespesa,
  excluirDespesa,
  listarDespesas,
  obterDespesa
} from './despesas'

// Serviço de despesas testado com as migrations reais em `:memory:`.

let banco: DatabaseSync
let energiaId: number
let investimentoId: number

beforeEach(() => {
  banco = new DatabaseSync(':memory:')
  banco.exec('PRAGMA foreign_keys = ON')
  migrar(banco)
  energiaId = idCategoria('Energia')
  investimentoId = idCategoria('Equipamento (investimento)')
})

function idCategoria(nome: string): number {
  const linha = banco.prepare('SELECT id FROM categorias WHERE nome = ?').get(nome) as
    { id: number } | undefined
  if (!linha) throw new Error(`categoria não encontrada: ${nome}`)
  return Number(linha.id)
}

function criar(dados: Partial<EntradaDespesa> = {}): Despesa {
  const resultado = criarDespesa(banco, {
    data: '2026-11-06',
    categoriaId: energiaId,
    descricao: 'Despesa de teste',
    fornecedor: '',
    valor: '10',
    observacao: '',
    ...dados
  })
  if (!resultado.ok) throw new Error(`falhou criar: ${resultado.erro}`)
  return resultado.dados
}

function contar(): number {
  const linha = banco.prepare('SELECT COUNT(*) AS n FROM despesas').get() as { n: number }
  return Number(linha.n)
}

describe('criar despesa', () => {
  it('converte "1.234,56" em 123456 centavos e grava os dados', () => {
    const despesa = criar({
      valor: '1.234,56',
      fornecedor: '  Loja X  ',
      observacao: '   '
    })

    expect(despesa).toMatchObject({
      data: '2026-11-06',
      categoriaId: energiaId,
      categoriaNome: 'Energia',
      contaNoLucro: true,
      descricao: 'Despesa de teste',
      fornecedor: 'Loja X',
      valorCentavos: 123456,
      observacao: null
    })
    expect(despesa.criadoEm).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    expect(obterDespesa(banco, despesa.id).ok).toBe(true)
  })

  it('recusa valor inválido e data inválida sem gravar, com erro por campo', () => {
    const resultado = criarDespesa(banco, {
      data: '2026-02-30',
      categoriaId: energiaId,
      descricao: 'Despesa inválida',
      fornecedor: '',
      valor: 'abc',
      observacao: ''
    })

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) {
      expect(resultado.campos?.data).toBeTruthy()
      expect(resultado.campos?.valor).toBeTruthy()
    }
    expect(contar()).toBe(0)
  })

  it('recusa valor zero (precisa ser maior que zero)', () => {
    const resultado = criarDespesa(banco, {
      data: '2026-11-06',
      categoriaId: energiaId,
      descricao: 'Despesa zerada',
      fornecedor: '',
      valor: '0,00',
      observacao: ''
    })

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) {
      expect(resultado.campos?.valor).toBe('Informe um valor maior que zero.')
    }
    expect(contar()).toBe(0)
  })

  it('recusa categoria inexistente no campo categoria', () => {
    const resultado = criarDespesa(banco, {
      data: '2026-11-06',
      categoriaId: 999999,
      descricao: 'Sem categoria',
      fornecedor: '',
      valor: '10',
      observacao: ''
    })

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) {
      expect(resultado.campos?.categoriaId).toBe('Categoria não encontrada.')
    }
    expect(contar()).toBe(0)
  })
})

describe('editar despesa', () => {
  it('altera o registro e atualiza atualizado_em', () => {
    const despesa = criar({ valor: '10,00' })
    banco
      .prepare("UPDATE despesas SET atualizado_em = '2000-01-01 00:00:00' WHERE id = ?")
      .run(despesa.id)

    const resultado = atualizarDespesa(banco, {
      id: despesa.id,
      data: '2026-12-01',
      categoriaId: investimentoId,
      descricao: '  Impressora nova  ',
      fornecedor: 'Loja Y',
      valor: '3.500,00',
      observacao: 'Parcelada'
    })

    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return

    expect(resultado.dados).toMatchObject({
      id: despesa.id,
      data: '2026-12-01',
      categoriaId: investimentoId,
      categoriaNome: 'Equipamento (investimento)',
      contaNoLucro: false,
      descricao: 'Impressora nova',
      fornecedor: 'Loja Y',
      valorCentavos: 350000,
      observacao: 'Parcelada'
    })
    expect(resultado.dados.atualizadoEm).not.toBe('2000-01-01 00:00:00')
    expect(resultado.dados.atualizadoEm).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)

    // O banco guardou a edição.
    const obtida = obterDespesa(banco, despesa.id)
    if (obtida.ok) expect(obtida.dados.descricao).toBe('Impressora nova')
  })

  it('id inexistente devolve erro "não encontrada", não exceção', () => {
    const resultado = atualizarDespesa(banco, {
      id: 999999,
      data: '2026-11-01',
      categoriaId: energiaId,
      descricao: 'Qualquer',
      fornecedor: '',
      valor: '10',
      observacao: ''
    })

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.erro).toContain('não encontrada')
  })
})

describe('excluir despesa', () => {
  it('remove o registro', () => {
    const despesa = criar()

    expect(excluirDespesa(banco, despesa.id)).toEqual({ ok: true, dados: null })
    expect(obterDespesa(banco, despesa.id).ok).toBe(false)
    expect(contar()).toBe(0)
  })

  it('id inexistente devolve erro "não encontrada", não exceção', () => {
    const resultado = excluirDespesa(banco, 999999)

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.erro).toContain('não encontrada')
  })
})

describe('listar despesas do mês', () => {
  it('traz só as despesas do mês pedido, com total e total de investimento', () => {
    criar({ data: '2026-10-31', valor: '10,00' }) // borda anterior
    const inicioNovembro = criar({ data: '2026-11-01', valor: '20,00' })
    criar({ data: '2026-11-30', categoriaId: investimentoId, valor: '30,00' })
    criar({ data: '2026-12-01', valor: '40,00' }) // borda seguinte

    const novembro = listarDespesas(banco, '2026-11')
    expect(novembro.ok).toBe(true)
    if (!novembro.ok) return

    expect(novembro.dados.mes).toBe('2026-11')
    expect(novembro.dados.despesas).toHaveLength(2)
    expect(novembro.dados.despesas[0].data).toBe('2026-11-30')
    expect(novembro.dados.despesas[1].id).toBe(inicioNovembro.id)
    expect(novembro.dados.totalCentavos).toBe(5000)
    expect(novembro.dados.totalInvestimentoCentavos).toBe(3000)

    const outubro = listarDespesas(banco, '2026-10')
    expect(outubro.ok).toBe(true)
    if (outubro.ok) {
      expect(outubro.dados.despesas).toHaveLength(1)
      expect(outubro.dados.despesas[0].data).toBe('2026-10-31')
      expect(outubro.dados.totalInvestimentoCentavos).toBe(0)
    }

    const dezembro = listarDespesas(banco, '2026-12')
    expect(dezembro.ok).toBe(true)
    if (dezembro.ok) {
      expect(dezembro.dados.despesas).toHaveLength(1)
      expect(dezembro.dados.totalCentavos).toBe(4000)
    }

    const vazio = listarDespesas(banco, '2027-01')
    expect(vazio.ok).toBe(true)
    if (vazio.ok) {
      expect(vazio.dados.despesas).toEqual([])
      expect(vazio.dados.totalCentavos).toBe(0)
      expect(vazio.dados.totalInvestimentoCentavos).toBe(0)
    }
  })

  it('no mesmo dia ordena pelo id decrescente', () => {
    const primeira = criar({ data: '2026-11-10', descricao: 'Primeira' })
    const segunda = criar({ data: '2026-11-10', descricao: 'Segunda' })

    const resultado = listarDespesas(banco, '2026-11')
    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      expect(resultado.dados.despesas.map((despesa) => despesa.id)).toEqual([
        segunda.id,
        primeira.id
      ])
    }
  })
})
