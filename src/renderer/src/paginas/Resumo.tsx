import { useEffect, useState } from 'react'
import type { AppInfo } from '../../../shared/tipos'

export default function Resumo(): React.JSX.Element {
  const [info, setInfo] = useState<AppInfo | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    window.api.app.info().then((resultado) => {
      if (!vivo) return
      if (resultado.ok) setInfo(resultado.dados)
      else setErro(resultado.erro)
    })
    return () => {
      vivo = false
    }
  }, [])

  return (
    <section>
      <h2>Resumo</h2>
      <p className="em-construcao">Em construção</p>
      <p className="info-minuscula">
        {erro ??
          (info
            ? `Banco de dados: ${info.caminhoBanco} · Versão ${info.versao}`
            : 'Carregando informações…')}
      </p>
    </section>
  )
}
