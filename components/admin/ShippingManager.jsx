'use client'
import { useEffect, useState } from 'react'
import { getAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
export default function ShippingManager() {
  const [flatRate,setFlatRate] = useState('500')
  const [deliveryDays,setDeliveryDays] = useState('3–7 business days')
  const [message,setMessage] = useState('')
  const [saving,setSaving] = useState(false)
  useEffect(() => { fetch('/api/shipping-settings').then(r=>r.json()).then(d=>{setFlatRate(String(d.flatRate));setDeliveryDays(d.deliveryDays)}).catch(()=>setMessage('Unable to load settings')) },[])
  const save = async () => {
    setSaving(true);setMessage('')
    try {const r=await fetch('/api/admin/shipping',{method:'PUT',headers:{'Content-Type':'application/json',Authorization:'Bearer '+getAuth()?.token},body:JSON.stringify({flatRate:Number(flatRate),deliveryDays})});const d=await r.json();if(!r.ok)throw Error(d.error || 'Unable to save');setMessage('Shipping settings saved.')}catch(e){setMessage(e.message)}finally{setSaving(false)}
  }
  return <div className="space-y-5 max-w-xl"><div><h2 className="text-2xl font-bold">Shipping & Taxes</h2><p className="text-sm text-muted-foreground">One delivery charge for all India. No automatic free shipping.</p></div><div className="rounded-2xl border bg-card p-5 space-y-4"><label className="block text-sm font-semibold">Flat shipping charge (₹) per order<Input type="number" min="0" value={flatRate} onChange={e=>setFlatRate(e.target.value)}/></label><label className="block text-sm font-semibold">Estimated delivery time<Input value={deliveryDays} onChange={e=>setDeliveryDays(e.target.value)}/></label><p className="text-xs text-muted-foreground">Checkout currently calculates tax at 5% of subtotal. Product-specific GST configuration is not yet implemented.</p><Button onClick={save} disabled={saving || flatRate.trim()===''}>{saving?'Saving…':'Save Shipping Settings'}</Button><p role="status" className="text-sm">{message}</p></div></div>
}
