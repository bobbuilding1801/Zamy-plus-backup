'use client'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import Logo from './Logo'
import { Search, ShoppingCart, Heart, GitCompare, User, Bell, Package, Menu, Sun, Moon, ChevronDown, X, LogOut, UserCircle2 } from 'lucide-react'
import { useShop } from '@/lib/store'
import { useCustomer } from '@/lib/customer'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CATEGORIES } from '@/lib/data'
import { useTheme } from 'next-themes'

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const { cart, wishlist, compare, notif } = useShop()
  const { user, setModalOpen, signOut } = useCustomer()
  const cartCount = cart.filter(i => !i.savedForLater).reduce((s,i)=>s+i.qty, 0)
  const unread = notif.filter(n => n.unread).length
  const [q, setQ] = useState('')
  const [sugs, setSugs] = useState([])
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)
  const { theme, setTheme } = useTheme()
  const [storeSettings,setStoreSettings] = useState(null)
  useEffect(()=>{fetch('/api/store-settings').then(r=>r.json()).then(setStoreSettings).catch(()=>{})},[])
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!q.trim()) { setSugs([]); return }
    let ignore = false
    fetch(`/api/products/suggest?q=${encodeURIComponent(q)}`)
      .then(r => r.json())
      .then(d => { if (!ignore) setSugs(d.items || []) })
      .catch(() => {})
    return () => { ignore = true }
  }, [q])

  useEffect(() => {
    const onClick = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  const submit = (e) => {
    e.preventDefault()
    if (!q.trim()) return
    router.push(`/shop?q=${encodeURIComponent(q)}`)
    setOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Top promo bar */}
      <div className="bg-black text-white text-[11px] md:text-xs overflow-hidden">
        <div className="container px-4 h-8 flex items-center justify-between">
          <div className="hidden md:flex gap-4 text-white/70">
            <span>Ship to 🇮🇳 India</span>
            <span>|</span>
            <span>24×7 Customer Support</span>
          </div>
          <div className="whitespace-nowrap font-semibold text-primary">{storeSettings?.announcement ?? '₹500 flat delivery across India'}</div>
          <div className="hidden md:flex gap-4 text-white/70">
            <Link href="/account" className="hover:text-primary">Track Order</Link>
            <Link href="/help" className="hover:text-primary">Help</Link>
            <Link href="/careers" className="hover:text-primary">Sell on ZAMY</Link>
          </div>
        </div>
      </div>

      <div className="glass border-b border-border/60">
        <div className="container px-3 md:px-6 h-16 md:h-18 flex items-center gap-3 md:gap-5">
          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <button className="md:hidden h-9 w-9 grid place-items-center rounded-full hover:bg-secondary" aria-label="Menu"><Menu /></button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px]">
              <SheetHeader><SheetTitle><Logo showText size={36} /></SheetTitle></SheetHeader>
              <nav className="mt-4 flex flex-col gap-1">
                {CATEGORIES.map(c => (
                  <Link key={c.slug} href={`/category/${c.slug}`} className="px-3 py-2 rounded-lg hover:bg-secondary font-medium">{c.name}</Link>
                ))}
                <hr className="my-2" />
                <Link href="/deals" className="px-3 py-2 rounded-lg hover:bg-secondary">Deals</Link>
                <Link href="/brands" className="px-3 py-2 rounded-lg hover:bg-secondary">Brands</Link>
                <Link href="/account" className="px-3 py-2 rounded-lg hover:bg-secondary">My Account</Link>
                <Link href="/help" className="px-3 py-2 rounded-lg hover:bg-secondary">Help</Link>
              </nav>
            </SheetContent>
          </Sheet>

          <Logo size={40} />
          <span className="hidden sm:inline font-black tracking-widest text-lg">ZAMY</span>
          {pathname === '/' && (
            <div className="hidden sm:flex shrink-0 items-center" aria-label="SUNBLISS">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/WhatsApp%20Image%202026-10-21%20at%2010.25.14%20PM.jpeg"
                alt="SUNBLISS logo"
                className="h-11 w-24 rounded-md bg-white object-contain"
              />
            </div>
          )}

          {/* Category mega dropdown */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="hidden lg:inline-flex items-center gap-1.5 h-10 px-3 rounded-full border border-border hover:border-primary hover:bg-secondary text-sm font-semibold">
                All Categories <ChevronDown size={16} />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[720px] p-4 grid grid-cols-3 gap-4">
              {CATEGORIES.map(c => (
                <div key={c.slug}>
                  <Link href={`/category/${c.slug}`} className="font-bold text-sm hover:text-primary">{c.name}</Link>
                  <ul className="mt-1 space-y-1">
                    {c.subs.slice(0,6).map(s => (
                      <li key={s}><Link href={`/shop?category=${c.slug}&subcategory=${encodeURIComponent(s)}`} className="text-xs text-muted-foreground hover:text-primary">{s}</Link></li>
                    ))}
                  </ul>
                </div>
              ))}
            </PopoverContent>
          </Popover>

          {/* Search */}
          <form onSubmit={submit} className="flex-1 relative" ref={boxRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} placeholder="Search for products, brands and more..." className="pl-10 pr-24 h-11 rounded-full bg-background border-border/70 focus-visible:ring-primary" />
              {q && <button type="button" onClick={() => { setQ(''); setSugs([]) }} className="absolute right-24 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={16} /></button>}
              <Button type="submit" size="sm" className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full h-8 px-4 font-semibold">Search</Button>
            </div>
            {open && sugs.length > 0 && (
              <div className="absolute z-40 mt-2 w-full rounded-2xl border bg-popover shadow-premium overflow-hidden">
                {sugs.map(s => (
                  <Link key={s.id} href={`/product/${s.id}`} onClick={() => setOpen(false)} className="flex items-center gap-3 p-2.5 hover:bg-secondary">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.images[0]} alt="" className="h-10 w-10 rounded object-cover" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{s.name}</div>
                      <div className="text-[11px] text-muted-foreground">{s.brand} · {s.subcategory}</div>
                    </div>
                    <div className="text-sm font-bold">₹{s.price.toLocaleString()}</div>
                  </Link>
                ))}
                <button type="submit" onClick={submit} className="w-full text-sm p-3 border-t hover:bg-secondary text-primary font-semibold">See all results for “{q}” →</button>
              </div>
            )}
          </form>

          {/* Right icons */}
          <div className="flex items-center gap-1 md:gap-2">
            {mounted && (
              <button onClick={() => setTheme(theme==='dark'?'light':'dark')} className="h-10 w-10 grid place-items-center rounded-full hover:bg-secondary" aria-label="Toggle theme">
                {theme==='dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            )}
            <Link href="/account?tab=notifications" className="relative h-10 w-10 grid place-items-center rounded-full hover:bg-secondary hidden sm:grid" aria-label="Notifications">
              <Bell size={18} />
              {unread > 0 && <span className="absolute top-1.5 right-1.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center">{unread}</span>}
            </Link>
            <Link href="/compare" className="relative h-10 w-10 grid place-items-center rounded-full hover:bg-secondary hidden sm:grid" aria-label="Compare">
              <GitCompare size={18} />
              {compare.length > 0 && <span className="absolute top-1.5 right-1.5 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center">{compare.length}</span>}
            </Link>
            <Link href="/wishlist" className="relative h-10 w-10 grid place-items-center rounded-full hover:bg-secondary" aria-label="Wishlist">
              <Heart size={18} />
              {wishlist.length > 0 && <span className="absolute top-1.5 right-1.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center">{wishlist.length}</span>}
            </Link>
            {/* Account menu */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-10 px-2 md:px-3 grid place-items-center rounded-full hover:bg-secondary" aria-label="Account">
                  {user ? (
                    <div className="flex items-center gap-1.5">
                      <div className="h-7 w-7 grid place-items-center rounded-full bg-primary text-primary-foreground font-black text-xs">{(user.email || 'Z').charAt(0).toUpperCase()}</div>
                      <ChevronDown size={14} className="hidden md:inline text-muted-foreground" />
                    </div>
                  ) : (
                    <User size={18} />
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-2">
                {user ? (
                  <>
                    <div className="p-2 border-b mb-1">
                      <div className="text-[11px] uppercase text-muted-foreground font-bold">Signed in</div>
                      <div className="text-sm font-semibold truncate">{user.email}</div>
                    </div>
                    <Link href="/account" className="flex items-center gap-2 px-2 py-2 rounded hover:bg-secondary text-sm"><UserCircle2 size={14} /> My Account</Link>
                    <Link href="/account?tab=orders" className="flex items-center gap-2 px-2 py-2 rounded hover:bg-secondary text-sm"><Package size={14} /> My Orders</Link>
                    <Link href="/wishlist" className="flex items-center gap-2 px-2 py-2 rounded hover:bg-secondary text-sm"><Heart size={14} /> Wishlist</Link>
                    <button onClick={signOut} className="w-full text-left flex items-center gap-2 px-2 py-2 rounded hover:bg-secondary text-sm text-red-500"><LogOut size={14} /> Sign out</button>
                  </>
                ) : (
                  <>
                    <div className="p-2 border-b mb-1">
                      <div className="font-semibold text-sm">Welcome to ZAMY</div>
                      <div className="text-xs text-muted-foreground">Sign in to unlock orders, wishlist sync, and rewards.</div>
                    </div>
                    <Button onClick={() => setModalOpen(true)} className="w-full rounded-full font-bold h-10 mt-1">Sign in / Sign up</Button>
                    <Link href="/account" className="mt-2 block text-center text-xs text-muted-foreground hover:text-primary">Continue as guest &rarr;</Link>
                  </>
                )}
              </PopoverContent>
            </Popover>
            <Link href="/account?tab=orders" className="h-10 w-10 grid place-items-center rounded-full hover:bg-secondary hidden md:grid" aria-label="Orders">
              <Package size={18} />
            </Link>
            <Link href="/cart" className="relative h-10 w-10 grid place-items-center rounded-full bg-primary text-primary-foreground hover:brightness-95" aria-label="Cart">
              <ShoppingCart size={18} />
              {cartCount > 0 && <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-black text-white text-[10px] font-bold grid place-items-center">{cartCount}</span>}
            </Link>
          </div>
        </div>

        {/* Secondary nav strip */}
        <div className="hidden md:block border-t border-border/60">
          <div className="container px-6 h-10 flex items-center gap-6 text-[13px] font-medium overflow-x-auto no-scrollbar">
            {CATEGORIES.map(c => (
              <Link key={c.slug} href={`/category/${c.slug}`} className={`whitespace-nowrap hover:text-primary transition ${pathname === `/category/${c.slug}` ? 'text-primary' : ''}`}>{c.name}</Link>
            ))}
            <Link href="/deals" className="whitespace-nowrap text-primary font-bold">🔥 Deals</Link>
            <Link href="/brands" className="whitespace-nowrap hover:text-primary">Brands</Link>
            <Link href="/blogs" className="whitespace-nowrap hover:text-primary">Blogs</Link>
          </div>
        </div>
      </div>
    </header>
  )
}
