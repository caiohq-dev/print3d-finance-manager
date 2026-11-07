import { useEffect, useRef } from 'react'

export type ConfirmarModalProps = {
  titulo: string
  mensagem: string
  /** Rótulo do botão destrutivo (padrão: "Confirmar"). */
  rotuloConfirmar?: string
  aoConfirmar: () => void
  aoCancelar: () => void
}

/**
 * Modal de confirmação para ações destrutivas (substitui `window.confirm`,
 * que no Electron/Windows rouba o foco dos campos).
 * - fecha com Esc (ou clicando fora);
 * - foco inicial no botão seguro (Cancelar);
 * - ao fechar, devolve o foco para onde estava.
 */
export default function ConfirmarModal({
  titulo,
  mensagem,
  rotuloConfirmar = 'Confirmar',
  aoConfirmar,
  aoCancelar
}: ConfirmarModalProps): React.JSX.Element {
  const botaoCancelar = useRef<HTMLButtonElement>(null)

  // Esc fecha com o callback sempre atual (dependência troca, sem efeito colateral).
  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent): void => {
      if (evento.key === 'Escape') {
        evento.preventDefault()
        aoCancelar()
      }
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [aoCancelar])

  // Foco: começa no botão seguro e volta para onde estava ao fechar.
  useEffect(() => {
    const focoAnterior =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    botaoCancelar.current?.focus()

    return () => {
      if (focoAnterior && document.contains(focoAnterior)) focoAnterior.focus()
    }
  }, [])

  return (
    <div
      className="modal-fundo"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) aoCancelar()
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
        <h3 id="modal-titulo">{titulo}</h3>
        <p>{mensagem}</p>
        <div className="modal-acoes">
          <button type="button" className="botao" ref={botaoCancelar} onClick={aoCancelar}>
            Cancelar
          </button>
          <button type="button" className="botao perigo" onClick={aoConfirmar}>
            {rotuloConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}
