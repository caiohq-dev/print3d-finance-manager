import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  dataBR,
  dataValida,
  hoje,
  intervaloDoMes,
  mesAnterior,
  mesAtual,
  mesProximo,
  mesValidoOuAtual,
  nomeDoMes
} from './datas'

afterEach(() => {
  vi.useRealTimers()
})

describe('hoje e mesAtual', () => {
  it('devolve o dia local às 23h30 (não o dia seguinte em UTC)', () => {
    vi.useFakeTimers()
    // 6 de novembro de 2026, 23h30 hora local (São Paulo = UTC-3).
    vi.setSystemTime(new Date(2026, 10, 6, 23, 30))

    expect(hoje()).toBe('2026-11-06')
    expect(mesAtual()).toBe('2026-11')
  })

  it('funciona na virada do mês', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 11, 31, 12, 0))

    expect(hoje()).toBe('2026-12-31')
    expect(mesAtual()).toBe('2026-12')
  })
})

describe('dataBR', () => {
  it('formata AAAA-MM-DD como dd/mm/aaaa', () => {
    expect(dataBR('2026-11-06')).toBe('06/11/2026')
    expect(dataBR('2026-01-05')).toBe('05/01/2026')
    expect(dataBR('2027-12-31')).toBe('31/12/2027')
  })

  it('texto que não é data volta como está', () => {
    expect(dataBR('hoje')).toBe('hoje')
  })
})

describe('nomeDoMes', () => {
  it('escreve o mês em português com o ano', () => {
    expect(nomeDoMes('2026-11')).toBe('novembro de 2026')
    expect(nomeDoMes('2026-01')).toBe('janeiro de 2026')
    expect(nomeDoMes('2026-12')).toBe('dezembro de 2026')
    expect(nomeDoMes('2027-03')).toBe('março de 2027')
  })

  it('texto inválido volta como está', () => {
    expect(nomeDoMes('2026-13')).toBe('2026-13')
    expect(nomeDoMes('lixo')).toBe('lixo')
  })
})

describe('mesAnterior e mesProximo', () => {
  it('andam um mês', () => {
    expect(mesAnterior('2026-11')).toBe('2026-10')
    expect(mesProximo('2026-11')).toBe('2026-12')
  })

  it('viram o ano', () => {
    expect(mesAnterior('2026-01')).toBe('2025-12')
    expect(mesProximo('2026-12')).toBe('2027-01')
  })

  it('ida e volta se anulam', () => {
    expect(mesProximo(mesAnterior('2026-06'))).toBe('2026-06')
    expect(mesAnterior(mesProximo('2026-06'))).toBe('2026-06')
  })
})

describe('intervaloDoMes', () => {
  it('devolve [inicio, fimExclusivo)', () => {
    expect(intervaloDoMes('2026-11')).toEqual(['2026-11-01', '2026-12-01'])
    expect(intervaloDoMes('2026-12')).toEqual(['2026-12-01', '2027-01-01'])
    expect(intervaloDoMes('2026-01')).toEqual(['2026-01-01', '2026-02-01'])
  })
})

describe('mesValidoOuAtual', () => {
  it('mantém meses válidos', () => {
    expect(mesValidoOuAtual('2026-11')).toBe('2026-11')
    expect(mesValidoOuAtual('2026-01')).toBe('2026-01')
    expect(mesValidoOuAtual('2026-12')).toBe('2026-12')
  })

  it('substitui o inválido pelo mês atual', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 6, 23, 30))

    expect(mesValidoOuAtual('2026-13')).toBe('2026-11')
    expect(mesValidoOuAtual('2026-00')).toBe('2026-11')
    expect(mesValidoOuAtual('2026-11-06')).toBe('2026-11')
    expect(mesValidoOuAtual('')).toBe('2026-11')
  })
})

describe('dataValida', () => {
  it('aceita datas reais', () => {
    expect(dataValida('2026-11-06')).toBe(true)
    expect(dataValida('2024-02-29')).toBe(true) // ano bissexto
    expect(dataValida('2026-12-31')).toBe(true)
    expect(dataValida('2026-01-01')).toBe(true)
  })

  it('rejeita datas que não existem', () => {
    expect(dataValida('2026-02-30')).toBe(false)
    expect(dataValida('2026-02-29')).toBe(false)
    expect(dataValida('2026-11-31')).toBe(false)
    expect(dataValida('2026-13-01')).toBe(false)
    expect(dataValida('2026-00-10')).toBe(false)
  })

  it('rejeita texto fora do formato', () => {
    expect(dataValida('')).toBe(false)
    expect(dataValida('2026-1-6')).toBe(false)
    expect(dataValida('06/11/2026')).toBe(false)
    expect(dataValida('2026-11-06T00:00:00')).toBe(false)
  })
})
