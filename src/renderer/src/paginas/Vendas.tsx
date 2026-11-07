import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { dataBR } from '../../../shared/datas'
import { formatarBRL } from '../../../shared/dinheiro'
import type { ListaVendas, Venda } from '../../../shared/tipos'
import NavegacaoMes from '../componentes/NavegacaoMes'
import { useMesDaUrl } from '../componentes/useMesDaUrl'
import { useConfirmar } from '../componentes/useConfirmar'

/** Resultado do carregamento, preso ao mês pedido (mês novo = carregando de novo). */
type Carregamento = { mes: string; lista: ListaVendas } | { mes: string; erro: string }

/** Lista de vendas do mês, com faturamento bruto, taxas e receita líquida. */
export default function Vendas(): React.JSX.Element {
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
    void window.api.vendas.listar(mes).then((resultado) => {
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
    const resultado = await window.api.vendas.listar(mes)
    setCarregamento(resultado.ok ? { mes, lista: resultado.dados } : { mes, erro: resultado.erro })
  }

  async function excluir(venda: Venda): Promise<void> {
    setErroAcao(null)
    const resultado = await window.api.vendas.excluir(venda.id)
    if (!resultado.ok) {
      setErroAcao(resultado.erro)
      return
    }
    setMensagemExclusao('Venda excluída.')
    await carregar()
    // A linha sumiu e o botão também: o foco cairia no corpo da página.
    if (document.activeElement === document.body) botaoNova.current?.focus()
  }

  function pedirExclusao(venda: Venda): void {
    confirmar({
      titulo: 'Excluir venda',
      mensagem:
        `Excluir a venda "${venda.descricao}" de ${dataBR(venda.data)}? ` +
        'Esta ação não pode ser desfeita.',
      rotuloConfirmar: 'Excluir',
      aoConfirmar: () => excluir(venda)
    })
  }

  return (
    <section>
      <div className="cabecalho-pagina">
        <h2>Vendas</h2>
        <Link className="botao" to={`/vendas/nova?mes=${mes}`} ref={botaoNova}>
          Nova venda
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
        <p className="vazio">Carregando vendas…</p>
      ) : lista === null ? null : lista.vendas.length === 0 ? (
        <div className="vazio">
          <p>Nenhuma venda neste mês.</p>
          <Link className="botao" to={`/vendas/nova?mes=${mes}`}>
            Adicionar venda
          </Link>
        </div>
      ) : (
        <table className="tabela">
          <thead>
            <tr>
              <th>Data</th>
              <th>Cliente</th>
              <th>Descrição</th>
              <th>Canal</th>
              <th className="numero">Valor</th>
              <th className="numero">Taxas</th>
              <th className="numero">Líquido</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.vendas.map((venda) => (
              <tr key={venda.id}>
                <td>{dataBR(venda.data)}</td>
                <td>{venda.cliente ?? '—'}</td>
                <td>{venda.descricao}</td>
                <td>{venda.canal ?? '—'}</td>
                <td className="numero">{formatarBRL(venda.valorCentavos)}</td>
                <td className="numero">{formatarBRL(venda.taxasCentavos)}</td>
                <td className="numero">{formatarBRL(venda.liquidoCentavos)}</td>
                <td className="acoes">
                  <Link to={`/vendas/${venda.id}/editar?mes=${mes}`}>Editar</Link>
                  <button
                    type="button"
                    className="botao-perigo"
                    onClick={() => pedirExclusao(venda)}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>Faturamento bruto</td>
              <td className="numero" colSpan={3}>
                {formatarBRL(lista.totalCentavos)}
              </td>
              <td />
            </tr>
            <tr>
              <td colSpan={4}>Taxas</td>
              <td className="numero" colSpan={3}>
                {formatarBRL(lista.totalTaxasCentavos)}
              </td>
              <td />
            </tr>
            <tr>
              <td colSpan={4}>Receita líquida</td>
              <td className="numero" colSpan={3}>
                {formatarBRL(lista.totalLiquidoCentavos)}
              </td>
              <td />
            </tr>
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
