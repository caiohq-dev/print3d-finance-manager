import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { errosPorCampo, obrigatorio, type ErrosPorCampo } from '../../../shared/validacao'
import Campo from '../componentes/Campo'
import { useConfirmar } from '../componentes/useConfirmar'

const AJUDA_CONTA_NO_LUCRO =
  'Desmarque para investimentos (ex.: compra de impressora), que ficam fora do cálculo do lucro.'

/** Formulário de categoria: `/categorias/nova` e `/categorias/:id/editar`. */
export default function CategoriaForm(): React.JSX.Element {
  const { id } = useParams()
  const ehNova = id === undefined
  const numeroId = Number(id)
  const idValido = Number.isInteger(numeroId) && numeroId > 0
  // id que não existe (rota com lixo, por exemplo): aviso vem da renderização.
  const idInvalido = !ehNova && !idValido

  const navegar = useNavigate()
  const { confirmar, modal } = useConfirmar()

  const [nome, setNome] = useState('')
  const [contaNoLucro, setContaNoLucro] = useState(true)
  const [quantidadeDespesas, setQuantidadeDespesas] = useState(0)
  const [erros, setErros] = useState<ErrosPorCampo>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(!ehNova && !idInvalido)
  const [salvando, setSalvando] = useState(false)

  // Carrega a categoria existente: o setState acontece na resposta (callback).
  useEffect(() => {
    if (ehNova || idInvalido) return undefined

    let vivo = true
    void window.api.categorias.obter(numeroId).then((resultado) => {
      if (!vivo) return
      if (resultado.ok) {
        setNome(resultado.dados.nome)
        setContaNoLucro(resultado.dados.contaNoLucro)
        setQuantidadeDespesas(resultado.dados.quantidadeDespesas)
      } else {
        setErroGeral(resultado.erro)
      }
      setCarregando(false)
    })
    return () => {
      vivo = false
    }
  }, [ehNova, idInvalido, numeroId])

  async function salvar(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault()

    const aviso = errosPorCampo([['nome', obrigatorio(nome, 'o nome da categoria')]])
    if (aviso) {
      setErros(aviso)
      return
    }

    setErros({})
    setErroGeral(null)
    setSalvando(true)

    const entrada = { nome: nome.trim(), contaNoLucro }
    const resultado = ehNova
      ? await window.api.categorias.criar(entrada)
      : await window.api.categorias.atualizar({ ...entrada, id: numeroId })

    setSalvando(false)
    if (!resultado.ok) {
      // Nome duplicado volta como erro do campo, sem perder o que foi digitado.
      if (resultado.campos) setErros(resultado.campos)
      else setErroGeral(resultado.erro)
      return
    }
    navegar('/categorias')
  }

  async function excluir(): Promise<void> {
    const resultado = await window.api.categorias.excluir(numeroId)
    if (!resultado.ok) {
      setErroGeral(resultado.erro)
      return
    }
    navegar('/categorias')
  }

  function pedirExclusao(): void {
    if (quantidadeDespesas > 0) {
      // Sem modal: a recusa já vem explicando (evitar confirmar algo que falha).
      void excluir()
      return
    }
    confirmar({
      titulo: 'Excluir categoria',
      mensagem: `Excluir a categoria "${nome}"? Esta ação não pode ser desfeita.`,
      rotuloConfirmar: 'Excluir',
      aoConfirmar: excluir
    })
  }

  if (idInvalido) {
    return (
      <section>
        <h2>Editar categoria</h2>
        <p className="erro-geral" role="alert">
          Categoria não encontrada.
        </p>
        <p>
          <Link className="voltar" to="/categorias">
            ← Voltar para categorias
          </Link>
        </p>
      </section>
    )
  }

  if (carregando) {
    return (
      <section>
        <h2>{ehNova ? 'Nova categoria' : 'Editar categoria'}</h2>
        <p className="vazio">Carregando…</p>
      </section>
    )
  }

  return (
    <section>
      <div className="cabecalho-pagina">
        <h2>{ehNova ? 'Nova categoria' : 'Editar categoria'}</h2>
        <Link className="voltar" to="/categorias">
          ← Voltar para categorias
        </Link>
      </div>

      {erroGeral && (
        <p className="erro-geral" role="alert">
          {erroGeral}
        </p>
      )}

      <form className="formulario" onSubmit={salvar} noValidate>
        <Campo
          id="nome"
          rotulo="Nome"
          erro={erros.nome}
          input={{
            value: nome,
            onChange: (evento) => setNome(evento.target.value),
            placeholder: 'Ex.: Embalagem',
            autoFocus: ehNova
          }}
        />

        <div className="campo">
          <div className="campo-cabecalho">
            <label htmlFor="conta-no-lucro">Conta no lucro?</label>
            <span className="campo-ajuda" id="conta-no-lucro-ajuda">
              {AJUDA_CONTA_NO_LUCRO}
            </span>
          </div>
          <input
            type="checkbox"
            id="conta-no-lucro"
            checked={contaNoLucro}
            aria-describedby="conta-no-lucro-ajuda"
            onChange={(evento) => setContaNoLucro(evento.target.checked)}
          />
        </div>

        {!ehNova && quantidadeDespesas > 0 && (
          <p className="aviso">Esta categoria está em uso por {quantidadeDespesas} despesa(s).</p>
        )}

        <div className="form-acoes">
          <button type="submit" className="botao principal" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
          <Link className="botao" to="/categorias">
            Cancelar
          </Link>
          {!ehNova && (
            <button
              type="button"
              className="botao perigo"
              onClick={pedirExclusao}
              disabled={salvando}
            >
              Excluir
            </button>
          )}
        </div>
      </form>

      {modal}
    </section>
  )
}
