import { Link } from 'react-router-dom'
import { formatBRL, totalEstoque } from '../utils/format'
import { LIMITE_ESTOQUE_BAIXO } from '../config'

export default function ProductCard({ produto, featured = false }) {
  const estoque = totalEstoque(produto)
  const semEstoque = estoque <= 0
  const estoqueBaixo = !semEstoque && estoque <= LIMITE_ESTOQUE_BAIXO

  if (featured) {
    return (
      <Link
        to={`/produto/${produto.id}`}
        className="glass-panel rounded-[2rem] overflow-hidden flex flex-col md:col-span-2 group relative"
      >
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 items-start">
          <span className="bg-primary-container text-on-primary-container rounded-full px-3 py-1 font-label-sm text-label-sm font-bold tracking-widest shadow-[0_0_10px_rgba(204,255,0,0.5)]">
            NEW DROP
          </span>
          {estoqueBaixo && (
            <span className="bg-error-container text-on-error-container rounded-full px-3 py-1 font-label-sm text-label-sm font-bold tracking-widest">
              ÚLTIMAS {estoque} UNIDADES
            </span>
          )}
        </div>
        <div className="h-64 md:h-80 w-full relative overflow-hidden bg-surface-container-lowest">
          <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent z-10" />
          <img
            src={produto.imagem_url}
            alt={produto.nome}
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
          />
        </div>
        <div className="p-6 flex flex-col justify-between flex-1 relative z-20 -mt-16">
          <div>
            <h3 className="font-headline-md text-headline-md text-on-surface">{produto.nome}</h3>
            <p className="font-label-sm text-label-sm text-primary-container mt-1 uppercase tracking-wider">
              {produto.descricao?.slice(0, 40) || 'Tecnologia CORE FIT'}
            </p>
          </div>
          <div className="flex items-end justify-between mt-6">
            <span className="font-headline-md text-headline-md text-on-surface font-light">{formatBRL(produto.preco)}</span>
            <span className="w-14 h-14 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center group-hover:scale-105 transition-all shadow-[0_0_20px_rgba(204,255,0,0.3)]">
              <span className="material-symbols-outlined text-[28px] font-bold">add</span>
            </span>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link to={`/produto/${produto.id}`} className="glass-panel rounded-[2rem] overflow-hidden flex flex-col group">
      <div className="h-48 w-full relative overflow-hidden bg-surface-container-lowest">
        <img
          src={produto.imagem_url}
          alt={produto.nome}
          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500 ease-out"
        />
        {semEstoque && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="font-label-sm text-label-sm text-on-surface uppercase tracking-widest border border-white/30 rounded-full px-3 py-1">
              Esgotado
            </span>
          </div>
        )}
        {estoqueBaixo && (
          <span className="absolute top-3 left-3 bg-error-container text-on-error-container rounded-full px-3 py-1 font-label-sm text-label-sm font-bold tracking-widest">
            ÚLTIMAS {estoque}
          </span>
        )}
      </div>
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-headline-md text-[20px] leading-tight text-on-surface">{produto.nome}</h3>
        <p className="font-label-sm text-label-sm text-on-surface-variant mt-1 line-clamp-1">{produto.descricao}</p>
        <div className="flex items-end justify-between mt-auto pt-4">
          <span className="font-headline-md text-[18px] text-on-surface font-light">{formatBRL(produto.preco)}</span>
          <span className="w-10 h-10 rounded-full border border-outline-variant group-hover:border-primary-container text-on-surface group-hover:text-primary-container flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined text-[20px]">add</span>
          </span>
        </div>
      </div>
    </Link>
  )
}
