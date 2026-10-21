'use client'
import { useEffect,useState } from 'react'
import { getAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
const names={confirmed:'Order Confirmation',shipped:'Order Shipped',delivered:'Order Delivered',cancelled:'Order Cancelled',refunded:'Refund Completed'}
export default function EmailTemplatesManager(){
 const [items,setItems]=useState([]),[key,setKey]=useState('confirmed'),[message,setMessage]=useState(''),[busy,setBusy]=useState(false)
 useEffect(()=>{fetch('/api/admin/email-templates',{headers:{Authorization:'Bearer '+getAuth()?.token}}).then(r=>r.json()).then(d=>setItems(d.items||[])).catch(()=>setMessage('Could not load templates'))},[])
 const item=items.find(x=>x.key===key)
 const edit=(field,value)=>setItems(prev=>prev.map(x=>x.key===key?{...x,[field]:value}:x))
 const save=async()=>{setBusy(true);setMessage('');try{const r=await fetch('/api/admin/email-templates',{method:'PUT',headers:{'Content-Type':'application/json',Authorization:'Bearer '+getAuth()?.token},body:JSON.stringify(item)});const d=await r.json();if(!r.ok)throw Error(d.error||'Save failed');setMessage('Template saved.')}catch(e){setMessage(e.message)}finally{setBusy(false)}}
 return <div className="max-w-3xl space-y-5"><div><h2 className="text-2xl font-bold">Email Templates</h2><p className="text-sm text-muted-foreground">Automatically used when order or refund statuses change. Email delivery requires Resend configuration.</p></div><label className="block text-sm font-semibold">Email type<select className="mt-1 w-full rounded-md border bg-background p-2" value={key} onChange={e=>{setKey(e.target.value);setMessage('')}}>{Object.entries(names).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>{item&&<><label className="block text-sm font-semibold">Subject<Input value={item.subject} onChange={e=>edit('subject',e.target.value)}/></label><label className="block text-sm font-semibold">Email message<Textarea rows={10} value={item.body} onChange={e=>edit('body',e.target.value)}/></label><p className="text-xs text-muted-foreground">Available placeholders: {'{{name}}'}, {'{{orderId}}'}, {'{{total}}'}, {'{{status}}'}</p><div className="flex gap-3 items-center"><Button disabled={busy} onClick={save}>{busy?'Saving…':'Save Template'}</Button><span role="status" className="text-sm">{message}</span></div></>}</div>
}
