import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { hoje } from '../../../shared/datas'
import { centavosParaCampo } from '../../../shared/dinheiro'
import type { CategoriaResumo, Despesa } from '../../../shared/tipos'
import {
  data as validarData,
  errosPorCampo,
  obrigatorio,
  valorPositivo,
  type ErrosPorCampo
} from '../../../shared/validacao'
import Campo from '../componentes/Campo'
import { useMesDaUrl } from '../componentes/useMesDaUrl'

/** Formulário de despesa: `/despesas/nova` e `/despesas/:id/editar`. */
export default function DespesaForm(): React.JSX.Element {
  const { id } = useParams()
  const ehNova = id === undefined
  const numeroId = Number(id)
  const idValido = Number.isInteger(numeroId) && numeroId > 0
  // id que não existe (rota com lixo, por exemplo): aviso vem da renderização.
  const idInvalido = !ehNova && !idValido

  const navegar = useNavigate()
  // Mês da lista de onde o formulário foi aberto (usado no "Voltar").
  const mesDaLista = useMesDaUrl()
  const voltarPara = `/despesas?mes=${mesDaLista}`

  const [data, setData] = useState(hoje())
  const [categoriaId, setCategoriaId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [fornecedor, setFornecedor] = useState('')
  const [valor, setValor] = useState('')
  const [observacao, setObservacao] = useState('')

  const [categorias, setCategorias] = useState<CategoriaResumo[]>([])
  const [erros, setErros] = useState<ErrosPorCampo>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(!ehNova && !idInvalido)
  const [salvando, setSalvando] = useState(false)

  // Carrega as categorias e, na edição, a despesa. O setState acontece na
  // resposta (callback), não no efeito.
  useEffect(() => {
    if (idInvalido) return undefined

    let vivo = true
    void (async () => {
      const listaCategorias = await window.api.categorias.listar()
      if (!vivo) return
      if (!listaCategorias.ok) {
        setErroGeral(listaCategorias.erro)
        setCarregando(false)
        return
      }

      let despesa: Despesa | null = null
      if (!ehNova) {
        const resultado = await window.api.despesas.obter(numeroId)
        if (!vivo) return
        if (!resultado.ok) {
          setErroGeral(resultado.erro)
          setCarregando(false)
          return
        }
        despesa = resultado.dados
      }

      // Só categorias ativas; na edição, a categoria atual entra mesmo inativa.
      setCategorias(
        listaCategorias.dados.filter(
          (categoria) => categoria.ativa || categoria.id === despesa?.categoriaId
        )
      )

      if (despesa) {
        setData(despesa.data)
        setCategoriaId(String(despesa.categoriaId))
        setDescricao(despesa.descricao)
        setFornecedor(despesa.fornecedor ?? '')
        setValor(centavosParaCampo(despesa.valorCentavos))
        setObservacao(despesa.observacao ?? '')
      }
      setCarregando(false)
    })()

    return () => {
      vivo = false
    }
  }, [ehNova, idInvalido, numeroId])

  async function salvar(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault()

    // Resposta imediata; o main valida de novo (é a validação que vale).
    const aviso = errosPorCampo([
      ['data', validarData(data)],
      [
        'categoriaId',
        categoriaId === '' ? { ok: false, erro: 'Escolha uma categoria.' } : { ok: true }
      ],
      ['descricao', obrigatorio(descricao, 'a descrição')],
      ['valor', valorPositivo(valor)]
    ])
    if (aviso) {
      setErros(aviso)
      return
    }

    setErros({})
    setErroGeral(null)
    setSalvando(true)

    const entrada = {
      data,
      categoriaId: Number(categoriaId),
      descricao: descricao.trim(),
      fornecedor: fornecedor.trim(),
      valor,
      observacao: observacao.trim()
    }
    const resultado = ehNova
      ? await window.api.despesas.criar(entrada)
      : await window.api.despesas.atualizar({ ...entrada, id: numeroId })

    setSalvando(false)
    if (!resultado.ok) {
      // Em erro, os campos continuam preenchidos com o que foi digitado.
      if (resultado.campos) setErros(resultado.campos)
      else setErroGeral(resultado.erro)
      return
    }

    // Volta para a lista do mês da data salva, com mensagem de sucesso.
    const mesSalvo = resultado.dados.data.slice(0, 7)
    navegar(`/despesas?mes=${mesSalvo}`, { state: { sucesso: 'Despesa salva.' } })
  }

  if (idInvalido) {
    return (
      <section>
        <h2>Editar despesa</h2>
        <p className="erro-geral" role="alert">
          Despesa não encontrada.
        </p>
        <p>
          <Link className="voltar" to={voltarPara}>
            ← Voltar para despesas
          </Link>
        </p>
      </section>
    )
  }

  if (carregando) {
    return (
      <section>
        <h2>{ehNova ? 'Nova despesa' : 'Editar despesa'}</h2>
        <p className="vazio">Carregando…</p>
      </section>
    )
  }

  return (
    <section>
      <div className="cabecalho-pagina">
        <h2>{ehNova ? 'Nova despesa' : 'Editar despesa'}</h2>
        <Link className="voltar" to={voltarPara}>
          ← Voltar para despesas
        </Link>
      </div>

      {erroGeral && (
        <p className="erro-geral" role="alert">
          {erroGeral}
        </p>
      )}

      <form className="formulario" onSubmit={salvar} noValidate>
        <Campo
          id="data"
          rotulo="Data"
          erro={erros.data}
          input={{
            type: 'date',
            value: data,
            onChange: (evento) => setData(evento.target.value),
            autoFocus: ehNova
          }}
        />

        <Campo
          id="categoria"
          rotulo="Categoria"
          erro={erros.categoriaId}
          select={{
            value: categoriaId,
            onChange: (evento) => setCategoriaId(evento.target.value)
          }}
        >
          <option value="">Selecione…</option>
          {categorias.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.nome}
              {categoria.ativa ? '' : ' (inativa)'}
            </option>
          ))}
        </Campo>

        {categorias.length === 0 && (
          <p className="aviso">
            Nenhuma categoria ativa. Crie ou reative uma em{' '}
            <Link className="voltar" to="/categorias">
              Categorias
            </Link>
            .
          </p>
        )}

        <Campo
          id="descricao"
          rotulo="Descrição"
          erro={erros.descricao}
          input={{
            value: descricao,
            onChange: (evento) => setDescricao(evento.target.value),
            placeholder: 'Ex.: Filamento PLA preto 1 kg'
          }}
        />

        <Campo
          id="fornecedor"
          rotulo="Fornecedor"
          ajuda="Opcional"
          input={{
            value: fornecedor,
            onChange: (evento) => setFornecedor(evento.target.value)
          }}
        />

        <Campo
          id="valor"
          rotulo="Valor"
          erro={erros.valor}
          input={{
            value: valor,
            onChange: (evento) => setValor(evento.target.value),
            inputMode: 'decimal',
            placeholder: '0,00'
          }}
        />

        <Campo
          id="observacao"
          rotulo="Observação"
          ajuda="Opcional"
          input={{
            value: observacao,
            onChange: (evento) => setObservacao(evento.target.value)
          }}
        />

        <div className="form-acoes">
          <button type="submit" className="botao principal" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
          <Link className="botao" to={voltarPara}>
            Cancelar
          </Link>
        </div>
      </form>
    </section>
  )
}
