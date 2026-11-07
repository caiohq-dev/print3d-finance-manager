// Dinheiro é sempre inteiro em centavos. A conversão do texto digitado é feita
// por manipulação de string: nunca parseFloat (1.005 * 100 não dá 100,5).
// Código puro (sem Electron nem DOM), usado pelo main e pelo renderer.

/** Resultado da conversão de texto para centavos. `erro` é mensagem pronta para o usuário. */
export type ResultadoDinheiro = { ok: true; valor: number } | { ok: false; erro: string }

/** R$ 999.999.999,99 — limite máximo aceito. */
const LIMITE_CENTAVOS = 99_999_999_999

const ERRO_VAZIO = 'Informe um valor.'
const ERRO_POSITIVO = 'Informe um valor positivo.'
const ERRO_TEXTO = 'Use apenas números, com ponto de milhar e vírgula decimal (ex.: 1.234,56).'
const ERRO_CASAS = 'Use no máximo 2 casas decimais (ex.: 12,50).'
const ERRO_MILHAR = 'Use pontos só como separador de milhar (ex.: 1.234,56).'
const ERRO_LIMITE = 'Informe um valor de até R$ 999.999.999,99.'

/**
 * Converte texto digitado pelo usuário em centavos.
 * Aceita: `12`, `12,5`, `12,50`, `1.234,56`, `R$ 1.234,56`, `12.50`,
 * `1.234` (= 1234 reais; ponto com 3 dígitos é milhar) e `1.234.567`.
 * Rejeita vazio, texto, negativo, mais de 2 casas decimais e valores acima do limite.
 */
export function paraCentavos(texto: string): ResultadoDinheiro {
  const entrada = texto.trim().replace(/^R\$\s*/i, '')

  if (entrada === '') return { ok: false, erro: ERRO_VAZIO }
  if (entrada.includes('-')) return { ok: false, erro: ERRO_POSITIVO }
  if (!/^[0-9.,]+$/.test(entrada)) return { ok: false, erro: ERRO_TEXTO }

  const conversao = converter(entrada)
  if ('erro' in conversao) return { ok: false, erro: conversao.erro }
  if (conversao.centavos > LIMITE_CENTAVOS) return { ok: false, erro: ERRO_LIMITE }

  return { ok: true, valor: conversao.centavos }
}

type Conversao = { centavos: number } | { erro: string }

/** Faz a conversão já com o texto "limpo" (só dígitos, ponto e vírgula). */
function converter(entrada: string): Conversao {
  if (entrada.includes(',')) {
    // Com vírgula, ela é sempre o decimal e os pontos são milhar.
    const partes = entrada.split(',')
    if (partes.length !== 2) return { erro: ERRO_CASAS }
    const [inteiro, decimal] = partes
    if (inteiro === '') return { erro: ERRO_VAZIO }
    if (!/^\d{1,2}$/.test(decimal)) return { erro: ERRO_CASAS }
    const digitos = paraDigitos(inteiro)
    if (digitos === null) return { erro: ERRO_MILHAR }
    return { centavos: Number(digitos) * 100 + Number(decimal.padEnd(2, '0')) }
  }

  if (entrada.includes('.')) {
    const partes = entrada.split('.')
    const ultimo = partes[partes.length - 1]
    // Um ponto com 1 ou 2 dígitos depois é decimal (`12.50` = 12,50);
    // com 3 é milhar (`1.234` = 1234 reais).
    if (partes.length === 2 && /^\d{1,2}$/.test(ultimo)) {
      const [inteiro, decimal] = partes
      if (inteiro === '' || !/^\d+$/.test(inteiro)) return { erro: ERRO_MILHAR }
      return { centavos: Number(inteiro) * 100 + Number(decimal.padEnd(2, '0')) }
    }
    if (partes.length === 2 && !/^\d{3}$/.test(ultimo)) return { erro: ERRO_CASAS }
    const digitos = paraDigitos(entrada)
    if (digitos === null) return { erro: ERRO_MILHAR }
    return { centavos: Number(digitos) * 100 }
  }

  if (!/^\d+$/.test(entrada)) return { erro: ERRO_TEXTO }
  return { centavos: Number(entrada) * 100 }
}

/** `1.234.567` → `1234567`; texto fora do padrão de milhar → `null`. */
function paraDigitos(texto: string): string | null {
  if (/^\d+$/.test(texto)) return texto
  if (!/^\d{1,3}(\.\d{3})+$/.test(texto)) return null
  return texto.replace(/\./g, '')
}

/**
 * Formata centavos como moeda brasileira: `123456` → `R$ 1.234,56`
 * e `-123456` → `-R$ 1.234,56`. O `Intl` usa espaço não separável (U+00A0)
 * entre `R$` e o número — os testes consideram isso.
 */
export function formatarBRL(centavos: number): string {
  return formatadorBRL.format(centavos / 100)
}

/** Para preencher campos de edição: `123456` → `1234,56` (sem `R$` e sem milhar). */
export function centavosParaCampo(centavos: number): string {
  const sinal = centavos < 0 ? '-' : ''
  const absoluto = Math.abs(Math.trunc(centavos))
  const reais = Math.floor(absoluto / 100)
  const centavosRestantes = absoluto % 100
  return `${sinal}${reais},${String(centavosRestantes).padStart(2, '0')}`
}

const formatadorBRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
})
