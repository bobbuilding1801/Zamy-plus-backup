'use client'
import { useEffect, useState } from 'react'
import SiteChrome from '@/components/site/SiteChrome'
import HeroCarousel from '@/components/site/HeroCarousel'
import CategoryStrip from '@/components/site/CategoryStrip'
import ProductRail from '@/components/site/ProductRail'
import PromoBanner from '@/components/site/PromoBanner'
import Countdown from '@/components/site/Countdown'
import Testimonials from '@/components/site/Testimonials'
import { PROMOS } from '@/lib/data'
import { useShop } from '@/lib/store'
import { Sparkles } from 'lucide-react'

function Home() {
  const [sections, setSections] = useState(null)
  const [aiRecs, setAiRecs] = useState({ items:[], reason:'' })
  const [recentlyViewed, setRecentlyViewed] = useState([])
  const { recent, cart, wishlist } = useShop()

  // Single batched fetch for all homepage rails
  useEffect(() => {
    fetch('/api/home').then(r=>r.json()).then(setSections).catch(() => setSections({}))
  }, [])

  useEffect(() => {
    if (!recent.length) return
    fetch(`/api/products/by-ids?ids=${recent.join(',')}`).then(r=>r.json()).then(d => setRecentlyViewed(d.items||[]))
  }, [recent])

  // AI recs load lazily after content is on screen
  useEffect(() => {
    const t = setTimeout(() => {
      fetch('/api/ai/recommendations', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ recentIds:recent, cartIds:cart.map(c=>c.id), wishlistIds:wishlist })})
        .then(r=>r.json()).then(setAiRecs).catch(()=>{})
    }, 1500)
    return () => clearTimeout(t)
  }, [recent.length, cart.length, wishlist.length])

  const [dealEnd] = useState(() => { const d = new Date(); d.setHours(23,59,59,0); return d.getTime() })

  return (
    <>
      <div className="container px-4 md:px-6 pt-9 md:pt-14 pb-4"><div className="flex items-center gap-3 text-xs uppercase tracking-[0.25em] font-bold text-primary"><span className="h-px w-9 bg-primary" /> The ZAMY Collection</div><div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mt-3"><h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">Built for the <span className="text-primary">bold.</span></h1><p className="text-sm text-muted-foreground max-w-sm">Explore exceptional tech, tools and essentials. Curated for the way you work and live.</p></div></div>
      <HeroCarousel />
      <CategoryStrip />
      <ProductRail title="Featured Products" subtitle="Hand-picked by ZAMY editors" products={sections?.featured || []} viewAll="/shop?tag=featured" />
      <ProductRail title="Best Sellers" subtitle="Loved by thousands of customers" products={sections?.bestsellers || []} viewAll="/shop?tag=bestseller" />
      <PromoBanner items={PROMOS} />
      <ProductRail title="Trending Now" subtitle="What everyone's buying today" products={sections?.trending || []} viewAll="/shop?tag=trending" />
      <ProductRail title="New Arrivals" subtitle="Fresh drops this week" products={sections?.newArrivals || []} viewAll="/shop?tag=new" />

      <section className="container px-4 md:px-6 py-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#161616] via-[#1e1b0e] to-[#111111] border border-yellow-400/30 p-6 md:p-10 shadow-premium">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-yellow-400 text-black text-[11px] font-bold uppercase tracking-widest px-3 py-1">⚡ Flash Deals</div>
              <h3 className="text-2xl md:text-4xl font-black text-white mt-2">Extra 20% OFF — Ends Tonight</h3>
              <p className="text-white/70 text-sm md:text-base mt-1">On computer parts, mobile accessories &amp; power tools. Code: ZAMY20</p>
              <a href="/deals" className="inline-block mt-4 rounded-full bg-yellow-400 text-black font-bold px-6 py-3 text-sm hover:bg-yellow-300">Shop the Deals →</a>
            </div>
            <div className="shrink-0 text-center">
              <div className="text-[11px] font-bold uppercase text-white/60 mb-2">Ends in</div>
              <Countdown endsAt={dealEnd} />
            </div>
          </div>
          <div className="absolute -right-8 -bottom-8 h-56 w-56 rounded-full bg-yellow-400/10 blur-2xl" />
        </div>
      </section>

      <ProductRail title="Top Rated" subtitle="Highest rated by our community" products={sections?.topRated || []} viewAll="/shop?tag=toprated" />
      <ProductRail title="Limited Time Deals" subtitle="Grab them before they're gone" products={sections?.deals || []} viewAll="/deals" />

      {aiRecs.items.length > 0 && (
        <section>
          <div className="container px-4 md:px-6 pt-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 text-primary px-3 py-1 text-[11px] font-bold uppercase tracking-widest"><Sparkles size={12} /> AI Picks for You</div>
          </div>
          <ProductRail title="Recommended For You" subtitle={aiRecs.reason || 'Curated by ZAMY AI based on your interests'} products={aiRecs.items} />
        </section>
      )}

      {recentlyViewed.length > 0 && <ProductRail title="Recently Viewed" subtitle="Continue where you left off" products={recentlyViewed} />}
      <Testimonials />
    </>
  )
}

function App() { return <SiteChrome premiumDark><Home /></SiteChrome> }
export default App
