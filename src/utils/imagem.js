// Reduz a imagem no próprio navegador antes de enviar: no máximo `maxLado` px no maior
// lado e re-encodada como JPEG, pra não subir foto de celular de 8 MB pro catálogo.
// Se qualquer passo falhar (formato exótico, navegador sem suporte), devolve o arquivo original.
export async function comprimirImagem(file, maxLado = 1600, qualidade = 0.85) {
  if (!file || !file.type?.startsWith('image/') || file.type === 'image/gif') return file
  try {
    const bitmap = await createImageBitmap(file)
    const maior = Math.max(bitmap.width, bitmap.height)
    const escala = Math.min(1, maxLado / maior)

    // Já é pequena o suficiente — não mexe.
    if (escala === 1 && file.size < 600_000) {
      bitmap.close?.()
      return file
    }

    const w = Math.round(bitmap.width * escala)
    const h = Math.round(bitmap.height * escala)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', qualidade))
    if (!blob) return file

    const nome = (file.name || 'imagem').replace(/\.\w+$/, '') + '.jpg'
    return new File([blob], nome, { type: 'image/jpeg' })
  } catch {
    return file
  }
}
