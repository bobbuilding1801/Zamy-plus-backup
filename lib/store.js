'use client'
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'

const ShopContext = createContext(null)

const LS_KEYS = {
  cart: 'zamy_cart_v1',
  wishlist: 'zamy_wishlist_v1',
  compare: 'zamy_compare_v1',
  recent: 'zamy_recent_v1',
  addresses: 'zamy_addresses_v1',
  orders: 'zamy_orders_v1',
  notif: 'zamy_notif_v1',
}

function load(key, fallback) {
  if (typeof window === 'undefined') return fallback
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch { return fallback }
}
function save(key, val) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

export function ShopProvider({ children }) {
  const [cart, setCart] = useState([]) // [{id, qty, savedForLater?}]
  const [wishlist, setWishlist] = useState([]) // [id]
  const [compare, setCompare] = useState([]) // [id]
  const [recent, setRecent] = useState([]) // [id]
  const [orders, setOrders] = useState([])
  const [notif, setNotif] = useState([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setCart(load(LS_KEYS.cart, []))
    setWishlist(load(LS_KEYS.wishlist, []))
    setCompare(load(LS_KEYS.compare, []))
    setRecent(load(LS_KEYS.recent, []))
    setOrders(load(LS_KEYS.orders, []))
    setNotif(load(LS_KEYS.notif, [
      { id:'n1', title:'Welcome to ZAMY', msg:'Enjoy 10% off your first order with code WELCOME10.', unread:true, ts:Date.now() },
    ]))
    setReady(true)
  }, [])

  useEffect(() => { if (ready) save(LS_KEYS.cart, cart) }, [cart, ready])
  useEffect(() => { if (ready) save(LS_KEYS.wishlist, wishlist) }, [wishlist, ready])
  useEffect(() => { if (ready) save(LS_KEYS.compare, compare) }, [compare, ready])
  useEffect(() => { if (ready) save(LS_KEYS.recent, recent) }, [recent, ready])
  useEffect(() => { if (ready) save(LS_KEYS.orders, orders) }, [orders, ready])
  useEffect(() => { if (ready) save(LS_KEYS.notif, notif) }, [notif, ready])

  const addToCart = useCallback((id, qty=1) => {
    setCart(prev => {
      const idx = prev.findIndex(i => i.id === id && !i.savedForLater)
      if (idx >= 0) { const c = [...prev]; c[idx] = { ...c[idx], qty: c[idx].qty + qty }; return c }
      return [...prev, { id, qty, savedForLater:false }]
    })
  }, [])
  const updateQty = useCallback((id, qty) => {
    setCart(prev => prev.map(i => i.id===id ? { ...i, qty:Math.max(1, qty) } : i))
  }, [])
  const removeFromCart = useCallback((id) => setCart(prev => prev.filter(i => i.id !== id)), [])
  const saveForLater = useCallback((id) => setCart(prev => prev.map(i => i.id===id ? { ...i, savedForLater:true } : i)), [])
  const moveToCart = useCallback((id) => setCart(prev => prev.map(i => i.id===id ? { ...i, savedForLater:false } : i)), [])
  const clearCart = useCallback(() => setCart([]), [])

  const toggleWishlist = useCallback((id) => setWishlist(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]), [])
  const toggleCompare = useCallback((id) => setCompare(prev => prev.includes(id) ? prev.filter(x=>x!==id) : (prev.length>=4 ? prev : [...prev, id])), [])
  const clearCompare = useCallback(() => setCompare([]), [])

  const pushRecent = useCallback((id) => setRecent(prev => [id, ...prev.filter(x=>x!==id)].slice(0,12)), [])

  const placeOrder = useCallback((order) => {
    setOrders(prev => [order, ...prev])
    setNotif(prev => [{ id:'o'+order.id, title:`Order #${order.id} placed`, msg:`Your order for ${Number(order.total||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})} has been confirmed.`, unread:true, ts:Date.now() }, ...prev])
  }, [])

  const markNotifRead = useCallback(() => setNotif(prev => prev.map(n => ({ ...n, unread:false }))), [])

  const value = useMemo(() => ({
    ready, cart, wishlist, compare, recent, orders, notif,
    addToCart, updateQty, removeFromCart, saveForLater, moveToCart, clearCart,
    toggleWishlist, toggleCompare, clearCompare, pushRecent, placeOrder, markNotifRead,
  }), [ready, cart, wishlist, compare, recent, orders, notif, addToCart, updateQty, removeFromCart, saveForLater, moveToCart, clearCart, toggleWishlist, toggleCompare, clearCompare, pushRecent, placeOrder, markNotifRead])

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>
}

export function useShop() {
  const ctx = useContext(ShopContext)
  if (!ctx) throw new Error('useShop must be inside ShopProvider')
  return ctx
}

export function formatINR(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n || 0))
}
