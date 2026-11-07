import { Link, useLocation, useSearchParams } from 'react-router'
import { mesAnterior, mesAtual, mesProximo, nomeDoMes } from '../../../shared/datas'
import { useMesDaUrl } from './useMesDaUrl'

/**
 * Navegação entre meses pela URL (`?mes=AAAA-MM`), reutilizada em despesas,
 * vendas e resumo. Mantém os demais parâmetros da tela.
 */
export default function NavegacaoMes(): React.JSX.Element {
  const mes = useMesDaUrl()
  const [parametros] = useSearchParams()
  const { pathname } = useLocation()

  const anterior = mesAnterior(mes)
  const proximo = mesProximo(mes)
  const atual = mesAtual()

  function linkPara(novoMes: string): string {
    const novos = new URLSearchParams(parametros)
    novos.set('mes', novoMes)
    return `${pathname}?${novos.toString()}`
  }

  return (
    <div className="navegacao-mes">
      <Link className="botao-suave" to={linkPara(anterior)}>
        ← {nomeDoMes(anterior)}
      </Link>
      <strong className="mes-titulo">{nomeDoMes(mes)}</strong>
      <Link className="botao-suave" to={linkPara(proximo)}>
        {nomeDoMes(proximo)} →
      </Link>
      <Link className="mes-atual-link" to={linkPara(atual)}>
        Mês atual
      </Link>
    </div>
  )
}
