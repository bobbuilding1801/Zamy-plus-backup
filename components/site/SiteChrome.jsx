import Header from './Header'
import Footer from './Footer'
import dynamic from 'next/dynamic'

// Lazy-load non-critical widgets so first paint is fast
const BackToTop = dynamic(() => import('./BackToTop'), { ssr: false })
const ChatWidget = dynamic(() => import('./ChatWidget'), { ssr: false })

export default function SiteChrome({ children, hideChrome=false }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {!hideChrome && <Header />}
      <main className="flex-1">{children}</main>
      {!hideChrome && <Footer />}
      {!hideChrome && <BackToTop />}
      {!hideChrome && <ChatWidget />}
    </div>
  )
}
