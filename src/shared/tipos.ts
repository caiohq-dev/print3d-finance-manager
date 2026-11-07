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

/** Indicadores do mês do resumo (todos em centavos, exceto `margem`). */
export type ResumoIndicadores = {
  mes: string
  faturamentoBrutoCentavos: number
  taxasCentavos: number
  /** Faturamento bruto − taxas. */
  receitaLiquidaCentavos: number
  /** Despesas de categorias com `contaNoLucro = true`. */
  despesasLucroCentavos: number
  /** Receita líquida − despesas do lucro. Pode ser negativo. */
  lucroCentavos: number
  /** Despesas de investimento, fora do lucro. */
  investimentosCentavos: number
  /** Lucro ÷ faturamento bruto, em %, com uma casa decimal. `0` sem faturamento. */
  margem: number
}

/** Linha do bloco "Despesas por categoria". */
export type DespesaCategoriaResumo = {
  categoriaId: number
  categoriaNome: string
  contaNoLucro: boolean
  valorCentavos: number
  /** Valor ÷ total de despesas do mês, em %, com uma casa decimal. */
  percentualDoTotal: number
}

/** Linha do bloco "Vendas por canal". Vendas sem canal viram "Sem canal". */
export type VendaCanalResumo = {
  canal: string
  quantidade: number
  faturamentoBrutoCentavos: number
}

/** Linha do bloco "Últimos 12 meses". */
export type MesResumo = {
  mes: string
  faturamentoBrutoCentavos: number
  despesasLucroCentavos: number
  lucroCentavos: number
}

/** Tudo o que a tela de resumo mostra para o mês selecionado. */
export type ResumoMensal = {
  indicadores: ResumoIndicadores
  despesasPorCategoria: DespesaCategoriaResumo[]
  vendasPorCanal: VendaCanalResumo[]
  /** 12 meses em ordem crescente, terminando no mês selecionado. */
  ultimosMeses: MesResumo[]
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
  resumo: {
    /** Indicadores e blocos de um mês (`AAAA-MM`) em uma chamada só. */
    obter: (mes: string) => Promise<Resultado<ResumoMensal>>
  }
}
