import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-md px-gutter text-center">
      <span className="material-symbols-outlined text-primary-container text-6xl">search_off</span>
      <h1 className="font-display-lg text-headline-lg text-on-surface">404</h1>
      <p className="text-on-surface-variant font-body-md">Página não encontrada.</p>
      <Link to="/" className="btn-primary mt-md">
        Voltar à loja
      </Link>
    </div>
  )
}
