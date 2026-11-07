// Handlers IPC de categorias: finos, validam a entrada, chamam o serviço e
// devolvem `Resultado<T>`. Nenhuma exceção cru chega ao renderer.
import { ipcMain } from 'electron'
import type { DatabaseSync } from 'node:sqlite'
import type { Categoria, CategoriaResumo, EntradaCategoria, Resultado } from '../../shared/tipos'
import {
  atualizarCategoria,
  criarCategoria,
  definirAtiva,
  excluirCategoria,
  listarCategorias,
  obterCategoria
} from '../servicos/categorias'

const ERRO_DADOS = 'Dados inválidos enviados pela tela.'
const ERRO_INESPERADO = 'Não foi possível concluir a operação.'

export function registrarIpcCategorias(banco: DatabaseSync): void {
  ipcMain.handle('categorias:listar', (): Resultado<CategoriaResumo[]> => {
    try {
      return listarCategorias(banco)
    } catch {
      return { ok: false, erro: ERRO_INESPERADO }
    }
  })

  ipcMain.handle('categorias:obter', (_evento, id: unknown): Resultado<CategoriaResumo> => {
    try {
      if (!ehId(id)) return { ok: false, erro: ERRO_DADOS }
      return obterCategoria(banco, id)
    } catch {
      return { ok: false, erro: ERRO_INESPERADO }
    }
  })

  ipcMain.handle('categorias:criar', (_evento, entrada: unknown): Resultado<Categoria> => {
    try {
      if (!ehEntrada(entrada)) return { ok: false, erro: ERRO_DADOS }
      return criarCategoria(banco, entrada)
    } catch {
      return { ok: false, erro: ERRO_INESPERADO }
    }
  })

  ipcMain.handle('categorias:atualizar', (_evento, entrada: unknown): Resultado<Categoria> => {
    try {
      if (!ehEntradaComId(entrada)) return { ok: false, erro: ERRO_DADOS }
      return atualizarCategoria(banco, entrada)
    } catch {
      return { ok: false, erro: ERRO_INESPERADO }
    }
  })

  ipcMain.handle('categorias:definirAtiva', (_evento, entrada: unknown): Resultado<Categoria> => {
    try {
      if (!ehEntradaAtiva(entrada)) return { ok: false, erro: ERRO_DADOS }
      return definirAtiva(banco, entrada.id, entrada.ativa)
    } catch {
      return { ok: false, erro: ERRO_INESPERADO }
    }
  })

  ipcMain.handle('categorias:excluir', (_evento, id: unknown): Resultado<null> => {
    try {
      if (!ehId(id)) return { ok: false, erro: ERRO_DADOS }
      return excluirCategoria(banco, id)
    } catch {
      return { ok: false, erro: ERRO_INESPERADO }
    }
  })
}

function ehId(id: unknown): id is number {
  return typeof id === 'number' && Number.isInteger(id) && id > 0
}

function ehEntrada(entrada: unknown): entrada is EntradaCategoria {
  if (typeof entrada !== 'object' || entrada === null) return false
  const candidate = entrada as Partial<EntradaCategoria>
  return typeof candidate.nome === 'string' && typeof candidate.contaNoLucro === 'boolean'
}

function ehEntradaComId(entrada: unknown): entrada is EntradaCategoria & { id: number } {
  return ehEntrada(entrada) && ehId((entrada as { id?: unknown }).id)
}

function ehEntradaAtiva(entrada: unknown): entrada is { id: number; ativa: boolean } {
  if (typeof entrada !== 'object' || entrada === null) return false
  const candidate = entrada as { id?: unknown; ativa?: unknown }
  return ehId(candidate.id) && typeof candidate.ativa === 'boolean'
}
