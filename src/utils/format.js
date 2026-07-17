export function formatBRL(valor) {
  const numero = Number(valor) || 0
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatDate(isoString) {
  if (!isoString) return ''
  return new Date(isoString).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function totalEstoque(produto) {
  if (!Array.isArray(produto?.tamanhos)) return 0
  return produto.tamanhos.reduce((soma, t) => soma + (Number(t.estoque) || 0), 0)
}
