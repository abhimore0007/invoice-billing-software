import React,{useState} from 'react';
import {Eye,EyeOff,ArrowRight,ArrowUpRight,LoaderCircle,ShieldCheck} from 'lucide-react';
import {authenticateDemo} from './demoAuth';

export default function LoginScreen({onDemo,onLogin,Logo}){
  const [mode,setMode]=useState(()=>localStorage.getItem('ruby-login-mode')||'demo');
  const [username,setUsername]=useState(''),[password,setPassword]=useState('');
  const [show,setShow]=useState(false),[remember,setRemember]=useState(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  async function submit(e){
    e.preventDefault();setBusy(true);setError('');
    try{
      let result;
      if(mode==='demo')result=await authenticateDemo(username,password);
      else{
        const response=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:username.trim(),password,remember})});
        try{result=await response.json()}catch{throw Error('Cannot connect to the billing server. Check that the API is running.');}
        if(!response.ok)throw Error(result.error||'Unable to log in.');
      }
      localStorage.removeItem('ruby-session');sessionStorage.removeItem('ruby-session');
      (remember?localStorage:sessionStorage).setItem('ruby-session',JSON.stringify(result));
      localStorage.setItem('ruby-login-mode',mode);
      onLogin(result);
    }catch(e){setError(e.message)}finally{setBusy(false)}
  }
  return <div className="login-page"><div className="login-decoration one"/><div className="login-decoration two"/>
    <div className="login-card"><Logo/><div className="login-title"><span className="eyebrow">LESS PAPERWORK. MORE POSSIBILITY.</span><h1>Welcome back.</h1><p>Sign in to your business workspace.</p></div>
      <form onSubmit={submit}>
        <label className="field"><span>Workspace</span><select aria-label="Workspace" value={mode} onChange={e=>{setMode(e.target.value);setError('')}}><option value="demo">Demo workspace — this browser</option><option value="connected">Connected workspace — database</option></select></label>
        <p className="login-mode-note">{mode==='demo'?'Use the account created in Users in this browser. Demo access is for local testing.':'Use an account created by your database workspace administrator.'}</p>
        <label className="field"><span>Username</span><input required autoComplete="username" placeholder="Enter your username" value={username} onChange={e=>setUsername(e.target.value)}/></label>
        <label className="field"><span>Password</span><div className="password-input"><input required autoComplete="current-password" type={show?'text':'password'} placeholder="Enter your password" value={password} onChange={e=>setPassword(e.target.value)}/><button type="button" className="icon-button" aria-label={show?'Hide password':'Show password'} onClick={()=>setShow(!show)}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>
        <label className="checkbox"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/>Remember me</label>
        {error&&<div className="form-error" role="alert">{error}</div>}
        <button disabled={busy} className="btn primary login-submit">{busy?<LoaderCircle size={17} className="spin"/>:<>Login <ArrowRight size={17}/></>}</button>
      </form>
      <div className="login-or"><span/>New to Ruby?<span/></div><button className="btn demo-login" onClick={onDemo}>Explore the demo workspace <ArrowUpRight size={16}/></button><div className="login-security"><ShieldCheck size={14}/>{mode==='demo'?'Demo accounts stay in this browser.':'Your business, in good hands.'}</div>
    </div><div className="login-footer">© {new Date().getFullYear()} Ruby Hydraulic · Designed for your business.</div>
  </div>;
}
