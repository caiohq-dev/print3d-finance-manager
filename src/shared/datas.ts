// Datas como texto: `AAAA-MM-DD` e mês `AAAA-MM`. Nunca `new Date('2026-11-06')`
// (interpreta como UTC e no Brasil mostra o dia anterior). Código puro, sem DOM.
// Quando um `Date` é necessário, monte com `new Date(ano, mes - 1, dia)` (local).

const NOMES_DOS_MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro'
] as const

/** Hoje no fuso local, como `AAAA-MM-DD` (o dia local, nunca o dia seguinte em UTC). */
export function hoje(): string {
  const agora = new Date()
  return dataLocal(agora)
}

/** Mês atual no fuso local, como `AAAA-MM`. */
export function mesAtual(): string {
  return hoje().slice(0, 7)
}

/** `2026-11-06` → `06/11/2026`. Texto que não é data volta como está. */
export function dataBR(texto: string): string {
  const partes = texto.split('-')
  if (partes.length !== 3) return texto
  const [ano, mes, dia] = partes
  return `${dia}/${mes}/${ano}`
}

/** `2026-11` → `novembro de 2026`. Texto que não é mês volta como está. */
export function nomeDoMes(mes: string): string {
  const partes = mes.split('-')
  if (partes.length !== 2) return mes
  const [ano, textoMes] = partes
  const numero = Number(textoMes)
  if (!/^\d{4}$/.test(ano) || !/^\d{2}$/.test(textoMes) || numero < 1 || numero > 12) return mes
  return `${NOMES_DOS_MESES[numero - 1]} de ${ano}`
}

/** `2026-01` → `2025-12` (vira o ano). Texto inválido cai no mês atual. */
export function mesAnterior(mes: string): string {
  const [ano, textoMes] = quebrarMes(mes)
  if (textoMes === 1) return `${ano - 1}-12`
  return `${ano}-${String(textoMes - 1).padStart(2, '0')}`
}

/** `2026-12` → `2027-01` (vira o ano). Texto inválido cai no mês atual. */
export function mesProximo(mes: string): string {
  const [ano, textoMes] = quebrarMes(mes)
  if (textoMes === 12) return `${ano + 1}-01`
  return `${ano}-${String(textoMes + 1).padStart(2, '0')}`
}

/**
 * Intervalo do mês para consultas por índice: `[inicio, fimExclusivo)`.
 * Ex.: `2026-11` → `['2026-11-01', '2026-12-01']` (use `data >= ? AND data < ?`).
 */
export function intervaloDoMes(mes: string): [string, string] {
  return [`${mes}-01`, `${mesProximo(mes)}-01`]
}

/** Devolve o texto se for um mês válido (`AAAA-MM`); senão, o mês atual. */
export function mesValidoOuAtual(texto: string): string {
  return ehMesValido(texto) ? texto : mesAtual()
}

/** `true` se a data for válida de verdade (rejeita `2026-02-30`). */
export function dataValida(texto: string): boolean {
  const partes = texto.split('-')
  if (partes.length !== 3) return false
  const [ano, mes, dia] = partes
  if (!/^\d{4}$/.test(ano) || !/^\d{2}$/.test(mes) || !/^\d{2}$/.test(dia)) return false

  const numeroAno = Number(ano)
  const numeroMes = Number(mes)
  const numeroDia = Number(dia)
  if (numeroMes < 1 || numeroMes > 12 || numeroDia < 1) return false

  // `new Date(ano, mes - 1, dia)` estoura sozinha para dias inválidos
  // (2026-02-30 vira 2 de março); comparando de volta, a estourada aparece.
  const data = new Date(numeroAno, numeroMes - 1, numeroDia)
  return (
    data.getFullYear() === numeroAno &&
    data.getMonth() === numeroMes - 1 &&
    data.getDate() === numeroDia
  )
}

function ehMesValido(texto: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(texto)
}

/** Quebra o mês em `[ano, mes]`; entrada inválida vira o mês atual (nunca lança). */
function quebrarMes(mes: string): [number, number] {
  const texto = ehMesValido(mes) ? mes : mesAtual()
  const [ano, numeroMes] = texto.split('-')
  return [Number(ano), Number(numeroMes)]
}

function dataLocal(data: Date): string {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}
