import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { STORE_NAME } from '../../config'

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', to: '/admin' },
  { key: 'inventory', label: 'Estoque', icon: 'inventory_2', to: '/admin' },
  { key: 'orders', label: 'Pedidos', icon: 'local_shipping', to: '/admin/pedidos' },
]

export default function AdminShell({ children, active, title }) {
  const { signOut, user } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/admin/login')
  }

  return (
    <div className="bg-background text-on-background min-h-screen flex">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col bg-surface-container-lowest h-screen w-72 border-r border-white/5 shadow-xl fixed left-0 top-0 z-40">
        <div className="p-md border-b border-white/5 flex flex-col items-start gap-sm">
          <div className="flex items-center gap-sm mb-md">
            <span className="material-symbols-outlined fill text-primary-fixed">admin_panel_settings</span>
            <h1 className="font-headline-md text-headline-md text-primary-fixed uppercase tracking-tighter">{STORE_NAME}</h1>
          </div>
          <div className="flex items-center gap-sm w-full bg-surface-container p-sm rounded-lg">
            <div className="w-10 h-10 rounded-full bg-surface-bright flex items-center justify-center overflow-hidden shrink-0">
              <span className="material-symbols-outlined text-on-surface-variant">person</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-label-sm text-label-sm text-primary truncate">{user?.email ?? 'Admin'}</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant text-[10px]">Master Access</span>
            </div>
          </div>
        </div>
        <nav className="flex-1 py-md px-sm flex flex-col gap-xs overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              to={item.to}
              className={`px-md py-sm flex items-center gap-sm rounded-full transition-all ${
                active === item.key
                  ? 'bg-primary-container text-on-primary-container font-semibold'
                  : 'text-on-surface-variant hover:bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined" style={active === item.key ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                {item.icon}
              </span>
              <span className="font-body-md text-body-md">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-sm border-t border-white/5">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full text-on-surface-variant hover:text-error px-md py-sm flex items-center gap-sm rounded-full hover:bg-white/5 transition-all"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="font-body-md text-body-md">Sair</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 md:ml-72 flex flex-col min-h-screen relative pb-24 md:pb-0">
        <header className="bg-background/80 backdrop-blur-xl fixed top-0 w-full md:w-[calc(100%-18rem)] z-30 border-b border-white/10 md:border-none flex items-center justify-between px-md py-sm">
          <div className="flex items-center gap-sm md:hidden">
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary-fixed uppercase tracking-tighter">
              {STORE_NAME}
            </h1>
          </div>
          <div className="hidden md:block">
            <h1 className="font-headline-lg text-headline-lg text-primary-fixed tracking-tighter">{title}</h1>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="md:hidden text-on-surface-variant hover:text-error transition-colors"
            aria-label="Sair"
          >
            <span className="material-symbols-outlined">logout</span>
          </button>
        </header>

        <div className="pt-[72px] md:pt-[80px] px-md md:px-lg pb-xl max-w-container-max mx-auto w-full flex flex-col gap-lg">
          {children}
        </div>
      </main>

      {/* Bottom nav mobile */}
      <nav className="md:hidden bg-background/80 backdrop-blur-2xl fixed bottom-0 w-full z-50 border-t border-white/10 flex justify-around items-center px-gutter py-sm pb-safe h-[72px]">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.key}
            to={item.to}
            className={`flex flex-col items-center justify-center p-base rounded-xl transition-colors ${
              active === item.key ? 'text-primary-fixed bg-primary-fixed/10' : 'text-on-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined" style={active === item.key ? { fontVariationSettings: "'FILL' 1" } : undefined}>
              {item.icon}
            </span>
            <span className="font-label-sm text-[10px] mt-1">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
