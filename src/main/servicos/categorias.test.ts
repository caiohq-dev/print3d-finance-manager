import { DatabaseSync } from 'node:sqlite'
import { beforeEach, describe, expect, it } from 'vitest'
import { migrar } from '../db/migrar'
import {
  atualizarCategoria,
  criarCategoria,
  definirAtiva,
  excluirCategoria,
  listarCategorias,
  obterCategoria
} from './categorias'

// Serviço de categorias testado com as migrations reais em `:memory:`.

let banco: DatabaseSync

beforeEach(() => {
  banco = new DatabaseSync(':memory:')
  banco.exec('PRAGMA foreign_keys = ON')
  migrar(banco)
})

function criar(nome: string, contaNoLucro = true): number {
  const resultado = criarCategoria(banco, { nome, contaNoLucro })
  if (!resultado.ok) throw new Error(`falhou criar "${nome}": ${resultado.erro}`)
  return resultado.dados.id
}

function inserirDespesa(categoriaId: number): void {
  banco
    .prepare(
      'INSERT INTO despesas (data, categoria_id, descricao, valor_centavos) VALUES (?, ?, ?, ?)'
    )
    .run('2026-11-06', categoriaId, 'Despesa de teste', 1000)
}

function nomes(): string[] {
  const resultado = listarCategorias(banco)
  if (!resultado.ok) throw new Error(resultado.erro)
  return resultado.dados.map((categoria) => categoria.nome)
}

describe('criar categoria', () => {
  it('cria ativa, com a contagem de despesas zerada, aparando o nome', () => {
    const resultado = criarCategoria(banco, { nome: '  Luz de estúdio  ', contaNoLucro: false })

    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return
    expect(resultado.dados).toEqual({
      id: expect.any(Number),
      nome: 'Luz de estúdio',
      contaNoLucro: false,
      ativa: true
    })

    const obtida = obterCategoria(banco, resultado.dados.id)
    expect(obtida.ok).toBe(true)
    if (obtida.ok) expect(obtida.dados.quantidadeDespesas).toBe(0)
  })

  it('recusa nome vazio com erro no campo', () => {
    const resultado = criarCategoria(banco, { nome: '   ', contaNoLucro: true })

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) {
      expect(resultado.campos?.nome).toBe('Informe o nome da categoria.')
    }
  })

  it('recusa nome duplicado sem diferenciar maiúsculas nem espaços nas pontas', () => {
    // "Energia" já vem no seed.
    for (const variacao of ['energia', '  ENERGIA  ', 'Energia ']) {
      const resultado = criarCategoria(banco, { nome: variacao, contaNoLucro: true })
      expect(resultado.ok, variacao).toBe(false)
      if (!resultado.ok) {
        expect(resultado.erro).toContain('Já existe uma categoria')
        expect(resultado.campos?.nome).toContain('Já existe uma categoria')
      }
    }

    // E a lista não cresceu.
    expect(nomes().filter((nome) => nome.toLowerCase() === 'energia')).toHaveLength(1)
  })
})

describe('editar categoria', () => {
  it('edita nome e "conta no lucro"', () => {
    const id = criar('Papel de teste')
    const resultado = atualizarCategoria(banco, {
      id,
      nome: '  Papelão  ',
      contaNoLucro: false
    })

    expect(resultado.ok).toBe(true)
    const obtida = obterCategoria(banco, id)
    expect(obtida.ok).toBe(true)
    if (obtida.ok) {
      expect(obtida.dados.nome).toBe('Papelão')
      expect(obtida.dados.contaNoLucro).toBe(false)
      expect(obtida.dados.ativa).toBe(true)
    }
  })

  it('não deixa adotar o nome de outra categoria', () => {
    const id = criar('Papel de teste')
    const resultado = atualizarCategoria(banco, {
      id,
      nome: '  embalagem ', // já existe no seed
      contaNoLucro: true
    })

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.campos?.nome).toContain('Já existe uma categoria')

    // O nome original continua.
    const obtida = obterCategoria(banco, id)
    if (obtida.ok) expect(obtida.dados.nome).toBe('Papel de teste')
  })

  it('editando a própria categoria mantém o nome dela', () => {
    const id = criar('Fita')
    const resultado = atualizarCategoria(banco, { id, nome: '  fita ', contaNoLucro: true })
    expect(resultado.ok).toBe(true)
  })

  it('recusa id inexistente', () => {
    const resultado = atualizarCategoria(banco, {
      id: 999999,
      nome: 'Qualquer',
      contaNoLucro: true
    })
    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.erro).toBe('Categoria não encontrada.')
  })
})

describe('desativar e reativar', () => {
  it('alterna a situação', () => {
    const id = criar('Descrição temporária')

    const desativada = definirAtiva(banco, id, false)
    expect(desativada.ok).toBe(true)
    if (desativada.ok) expect(desativada.dados.ativa).toBe(false)

    const obtida = obterCategoria(banco, id)
    if (obtida.ok) expect(obtida.dados.ativa).toBe(false)

    const reativada = definirAtiva(banco, id, true)
    if (reativada.ok) expect(reativada.dados.ativa).toBe(true)
  })

  it('recusa id inexistente', () => {
    const resultado = definirAtiva(banco, 999999, false)
    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.erro).toBe('Categoria não encontrada.')
  })
})

describe('excluir categoria', () => {
  it('exclui a categoria que não tem despesas', () => {
    const id = criar('Para excluir')

    const resultado = excluirCategoria(banco, id)
    expect(resultado).toEqual({ ok: true, dados: null })

    expect(obterCategoria(banco, id).ok).toBe(false)
    expect(nomes()).not.toContain('Para excluir')
  })

  it('recusa excluir categoria com despesas explicando que deve desativar', () => {
    const id = criar('Com despesa')
    inserirDespesa(id)

    const resultado = excluirCategoria(banco, id)
    expect(resultado.ok).toBe(false)
    if (!resultado.ok) {
      expect(resultado.erro).toContain('Desative-a')
      expect(resultado.erro).toContain('despesas')
    }

    // Continua existindo e ativa.
    const obtida = obterCategoria(banco, id)
    expect(obtida.ok).toBe(true)
    if (obtida.ok) expect(obtida.dados.ativa).toBe(true)

    // Mesmo desativada, não pode ser excluída.
    definirAtiva(banco, id, false)
    expect(excluirCategoria(banco, id).ok).toBe(false)
  })

  it('recusa id inexistente', () => {
    const resultado = excluirCategoria(banco, 999999)
    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.erro).toBe('Categoria não encontrada.')
  })
})

describe('listar categorias', () => {
  it('mostra situação, conta no lucro e quantidade de despesas', () => {
    const energiaId = Number(
      banco.prepare("SELECT id FROM categorias WHERE nome = 'Energia'").get()?.['id']
    )
    inserirDespesa(energiaId)
    inserirDespesa(energiaId)

    const idInativa = criar('Sem uso')
    definirAtiva(banco, idInativa, false)

    const resultado = listarCategorias(banco)
    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return

    const energias = resultado.dados.filter((categoria) => categoria.nome === 'Energia')
    expect(energias[0]).toMatchObject({
      contaNoLucro: true,
      ativa: true,
      quantidadeDespesas: 2
    })

    // A consulta funciona mesmo sem despesas cadastradas.
    const semDespesas = resultado.dados.find((categoria) => categoria.nome === 'Sem uso')
    expect(semDespesas).toMatchObject({ ativa: false, quantidadeDespesas: 0 })

    // Inativas no fim da lista.
    expect(resultado.dados[resultado.dados.length - 1].nome).toBe('Sem uso')
  })

  it('excluir recusa a conta quando a chave estrangeira está ligada', () => {
    // Garantia extra: mesmo se alguém tentar DELETE direto, o RESTRICT segura.
    const id = criar('Protegida')
    inserirDespesa(id)
    expect(() => banco.prepare('DELETE FROM categorias WHERE id = ?').run(id)).toThrow()
  })
})
