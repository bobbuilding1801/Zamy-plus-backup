'use client'
import { useEffect,useState } from 'react'
import { getAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
const initial={storeName:'ZAMY',supportEmail:'support@zamy.market',phone:'',address:'',announcement:'₹500 flat delivery across India',maintenance:false}
export default function StoreSettingsManager(){
 const [data,setData]=useState(initial),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 useEffect(()=>{fetch('/api/store-settings').then(r=>r.json()).then(setData).catch(()=>setMessage('Could not load store settings'))},[])
 const edit=(key,value)=>setData(p=>({...p,[key]:value}))
 const save=async()=>{setBusy(true);setMessage('');try{const r=await fetch('/api/admin/store-settings',{method:'PUT',headers:{'Content-Type':'application/json',Authorization:'Bearer '+getAuth()?.token},body:JSON.stringify(data)});const d=await r.json();if(!r.ok)throw Error(d.error||'Save failed');setMessage('Settings saved.')}catch(e){setMessage(e.message)}finally{setBusy(false)}}
 return <div className="max-w-3xl space-y-5"><div><h2 className="text-2xl font-bold">Store Settings</h2><p className="text-sm text-muted-foreground">Update your storefront contact information and announcement.</p></div>{[['storeName','Store name'],['supportEmail','Support email'],['phone','Contact phone']].map(([key,label])=><label key={key} className="block text-sm font-semibold">{label}<Input value={data[key]||''} onChange={e=>edit(key,e.target.value)}/></label>)}<label className="block text-sm font-semibold">Store address<Textarea rows={3} value={data.address||''} onChange={e=>edit('address',e.target.value)}/></label><label className="block text-sm font-semibold">Announcement bar text<Input value={data.announcement||''} onChange={e=>edit('announcement',e.target.value)}/></label><label className="flex gap-3 items-center text-sm font-semibold"><input type="checkbox" checked={!!data.maintenance} onChange={e=>edit('maintenance',e.target.checked)}/>Maintenance notice for storefront visitors</label><p className="text-xs text-muted-foreground">Maintenance mode displays a notice instead of the normal storefront content. Admin pages remain accessible.</p><div className="flex gap-3 items-center"><Button onClick={save} disabled={busy}>{busy?'Saving…':'Save Settings'}</Button><span role="status" className="text-sm">{message}</span></div></div>
}
