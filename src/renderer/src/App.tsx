import { HashRouter, NavLink, Route, Routes } from 'react-router'
import Categorias from './paginas/Categorias'
import CategoriaForm from './paginas/CategoriaForm'
import Despesas from './paginas/Despesas'
import Resumo from './paginas/Resumo'
import Vendas from './paginas/Vendas'

function Layout(): React.JSX.Element {
  return (
    <div className="app">
      <header className="cabecalho">
        <h1>Financeiro — Impressão 3D</h1>
        <nav className="menu">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'ativo' : undefined)}>
            Resumo
          </NavLink>
          <NavLink to="/vendas" className={({ isActive }) => (isActive ? 'ativo' : undefined)}>
            Vendas
          </NavLink>
          <NavLink to="/despesas" className={({ isActive }) => (isActive ? 'ativo' : undefined)}>
            Despesas
          </NavLink>
          <NavLink to="/categorias" className={({ isActive }) => (isActive ? 'ativo' : undefined)}>
            Categorias
          </NavLink>
        </nav>
      </header>
      <main className="conteudo">
        <Routes>
          <Route path="/" element={<Resumo />} />
          <Route path="/vendas" element={<Vendas />} />
          <Route path="/despesas" element={<Despesas />} />
          <Route path="/categorias" element={<Categorias />} />
          <Route path="/categorias/nova" element={<CategoriaForm key="nova" />} />
          <Route path="/categorias/:id/editar" element={<CategoriaForm key="editar" />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App(): React.JSX.Element {
  return (
    <HashRouter>
      <Layout />
    </HashRouter>
  )
}
