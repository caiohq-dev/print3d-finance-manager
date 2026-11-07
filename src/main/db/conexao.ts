import { app } from 'electron'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

let bancoAtual: DatabaseSync | null = null

/**
 * Caminho do banco em uso:
 * - `FINANCEIRO_DB` (arquivo completo) sobrescreve tudo;
 * - caso contrário `<userData>/dados/financeiro.db`.
 * Em desenvolvimento o `userData` já aponta para a pasta `-dev` (definido
 * no início de `index.ts`, antes de qualquer coisa usar o caminho).
 */
export function caminhoBanco(): string {
  const sobrescrito = process.env.FINANCEIRO_DB
  if (sobrescrito && sobrescrito.trim() !== '') return sobrescrito
  return join(app.getPath('userData'), 'dados', 'financeiro.db')
}

/** Cria as pastas necessárias, abre a conexão e liga as chaves estrangeiras. */
export function abrirConexao(): DatabaseSync {
  if (bancoAtual) return bancoAtual

  const caminho = caminhoBanco()
  mkdirSync(dirname(caminho), { recursive: true })

  const banco = new DatabaseSync(caminho)
  // Sem WAL: o padrão mantém tudo em um único arquivo (facilita backup manual).
  banco.exec('PRAGMA foreign_keys = ON')
  bancoAtual = banco
  return banco
}

/** Fecha a conexão (chamada ao sair do app). */
export function fecharConexao(): void {
  if (bancoAtual) {
    bancoAtual.close()
    bancoAtual = null
  }
}
