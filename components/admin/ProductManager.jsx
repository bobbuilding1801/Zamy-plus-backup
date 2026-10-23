'use client'
import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Pencil, Trash2, X, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { formatINR } from '@/lib/store'
import { CATEGORIES, BRANDS } from '@/lib/data'

const empty = () => ({ id:'', name:'', brand:'ZAMY', category:'electronics', subcategory:'Smartphones', price:'', mrp:'', stock:'', description:'', tags:'', images:'', specs:'' })

function specsToString(specs) {
  if (!specs) return ''
  if (typeof specs === 'string') return specs
  return Object.entries(specs).map(([k,v]) => `${k}: ${v}`).join('\n')
}
function stringToSpecs(s) {
  if (!s) return {}
  const obj = {}
  for (const line of s.split('\n')) {
    const idx = line.indexOf(':')
    if (idx > 0) obj[line.slice(0,idx).trim()] = line.slice(idx+1).trim()
  }
  return obj
}

export default function ProductManager({ token, onChanged }) {
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState(CATEGORIES)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty())
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)

  const load = () => {
    setLoading(true)
    fetch('/api/admin/products', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setItems(d.items || []))
      .finally(() => setLoading(false))
  }
  useEffect(() => { if (token) load() }, [token])
  useEffect(() => { fetch('/api/categories').then(r => r.json()).then(d => { if (Array.isArray(d.items)) setCategories(d.items) }).catch(() => {}) }, [])

  const openNew = () => { const first = categories[0]; setEditing(null); setForm({...empty(),category:first?.slug || '',subcategory:first?.subs?.[0] || ''}); setOpen(true) }
  const openEdit = (p) => {
    setEditing(p)
    setForm({
      id: p.id, name: p.name, brand: p.brand, category: p.category, subcategory: p.subcategory,
      price: p.price, mrp: p.mrp, stock: p.stock, description: p.description || '',
      tags: (p.tags || []).join(','),
      images: (p.images || []).join('\n'),
      specs: specsToString(p.specs),
    })
    setOpen(true)
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const body = {
      name: form.name.trim(),
      brand: form.brand,
      category: form.category,
      subcategory: form.subcategory,
      price: Number(form.price),
      mrp: Number(form.mrp || form.price),
      stock: Number(form.stock),
      description: form.description,
      tags: form.tags.split(',').map(s => s.trim()).filter(Boolean),
      images: form.images.split('\n').map(s => s.trim()).filter(Boolean),
      specs: stringToSpecs(form.specs),
    }
    try {
      const url = editing ? `/api/admin/products/${editing.id}` : '/api/admin/products'
      const method = editing ? 'PUT' : 'POST'
      const r = await fetch(url, { method, headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify(body) })
      const d = await r.json()
      if (!d.ok) throw new Error(d.error || 'Failed')
      toast.success(editing ? 'Product updated' : `Product created (#${d.product.id})`)
      setOpen(false); load(); onChanged?.()
    } catch (e) { toast.error(String(e.message || e)) }
    finally { setSaving(false) }
  }

  const doDelete = async () => {
    if (!confirmDel) return
    const p = confirmDel
    setConfirmDel(null)
    try {
      const r = await fetch(`/api/admin/products/${p.id}`, { method:'DELETE', headers:{ Authorization:`Bearer ${token}` } })
      const d = await r.json()
      if (!d.ok) throw new Error('Failed')
      toast.success(`Deleted "${p.name}"`)
      load(); onChanged?.()
    } catch (e) { toast.error(String(e.message || e)) }
  }

  const cat = categories.find(c => c.slug === form.category) || { subs: [] }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-black">Products ({items.length})</h2>
        <Button onClick={openNew} className="rounded-full"><Plus size={14} className="mr-1" /> Add Product</Button>
      </div>
      <div className="rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs uppercase">
            <tr>
              <th className="p-3 text-left">Product</th>
              <th className="p-3">Brand</th>
              <th className="p-3">Category</th>
              <th className="p-3 text-right">Price</th>
              <th className="p-3">Stock</th>
              <th className="p-3">Rating</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No products yet. Click "Add Product".</td></tr>
            ) : items.map(p => (
              <tr key={p.id} className="border-t hover:bg-secondary/30">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <img src={p.images?.[0]} className="h-10 w-10 rounded object-cover" alt="" />
                    <div>
                      <div className="font-semibold line-clamp-1 max-w-[280px]">{p.name}</div>
                      <div className="text-[11px] text-muted-foreground">#{p.id} · {p.sku}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3">{p.brand}</td>
                <td className="p-3 capitalize">{p.subcategory}</td>
                <td className="p-3 text-right font-bold">{formatINR(p.price)}</td>
                <td className="p-3"><Badge variant={p.stock>10?'default':p.stock>0?'secondary':'destructive'}>{p.stock}</Badge></td>
                <td className="p-3">{p.rating?.toFixed(1)} ★</td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => openEdit(p)}><Pencil size={12} /></Button>
                    <Button size="sm" variant="destructive" onClick={() => setConfirmDel(p)}><Trash2 size={12} /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? `Edit Product #${editing.id}` : 'Add New Product'}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label>Product Name</Label>
              <Input value={form.name} onChange={e => setForm({...form, name:e.target.value})} placeholder="e.g. ZAMY Boom XL Bluetooth Speaker" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Brand</Label>
                <Input list="brands" value={form.brand} onChange={e => setForm({...form, brand:e.target.value})} required />
                <datalist id="brands">{BRANDS.map(b => <option key={b} value={b} />)}</datalist>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({...form, category:v, subcategory: (categories.find(c=>c.slug===v)||{}).subs?.[0] || ''})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subcategory</Label>
                <Select value={form.subcategory} onValueChange={v => setForm({...form, subcategory:v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{cat.subs.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tags (comma-separated)</Label>
                <Input value={form.tags} onChange={e => setForm({...form, tags:e.target.value})} placeholder="bestseller, deal, new" />
              </div>
              <div>
                <Label>Price ($)</Label>
                <Input type="number" value={form.price} onChange={e => setForm({...form, price:e.target.value})} required />
              </div>
              <div>
                <Label>MRP ($)</Label>
                <Input type="number" value={form.mrp} onChange={e => setForm({...form, mrp:e.target.value})} placeholder="Optional (defaults to price)" />
              </div>
              <div>
                <Label>Stock</Label>
                <Input type="number" value={form.stock} onChange={e => setForm({...form, stock:e.target.value})} required />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={3} value={form.description} onChange={e => setForm({...form, description:e.target.value})} />
            </div>
            <div>
              <Label>Image URLs (one per line)</Label>
              <Textarea rows={3} value={form.images} onChange={e => setForm({...form, images:e.target.value})} placeholder="https://images.unsplash.com/..." />
              <div className="text-[11px] text-muted-foreground mt-1">Tip: use Unsplash/Pexels URLs. First image is the primary thumbnail.</div>
            </div>
            <div>
              <Label>Specifications (key: value per line)</Label>
              <Textarea rows={4} value={form.specs} onChange={e => setForm({...form, specs:e.target.value})} placeholder={"Power: 40W\nBattery: 20 hrs\nWaterproof: IPX7"} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : (editing ? 'Save changes' : 'Create product')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Delete "{confirmDel?.name}"?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This cannot be undone. The product will be removed from the store and search.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDel(null)}>Cancel</Button>
            <Button variant="destructive" onClick={doDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
