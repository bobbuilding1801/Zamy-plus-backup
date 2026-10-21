'use client'
import SiteChrome from '@/components/site/SiteChrome'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import ProductCard from '@/components/site/ProductCard'
import { CATEGORIES } from '@/lib/data'
import Link from 'next/link'

function CatInner() {
  const { slug } = useParams()
  const [items, setItems] = useState([])
  const [categories,setCategories] = useState(CATEGORIES)
  const cat = categories.find(c => c.slug === slug)
  useEffect(() => { fetch('/api/categories').then(r=>r.json()).then(d=>{if(Array.isArray(d.items))setCategories(d.items)}).catch(()=>{}) },[])
  useEffect(() => {
    if (!slug) return
    fetch(`/api/products?category=${slug}&limit=48&sort=popular`).then(r=>r.json()).then(d => setItems(d.items||[]))
  }, [slug])

  return (
    <div>
      <section className="bg-secondary/40 border-b">
        <div className="container px-4 md:px-6 py-10">
          <div className="text-xs text-muted-foreground"><Link href="/">Home</Link> / <Link href="/categories">Categories</Link> / <span className="text-foreground">{cat?.name}</span></div>
          <h1 className="text-3xl md:text-5xl font-black mt-2">{cat?.name || 'Category'}</h1>
          <div className="mt-4 flex flex-wrap gap-2">
            {cat?.subs.map(s => (
              <Link key={s} href={`/shop?category=${slug}&subcategory=${encodeURIComponent(s)}`} className="px-3 py-1.5 rounded-full border bg-card hover:border-primary hover:text-primary text-sm font-medium">{s}</Link>
            ))}
          </div>
        </div>
      </section>
      <div className="container px-4 md:px-6 py-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map(p => <ProductCard key={p.id} p={p} />)}
        {items.length === 0 && <div className="col-span-full text-center py-16 text-muted-foreground">No products yet.</div>}
      </div>
    </div>
  )
}
export default function C() { return <SiteChrome><CatInner /></SiteChrome> }
