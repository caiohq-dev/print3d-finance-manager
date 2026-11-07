// Serviço de vendas: tem o SQL e a regra de negócio, e devolve sempre
// `Resultado<T>` com objetos em camelCase. Recebe a conexão como parâmetro
// para poder ser testado com banco `:memory:`.
import type { DatabaseSync } from 'node:sqlite'
import { intervaloDoMes } from '../../shared/datas'
import type { EntradaVenda, ListaVendas, Resultado, Venda } from '../../shared/tipos'
import {
  data as validarData,
  obrigatorio,
  taxasOpcionais,
  valorPositivo,
  type ErrosPorCampo
} from '../../shared/validacao'

const MENSAGEM_NAO_ENCONTRADA = 'Venda não encontrada.'
const MENSAGEM_CARREGAR = 'Não foi possível carregar as vendas.'
const MENSAGEM_SALVAR = 'Não foi possível salvar a venda.'
const MENSAGEM_EXCLUIR = 'Não foi possível excluir a venda.'
const MENSAGEM_CAMPOS = 'Confira os campos destacados.'
const MENSAGEM_MES = 'Mês inválido.'
const MENSAGEM_CANAIS = 'Não foi possível carregar os canais.'

/** Canais sempre sugeridos, mesmo que ainda não tenham sido usados. */
const CANAIS_PADRAO = ['Shopee', 'Mercado Livre', 'Instagram', 'WhatsApp', 'Presencial']

/** Linha crua do banco. */
type LinhaVenda = {
  id: number
  data: string
  cliente: string | null
  descricao: string
  canal: string | null
  valor_centavos: number
  taxas_centavos: number
  observacao: string | null
  criado_em: string
  atualizado_em: string
}

const SQL_SELECT = `
  SELECT id, data, cliente, descricao, canal, valor_centavos, taxas_centavos,
         observacao, criado_em, atualizado_em
  FROM vendas`

/** Vendas do mês (ordem: data decrescente e, no mesmo dia, id decrescente). */
export function listarVendas(banco: DatabaseSync, mes: string): Resultado<ListaVendas> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return { ok: false, erro: MENSAGEM_MES }

  try {
    const [inicio, fim] = intervaloDoMes(mes)
    const linhas = banco
      .prepare(`${SQL_SELECT} WHERE data >= ? AND data < ? ORDER BY data DESC, id DESC`)
      .all(inicio, fim) as unknown as LinhaVenda[]

    const vendas = linhas.map(paraVenda)
    const totalCentavos = vendas.reduce((soma, venda) => soma + venda.valorCentavos, 0)
    const totalTaxasCentavos = vendas.reduce((soma, venda) => soma + venda.taxasCentavos, 0)

    return {
      ok: true,
      dados: {
        mes,
        vendas,
        totalCentavos,
        totalTaxasCentavos,
        totalLiquidoCentavos: totalCentavos - totalTaxasCentavos
      }
    }
  } catch {
    return { ok: false, erro: MENSAGEM_CARREGAR }
  }
}

/** Uma venda pelo id. */
export function obterVenda(banco: DatabaseSync, id: number): Resultado<Venda> {
  try {
    const linha = banco.prepare(`${SQL_SELECT} WHERE id = ?`).get(id) as LinhaVenda | undefined
    if (!linha) return { ok: false, erro: MENSAGEM_NAO_ENCONTRADA }
    return { ok: true, dados: paraVenda(linha) }
  } catch {
    return { ok: false, erro: MENSAGEM_CARREGAR }
  }
}

/** Cria a venda depois de validar data, descrição, valor e taxas. */
export function criarVenda(banco: DatabaseSync, entrada: EntradaVenda): Resultado<Venda> {
  const validacao = validarEntrada(entrada)
  if (!validacao.ok) return validacao

  try {
    const dados = validacao.dados
    const resultado = banco
      .prepare(
        `INSERT INTO vendas (data, cliente, descricao, canal, valor_centavos, taxas_centavos, observacao)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        dados.data,
        dados.cliente,
        dados.descricao,
        dados.canal,
        dados.valorCentavos,
        dados.taxasCentavos,
        dados.observacao
      )
    return obterVenda(banco, Number(resultado.lastInsertRowid))
  } catch {
    return { ok: false, erro: MENSAGEM_SALVAR }
  }
}

/** Edita a venda e atualiza `atualizado_em`. */
export function atualizarVenda(
  banco: DatabaseSync,
  entrada: EntradaVenda & { id: number }
): Resultado<Venda> {
  const validacao = validarEntrada(entrada)
  if (!validacao.ok) return validacao

  try {
    const dados = validacao.dados
    const resultado = banco
      .prepare(
        `UPDATE vendas
         SET data = ?, cliente = ?, descricao = ?, canal = ?, valor_centavos = ?,
             taxas_centavos = ?, observacao = ?, atualizado_em = datetime('now','localtime')
         WHERE id = ?`
      )
      .run(
        dados.data,
        dados.cliente,
        dados.descricao,
        dados.canal,
        dados.valorCentavos,
        dados.taxasCentavos,
        dados.observacao,
        entrada.id
      )
    if (Number(resultado.changes) === 0) return { ok: false, erro: MENSAGEM_NAO_ENCONTRADA }
    return obterVenda(banco, entrada.id)
  } catch {
    return { ok: false, erro: MENSAGEM_SALVAR }
  }
}

/** Exclui a venda. Id inexistente devolve erro, não exceção. */
export function excluirVenda(banco: DatabaseSync, id: number): Resultado<null> {
  try {
    const resultado = banco.prepare('DELETE FROM vendas WHERE id = ?').run(id)
    if (Number(resultado.changes) === 0) return { ok: false, erro: MENSAGEM_NAO_ENCONTRADA }
    return { ok: true, dados: null }
  } catch {
    return { ok: false, erro: MENSAGEM_EXCLUIR }
  }
}

/**
 * Canais para o campo de sugestões: primeiro os padrão, depois os já usados
 * que não são padrão (em ordem alfabética). Sem repetir, ignorando
 * maiúsculas/minúsculas e espaços nas pontas.
 */
export function listarCanais(banco: DatabaseSync): Resultado<string[]> {
  try {
    const linhas = banco
      .prepare(
        `SELECT DISTINCT canal FROM vendas
         WHERE canal IS NOT NULL AND TRIM(canal) <> ''
         ORDER BY canal COLLATE NOCASE`
      )
      .all() as unknown as { canal: string }[]

    const vistos = new Set<string>()
    const canais: string[] = []

    for (const canal of [...CANAIS_PADRAO, ...linhas.map((linha) => linha.canal)]) {
      const limpo = canal.trim()
      const chave = limpo.toLowerCase()
      if (limpo === '' || vistos.has(chave)) continue
      vistos.add(chave)
      canais.push(limpo)
    }

    return { ok: true, dados: canais }
  } catch {
    return { ok: false, erro: MENSAGEM_CANAIS }
  }
}

type EntradaValidada = {
  data: string
  cliente: string | null
  descricao: string
  canal: string | null
  valorCentavos: number
  taxasCentavos: number
  observacao: string | null
}

type ResultadoValidacao =
  { ok: true; dados: EntradaValidada } | { ok: false; erro: string; campos: ErrosPorCampo }

function validarEntrada(entrada: EntradaVenda): ResultadoValidacao {
  const campos: ErrosPorCampo = {}

  const avisoData = validarData(entrada.data)
  if (!avisoData.ok) campos.data = avisoData.erro

  const avisoDescricao = obrigatorio(entrada.descricao, 'a descrição')
  if (!avisoDescricao.ok) campos.descricao = avisoDescricao.erro

  const avisoValor = valorPositivo(entrada.valor)
  if (!avisoValor.ok) campos.valor = avisoValor.erro

  const avisoTaxas = taxasOpcionais(entrada.valor, entrada.taxas)
  if (!avisoTaxas.ok) campos.taxas = avisoTaxas.erro

  if (Object.keys(campos).length > 0) return { ok: false, erro: MENSAGEM_CAMPOS, campos }

  // As validações acima já garantiram os valores; o retorno mantém o tipo estreito.
  if (!avisoValor.ok || !avisoTaxas.ok) {
    return { ok: false, erro: MENSAGEM_CAMPOS, campos: {} }
  }

  return {
    ok: true,
    dados: {
      data: entrada.data,
      cliente: textoOpcional(entrada.cliente),
      descricao: entrada.descricao.trim(),
      canal: textoOpcional(entrada.canal),
      valorCentavos: avisoValor.valorCentavos,
      taxasCentavos: avisoTaxas.valorCentavos,
      observacao: textoOpcional(entrada.observacao)
    }
  }
}

/** Textos opcionais vazios são gravados como `NULL`, nunca como string vazia. */
function textoOpcional(texto: string): string | null {
  const limpo = texto.trim()
  return limpo === '' ? null : limpo
}

function paraVenda(linha: LinhaVenda): Venda {
  return {
    id: linha.id,
    data: linha.data,
    cliente: linha.cliente,
    descricao: linha.descricao,
    canal: linha.canal,
    valorCentavos: linha.valor_centavos,
    taxasCentavos: linha.taxas_centavos,
    liquidoCentavos: linha.valor_centavos - linha.taxas_centavos,
    observacao: linha.observacao,
    criadoEm: linha.criado_em,
    atualizadoEm: linha.atualizado_em
  }
}
