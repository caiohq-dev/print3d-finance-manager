import { describe, expect, it } from 'vitest'
import { data, errosPorCampo, monetario, obrigatorio } from './validacao'

describe('obrigatorio', () => {
  it('exige texto depois de aparar', () => {
    expect(obrigatorio('', 'o nome da categoria')).toEqual({
      ok: false,
      erro: 'Informe o nome da categoria.'
    })
    expect(obrigatorio('   ', 'o nome da categoria').ok).toBe(false)
  })

  it('aceita texto com conteúdo', () => {
    expect(obrigatorio('  Energia ', 'o nome da categoria')).toEqual({ ok: true })
  })
})

describe('monetario', () => {
  it('aceita o formato do paraCentavos', () => {
    expect(monetario('1.234,56')).toEqual({ ok: true })
    expect(monetario('12,5')).toEqual({ ok: true })
  })

  it('devolve a mensagem de erro do paraCentavos', () => {
    const aviso = monetario('abc')
    expect(aviso.ok).toBe(false)
    if (!aviso.ok) expect(aviso.erro).toContain('apenas números')
  })
})

describe('data', () => {
  it('aceita uma data real', () => {
    expect(data('2026-11-06')).toEqual({ ok: true })
  })

  it('rejeita data inexistente com mensagem amigável', () => {
    expect(data('2026-02-30')).toEqual({
      ok: false,
      erro: 'Informe uma data válida (ex.: 06/11/2026).'
    })
  })
})

describe('errosPorCampo', () => {
  it('devolve null quando todos os campos estão válidos', () => {
    expect(errosPorCampo([['nome', obrigatorio('Energia', 'o nome')]])).toBeNull()
  })

  it('devolve o mapa de mensagens por campo', () => {
    expect(
      errosPorCampo([
        ['nome', obrigatorio('  ', 'o nome')],
        ['valor', monetario('abc')],
        ['data', data('2026-02-30')]
      ])
    ).toEqual({
      nome: 'Informe o nome.',
      valor: 'Use apenas números, com ponto de milhar e vírgula decimal (ex.: 1.234,56).',
      data: 'Informe uma data válida (ex.: 06/11/2026).'
    })
  })
})
