'use client'
import { useEffect, useState } from 'react'
import SiteChrome from '@/components/site/SiteChrome'
function Inner() {
  const [cms,setCms] = useState(null)
  useEffect(()=>{fetch('/api/cms').then(r=>r.json()).then(d=>setCms((d.items||[]).find(p=>p.key==='about')||null)).catch(()=>{})},[])
  return (
    <div>
      <section className="bg-black text-white border-b">
        <div className="container px-4 md:px-6 py-16 text-center">
          <h1 className="text-4xl md:text-6xl font-black">{cms?.title || 'Built for the Trade'}</h1>
          <p className="text-white/70 mt-3 max-w-2xl mx-auto">{cms?.content || 'ZAMY is a premium marketplace focused on electronics, computer parts, mobile accessories, automotive gear, tools and industrial products — trusted by professionals and enthusiasts alike.'}</p>
        </div>
      </section>
      <div className="container px-4 md:px-6 py-12 grid md:grid-cols-3 gap-6">
        {[
          {t:'Trusted Sellers', d:'Every seller on ZAMY is verified and monitored for quality.'},
          {t:'Genuine Products', d:'100% authentic, brand-new products with manufacturer warranty.'},
          {t:'Fast Delivery', d:'Nationwide logistics with express & same-day options.'},
        ].map(x => (
          <div key={x.t} className="rounded-2xl border p-6">
            <div className="h-10 w-10 rounded-full bg-primary/15 text-primary grid place-items-center font-black">Z</div>
            <h3 className="font-bold mt-3">{x.t}</h3>
            <p className="text-sm text-muted-foreground mt-1">{x.d}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
export default function A() { return <SiteChrome><Inner /></SiteChrome> }
