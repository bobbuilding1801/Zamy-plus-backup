'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import SiteChrome from '@/components/site/SiteChrome'
import ProductRail from '@/components/site/ProductRail'
import StarRating from '@/components/site/StarRating'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useShop, formatINR } from '@/lib/store'
import { useCustomer } from '@/lib/customer'
import { toast } from 'sonner'
import { Heart, GitCompare, Share2, ShoppingCart, Zap, Truck, ShieldCheck, RotateCcw, Package, MapPin, Check } from 'lucide-react'
import Link from 'next/link'

function ProductInner() {
  const { id } = useParams()
  const [p, setP] = useState(null)
  const [sim, setSim] = useState([])
  const [fbt, setFbt] = useState([])
  const [reviews, setReviews] = useState([])
  const [qna, setQna] = useState([])
  const [imgIdx, setImgIdx] = useState(0)
  const [qty, setQty] = useState(1)
  const [zoom, setZoom] = useState({ show:false, x:0, y:0 })
  const [pin, setPin] = useState('560001')
  const { addToCart, toggleWishlist, wishlist, toggleCompare, compare, pushRecent } = useShop()
  const { user, setModalOpen } = useCustomer()
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', body: '' })
  const [postingReview, setPostingReview] = useState(false)

  useEffect(() => {
    if (!id) return
    fetch(`/api/products/${id}`).then(r=>r.json()).then(d => { setP(d); setImgIdx(0) })
    fetch(`/api/products/${id}/similar`).then(r=>r.json()).then(d => setSim(d.items||[]))
    fetch(`/api/products/${id}/fbt`).then(r=>r.json()).then(d => setFbt(d.items||[]))
    fetch(`/api/products/${id}/reviews`).then(r=>r.json()).then(d => setReviews(d.items||[]))
    fetch(`/api/products/${id}/qna`).then(r=>r.json()).then(d => setQna(d.items||[]))
    pushRecent(id)
  }, [id])

  if (!p) return <div className="container py-16 text-center text-muted-foreground">Loading…</div>
  const inWish = wishlist.includes(p.id)
  const inCmp = compare.includes(p.id)
  const savings = p.mrp - p.price
  const eta = new Date(Date.now() + (2 + Math.floor(Math.random()*3))*86400000).toLocaleDateString('en-US', { weekday:'short', day:'numeric', month:'short' })

  return (
    <div>
      <div className="container px-4 md:px-6 py-4 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-primary">Home</Link> / <Link href={`/category/${p.category}`} className="hover:text-primary">{p.category}</Link> / <span className="text-foreground">{p.subcategory}</span>
      </div>
      <div className="container px-4 md:px-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Gallery */}
        <div className="lg:col-span-5">
          <div
            className="relative aspect-square rounded-2xl overflow-hidden border bg-secondary/40"
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect()
              setZoom({ show:true, x: ((e.clientX - r.left)/r.width)*100, y: ((e.clientY - r.top)/r.height)*100 })
            }}
            onMouseLeave={() => setZoom(z => ({ ...z, show:false }))}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.images[imgIdx]} alt={p.name} className="h-full w-full object-cover" style={ zoom.show ? { transformOrigin: `${zoom.x}% ${zoom.y}%`, transform:'scale(2.2)' } : {}} />
            <div className="absolute top-3 left-3 flex flex-col gap-2">
              {p.discount > 0 && <Badge className="bg-primary text-primary-foreground">-{p.discount}%</Badge>}
              {p.tags?.includes('new') && <Badge className="bg-black text-white">NEW</Badge>}
            </div>
            <button className="absolute right-3 bottom-3 rounded-full bg-black/70 text-white text-xs px-3 py-1.5">360° View</button>
          </div>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {p.images.map((im, i) => (
              <button key={i} onClick={() => setImgIdx(i)} className={`aspect-square rounded-lg overflow-hidden border-2 ${i===imgIdx ? 'border-primary' : 'border-transparent'}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={im} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={() => toggleWishlist(p.id)} className={`flex-1 h-11 rounded-full border font-semibold text-sm inline-flex items-center justify-center gap-2 ${inWish ? 'text-red-500 border-red-300 bg-red-50 dark:bg-red-950/30' : 'hover:bg-secondary'}`}>
              <Heart size={16} className={inWish?'fill-red-500':''} /> {inWish?'Wishlisted':'Wishlist'}
            </button>
            <button onClick={() => toggleCompare(p.id)} className={`flex-1 h-11 rounded-full border font-semibold text-sm inline-flex items-center justify-center gap-2 ${inCmp ? 'text-primary border-primary bg-primary/10' : 'hover:bg-secondary'}`}>
              <GitCompare size={16} /> {inCmp?'In Compare':'Compare'}
            </button>
            <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied') }} className="h-11 w-11 rounded-full border grid place-items-center hover:bg-secondary"><Share2 size={16} /></button>
          </div>
        </div>

        {/* Info */}
        <div className="lg:col-span-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{p.brand}</div>
          <h1 className="text-2xl md:text-3xl font-extrabold mt-1">{p.name}</h1>
          <div className="mt-2 flex items-center gap-3">
            <StarRating value={p.rating} showValue count={p.ratingCount} />
            <span className="text-xs text-muted-foreground">SKU: {p.sku}</span>
          </div>
          <Separator className="my-4" />
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-black">{formatINR(p.price)}</span>
            {p.mrp > p.price && <span className="text-lg text-muted-foreground line-through">{formatINR(p.mrp)}</span>}
            {p.discount > 0 && <span className="text-sm font-bold text-green-600">Save {formatINR(savings)} ({p.discount}%)</span>}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Inclusive of all taxes. EMI from ${formatINR(Math.round(p.price/12))}/mo.</div>

          <div className="mt-5 space-y-3 rounded-2xl border p-4">
            <div className="flex items-center gap-2 text-sm">
              <Package size={16} className="text-primary" />
              {p.stock > 5 ? <span className="text-green-600 font-semibold">In Stock</span> : p.stock > 0 ? <span className="text-orange-500 font-semibold">Only {p.stock} left</span> : <span className="text-red-500 font-semibold">Out of Stock</span>}
            </div>
            <div className="flex items-center gap-2 text-sm"><Truck size={16} className="text-primary" /> Free delivery by <b>{eta}</b></div>
            <div className="flex items-center gap-2 text-sm"><ShieldCheck size={16} className="text-primary" /> 1 year manufacturer warranty</div>
            <div className="flex items-center gap-2 text-sm"><RotateCcw size={16} className="text-primary" /> 7-day easy returns</div>
            <div className="flex items-center gap-2 text-sm"><MapPin size={16} className="text-primary" />
              <input value={pin} onChange={e => setPin(e.target.value)} className="h-8 text-sm border rounded px-2 w-24 bg-background" />
              <button onClick={() => toast.success('Delivers to '+pin)} className="text-primary text-sm font-semibold">Check</button>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="inline-flex items-center rounded-full border">
              <button onClick={() => setQty(q => Math.max(1,q-1))} className="h-11 w-11 grid place-items-center hover:bg-secondary rounded-l-full">-</button>
              <span className="w-10 text-center font-bold">{qty}</span>
              <button onClick={() => setQty(q => q+1)} className="h-11 w-11 grid place-items-center hover:bg-secondary rounded-r-full">+</button>
            </div>
            <Button onClick={() => { addToCart(p.id, qty); toast.success('Added to cart') }} className="flex-1 h-12 rounded-full font-bold"><ShoppingCart size={16} className="mr-2" /> Add to Cart</Button>
          </div>
          <Link href="/checkout" onClick={() => addToCart(p.id, qty)}>
            <Button variant="outline" className="w-full h-12 rounded-full mt-2 font-bold border-2 border-black hover:bg-black hover:text-white"><Zap size={16} className="mr-2" /> Buy Now</Button>
          </Link>
        </div>

        {/* Seller / offers */}
        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-2xl border p-4">
            <div className="text-xs text-muted-foreground">Sold by</div>
            <div className="font-bold mt-1">ZAMY Direct</div>
            <div className="flex items-center gap-2 mt-1"><StarRating value={4.6} /> <span className="text-xs">4.6 (12k)</span></div>
            <Button variant="outline" className="w-full mt-3">View Seller Profile</Button>
          </div>
          <div className="rounded-2xl border p-4">
            <div className="font-bold mb-2">Offers</div>
            <ul className="text-sm space-y-2">
              <li className="flex gap-2"><Check size={16} className="text-primary shrink-0 mt-0.5" /> 10% off with WELCOME10 (first order)</li>
              <li className="flex gap-2"><Check size={16} className="text-primary shrink-0 mt-0.5" /> No-cost EMI from ${formatINR(Math.round(p.price/12))}/mo</li>
              <li className="flex gap-2"><Check size={16} className="text-primary shrink-0 mt-0.5" /> Cashback ${formatINR(Math.round(p.price*0.02))} on Zamy Card</li>
              <li className="flex gap-2"><Check size={16} className="text-primary shrink-0 mt-0.5" /> Exchange up to ${formatINR(Math.round(p.price*0.15))}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Tabs: description, specs, reviews, qna */}
      <div className="container px-4 md:px-6 mt-10">
        <Tabs defaultValue="desc">
          <TabsList className="w-full flex overflow-x-auto no-scrollbar">
            <TabsTrigger value="desc">Description</TabsTrigger>
            <TabsTrigger value="specs">Specifications</TabsTrigger>
            <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
            <TabsTrigger value="qna">Questions</TabsTrigger>
          </TabsList>
          <TabsContent value="desc" className="rounded-2xl border p-6 mt-3">
            <p className="text-sm md:text-base leading-relaxed">{p.description}</p>
            <p className="mt-3 text-sm text-muted-foreground">Enjoy premium quality with genuine warranty and ZAMY-verified seller assurance. Shipped in 100% recyclable packaging.</p>
          </TabsContent>
          <TabsContent value="specs" className="rounded-2xl border p-6 mt-3">
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(p.specs || {}).map(([k,v]) => (
                  <tr key={k} className="border-b last:border-0"><td className="py-2.5 pr-4 w-1/3 text-muted-foreground">{k}</td><td className="py-2.5 font-medium">{String(v)}</td></tr>
                ))}
                <tr className="border-b"><td className="py-2.5 pr-4 text-muted-foreground">Brand</td><td className="py-2.5 font-medium">{p.brand}</td></tr>
                <tr className="border-b"><td className="py-2.5 pr-4 text-muted-foreground">SKU</td><td className="py-2.5 font-medium">{p.sku}</td></tr>
                <tr className="border-b"><td className="py-2.5 pr-4 text-muted-foreground">Category</td><td className="py-2.5 font-medium capitalize">{p.category} › {p.subcategory}</td></tr>
              </tbody>
            </table>
          </TabsContent>
          <TabsContent value="reviews" className="rounded-2xl border p-6 mt-3 grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <div className="text-5xl font-black">{p.rating.toFixed(1)}</div>
              <StarRating value={p.rating} size={18} />
              <div className="text-sm text-muted-foreground mt-1">Based on {p.ratingCount.toLocaleString()} ratings</div>
              <Button className="mt-4 rounded-full" onClick={() => { if (!user) { setModalOpen(true); return } setShowReviewForm(v => !v) }}>{showReviewForm ? 'Cancel' : 'Write a Review'}</Button>
              {showReviewForm && (
                <div className="mt-4 rounded-xl border p-3 space-y-2">
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onClick={() => setReviewForm({...reviewForm, rating:n})} className="p-0.5">
                        <span className={n <= reviewForm.rating ? 'text-yellow-400 text-2xl' : 'text-neutral-300 text-2xl'}>★</span>
                      </button>
                    ))}
                  </div>
                  <input value={reviewForm.title} onChange={e => setReviewForm({...reviewForm, title:e.target.value})} placeholder="Title (optional)" className="w-full h-9 px-3 rounded-lg border bg-background text-sm" />
                  <textarea value={reviewForm.body} onChange={e => setReviewForm({...reviewForm, body:e.target.value})} placeholder="Share your experience with this product…" rows={3} className="w-full px-3 py-2 rounded-lg border bg-background text-sm resize-none" />
                  <Button size="sm" disabled={postingReview} onClick={async () => {
                    setPostingReview(true)
                    try {
                      const r = await fetch(`/api/products/${p.id}/reviews`, { method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${user.token}`}, body: JSON.stringify({ rating: reviewForm.rating, title: reviewForm.title, body: reviewForm.body, name: user.email.split('@')[0] })})
                      const d = await r.json()
                      if (!d.ok) throw new Error(d.error || 'Failed')
                      toast.success('Review posted, thank you!')
                      setShowReviewForm(false); setReviewForm({ rating:5, title:'', body:'' })
                      fetch(`/api/products/${p.id}/reviews`).then(r=>r.json()).then(d => setReviews(d.items||[]))
                    } catch (e) { toast.error(String(e.message||e)) }
                    finally { setPostingReview(false) }
                  }} className="rounded-full">{postingReview ? 'Posting…' : 'Post Review'}</Button>
                </div>
              )}
            </div>
            <div className="md:col-span-2 space-y-4">
              {reviews.map(r => (
                <div key={r.id} className="border-b last:border-0 pb-4">
                  <div className="flex items-center gap-2"><StarRating value={r.rating} /> <span className="font-semibold text-sm">{r.title}</span></div>
                  <div className="text-xs text-muted-foreground mt-0.5">{r.name} · {r.date} {r.verified && <span className="text-green-600 font-semibold">· Verified Purchase</span>}</div>
                  <p className="text-sm mt-2">{r.body}</p>
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="qna" className="rounded-2xl border p-6 mt-3 space-y-4">
            {qna.map((q,i) => (
              <div key={i} className="border-b last:border-0 pb-4">
                <div className="font-semibold">Q: {q.q}</div>
                <div className="text-sm mt-1">A: {q.a}</div>
                <div className="text-xs text-muted-foreground mt-1">by {q.by}</div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* FBT */}
      {fbt.length > 0 && (
        <section className="container px-4 md:px-6 py-10">
          <h2 className="text-xl md:text-2xl font-extrabold mb-4">Frequently Bought Together</h2>
          <div className="rounded-2xl border p-5 flex flex-wrap items-center gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="h-24 w-24 rounded-lg overflow-hidden border"><img src={p.images[0]} className="h-full w-full object-cover" alt="" /></div>
              {fbt.slice(0,2).map((f,i) => (
                <div key={f.id} className="flex items-center gap-4">
                  <span className="text-2xl text-muted-foreground">+</span>
                  <div className="h-24 w-24 rounded-lg overflow-hidden border"><img src={f.images[0]} className="h-full w-full object-cover" alt="" /></div>
                </div>
              ))}
            </div>
            <div className="ml-auto text-right">
              <div className="text-sm text-muted-foreground">Bundle price</div>
              <div className="text-2xl font-black">{formatINR(p.price + fbt.slice(0,2).reduce((s,f)=>s+f.price,0))}</div>
              <Button className="mt-2 rounded-full" onClick={() => { addToCart(p.id); fbt.slice(0,2).forEach(f => addToCart(f.id)); toast.success('Bundle added to cart') }}>Add All to Cart</Button>
            </div>
          </div>
        </section>
      )}

      {sim.length > 0 && <ProductRail title="Similar Products" products={sim} />}
      {sim.length > 0 && <ProductRail title="You May Also Like" products={[...sim].reverse()} />}
    </div>
  )
}

function Product() {
  return <SiteChrome><ProductInner /></SiteChrome>
}
export default Product
