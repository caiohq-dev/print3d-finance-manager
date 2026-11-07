// Validações reutilizáveis: usadas no renderer (resposta imediata) e no main
// (a validação que vale). Código puro, sem Electron nem DOM.
import { paraCentavos, type ResultadoDinheiro } from './dinheiro'
import { dataValida } from './datas'

/** Resultado simples de uma validação de campo. `erro` é mensagem pronta. */
export type Aviso = { ok: true } | { ok: false; erro: string }

/** Mensagens por campo do formulário (mesmo formato de `Resultado<T>.campos`). */
export type ErrosPorCampo = Record<string, string>

/** Obrigatório depois de aparar espaços: `nome`, `descricao` etc. */
export function obrigatorio(valor: string, rotulo: string): Aviso {
  if (valor.trim() === '') return { ok: false, erro: `Informe ${rotulo}.` }
  return { ok: true }
}

/** Valor monetário no formato aceito por `paraCentavos`. */
export function monetario(valor: string): Aviso {
  const conversao = paraCentavos(valor)
  return conversoParaAviso(conversao)
}

/**
 * Valor monetário maior que zero (despesas e vendas).
 * Devolve também os centavos convertidos, para o serviço não converter de novo.
 */
export function valorPositivo(
  valor: string
): { ok: true; valorCentavos: number } | { ok: false; erro: string } {
  const conversao = paraCentavos(valor)
  if (!conversao.ok) return { ok: false, erro: conversao.erro }
  if (conversao.valor <= 0) return { ok: false, erro: 'Informe um valor maior que zero.' }
  return { ok: true, valorCentavos: conversao.valor }
}

/** Data `AAAA-MM-DD` válida de verdade (rejeita `2026-02-30`). */
export function data(valor: string): Aviso {
  if (!dataValida(valor)) return { ok: false, erro: 'Informe uma data válida (ex.: 06/11/2026).' }
  return { ok: true }
}

/**
 * Junta os avisos de cada campo num mapa de erros.
 * Devolve `null` quando todos os campos estão válidos.
 */
export function errosPorCampo(
  campos: ReadonlyArray<readonly [string, Aviso]>
): ErrosPorCampo | null {
  const erros: ErrosPorCampo = {}
  for (const [nome, aviso] of campos) {
    if (!aviso.ok) erros[nome] = aviso.erro
  }
  return Object.keys(erros).length > 0 ? erros : null
}

function conversoParaAviso(conversao: ResultadoDinheiro): Aviso {
  return conversao.ok ? { ok: true } : { ok: false, erro: conversao.erro }
}
