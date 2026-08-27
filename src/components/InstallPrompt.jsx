import { useEffect, useState } from 'react'

const DISMISS_KEY = 'corefit_install_dismissed'

function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !window.MSStream
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [visible, setVisible] = useState(false)
  const [iosHint, setIosHint] = useState(false)

  useEffect(() => {
    if (isStandalone()) return

    let dismissed = false
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      dismissed = false
    }
    if (dismissed) return

    function onBeforeInstall(e) {
      e.preventDefault()
      setDeferredPrompt(e)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    // iOS não dispara beforeinstallprompt — mostramos instrução manual.
    if (isIos()) {
      setIosHint(true)
      setVisible(true)
    }

    function onInstalled() {
      setVisible(false)
      setDeferredPrompt(null)
    }
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  function dismiss() {
    setVisible(false)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // ignore
    }
  }

  async function install() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-gutter pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-md glass-panel rounded-xl border border-outline-variant/30 p-md flex items-center gap-md shadow-2xl bg-surface-container-high">
        <span className="w-10 h-10 shrink-0 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container">
          <span className="material-symbols-outlined fill text-[22px]">bolt</span>
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-label-md text-label-md text-on-surface font-bold">Instalar o app CORE FIT</p>
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            {iosHint
              ? 'Toque em Compartilhar e depois em "Adicionar à Tela de Início".'
              : 'Acesso rápido pela tela inicial, em tela cheia.'}
          </p>
        </div>
        {!iosHint && (
          <button type="button" onClick={install} className="btn-primary shrink-0 py-2 px-4">
            Instalar
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Fechar"
          className="shrink-0 text-on-surface-variant hover:text-on-surface"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
    </div>
  )
}
