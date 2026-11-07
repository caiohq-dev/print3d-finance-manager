import { describe, expect, it } from 'vitest'
import { centavosParaCampo, formatarBRL, paraCentavos } from './dinheiro'

// O `Intl` usa espaço não separável (U+00A0) entre `R$` e o número.
const ESPACO = ' ' // U+00A0 (espaço não separável)

describe('paraCentavos (aceita)', () => {
  const casos: Array<[string, number]> = [
    ['12', 1200],
    ['12,5', 1250],
    ['12,50', 1250],
    ['1.234,56', 123456],
    ['R$ 1.234,56', 123456],
    ['12.50', 1250],
    ['1.234', 123400], // ponto com 3 dígitos é milhar: 1234 reais
    ['1.234.567', 123456700],
    ['0', 0],
    ['0,00', 0],
    ['  99.999.999,99  ', 9999999999] // aparando espaços na pontas
  ]

  for (const [texto, centavos] of casos) {
    it(`converte "${texto}" em ${centavos} centavos`, () => {
      expect(paraCentavos(texto)).toEqual({ ok: true, valor: centavos })
    })
  }
})

describe('paraCentavos (rejeita)', () => {
  const casos: Array<[string, string]> = [
    ['', 'Informe um valor.'],
    ['   ', 'Informe um valor.'],
    ['abc', 'Use apenas números'],
    ['12 reais', 'Use apenas números'],
    ['-12', 'Informe um valor positivo'],
    ['1,234', 'Use no máximo 2 casas decimais'],
    ['1,234.56', 'Use no máximo 2 casas decimais'],
    ['1,2,3', 'Use no máximo 2 casas decimais'],
    ['1.2345', 'Use no máximo 2 casas decimais'],
    ['1.000.000.000', 'até R$ 999.999.999,99'],
    ['999.999.999,999', 'Use no máximo 2 casas decimais'],
    ['R$ 1.000.000.000,00', 'até R$ 999.999.999,99']
  ]

  for (const [texto, trechoDaMensagem] of casos) {
    it(`rejeita "${texto}"`, () => {
      const resultado = paraCentavos(texto)
      expect(resultado.ok).toBe(false)
      if (!resultado.ok) expect(resultado.erro).toContain(trechoDaMensagem)
    })
  }

  it('aceita o maior valor possível e recusa um centavo a mais', () => {
    expect(paraCentavos('999.999.999,99')).toEqual({ ok: true, valor: 99_999_999_999 })
    expect(paraCentavos('1.000.000.000,00').ok).toBe(false)
  })
})

describe('formatarBRL', () => {
  it('formata zero, positivos e negativos', () => {
    expect(formatarBRL(0)).toBe(`R$${ESPACO}0,00`)
    expect(formatarBRL(5)).toBe(`R$${ESPACO}0,05`)
    expect(formatarBRL(123456)).toBe(`R$${ESPACO}1.234,56`)
    expect(formatarBRL(-123456)).toBe(`-R$${ESPACO}1.234,56`)
  })

  it('formata valores grandes', () => {
    expect(formatarBRL(99_999_999_999)).toBe(`R$${ESPACO}999.999.999,99`)
    expect(formatarBRL(100000000)).toBe(`R$${ESPACO}1.000.000,00`)
  })
})

describe('centavosParaCampo', () => {
  it('gera o texto do campo de edição (sem R$ e sem milhar)', () => {
    expect(centavosParaCampo(123456)).toBe('1234,56')
    expect(centavosParaCampo(0)).toBe('0,00')
    expect(centavosParaCampo(5)).toBe('0,05')
    expect(centavosParaCampo(-123456)).toBe('-1234,56')
  })

  it('ida e volta: paraCentavos aceita o que centavosParaCampo gera', () => {
    for (const centavos of [1, 99, 100, 123456, 99_999_999_999]) {
      expect(paraCentavos(centavosParaCampo(centavos))).toEqual({ ok: true, valor: centavos })
    }
  })
})
