import { app, ipcMain } from 'electron'
import type { AppInfo, Resultado } from '../../shared/tipos'
import { caminhoBanco } from '../db/conexao'

// Handlers IPC finos: validam a entrada, chamam o serviço e devolvem
// `Resultado<T>`. Nenhuma exceção cru chega ao renderer.
export function registrarIpcApp(): void {
  // Canal no formato `area:acao`.
  ipcMain.handle('app:info', (): Resultado<AppInfo> => {
    try {
      return {
        ok: true,
        dados: {
          versao: app.getVersion(),
          caminhoBanco: caminhoBanco()
        }
      }
    } catch {
      return { ok: false, erro: 'Não foi possível ler as informações do app.' }
    }
  })
}
