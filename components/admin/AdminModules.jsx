'use client'
import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { formatINR } from '@/lib/store'
import { Plus, Trash2, Pencil, Send, ArrowLeft } from 'lucide-react'

const STATUSES = ['confirmed','packed','shipped','out','delivered','cancelled']
const STATUS_LABEL = { confirmed:'Confirmed', packed:'Packed', shipped:'Shipped', out:'Out for Delivery', delivered:'Delivered', cancelled:'Cancelled' }

export function AdminOrdersTable({ token, initialOrders = [] }) {
  const [orders, setOrders] = useState(initialOrders)
  const [saving, setSaving] = useState(null)

  useEffect(() => { setOrders(initialOrders) }, [initialOrders])

  const setStatus = async (id, status) => {
    setSaving(id)
    try {
      const r = await fetch(`/api/admin/orders/${id}`, { method:'PUT', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`}, body: JSON.stringify({ status })})
      const d = await r.json()
      if (!d.ok) throw new Error(d.error || 'Failed')
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
      toast.success(`Order #${id} → ${STATUS_LABEL[status]}`)
    } catch (e) { toast.error(String(e.message || e)) }
    finally { setSaving(null) }
  }

  return (
    <div className="rounded-2xl border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-secondary/50 text-xs uppercase">
          <tr><th className="p-3 text-left">Order</th><th className="p-3 text-left">Customer</th><th className="p-3 text-left">Product</th><th className="p-3 text-right">Total</th><th className="p-3">Status</th><th className="p-3">Action</th></tr>
        </thead>
        <tbody>{orders.map(o => (
          <tr key={o.id} className="border-t hover:bg-secondary/30">
            <td className="p-3"><div className="font-bold">#{o.id}</div><div className="text-[11px] text-muted-foreground">{new Date(o.createdAt).toLocaleString()}</div></td>
            <td className="p-3">{o.customer}<div className="text-xs text-muted-foreground">{o.email}</div></td>
            <td className="p-3"><div className="flex items-center gap-2">{o.image && <img src={o.image} className="h-8 w-8 rounded object-cover" alt="" />}<span className="line-clamp-1 max-w-[240px]">{o.product}</span></div></td>
            <td className="p-3 text-right font-bold">{formatINR(o.total)}</td>
            <td className="p-3">
              <select aria-label={`Status for order ${o.id}`} value={o.status} onChange={(e) => setStatus(o.id, e.target.value)} disabled={saving===o.id} className="w-[145px] h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground disabled:opacity-50">
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </td>
            <td className="p-3"><a href={`/track/${o.id}`} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary hover:underline">Track</a></td>
          </tr>
        ))}
        {orders.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No orders yet.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

export function AdminCoupons({ token }) {
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ code:'', discount:'10%', min:'0', cap:'—' })

  const load = () => fetch('/api/admin/coupons', { headers: { Authorization:`Bearer ${token}` }}).then(r=>r.json()).then(d => setItems(d.items||[]))
  useEffect(() => { if (token) load() }, [token])

  const save = async (e) => {
    e.preventDefault()
    try {
      const r = await fetch('/api/admin/coupons', { method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`}, body: JSON.stringify({ code: form.code, discount: form.discount, min: Number(form.min||0), cap: form.cap })})
      const d = await r.json()
      if (!d.ok) throw new Error(d.error || 'Failed')
      toast.success('Coupon saved')
      setOpen(false); setForm({ code:'', discount:'10%', min:'0', cap:'—' }); load()
    } catch (e) { toast.error(String(e.message || e)) }
  }

  const del = async (code) => {
    if (!confirm(`Delete coupon ${code}?`)) return
    await fetch(`/api/admin/coupons/${encodeURIComponent(code)}`, { method:'DELETE', headers: { Authorization:`Bearer ${token}` }})
    toast.success('Deleted')
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3"><h2 className="text-xl font-black">Coupons</h2><Button onClick={() => setOpen(true)} className="rounded-full"><Plus size={14} className="mr-1" /> New Coupon</Button></div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">{items.map(c => (
        <div key={c.code} className="relative rounded-2xl border p-5 bg-gradient-to-br from-yellow-400 to-yellow-300 text-black">
          <div className="text-xs font-bold uppercase tracking-widest">{c.discount}</div>
          <div className="text-2xl font-black mt-1">{c.code}</div>
          <div className="text-xs mt-2">Min order: {c.min ? formatINR(c.min) : '—'}</div>
          <div className="text-xs">Cap: {c.cap || '—'}</div>
          <div className="text-xs mt-3">Used {(c.uses||0).toLocaleString()} times</div>
          <button onClick={() => del(c.code)} className="absolute top-3 right-3 h-7 w-7 grid place-items-center rounded-full bg-black/10 hover:bg-red-100"><Trash2 size={12} /></button>
        </div>
      ))}</div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Coupon</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div><Label>Code</Label><Input value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} placeholder="SUMMER25" required /></div>
            <div><Label>Discount (e.g. 10%, $500, Free shipping)</Label><Input value={form.discount} onChange={e => setForm({...form, discount: e.target.value})} required /></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Min order ($)</Label><Input type="number" value={form.min} onChange={e => setForm({...form, min: e.target.value})} /></div><div><Label>Cap</Label><Input value={form.cap} onChange={e => setForm({...form, cap: e.target.value})} placeholder="$2000 or —" /></div></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit">Create</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function AdminReviews({ token, initialReviews = [] }) {
  const [reviews, setReviews] = useState(initialReviews)
  useEffect(() => { setReviews(initialReviews) }, [initialReviews])

  const setStatus = async (id, status) => {
    try {
      const r = await fetch(`/api/admin/reviews/${id}`, { method:'PUT', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`}, body: JSON.stringify({ status })})
      const d = await r.json()
      if (!d.ok) throw new Error('Failed')
      setReviews(prev => prev.map(x => x.id === id ? { ...x, status } : x))
      toast.success('Review ' + status)
    } catch (e) { toast.error(String(e.message || e)) }
  }
  const del = async (id) => {
    if (!confirm('Delete this review?')) return
    await fetch(`/api/admin/reviews/${id}`, { method:'DELETE', headers: { Authorization:`Bearer ${token}` }})
    setReviews(prev => prev.filter(x => x.id !== id))
    toast.success('Deleted')
  }

  return (
    <div>
      <h2 className="text-xl font-black mb-3">Reviews Moderation</h2>
      <div className="space-y-2">{reviews.map(r => (
        <div key={r.id} className="rounded-2xl border p-4 flex flex-col md:flex-row md:items-center gap-3">
          {r.image && <img src={r.image} className="h-14 w-14 rounded object-cover" alt="" />}
          <div className="flex-1"><div className="font-bold text-sm line-clamp-1">{r.product}</div><div className="text-xs text-muted-foreground">{r.name} · {r.rating}★</div><div className="text-sm mt-1 line-clamp-2">{r.body}</div></div>
          <Badge variant={r.status==='approved'?'default':'secondary'}>{r.status || 'approved'}</Badge>
          <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setStatus(r.id, 'approved')}>Approve</Button><Button size="sm" variant="destructive" onClick={() => del(r.id)}>Delete</Button></div>
        </div>
      ))}
      {reviews.length === 0 && <div className="text-muted-foreground text-sm text-center py-8">No reviews yet.</div>}
      </div>
    </div>
  )
}

export function AdminReports() {
  const download = async (kind) => {
    const url = `/api/admin/reports/${kind}`
    const r = await fetch(url, { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('zamy_auth_v1')||'{}').token}` }})
    if (!r.ok) return toast.error('Report failed')
    const blob = await r.blob()
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `zamy-${kind}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }
  return (
    <div>
      <h2 className="text-xl font-black mb-3">Reports</h2>
      <div className="grid md:grid-cols-2 gap-4">
        {[
          { k:'orders', t:'Orders Report' },
          { k:'products', t:'Product Catalog' },
          { k:'customers', t:'Customer List' },
        ].map(r => (
          <div key={r.k} className="rounded-2xl border p-5 flex items-center justify-between">
            <div><div className="font-bold">{r.t}</div><div className="text-xs text-muted-foreground">Live from database</div></div>
            <Button size="sm" variant="outline" onClick={() => download(r.k)}>Download CSV</Button>
          </div>
        ))}
      </div>
    </div>
  )
}

const RMA_STATUSES = ['requested','approved','picked','refunded','rejected']
const RMA_LABEL = { requested:'Requested', approved:'Approved', picked:'Picked Up', refunded:'Refunded', rejected:'Rejected' }
const RMA_COLOR = {
  requested: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300',
  approved:  'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
  picked:    'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300',
  refunded:  'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300',
  rejected:  'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300',
}

export function AdminReturns({ token }) {
  const [items, setItems] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const load = () => fetch('/api/admin/returns', { headers: { Authorization:`Bearer ${token}` }}).then(r=>r.json()).then(d => { setItems(d.items || []); setLoading(false) })
  useEffect(() => { if (token) load() }, [token])

  const setStatus = async (id, status) => {
    try {
      const r = await fetch(`/api/admin/returns/${id}`, { method:'PUT', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`}, body: JSON.stringify({ status })})
      const d = await r.json()
      if (!d.ok) throw new Error(d.error || 'Failed')
      toast.success(`${id} → ${RMA_LABEL[status]}`)
      load()
    } catch (e) { toast.error(String(e.message || e)) }
  }

  const view = filter === 'all' ? items : items.filter(x => x.status === filter)
  const stats = RMA_STATUSES.reduce((acc, s) => { acc[s] = items.filter(x => x.status === s).length; return acc }, {})
  const totalRefunded = items.filter(x => x.status === 'refunded').reduce((s,x) => s + (x.amount || 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black">Returns &amp; Refunds</h2>
        <div className="text-xs text-muted-foreground">Total refunded: <b className="text-foreground">{formatINR(totalRefunded)}</b></div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        <button onClick={() => setFilter('all')} className={`rounded-2xl border p-3 text-left ${filter==='all'?'border-primary bg-primary/5':''}`}>
          <div className="text-[10px] uppercase font-bold text-muted-foreground">All</div>
          <div className="text-xl font-black">{items.length}</div>
        </button>
        {RMA_STATUSES.map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-2xl border p-3 text-left ${filter===s?'border-primary bg-primary/5':''}`}>
            <div className="text-[10px] uppercase font-bold text-muted-foreground">{RMA_LABEL[s]}</div>
            <div className="text-xl font-black">{stats[s] || 0}</div>
          </button>
        ))}
      </div>
      <div className="rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs uppercase"><tr><th className="p-3 text-left">RMA</th><th className="p-3 text-left">Customer</th><th className="p-3 text-left">Item</th><th className="p-3">Mode</th><th className="p-3 text-right">Amount</th><th className="p-3">Status</th></tr></thead>
          <tbody>
            {view.map(r => (
              <tr key={r.id} className="border-t hover:bg-secondary/30 align-middle">
                <td className="p-3"><div className="font-bold">{r.id}</div><div className="text-[11px] text-muted-foreground">#{r.orderId} · {new Date(r.createdAt).toLocaleDateString()}</div></td>
                <td className="p-3 text-xs">{r.email}</td>
                <td className="p-3"><div className="flex items-center gap-2 max-w-[280px]">{r.productImage && <img src={r.productImage} className="h-8 w-8 rounded object-cover" alt="" />}<span className="line-clamp-2">{r.productName}</span></div><div className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{r.reason}</div></td>
                <td className="p-3 text-xs capitalize">{r.mode || 'refund'}</td>
                <td className="p-3 text-right font-bold">{formatINR(r.amount || 0)}</td>
                <td className="p-3">
                  <Select value={r.status} onValueChange={(v) => setStatus(r.id, v)}>
                    <SelectTrigger className="w-[140px] h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>{RMA_STATUSES.map(s => <SelectItem key={s} value={s}>{RMA_LABEL[s]}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
              </tr>
            ))}
            {!loading && view.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No return requests {filter!=='all' ? `in "${RMA_LABEL[filter]}"` : 'yet'}.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const TKT_STATUSES = ['open','pending','resolved','closed']
const TKT_LABEL = { open:'Open', pending:'Pending', resolved:'Resolved', closed:'Closed' }
const TKT_COLOR = {
  open:     'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300',
  pending:  'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300',
  closed:   'bg-gray-100 text-gray-800 dark:bg-gray-800/40 dark:text-gray-300',
}

export function AdminTickets({ token }) {
  const [items, setItems] = useState([])
  const [active, setActive] = useState(null)
  const [reply, setReply] = useState('')
  const [filter, setFilter] = useState('all')
  const load = () => fetch('/api/admin/tickets', { headers: { Authorization:`Bearer ${token}` }}).then(r=>r.json()).then(d => setItems(d.items || []))
  useEffect(() => { if (token) load() }, [token])

  const setStatus = async (id, status) => {
    await fetch(`/api/admin/tickets/${id}`, { method:'PUT', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`}, body: JSON.stringify({ status })})
    toast.success('Status → ' + TKT_LABEL[status])
    load(); if (active?.id === id) setActive(prev => ({ ...prev, status }))
  }
  const sendReply = async () => {
    if (!reply.trim() || !active) return
    const r = await fetch(`/api/admin/tickets/${active.id}/reply`, { method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`}, body: JSON.stringify({ message: reply })})
    const d = await r.json()
    if (!d.ok) return toast.error(d.error || 'Failed')
    setReply('')
    const r2 = await fetch('/api/admin/tickets', { headers: { Authorization:`Bearer ${token}` }})
    const d2 = await r2.json()
    setItems(d2.items || [])
    setActive((d2.items || []).find(t => t.id === active.id) || active)
  }

  if (active) {
    return (
      <div className="space-y-4">
        <button onClick={() => setActive(null)} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><ArrowLeft size={14} /> Back to tickets</button>
        <div className="rounded-2xl border bg-card">
          <div className="p-4 border-b flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="font-black">{active.subject}</div>
              <div className="text-xs text-muted-foreground">{active.id} · {active.email} · {active.category}{active.orderId && ` · Order #${active.orderId}`}</div>
            </div>
            <div className="flex gap-2 items-center">
              <Select value={active.status} onValueChange={(v) => setStatus(active.id, v)}>
                <SelectTrigger className="w-[130px] h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{TKT_STATUSES.map(s => <SelectItem key={s} value={s}>{TKT_LABEL[s]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="p-4 space-y-3 max-h-[480px] overflow-y-auto">
            {active.messages?.map(m => (
              <div key={m.id} className={`flex ${m.from === 'agent' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${m.from === 'agent' ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-secondary rounded-bl-sm'}`}>
                  <div className="whitespace-pre-wrap">{m.text}</div>
                  <div className="text-[10px] opacity-70 mt-1">{m.from === 'agent' ? 'You' : (m.by || 'Customer')} · {new Date(m.at).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
          {active.status !== 'closed' && (
            <div className="p-3 border-t flex gap-2">
              <Input value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => e.key==='Enter' && sendReply()} placeholder="Reply to customer…" />
              <Button onClick={sendReply}><Send size={14} className="mr-1" /> Send</Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  const view = filter === 'all' ? items : items.filter(x => x.status === filter)
  const stats = TKT_STATUSES.reduce((acc, s) => { acc[s] = items.filter(x => x.status === s).length; return acc }, {})

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black">Support Tickets</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <button onClick={() => setFilter('all')} className={`rounded-2xl border p-3 text-left ${filter==='all'?'border-primary bg-primary/5':''}`}>
          <div className="text-[10px] uppercase font-bold text-muted-foreground">All</div>
          <div className="text-xl font-black">{items.length}</div>
        </button>
        {TKT_STATUSES.map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-2xl border p-3 text-left ${filter===s?'border-primary bg-primary/5':''}`}>
            <div className="text-[10px] uppercase font-bold text-muted-foreground">{TKT_LABEL[s]}</div>
            <div className="text-xl font-black">{stats[s] || 0}</div>
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {view.map(t => (
          <button key={t.id} onClick={() => setActive(t)} className="w-full text-left rounded-2xl border p-4 hover:border-primary bg-card">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2"><div className="font-bold truncate">{t.subject}</div><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${TKT_COLOR[t.status] || 'bg-secondary'}`}>{t.status}</span></div>
                <div className="text-xs text-muted-foreground">{t.id} · {t.email} · {t.category} · {t.messages?.length || 0} msgs · Updated {new Date(t.updatedAt).toLocaleString()}</div>
              </div>
              <div className="text-xs text-muted-foreground">→</div>
            </div>
          </button>
        ))}
        {view.length === 0 && <div className="text-muted-foreground text-sm text-center py-10 rounded-2xl border border-dashed">No tickets{filter!=='all' && ` in "${TKT_LABEL[filter]}"`}.</div>}
      </div>
    </div>
  )
}

