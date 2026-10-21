'use client'
import { useEffect, useState } from 'react'
import { getAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function CategoryManager() {
  const [items,setItems] = useState([])
  const [busy,setBusy] = useState(false)
  const [message,setMessage] = useState('')
  useEffect(() => {
    const token = getAuth()?.token
    fetch('/api/admin/categories',{headers:{Authorization:'Bearer '+token}}).then(async r => { if(!r.ok) throw Error('Unable to load categories'); return r.json() }).then(d => setItems(d.items || [])).catch(e => setMessage(e.message))
  },[])
  const change = (i,key,value) => setItems(prev => prev.map((c,j) => j===i ? {...c,[key]:value} : c))
  const save = async () => {
    setBusy(true); setMessage('')
    try {
      const r=await fetch('/api/admin/categories',{method:'PUT',headers:{'Content-Type':'application/json',Authorization:'Bearer '+getAuth()?.token},body:JSON.stringify({items})})
      const d=await r.json(); if(!r.ok) throw Error(d.error || 'Unable to save')
      setItems(d.items); setMessage('Categories saved successfully.')
    } catch(e) {setMessage(e.message)} finally {setBusy(false)}
  }
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-bold">Categories</h2><p className="text-sm text-muted-foreground">Edit category names, URL slugs, icons, and comma-separated subcategories.</p></div><Button onClick={() => setItems(prev => [...prev,{slug:'',name:'',icon:'Layers',subs:[]}])}>Add Category</Button></div>
    {items.map((c,i) => <div key={i} className="border rounded-xl p-4 space-y-3 bg-card"><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><label className="text-sm">Name<Input value={c.name} onChange={e=>change(i,'name',e.target.value)}/></label><label className="text-sm">URL slug<Input value={c.slug} onChange={e=>change(i,'slug',e.target.value)} placeholder="example-category"/></label><label className="text-sm">Icon name<Input value={c.icon || ''} onChange={e=>change(i,'icon',e.target.value)}/></label></div><label className="text-sm block">Subcategories (separate with commas)<Input value={(c.subs || []).join(', ')} onChange={e=>change(i,'subs',e.target.value.split(',').map(x=>x.trim()))}/></label><Button variant="outline" onClick={() => {if(window.confirm('Delete this category? Products using it will not be automatically reassigned.')) setItems(prev=>prev.filter((_,j)=>i!==j))}}>Delete</Button></div>)}
    <div className="flex items-center gap-4"><Button disabled={busy} onClick={save}>{busy?'Saving…':'Save Categories'}</Button><span role="status" className="text-sm">{message}</span></div>
  </div>
}
