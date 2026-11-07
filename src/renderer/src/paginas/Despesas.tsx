import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { dataBR } from '../../../shared/datas'
import { formatarBRL } from '../../../shared/dinheiro'
import type { Despesa, ListaDespesas } from '../../../shared/tipos'
import NavegacaoMes from '../componentes/NavegacaoMes'
import { useMesDaUrl } from '../componentes/useMesDaUrl'
import { useConfirmar } from '../componentes/useConfirmar'

/** Resultado do carregamento, preso ao mês pedido (mês novo = carregando de novo). */
type Carregamento = { mes: string; lista: ListaDespesas } | { mes: string; erro: string }

/** Lista de despesas do mês, com total e total de investimento. */
export default function Despesas(): React.JSX.Element {
  const mes = useMesDaUrl()
  const localizacao = useLocation()
  const [carregamento, setCarregamento] = useState<Carregamento | null>(null)
  const [erroAcao, setErroAcao] = useState<string | null>(null)
  const [mensagemExclusao, setMensagemExclusao] = useState<string | null>(null)
  const { confirmar, modal } = useConfirmar()
  const botaoNova = useRef<HTMLAnchorElement>(null)

  const atual = carregamento?.mes === mes ? carregamento : null
  const carregando = atual === null
  const lista = atual !== null && 'lista' in atual ? atual.lista : null
  const erroCarregar = atual !== null && 'erro' in atual ? atual.erro : null
  const mensagem = mensagemExclusao ?? mensagemDeSucesso(localizacao.state)

  // Carga do mês: o setState acontece na resposta (callback), não no efeito.
  useEffect(() => {
    let vivo = true
    void window.api.despesas.listar(mes).then((resultado) => {
      if (!vivo) return
      if (resultado.ok) {
        // Mensagens de ações do mês anterior não valem mais.
        setErroAcao(null)
        setMensagemExclusao(null)
      }
      setCarregamento(
        resultado.ok ? { mes, lista: resultado.dados } : { mes, erro: resultado.erro }
      )
    })
    return () => {
      vivo = false
    }
  }, [mes])

  async function carregar(): Promise<void> {
    const resultado = await window.api.despesas.listar(mes)
    setCarregamento(resultado.ok ? { mes, lista: resultado.dados } : { mes, erro: resultado.erro })
  }

  async function excluir(despesa: Despesa): Promise<void> {
    setErroAcao(null)
    const resultado = await window.api.despesas.excluir(despesa.id)
    if (!resultado.ok) {
      setErroAcao(resultado.erro)
      return
    }
    setMensagemExclusao('Despesa excluída.')
    await carregar()
    // A linha sumiu e o botão também: o foco cairia no corpo da página.
    if (document.activeElement === document.body) botaoNova.current?.focus()
  }

  function pedirExclusao(despesa: Despesa): void {
    confirmar({
      titulo: 'Excluir despesa',
      mensagem:
        `Excluir a despesa "${despesa.descricao}" de ${dataBR(despesa.data)}? ` +
        'Esta ação não pode ser desfeita.',
      rotuloConfirmar: 'Excluir',
      aoConfirmar: () => excluir(despesa)
    })
  }

  return (
    <section>
      <div className="cabecalho-pagina">
        <h2>Despesas</h2>
        <Link className="botao" to={`/despesas/nova?mes=${mes}`} ref={botaoNova}>
          Nova despesa
        </Link>
      </div>

      <NavegacaoMes />

      {mensagem && (
        <p className="sucesso" role="status">
          {mensagem}
        </p>
      )}

      {(erroAcao ?? erroCarregar) && (
        <p className="erro-geral" role="alert">
          {erroAcao ?? erroCarregar}
        </p>
      )}

      {carregando ? (
        <p className="vazio">Carregando despesas…</p>
      ) : lista === null ? null : lista.despesas.length === 0 ? (
        <div className="vazio">
          <p>Nenhuma despesa neste mês.</p>
          <Link className="botao" to={`/despesas/nova?mes=${mes}`}>
            Adicionar despesa
          </Link>
        </div>
      ) : (
        <table className="tabela">
          <thead>
            <tr>
              <th>Data</th>
              <th>Categoria</th>
              <th>Descrição</th>
              <th>Fornecedor</th>
              <th className="numero">Valor</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.despesas.map((despesa) => (
              <tr key={despesa.id}>
                <td>{dataBR(despesa.data)}</td>
                <td>{nomeComMarca(despesa.categoriaNome, despesa.contaNoLucro)}</td>
                <td>{despesa.descricao}</td>
                <td>{despesa.fornecedor ?? '—'}</td>
                <td className="numero">{formatarBRL(despesa.valorCentavos)}</td>
                <td className="acoes">
                  <Link to={`/despesas/${despesa.id}/editar?mes=${mes}`}>Editar</Link>
                  <button
                    type="button"
                    className="botao-perigo"
                    onClick={() => pedirExclusao(despesa)}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>Total do mês</td>
              <td className="numero">{formatarBRL(lista.totalCentavos)}</td>
              <td />
            </tr>
            {lista.totalInvestimentoCentavos > 0 && (
              <tr>
                <td colSpan={4}>Desse total, investimento (fora do lucro)</td>
                <td className="numero">{formatarBRL(lista.totalInvestimentoCentavos)}</td>
                <td />
              </tr>
            )}
          </tfoot>
        </table>
      )}

      {modal}
    </section>
  )
}

/** Mensagem de sucesso enviada pela navegação (ex.: depois de salvar). */
function mensagemDeSucesso(estado: unknown): string | null {
  if (typeof estado !== 'object' || estado === null) return null
  const sucesso = (estado as { sucesso?: unknown }).sucesso
  return typeof sucesso === 'string' ? sucesso : null
}

/**
 * Nome da categoria com a marca de investimento (fora do lucro).
 * Se o nome já termina em "(investimento)", não repete.
 */
function nomeComMarca(nome: string, contaNoLucro: boolean): string {
  if (contaNoLucro) return nome
  if (/\(investimento\)\s*$/i.test(nome)) return nome
  return `${nome} (investimento)`
}
