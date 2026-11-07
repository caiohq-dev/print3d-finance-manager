// Serviço de categorias: tem o SQL e a regra de negócio, e devolve sempre
// `Resultado<T>` com objetos em camelCase. Recebe a conexão como parâmetro
// para poder ser testada com banco `:memory:`.
import type { DatabaseSync } from 'node:sqlite'
import type { Categoria, CategoriaResumo, EntradaCategoria, Resultado } from '../../shared/tipos'

const MENSAGEM_DUPLICADO = 'Já existe uma categoria com esse nome.'
const MENSAGEM_NAO_ENCONTRADA = 'Categoria não encontrada.'
const MENSAGEM_COM_DESPESAS =
  'Esta categoria já tem despesas registradas e não pode ser excluída. ' +
  'Desative-a para tirá-la das opções novas — o histórico continua guardado.'
const MENSAGEM_CARREGAR = 'Não foi possível carregar as categorias.'
const MENSAGEM_SALVAR = 'Não foi possível salvar a categoria.'

/** Linha crua do banco, já com a contagem de despesas. */
type LinhaCategoria = {
  id: number
  nome: string
  conta_no_lucro: number
  ativa: number
  quantidade_despesas: number
}

// Todas as leituras usam a mesma consulta (lista e edição têm a mesma forma).
const SQL_SELECT = `
  SELECT c.id, c.nome, c.conta_no_lucro, c.ativa,
         (SELECT COUNT(*) FROM despesas d WHERE d.categoria_id = c.id) AS quantidade_despesas
  FROM categorias c`

/** Lista todas as categorias (ativas e inativas) com a quantidade de despesas. */
export function listarCategorias(banco: DatabaseSync): Resultado<CategoriaResumo[]> {
  try {
    const linhas = banco
      .prepare(`${SQL_SELECT} ORDER BY c.ativa DESC, c.nome COLLATE NOCASE`)
      .all() as unknown as LinhaCategoria[]
    return { ok: true, dados: linhas.map(paraCategoriaResumo) }
  } catch {
    return { ok: false, erro: MENSAGEM_CARREGAR }
  }
}

/** Uma categoria pelo id, com a quantidade de despesas. */
export function obterCategoria(banco: DatabaseSync, id: number): Resultado<CategoriaResumo> {
  try {
    const linha = banco.prepare(`${SQL_SELECT} WHERE c.id = ?`).get(id) as
      LinhaCategoria | undefined
    if (!linha) return { ok: false, erro: MENSAGEM_NAO_ENCONTRADA }
    return { ok: true, dados: paraCategoriaResumo(linha) }
  } catch {
    return { ok: false, erro: MENSAGEM_CARREGAR }
  }
}

/** Cria a categoria. `nome` é aparado e comparado sem maiúsculas/minúsculas. */
export function criarCategoria(
  banco: DatabaseSync,
  entrada: EntradaCategoria
): Resultado<Categoria> {
  const validacao = validarNome(entrada)
  if (!validacao.ok) return validacao

  if (nomeJaUsado(banco, validacao.nome)) return duplicado()

  try {
    const resultado = banco
      .prepare('INSERT INTO categorias (nome, conta_no_lucro) VALUES (?, ?)')
      .run(validacao.nome, entrada.contaNoLucro ? 1 : 0)
    return obterPorId(banco, Number(resultado.lastInsertRowid))
  } catch (erro) {
    // Corrida rara: o UNIQUE da tabela pegou antes da nossa conferência.
    if (String(erro).includes('UNIQUE')) return duplicado()
    return { ok: false, erro: MENSAGEM_SALVAR }
  }
}

/** Edita nome e "conta no lucro" da categoria. */
export function atualizarCategoria(
  banco: DatabaseSync,
  entrada: EntradaCategoria & { id: number }
): Resultado<Categoria> {
  const validacao = validarNome(entrada)
  if (!validacao.ok) return validacao

  if (nomeJaUsado(banco, validacao.nome, entrada.id)) return duplicado()

  try {
    const resultado = banco
      .prepare('UPDATE categorias SET nome = ?, conta_no_lucro = ? WHERE id = ?')
      .run(validacao.nome, entrada.contaNoLucro ? 1 : 0, entrada.id)
    if (Number(resultado.changes) === 0) return { ok: false, erro: MENSAGEM_NAO_ENCONTRADA }
    return obterPorId(banco, entrada.id)
  } catch (erro) {
    if (String(erro).includes('UNIQUE')) return duplicado()
    return { ok: false, erro: MENSAGEM_SALVAR }
  }
}

/** Ativa ou desativa a categoria (a inativa fica fora dos formulários novos). */
export function definirAtiva(
  banco: DatabaseSync,
  id: number,
  ativa: boolean
): Resultado<Categoria> {
  try {
    const resultado = banco
      .prepare('UPDATE categorias SET ativa = ? WHERE id = ?')
      .run(ativa ? 1 : 0, id)
    if (Number(resultado.changes) === 0) return { ok: false, erro: MENSAGEM_NAO_ENCONTRADA }
    return obterPorId(banco, id)
  } catch {
    return { ok: false, erro: MENSAGEM_SALVAR }
  }
}

/** Exclui só se a categoria não tiver despesas; com despesas, recusa explicando. */
export function excluirCategoria(banco: DatabaseSync, id: number): Resultado<null> {
  try {
    const categoria = banco.prepare('SELECT id FROM categorias WHERE id = ?').get(id)
    if (!categoria) return { ok: false, erro: MENSAGEM_NAO_ENCONTRADA }

    const despesas = banco
      .prepare('SELECT COUNT(*) AS n FROM despesas WHERE categoria_id = ?')
      .get(id) as { n: number }
    if (Number(despesas.n) > 0) return { ok: false, erro: MENSAGEM_COM_DESPESAS }

    banco.prepare('DELETE FROM categorias WHERE id = ?').run(id)
    return { ok: true, dados: null }
  } catch {
    // Mesmo com a chave estrangeira, a mensagem amiga é a mesma.
    return { ok: false, erro: MENSAGEM_COM_DESPESAS }
  }
}

type EntradaValida =
  { ok: true; nome: string } | { ok: false; erro: string; campos: Record<string, string> }

function validarNome(entrada: EntradaCategoria): EntradaValida {
  const nome = entrada.nome.trim()
  if (nome === '') {
    const erro = 'Informe o nome da categoria.'
    return { ok: false, erro, campos: { nome: erro } }
  }
  return { ok: true, nome }
}

/** Nome único sem diferenciar maiúsculas/minúsculas e ignorando espaços nas pontas. */
function nomeJaUsado(banco: DatabaseSync, nome: string, excetoId?: number): boolean {
  const linha =
    excetoId === undefined
      ? banco.prepare('SELECT id FROM categorias WHERE TRIM(nome) COLLATE NOCASE = ?').get(nome)
      : banco
          .prepare('SELECT id FROM categorias WHERE TRIM(nome) COLLATE NOCASE = ? AND id <> ?')
          .get(nome, excetoId)
  return linha !== undefined
}

function duplicado(): { ok: false; erro: string; campos: Record<string, string> } {
  return { ok: false, erro: MENSAGEM_DUPLICADO, campos: { nome: MENSAGEM_DUPLICADO } }
}

function obterPorId(banco: DatabaseSync, id: number): Resultado<Categoria> {
  const resultado = obterCategoria(banco, id)
  if (!resultado.ok) return resultado
  const categoria = resultado.dados
  return {
    ok: true,
    dados: {
      id: categoria.id,
      nome: categoria.nome,
      contaNoLucro: categoria.contaNoLucro,
      ativa: categoria.ativa
    }
  }
}

function paraCategoriaResumo(linha: LinhaCategoria): CategoriaResumo {
  return {
    id: linha.id,
    nome: linha.nome,
    contaNoLucro: linha.conta_no_lucro === 1,
    ativa: linha.ativa === 1,
    quantidadeDespesas: linha.quantidade_despesas
  }
}
