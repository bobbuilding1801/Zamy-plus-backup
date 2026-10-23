import { sendEmail } from '@/lib/email'
export const EMAIL_DEFAULTS = {
 confirmed:{subject:'ZAMY order #{{orderId}} confirmed',body:'Hi {{name}},\\nYour order #{{orderId}} has been confirmed. Total: ${{total}}.'},
 shipped:{subject:'ZAMY order #{{orderId}} shipped',body:'Hi {{name}},\\nYour order #{{orderId}} is on its way.'},
 delivered:{subject:'ZAMY order #{{orderId}} delivered',body:'Hi {{name}},\\nYour order #{{orderId}} has been delivered. Thank you for shopping with ZAMY.'},
 cancelled:{subject:'ZAMY order #{{orderId}} cancelled',body:'Hi {{name}},\\nYour order #{{orderId}} has been cancelled.'},
 refunded:{subject:'ZAMY refund update for #{{orderId}}',body:'Hi {{name}},\\nYour refund for order #{{orderId}} has been marked as processed.'}
}
function render(template,values){return String(template).replace(/{{(name|orderId|total|status)}}/g,(_,k)=>String(values[k]??''))}
export async function sendOrderEventEmail(db,kind,order){
 const to=order?.address?.email
 if(!to || !EMAIL_DEFAULTS[kind])return {ok:false,reason:'no-recipient-or-template'}
 const saved=await db.collection('email_templates').findOne({key:kind})
 const t=saved||EMAIL_DEFAULTS[kind]
 const values={name:order.address?.name||'Customer',orderId:order.id||'',total:Number(order.total||0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),status:kind}
 const subject=render(t.subject,values), body=render(t.body,values).replace(/\\n/g,'\n')
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
 return sendEmail({to,subject,text:body,html:'<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>ZAMY</h2><p>'+escape(body).replace(/\n/g,'<br>')+'</p></div>'})
}
