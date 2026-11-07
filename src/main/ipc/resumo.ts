// Handler IPC do resumo mensal: fino, valida a entrada, chama o serviço e
// devolve `Resultado<T>`. Nenhuma exceção crua chega ao renderer.
import { ipcMain } from 'electron'
import type { DatabaseSync } from 'node:sqlite'
import type { ResumoMensal, Resultado } from '../../shared/tipos'
import { obterResumo } from '../servicos/resumo'

const ERRO_DADOS = 'Dados inválidos enviados pela tela.'
const ERRO_INESPERADO = 'Não foi possível carregar o resumo.'

export function registrarIpcResumo(banco: DatabaseSync): void {
  ipcMain.handle('resumo:obter', (_evento, mes: unknown): Resultado<ResumoMensal> => {
    try {
      if (typeof mes !== 'string') return { ok: false, erro: ERRO_DADOS }
      return obterResumo(banco, mes)
    } catch {
      return { ok: false, erro: ERRO_INESPERADO }
    }
  })
}
