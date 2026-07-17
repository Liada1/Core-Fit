import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { STORE_NAME } from '../../config'

export default function AdminLogin() {
  const { signIn, session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)

  if (session) {
    navigate(location.state?.from?.pathname ?? '/admin', { replace: true })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      await signIn(email.trim(), senha)
      navigate(location.state?.from?.pathname ?? '/admin', { replace: true })
    } catch (err) {
      setErro('Credenciais inválidas. Verifique o e-mail e a senha.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-gutter bg-black relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary-fixed rounded-full mix-blend-screen filter blur-[120px] opacity-10" />
        <div className="absolute -bottom-40 -right-40 w-[30rem] h-[30rem] bg-surface-bright rounded-full mix-blend-screen filter blur-[150px] opacity-30" />
      </div>

      <div className="w-full max-w-md mx-auto relative z-10">
        <div className="text-center mb-lg">
          <h1 className="font-display-lg text-headline-lg text-primary-fixed mb-sm tracking-tighter">{STORE_NAME}</h1>
          <div className="inline-flex items-center gap-base bg-surface-container-high rounded-full px-md py-base border border-white/10">
            <span className="material-symbols-outlined fill text-primary-fixed">shield_lock</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
              Acesso Administrativo
            </span>
          </div>
        </div>

        <div className="glass-card rounded-lg p-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-fixed to-transparent opacity-50" />

          <form className="flex flex-col gap-md" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-base">
              <label htmlFor="admin-email" className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                E-mail
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant z-10">
                  mail
                </span>
                <input
                  id="admin-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@corefit.com"
                  className="field rounded-full py-md pl-12 pr-md"
                />
              </div>
            </div>

            <div className="flex flex-col gap-base">
              <label htmlFor="admin-pass" className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                Senha
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant z-10">
                  key
                </span>
                <input
                  id="admin-pass"
                  type={mostrarSenha ? 'text' : 'password'}
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••••••"
                  className="field rounded-full py-md pl-12 pr-12 tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute right-md top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary-fixed transition-colors"
                >
                  <span className="material-symbols-outlined">{mostrarSenha ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {erro && <p className="font-label-sm text-label-sm text-error">{erro}</p>}

            <button type="submit" disabled={enviando} className="btn-primary mt-md">
              <span className="material-symbols-outlined fill">login</span>
              {enviando ? 'Entrando...' : 'Acessar Painel'}
            </button>
          </form>

          <div className="mt-lg pt-md border-t border-white/5 flex items-center justify-center gap-base">
            <div className="w-2 h-2 rounded-full bg-primary-fixed animate-pulse" />
            <span className="font-label-sm text-label-sm text-on-surface-variant">SISTEMA ONLINE</span>
          </div>
        </div>

        <div className="mt-lg text-center">
          <p className="font-label-sm text-label-sm text-on-surface-variant/50 uppercase">
            Restrito a pessoal autorizado {STORE_NAME} HQ.
          </p>
        </div>
      </div>
    </main>
  )
}
