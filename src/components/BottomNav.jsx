import { NavLink } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'

export default function BottomNav() {
  const { itemCount } = useCart()

  return (
    <>
      <nav className="md:hidden bg-surface-container/90 backdrop-blur-2xl border-t border-outline-variant/10 shadow-lg fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-lg pb-safe pt-2 h-20">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center p-2 transition-colors ${
              isActive ? 'text-primary-container' : 'text-on-surface-variant hover:text-primary-fixed-dim'
            }`
          }
        >
          <span className="material-symbols-outlined text-[24px]">home</span>
        </NavLink>
        <NavLink
          to="/"
          className="flex flex-col items-center justify-center p-2 text-on-surface-variant hover:text-primary-fixed-dim transition-colors"
        >
          <span className="material-symbols-outlined text-[24px]">storefront</span>
        </NavLink>
        <NavLink
          to="/carrinho"
          className={({ isActive }) =>
            `relative flex flex-col items-center justify-center rounded-full p-4 -translate-y-4 transition-all duration-200 ${
              isActive
                ? 'bg-primary-container text-on-primary-container scale-110 shadow-[0_0_20px_rgba(204,255,0,0.4)]'
                : 'bg-surface-container-high text-on-surface'
            }`
          }
        >
          <span className="material-symbols-outlined fill text-[28px]">shopping_cart</span>
          {itemCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-error text-on-error text-[10px] font-label-sm w-5 h-5 rounded-full flex items-center justify-center">
              {itemCount}
            </span>
          )}
        </NavLink>
      </nav>
      <div className="h-24 md:hidden" />
    </>
  )
}
