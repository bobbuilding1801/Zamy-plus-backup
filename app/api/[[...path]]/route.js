import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { MongoClient } from 'mongodb'
import crypto from 'crypto'
import { CATEGORIES, BRANDS, HERO_SLIDES, PROMOS } from '@/lib/data'
import {
  listAllProducts, findProductAsync, filterProductsAsync, suggestProductsAsync, similarProductsAsync,
  createProduct, updateProduct, deleteProduct, decrementStock,
} from '@/lib/products'
import { chatCompletion } from '@/lib/llm'
import { sendOtpEmail, sendOrderCustomerEmail, sendOrderAdminEmail, buildItemsHtml } from '@/lib/email'

export const runtime = 'nodejs'

// --- Auth helpers ---
function b64url(buf) { return Buffer.from(buf).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'') }
function b64urlDecode(s) { s = s.replace(/-/g,'+').replace(/_/g,'/'); while (s.length % 4) s += '='; return Buffer.from(s, 'base64').toString() }
function sign(payload, secret) { return crypto.createHmac('sha256', secret).update(payload).digest('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'') }
function makeToken(email, role) {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET is not configured')
  const body = JSON.stringify({ email, role, iat: Date.now(), exp: Date.now() + 7*86400000 })
  const p = b64url(body); const sig = sign(p, secret)
  return `${p}.${sig}`
}
function verifyToken(token) {
  try {
    const [p, sig] = String(token || '').split('.')
    if (!p || !sig) return null
    const secret = process.env.AUTH_SECRET
    if (!secret) return null
    if (sign(p, secret) !== sig) return null
    const data = JSON.parse(b64urlDecode(p))
    if (!data.exp || data.exp < Date.now()) return null
    return data
  } catch { return null }
}
function requireAuth(request, role) {
  const auth = request.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  const t = verifyToken(token)
  if (!t || (role && t.role !== role)) return null
  return t
}

// Admin notify emails: comma-separated list from env (defaults to admin login list)
function adminNotifyEmails() {
  const raw = process.env.ADMIN_NOTIFY_EMAILS || process.env.ADMIN_EMAILS || 'admin@zamy.market'
  return raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
}

let client, db
async function getDb() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    db = client.db(process.env.DB_NAME)
  }
  return db
}

function cors(res) {
  res.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return res
}
export async function OPTIONS() { return cors(new NextResponse(null, { status: 200 })) }

// (order tracking is derived from real order status in the /track handler)

// Compute analytics from real orders in Mongo
async function computeAdminAnalytics(db) {
  const days = 30
  const now = Date.now()
  const start = now - days * 86400000
  const orders = await db.collection('orders').find({ createdAt: { $gte: start } }).toArray().catch(() => [])
  // Build day-by-day revenue map
  const rev = new Map()
  for (let i = 0; i < days; i++) {
    const d = new Date(now - (days - i - 1) * 86400000).toISOString().slice(0, 10)
    rev.set(d, { date: d, revenue: 0, orders: 0 })
  }
  let totalRevenue = 0, totalOrders = 0
  const catMap = new Map()
  const prodMap = new Map()
  const customerSet = new Set()
  for (const o of orders) {
    const d = new Date(o.createdAt || Date.now()).toISOString().slice(0, 10)
    const row = rev.get(d)
    if (row) { row.revenue += o.total || 0; row.orders += 1 }
    totalRevenue += o.total || 0
    totalOrders += 1
    if (o.address?.email) customerSet.add(o.address.email.toLowerCase())
    for (const it of (o.items || [])) {
      const cat = it.product?.category || 'other'
      catMap.set(cat, (catMap.get(cat) || 0) + (it.product?.price || 0) * (it.qty || 1))
      const pid = it.product?.id
      if (pid) {
        const prev = prodMap.get(pid) || { id: pid, name: it.product?.name, sold: 0, revenue: 0 }
        prev.sold += it.qty || 1
        prev.revenue += (it.product?.price || 0) * (it.qty || 1)
        prodMap.set(pid, prev)
      }
    }
  }
  const catShare = Array.from(catMap.entries()).map(([slug, value]) => {
    const c = CATEGORIES.find(x => x.slug === slug)
    return { name: c?.name || slug, value: Math.round(value) }
  })
  const topProducts = Array.from(prodMap.values()).sort((a, b) => b.sold - a.sold).slice(0, 5)
  const revenue = Array.from(rev.values())
  return {
    revenue,
    catShare: catShare.length ? catShare : CATEGORIES.slice(0, 4).map(c => ({ name: c.name, value: 0 })),
    topProducts,
    totals: {
      revenue: totalRevenue,
      orders: totalOrders,
      customers: customerSet.size,
      aov: totalOrders ? Math.round(totalRevenue / totalOrders) : 0,
    },
  }
}

async function computeSellerAnalytics(db) {
  const days = 14
  const now = Date.now()
  const start = now - days * 86400000
  const orders = await db.collection('orders').find({ createdAt: { $gte: start } }).toArray().catch(() => [])
  const rev = new Map()
  for (let i = 0; i < days; i++) {
    const d = new Date(now - (days - i - 1) * 86400000).toISOString().slice(0, 10)
    rev.set(d, { date: d, revenue: 0, orders: 0 })
  }
  let totalRevenue = 0, totalOrders = 0
  for (const o of orders) {
    const d = new Date(o.createdAt || Date.now()).toISOString().slice(0, 10)
    const row = rev.get(d)
    if (row) { row.revenue += o.total || 0; row.orders += 1 }
    totalRevenue += o.total || 0
    totalOrders += 1
  }
  const products = await listAllProducts()
  return {
    revenue: Array.from(rev.values()),
    products,
    totals: {
      revenue: totalRevenue,
      orders: totalOrders,
      pendingPayout: Math.round(totalRevenue * 0.85),
      rating: 4.7,
    },
  }
}

async function handler(request, { params }) {
  const { path = [] } = await params
  const route = '/' + path.join('/')
  const method = request.method
  const url = new URL(request.url)
  const qs = Object.fromEntries(url.searchParams.entries())

  try {
    if ((route === '/' || route === '/root') && method === 'GET') {
      return cors(NextResponse.json({ ok: true, service: 'ZAMY API', version: '1.2.0' }))
    }

    // ---- AUTH ----
    if (route === '/auth/login' && method === 'POST') {
      const { email = '', password = '', role = 'admin' } = await request.json()
      if (!['admin', 'seller'].includes(role)) return cors(NextResponse.json({ ok:false, error:'Invalid role' }, { status:400 }))
      const cfg = role === 'seller'
        ? { emails: (process.env.SELLER_EMAILS || 'seller@zamy.market').toLowerCase().split(',').map(s=>s.trim()), password: process.env.SELLER_PASSWORD }
        : { emails: (process.env.ADMIN_EMAILS  || 'admin@zamy.market' ).toLowerCase().split(',').map(s=>s.trim()), password: process.env.ADMIN_PASSWORD }
      if (!cfg.password || !process.env.AUTH_SECRET || !process.env.ADMIN_EMAILS && role === 'admin' || !process.env.SELLER_EMAILS && role === 'seller') return cors(NextResponse.json({ ok:false, error:'Authentication is not configured' }, { status:503 }))
      const em = String(email).toLowerCase().trim()
      if (!cfg.emails.includes(em)) return cors(NextResponse.json({ ok:false, error: 'Email not authorized for this role.' }, { status: 401 }))
      if (String(password) !== cfg.password) return cors(NextResponse.json({ ok:false, error: 'Incorrect password.' }, { status: 401 }))
      const token = makeToken(em, role)
      return cors(NextResponse.json({ ok:true, email: em, role, token }))
    }
    if (route === '/auth/verify' && method === 'POST') {
      const { token = '' } = await request.json().catch(() => ({}))
      const t = verifyToken(token)
      if (!t) return cors(NextResponse.json({ ok:false }, { status: 401 }))
      return cors(NextResponse.json({ ok:true, email: t.email, role: t.role }))
    }

    // ---- CUSTOMER OTP AUTH ----
    if (route === '/customer/otp/request' && method === 'POST') {
      const { email = '' } = await request.json()
      const em = String(email).toLowerCase().trim()
      if (!em || !em.includes('@')) return cors(NextResponse.json({ ok:false, error: 'Enter a valid email' }, { status: 400 }))
      const code = String(Math.floor(100000 + Math.random() * 900000))
      const database = await getDb().catch(() => null)
      if (database) {
        await database.collection('otp').updateOne(
          { email: em },
          { $set: { email: em, code, expiresAt: Date.now() + 10*60*1000, attempts: 0 } },
          { upsert: true },
        )
      }
      await sendOtpEmail({ to: em, code }).catch(err => console.error('otp email err', err))
      // In mock mode (no RESEND key), also return the code so the client can display it during dev.
      const devMode = !process.env.RESEND_API_KEY
      return cors(NextResponse.json({ ok:true, devCode: devMode ? code : undefined }))
    }
    if (route === '/customer/otp/verify' && method === 'POST') {
      const { email = '', code = '' } = await request.json()
      const em = String(email).toLowerCase().trim()
      const database = await getDb().catch(() => null)
      if (!database) return cors(NextResponse.json({ ok:false, error: 'DB unavailable' }, { status: 500 }))
      const rec = await database.collection('otp').findOne({ email: em })
      if (!rec) return cors(NextResponse.json({ ok:false, error: 'No code requested. Please request a new one.' }, { status: 400 }))
      if (rec.expiresAt < Date.now()) return cors(NextResponse.json({ ok:false, error: 'Code expired. Request a new one.' }, { status: 400 }))
      if ((rec.attempts || 0) >= 5) return cors(NextResponse.json({ ok:false, error: 'Too many attempts. Request a new code.' }, { status: 429 }))
      if (String(code) !== rec.code) {
        await database.collection('otp').updateOne({ email: em }, { $inc: { attempts: 1 } })
        return cors(NextResponse.json({ ok:false, error: 'Incorrect code' }, { status: 400 }))
      }
      // Consume the OTP
      await database.collection('otp').deleteOne({ email: em })
      // Upsert customer profile
      const existing = await database.collection('customers').findOne({ email: em })
      const profile = existing || { id: uuidv4(), email: em, createdAt: Date.now() }
      if (!existing) await database.collection('customers').insertOne(profile)
      const token = makeToken(em, 'customer')
      return cors(NextResponse.json({ ok:true, email: em, role: 'customer', token, profile: { id: profile.id, email: profile.email, name: profile.name, createdAt: profile.createdAt } }))
    }
    if (route === '/customer/me' && method === 'GET') {
      const t = requireAuth(request, 'customer')
      if (!t) return cors(NextResponse.json({ ok:false }, { status: 401 }))
      const database = await getDb().catch(() => null)
      const profile = database ? await database.collection('customers').findOne({ email: t.email }) : null
      return cors(NextResponse.json({ ok:true, email: t.email, profile: profile ? { id: profile.id, email: profile.email, name: profile.name, createdAt: profile.createdAt } : { email: t.email } }))
    }
    if (route === '/customer/update' && method === 'POST') {
      const t = requireAuth(request, 'customer')
      if (!t) return cors(NextResponse.json({ ok:false }, { status: 401 }))
      const body = await request.json()
      const database = await getDb().catch(() => null)
      if (!database) return cors(NextResponse.json({ ok:false }, { status: 500 }))
      const patch = {}
      if (typeof body.name === 'string') patch.name = body.name.slice(0, 60)
      if (typeof body.mobile === 'string') patch.mobile = body.mobile.slice(0, 20)
      await database.collection('customers').updateOne({ email: t.email }, { $set: patch })
      return cors(NextResponse.json({ ok:true }))
    }
    if (route === '/customer/orders' && method === 'GET') {
      const t = requireAuth(request, 'customer')
      if (!t) return cors(NextResponse.json({ ok:false }, { status: 401 }))
      const database = await getDb().catch(() => null)
      if (!database) return cors(NextResponse.json({ items: [] }))
      const items = await database.collection('orders').find({ 'address.email': t.email }).sort({ createdAt: -1 }).toArray().catch(() => [])
      const clean = items.map(o => { const { _id, ...rest } = o; return rest })
      return cors(NextResponse.json({ items: clean }))
    }

    // ---- CUSTOMER RETURNS ----
    if (route === '/customer/returns' && method === 'GET') {
      const t = requireAuth(request, 'customer')
      if (!t) return cors(NextResponse.json({ ok:false }, { status: 401 }))
      const database = await getDb().catch(() => null)
      if (!database) return cors(NextResponse.json({ items: [] }))
      const items = await database.collection('returns').find({ email: t.email }).sort({ createdAt: -1 }).toArray().catch(() => [])
      return cors(NextResponse.json({ items: items.map(({_id, ...r}) => r) }))
    }
    if (route === '/customer/returns' && method === 'POST') {
      const t = requireAuth(request, 'customer')
      if (!t) return cors(NextResponse.json({ ok:false }, { status: 401 }))
      const body = await request.json()
      const database = await getDb().catch(() => null)
      if (!database) return cors(NextResponse.json({ ok:false }, { status: 500 }))
      const orderId = String(body.orderId || '').trim()
      const order = await database.collection('orders').findOne({ id: orderId, 'address.email': t.email })
      if (!order) return cors(NextResponse.json({ ok:false, error: 'Order not found for this account' }, { status: 404 }))
      const reason = String(body.reason || '').slice(0, 300)
      const productId = String(body.productId || (order.items?.[0]?.product?.id) || '')
      const product = order.items?.find(i => i.product?.id === productId)?.product || order.items?.[0]?.product
      const doc = {
        id: 'RMA-' + uuidv4().slice(0,8).toUpperCase(),
        orderId,
        email: t.email,
        productId,
        productName: product?.name || '—',
        productImage: product?.images?.[0] || '',
        reason,
        mode: body.mode || 'refund', // refund | replace
        status: 'requested',        // requested | approved | picked | refunded | rejected
        amount: order.total || 0,
        createdAt: Date.now(),
        history: [{ at: Date.now(), by: t.email, note: 'Return requested' }],
      }
      await database.collection('returns').insertOne({ ...doc })
      return cors(NextResponse.json({ ok:true, item: doc }))
    }

    // ---- CUSTOMER SUPPORT TICKETS ----
    if (route === '/customer/tickets' && method === 'GET') {
      const t = requireAuth(request, 'customer')
      if (!t) return cors(NextResponse.json({ ok:false }, { status: 401 }))
      const database = await getDb().catch(() => null)
      if (!database) return cors(NextResponse.json({ items: [] }))
      const items = await database.collection('tickets').find({ email: t.email }).sort({ updatedAt: -1 }).toArray().catch(() => [])
      return cors(NextResponse.json({ items: items.map(({_id, ...r}) => r) }))
    }
    if (route === '/customer/tickets' && method === 'POST') {
      const t = requireAuth(request, 'customer')
      if (!t) return cors(NextResponse.json({ ok:false }, { status: 401 }))
      const body = await request.json()
      const database = await getDb().catch(() => null)
      if (!database) return cors(NextResponse.json({ ok:false }, { status: 500 }))
      const subject = String(body.subject || '').slice(0, 120) || 'Support request'
      const message = String(body.message || '').slice(0, 2000)
      if (!message) return cors(NextResponse.json({ ok:false, error:'Message is required' }, { status: 400 }))
      const doc = {
        id: 'TKT-' + uuidv4().slice(0,8).toUpperCase(),
        email: t.email,
        subject,
        category: body.category || 'general', // order | product | delivery | refund | general
        orderId: body.orderId || '',
        status: 'open',                        // open | pending | resolved | closed
        priority: body.priority || 'normal',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [{ id: uuidv4().slice(0,6), from: 'customer', by: t.email, text: message, at: Date.now() }],
      }
      await database.collection('tickets').insertOne({ ...doc })
      return cors(NextResponse.json({ ok:true, item: doc }))
    }
    if (route.startsWith('/customer/tickets/') && route.endsWith('/reply') && method === 'POST') {
      const t = requireAuth(request, 'customer')
      if (!t) return cors(NextResponse.json({ ok:false }, { status: 401 }))
      const id = route.split('/')[3]
      const body = await request.json()
      const database = await getDb().catch(() => null)
      if (!database) return cors(NextResponse.json({ ok:false }, { status: 500 }))
      const text = String(body.message || '').slice(0, 2000)
      if (!text) return cors(NextResponse.json({ ok:false, error:'Message required' }, { status: 400 }))
      const msg = { id: uuidv4().slice(0,6), from: 'customer', by: t.email, text, at: Date.now() }
      await database.collection('tickets').updateOne(
        { id, email: t.email },
        { $push: { messages: msg }, $set: { updatedAt: Date.now(), status: 'open' } },
      )
      return cors(NextResponse.json({ ok:true }))
    }

    if (route === '/categories' && method === 'GET') return cors(NextResponse.json({ items: CATEGORIES }))
    if (route === '/brands' && method === 'GET') return cors(NextResponse.json({ items: BRANDS }))

    // Batched homepage sections in a single response (huge perf win)
    if (route === '/home' && method === 'GET') {
      const pick = async (opts, n=12) => (await filterProductsAsync(opts)).slice(0, n)
      const [featured, bestsellers, trending, newArrivals, topRated, deals] = await Promise.all([
        pick({ tag:'featured', sort:'popular' }),
        pick({ tag:'bestseller', sort:'popular' }),
        pick({ tag:'trending', sort:'popular' }),
        pick({ tag:'new', sort:'newest' }),
        pick({ tag:'toprated', sort:'rating' }),
        pick({ tag:'deal', sort:'discount' }),
      ])
      const res = NextResponse.json({ featured, bestsellers, trending, newArrivals, topRated, deals })
      res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
      return cors(res)
    }

    if (route === '/products' && method === 'GET') {
      const brand = qs.brand ? String(qs.brand).split(',') : []
      const limit = Math.min(parseInt(qs.limit||'0') || 0, 200)
      const skip = parseInt(qs.skip||'0') || 0
      const items = await filterProductsAsync({
        q: qs.q || '', category: qs.category || '', subcategory: qs.subcategory || '',
        brand, minPrice: parseFloat(qs.minPrice) || 0, maxPrice: qs.maxPrice ? parseFloat(qs.maxPrice) : Infinity,
        rating: parseFloat(qs.rating) || 0, inStock: qs.inStock === 'true',
        sort: qs.sort || 'popular', tag: qs.tag || '',
      })
      const total = items.length
      const sliced = limit ? items.slice(skip, skip + limit) : items
      return cors(NextResponse.json({ items: sliced, total }))
    }
    if (route === '/products/suggest' && method === 'GET') return cors(NextResponse.json({ items: await suggestProductsAsync(qs.q || '', 8) }))
    if (route === '/products/by-ids' && method === 'GET') {
      const ids = (qs.ids || '').split(',').filter(Boolean)
      const all = await listAllProducts()
      const map = new Map(all.map(p => [p.id, p]))
      const items = ids.map(id => map.get(id)).filter(Boolean)
      return cors(NextResponse.json({ items }))
    }
    if (route.startsWith('/products/') && route.endsWith('/similar') && method === 'GET') {
      const id = route.split('/')[2]
      return cors(NextResponse.json({ items: await similarProductsAsync(await findProductAsync(id), 8) }))
    }
    if (route.startsWith('/products/') && route.endsWith('/fbt') && method === 'GET') {
      const id = route.split('/')[2]; const p = await findProductAsync(id)
      if (!p) return cors(NextResponse.json({ items: [] }))
      const items = (await filterProductsAsync({ category: p.category })).filter(x => x.id !== id).slice(0, 3)
      return cors(NextResponse.json({ items }))
    }
    if (route.startsWith('/products/') && route.endsWith('/reviews') && method === 'GET') {
      const id = route.split('/')[2]; const p = await findProductAsync(id)
      if (!p) return cors(NextResponse.json({ items: [] }))
      const database = await getDb().catch(() => null)
      const real = database ? await database.collection('reviews').find({ productId: id, status: 'approved' }).sort({ createdAt: -1 }).toArray().catch(() => []) : []
      const realClean = real.map(({_id, ...r}) => ({ ...r, date: new Date(r.createdAt).toISOString().slice(0,10) }))
      // Fill with seed reviews only if none real yet
      const seed = realClean.length ? [] : (() => {
        const names = ['Aarav S.','Priya M.','Rahul K.','Neha J.','Karan V.','Sanya D.']
        const titles = ['Excellent product!','Great value','Loved it','Highly recommend','Impressive quality','Solid build']
        const bodies = ['Delivery was quick and packaging was premium. Product exceeded my expectations.','Have been using for 3 weeks and no complaints. Very happy with the purchase.','Build quality is excellent. Genuine product from ZAMY.','Just what I needed. 5 stars from me!','Feels premium and performs well. Would buy again.']
        return Array.from({length:4}).map((_,i) => ({
          id: `${id}-r${i}`, name: names[(parseInt(id)+i)%names.length], title: titles[(parseInt(id)+i)%titles.length],
          rating: 4 + ((parseInt(id)+i)%2 === 0 ? 1 : 0), date: new Date(Date.now() - (i+1)*5*86400000).toISOString().slice(0,10),
          body: bodies[i%bodies.length], verified: true,
        }))
      })()
      return cors(NextResponse.json({ items: [...realClean, ...seed] }))
    }
    if (route.startsWith('/products/') && route.endsWith('/qna') && method === 'GET') {
      return cors(NextResponse.json({ items: [
        { q:'Is this the latest model?', a:'Yes, this is the current 2025 model with full manufacturer warranty.', by:'ZAMY Seller' },
        { q:'Does it come with a warranty?', a:'Yes, 1 year manufacturer warranty is included.', by:'ZAMY Seller' },
        { q:'What is the return policy?', a:'7-day easy returns from the date of delivery.', by:'ZAMY Support' },
      ]}))
    }
    if (route.startsWith('/products/') && method === 'GET') {
      const id = route.split('/')[2]; const p = await findProductAsync(id)
      if (!p) return cors(NextResponse.json({ error: 'Not found' }, { status: 404 }))
      return cors(NextResponse.json(p))
    }

    // Orders (with stock decrement + email confirmations)
    if (route === '/orders' && method === 'POST') {
      const body = await request.json()
      const wantedItems = (body.items || []).map(i => ({ id: String(i.id || ''), qty: Number(i.qty) }))
      if (!wantedItems.length || wantedItems.some(i => !i.id || !Number.isSafeInteger(i.qty) || i.qty < 1 || i.qty > 100)) return cors(NextResponse.json({ ok:false, error:'Invalid order items' }, { status:400 }))
      const database = await getDb().catch(() => null)
      if (!database) return cors(NextResponse.json({ ok:false, error:'Database unavailable' }, { status:503 }))
      for (const it of wantedItems) {
        const p = await findProductAsync(it.id)
        if (!p) return cors(NextResponse.json({ ok:false, error: `Product ${it.id} not found` }, { status: 400 }))
        if ((p.stock || 0) < it.qty) return cors(NextResponse.json({ ok:false, error: `Only ${p.stock} left of "${p.name}"` }, { status: 409 }))
      }
      // Reserve stock atomically; roll back reservations if any item fails or order save fails.
      const reserved = []
      const rollback = async () => { for (const it of reserved) await database.collection('products').updateOne({ id: it.id }, { $inc: { stock: it.qty } }) }
      try {
        for (const it of wantedItems) {
          const r = await database.collection('products').updateOne({ id: it.id, stock: { $gte: it.qty } }, { $inc: { stock: -it.qty } })
          if (!r.modifiedCount) { await rollback(); return cors(NextResponse.json({ ok:false, error:'Insufficient stock; please refresh your cart' }, { status:409 })) }
          reserved.push(it)
        }
      } catch (e) { await rollback(); throw e }
      // If customer is signed in, attach email from token
      const custAuth = requireAuth(request, 'customer')
      if (custAuth && (!body.address || !body.address.email)) {
        body.address = { ...(body.address || {}), email: custAuth.email }
      }
      // Enrich item entries with product details so downstream views (returns, tracking, admin, emails) can show them.
      const enrichedItems = []
      for (const it of (body.items || [])) {
        const p = await findProductAsync(it.id)
        enrichedItems.push({
          id: it.id,
          qty: it.qty || 1,
          product: p ? { id: p.id, name: p.name, price: p.price, images: p.images, brand: p.brand, category: p.category, subcategory: p.subcategory } : null,
        })
      }
      const order = { id: uuidv4().slice(0,8).toUpperCase(), createdAt: Date.now(), status: 'confirmed', ...body, items: enrichedItems }
      try { await database.collection('orders').insertOne({ ...order }) } catch (e) {
        await rollback()
        console.error('Order save failed', e)
        return cors(NextResponse.json({ ok:false, error:'Could not save order; please try again' }, { status:503 }))
      }

      // Fire and forget emails (customer + admin)
      const itemsHtml = buildItemsHtml(order)
      const custEmail = order.address?.email
      const adminList = adminNotifyEmails()
      Promise.all([
        custEmail ? sendOrderCustomerEmail({ to: custEmail, order, itemsHtml }).catch(e => console.error('cust email', e)) : null,
        adminList.length ? sendOrderAdminEmail({ to: adminList, order, itemsHtml }).catch(e => console.error('admin email', e)) : null,
      ])

      return cors(NextResponse.json({ ok: true, order }))
    }

    // Order tracking — pulls real order status if available
    if (route.startsWith('/track/') && method === 'GET') {
      const orderId = route.split('/')[2]
      const database = await getDb().catch(() => null)
      const order = database ? await database.collection('orders').findOne({ id: orderId }) : null
      const status = order?.status || 'confirmed'
      const STAGE_ORDER = ['confirmed','packed','shipped','out','delivered']
      const currentIdx = STAGE_ORDER.indexOf(status)
      const created = order?.createdAt || Date.now() - 6*3600000
      const stages = [
        { key:'confirmed', label:'Order Confirmed', at: created },
        { key:'packed',    label:'Packed at Warehouse', at: created + 3*3600000 },
        { key:'shipped',   label:'Shipped', at: created + 12*3600000 },
        { key:'out',       label:'Out for Delivery', at: created + 24*3600000 },
        { key:'delivered', label:'Delivered', at: created + 36*3600000 },
      ].map((s, i) => ({ ...s, done: i <= currentIdx }))
      return cors(NextResponse.json({ orderId, courier: 'ZAMY Express', awb: 'ZMY' + orderId.slice(-6), stages, status }))
    }

    // Admin (auth required)
    if (route.startsWith('/admin/')) {
      if (!requireAuth(request, 'admin')) return cors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }
    if (route.startsWith('/seller/')) {
      if (!requireAuth(request, 'seller')) return cors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }
    if (route === '/admin/analytics' && method === 'GET') {
      const database = await getDb().catch(() => null)
      if (!database) return cors(NextResponse.json({ revenue:[], catShare:[], topProducts:[], totals:{revenue:0,orders:0,customers:0,aov:0} }))
      return cors(NextResponse.json(await computeAdminAnalytics(database)))
    }
    if (route === '/admin/orders' && method === 'GET') {
      const database = await getDb().catch(() => null)
      if (!database) return cors(NextResponse.json({ items: [] }))
      const raw = await database.collection('orders').find({}).sort({ createdAt: -1 }).limit(200).toArray().catch(() => [])
      const items = raw.map(o => {
        const first = (o.items || [])[0]
        return {
          id: o.id,
          customer: o.address?.name || 'Guest',
          email: o.address?.email || '—',
          productId: first?.product?.id || '',
          product: first?.product?.name || (o.items?.length ? `${o.items.length} items` : 'Order'),
          image: first?.product?.images?.[0] || '',
          total: o.total || 0,
          status: o.status || 'confirmed',
          createdAt: o.createdAt || Date.now(),
          itemCount: o.items?.length || 0,
        }
      })
      return cors(NextResponse.json({ items }))
    }
    if (route === '/admin/customers' && method === 'GET') {
      const database = await getDb().catch(() => null)
      if (!database) return cors(NextResponse.json({ items: [] }))
      const raw = await database.collection('orders').find({}).toArray().catch(() => [])
      const map = new Map()
      for (const o of raw) {
        const email = (o.address?.email || '').toLowerCase().trim()
        if (!email) continue
        const prev = map.get(email) || {
          id: 'CUS-' + email.split('@')[0].slice(0, 8).toUpperCase(),
          name: o.address?.name || '—',
          email,
          orders: 0,
          spend: 0,
          joined: new Date(o.createdAt || Date.now()).toISOString().slice(0, 10),
        }
        prev.orders += 1
        prev.spend += o.total || 0
        if ((o.createdAt || 0) < new Date(prev.joined).getTime()) prev.joined = new Date(o.createdAt).toISOString().slice(0, 10)
        map.set(email, prev)
      }
      return cors(NextResponse.json({ items: Array.from(map.values()).sort((a, b) => b.spend - a.spend) }))
    }
    if (route === '/admin/coupons' && method === 'GET') {
      const database = await getDb().catch(() => null)
      const stored = database ? await database.collection('coupons').find({}).toArray().catch(() => []) : []
      const items = stored.length ? stored.map(({_id, ...r}) => r) : [
        { code:'WELCOME10', discount:'10%', min:0, uses:1245, cap:'₹2000' },
        { code:'ZAMY20', discount:'20%', min:1499, uses:632, cap:'₹5000' },
        { code:'FLAT500', discount:'₹500', min:2999, uses:412, cap:'–' },
        { code:'FREESHIP', discount:'Free shipping', min:0, uses:2210, cap:'–' },
      ]
      return cors(NextResponse.json({ items }))
    }
    // Admin product management
    if (route === '/admin/products' && method === 'GET') {
      const items = await listAllProducts()
      return cors(NextResponse.json({ items }))
    }
    if (route === '/admin/products' && method === 'POST') {
      const body = await request.json()
      const created = await createProduct(body)
      return cors(NextResponse.json({ ok: true, product: created }))
    }
    if (route.startsWith('/admin/products/') && method === 'PUT') {
      const id = route.split('/')[3]
      const body = await request.json()
      const updated = await updateProduct(id, body)
      if (!updated) return cors(NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 }))
      return cors(NextResponse.json({ ok: true, product: updated }))
    }
    if (route.startsWith('/admin/products/') && method === 'DELETE') {
      const id = route.split('/')[3]
      const ok = await deleteProduct(id)
      return cors(NextResponse.json({ ok }))
    }

    if (route === '/admin/reviews' && method === 'GET') {
      const database = await getDb().catch(() => null)
      const list = await listAllProducts()
      const dbReviews = database ? await database.collection('reviews').find({}).sort({ createdAt: -1 }).toArray().catch(() => []) : []
      const items = dbReviews.map(r => { const { _id, ...rest } = r; return rest })
      // If DB is empty, expose seed reviews so admin has something to see
      if (!items.length) {
        list.slice(0,5).forEach((p,i) => items.push({
          id: 'RV-'+p.id, productId: p.id, product: p.name, image: p.images?.[0],
          name: ['Rahul K.','Priya S.','Vikas P.','Neha J.','Karan D.'][i%5], rating: (i%2===0)?5:4,
          title: ['Loved it','Great','Awesome','Solid','Perfect'][i%5],
          body: 'Very happy with the purchase. Delivery was quick and the product is top-notch.',
          status: 'approved', createdAt: Date.now() - i*86400000,
        }))
      }
      return cors(NextResponse.json({ items }))
    }
    if (route.startsWith('/admin/reviews/') && method === 'PUT') {
      const id = route.split('/')[3]
      const body = await request.json()
      const database = await getDb().catch(() => null)
      if (!database) return cors(NextResponse.json({ ok:false }, { status: 500 }))
      await database.collection('reviews').updateOne({ id }, { $set: { status: body.status || 'approved' } })
      return cors(NextResponse.json({ ok:true }))
    }
    if (route.startsWith('/admin/reviews/') && method === 'DELETE') {
      const id = route.split('/')[3]
      const database = await getDb().catch(() => null)
      if (!database) return cors(NextResponse.json({ ok:false }, { status: 500 }))
      await database.collection('reviews').deleteOne({ id })
      return cors(NextResponse.json({ ok:true }))
    }

    // Admin: coupons CRUD
    if (route === '/admin/coupons' && method === 'POST') {
      const body = await request.json()
      const database = await getDb().catch(() => null)
      if (!database) return cors(NextResponse.json({ ok:false }, { status: 500 }))
      const code = String(body.code || '').toUpperCase().trim()
      if (!code) return cors(NextResponse.json({ ok:false, error:'Code required' }, { status: 400 }))
      const doc = { code, discount: body.discount || '10%', min: Number(body.min || 0), cap: body.cap || '—', uses: 0, createdAt: Date.now() }
      await database.collection('coupons').updateOne({ code }, { $set: doc }, { upsert: true })
      return cors(NextResponse.json({ ok:true, coupon: doc }))
    }
    if (route.startsWith('/admin/coupons/') && method === 'DELETE') {
      const code = decodeURIComponent(route.split('/')[3])
      const database = await getDb().catch(() => null)
      if (!database) return cors(NextResponse.json({ ok:false }, { status: 500 }))
      await database.collection('coupons').deleteOne({ code })
      return cors(NextResponse.json({ ok:true }))
    }

    // Admin: order status update
    if (route.startsWith('/admin/orders/') && method === 'PUT') {
      const id = route.split('/')[3]
      const body = await request.json()
      const database = await getDb().catch(() => null)
      if (!database) return cors(NextResponse.json({ ok:false }, { status: 500 }))
      const status = String(body.status || 'confirmed')
      const allowed = ['confirmed','packed','shipped','out','delivered','cancelled']
      if (!allowed.includes(status)) return cors(NextResponse.json({ ok:false, error:'Invalid status' }, { status: 400 }))
      await database.collection('orders').updateOne({ id }, { $set: { status } })
      return cors(NextResponse.json({ ok:true }))
    }

    // Admin: returns & refunds
    if (route === '/admin/returns' && method === 'GET') {
      const database = await getDb().catch(() => null)
      if (!database) return cors(NextResponse.json({ items: [] }))
      const items = await database.collection('returns').find({}).sort({ createdAt: -1 }).limit(200).toArray().catch(() => [])
      return cors(NextResponse.json({ items: items.map(({_id, ...r}) => r) }))
    }
    if (route.startsWith('/admin/returns/') && method === 'PUT') {
      const id = route.split('/')[3]
      const body = await request.json()
      const database = await getDb().catch(() => null)
      if (!database) return cors(NextResponse.json({ ok:false }, { status: 500 }))
      const status = String(body.status || '')
      const allowed = ['requested','approved','picked','refunded','rejected']
      if (!allowed.includes(status)) return cors(NextResponse.json({ ok:false, error:'Invalid status' }, { status: 400 }))
      const admin = requireAuth(request, 'admin')
      const note = String(body.note || `Status updated to ${status}`).slice(0, 300)
      await database.collection('returns').updateOne(
        { id },
        {
          $set: { status, updatedAt: Date.now() },
          $push: { history: { at: Date.now(), by: admin?.email || 'admin', note } },
        },
      )
      return cors(NextResponse.json({ ok:true }))
    }

    // Admin: support tickets
    if (route === '/admin/tickets' && method === 'GET') {
      const database = await getDb().catch(() => null)
      if (!database) return cors(NextResponse.json({ items: [] }))
      const items = await database.collection('tickets').find({}).sort({ updatedAt: -1 }).limit(200).toArray().catch(() => [])
      return cors(NextResponse.json({ items: items.map(({_id, ...r}) => r) }))
    }
    if (route.startsWith('/admin/tickets/') && route.endsWith('/reply') && method === 'POST') {
      const id = route.split('/')[3]
      const body = await request.json()
      const database = await getDb().catch(() => null)
      if (!database) return cors(NextResponse.json({ ok:false }, { status: 500 }))
      const admin = requireAuth(request, 'admin')
      const text = String(body.message || '').slice(0, 2000)
      if (!text) return cors(NextResponse.json({ ok:false, error:'Message required' }, { status: 400 }))
      const msg = { id: uuidv4().slice(0,6), from: 'agent', by: admin?.email || 'ZAMY Support', text, at: Date.now() }
      await database.collection('tickets').updateOne(
        { id },
        { $push: { messages: msg }, $set: { updatedAt: Date.now(), status: 'pending' } },
      )
      return cors(NextResponse.json({ ok:true }))
    }
    if (route.startsWith('/admin/tickets/') && method === 'PUT') {
      const id = route.split('/')[3]
      const body = await request.json()
      const database = await getDb().catch(() => null)
      if (!database) return cors(NextResponse.json({ ok:false }, { status: 500 }))
      const patch = { updatedAt: Date.now() }
      if (body.status && ['open','pending','resolved','closed'].includes(body.status)) patch.status = body.status
      if (body.priority && ['low','normal','high','urgent'].includes(body.priority)) patch.priority = body.priority
      await database.collection('tickets').updateOne({ id }, { $set: patch })
      return cors(NextResponse.json({ ok:true }))
    }

    // Admin: banners CMS
    if (route === '/admin/banners' && method === 'GET') {
      const database = await getDb().catch(() => null)
      const doc = database ? await database.collection('cms').findOne({ key: 'hero' }) : null
      return cors(NextResponse.json({ items: doc?.slides || HERO_SLIDES }))
    }
    if (route === '/admin/banners' && method === 'POST') {
      const body = await request.json()
      const database = await getDb().catch(() => null)
      if (!database) return cors(NextResponse.json({ ok:false }, { status: 500 }))
      await database.collection('cms').updateOne({ key: 'hero' }, { $set: { key: 'hero', slides: body.slides || [], updatedAt: Date.now() } }, { upsert: true })
      return cors(NextResponse.json({ ok:true }))
    }

    // Admin: reports CSV
    if (route.startsWith('/admin/reports/') && method === 'GET') {
      const kind = route.split('/')[3]
      const database = await getDb().catch(() => null)
      let rows = []
      if (kind === 'orders' && database) {
        const items = await database.collection('orders').find({}).sort({ createdAt: -1 }).toArray().catch(() => [])
        rows.push(['id','date','customer','email','total','status','payment'])
        for (const o of items) rows.push([o.id, new Date(o.createdAt).toISOString(), o.address?.name || '', o.address?.email || '', o.total || 0, o.status, o.payment || ''])
      } else if (kind === 'products') {
        const items = await listAllProducts()
        rows.push(['id','name','brand','category','subcategory','price','mrp','stock','rating'])
        for (const p of items) rows.push([p.id, p.name, p.brand, p.category, p.subcategory, p.price, p.mrp, p.stock, p.rating])
      } else if (kind === 'customers' && database) {
        const items = await database.collection('orders').find({}).toArray().catch(() => [])
        const map = new Map()
        for (const o of items) { const em = o.address?.email; if (!em) continue; const prev = map.get(em) || { email: em, name: o.address?.name, orders: 0, spend: 0 }; prev.orders++; prev.spend += o.total || 0; map.set(em, prev) }
        rows.push(['email','name','orders','lifetime_spend'])
        for (const c of map.values()) rows.push([c.email, c.name, c.orders, c.spend])
      } else {
        rows = [['message'], ['Report type not available yet']]
      }
      const csv = rows.map(r => r.map(v => { const s = String(v ?? ''); return s.includes(',')||s.includes('"') ? '"'+s.replace(/"/g,'""')+'"' : s }).join(',')).join('\n')
      const res = new NextResponse(csv, { status: 200 })
      res.headers.set('Content-Type', 'text/csv; charset=utf-8')
      res.headers.set('Content-Disposition', `attachment; filename=zamy-${kind}-${Date.now()}.csv`)
      return cors(res)
    }

    // Seller
    if (route === '/seller/analytics' && method === 'GET') {
      const database = await getDb().catch(() => null)
      if (!database) return cors(NextResponse.json({ revenue:[], products: [], totals:{revenue:0,orders:0,pendingPayout:0,rating:4.7} }))
      return cors(NextResponse.json(await computeSellerAnalytics(database)))
    }
    if (route === '/seller/orders' && method === 'GET') {
      const database = await getDb().catch(() => null)
      if (!database) return cors(NextResponse.json({ items: [] }))
      const raw = await database.collection('orders').find({}).sort({ createdAt: -1 }).limit(100).toArray().catch(() => [])
      const items = raw.flatMap(o => (o.items || []).map((it, idx) => ({
        id: `${o.id}-${idx+1}`,
        product: it.product?.name || 'Item',
        image: it.product?.images?.[0] || '',
        qty: it.qty || 1,
        total: (it.product?.price || 0) * (it.qty || 1),
        status: o.status || 'confirmed',
        customer: o.address?.name || 'Guest',
      })))
      return cors(NextResponse.json({ items }))
    }

    // AI chat (product support)
    if (route === '/ai/chat' && method === 'POST') {
      const body = await request.json()
      const userMsg = body.messages?.[body.messages.length-1]?.content || ''
      const productCtx = body.productContext ? `\n\nCurrent product context: ${JSON.stringify(body.productContext)}` : ''
      const system = `You are ZAMY Assistant, a friendly, concise product support agent for ZAMY — a premium marketplace selling electronics, computer parts, mobile accessories, automotive parts, tools and industrial products. Help users find products, understand specs, compare options, and handle order questions. Keep answers under 100 words. Include a product link like /product/<id> when suggesting products.${productCtx}`
      let reply = ''
      try {
        reply = await chatCompletion({ messages: [{ role:'system', content: system }, ...(body.messages||[])], model:'gpt-4o-mini', max_tokens: 300 })
      } catch (e) {
        const q = userMsg.toLowerCase()
        const guess = (await filterProductsAsync({ q: userMsg })).slice(0,2)
        if (guess.length) reply = `Here are some great options: ${guess.map(g => `• ${g.name} (₹${g.price.toLocaleString()}) — /product/${g.id}`).join(' ')}. Anything specific you'd like to know?`
        else if (q.includes('return')) reply = 'Yes! We offer 7-day easy returns from delivery. Go to Account › Orders and click Return.'
        else if (q.includes('deliv')) reply = 'Standard delivery is 2–4 business days. Express and same-day options are available at checkout.'
        else if (q.includes('payment')) reply = 'We accept UPI, cards, net banking, wallets, Razorpay, Stripe, PayPal and COD.'
        else reply = 'I’m here to help with products, orders, delivery, returns and payments on ZAMY. What are you looking for today?'
      }
      return cors(NextResponse.json({ reply }))
    }

    // AI recommendations based on context (recent, cart, wishlist)
    if (route === '/ai/recommendations' && method === 'POST') {
      const body = await request.json()
      const seedIds = [...(body.recentIds||[]), ...(body.cartIds||[]), ...(body.wishlistIds||[])]
      const all = await listAllProducts()
      const byId = new Map(all.map(p => [p.id, p]))
      const seeds = seedIds.map(id => byId.get(id)).filter(Boolean)
      let recIds = []
      let reason = ''
      const cats = new Set(seeds.map(s => s.category))
      const brands = new Set(seeds.map(s => s.brand))
      let pool = all.filter(p => !seedIds.includes(p.id) && (cats.has(p.category) || brands.has(p.brand)))
      pool.sort((a,b) => (b.rating*b.ratingCount) - (a.rating*a.ratingCount))
      if (!pool.length) pool = (await filterProductsAsync({ sort:'popular' }))
      const candidates = pool.slice(0, 12)
      try {
        const list = candidates.map(p => `${p.id}: ${p.name} (${p.brand}, ${p.subcategory}, ₹${p.price})`).join('\n')
        const seedList = seeds.map(p => `${p.id}: ${p.name} (${p.brand})`).join('\n') || 'No specific history.'
        const msg = `You are a recommendation engine for ZAMY marketplace. Given the user's recently viewed/carted/wishlisted items and a candidate pool, pick 6 product IDs the user is most likely to buy next and briefly explain why in one sentence.\n\nUser history:\n${seedList}\n\nCandidate pool:\n${list}\n\nReturn ONLY JSON of the form: { "ids": ["0012","0034",...], "reason": "..." }`
        const raw = await chatCompletion({ messages:[{ role:'user', content: msg }], model:'gpt-4o-mini', max_tokens: 200 })
        const m = raw.match(/\{[\s\S]*\}/); const parsed = m ? JSON.parse(m[0]) : null
        if (parsed?.ids?.length) { recIds = parsed.ids; reason = parsed.reason || '' }
      } catch {}
      const items = (recIds.length ? recIds : candidates.slice(0,6).map(p=>p.id)).map(id => byId.get(id)).filter(Boolean).slice(0,6)
      return cors(NextResponse.json({ items, reason: reason || 'Curated for your interests.' }))
    }

    // Public: banners (homepage hero)
    if (route === '/banners' && method === 'GET') {
      const database = await getDb().catch(() => null)
      const doc = database ? await database.collection('cms').findOne({ key: 'hero' }) : null
      const res = NextResponse.json({ items: doc?.slides || HERO_SLIDES })
      res.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')
      return cors(res)
    }

    // Public: customer submits a review (requires customer auth)
    if (route.startsWith('/products/') && route.endsWith('/reviews') && method === 'POST') {
      const t = requireAuth(request, 'customer')
      if (!t) return cors(NextResponse.json({ ok:false, error: 'Please sign in to post a review' }, { status: 401 }))
      const productId = route.split('/')[2]
      const p = await findProductAsync(productId)
      if (!p) return cors(NextResponse.json({ ok:false, error: 'Product not found' }, { status: 404 }))
      const body = await request.json()
      const rating = Math.max(1, Math.min(5, Number(body.rating || 0)))
      if (!rating) return cors(NextResponse.json({ ok:false, error: 'Rating required' }, { status: 400 }))
      const database = await getDb().catch(() => null)
      if (!database) return cors(NextResponse.json({ ok:false }, { status: 500 }))
      const doc = {
        id: uuidv4().slice(0,10).toUpperCase(),
        productId, product: p.name, image: p.images?.[0],
        email: t.email, name: (body.name || t.email.split('@')[0]),
        rating,
        title: String(body.title || '').slice(0, 100),
        body: String(body.body || '').slice(0, 1000),
        status: 'approved',
        verified: true,
        createdAt: Date.now(),
      }
      await database.collection('reviews').insertOne({ ...doc })
      return cors(NextResponse.json({ ok:true, review: doc }))
    }

    // Payments scaffold (Razorpay/Stripe placeholders — real once keys are set)
    if (route === '/payments/create' && method === 'POST') {
      const body = await request.json()
      const amount = Math.round(Number(body.amount || 0))
      const currency = body.currency || 'INR'
      const method = body.method || 'razorpay'
      // If real keys present, integrate here.
      if (method === 'razorpay' && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
        try {
          const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')
          const r = await fetch('https://api.razorpay.com/v1/orders', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Basic ${auth}` }, body: JSON.stringify({ amount: amount*100, currency, receipt: 'zamy_'+Date.now() })})
          const d = await r.json()
          if (r.ok) return cors(NextResponse.json({ ok:true, provider:'razorpay', keyId: process.env.RAZORPAY_KEY_ID, order: d, mocked: false }))
          return cors(NextResponse.json({ ok:false, error: d?.error?.description || 'Razorpay error' }, { status: 502 }))
        } catch (e) { return cors(NextResponse.json({ ok:false, error: String(e.message||e) }, { status: 500 })) }
      }
      // Mock success (dev / no keys yet)
      return cors(NextResponse.json({ ok:true, provider: method, order:{ id:'MOCK_'+uuidv4().slice(0,10), amount:amount*100, currency, status:'created' }, mocked: true }))
    }
    if (route === '/payments/verify' && method === 'POST') {
      const body = await request.json()
      if (process.env.RAZORPAY_KEY_SECRET && body.razorpay_order_id) {
        const sig = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${body.razorpay_order_id}|${body.razorpay_payment_id}`).digest('hex')
        return cors(NextResponse.json({ ok: sig === body.razorpay_signature, mocked: false }))
      }
      // Mock verify — always succeeds in dev
      return cors(NextResponse.json({ ok:true, mocked: true }))
    }

    // Newsletter / contact
    if (route === '/newsletter' && method === 'POST') { const b = await request.json(); try { const d = await getDb(); await d.collection('newsletter').insertOne({ email: b.email, ts: Date.now() }) } catch {}; return cors(NextResponse.json({ ok:true })) }
    if (route === '/contact' && method === 'POST') { const b = await request.json(); try { const d = await getDb(); await d.collection('contacts').insertOne({ ...b, ts: Date.now() }) } catch {}; return cors(NextResponse.json({ ok:true })) }
    if (route === '/status' && method === 'GET') return cors(NextResponse.json({ ok:true }))

    return cors(NextResponse.json({ error: `Route ${route} not found` }, { status: 404 }))
  } catch (e) {
    console.error('API error', e)
    return cors(NextResponse.json({ error: 'Internal error' }, { status: 500 }))
  }
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const DELETE = handler
export const PATCH = handler
