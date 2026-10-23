'use client'
import SiteChrome from '@/components/site/SiteChrome'
import { useEffect, useMemo, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import ProductCard from '@/components/site/ProductCard'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { CATEGORIES, BRANDS } from '@/lib/data'
import { SlidersHorizontal, Search as SearchIcon } from 'lucide-react'
import StarRating from '@/components/site/StarRating'

function Filters({ filters, setFilters, categories }) {
  const toggleBrand = (b) => setFilters(f => ({ ...f, brand: f.brand.includes(b) ? f.brand.filter(x=>x!==b) : [...f.brand, b] }))
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-bold text-sm mb-2">Category</h3>
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="radio" name="cat" checked={!filters.category} onChange={() => setFilters(f => ({ ...f, category:'', subcategory:'' }))} /> All
          </label>
          {categories.map(c => (
            <label key={c.slug} className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="radio" name="cat" checked={filters.category===c.slug} onChange={() => setFilters(f => ({ ...f, category:c.slug, subcategory:'' }))} /> {c.name}
            </label>
          ))}
        </div>
      </div>
      <div>
        <h3 className="font-bold text-sm mb-2">Price</h3>
        <Slider value={[filters.minPrice, filters.maxPrice]} min={0} max={200000} step={500} onValueChange={(v) => setFilters(f => ({ ...f, minPrice:v[0], maxPrice:v[1] }))} />
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>${filters.minPrice.toLocaleString('en-US')}</span>
          <span>${filters.maxPrice.toLocaleString('en-US')}</span>
        </div>
      </div>
      <div>
        <h3 className="font-bold text-sm mb-2">Brand</h3>
        <div className="max-h-48 overflow-auto space-y-1.5 pr-2">
          {BRANDS.map(b => (
            <label key={b} className="flex items-center gap-2 cursor-pointer text-sm">
              <Checkbox checked={filters.brand.includes(b)} onCheckedChange={() => toggleBrand(b)} /> {b}
            </label>
          ))}
        </div>
      </div>
      <div>
        <h3 className="font-bold text-sm mb-2">Customer Rating</h3>
        {[4,3,2].map(r => (
          <label key={r} className="flex items-center gap-2 cursor-pointer text-sm mb-1">
            <input type="radio" name="rating" checked={filters.rating===r} onChange={() => setFilters(f => ({ ...f, rating:r }))} />
            <StarRating value={r} /> &amp; up
          </label>
        ))}
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input type="radio" name="rating" checked={filters.rating===0} onChange={() => setFilters(f => ({ ...f, rating:0 }))} /> Any
        </label>
      </div>
      <div>
        <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold">
          <Checkbox checked={filters.inStock} onCheckedChange={(v) => setFilters(f => ({ ...f, inStock:!!v }))} /> In stock only
        </label>
      </div>
      <Button variant="outline" className="w-full" onClick={() => setFilters({ q:'', category:'', subcategory:'', brand:[], minPrice:0, maxPrice:200000, rating:0, inStock:false, sort:'popular', tag:'' })}>Clear all</Button>
    </div>
  )
}

function ShopInner() {
  const sp = useSearchParams()
  const router = useRouter()
  const [categories,setCategories] = useState(CATEGORIES)
  useEffect(() => { fetch('/api/categories').then(r=>r.json()).then(d=>{if(Array.isArray(d.items))setCategories(d.items)}).catch(()=>{}) },[])
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    q: sp.get('q') || '',
    category: sp.get('category') || '',
    subcategory: sp.get('subcategory') || '',
    brand: sp.get('brand') ? sp.get('brand').split(',') : [],
    minPrice: parseFloat(sp.get('minPrice')) || 0,
    maxPrice: parseFloat(sp.get('maxPrice')) || 200000,
    rating: parseFloat(sp.get('rating')) || 0,
    inStock: sp.get('inStock') === 'true',
    sort: sp.get('sort') || 'popular',
    tag: sp.get('tag') || '',
  })

  const query = useMemo(() => {
    const p = new URLSearchParams()
    Object.entries(filters).forEach(([k,v]) => {
      if (Array.isArray(v)) { if (v.length) p.set(k, v.join(',')) }
      else if (v !== '' && v !== 0 && v !== false && !(k==='maxPrice' && v===200000)) p.set(k, String(v))
    })
    return p.toString()
  }, [filters])

  useEffect(() => {
    setLoading(true)
    fetch(`/api/products?${query}`).then(r=>r.json()).then(d => { setItems(d.items||[]); setTotal(d.total||0); setLoading(false) })
    // sync URL
    router.replace(`/shop?${query}`, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  return (
    <div className="container px-4 md:px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold">{filters.q ? `Results for “${filters.q}”` : filters.category ? categories.find(c=>c.slug===filters.category)?.name : 'All Products'}</h1>
          <p className="text-sm text-muted-foreground">{total.toLocaleString()} products</p>
        </div>
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden gap-2"><SlidersHorizontal size={14} /> Filters</Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[320px] overflow-y-auto">
              <SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader>
              <div className="mt-4"><Filters filters={filters} setFilters={setFilters} categories={categories} /></div>
            </SheetContent>
          </Sheet>
          <Select value={filters.sort} onValueChange={(v) => setFilters(f => ({ ...f, sort:v }))}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Sort by" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Popularity</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="price_asc">Price: Low to High</SelectItem>
              <SelectItem value="price_desc">Price: High to Low</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="discount">Biggest Discount</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-12 gap-6">
        <aside className="hidden lg:block col-span-3 sticky top-28 h-fit rounded-2xl border p-5 bg-card">
          <Filters filters={filters} setFilters={setFilters} categories={categories} />
        </aside>
        <div className="col-span-12 lg:col-span-9">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {Array.from({length:9}).map((_,i)=><div key={i} className="aspect-[3/4] rounded-2xl bg-secondary animate-pulse" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border p-12 text-center">
              <SearchIcon className="mx-auto mb-3 text-muted-foreground" />
              <div className="font-bold">No products match your filters</div>
              <p className="text-sm text-muted-foreground">Try adjusting or clearing filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map(p => <ProductCard key={p.id} p={p} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Shop() {
  return (
    <SiteChrome>
      <Suspense fallback={<div className="container py-16">Loading…</div>}>
        <ShopInner />
      </Suspense>
    </SiteChrome>
  )
}
export default Shop
