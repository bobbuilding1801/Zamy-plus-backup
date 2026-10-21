'use client'
import { useEffect, useState } from 'react'
import { getAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
const defaults = {
  about:{title:'About Us',content:'ZAMY is a marketplace for electronics, computer parts, automotive gear, tools and industrial products.'},
  contact:{title:'Contact Us',content:'We would love to hear from you. Reach out to support@zamy.market.'},
  privacy:{title:'Privacy Policy',content:'At ZAMY, we respect your privacy. Contact support@zamy.market with privacy questions.'},
  terms:{title:'Terms & Conditions',content:'All products are subject to availability. Prices, taxes and shipping fees are calculated at checkout.'},
  returns:{title:'Return Policy',content:'Request eligible returns through Account → Orders.'},
  refunds:{title:'Refund Policy',content:'Approved refunds are processed according to the payment method and applicable policy.'},
  shipping:{title:'Shipping Policy',content:'Standard delivery across India costs ₹500 per order. Delivery estimates are shown at checkout.'}
}
export default function CmsManager() {
  const [key,setKey] = useState('about')
  const [pages,setPages] = useState(defaults)
  const [saving,setSaving] = useState(false)
  const [message,setMessage] = useState('')
  useEffect(()=>{fetch('/api/cms').then(r=>r.json()).then(d=>{setPages(prev=>{const next={...prev};(d.items||[]).forEach(p=>{if(next[p.key])next[p.key]={title:p.title,content:p.content}});return next})}).catch(()=>setMessage('Could not load saved pages'))},[])
  const page = pages[key]
  const edit=(field,value)=>setPages(prev=>({...prev,[key]:{...prev[key],[field]:value}}))
  const save=async()=>{setSaving(true);setMessage('');try{const r=await fetch('/api/admin/cms',{method:'PUT',headers:{'Content-Type':'application/json',Authorization:'Bearer '+getAuth()?.token},body:JSON.stringify({key,...page})});const d=await r.json();if(!r.ok)throw Error(d.error||'Save failed');setMessage('Page saved successfully.')}catch(e){setMessage(e.message)}finally{setSaving(false)}}
  return <div className="space-y-5 max-w-3xl"><div><h2 className="text-2xl font-bold">CMS Pages</h2><p className="text-sm text-muted-foreground">Edit public page titles and text without changing the storefront design.</p></div><label className="block text-sm font-semibold">Select page<select className="mt-1 w-full rounded-md border bg-background p-2" value={key} onChange={e=>{setKey(e.target.value);setMessage('')}}>{Object.entries(defaults).map(([k,p])=><option key={k} value={k}>{p.title}</option>)}</select></label><label className="block text-sm font-semibold">Page title<Input value={page.title} onChange={e=>edit('title',e.target.value)}/></label><label className="block text-sm font-semibold">Page content<Textarea rows={12} value={page.content} onChange={e=>edit('content',e.target.value)}/></label><div className="flex items-center gap-4"><Button disabled={saving} onClick={save}>{saving?'Saving…':'Save Page'}</Button><span role="status" className="text-sm">{message}</span></div><p className="text-xs text-muted-foreground">Write plain text. Policy text should be reviewed before publishing.</p></div>
}
