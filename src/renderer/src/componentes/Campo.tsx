import type { InputHTMLAttributes } from 'react'

type Props = {
  /** Id do input e do rótulo (o `label` aponta para ele). */
  id: string
  rotulo: string
  /** Mensagem de erro, mostrada ao lado do campo. */
  erro?: string
  /** Ajuda curta, mostrada ao lado do rótulo. */
  ajuda?: string
  /** Atributos do input (value, onChange, placeholder...). */
  input: InputHTMLAttributes<HTMLInputElement>
}

/** Campo padrão dos formulários: rótulo + input + ajuda + mensagem de erro. */
export default function Campo({ id, rotulo, erro, ajuda, input }: Props): React.JSX.Element {
  const descricoes = [erro ? `${id}-erro` : null, ajuda ? `${id}-ajuda` : null]
    .filter((texto): texto is string => texto !== null)
    .join(' ')

  return (
    <div className={`campo${erro ? ' campo-erro-ativo' : ''}`}>
      <div className="campo-cabecalho">
        <label htmlFor={id}>{rotulo}</label>
        {ajuda && (
          <span className="campo-ajuda" id={`${id}-ajuda`}>
            {ajuda}
          </span>
        )}
      </div>
      <input
        {...input}
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descricoes || undefined}
      />
      {erro && (
        <span className="campo-mensagem-erro" id={`${id}-erro`} role="alert">
          {erro}
        </span>
      )}
    </div>
  )
}
