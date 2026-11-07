import { DatabaseSync } from 'node:sqlite'
import { beforeEach, describe, expect, it } from 'vitest'
import type { EntradaVenda, Venda } from '../../shared/tipos'
import { migrar } from '../db/migrar'
import {
  atualizarVenda,
  criarVenda,
  excluirVenda,
  listarCanais,
  listarVendas,
  obterVenda
} from './vendas'

// Serviço de vendas testado com as migrations reais em `:memory:`.

let banco: DatabaseSync

beforeEach(() => {
  banco = new DatabaseSync(':memory:')
  banco.exec('PRAGMA foreign_keys = ON')
  migrar(banco)
})

function criar(dados: Partial<EntradaVenda> = {}): Venda {
  const resultado = criarVenda(banco, {
    data: '2026-11-06',
    cliente: 'Maria',
    descricao: 'Venda de teste',
    canal: 'Shopee',
    valor: '10',
    taxas: '',
    observacao: '',
    ...dados
  })
  if (!resultado.ok) throw new Error(`falhou criar: ${resultado.erro}`)
  return resultado.dados
}

function contar(): number {
  const linha = banco.prepare('SELECT COUNT(*) AS n FROM vendas').get() as { n: number }
  return Number(linha.n)
}

describe('criar venda', () => {
  it('converte valor e taxas em centavos e calcula o líquido', () => {
    const venda = criar({ valor: '150,00', taxas: '12,50' })

    expect(venda).toMatchObject({
      data: '2026-11-06',
      cliente: 'Maria',
      descricao: 'Venda de teste',
      canal: 'Shopee',
      valorCentavos: 15000,
      taxasCentavos: 1250,
      liquidoCentavos: 13750,
      observacao: null
    })
    expect(venda.criadoEm).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    expect(obterVenda(banco, venda.id).ok).toBe(true)
  })

  it('taxas vazias valem 0', () => {
    const venda = criar({ valor: '20,00', taxas: '   ' })
    expect(venda.taxasCentavos).toBe(0)
    expect(venda.liquidoCentavos).toBe(2000)
  })

  it('recusa taxas maiores que o valor, com erro no campo taxas, sem gravar', () => {
    const resultado = criarVenda(banco, {
      data: '2026-11-06',
      cliente: '',
      descricao: 'Taxa absurda',
      canal: '',
      valor: '100,00',
      taxas: '100,01',
      observacao: ''
    })

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) {
      expect(resultado.campos?.taxas).toBe('As taxas não podem ser maiores que o valor cobrado.')
    }
    expect(contar()).toBe(0)
  })

  it('salva campos opcionais vazios como NULL', () => {
    const venda = criar({ cliente: '   ', canal: '', observacao: '  ' })

    expect(venda.cliente).toBeNull()
    expect(venda.canal).toBeNull()
    expect(venda.observacao).toBeNull()

    const linha = banco
      .prepare('SELECT cliente, canal, observacao FROM vendas WHERE id = ?')
      .get(venda.id) as { cliente: string | null; canal: string | null; observacao: string | null }
    expect(linha).toEqual({ cliente: null, canal: null, observacao: null })
  })

  it('recusa data inválida, descrição vazia e valor zero sem gravar', () => {
    const resultado = criarVenda(banco, {
      data: '2026-02-30',
      cliente: '',
      descricao: '  ',
      canal: '',
      valor: '0,00',
      taxas: '',
      observacao: ''
    })

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) {
      expect(resultado.campos?.data).toBeTruthy()
      expect(resultado.campos?.descricao).toBeTruthy()
      expect(resultado.campos?.valor).toBe('Informe um valor maior que zero.')
    }
    expect(contar()).toBe(0)
  })
})

describe('editar venda', () => {
  it('altera o registro, recalcula o líquido e atualiza atualizado_em', () => {
    const venda = criar({ valor: '10,00', taxas: '0,00' })
    banco
      .prepare("UPDATE vendas SET atualizado_em = '2000-01-01 00:00:00' WHERE id = ?")
      .run(venda.id)

    const resultado = atualizarVenda(banco, {
      id: venda.id,
      data: '2026-12-01',
      cliente: '  João  ',
      descricao: '  Peça nova  ',
      canal: 'Mercado Livre',
      valor: '250,00',
      taxas: '25,00',
      observacao: 'Entrega combinada'
    })

    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return

    expect(resultado.dados).toMatchObject({
      id: venda.id,
      data: '2026-12-01',
      cliente: 'João',
      descricao: 'Peça nova',
      canal: 'Mercado Livre',
      valorCentavos: 25000,
      taxasCentavos: 2500,
      liquidoCentavos: 22500,
      observacao: 'Entrega combinada'
    })
    expect(resultado.dados.atualizadoEm).not.toBe('2000-01-01 00:00:00')
    expect(resultado.dados.atualizadoEm).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)

    const obtida = obterVenda(banco, venda.id)
    if (obtida.ok) expect(obtida.dados.descricao).toBe('Peça nova')
  })

  it('id inexistente devolve erro "não encontrada", não exceção', () => {
    const resultado = atualizarVenda(banco, {
      id: 999999,
      data: '2026-11-01',
      cliente: '',
      descricao: 'Qualquer',
      canal: '',
      valor: '10',
      taxas: '',
      observacao: ''
    })

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.erro).toContain('não encontrada')
  })
})

describe('excluir venda', () => {
  it('remove o registro', () => {
    const venda = criar()

    expect(excluirVenda(banco, venda.id)).toEqual({ ok: true, dados: null })
    expect(obterVenda(banco, venda.id).ok).toBe(false)
    expect(contar()).toBe(0)
  })

  it('id inexistente devolve erro "não encontrada", não exceção', () => {
    const resultado = excluirVenda(banco, 999999)

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.erro).toContain('não encontrada')
  })

  it('obter id inexistente devolve erro "não encontrada"', () => {
    const resultado = obterVenda(banco, 999999)

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.erro).toContain('não encontrada')
  })
})

describe('listar vendas do mês', () => {
  it('traz só as vendas do mês pedido, com faturamento, taxas e receita líquida', () => {
    criar({ data: '2026-10-31', valor: '10,00', taxas: '1,00' }) // borda anterior
    const inicioNovembro = criar({ data: '2026-11-01', valor: '20,00', taxas: '2,00' })
    criar({ data: '2026-11-30', valor: '30,00', taxas: '3,00' })
    criar({ data: '2026-12-01', valor: '40,00', taxas: '4,00' }) // borda seguinte

    const novembro = listarVendas(banco, '2026-11')
    expect(novembro.ok).toBe(true)
    if (!novembro.ok) return

    expect(novembro.dados.mes).toBe('2026-11')
    expect(novembro.dados.vendas).toHaveLength(2)
    expect(novembro.dados.vendas[0].data).toBe('2026-11-30')
    expect(novembro.dados.vendas[1].id).toBe(inicioNovembro.id)
    expect(novembro.dados.totalCentavos).toBe(5000)
    expect(novembro.dados.totalTaxasCentavos).toBe(500)
    expect(novembro.dados.totalLiquidoCentavos).toBe(4500)

    const outubro = listarVendas(banco, '2026-10')
    expect(outubro.ok).toBe(true)
    if (outubro.ok) {
      expect(outubro.dados.vendas).toHaveLength(1)
      expect(outubro.dados.vendas[0].data).toBe('2026-10-31')
      expect(outubro.dados.totalLiquidoCentavos).toBe(900)
    }

    const dezembro = listarVendas(banco, '2026-12')
    expect(dezembro.ok).toBe(true)
    if (dezembro.ok) {
      expect(dezembro.dados.vendas).toHaveLength(1)
      expect(dezembro.dados.totalCentavos).toBe(4000)
    }

    const vazio = listarVendas(banco, '2027-01')
    expect(vazio.ok).toBe(true)
    if (vazio.ok) {
      expect(vazio.dados.vendas).toEqual([])
      expect(vazio.dados.totalCentavos).toBe(0)
      expect(vazio.dados.totalTaxasCentavos).toBe(0)
      expect(vazio.dados.totalLiquidoCentavos).toBe(0)
    }
  })

  it('no mesmo dia ordena pelo id decrescente', () => {
    const primeira = criar({ data: '2026-11-10', descricao: 'Primeira' })
    const segunda = criar({ data: '2026-11-10', descricao: 'Segunda' })

    const resultado = listarVendas(banco, '2026-11')
    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      expect(resultado.dados.vendas.map((venda) => venda.id)).toEqual([segunda.id, primeira.id])
    }
  })

  it('mês inválido devolve erro', () => {
    const resultado = listarVendas(banco, '2026-13')
    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.erro).toBe('Mês inválido.')
  })
})

describe('listar canais', () => {
  it('inclui os canais já usados e os sugeridos, sem repetir', () => {
    criar({ canal: 'Feira' })
    criar({ canal: '  feira  ' })
    criar({ canal: 'Shopee' })
    criar({ canal: '' })

    const resultado = listarCanais(banco)
    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return

    expect(resultado.dados).toContain('Feira')
    expect(resultado.dados).toContain('Shopee')
    expect(resultado.dados).toEqual(
      expect.arrayContaining(['Shopee', 'Mercado Livre', 'Instagram', 'WhatsApp', 'Presencial'])
    )

    const emMinusculas = resultado.dados.map((canal) => canal.toLowerCase())
    expect(new Set(emMinusculas).size).toBe(resultado.dados.length)
    expect(emMinusculas.filter((canal) => canal === 'feira')).toHaveLength(1)
  })

  it('sem vendas devolve só os canais sugeridos', () => {
    const resultado = listarCanais(banco)
    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      expect(resultado.dados).toEqual([
        'Shopee',
        'Mercado Livre',
        'Instagram',
        'WhatsApp',
        'Presencial'
      ])
    }
  })
})
