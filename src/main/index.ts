import { BrowserWindow, Menu, app } from 'electron'
import { join } from 'node:path'
import { abrirConexao, fecharConexao } from './db/conexao'
import { migrar } from './db/migrar'
import { registrarIpcApp } from './ipc/app'
import { registrarIpcCategorias } from './ipc/categorias'
import { registrarIpcDespesas } from './ipc/despesas'

const emDesenvolvimento = !app.isPackaged

// Em desenvolvimento os dados ficam numa pasta separada (`-dev`) para nunca
// encostar nos dados reais. Precisa acontecer antes de qualquer uso do caminho.
if (emDesenvolvimento) {
  app.setPath('userData', `${app.getPath('userData')}-dev`)
}

// Uma instância só: uma segunda abertura apenas foca a primeira.
const podeRodar = app.requestSingleInstanceLock()
if (!podeRodar) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const janela = BrowserWindow.getAllWindows()[0]
    if (!janela) return
    if (janela.isMinimized()) janela.restore()
    janela.focus()
  })

  app.whenReady().then(() => {
    app.setAppUserModelId('com.impressao3d.financeiro')

    // Menu padrão do Electron só em desenvolvimento (devtools e recarregar).
    if (!emDesenvolvimento) Menu.setApplicationMenu(null)

    // Banco: conexão + migrations antes de abrir a janela.
    const banco = abrirConexao()
    migrar(banco)
    registrarIpcApp()
    registrarIpcCategorias(banco)
    registrarIpcDespesas(banco)

    criarJanela()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) criarJanela()
    })
  })

  app.on('will-quit', () => {
    fecharConexao()
  })
}

function criarJanela(): BrowserWindow {
  const janela = new BrowserWindow({
    width: 1024,
    height: 700,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true
    }
  })

  janela.on('ready-to-show', () => janela.show())

  // Nada de janelas novas (nem links externos: o app é 100% offline).
  janela.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  // Nada de navegação para fora da página local.
  janela.webContents.on('will-navigate', (evento) => evento.preventDefault())

  // DevTools só em desenvolvimento.
  janela.webContents.on('before-input-event', (evento, entrada) => {
    if (emDesenvolvimento || entrada.type !== 'keyDown') return
    const tecla = entrada.key.toLowerCase()
    const devtools = entrada.key === 'F12' || (entrada.shift && entrada.control && tecla === 'i')
    const recarregar = (entrada.control || entrada.meta) && tecla === 'r'
    if (devtools || recarregar) evento.preventDefault()
  })
  janela.webContents.on('devtools-opened', () => {
    if (!emDesenvolvimento) janela.webContents.closeDevTools()
  })

  // HMR em desenvolvimento; arquivo local no app compilado.
  if (emDesenvolvimento && process.env.ELECTRON_RENDERER_URL) {
    janela.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    janela.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return janela
}
