'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, ShoppingBag, Boxes, Users, Ticket, Star, Settings, Tag, LineChart, Truck, Layers, Mail, Image as ImageIcon, LogOut, TrendingUp, DollarSign, Package, UsersRound, LifeBuoy } from 'lucide-react'
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid, Legend } from 'recharts'
import { formatINR } from '@/lib/store'
import Logo from '@/components/site/Logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAuthGate, getAuth } from '@/lib/auth'
import AuthBar from '@/components/site/AuthBar'
import ProductManager from '@/components/admin/ProductManager'
import CategoryManager from '@/components/admin/CategoryManager'
import { AdminOrdersTable, AdminCoupons, AdminReviews, AdminReports, AdminReturns, AdminTickets } from '@/components/admin/AdminModules'

const NAV = [
  { k:'dashboard', t:'Dashboard', i:LayoutDashboard },
  { k:'orders', t:'Orders', i:ShoppingBag },
  { k:'products', t:'Products', i:Boxes },
  { k:'categories', t:'Categories', i:Layers },
  { k:'customers', t:'Customers', i:Users },
  { k:'inventory', t:'Inventory', i:Package },
  { k:'coupons', t:'Coupons', i:Ticket },
  { k:'reviews', t:'Reviews', i:Star },
  { k:'returns', t:'Returns & Refunds', i:Truck },
  { k:'tickets', t:'Support Tickets', i:LifeBuoy },
  { k:'shipping', t:'Shipping & Taxes', i:Truck },
  { k:'reports', t:'Reports', i:LineChart },
  { k:'users', t:'User Management', i:UsersRound },
  { k:'banners', t:'Banner CMS', i:ImageIcon },
  { k:'cms', t:'CMS Pages', i:Layers },
  { k:'emails', t:'Email Templates', i:Mail },
  { k:'settings', t:'Settings', i:Settings },
]

const YELLOW='#FFD400', BLACK='#111', GREY='#e5e7eb'
const PIE_COLORS = ['#FFD400','#111','#4b5563','#9ca3af','#f59e0b','#fde68a','#374151','#6b7280']

function Inner() {
  const gate = useAuthGate('admin')
  const sp = useSearchParams()
  const requestedTab = sp.get('tab') || 'dashboard'
  const role = gate.user?.role || 'admin'
  const allowedTabs = role === 'product' ? ['products'] : role === 'support' ? ['tickets','returns'] : NAV.map(n => n.k)
  const tab = allowedTabs.includes(requestedTab) ? requestedTab : allowedTabs[0]
  const [analytics, setAnalytics] = useState(null)
  const [orders, setOrders] = useState([])
  const [ordersError, setOrdersError] = useState('')
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [customers, setCustomers] = useState([])
  const [coupons, setCoupons] = useState([])
  const [reviews, setReviews] = useState([])
  const [products, setProducts] = useState([])
  const [banners, setBanners] = useState([])
  const [bannerMessage, setBannerMessage] = useState('')
  const [savingBanners, setSavingBanners] = useState(false)
  const editBanner = (index, field, value) => setBanners(prev => prev.map((b,i) => i === index ? { ...b, [field]: value } : b))
  const saveBanners = async () => {
    setSavingBanners(true); setBannerMessage('')
    try {
      const res = await fetch('/api/admin/banners', { method:'POST', headers: { 'Content-Type':'application/json', Authorization:`Bearer ${gate.user.token}` }, body: JSON.stringify({ slides: banners }) })
      if (!res.ok) throw new Error('Save failed (' + res.status + ')')
      setBannerMessage('Saved! Refresh the storefront to see the updated banners.')
    } catch (e) { setBannerMessage(e.message || 'Could not save banners') }
    finally { setSavingBanners(false) }
  }

  useEffect(() => {
    if (gate.loading || !gate.user) return
    const h = { Authorization: `Bearer ${gate.user.token}` }
    const j = (u) => fetch(u, { headers: h }).then(r => r.json())
    if (role === 'admin') j('/api/admin/analytics').then(setAnalytics)
    if (role === 'admin') {
    setOrdersLoading(true)
    setOrdersError('')
    fetch('/api/admin/orders', { headers: h, cache: 'no-store' })
      .then(async r => { const d = await r.json(); if (!r.ok || !Array.isArray(d.items)) throw new Error(d.error || `Orders request failed (${r.status})`); return d.items })
      .then(items => setOrders(items))
      .catch(e => setOrdersError(e.message || 'Unable to load orders'))
      .finally(() => setOrdersLoading(false))
    }
    if (role === 'admin') j('/api/admin/customers').then(d => setCustomers(d.items || []))
    if (role === 'admin') j('/api/admin/coupons').then(d => setCoupons(d.items || []))
    if (role === 'admin') j('/api/admin/reviews').then(d => setReviews(d.items || []))
    if (role === 'admin') j('/api/admin/products').then(d => setProducts(d.items || []))
    if (role === 'admin') j('/api/admin/banners').then(d => setBanners(d.items || [])).catch(() => setBannerMessage('Unable to load banners'))
  }, [gate.loading, gate.user, role])

  if (gate.loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Verifying access…</div>

  const KPI = ({ label, value, sub, Icon, tone='primary' }) => (
    <div className="rounded-2xl border p-5 bg-card">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground uppercase font-bold">{label}</div>
          <div className="text-2xl md:text-3xl font-black mt-1">{value}</div>
          {sub && <div className="text-xs text-green-600 font-semibold mt-1">{sub}</div>}
        </div>
        <div className={`h-11 w-11 grid place-items-center rounded-full ${tone==='primary' ? 'bg-primary/15 text-primary' : 'bg-secondary'}`}><Icon size={20} /></div>
      </div>
    </div>
  )

  const Content = () => {
    if (tab === 'dashboard' && analytics) return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPI label="Revenue (30d)" value={formatINR(analytics.totals.revenue)} sub="+18.2% vs prev" Icon={DollarSign} />
          <KPI label="Orders" value={analytics.totals.orders.toLocaleString()} sub="+12.4%" Icon={ShoppingBag} />
          <KPI label="Customers" value={analytics.totals.customers.toLocaleString()} sub="+3.6%" Icon={Users} />
          <KPI label="Avg Order Value" value={formatINR(analytics.totals.aov)} sub="+5.1%" Icon={TrendingUp} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-2xl border p-5 bg-card">
            <div className="flex items-center justify-between mb-2"><div className="font-bold">Revenue Trend</div><Badge variant="outline">Last 30 days</Badge></div>
            <div className="h-72">
              <ResponsiveContainer>
                <AreaChart data={analytics.revenue}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={YELLOW} stopOpacity={0.8}/><stop offset="100%" stopColor={YELLOW} stopOpacity={0.05}/></linearGradient>
                  </defs>
                  <CartesianGrid stroke={GREY} vertical={false} />
                  <XAxis dataKey="date" tick={{fontSize:10}} tickFormatter={(v)=>v.slice(5)} />
                  <YAxis tick={{fontSize:10}} tickFormatter={(v)=>'₹'+(v/1000).toFixed(0)+'k'} />
                  <Tooltip formatter={(v)=>['₹'+v.toLocaleString(),'Revenue']} />
                  <Area type="monotone" dataKey="revenue" stroke={BLACK} strokeWidth={2} fill="url(#g1)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-2xl border p-5 bg-card">
            <div className="font-bold mb-2">Sales by Category</div>
            <div className="h-72">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={analytics.catShare} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                    {analytics.catShare.map((_,i) => <Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{fontSize:10}} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border p-5 bg-card">
            <div className="font-bold mb-2">Top Products</div>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={analytics.topProducts} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={150} tick={{fontSize:10}} />
                  <Tooltip formatter={(v)=>[v.toLocaleString(),'Sold']} />
                  <Bar dataKey="sold" fill={YELLOW} radius={[0,6,6,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-2xl border p-5 bg-card">
            <div className="font-bold mb-3">Recent Orders</div>
            <div className="space-y-2">{orders.slice(0,6).map(o => (
              <div key={o.id} className="flex items-center gap-3 text-sm border-b last:border-0 pb-2">
                <img src={o.image} className="h-9 w-9 rounded object-cover" alt="" />
                <div className="flex-1 min-w-0"><div className="font-semibold truncate">{o.product}</div><div className="text-xs text-muted-foreground">{o.customer}</div></div>
                <div className="font-bold">{formatINR(o.total)}</div>
                <Badge variant={o.status==='delivered'?'default':o.status==='cancelled'?'destructive':'secondary'} className="capitalize">{o.status}</Badge>
              </div>
            ))}</div>
          </div>
        </div>
      </div>
    )
    if (tab === 'orders') return (
      <div className="space-y-3">
        <div className="flex items-center justify-between"><h2 className="text-xl font-black">Orders</h2><div className="text-xs text-muted-foreground">Change status inline — customer &amp; admin get updated tracking</div></div>
        {ordersLoading ? <p role="status" className="text-sm text-muted-foreground">Loading orders…</p> : ordersError ? <p role="alert" className="text-sm text-red-600">Could not load orders: {ordersError}</p> : <AdminOrdersTable token={gate.user?.token} initialOrders={orders} />}
      </div>
    )
    if (tab === 'products') return (
      <ProductManager token={gate.user?.token} onChanged={() => setProducts(prev => prev)} />
    )
    if (tab === 'customers') return (
      <div>
        <h2 className="text-xl font-black mb-3">Customers</h2>
        <div className="rounded-2xl border overflow-hidden"><table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs uppercase"><tr><th className="p-3 text-left">ID</th><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3 text-right">Orders</th><th className="p-3 text-right">Lifetime Spend</th><th className="p-3">Joined</th></tr></thead>
          <tbody>{customers.map(c => (<tr key={c.id} className="border-t hover:bg-secondary/30">
            <td className="p-3 font-bold">{c.id}</td><td className="p-3">{c.name}</td><td className="p-3">{c.email}</td><td className="p-3 text-right">{c.orders}</td><td className="p-3 text-right font-bold">{formatINR(c.spend)}</td><td className="p-3">{c.joined}</td>
          </tr>))}</tbody>
        </table></div>
      </div>
    )
    if (tab === 'coupons') return <AdminCoupons token={gate.user?.token} />
    if (tab === 'reviews') return <AdminReviews token={gate.user?.token} initialReviews={reviews} />
    if (tab === 'reports') return <AdminReports />
    if (tab === 'banners') return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-black">Banner Management</h2>
          <Button disabled={savingBanners} onClick={saveBanners}>{savingBanners ? 'Saving…' : 'Save Banners'}</Button>
        </div>
        {bannerMessage && <p role="status" className="text-sm">{bannerMessage}</p>}
        <div className="grid md:grid-cols-2 gap-4">
          {banners.map((b,i) => <div key={i} className="rounded-2xl border p-4 space-y-3">
            <div className="flex items-center justify-between"><strong>Banner {i+1}</strong><Button size="sm" variant="destructive" onClick={() => setBanners(prev => prev.filter((_,j) => j !== i))}>Delete</Button></div>
            {['tag','title','subtitle','cta','href','img'].map(field => <label key={field} className="block text-sm capitalize">{field === 'img' ? 'Image URL' : field}
              <Input className="mt-1" value={b[field] || ''} onChange={e => editBanner(i, field, e.target.value)} />
            </label>)}
            {b.img && <img src={b.img} alt="" className="w-full h-36 object-cover rounded-lg" />}
          </div>)}
        </div>
        <Button variant="outline" onClick={() => setBanners(prev => [...prev, { tag:'New banner', title:'New promotion', subtitle:'', cta:'Shop now', href:'/', img:'', accent:'from-yellow-400 to-white' }])}>+ Add Banner</Button>
      </div>
    )
    if (tab === 'reports') return <AdminReports />
    if (tab === 'shipping') return <Placeholder t="Shipping & Taxes" d="Configure shipping zones, rates, and tax rules (GST slabs) per category." />
    if (tab === 'returns') return <AdminReturns token={gate.user?.token} />
    if (tab === 'tickets') return <AdminTickets token={gate.user?.token} />
    if (tab === 'inventory') return (
      <div className="space-y-4">
        <h2 className="text-xl font-black">Inventory</h2>
        <div className="grid grid-cols-3 gap-3">
          <KPI label="Products" value={products.length} Icon={Boxes} />
          <KPI label="Low stock (1–5)" value={products.filter(p => Number(p.stock) > 0 && Number(p.stock) <= 5).length} Icon={Package} />
          <KPI label="Out of stock" value={products.filter(p => Number(p.stock) <= 0).length} Icon={ShoppingBag} />
        </div>
        <div className="rounded-2xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50"><tr><th className="p-3 text-left">Product</th><th className="p-3 text-left">SKU</th><th className="p-3 text-right">Stock</th><th className="p-3 text-left">Status</th></tr></thead>
            <tbody>{products.map(p => <tr key={p.id} className="border-t">
              <td className="p-3 font-medium">{p.name}</td><td className="p-3">{p.sku || p.id}</td><td className="p-3 text-right">{p.stock ?? 0}</td>
              <td className="p-3"><Badge variant={Number(p.stock) <= 0 ? 'destructive' : 'secondary'}>{Number(p.stock) <= 0 ? 'Out of stock' : Number(p.stock) <= 5 ? 'Low stock' : 'In stock'}</Badge></td>
            </tr>)}</tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground">To change stock quantities, use the Products tab.</p>
      </div>
    )
    if (tab === 'users') return <Placeholder t="User Management" d="Admins, moderators, sellers, staff — assign roles & permissions." />
    if (tab === 'cms') return <Placeholder t="CMS Pages" d="Edit About, Contact, Legal, and static pages inline." />
    if (tab === 'emails') return <Placeholder t="Email Templates" d="Order confirmation, shipping, delivery, refund emails with variable placeholders." />
    if (tab === 'categories') return <CategoryManager />
    if (tab === 'settings') return <Placeholder t="Settings" d="Store name, contact, currency, payment providers, integrations." />
    return null
  }

  return (
    <div className="grid grid-cols-12 min-h-screen">
      <aside className="col-span-12 md:col-span-3 lg:col-span-2 border-r bg-sidebar text-sidebar-foreground p-3 md:min-h-screen">
        <div className="flex items-center gap-2 p-2 mb-2"><Logo size={32} /><div className="font-black tracking-widest text-sm">ZAMY ADMIN</div></div>
        <nav className="flex md:flex-col gap-1 overflow-x-auto no-scrollbar">
          {NAV.filter(n => allowedTabs.includes(n.k)).map(n => { const I = n.i; return (
            <Link key={n.k} href={`/admin?tab=${n.k}`} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${tab===n.k?'bg-primary text-primary-foreground':'hover:bg-secondary'}`}>
              <I size={16} /> <span>{n.t}</span>
            </Link>
          )})}
          <Link href="/" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary mt-3"><LogOut size={16} /> Back to store</Link>
        </nav>
      </aside>
      <main className="col-span-12 md:col-span-9 lg:col-span-10 bg-background flex flex-col">
        <AuthBar role="admin" />
        <div className="p-4 md:p-6 flex-1"><Content /></div>
      </main>
    </div>
  )
}

function Placeholder({ t, d }) { return (<div><h2 className="text-xl font-black">{t}</h2><p className="text-muted-foreground mt-2">{d}</p><div className="mt-4 rounded-2xl border border-dashed p-10 text-center text-muted-foreground">Coming soon in Phase 3 — module scaffolded and ready for wiring.</div></div>) }

export default function Admin() { return <Suspense fallback={<div />}><Inner /></Suspense> }
