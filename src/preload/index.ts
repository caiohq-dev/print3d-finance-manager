import { contextBridge, ipcRenderer } from 'electron'
import type { Api, AppInfo, Resultado } from '../shared/tipos'

// O renderer fala com o main só por aqui: sem ipcRenderer, fs ou require.
const api: Api = {
  app: {
    info: (): Promise<Resultado<AppInfo>> => ipcRenderer.invoke('app:info')
  },
  categorias: {
    listar: () => ipcRenderer.invoke('categorias:listar'),
    obter: (id: number) => ipcRenderer.invoke('categorias:obter', id),
    criar: (entrada) => ipcRenderer.invoke('categorias:criar', entrada),
    atualizar: (entrada) => ipcRenderer.invoke('categorias:atualizar', entrada),
    definirAtiva: (entrada) => ipcRenderer.invoke('categorias:definirAtiva', entrada),
    excluir: (id: number) => ipcRenderer.invoke('categorias:excluir', id)
  },
  despesas: {
    listar: (mes: string) => ipcRenderer.invoke('despesas:listar', mes),
    obter: (id: number) => ipcRenderer.invoke('despesas:obter', id),
    criar: (entrada) => ipcRenderer.invoke('despesas:criar', entrada),
    atualizar: (entrada) => ipcRenderer.invoke('despesas:atualizar', entrada),
    excluir: (id: number) => ipcRenderer.invoke('despesas:excluir', id)
  }
}

if (!process.contextIsolated) {
  // O app sempre cria a janela com contextIsolation: true; se isso mudar,
  // é erro de programação e nada deve ser exposto.
  throw new Error('contextIsolation está desabilitado — API não exposta ao renderer.')
}

contextBridge.exposeInMainWorld('api', api)
