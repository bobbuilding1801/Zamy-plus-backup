'use client'
import { useEffect, useState } from 'react'
import SiteChrome from '@/components/site/SiteChrome'
import { CATEGORIES } from '@/lib/data'
import Link from 'next/link'
import { Smartphone, Cpu, Car, Headphones, Zap, Factory, Home, Briefcase } from 'lucide-react'
const ICONS = { Smartphone, Cpu, Car, Headphones, Zap, Factory, Home, Briefcase }

function Inner() {
  const [categories,setCategories] = useState(CATEGORIES)
  useEffect(() => { fetch('/api/categories').then(r=>r.json()).then(d=>{if(Array.isArray(d.items))setCategories(d.items)}).catch(()=>{}) },[])
  return (
    <div className="container px-4 md:px-6 py-10">
      <h1 className="text-3xl md:text-4xl font-black mb-6">All Categories</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map(c => {
          const I = ICONS[c.icon] || Smartphone
          return (
            <div key={c.slug} className="rounded-2xl border p-6 hover:shadow-premium transition">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 grid place-items-center rounded-full bg-primary/15 text-primary"><I size={22} /></div>
                <Link href={`/category/${c.slug}`} className="text-xl font-bold hover:text-primary">{c.name}</Link>
              </div>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                {c.subs.map(s => (
                  <Link key={s} href={`/shop?category=${c.slug}&subcategory=${encodeURIComponent(s)}`} className="text-muted-foreground hover:text-primary">{s}</Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
export default function Cats() { return <SiteChrome><Inner /></SiteChrome> }
