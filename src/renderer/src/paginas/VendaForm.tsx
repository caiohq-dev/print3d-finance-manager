import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { hoje } from '../../../shared/datas'
import { centavosParaCampo } from '../../../shared/dinheiro'
import type { Venda } from '../../../shared/tipos'
import {
  data as validarData,
  errosPorCampo,
  obrigatorio,
  taxasOpcionais,
  valorPositivo,
  type ErrosPorCampo
} from '../../../shared/validacao'
import Campo from '../componentes/Campo'
import { useMesDaUrl } from '../componentes/useMesDaUrl'

/** Formulário de venda: `/vendas/nova` e `/vendas/:id/editar`. */
export default function VendaForm(): React.JSX.Element {
  const { id } = useParams()
  const ehNova = id === undefined
  const numeroId = Number(id)
  const idValido = Number.isInteger(numeroId) && numeroId > 0
  // id que não existe (rota com lixo, por exemplo): aviso vem da renderização.
  const idInvalido = !ehNova && !idValido

  const navegar = useNavigate()
  // Mês da lista de onde o formulário foi aberto (usado no "Voltar").
  const mesDaLista = useMesDaUrl()
  const voltarPara = `/vendas?mes=${mesDaLista}`

  const [data, setData] = useState(hoje())
  const [cliente, setCliente] = useState('')
  const [descricao, setDescricao] = useState('')
  const [canal, setCanal] = useState('')
  const [valor, setValor] = useState('')
  const [taxas, setTaxas] = useState('')
  const [observacao, setObservacao] = useState('')

  const [canais, setCanais] = useState<string[]>([])
  const [erros, setErros] = useState<ErrosPorCampo>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(!ehNova && !idInvalido)
  const [salvando, setSalvando] = useState(false)

  // Carrega as sugestões de canal e, na edição, a venda. O setState acontece
  // na resposta (callback), não no efeito.
  useEffect(() => {
    if (idInvalido) return undefined

    let vivo = true
    void (async () => {
      const listaCanais = await window.api.vendas.canais()
      if (!vivo) return
      // Sem as sugestões o campo continua sendo texto livre; não bloqueia o formulário.
      if (listaCanais.ok) setCanais(listaCanais.dados)

      let venda: Venda | null = null
      if (!ehNova) {
        const resultado = await window.api.vendas.obter(numeroId)
        if (!vivo) return
        if (!resultado.ok) {
          setErroGeral(resultado.erro)
          setCarregando(false)
          return
        }
        venda = resultado.dados
      }

      if (venda) {
        setData(venda.data)
        setCliente(venda.cliente ?? '')
        setDescricao(venda.descricao)
        setCanal(venda.canal ?? '')
        setValor(centavosParaCampo(venda.valorCentavos))
        setTaxas(centavosParaCampo(venda.taxasCentavos))
        setObservacao(venda.observacao ?? '')
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
      ['descricao', obrigatorio(descricao, 'a descrição')],
      ['valor', valorPositivo(valor)],
      ['taxas', taxasOpcionais(valor, taxas)]
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
      cliente: cliente.trim(),
      descricao: descricao.trim(),
      canal: canal.trim(),
      valor,
      taxas,
      observacao: observacao.trim()
    }
    const resultado = ehNova
      ? await window.api.vendas.criar(entrada)
      : await window.api.vendas.atualizar({ ...entrada, id: numeroId })

    setSalvando(false)
    if (!resultado.ok) {
      // Em erro, os campos continuam preenchidos com o que foi digitado.
      if (resultado.campos) setErros(resultado.campos)
      else setErroGeral(resultado.erro)
      return
    }

    // Volta para a lista do mês da data salva, com mensagem de sucesso.
    const mesSalvo = resultado.dados.data.slice(0, 7)
    navegar(`/vendas?mes=${mesSalvo}`, { state: { sucesso: 'Venda salva.' } })
  }

  if (idInvalido) {
    return (
      <section>
        <h2>Editar venda</h2>
        <p className="erro-geral" role="alert">
          Venda não encontrada.
        </p>
        <p>
          <Link className="voltar" to={voltarPara}>
            ← Voltar para vendas
          </Link>
        </p>
      </section>
    )
  }

  if (carregando) {
    return (
      <section>
        <h2>{ehNova ? 'Nova venda' : 'Editar venda'}</h2>
        <p className="vazio">Carregando…</p>
      </section>
    )
  }

  return (
    <section>
      <div className="cabecalho-pagina">
        <h2>{ehNova ? 'Nova venda' : 'Editar venda'}</h2>
        <Link className="voltar" to={voltarPara}>
          ← Voltar para vendas
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
          id="cliente"
          rotulo="Cliente"
          ajuda="Opcional"
          input={{
            value: cliente,
            onChange: (evento) => setCliente(evento.target.value)
          }}
        />

        <Campo
          id="descricao"
          rotulo="Descrição"
          erro={erros.descricao}
          input={{
            value: descricao,
            onChange: (evento) => setDescricao(evento.target.value),
            placeholder: 'Ex.: Suporte de headset, PLA preto'
          }}
        />

        <Campo
          id="canal"
          rotulo="Canal"
          ajuda="Opcional — escolha uma sugestão ou digite outro."
          input={{
            value: canal,
            onChange: (evento) => setCanal(evento.target.value),
            list: 'canais-sugeridos',
            placeholder: 'Ex.: Shopee'
          }}
        />
        <datalist id="canais-sugeridos">
          {canais.map((sugestao) => (
            <option key={sugestao} value={sugestao} />
          ))}
        </datalist>

        <Campo
          id="valor"
          rotulo="Valor cobrado"
          erro={erros.valor}
          input={{
            value: valor,
            onChange: (evento) => setValor(evento.target.value),
            inputMode: 'decimal',
            placeholder: '0,00'
          }}
        />

        <Campo
          id="taxas"
          rotulo="Taxas"
          erro={erros.taxas}
          ajuda="Opcional — em branco conta como 0."
          input={{
            value: taxas,
            onChange: (evento) => setTaxas(evento.target.value),
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
