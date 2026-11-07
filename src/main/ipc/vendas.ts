// Handlers IPC de vendas: finos, validam a entrada, chamam o serviço e
// devolvem `Resultado<T>`. Nenhuma exceção crua chega ao renderer.
import { ipcMain } from 'electron'
import type { DatabaseSync } from 'node:sqlite'
import type { EntradaVenda, ListaVendas, Resultado, Venda } from '../../shared/tipos'
import {
  atualizarVenda,
  criarVenda,
  excluirVenda,
  listarCanais,
  listarVendas,
  obterVenda
} from '../servicos/vendas'

const ERRO_DADOS = 'Dados inválidos enviados pela tela.'
const ERRO_INESPERADO = 'Não foi possível concluir a operação.'

export function registrarIpcVendas(banco: DatabaseSync): void {
  ipcMain.handle('vendas:listar', (_evento, mes: unknown): Resultado<ListaVendas> => {
    try {
      if (typeof mes !== 'string') return { ok: false, erro: ERRO_DADOS }
      return listarVendas(banco, mes)
    } catch {
      return { ok: false, erro: ERRO_INESPERADO }
    }
  })

  ipcMain.handle('vendas:obter', (_evento, id: unknown): Resultado<Venda> => {
    try {
      if (!ehId(id)) return { ok: false, erro: ERRO_DADOS }
      return obterVenda(banco, id)
    } catch {
      return { ok: false, erro: ERRO_INESPERADO }
    }
  })

  ipcMain.handle('vendas:criar', (_evento, entrada: unknown): Resultado<Venda> => {
    try {
      if (!ehEntrada(entrada)) return { ok: false, erro: ERRO_DADOS }
      return criarVenda(banco, entrada)
    } catch {
      return { ok: false, erro: ERRO_INESPERADO }
    }
  })

  ipcMain.handle('vendas:atualizar', (_evento, entrada: unknown): Resultado<Venda> => {
    try {
      if (!ehEntradaComId(entrada)) return { ok: false, erro: ERRO_DADOS }
      return atualizarVenda(banco, entrada)
    } catch {
      return { ok: false, erro: ERRO_INESPERADO }
    }
  })

  ipcMain.handle('vendas:excluir', (_evento, id: unknown): Resultado<null> => {
    try {
      if (!ehId(id)) return { ok: false, erro: ERRO_DADOS }
      return excluirVenda(banco, id)
    } catch {
      return { ok: false, erro: ERRO_INESPERADO }
    }
  })

  ipcMain.handle('vendas:canais', (): Resultado<string[]> => {
    try {
      return listarCanais(banco)
    } catch {
      return { ok: false, erro: ERRO_INESPERADO }
    }
  })
}

function ehId(id: unknown): id is number {
  return typeof id === 'number' && Number.isInteger(id) && id > 0
}

function ehEntrada(entrada: unknown): entrada is EntradaVenda {
  if (typeof entrada !== 'object' || entrada === null) return false
  const candidate = entrada as Partial<EntradaVenda>
  return (
    typeof candidate.data === 'string' &&
    typeof candidate.cliente === 'string' &&
    typeof candidate.descricao === 'string' &&
    typeof candidate.canal === 'string' &&
    typeof candidate.valor === 'string' &&
    typeof candidate.taxas === 'string' &&
    typeof candidate.observacao === 'string'
  )
}

function ehEntradaComId(entrada: unknown): entrada is EntradaVenda & { id: number } {
  return ehEntrada(entrada) && ehId((entrada as { id?: unknown }).id)
}
