'use client'
import { useEffect,useState } from 'react'
import Header from './Header'
import Footer from './Footer'
import dynamic from 'next/dynamic'

// Lazy-load non-critical widgets so first paint is fast
const BackToTop = dynamic(() => import('./BackToTop'), { ssr: false })
const ChatWidget = dynamic(() => import('./ChatWidget'), { ssr: false })

export default function SiteChrome({ children, hideChrome=false, premiumDark=false }) {
  const [maintenance,setMaintenance]=useState(false)
  useEffect(()=>{fetch('/api/store-settings').then(r=>r.json()).then(d=>setMaintenance(d.maintenance===true)).catch(()=>{})},[])
  return (
    <div className={`${premiumDark ? 'dark premium-home' : ''} min-h-screen flex flex-col bg-background text-foreground`}>
      {!hideChrome && <Header />}
      <main className="flex-1">{maintenance && !hideChrome ? <div className="container mx-auto px-4 py-24 text-center"><h1 className="text-3xl font-bold">Store temporarily unavailable</h1><p className="mt-4 text-muted-foreground">We are carrying out maintenance. Please check back soon.</p></div> : children}</main>
      {!hideChrome && <Footer />}
      {!hideChrome && <BackToTop />}
      {!hideChrome && <ChatWidget />}
    </div>
  )
}
