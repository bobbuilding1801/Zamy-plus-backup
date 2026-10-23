'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useShop, formatINR } from '@/lib/store'
import { Download, Printer } from 'lucide-react'

export default function InvoicePage() {
  const { id } = useParams()
  const { orders } = useShop()
  const [order, setOrder] = useState(null)

  useEffect(() => {
    const o = orders.find(x => x.id === id)
    if (o) setOrder(o)
    else {
      // fallback: build a placeholder
      setOrder({ id, total: 0, items: [], address: { name:'ZAMY Customer' }, payment:'upi', createdAt: Date.now() })
    }
  }, [id, orders])

  if (!order) return <div className="p-10 text-center">Loading…</div>
  const subtotal = order.items?.reduce((s,i)=>s+(i.product?.price||0)*i.qty,0) || order.total
  const tax = Math.round(subtotal * 0.05)
  const shipping = Math.max(0, order.total - subtotal - tax)

  return (
    <div className="bg-background min-h-screen p-4 print:p-0">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-4 print:hidden">
          <a href="/account?tab=orders" className="text-sm text-muted-foreground hover:text-primary">← Back to orders</a>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}><Printer size={14} className="mr-1" /> Print</Button>
            <Button onClick={() => window.print()}><Download size={14} className="mr-1" /> Download PDF</Button>
          </div>
        </div>
        <div className="bg-white text-black rounded-2xl border shadow-premium p-8 print:shadow-none print:border-0 print:p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <img src="/WhatsApp%20Image%202026-10-21%20at%2010.25.14%20PM.jpeg" className="h-16 w-28 bg-white object-contain" alt="SUNBLISS" />
              <div>
                <div className="font-black text-2xl tracking-widest">SUNBLISS</div>
                <div className="text-xs text-neutral-500">Seller</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase text-neutral-500">Tax Invoice</div>
              <div className="font-black text-xl">#{order.id}</div>
              <div className="text-xs text-neutral-500">{new Date(order.createdAt || Date.now()).toLocaleDateString()}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
            <div>
              <div className="text-xs uppercase text-neutral-500 font-bold">Billed to</div>
              <div className="mt-1">{order.address?.name || '—'}</div>
              <div>{order.address?.line1}</div>
              <div>{order.address?.city} {order.address?.pin}</div>
              <div>{order.address?.country || 'India'}</div>
              {order.address?.mobile && <div>Ph: {order.address.mobile}</div>}
              {order.address?.email && <div>{order.address.email}</div>}
            </div>
            <div className="text-right">
              <div className="text-xs uppercase text-neutral-500 font-bold">Seller</div>
              <div className="mt-1">SUNBLISS</div>
              <div className="mt-3 text-xs uppercase text-neutral-500 font-bold">Payment</div>
              <div className="mt-1 uppercase">{order.payment || 'UPI'} · Paid</div>
            </div>
          </div>

          <table className="w-full mt-8 text-sm">
            <thead>
              <tr className="border-y bg-yellow-100/50">
                <th className="py-2 px-2 text-left">Item</th>
                <th className="py-2 px-2 text-right">Qty</th>
                <th className="py-2 px-2 text-right">Unit</th>
                <th className="py-2 px-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {(order.items || []).map((i,idx) => (
                <tr key={idx} className="border-b">
                  <td className="py-3 px-2">{i.product?.name || 'Item'}<div className="text-[11px] text-neutral-500">SKU: {i.product?.sku}</div></td>
                  <td className="py-3 px-2 text-right">{i.qty}</td>
                  <td className="py-3 px-2 text-right">{formatINR(i.product?.price || 0)}</td>
                  <td className="py-3 px-2 text-right font-semibold">{formatINR((i.product?.price || 0)*i.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 ml-auto w-64 space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatINR(subtotal)}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>{shipping ? formatINR(shipping) : 'Free'}</span></div>
            <div className="flex justify-between"><span>Tax (5% GST)</span><span>{formatINR(tax)}</span></div>
            <div className="flex justify-between border-t pt-2 mt-2 text-lg font-black"><span>Total</span><span>{formatINR(order.total)}</span></div>
          </div>

          <div className="mt-10 pt-4 border-t text-center text-xs text-neutral-500">
            Thank you for shopping with SUNBLISS on ZAMY. This is a computer-generated invoice.<br />
            For assistance, contact the seller through ZAMY.
          </div>
        </div>
      </div>
    </div>
  )
}
