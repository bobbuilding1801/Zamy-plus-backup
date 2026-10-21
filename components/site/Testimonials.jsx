import { Star, Quote } from 'lucide-react'

const TESTIMONIALS = [
  { name:'Rahul Kapoor', role:'PC Builder', text:'Ordered a full gaming rig — CPU, GPU, RAM, cooler. Delivered in 2 days, all genuine. ZAMY is my new go-to.', img:'https://i.pravatar.cc/100?img=12', rating:5 },
  { name:'Priya Sharma', role:'Photographer', text:'The Sony A7 IV was priced better than everywhere else. Packaging was premium and warranty is legit.', img:'https://i.pravatar.cc/100?img=32', rating:5 },
  { name:'Vikas Patel', role:'Mechanic Shop Owner', text:'Bulk order for engine oil and tools — all arrived on time. Bosch and DeWalt at great prices.', img:'https://i.pravatar.cc/100?img=15', rating:5 },
]

export default function Testimonials() {
  return (
    <section className="container px-4 md:px-6 py-12">
      <div className="text-center max-w-2xl mx-auto mb-8">
        <div className="text-xs font-bold uppercase tracking-widest text-primary">Loved by 1M+ shoppers</div>
        <h2 className="text-2xl md:text-4xl font-black mt-2">Trusted by professionals &amp; enthusiasts</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TESTIMONIALS.map((t,i) => (
          <div key={i} className="relative rounded-2xl border p-6 bg-card hover:shadow-premium transition">
            <Quote className="absolute top-4 right-4 text-primary/25" size={36} />
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.img} alt="" className="h-11 w-11 rounded-full object-cover" />
              <div>
                <div className="font-bold text-sm">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.role}</div>
              </div>
            </div>
            <div className="flex mt-3">{Array.from({length:t.rating}).map((_,j) => <Star key={j} size={14} className="fill-yellow-400 text-yellow-400" />)}</div>
            <p className="text-sm mt-3 leading-relaxed text-muted-foreground">“{t.text}”</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-10">
        {[
          {t:'Genuine Products', d:'100% authentic with warranty'},
          {t:'Flat-rate Delivery', d:'₹500 per order across India'},
          {t:'Easy Returns', d:'7-day no-questions-asked'},
          {t:'Secure Payments', d:'PCI DSS certified checkout'},
        ].map((x,i) => (
          <div key={i} className="rounded-2xl border p-4 flex items-center gap-3 bg-card">
            <div className="h-10 w-10 rounded-full bg-primary/15 text-primary grid place-items-center font-black">Z</div>
            <div><div className="font-bold text-sm">{x.t}</div><div className="text-[11px] text-muted-foreground">{x.d}</div></div>
          </div>
        ))}
      </div>
    </section>
  )
}
