'use client'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { login } from '@/lib/auth'
import Logo from '@/components/site/Logo'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { ShieldCheck, Store, Lock, Mail, Sparkles } from 'lucide-react'

function Inner() {
  const sp = useSearchParams()
  const router = useRouter()
  const initialRole = sp.get('role') || 'admin'
  const next = sp.get('next') || (initialRole === 'seller' ? '/seller' : '/admin')
  const [role, setRole] = useState(initialRole)
  const [email, setEmail] = useState(role === 'seller' ? 'seller@zamy.market' : role === 'admin' ? 'admin@zamy.market' : '')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault(); setLoading(true)
    try {
      const d = await login({ email, password, role })
      if (d.ok) { toast.success('Welcome back, ' + d.email); router.replace(next) }
      else toast.error(d.error || 'Invalid credentials')
    } catch { toast.error('Login failed') }
    finally { setLoading(false) }
  }

  const switchRole = (r) => {
    setRole(r)
    setEmail(r === 'seller' ? 'seller@zamy.market' : r === 'admin' ? 'admin@zamy.market' : '')
  }

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* Brand side */}
      <div className="relative hidden md:block bg-black text-white overflow-hidden">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-yellow-400/30 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-yellow-500/20 blur-3xl" />
        <div className="relative z-10 h-full flex flex-col p-12">
          <Link href="/" className="inline-flex items-center gap-3"><Logo size={44} /><span className="font-black tracking-widest text-xl">ZAMY</span></Link>
          <div className="mt-auto">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-yellow-300"><Sparkles size={14} /> {role === 'seller' ? 'Seller Portal' : 'Admin Console'}</div>
            <h1 className="text-4xl lg:text-5xl font-black mt-3 leading-tight">{role === 'seller' ? 'Grow your business on ZAMY.' : 'Manage the marketplace.'}</h1>
            <p className="text-white/70 mt-4 max-w-md">{role === 'seller' ? 'Track sales, list new products, and manage payouts.' : 'Analytics, orders, catalog, customers, coupons — all in one place.'}</p>
            <div className="mt-8 flex items-center gap-6 text-xs text-white/60">
              <span className="inline-flex items-center gap-2"><ShieldCheck size={14} className="text-yellow-300" /> Secure sign-in</span>
              <span className="inline-flex items-center gap-2"><Lock size={14} className="text-yellow-300" /> Encrypted session</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center p-6 md:p-12 bg-background">
        <div className="w-full max-w-md">
          <div className="md:hidden mb-8 flex items-center gap-3"><Logo size={44} /><span className="font-black tracking-widest text-xl">ZAMY</span></div>
          <div className="inline-flex rounded-full border p-1 bg-secondary mb-6">
            <button onClick={() => switchRole('admin')} className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold transition ${role==='admin'?'bg-primary text-primary-foreground':'text-muted-foreground'}`}><ShieldCheck size={14} /> Admin</button>
            <button onClick={() => switchRole('product')} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition ${role==='product'?'bg-primary text-primary-foreground':'text-muted-foreground'}`}>Products</button>
            <button onClick={() => switchRole('support')} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition ${role==='support'?'bg-primary text-primary-foreground':'text-muted-foreground'}`}>Support</button>
            <button onClick={() => switchRole('seller')} className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold transition ${role==='seller'?'bg-primary text-primary-foreground':'text-muted-foreground'}`}><Store size={14} /> Seller</button>
          </div>
          <h2 className="text-3xl font-black">Sign in</h2>
          <p className="text-muted-foreground text-sm mt-1">Use your {role} credentials to continue.</p>

          <Card className="mt-6 p-6 rounded-2xl">
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold flex items-center gap-1 mb-1"><Mail size={12} /> Email</label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@zamy.market" required autoFocus />
              </div>
              <div>
                <label className="text-xs font-semibold flex items-center gap-1 mb-1"><Lock size={12} /> Password</label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-11 rounded-full font-bold">
                {loading ? 'Signing in…' : `Sign in as ${role === 'seller' ? 'Seller' : role === 'product' ? 'Product Development' : role === 'support' ? 'Customer Service' : 'Admin'}`}
              </Button>
            </form>
            <div className="mt-5 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 p-3 text-xs">
              <div className="font-bold text-yellow-800 dark:text-yellow-300">Demo credentials</div>
              <div className="text-yellow-700 dark:text-yellow-400 mt-1">Admin: <code>admin@zamy.market</code> / <code>zamy2025</code></div>
              <div className="text-yellow-700 dark:text-yellow-400">Seller: <code>seller@zamy.market</code> / <code>zamy2025</code></div>
            </div>
          </Card>

          <div className="mt-6 text-center text-xs text-muted-foreground">
            <Link href="/" className="hover:text-primary">← Back to store</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() { return <Suspense fallback={<div className="min-h-screen grid place-items-center">Loading…</div>}><Inner /></Suspense> }
