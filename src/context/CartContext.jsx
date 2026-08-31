import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const CartContext = createContext(null)
const STORAGE_KEY = 'corefit_cart'

function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function lineKey(produtoId, tamanho, cor) {
  return `${produtoId}__${tamanho ?? ''}__${cor ?? ''}`
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  function addItem(produto, { tamanho, cor, quantidade = 1 }) {
    // estoqueDisponivel = null significa "sem controle de estoque para esta variação"
    // (produto ainda não configurado com grade de tamanhos) — nesse caso não travamos a quantidade em 0.
    // Quando o produto controla estoque por cor, cada linha de `tamanhos` traz um campo `cor`
    // e a disponibilidade depende da combinação cor + tamanho escolhida.
    const usaCorNoEstoque = (produto.tamanhos ?? []).some((t) => (t.cor ?? '').trim() !== '')
    const tamanhoInfo = produto.tamanhos?.find(
      (t) => t.tamanho === tamanho && (!usaCorNoEstoque || (t.cor ?? '') === (cor ?? ''))
    )
    const estoqueDisponivel = tamanhoInfo ? Number(tamanhoInfo.estoque) || 0 : null
    const id = lineKey(produto.id, tamanho, cor)

    setItems((prev) => {
      const existente = prev.find((item) => item.lineId === id)
      if (existente) {
        const somaQtd = existente.quantidade + quantidade
        const novaQtd = estoqueDisponivel != null ? Math.min(somaQtd, estoqueDisponivel) : somaQtd
        return prev.map((item) => (item.lineId === id ? { ...item, quantidade: novaQtd, estoqueDisponivel } : item))
      }
      return [
        ...prev,
        {
          lineId: id,
          produtoId: produto.id,
          nome: produto.nome,
          imagemUrl: produto.imagem_url,
          preco: Number(produto.preco) || 0,
          tamanho: tamanho ?? null,
          cor: cor ?? null,
          quantidade: estoqueDisponivel != null ? Math.min(quantidade, estoqueDisponivel) : quantidade,
          estoqueDisponivel,
        },
      ]
    })
  }

  function updateQuantidade(lineId, delta) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.lineId !== lineId) return item
        const max = item.estoqueDisponivel != null ? item.estoqueDisponivel : 99
        const novaQtd = Math.min(max, Math.max(1, item.quantidade + delta))
        return { ...item, quantidade: novaQtd }
      })
    )
  }

  function removeItem(lineId) {
    setItems((prev) => prev.filter((item) => item.lineId !== lineId))
  }

  function clearCart() {
    setItems([])
  }

  const subtotal = useMemo(() => items.reduce((soma, item) => soma + item.preco * item.quantidade, 0), [items])
  const itemCount = useMemo(() => items.reduce((soma, item) => soma + item.quantidade, 0), [items])

  const value = { items, addItem, updateQuantidade, removeItem, clearCart, subtotal, itemCount }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart deve ser usado dentro de <CartProvider>')
  return ctx
}
