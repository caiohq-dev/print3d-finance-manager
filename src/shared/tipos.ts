// Contrato entre renderer e renderer/main. O renderer só enxerga o que está aqui.
// Código puro: sem Electron e sem DOM.

/** Resposta de todo método da API para o renderer. `erro` é mensagem pronta para o usuário. */
export type Resultado<T> =
  { ok: true; dados: T } | { ok: false; erro: string; campos?: Record<string, string> }

/** Informações básicas do app (etapa 01). */
export type AppInfo = {
  versao: string
  caminhoBanco: string
}

/** Categoria como o renderer enxerga (sem `snake_case` do banco). */
export type Categoria = {
  id: number
  nome: string
  contaNoLucro: boolean
  ativa: boolean
}

/** Categoria na lista, com a quantidade de despesas que usam dela. */
export type CategoriaResumo = Categoria & {
  quantidadeDespesas: number
}

/** O que o formulário de categoria envia para criar/editar. */
export type EntradaCategoria = {
  nome: string
  contaNoLucro: boolean
}

/** Despesa como o renderer enxerga (sem `snake_case` do banco). */
export type Despesa = {
  id: number
  data: string
  categoriaId: number
  categoriaNome: string
  /** `false` quando a categoria é investimento (fica fora do lucro). */
  contaNoLucro: boolean
  descricao: string
  fornecedor: string | null
  valorCentavos: number
  observacao: string | null
  criadoEm: string
  atualizadoEm: string
}

/** Despesas de um mês com os totais mostrados no rodapé da lista. */
export type ListaDespesas = {
  mes: string
  despesas: Despesa[]
  totalCentavos: number
  /** Parte do total vinda de categorias que não contam no lucro. */
  totalInvestimentoCentavos: number
}

/** O que o formulário de despesa envia. `valor` é o texto digitado (aceita vírgula). */
export type EntradaDespesa = {
  data: string
  categoriaId: number
  descricao: string
  fornecedor: string
  valor: string
  observacao: string
}

/** Venda como o renderer enxerga (sem `snake_case` do banco). */
export type Venda = {
  id: number
  data: string
  cliente: string | null
  descricao: string
  canal: string | null
  valorCentavos: number
  taxasCentavos: number
  /** `valor_centavos - taxas_centavos`, calculado no serviço. */
  liquidoCentavos: number
  observacao: string | null
  criadoEm: string
  atualizadoEm: string
}

/** Vendas de um mês com os totais mostrados no rodapé da lista. */
export type ListaVendas = {
  mes: string
  vendas: Venda[]
  /** Faturamento bruto: soma de `valorCentavos`. */
  totalCentavos: number
  totalTaxasCentavos: number
  /** Receita líquida: faturamento bruto − taxas. */
  totalLiquidoCentavos: number
}

/** O que o formulário de venda envia. `valor` e `taxas` são o texto digitado. */
export type EntradaVenda = {
  data: string
  cliente: string
  descricao: string
  canal: string
  valor: string
  taxas: string
  observacao: string
}

/** Forma de `window.api`, derivada dos tipos acima. */
export type Api = {
  app: {
    info: () => Promise<Resultado<AppInfo>>
  }
  categorias: {
    listar: () => Promise<Resultado<CategoriaResumo[]>>
    obter: (id: number) => Promise<Resultado<CategoriaResumo>>
    criar: (entrada: EntradaCategoria) => Promise<Resultado<Categoria>>
    atualizar: (entrada: EntradaCategoria & { id: number }) => Promise<Resultado<Categoria>>
    definirAtiva: (entrada: { id: number; ativa: boolean }) => Promise<Resultado<Categoria>>
    excluir: (id: number) => Promise<Resultado<null>>
  }
  despesas: {
    listar: (mes: string) => Promise<Resultado<ListaDespesas>>
    obter: (id: number) => Promise<Resultado<Despesa>>
    criar: (entrada: EntradaDespesa) => Promise<Resultado<Despesa>>
    atualizar: (entrada: EntradaDespesa & { id: number }) => Promise<Resultado<Despesa>>
    excluir: (id: number) => Promise<Resultado<null>>
  }
  vendas: {
    listar: (mes: string) => Promise<Resultado<ListaVendas>>
    obter: (id: number) => Promise<Resultado<Venda>>
    criar: (entrada: EntradaVenda) => Promise<Resultado<Venda>>
    atualizar: (entrada: EntradaVenda & { id: number }) => Promise<Resultado<Venda>>
    excluir: (id: number) => Promise<Resultado<null>>
    /** Canais já usados + os sugeridos, sem repetir. */
    canais: () => Promise<Resultado<string[]>>
  }
}
