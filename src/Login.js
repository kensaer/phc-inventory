import { useState } from 'react';
import { signInWithMagicLink } from './auth';

export default function Login({ onClose }) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setSending(true);
    setErr(null);
    try {
      await signInWithMagicLink(email);
      setSent(true);
    } catch (ex) {
      setErr(ex.message || 'Could not send sign-in link. Try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(10,20,10,0.6)",zIndex:1100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#fff",borderRadius:16,width:"100%",maxWidth:400,padding:"26px 28px",boxShadow:"0 32px 80px rgba(0,0,0,0.22)"}}>
        <div style={{textAlign:"center",fontSize:30,marginBottom:8}}>{sent ? '📬' : '📧'}</div>
        <h3 style={{margin:"0 0 6px",fontSize:20,fontFamily:"'Playfair Display',serif",color:"#1a2e1a",textAlign:"center"}}>
          {sent ? 'Check your email' : 'Sign In'}
        </h3>
        <p style={{margin:"0 0 18px",color:"#6b7280",fontSize:13,textAlign:"center",lineHeight:1.45}}>
          {sent
            ? <>We sent a sign-in link to <strong style={{color:"#374151"}}>{email}</strong>. Click the link to finish signing in.</>
            : "Enter your email and we'll send you a one-time sign-in link."}
        </p>
        {!sent && (
          <form onSubmit={submit}>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{width:"100%",padding:"12px 14px",border:"2px solid #e5e7eb",borderRadius:10,fontSize:15,fontFamily:"inherit",color:"#111827",background:"#f9fafb",outline:"none",boxSizing:"border-box",marginBottom:12}}
            />
            {err && <div style={{color:"#dc2626",fontSize:13,marginBottom:10}}>{err}</div>}
            <button
              type="submit"
              disabled={sending}
              style={{width:"100%",background:sending?"#d1d5db":"linear-gradient(135deg,#2d6a2d,#4a9e4a)",border:"none",borderRadius:10,padding:"13px",color:"#fff",fontSize:15,fontWeight:700,fontFamily:"inherit",cursor:sending?"default":"pointer",marginBottom:8}}
            >
              {sending ? 'Sending…' : 'Send sign-in link'}
            </button>
          </form>
        )}
        <button
          onClick={onClose}
          style={{width:"100%",background:"transparent",border:"none",color:"#6b7280",fontFamily:"inherit",fontSize:13,fontWeight:600,padding:"8px",cursor:"pointer"}}
        >
          {sent ? 'Close' : 'Cancel'}
        </button>
      </div>
    </div>
  );
}
