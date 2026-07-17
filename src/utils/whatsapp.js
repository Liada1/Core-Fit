import { WHATSAPP_NUMBER, STORE_NAME } from '../config'
import { formatBRL } from './format'

export function buildOrderMessage({ pedidoId, cliente, telefone, itens, subtotal, total, formaEntrega, endereco, formaPagamento }) {
  const linhas = []

  linhas.push(`*NOVO PEDIDO — ${STORE_NAME}*`)
  if (pedidoId) linhas.push(`Pedido: #${pedidoId.slice(0, 8).toUpperCase()}`)
  linhas.push('')
  linhas.push('*Itens:*')

  itens.forEach((item) => {
    const variacao = [item.tamanho && `Tam ${item.tamanho}`, item.cor].filter(Boolean).join(' / ')
    linhas.push(
      `• ${item.quantidade}x ${item.nome}${variacao ? ` (${variacao})` : ''} — ${formatBRL(item.preco_unitario * item.quantidade)}`
    )
  })

  linhas.push('')
  linhas.push(`Subtotal: ${formatBRL(subtotal)}`)
  linhas.push(`*Total: ${formatBRL(total)}*`)
  linhas.push('')
  linhas.push('*Dados do cliente:*')
  linhas.push(`Nome: ${cliente}`)
  linhas.push(`Telefone: ${telefone}`)
  linhas.push('')
  linhas.push(`Entrega: ${formaEntrega === 'retirada' ? 'Retirada na loja' : 'Entrega no endereço'}`)
  if (formaEntrega === 'entrega' && endereco) {
    linhas.push(`Endereço: ${endereco}`)
  }
  linhas.push(`Pagamento: ${formaPagamento === 'pix' ? 'Pix' : 'Cartão de Crédito'}`)

  return linhas.join('\n')
}

export function buildWhatsAppLink(message, numero = WHATSAPP_NUMBER) {
  return `https://wa.me/${numero}?text=${encodeURIComponent(message)}`
}
