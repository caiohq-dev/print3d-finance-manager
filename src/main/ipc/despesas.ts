// Handlers IPC de despesas: finos, validam a entrada, chamam o serviço e
// devolvem `Resultado<T>`. Nenhuma exceção crua chega ao renderer.
import { ipcMain } from 'electron'
import type { DatabaseSync } from 'node:sqlite'
import type { Despesa, EntradaDespesa, ListaDespesas, Resultado } from '../../shared/tipos'
import {
  atualizarDespesa,
  criarDespesa,
  excluirDespesa,
  listarDespesas,
  obterDespesa
} from '../servicos/despesas'

const ERRO_DADOS = 'Dados inválidos enviados pela tela.'
const ERRO_INESPERADO = 'Não foi possível concluir a operação.'

export function registrarIpcDespesas(banco: DatabaseSync): void {
  ipcMain.handle('despesas:listar', (_evento, mes: unknown): Resultado<ListaDespesas> => {
    try {
      if (typeof mes !== 'string') return { ok: false, erro: ERRO_DADOS }
      return listarDespesas(banco, mes)
    } catch {
      return { ok: false, erro: ERRO_INESPERADO }
    }
  })

  ipcMain.handle('despesas:obter', (_evento, id: unknown): Resultado<Despesa> => {
    try {
      if (!ehId(id)) return { ok: false, erro: ERRO_DADOS }
      return obterDespesa(banco, id)
    } catch {
      return { ok: false, erro: ERRO_INESPERADO }
    }
  })

  ipcMain.handle('despesas:criar', (_evento, entrada: unknown): Resultado<Despesa> => {
    try {
      if (!ehEntrada(entrada)) return { ok: false, erro: ERRO_DADOS }
      return criarDespesa(banco, entrada)
    } catch {
      return { ok: false, erro: ERRO_INESPERADO }
    }
  })

  ipcMain.handle('despesas:atualizar', (_evento, entrada: unknown): Resultado<Despesa> => {
    try {
      if (!ehEntradaComId(entrada)) return { ok: false, erro: ERRO_DADOS }
      return atualizarDespesa(banco, entrada)
    } catch {
      return { ok: false, erro: ERRO_INESPERADO }
    }
  })

  ipcMain.handle('despesas:excluir', (_evento, id: unknown): Resultado<null> => {
    try {
      if (!ehId(id)) return { ok: false, erro: ERRO_DADOS }
      return excluirDespesa(banco, id)
    } catch {
      return { ok: false, erro: ERRO_INESPERADO }
    }
  })
}

function ehId(id: unknown): id is number {
  return typeof id === 'number' && Number.isInteger(id) && id > 0
}

function ehEntrada(entrada: unknown): entrada is EntradaDespesa {
  if (typeof entrada !== 'object' || entrada === null) return false
  const candidate = entrada as Partial<EntradaDespesa>
  return (
    typeof candidate.data === 'string' &&
    typeof candidate.categoriaId === 'number' &&
    typeof candidate.descricao === 'string' &&
    typeof candidate.fornecedor === 'string' &&
    typeof candidate.valor === 'string' &&
    typeof candidate.observacao === 'string'
  )
}

function ehEntradaComId(entrada: unknown): entrada is EntradaDespesa & { id: number } {
  return ehEntrada(entrada) && ehId((entrada as { id?: unknown }).id)
}
