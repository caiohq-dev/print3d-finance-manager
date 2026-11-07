import { useState, type ReactNode } from 'react'
import ConfirmarModal from './ConfirmarModal'

export type PedidoConfirmacao = {
  titulo: string
  mensagem: string
  rotuloConfirmar?: string
  /** Pode ser assíncrona: o modal fecha na hora e a ação roda em seguida. */
  aoConfirmar: () => void | Promise<void>
}

/**
 * Uso simples nas telas:
 *
 * ```tsx
 * const { confirmar, modal } = useConfirmar()
 * confirmar({ titulo: 'Excluir', mensagem: '...', aoConfirmar: excluir })
 * return <section>...{modal}</section>
 * ```
 */
export function useConfirmar(): {
  confirmar: (pedido: PedidoConfirmacao) => void
  modal: ReactNode
} {
  const [pedido, setPedido] = useState<PedidoConfirmacao | null>(null)

  const confirmar = (novo: PedidoConfirmacao): void => setPedido(novo)
  const cancelar = (): void => setPedido(null)
  const confirmarAgora = (): void => {
    const atual = pedido
    setPedido(null)
    void atual?.aoConfirmar()
  }

  const modal = pedido ? (
    <ConfirmarModal
      titulo={pedido.titulo}
      mensagem={pedido.mensagem}
      rotuloConfirmar={pedido.rotuloConfirmar}
      aoConfirmar={confirmarAgora}
      aoCancelar={cancelar}
    />
  ) : null

  return { confirmar, modal }
}
