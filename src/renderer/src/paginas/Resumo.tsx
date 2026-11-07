import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { nomeDoMes } from '../../../shared/datas'
import { formatarBRL } from '../../../shared/dinheiro'
import type {
  AppInfo,
  DespesaCategoriaResumo,
  MesResumo,
  ResumoMensal
} from '../../../shared/tipos'
import NavegacaoMes from '../componentes/NavegacaoMes'
import { useMesDaUrl } from '../componentes/useMesDaUrl'

/** Resultado do carregamento, preso ao mês pedido (mês novo = carregando de novo). */
type Carregamento = { mes: string; resumo: ResumoMensal } | { mes: string; erro: string }

/** Resumo do mês: indicadores, despesas por categoria, vendas por canal e 12 meses. */
export default function Resumo(): React.JSX.Element {
  const mes = useMesDaUrl()
  const [carregamento, setCarregamento] = useState<Carregamento | null>(null)
  const [info, setInfo] = useState<AppInfo | null>(null)

  const atual = carregamento?.mes === mes ? carregamento : null
  const carregando = atual === null
  const resumo = atual !== null && 'resumo' in atual ? atual.resumo : null
  const erro = atual !== null && 'erro' in atual ? atual.erro : null

  // Carga do mês: o setState acontece na resposta (callback), não no efeito.
  useEffect(() => {
    let vivo = true
    void window.api.resumo.obter(mes).then((resultado) => {
      if (!vivo) return
      setCarregamento(
        resultado.ok ? { mes, resumo: resultado.dados } : { mes, erro: resultado.erro }
      )
    })
    return () => {
      vivo = false
    }
  }, [mes])

  // Rodapé informativo (caminho do banco e versão), como na etapa 01.
  useEffect(() => {
    let vivo = true
    void window.api.app.info().then((resultado) => {
      if (vivo && resultado.ok) setInfo(resultado.dados)
    })
    return () => {
      vivo = false
    }
  }, [])

  return (
    <section>
      <div className="cabecalho-pagina">
        <h2>Resumo</h2>
        <Link className="botao" to={`/vendas/nova?mes=${mes}`}>
          Nova venda
        </Link>
      </div>

      <NavegacaoMes />

      {carregando ? (
        <p className="vazio">Carregando resumo…</p>
      ) : erro !== null ? (
        <p className="erro-geral" role="alert">
          {erro}
        </p>
      ) : resumo !== null ? (
        <ConteudoResumo resumo={resumo} />
      ) : null}

      <p className="info-minuscula">
        {info
          ? `Banco de dados: ${info.caminhoBanco} · Versão ${info.versao}`
          : 'Carregando informações…'}
      </p>
    </section>
  )
}

function ConteudoResumo({ resumo }: { resumo: ResumoMensal }): React.JSX.Element {
  const indicadores = resumo.indicadores
  const negativo = indicadores.lucroCentavos < 0

  return (
    <>
      <div className="cartoes">
        <Cartao
          rotulo="Faturamento bruto"
          valor={formatarBRL(indicadores.faturamentoBrutoCentavos)}
        />
        <Cartao rotulo="Taxas" valor={formatarBRL(indicadores.taxasCentavos)} />
        <Cartao rotulo="Receita líquida" valor={formatarBRL(indicadores.receitaLiquidaCentavos)} />
        <Cartao rotulo="Despesas do lucro" valor={formatarBRL(indicadores.despesasLucroCentavos)} />
        <Cartao
          rotulo="Lucro do mês"
          valor={formatarLucro(indicadores.lucroCentavos)}
          negativo={negativo}
          destaque
        />
        <Cartao rotulo="Margem" valor={formatarPercentual(indicadores.margem)} />
      </div>

      <div className="cartao-investimento">
        <span className="cartao-rotulo">Investimentos do mês</span>
        <strong className="cartao-valor">{formatarBRL(indicadores.investimentosCentavos)}</strong>
        <span className="cartao-nota">fora do cálculo do lucro</span>
      </div>

      <BlocoDespesas despesas={resumo.despesasPorCategoria} />
      <BlocoCanais canais={resumo.vendasPorCanal} />
      <BlocoUltimosMeses meses={resumo.ultimosMeses} />
    </>
  )
}

function Cartao(props: {
  rotulo: string
  valor: string
  negativo?: boolean
  destaque?: boolean
}): React.JSX.Element {
  const classes = ['cartao']
  if (props.destaque) classes.push('cartao-destaque')
  return (
    <div className={classes.join(' ')}>
      <span className="cartao-rotulo">{props.rotulo}</span>
      <strong className={`cartao-valor${props.negativo ? ' negativo' : ''}`}>{props.valor}</strong>
    </div>
  )
}

function BlocoDespesas({ despesas }: { despesas: DespesaCategoriaResumo[] }): React.JSX.Element {
  const total = despesas.reduce((soma, despesa) => soma + despesa.valorCentavos, 0)

  return (
    <section className="bloco-resumo">
      <h3>Despesas por categoria</h3>
      {despesas.length === 0 ? (
        <p className="vazio">Nenhuma despesa neste mês.</p>
      ) : (
        <table className="tabela">
          <thead>
            <tr>
              <th>Categoria</th>
              <th className="numero">Valor</th>
              <th className="numero">% do total</th>
            </tr>
          </thead>
          <tbody>
            {despesas.map((despesa) => (
              <tr key={despesa.categoriaId}>
                <td>{nomeComMarca(despesa.categoriaNome, despesa.contaNoLucro)}</td>
                <td className="numero">{formatarBRL(despesa.valorCentavos)}</td>
                <td className="numero">{formatarPercentual(despesa.percentualDoTotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Total de despesas</td>
              <td className="numero">{formatarBRL(total)}</td>
              <td className="numero">{formatarPercentual(total === 0 ? 0 : 100)}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </section>
  )
}

function BlocoCanais({
  canais
}: {
  canais: { canal: string; quantidade: number; faturamentoBrutoCentavos: number }[]
}): React.JSX.Element {
  const quantidade = canais.reduce((soma, canal) => soma + canal.quantidade, 0)
  const faturamento = canais.reduce((soma, canal) => soma + canal.faturamentoBrutoCentavos, 0)

  return (
    <section className="bloco-resumo">
      <h3>Vendas por canal</h3>
      {canais.length === 0 ? (
        <p className="vazio">Nenhuma venda neste mês.</p>
      ) : (
        <table className="tabela">
          <thead>
            <tr>
              <th>Canal</th>
              <th className="numero">Quantidade</th>
              <th className="numero">Faturamento bruto</th>
            </tr>
          </thead>
          <tbody>
            {canais.map((canal) => (
              <tr key={canal.canal}>
                <td>{canal.canal}</td>
                <td className="numero">{canal.quantidade}</td>
                <td className="numero">{formatarBRL(canal.faturamentoBrutoCentavos)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              <td className="numero">{quantidade}</td>
              <td className="numero">{formatarBRL(faturamento)}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </section>
  )
}

function BlocoUltimosMeses({ meses }: { meses: MesResumo[] }): React.JSX.Element {
  const faturamento = meses.reduce((soma, mes) => soma + mes.faturamentoBrutoCentavos, 0)
  const despesas = meses.reduce((soma, mes) => soma + mes.despesasLucroCentavos, 0)
  const lucro = meses.reduce((soma, mes) => soma + mes.lucroCentavos, 0)

  return (
    <section className="bloco-resumo">
      <h3>Últimos 12 meses</h3>
      <table className="tabela">
        <thead>
          <tr>
            <th>Mês</th>
            <th className="numero">Faturamento bruto</th>
            <th className="numero">Despesas do lucro</th>
            <th className="numero">Lucro</th>
          </tr>
        </thead>
        <tbody>
          {meses.map((mes) => (
            <tr key={mes.mes}>
              <td>
                <Link to={`/resumo?mes=${mes.mes}`}>{nomeDoMes(mes.mes)}</Link>
              </td>
              <td className="numero">{formatarBRL(mes.faturamentoBrutoCentavos)}</td>
              <td className="numero">{formatarBRL(mes.despesasLucroCentavos)}</td>
              <td className={`numero${mes.lucroCentavos < 0 ? ' negativo' : ''}`}>
                {formatarLucro(mes.lucroCentavos)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>Total dos 12 meses</td>
            <td className="numero">{formatarBRL(faturamento)}</td>
            <td className="numero">{formatarBRL(despesas)}</td>
            <td className={`numero${lucro < 0 ? ' negativo' : ''}`}>{formatarLucro(lucro)}</td>
          </tr>
        </tfoot>
      </table>
    </section>
  )
}

const formatadorPercentual = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

/** `73.3` → `73,3%`; `0` → `0%`. */
function formatarPercentual(valor: number): string {
  return `${formatadorPercentual.format(valor)}%`
}

/** Lucro negativo aparece com o sinal `−` (não só com a cor). */
function formatarLucro(centavos: number): string {
  if (centavos >= 0) return formatarBRL(centavos)
  return `−${formatarBRL(-centavos)}`
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
