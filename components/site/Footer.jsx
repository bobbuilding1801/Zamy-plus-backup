'use client'
import { useEffect,useState } from 'react'
import Link from 'next/link'
import Logo from './Logo'
import { Facebook, Instagram, Twitter, Youtube, Mail, Phone, MapPin } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function Footer() {
  const [settings,setSettings]=useState(null)
  useEffect(()=>{fetch('/api/store-settings').then(r=>r.json()).then(setSettings).catch(()=>{})},[])
  return (
    <footer className="mt-16 bg-black text-white">
      <div className="container px-4 md:px-6 py-12 grid grid-cols-2 md:grid-cols-5 gap-8">
        <div className="col-span-2">
          <Logo size={48} />
          <p className="mt-3 text-sm text-white/70 max-w-sm">ZAMY is your premium marketplace for electronics, computer parts, automotive gear, tools and industrial products. Trusted sellers. Genuine products. Fast delivery.</p>
          <div className="mt-4 flex items-center gap-3">
            {[Facebook, Instagram, Twitter, Youtube].map((I,i) => (
              <a key={i} href="#" className="h-9 w-9 grid place-items-center rounded-full bg-white/10 hover:bg-primary hover:text-black transition"><I size={16} /></a>
            ))}
          </div>
          <div className="mt-4 space-y-1.5 text-sm text-white/70">
            <div className="flex items-center gap-2"><Mail size={14} /> {settings?.supportEmail || 'support@zamy.market'}</div>
            <div className="flex items-center gap-2"><Phone size={14} /> {settings?.phone || 'Contact details available on request'}</div>
            <div className="flex items-center gap-2"><MapPin size={14} /> {settings?.address || 'India'}</div>
          </div>
        </div>
        <div>
          <h4 className="font-bold mb-3">Company</h4>
          <ul className="space-y-2 text-sm text-white/70">
            <li><Link href="/about" className="hover:text-primary">About Us</Link></li>
            <li><Link href="/careers" className="hover:text-primary">Careers</Link></li>
            <li><Link href="/blogs" className="hover:text-primary">Blog</Link></li>
            <li><Link href="/contact" className="hover:text-primary">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold mb-3">Customer Service</h4>
          <ul className="space-y-2 text-sm text-white/70">
            <li><Link href="/help" className="hover:text-primary">Help Center</Link></li>
            <li><Link href="/legal?p=shipping" className="hover:text-primary">Shipping Policy</Link></li>
            <li><Link href="/legal?p=returns" className="hover:text-primary">Return Policy</Link></li>
            <li><Link href="/legal?p=refunds" className="hover:text-primary">Refund Policy</Link></li>
            <li><Link href="/help#faqs" className="hover:text-primary">FAQs</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold mb-3">Newsletter</h4>
          <p className="text-sm text-white/70 mb-3">Get 10% off your first order.</p>
          <form className="flex gap-2">
            <Input type="email" placeholder="you@email.com" className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-10" />
            <Button type="submit" className="h-10 rounded-md font-semibold">Join</Button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2 text-[10px] text-white/60">
            <span className="px-2 py-1 rounded bg-white/10">UPI</span>
            <span className="px-2 py-1 rounded bg-white/10">Visa</span>
            <span className="px-2 py-1 rounded bg-white/10">Mastercard</span>
            <span className="px-2 py-1 rounded bg-white/10">Razorpay</span>
            <span className="px-2 py-1 rounded bg-white/10">Stripe</span>
            <span className="px-2 py-1 rounded bg-white/10">PayPal</span>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container px-4 md:px-6 py-4 text-xs text-white/60 flex flex-col md:flex-row justify-between gap-2">
          <div>© {new Date().getFullYear()} ZAMY. All rights reserved.</div>
          <div className="flex gap-4">
            <Link href="/legal?p=privacy" className="hover:text-primary">Privacy Policy</Link>
            <Link href="/legal?p=terms" className="hover:text-primary">Terms &amp; Conditions</Link>
            <Link href="/legal?p=returns" className="hover:text-primary">Returns</Link>
            <Link href="/legal?p=refunds" className="hover:text-primary">Refunds</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
