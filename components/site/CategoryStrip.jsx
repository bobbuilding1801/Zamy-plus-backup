'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Smartphone, Cpu, Car, Headphones, Zap, Factory, Home, Briefcase } from 'lucide-react'
import { CATEGORIES } from '@/lib/data'

const ICONS = { Smartphone, Cpu, Car, Headphones, Zap, Factory, Home, Briefcase }

export default function CategoryStrip() {
  const [categories,setCategories] = useState(CATEGORIES)
  useEffect(() => { fetch('/api/categories').then(r=>r.json()).then(d=>{if(Array.isArray(d.items))setCategories(d.items)}).catch(()=>{}) },[])
  return (
    <section className="container px-4 md:px-6 py-8 md:py-10">
      <div className="flex items-end justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-extrabold">Shop by Category</h2>
        <Link href="/categories" className="text-sm font-semibold text-primary hover:underline">All categories →</Link>
      </div>
      <div className="grid grid-cols-4 md:grid-cols-8 gap-3 md:gap-4">
        {categories.map(c => {
          const Icon = ICONS[c.icon] || Smartphone
          return (
            <Link key={c.slug} href={`/category/${c.slug}`} className="group flex flex-col items-center gap-2 rounded-2xl border border-border/70 p-3 md:p-4 hover:border-primary hover:shadow-premium transition-all bg-card">
              <div className="h-12 w-12 md:h-14 md:w-14 grid place-items-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition">
                <Icon size={22} />
              </div>
              <span className="text-[11px] md:text-xs font-semibold text-center leading-tight">{c.name}</span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
