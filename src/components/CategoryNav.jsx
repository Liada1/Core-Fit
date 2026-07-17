import { CATEGORIAS } from '../config'

export default function CategoryNav({ ativo, onSelect }) {
  return (
    <>
      {/* Mobile: scroll horizontal de chips */}
      <nav className="w-full overflow-x-auto px-gutter py-sm my-md flex md:hidden gap-sm no-scrollbar">
        {CATEGORIAS.map((cat) => (
          <button
            key={cat.valor}
            type="button"
            onClick={() => onSelect(cat.valor)}
            className={`chip ${ativo === cat.valor ? 'chip-active' : ''}`}
          >
            <span className="material-symbols-outlined text-[18px]">{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </nav>

      {/* Desktop: sidebar fixa */}
      <aside className="hidden md:flex w-64 flex-col bg-surface-container rounded-r-lg shadow-xl p-md gap-sm mt-lg sticky top-[96px] h-fit z-30">
        <h2 className="text-primary-container font-headline-md text-headline-md mb-4 px-4">CATEGORIAS</h2>
        {CATEGORIAS.map((cat) => (
          <button
            key={cat.valor}
            type="button"
            onClick={() => onSelect(cat.valor)}
            className={`rounded-full px-4 py-3 flex items-center gap-3 text-label-sm font-label-sm transition-colors text-left w-full ${
              ativo === cat.valor
                ? 'bg-primary-container text-on-primary-container shadow-[0_0_15px_rgba(204,255,0,0.2)]'
                : 'text-on-surface-variant hover:bg-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined">{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </aside>
    </>
  )
}
