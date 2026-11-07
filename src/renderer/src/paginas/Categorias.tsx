import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import type { CategoriaResumo } from '../../../shared/tipos'
import { useConfirmar } from '../componentes/useConfirmar'

/** Lista de categorias: quantidade de despesas, ativação e exclusão. */
export default function Categorias(): React.JSX.Element {
  const [categorias, setCategorias] = useState<CategoriaResumo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const { confirmar, modal } = useConfirmar()
  const botaoNova = useRef<HTMLAnchorElement>(null)

  // Recarrega a lista (usado depois de salvar, ativar ou excluir).
  async function carregar(): Promise<void> {
    const resultado = await window.api.categorias.listar()
    if (!resultado.ok) {
      setErro(resultado.erro)
    } else {
      setCategorias(resultado.dados)
      setErro(null)
    }
    setCarregando(false)
  }

  // Carga inicial: o setState acontece na resposta (callback), não no efeito.
  useEffect(() => {
    let vivo = true
    void window.api.categorias.listar().then((resultado) => {
      if (!vivo) return
      if (resultado.ok) {
        setCategorias(resultado.dados)
        setErro(null)
      } else {
        setErro(resultado.erro)
      }
      setCarregando(false)
    })
    return () => {
      vivo = false
    }
  }, [])

  async function alternarAtiva(categoria: CategoriaResumo): Promise<void> {
    setErro(null)
    const resultado = await window.api.categorias.definirAtiva({
      id: categoria.id,
      ativa: !categoria.ativa
    })
    if (!resultado.ok) {
      setErro(resultado.erro)
      return
    }
    await carregar()
  }

  async function excluir(categoria: CategoriaResumo): Promise<void> {
    setErro(null)
    const resultado = await window.api.categorias.excluir(categoria.id)
    if (!resultado.ok) {
      // Ex.: categoria com despesas — a mensagem explica que deve desativar.
      setErro(resultado.erro)
      return
    }
    await carregar()
    // A linha sumiu e o botão de exclusão também: o foco cairia no corpo da página.
    if (document.activeElement === document.body) botaoNova.current?.focus()
  }

  function pedirExclusao(categoria: CategoriaResumo): void {
    if (categoria.quantidadeDespesas > 0) {
      // Sem modal: a recusa já vem explicando (evitar confirmar algo que falha).
      void excluir(categoria)
      return
    }
    confirmar({
      titulo: 'Excluir categoria',
      mensagem: `Excluir a categoria "${categoria.nome}"? Esta ação não pode ser desfeita.`,
      rotuloConfirmar: 'Excluir',
      aoConfirmar: () => excluir(categoria)
    })
  }

  return (
    <section>
      <div className="cabecalho-pagina">
        <h2>Categorias</h2>
        <Link className="botao" to="/categorias/nova" ref={botaoNova}>
          Nova categoria
        </Link>
      </div>

      {erro && (
        <p className="erro-geral" role="alert">
          {erro}
        </p>
      )}

      {carregando ? (
        <p className="vazio">Carregando categorias…</p>
      ) : categorias.length === 0 ? (
        <p className="vazio">Nenhuma categoria cadastrada.</p>
      ) : (
        <table className="tabela">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Conta no lucro?</th>
              <th>Situação</th>
              <th className="numero">Despesas</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {categorias.map((categoria) => (
              <tr key={categoria.id} className={categoria.ativa ? undefined : 'inativa'}>
                <td>{categoria.nome}</td>
                <td>{categoria.contaNoLucro ? 'Sim' : 'Não'}</td>
                <td>{categoria.ativa ? 'Ativa' : 'Inativa'}</td>
                <td className="numero">{categoria.quantidadeDespesas}</td>
                <td className="acoes">
                  <Link to={`/categorias/${categoria.id}/editar`}>Editar</Link>
                  <button
                    type="button"
                    className="botao-suave"
                    onClick={() => void alternarAtiva(categoria)}
                  >
                    {categoria.ativa ? 'Desativar' : 'Reativar'}
                  </button>
                  <button
                    type="button"
                    className="botao-perigo"
                    onClick={() => pedirExclusao(categoria)}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modal}
    </section>
  )
}
