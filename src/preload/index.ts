import { contextBridge, ipcRenderer } from 'electron'
import type { Api, AppInfo, Resultado } from '../shared/tipos'

// O renderer fala com o main só por aqui: sem ipcRenderer, fs ou require.
const api: Api = {
  app: {
    info: (): Promise<Resultado<AppInfo>> => ipcRenderer.invoke('app:info')
  }
}

if (!process.contextIsolated) {
  // O app sempre cria a janela com contextIsolation: true; se isso mudar,
  // é erro de programação e nada deve ser exposto.
  throw new Error('contextIsolation está desabilitado — API não exposta ao renderer.')
}

contextBridge.exposeInMainWorld('api', api)
