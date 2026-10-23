// Email helper — uses Resend if RESEND_API_KEY is present; otherwise logs to console.
// Provides send(), plus templates for OTP and Order Confirmation.

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

function baseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL || 'https://zamy.market'
}

async function sendReal({ to, subject, html, text, from }) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false, reason: 'no-key' }
  const fromAddr = from || process.env.EMAIL_FROM || 'ZAMY <onboarding@resend.dev>'
  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: fromAddr, to: Array.isArray(to) ? to : [to], subject, html, text }),
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    return { ok: false, error: `Resend ${res.status}: ${errText.slice(0, 200)}` }
  }
  const data = await res.json().catch(() => ({}))
  return { ok: true, id: data.id }
}

export async function sendEmail({ to, subject, html, text, from }) {
  const list = Array.isArray(to) ? to : [to]
  if (process.env.RESEND_API_KEY) {
    const r = await sendReal({ to: list, subject, html, text, from })
    if (r.ok) { console.log('[email] sent via Resend id=' + r.id + ' -> ' + list.join(',')); return r }
    console.warn('[email] Resend failed:', r.error || r.reason)
  }
  // Mock delivery — log payload so devs/admins can see what would have been sent.
  console.log('\n===== [MOCK EMAIL] =====')
  console.log('To:', list.join(', '))
  console.log('Subject:', subject)
  console.log('Text:', text || '(html-only)')
  console.log('=========================\n')
  return { ok: true, mocked: true }
}

// Shared HTML wrapper with ZAMY branding
function wrap({ title, body, ctaText, ctaHref }) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f7f7f7;font-family:Inter,-apple-system,Segoe UI,Roboto,sans-serif;color:#111;">
  <table role="presentation" width="100%" style="background:#f7f7f7;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.06);">
        <tr><td style="background:#000;padding:20px 24px;">
          <table role="presentation"><tr>
            <td style="width:44px;"><div style="width:44px;height:44px;border-radius:50%;background:#FFD400;color:#000;font-weight:900;font-size:14px;line-height:44px;text-align:center;letter-spacing:2px;">ZAMY</div></td>
            <td style="padding-left:12px;color:#FFD400;font-weight:900;letter-spacing:3px;">ZAMY</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;">${title}</h1>
          <div style="font-size:14px;line-height:1.6;color:#333;">${body}</div>
          ${ctaText && ctaHref ? `<div style="margin:22px 0;"><a href="${ctaHref}" style="display:inline-block;background:#FFD400;color:#000;font-weight:800;text-decoration:none;padding:12px 24px;border-radius:999px;">${ctaText}</a></div>` : ''}
        </td></tr>
        <tr><td style="background:#111;padding:16px 24px;color:#999;font-size:11px;text-align:center;">
          ZAMY Marketplace · United States · <a href="${baseUrl()}" style="color:#FFD400;">zamy.market</a>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`
}

export async function sendOtpEmail({ to, code }) {
  const html = wrap({
    title: 'Your ZAMY verification code',
    body: `<p>Use the code below to sign in. It expires in <b>10 minutes</b>.</p>
      <div style="font-size:36px;font-weight:900;letter-spacing:8px;background:#FFF7CC;color:#000;text-align:center;padding:20px;border-radius:12px;margin:16px 0;">${code}</div>
      <p style="color:#666;font-size:12px;">If you didn't request this, you can safely ignore this email.</p>`,
  })
  const text = `Your ZAMY code is ${code}. It expires in 10 minutes.`
  return sendEmail({ to, subject: `ZAMY verification code: ${code}`, html, text })
}

export async function sendOrderCustomerEmail({ to, order, itemsHtml }) {
  const html = wrap({
    title: `Order confirmed — #${order.id}`,
    body: `<p>Thanks for shopping with ZAMY! Your order has been confirmed and is being processed.</p>
      <table role="presentation" width="100%" style="margin:12px 0;border-collapse:collapse;">${itemsHtml}</table>
      <table role="presentation" width="100%" style="margin-top:10px;font-size:13px;">
        <tr><td>Total paid</td><td align="right" style="font-weight:800;">$${(order.total||0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
        <tr><td>Payment method</td><td align="right" style="text-transform:uppercase;">${order.payment||'—'}</td></tr>
        <tr><td>Shipping</td><td align="right" style="text-transform:capitalize;">${order.shipping||'standard'}</td></tr>
      </table>
      <p style="color:#666;font-size:12px;margin-top:16px;">Ships to ${order.address?.name || ''}, ${order.address?.city || ''} ${order.address?.pin || ''}.</p>`,
    ctaText: 'Track your order',
    ctaHref: `${baseUrl()}/track/${order.id}`,
  })
  const text = `Your ZAMY order #${order.id} for Rs.${order.total} has been confirmed. Track: ${baseUrl()}/track/${order.id}`
  return sendEmail({ to, subject: `Your ZAMY order #${order.id} is confirmed`, html, text })
}

export async function sendOrderAdminEmail({ to, order, itemsHtml }) {
  const html = wrap({
    title: `New order — #${order.id}`,
    body: `<p>A new order was just placed on ZAMY.</p>
      <table role="presentation" width="100%" style="margin:12px 0;border-collapse:collapse;">${itemsHtml}</table>
      <table role="presentation" width="100%" style="margin-top:10px;font-size:13px;">
        <tr><td>Total</td><td align="right" style="font-weight:800;">$${(order.total||0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
        <tr><td>Customer</td><td align="right">${order.address?.name || 'Guest'} &lt;${order.address?.email || ''}&gt;</td></tr>
        <tr><td>Ship to</td><td align="right">${order.address?.city || ''} ${order.address?.pin || ''}</td></tr>
        <tr><td>Payment</td><td align="right" style="text-transform:uppercase;">${order.payment||'—'}</td></tr>
      </table>`,
    ctaText: 'Open in Admin',
    ctaHref: `${baseUrl()}/admin?tab=orders`,
  })
  const text = `New ZAMY order #${order.id} · Rs.${order.total} · ${order.address?.name} · ${order.address?.email}`
  return sendEmail({ to, subject: `New order #${order.id} · $${(order.total||0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, html, text })
}

export function buildItemsHtml(order) {
  return (order.items || []).map(i => {
    const p = i.product || {}
    const img = (p.images && p.images[0]) || ''
    return `<tr>
      <td style="padding:8px 0;width:56px;"><img src="${img}" alt="" width="48" height="48" style="border-radius:8px;object-fit:cover;" /></td>
      <td style="padding:8px 0;">
        <div style="font-weight:700;font-size:13px;">${(p.name||'').replace(/</g,'&lt;')}</div>
        <div style="color:#888;font-size:11px;">Qty ${i.qty || 1} · ${p.brand||''}</div>
      </td>
      <td style="padding:8px 0;text-align:right;font-weight:700;">$${((p.price||0)*(i.qty||1)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>`
  }).join('')
}
