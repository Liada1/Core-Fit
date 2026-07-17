import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import Header from '../components/Header.jsx'
import BottomNav from '../components/BottomNav.jsx'
import { formatBRL } from '../utils/format'
import { FRETE_PADRAO } from '../config'

export default function Carrinho() {
  const { items, updateQuantidade, removeItem, subtotal, itemCount } = useCart()
  const navigate = useNavigate()

  const frete = items.length > 0 ? FRETE_PADRAO : 0
  const total = subtotal + frete

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow w-full max-w-container-max mx-auto px-gutter py-lg flex flex-col gap-lg">
        <div className="flex items-center justify-between">
          <h1 className="font-display-lg text-headline-lg text-primary-container tracking-tighter uppercase">Carrinho</h1>
          <span className="font-label-sm text-label-sm text-on-surface-variant border border-outline-variant rounded-full px-4 py-1">
            {itemCount} {itemCount === 1 ? 'ITEM' : 'ITENS'}
          </span>
        </div>

        {items.length === 0 ? (
          <div className="glass-panel rounded-lg p-xl flex flex-col items-center justify-center text-center gap-md border border-dashed border-outline-variant/50">
            <span className="material-symbols-outlined text-[64px] text-surface-variant mb-sm">production_quantity_limits</span>
            <h3 className="font-headline-lg text-headline-lg text-primary opacity-50">Carrinho Vazio</h3>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
              Seu carrinho está vazio. Descubra nossos mais recentes equipamentos de alta performance e eleve seu treino.
            </p>
            <Link to="/" className="btn-secondary mt-sm">
              <span className="material-symbols-outlined text-[18px]">storefront</span>
              Começar a Comprar
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
            <div className="lg:col-span-8 flex flex-col gap-md">
              {items.map((item) => (
                <div
                  key={item.lineId}
                  className="glass-panel rounded-lg p-md flex flex-col sm:flex-row gap-md items-start sm:items-center relative group transition-all duration-300 hover:bg-surface-container-high"
                >
                  <div className="w-full sm:w-32 aspect-square rounded overflow-hidden bg-surface-variant shrink-0">
                    <img src={item.imagemUrl} alt={item.nome} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-grow flex flex-col gap-xs w-full">
                    <div className="flex justify-between items-start w-full gap-sm">
                      <h3 className="font-headline-md text-headline-md text-primary">{item.nome}</h3>
                      <button
                        type="button"
                        onClick={() => removeItem(item.lineId)}
                        className="text-on-surface-variant hover:text-error transition-colors p-2 -mr-2 -mt-2"
                        aria-label="Remover"
                      >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                      </button>
                    </div>
                    {(item.tamanho || item.cor) && (
                      <p className="font-label-sm text-label-sm text-on-surface-variant">
                        {[item.tamanho && `TAMANHO: ${item.tamanho}`, item.cor && `COR: ${item.cor}`].filter(Boolean).join(' | ')}
                      </p>
                    )}
                    <div className="flex justify-between items-end mt-sm w-full">
                      <div className="flex items-center gap-sm bg-surface-container rounded-full p-1 border border-outline-variant/30">
                        <button
                          type="button"
                          onClick={() => updateQuantidade(item.lineId, -1)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface hover:bg-surface-variant transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">remove</span>
                        </button>
                        <span className="font-label-sm text-label-sm w-4 text-center">{item.quantidade}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantidade(item.lineId, 1)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface hover:bg-surface-variant transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">add</span>
                        </button>
                      </div>
                      <p className="font-headline-md text-headline-md text-primary-container">
                        {formatBRL(item.preco * item.quantidade)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-4">
              <div className="glass-panel rounded-lg p-lg flex flex-col gap-md sticky top-32">
                <h2 className="font-headline-md text-headline-md text-primary mb-sm">Resumo do Pedido</h2>
                <div className="flex flex-col gap-sm border-b border-outline-variant/20 pb-md">
                  <div className="flex justify-between items-center">
                    <span className="font-body-md text-body-md text-on-surface-variant">Subtotal</span>
                    <span className="font-label-sm text-label-sm text-primary">{formatBRL(subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-body-md text-body-md text-on-surface-variant">Entrega</span>
                    <span className="font-label-sm text-label-sm text-primary-container font-bold uppercase">
                      {frete === 0 ? 'Grátis' : formatBRL(frete)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-end pt-sm">
                  <span className="font-headline-md text-headline-md text-primary">Total</span>
                  <span className="font-display-lg text-headline-lg text-primary-container tracking-tighter">{formatBRL(total)}</span>
                </div>
                <button type="button" onClick={() => navigate('/checkout')} className="btn-primary mt-md">
                  Finalizar pedido
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
                <div className="flex items-center justify-center gap-sm mt-sm opacity-50">
                  <span className="material-symbols-outlined text-[16px]">lock</span>
                  <span className="font-label-sm text-label-sm uppercase">Checkout Seguro</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
