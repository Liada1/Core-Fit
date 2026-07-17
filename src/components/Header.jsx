import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { STORE_NAME } from '../config'

export default function Header({ searchValue, onSearchChange }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const navigate = useNavigate()
  const searchable = typeof onSearchChange === 'function'

  function handleSearchClick() {
    if (!searchable) {
      navigate('/')
      return
    }
    setSearchOpen((open) => !open)
  }

  return (
    <header className="bg-surface/80 backdrop-blur-xl border-b border-outline-variant/20 sticky top-0 w-full z-40">
      <div className="bg-primary-container text-on-primary-container text-center py-1 font-label-sm text-label-sm font-bold tracking-widest uppercase">
        Frete grátis em todo o site · 5% OFF no Pix
      </div>
      <div className="flex justify-between items-center w-full max-w-container-max mx-auto gap-sm px-gutter py-md">
        <Link to="/" className="flex items-center gap-sm shrink-0">
          <span className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container">
            <span className="material-symbols-outlined fill text-[20px]">bolt</span>
          </span>
          <span className="text-headline-md font-headline-md font-extrabold text-primary-container tracking-tighter">
            {STORE_NAME}
          </span>
        </Link>

        {searchable && searchOpen && (
          <input
            autoFocus
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar produtos..."
            className="field flex-1 max-w-xs py-2"
          />
        )}

        <button
          type="button"
          onClick={handleSearchClick}
          aria-label="Buscar"
          className="text-on-surface-variant hover:text-primary-container transition-colors active:scale-95 shrink-0"
        >
          <span className="material-symbols-outlined text-[28px]">{searchOpen ? 'close' : 'search'}</span>
        </button>
      </div>
    </header>
  )
}
