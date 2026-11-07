import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

type Comum = {
  /** Id do controle e do rótulo (o `label` aponta para ele). */
  id: string
  rotulo: string
  /** Mensagem de erro, mostrada ao lado do campo. */
  erro?: string
  /** Ajuda curta, mostrada ao lado do rótulo. */
  ajuda?: string
}

type Props = Comum &
  (
    | {
        /** Atributos do input (value, onChange, placeholder...). */
        input: InputHTMLAttributes<HTMLInputElement>
        select?: never
        children?: never
      }
    | {
        /** Atributos do select. As `<option>` vão em `children`. */
        select: SelectHTMLAttributes<HTMLSelectElement>
        children: ReactNode
        input?: never
      }
  )

/** Campo padrão dos formulários: rótulo + input/select + ajuda + mensagem de erro. */
export default function Campo(props: Props): React.JSX.Element {
  const { id, rotulo, erro, ajuda } = props
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
      {props.input !== undefined ? (
        <input
          {...props.input}
          id={id}
          aria-invalid={erro ? true : undefined}
          aria-describedby={descricoes || undefined}
        />
      ) : (
        <select
          {...props.select}
          id={id}
          aria-invalid={erro ? true : undefined}
          aria-describedby={descricoes || undefined}
        >
          {props.children}
        </select>
      )}
      {erro && (
        <span className="campo-mensagem-erro" id={`${id}-erro`} role="alert">
          {erro}
        </span>
      )}
    </div>
  )
}
