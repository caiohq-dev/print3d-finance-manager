// Serviço de despesas: tem o SQL e a regra de negócio, e devolve sempre
// `Resultado<T>` com objetos em camelCase. Recebe a conexão como parâmetro
// para poder ser testado com banco `:memory:`.
import type { DatabaseSync } from 'node:sqlite'
import { intervaloDoMes } from '../../shared/datas'
import type { Despesa, EntradaDespesa, ListaDespesas, Resultado } from '../../shared/tipos'
import {
  data as validarData,
  obrigatorio,
  valorPositivo,
  type ErrosPorCampo
} from '../../shared/validacao'

const MENSAGEM_NAO_ENCONTRADA = 'Despesa não encontrada.'
const MENSAGEM_CARREGAR = 'Não foi possível carregar as despesas.'
const MENSAGEM_SALVAR = 'Não foi possível salvar a despesa.'
const MENSAGEM_EXCLUIR = 'Não foi possível excluir a despesa.'
const MENSAGEM_CAMPOS = 'Confira os campos destacados.'
const MENSAGEM_CATEGORIA = 'Categoria não encontrada.'
const MENSAGEM_MES = 'Mês inválido.'

/** Linha crua do banco (com os dados da categoria já juntos). */
type LinhaDespesa = {
  id: number
  data: string
  categoria_id: number
  categoria_nome: string
  conta_no_lucro: number
  descricao: string
  fornecedor: string | null
  valor_centavos: number
  observacao: string | null
  criado_em: string
  atualizado_em: string
}

const SQL_SELECT = `
  SELECT d.id, d.data, d.categoria_id, c.nome AS categoria_nome, c.conta_no_lucro,
         d.descricao, d.fornecedor, d.valor_centavos, d.observacao,
         d.criado_em, d.atualizado_em
  FROM despesas d
  JOIN categorias c ON c.id = d.categoria_id`

/** Despesas do mês (ordem: data decrescente e, no mesmo dia, id decrescente). */
export function listarDespesas(banco: DatabaseSync, mes: string): Resultado<ListaDespesas> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return { ok: false, erro: MENSAGEM_MES }

  try {
    const [inicio, fim] = intervaloDoMes(mes)
    const linhas = banco
      .prepare(`${SQL_SELECT} WHERE d.data >= ? AND d.data < ? ORDER BY d.data DESC, d.id DESC`)
      .all(inicio, fim) as unknown as LinhaDespesa[]

    const despesas = linhas.map(paraDespesa)
    const totalCentavos = despesas.reduce((soma, despesa) => soma + despesa.valorCentavos, 0)
    const totalInvestimentoCentavos = despesas.reduce(
      (soma, despesa) => soma + (despesa.contaNoLucro ? 0 : despesa.valorCentavos),
      0
    )

    return { ok: true, dados: { mes, despesas, totalCentavos, totalInvestimentoCentavos } }
  } catch {
    return { ok: false, erro: MENSAGEM_CARREGAR }
  }
}

/** Uma despesa pelo id. */
export function obterDespesa(banco: DatabaseSync, id: number): Resultado<Despesa> {
  try {
    const linha = banco.prepare(`${SQL_SELECT} WHERE d.id = ?`).get(id) as LinhaDespesa | undefined
    if (!linha) return { ok: false, erro: MENSAGEM_NAO_ENCONTRADA }
    return { ok: true, dados: paraDespesa(linha) }
  } catch {
    return { ok: false, erro: MENSAGEM_CARREGAR }
  }
}

/** Cria a despesa depois de validar data, categoria, descrição e valor. */
export function criarDespesa(banco: DatabaseSync, entrada: EntradaDespesa): Resultado<Despesa> {
  const validacao = validarEntrada(banco, entrada)
  if (!validacao.ok) return validacao

  try {
    const dados = validacao.dados
    const resultado = banco
      .prepare(
        `INSERT INTO despesas (data, categoria_id, descricao, fornecedor, valor_centavos, observacao)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        dados.data,
        dados.categoriaId,
        dados.descricao,
        dados.fornecedor,
        dados.valorCentavos,
        dados.observacao
      )
    return obterDespesa(banco, Number(resultado.lastInsertRowid))
  } catch {
    return { ok: false, erro: MENSAGEM_SALVAR }
  }
}

/** Edita a despesa e atualiza `atualizado_em`. */
export function atualizarDespesa(
  banco: DatabaseSync,
  entrada: EntradaDespesa & { id: number }
): Resultado<Despesa> {
  const validacao = validarEntrada(banco, entrada)
  if (!validacao.ok) return validacao

  try {
    const dados = validacao.dados
    const resultado = banco
      .prepare(
        `UPDATE despesas
         SET data = ?, categoria_id = ?, descricao = ?, fornecedor = ?,
             valor_centavos = ?, observacao = ?, atualizado_em = datetime('now','localtime')
         WHERE id = ?`
      )
      .run(
        dados.data,
        dados.categoriaId,
        dados.descricao,
        dados.fornecedor,
        dados.valorCentavos,
        dados.observacao,
        entrada.id
      )
    if (Number(resultado.changes) === 0) return { ok: false, erro: MENSAGEM_NAO_ENCONTRADA }
    return obterDespesa(banco, entrada.id)
  } catch {
    return { ok: false, erro: MENSAGEM_SALVAR }
  }
}

/** Exclui a despesa. Id inexistente devolve erro, não exceção. */
export function excluirDespesa(banco: DatabaseSync, id: number): Resultado<null> {
  try {
    const resultado = banco.prepare('DELETE FROM despesas WHERE id = ?').run(id)
    if (Number(resultado.changes) === 0) return { ok: false, erro: MENSAGEM_NAO_ENCONTRADA }
    return { ok: true, dados: null }
  } catch {
    return { ok: false, erro: MENSAGEM_EXCLUIR }
  }
}

type EntradaValidada = {
  data: string
  categoriaId: number
  descricao: string
  fornecedor: string | null
  valorCentavos: number
  observacao: string | null
}

type ResultadoValidacao =
  { ok: true; dados: EntradaValidada } | { ok: false; erro: string; campos: ErrosPorCampo }

function validarEntrada(banco: DatabaseSync, entrada: EntradaDespesa): ResultadoValidacao {
  const campos: ErrosPorCampo = {}

  const avisoData = validarData(entrada.data)
  if (!avisoData.ok) campos.data = avisoData.erro

  const avisoDescricao = obrigatorio(entrada.descricao, 'a descrição')
  if (!avisoDescricao.ok) campos.descricao = avisoDescricao.erro

  const avisoValor = valorPositivo(entrada.valor)
  if (!avisoValor.ok) campos.valor = avisoValor.erro

  if (!categoriaExiste(banco, entrada.categoriaId)) campos.categoriaId = MENSAGEM_CATEGORIA

  if (Object.keys(campos).length > 0) return { ok: false, erro: MENSAGEM_CAMPOS, campos }

  // As validações acima já garantiram o valor; o retorno mantém o tipo estreito.
  if (!avisoValor.ok)
    return { ok: false, erro: MENSAGEM_CAMPOS, campos: { valor: avisoValor.erro } }

  return {
    ok: true,
    dados: {
      data: entrada.data,
      categoriaId: entrada.categoriaId,
      descricao: entrada.descricao.trim(),
      fornecedor: textoOpcional(entrada.fornecedor),
      valorCentavos: avisoValor.valorCentavos,
      observacao: textoOpcional(entrada.observacao)
    }
  }
}

function categoriaExiste(banco: DatabaseSync, id: number): boolean {
  if (!Number.isInteger(id) || id <= 0) return false
  return banco.prepare('SELECT id FROM categorias WHERE id = ?').get(id) !== undefined
}

/** Textos opcionais vazios são gravados como `NULL`, nunca como string vazia. */
function textoOpcional(texto: string): string | null {
  const limpo = texto.trim()
  return limpo === '' ? null : limpo
}

function paraDespesa(linha: LinhaDespesa): Despesa {
  return {
    id: linha.id,
    data: linha.data,
    categoriaId: linha.categoria_id,
    categoriaNome: linha.categoria_nome,
    contaNoLucro: linha.conta_no_lucro === 1,
    descricao: linha.descricao,
    fornecedor: linha.fornecedor,
    valorCentavos: linha.valor_centavos,
    observacao: linha.observacao,
    criadoEm: linha.criado_em,
    atualizadoEm: linha.atualizado_em
  }
}
