import { useSearchParams } from 'react-router'
import { mesValidoOuAtual } from '../../../shared/datas'

/** Mês da tela, vindo de `?mes=AAAA-MM`; inválido ou ausente cai no mês atual. */
export function useMesDaUrl(): string {
  const [parametros] = useSearchParams()
  return mesValidoOuAtual(parametros.get('mes') ?? '')
}
