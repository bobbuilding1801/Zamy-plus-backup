'use client'
import SiteChrome from '@/components/site/SiteChrome'
import { useEffect, useState } from 'react'
import { useShop, formatINR } from '@/lib/store'
import { useCustomer } from '@/lib/customer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card } from '@/components/ui/card'
import { Check, MapPin, Truck, CreditCard, ShieldCheck, ArrowRight, ArrowLeft, LogIn } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const STEPS = ['Address','Delivery','Payment','Review']

function Stepper({ step }) {
  return (
    <div className="flex items-center justify-center gap-2 md:gap-4 mb-8">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`h-8 w-8 grid place-items-center rounded-full text-xs font-bold ${i<=step ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>{i<step ? <Check size={14} /> : i+1}</div>
          <div className={`text-sm font-semibold ${i<=step ? '' : 'text-muted-foreground'} hidden sm:block`}>{s}</div>
          {i < STEPS.length-1 && <div className={`h-0.5 w-6 md:w-10 ${i<step ? 'bg-primary' : 'bg-border'}`} />}
        </div>
      ))}
    </div>
  )
}

function CheckoutInner() {
  const router = useRouter()
  const { cart, clearCart, placeOrder } = useShop()
  const { user, setModalOpen } = useCustomer()
  const [products, setProducts] = useState({})
  const [step, setStep] = useState(0)
  const [addr, setAddr] = useState({ name:'', mobile:'', email:'', line1:'', city:'', state:'', pin:'', country:'United States' })
  const [billing, setBilling] = useState({ same: true })
  const [ship] = useState('standard')
  const [shippingSettings,setShippingSettings] = useState({ flatRate:500, deliveryDays:'3–7 business days' })
  useEffect(() => { fetch('/api/shipping-settings').then(r=>r.json()).then(d=>setShippingSettings(d)).catch(()=>{}) },[])
  const [pay, setPay] = useState('upi')
  const [placing, setPlacing] = useState(false)

  useEffect(() => {
    if (user?.email && !addr.email) setAddr(a => ({ ...a, email: user.email }))
  }, [user])

  useEffect(() => {
    const ids = cart.filter(c => !c.savedForLater).map(c => c.id).join(',')
    if (!ids) return
    fetch(`/api/products/by-ids?ids=${ids}`).then(r=>r.json()).then(d => {
      const m={}; d.items?.forEach(p => m[p.id]=p); setProducts(m)
    })
  }, [cart])

  const active = cart.filter(c => !c.savedForLater)
  const subtotal = active.reduce((s,c) => s + (products[c.id]?.price || 0) * c.qty, 0)
  const shipping = shippingSettings.flatRate
  const tax = Math.round(subtotal * 0.05)
  const total = subtotal + shipping + tax

  const canNext = () => {
    if (step === 0) return addr.name && addr.mobile && addr.line1 && addr.city && addr.pin
    return true
  }

  const submit = async () => {
    setPlacing(true)
    try {
      const order = { total, items: active.map(c => ({ ...c, product: products[c.id] })), address: addr, shipping: ship, payment: pay, id: '' }
      // Payments: real Razorpay if key present, else mock
      const payRes = await fetch('/api/payments/create', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ amount: total, currency: 'USD', method: pay === 'card' ? 'razorpay' : pay })})
      const payData = await payRes.json()
      if (!payData.ok) throw new Error(payData.error || 'Payment init failed')
      if (!payData.mocked && payData.provider === 'razorpay') {
        // Real Razorpay checkout would open here. For now we short-circuit to server verify with mocked signatures until keys are added.
      }
      const headers = { 'Content-Type':'application/json', ...(user ? { Authorization: `Bearer ${user.token}` } : {}) }
      const res = await fetch('/api/orders', { method:'POST', headers, body: JSON.stringify(order) })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not place order')
      placeOrder({ ...order, id: data.order.id, total })
      clearCart()
      toast.success('Order placed! Confirmation email on the way.')
      router.push(`/order-success?id=${data.order.id}`)
    } catch (e) { toast.error(String(e.message || e)) }
    finally { setPlacing(false) }
  }

  if (active.length === 0) return <div className="container py-16 text-center">Your cart is empty. <Link className="text-primary underline" href="/shop">Shop now</Link></div>

  return (
    <div className="container px-4 md:px-6 py-8">
      <Stepper step={step} />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <Card className="p-6 rounded-2xl">
            {step === 0 && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold flex items-center gap-2"><MapPin size={18} /> Shipping Address</h2>
                  {!user && <Button size="sm" variant="outline" className="rounded-full" onClick={() => setModalOpen(true)}><LogIn size={14} className="mr-1" /> Sign in for faster checkout</Button>}
                </div>
                {user && <div className="mb-3 rounded-lg bg-primary/10 border border-primary/30 p-2 text-xs">Signed in as <b>{user.email}</b>. Your order will be linked to your account and confirmations sent to this email.</div>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input placeholder="Full name*" value={addr.name} onChange={e => setAddr({...addr, name:e.target.value})} />
                  <Input placeholder="Mobile*" value={addr.mobile} onChange={e => setAddr({...addr, mobile:e.target.value})} />
                  <Input placeholder="Email" className="sm:col-span-2" value={addr.email} onChange={e => setAddr({...addr, email:e.target.value})} />
                  <Input placeholder="Address line*" className="sm:col-span-2" value={addr.line1} onChange={e => setAddr({...addr, line1:e.target.value})} />
                  <Input placeholder="City*" value={addr.city} onChange={e => setAddr({...addr, city:e.target.value})} />
                  <Input placeholder="State" value={addr.state} onChange={e => setAddr({...addr, state:e.target.value})} />
                  <Input placeholder="PIN code*" value={addr.pin} onChange={e => setAddr({...addr, pin:e.target.value})} />
                  <Input placeholder="Country" value={addr.country} onChange={e => setAddr({...addr, country:e.target.value})} />
                </div>
                <div className="mt-4 text-sm">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={billing.same} onChange={e => setBilling({ same:e.target.checked })} />
                    Use same address for billing
                  </label>
                </div>
              </>
            )}
            {step === 1 && (
              <>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Truck size={18} /> Delivery Options</h2>
                <div className="flex items-center justify-between rounded-xl border border-primary bg-primary/5 p-4"><div><div className="font-semibold">Standard Delivery — United States</div><div className="text-xs text-muted-foreground">{shippingSettings.deliveryDays}</div></div><div className="font-bold">{formatINR(shipping)}</div></div>
              </>
            )}
            {step === 2 && (
              <>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><CreditCard size={18} /> Payment Method</h2>
                <RadioGroup value={pay} onValueChange={setPay} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { v:'upi', t:'UPI', d:'Google Pay, PhonePe, Paytm' },
                    { v:'card', t:'Credit / Debit Card', d:'Visa, MC, RuPay, Amex · via Razorpay' },
                    { v:'netbanking', t:'Net Banking', d:'All major banks' },
                    { v:'wallet', t:'Wallets', d:'Paytm, Mobikwik, Amazon Pay' },
                    { v:'cod', t:'Cash on Delivery', d:'Pay when you receive' },
                  ].map(o => (
                    <label key={o.v} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer ${pay===o.v?'border-primary bg-primary/5':''}`}>
                      <RadioGroupItem value={o.v} id={o.v} />
                      <div><div className="font-semibold">{o.t}</div><div className="text-xs text-muted-foreground">{o.d}</div></div>
                    </label>
                  ))}
                </RadioGroup>
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck size={14} /> Encrypted &amp; PCI DSS compliant</div>
              </>
            )}
            {step === 3 && (
              <>
                <h2 className="text-lg font-bold mb-4">Review your order</h2>
                <div className="space-y-3">
                  {active.map(item => { const p = products[item.id]; if (!p) return null; return (
                    <div key={item.id} className="flex gap-3 items-center">
                      <img src={p.images[0]} className="h-16 w-16 rounded-lg object-cover" alt="" />
                      <div className="flex-1"><div className="font-semibold text-sm line-clamp-1">{p.name}</div><div className="text-xs text-muted-foreground">Qty: {item.qty}</div></div>
                      <div className="font-bold">{formatINR(p.price * item.qty)}</div>
                    </div>
                  )})}
                </div>
                <hr className="my-4" />
                <div className="text-sm">
                  <div><b>Ship to:</b> {addr.name}, {addr.line1}, {addr.city} {addr.pin}</div>
                  <div className="mt-1"><b>Delivery:</b> {ship}</div>
                  <div className="mt-1"><b>Payment:</b> {pay.toUpperCase()}</div>
                  <div className="mt-1"><b>Confirmation to:</b> {addr.email || '(no email provided)'}</div>
                </div>
              </>
            )}
            <div className="mt-6 flex justify-between">
              <Button variant="outline" disabled={step===0} onClick={() => setStep(s => Math.max(0,s-1))}><ArrowLeft size={16} className="mr-1" /> Back</Button>
              {step < 3 ? (
                <Button onClick={() => canNext() ? setStep(s => s+1) : toast.error('Please fill required fields')} className="rounded-full px-8 font-bold">Continue <ArrowRight size={16} className="ml-1" /></Button>
              ) : (
                <Button onClick={submit} disabled={placing} className="rounded-full px-8 font-bold">{placing ? 'Placing…' : 'Place Order'}</Button>
              )}
            </div>
          </Card>
        </div>
        <aside className="lg:col-span-4">
          <Card className="p-5 rounded-2xl sticky top-28">
            <h3 className="font-bold text-lg mb-3">Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Subtotal ({active.length})</span><span>{formatINR(subtotal)}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{shipping===0?'Free':formatINR(shipping)}</span></div>
              <div className="flex justify-between"><span>Tax (5%)</span><span>{formatINR(tax)}</span></div>
              <div className="flex justify-between border-t pt-3 mt-2 font-black text-lg"><span>Total</span><span>{formatINR(total)}</span></div>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  )
}

export default function Checkout() { return <SiteChrome><CheckoutInner /></SiteChrome> }
