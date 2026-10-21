'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const KEY = 'zamy_auth_v1'

export function getAuth() {
  if (typeof window === 'undefined') return null
  try { const v = localStorage.getItem(KEY); return v ? JSON.parse(v) : null } catch { return null }
}
export function setAuth(v) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(KEY, JSON.stringify(v)) } catch {}
}
export function clearAuth() {
  if (typeof window === 'undefined') return
  try { localStorage.removeItem(KEY) } catch {}
}

export async function login({ email, password, role }) {
  const res = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password, role })})
  const data = await res.json()
  if (data.ok) setAuth({ email:data.email, role:data.role, token:data.token, ts: Date.now() })
  return data
}

export async function verifyAuth(role) {
  const a = getAuth()
  if (!a || (role === 'admin' ? !['admin','product','support'].includes(a.role) : a.role !== role)) return null
  try {
    const r = await fetch('/api/auth/verify', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ token: a.token })})
    const d = await r.json()
    return d.ok ? a : null
  } catch { return null }
}

export function useAuthGate(role) {
  const router = useRouter()
  const [state, setState] = useState({ loading:true, user:null })
  useEffect(() => {
    let ignore = false
    verifyAuth(role).then(u => {
      if (ignore) return
      if (!u) router.replace(`/login?role=${role}&next=${encodeURIComponent(window.location.pathname + window.location.search)}`)
      else setState({ loading:false, user:u })
    })
    return () => { ignore = true }
  }, [role, router])
  return state
}
