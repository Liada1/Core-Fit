import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import AdminShell from '../../components/admin/AdminShell.jsx'

const VAZIO = {
  nome: '',
  descricao: '',
  preco: '',
  imagem_url: '',
  galeriaText: '',
  categoria: 'tenis',
  genero: 'unissex',
  destaque: false,
  ativo: true,
}

export default function AdminProdutoForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editando = Boolean(id)

  const [form, setForm] = useState(VAZIO)
  const [cores, setCores] = useState([{ nome: '', hex: '#121212' }])
  const [tamanhos, setTamanhos] = useState([{ tamanho: '', estoque: 0 }])
  const [loading, setLoading] = useState(editando)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    if (!editando) return
    let ativo = true
    async function carregar() {
      setLoading(true)
      const { data, error } = await supabase.from('products').select('*').eq('id', id).single()
      if (!ativo) return
      if (error) {
        setErro(error.message)
      } else {
        setForm({
          nome: data.nome ?? '',
          descricao: data.descricao ?? '',
          preco: String(data.preco ?? ''),
          imagem_url: data.imagem_url ?? '',
          galeriaText: (data.galeria ?? []).join('\n'),
          categoria: data.categoria ?? 'tenis',
          genero: data.genero ?? 'unissex',
          destaque: Boolean(data.destaque),
          ativo: data.ativo !== false,
        })
        setCores(data.cores?.length ? data.cores : [{ nome: '', hex: '#121212' }])
        setTamanhos(data.tamanhos?.length ? data.tamanhos : [{ tamanho: '', estoque: 0 }])
      }
      setLoading(false)
    }
    carregar()
    return () => {
      ativo = false
    }
  }, [id, editando])

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function updateCor(idx, field, value) {
    setCores((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)))
  }
  function addCor() {
    setCores((prev) => [...prev, { nome: '', hex: '#cccccc' }])
  }
  function removeCor(idx) {
    setCores((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateTamanho(idx, field, value) {
    setTamanhos((prev) => prev.map((t, i) => (i === idx ? { ...t, [field]: value } : t)))
  }
  function addTamanho() {
    setTamanhos((prev) => [...prev, { tamanho: '', estoque: 0 }])
  }
  function removeTamanho(idx) {
    setTamanhos((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErro(null)

    if (!form.nome.trim() || !form.preco) {
      setErro('Preencha ao menos nome e preço.')
      return
    }

    const payload = {
      nome: form.nome.trim(),
      descricao: form.descricao.trim(),
      preco: Number(form.preco),
      imagem_url: form.imagem_url.trim(),
      galeria: form.galeriaText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      categoria: form.categoria,
      genero: form.genero,
      destaque: form.destaque,
      ativo: form.ativo,
      cores: cores.filter((c) => c.nome.trim()).map((c) => ({ nome: c.nome.trim(), hex: c.hex })),
      tamanhos: tamanhos
        .filter((t) => String(t.tamanho).trim())
        .map((t) => ({ tamanho: String(t.tamanho).trim(), estoque: Math.max(0, Number(t.estoque) || 0) })),
    }

    setSalvando(true)
    const { error } = editando
      ? await supabase.from('products').update(payload).eq('id', id)
      : await supabase.from('products').insert(payload)
    setSalvando(false)

    if (error) {
      setErro(error.message)
      return
    }
    navigate('/admin')
  }

  async function handleDelete() {
    if (!window.confirm('Excluir este produto permanentemente?')) return
    setSalvando(true)
    const { error } = await supabase.from('products').delete().eq('id', id)
    setSalvando(false)
    if (error) {
      setErro(error.message)
      return
    }
    navigate('/admin')
  }

  if (loading) {
    return (
      <AdminShell active="inventory" title="Produto">
        <div className="flex items-center justify-center py-xl">
          <span className="material-symbols-outlined text-primary-container text-4xl animate-spin">progress_activity</span>
        </div>
      </AdminShell>
    )
  }

  return (
    <AdminShell active="inventory" title={editando ? 'Editar Produto' : 'Novo Produto'}>
      <div className="max-w-4xl mx-auto w-full space-y-lg">
        <div className="flex flex-col gap-base">
          <div className="flex items-center gap-sm text-on-surface-variant font-label-sm text-label-sm uppercase">
            <span>Estoque</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="text-primary-fixed">{editando ? 'Editar Produto' : 'Novo Produto'}</span>
          </div>
          <h2 className="font-headline-md text-headline-md md:font-headline-lg md:text-headline-lg text-primary tracking-tight">
            {editando ? 'Editar Produto' : 'Adicionar Produto'}
          </h2>
        </div>

        <form className="grid grid-cols-1 lg:grid-cols-12 gap-md md:gap-lg" onSubmit={handleSubmit}>
          <div className="lg:col-span-8 space-y-md md:space-y-lg">
            <div className="glass-panel rounded-xl p-md md:p-lg space-y-md">
              <h3 className="font-label-sm text-label-sm text-primary-fixed uppercase border-b border-white/10 pb-sm mb-md">
                Informações Gerais
              </h3>
              <div className="space-y-2">
                <label className="font-label-sm text-label-sm text-on-surface-variant block">Nome do produto</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => updateField('nome', e.target.value)}
                  className="field"
                  placeholder="Ex: Zenith Runner"
                />
              </div>
              <div className="space-y-2">
                <label className="font-label-sm text-label-sm text-on-surface-variant block">Descrição</label>
                <textarea
                  value={form.descricao}
                  onChange={(e) => updateField('descricao', e.target.value)}
                  className="field resize-none"
                  rows={5}
                  placeholder="Detalhes técnicos e diferenciais do produto..."
                />
              </div>
            </div>

            <div className="glass-panel rounded-xl p-md md:p-lg space-y-md">
              <h3 className="font-label-sm text-label-sm text-primary-fixed uppercase border-b border-white/10 pb-sm mb-md">
                Preço &amp; Categoria
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                <div className="space-y-2">
                  <label className="font-label-sm text-label-sm text-on-surface-variant block">Preço (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.preco}
                    onChange={(e) => updateField('preco', e.target.value)}
                    className="field"
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-label-sm text-label-sm text-on-surface-variant block">Categoria</label>
                  <select value={form.categoria} onChange={(e) => updateField('categoria', e.target.value)} className="field">
                    <option value="tenis">Tênis</option>
                    <option value="roupas">Roupas</option>
                    <option value="acessorios">Acessórios</option>
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="font-label-sm text-label-sm text-on-surface-variant block">Gênero</label>
                  <select value={form.genero} onChange={(e) => updateField('genero', e.target.value)} className="field">
                    <option value="unissex">Unissex</option>
                    <option value="homem">Homem</option>
                    <option value="mulher">Mulher</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="glass-panel rounded-xl p-md md:p-lg space-y-md">
              <div className="flex items-center justify-between border-b border-white/10 pb-sm mb-md">
                <h3 className="font-label-sm text-label-sm text-primary-fixed uppercase">Cores Disponíveis</h3>
                <button type="button" onClick={addCor} className="text-primary-container font-label-sm text-label-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Adicionar
                </button>
              </div>
              {cores.map((cor, idx) => (
                <div key={idx} className="flex items-center gap-sm">
                  <input
                    type="color"
                    value={cor.hex}
                    onChange={(e) => updateCor(idx, 'hex', e.target.value)}
                    className="w-10 h-10 rounded-lg border border-white/10 bg-transparent shrink-0"
                  />
                  <input
                    type="text"
                    value={cor.nome}
                    onChange={(e) => updateCor(idx, 'nome', e.target.value)}
                    placeholder="Nome da cor (ex: Preto Stealth / Volt)"
                    className="field flex-1"
                  />
                  <button type="button" onClick={() => removeCor(idx)} className="text-on-surface-variant hover:text-error p-2">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              ))}
            </div>

            <div className="glass-panel rounded-xl p-md md:p-lg space-y-md">
              <div className="flex items-center justify-between border-b border-white/10 pb-sm mb-md">
                <h3 className="font-label-sm text-label-sm text-primary-fixed uppercase">Tamanhos &amp; Estoque</h3>
                <button type="button" onClick={addTamanho} className="text-primary-container font-label-sm text-label-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Adicionar
                </button>
              </div>
              <p className="font-label-sm text-label-sm text-on-surface-variant/70">
                Produtos sem grade de tamanho: use um único item com tamanho "Único".
              </p>
              {tamanhos.map((t, idx) => (
                <div key={idx} className="flex items-center gap-sm">
                  <input
                    type="text"
                    value={t.tamanho}
                    onChange={(e) => updateTamanho(idx, 'tamanho', e.target.value)}
                    placeholder="Tamanho (ex: 40, M, Único)"
                    className="field flex-1"
                  />
                  <input
                    type="number"
                    min="0"
                    value={t.estoque}
                    onChange={(e) => updateTamanho(idx, 'estoque', e.target.value)}
                    placeholder="Estoque"
                    className="field w-32"
                  />
                  <button type="button" onClick={() => removeTamanho(idx)} className="text-on-surface-variant hover:text-error p-2">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-md md:space-y-lg">
            <div className="glass-panel rounded-xl p-md flex items-center justify-between border-l-4 border-l-primary-fixed">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-primary uppercase">Visível na loja</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(e) => updateField('ativo', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary-fixed peer-checked:after:bg-black border border-white/10" />
              </label>
            </div>

            <div className="glass-panel rounded-xl p-md flex items-center justify-between border-l-4 border-l-primary-fixed">
              <span className="font-label-sm text-label-sm text-primary uppercase">Destaque (hero)</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.destaque}
                  onChange={(e) => updateField('destaque', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary-fixed peer-checked:after:bg-black border border-white/10" />
              </label>
            </div>

            <div className="glass-panel rounded-xl p-md md:p-lg space-y-md">
              <h3 className="font-label-sm text-label-sm text-primary-fixed uppercase border-b border-white/10 pb-sm mb-md">
                Imagens
              </h3>
              <div className="relative w-full aspect-square bg-surface-container-lowest rounded-lg border border-dashed border-white/20 overflow-hidden flex items-center justify-center">
                {form.imagem_url ? (
                  <img src={form.imagem_url} alt="Prévia" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-on-surface-variant text-4xl">image</span>
                )}
              </div>
              <div className="space-y-2">
                <label className="font-label-sm text-label-sm text-on-surface-variant block">URL da imagem principal</label>
                <input
                  type="text"
                  value={form.imagem_url}
                  onChange={(e) => updateField('imagem_url', e.target.value)}
                  className="field"
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <label className="font-label-sm text-label-sm text-on-surface-variant block">
                  Galeria (uma URL por linha, opcional)
                </label>
                <textarea
                  value={form.galeriaText}
                  onChange={(e) => updateField('galeriaText', e.target.value)}
                  className="field resize-none"
                  rows={3}
                  placeholder={'https://...\nhttps://...'}
                />
              </div>
            </div>

            {erro && <div className="glass-panel rounded-lg p-md text-error font-label-sm text-label-sm border border-error/30">{erro}</div>}

            <button type="submit" disabled={salvando} className="btn-primary w-full">
              <span className="material-symbols-outlined fill">save</span>
              {salvando ? 'Salvando...' : 'Salvar Produto'}
            </button>

            {editando && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={salvando}
                className="w-full text-error font-label-sm text-label-sm py-3 flex items-center justify-center gap-2 hover:underline"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
                Excluir produto
              </button>
            )}
          </div>
        </form>
      </div>
    </AdminShell>
  )
}
