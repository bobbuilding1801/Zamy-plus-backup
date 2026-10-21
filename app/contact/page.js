'use client'
import SiteChrome from '@/components/site/SiteChrome'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Mail, Phone, MapPin, Send } from 'lucide-react'
import { toast } from 'sonner'
import { useEffect, useState } from 'react'

function Inner() {
  const [cms,setCms] = useState(null)
  useEffect(()=>{fetch('/api/cms').then(r=>r.json()).then(d=>setCms((d.items||[]).find(p=>p.key==='contact')||null)).catch(()=>{})},[])
  const [form, setForm] = useState({ name:'', email:'', subject:'', message:'' })
  const submit = async (e) => {
    e.preventDefault()
    await fetch('/api/contact', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form)})
    toast.success('Message sent. We will get back within 24 hrs.')
    setForm({ name:'', email:'', subject:'', message:'' })
  }
  return (
    <div className="container px-4 md:px-6 py-12 grid md:grid-cols-2 gap-10">
      <div>
        <h1 className="text-4xl font-black">{cms?.title || 'Contact us'}</h1>
        <p className="text-muted-foreground mt-2">{cms?.content || 'We’d love to hear from you. Reach out and we’ll respond within 24 hours.'}</p>
        <div className="mt-6 space-y-3 text-sm">
          <div className="flex items-center gap-2"><Mail size={16} className="text-primary" /> support@zamy.market</div>
          <div className="flex items-center gap-2"><Phone size={16} className="text-primary" /> +91 1800-000-000</div>
          <div className="flex items-center gap-2"><MapPin size={16} className="text-primary" /> Bengaluru, Karnataka, India</div>
        </div>
      </div>
      <form onSubmit={submit} className="rounded-2xl border p-6 space-y-3 bg-card">
        <Input placeholder="Your name" value={form.name} onChange={e => setForm({...form,name:e.target.value})} required />
        <Input placeholder="Email" type="email" value={form.email} onChange={e => setForm({...form,email:e.target.value})} required />
        <Input placeholder="Subject" value={form.subject} onChange={e => setForm({...form,subject:e.target.value})} required />
        <Textarea rows={5} placeholder="How can we help?" value={form.message} onChange={e => setForm({...form,message:e.target.value})} required />
        <Button type="submit" className="rounded-full w-full font-bold h-11"><Send size={16} className="mr-2" /> Send Message</Button>
      </form>
    </div>
  )
}
export default function C() { return <SiteChrome><Inner /></SiteChrome> }
