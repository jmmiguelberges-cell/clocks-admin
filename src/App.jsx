import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './supabase'

// ═══ CSS ═══
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
:root{
  --bg:#F5F3FF;--white:#FFF;--border:#E5E0FF;--border2:#C9BFFF;
  --text:#1A0A3B;--text2:#5B4B8A;--text3:#9B8FBF;
  --purple:#6D28D9;--purple2:#5B21B6;--purple-l:#7C3AED;
  --purple-bg:rgba(109,40,217,0.07);--purple-bg2:rgba(109,40,217,0.14);
  --purple-grad:linear-gradient(135deg,#6D28D9,#A855F7);
  --green:#16A34A;--green-bg:rgba(22,163,74,0.08);
  --yellow:#CA8A04;--yellow-bg:rgba(202,138,4,0.08);
  --orange:#EA580C;--orange-bg:rgba(234,88,12,0.08);
  --red:#DC2626;--red-bg:rgba(220,38,38,0.07);
  --blue:#2563EB;--blue-bg:rgba(37,99,235,0.07);
  --shadow:0 1px 4px rgba(109,40,217,0.08);
  --shadow-md:0 4px 14px rgba(109,40,217,0.12);
  --shadow-lg:0 8px 32px rgba(109,40,217,0.18);
  --sidebar-w:224px
}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--bg);color:var(--text);font-family:'DM Sans',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
input:focus,select:focus,textarea:focus{outline:none;border-color:var(--purple)!important;box-shadow:0 0 0 3px var(--purple-bg2)!important}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:var(--border2);border-radius:6px}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
.fade{animation:fadeIn .25s ease both}.fd1{animation-delay:50ms}.fd2{animation-delay:100ms}.fd3{animation-delay:150ms}.fd4{animation-delay:200ms}
textarea,select{font-family:inherit;resize:none}
select{-webkit-appearance:none;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239B8FBF' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:32px!important}
`

// ═══ HELPERS ═══
const MO=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MS=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const DL=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
const DF=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const toK=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const parseDate=s=>{const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)}
const isT=d=>toK(d)===toK(new Date())
const fD=d=>`${d.getDate()} de ${MO[d.getMonth()]}`
const fDF=d=>`${DF[d.getDay()]}, ${fD(d)}`
const fS=d=>`${d.getDate()} ${MS[d.getMonth()]}`
const aM=(t,m)=>{let[h,mi]=t.split(':').map(Number);mi+=m;while(mi>=60){h++;mi-=60}return`${String(h).padStart(2,'0')}:${String(mi).padStart(2,'0')}`}
const gS=(o='09:00',c='20:00',step=30)=>{const s=[];let[h,m]=o.split(':').map(Number);const[ch,cm]=c.split(':').map(Number);while(h<ch||(h===ch&&m<cm)){s.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);m+=step;if(m>=60){h++;m-=60}}return s}
const getWeekDays=d=>{const mon=new Date(d);const day=mon.getDay();const diff=day===0?-6:1-day;mon.setDate(mon.getDate()+diff);const days=[];for(let i=0;i<7;i++){const x=new Date(mon);x.setDate(mon.getDate()+i);days.push(x)}return days}
const normName=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
const daysForCount=n=>n<=1?7:n<=2?5:n<=3?3:n<=4?2:1

const EXPENSE_CATS=[{id:'alquiler',label:'Alquiler',icon:'🏠'},{id:'productos',label:'Productos',icon:'🧴'},{id:'suministros',label:'Suministros',icon:'💡'},{id:'marketing',label:'Marketing',icon:'📣'},{id:'personal',label:'Personal',icon:'👤'},{id:'equipamiento',label:'Equipamiento',icon:'🪑'},{id:'general',label:'General',icon:'📦'},{id:'otro',label:'Otro',icon:'📝'}]
const STY_COLORS=['#6D28D9','#EA580C','#0891B2','#CA8A04','#16A34A','#DB2777','#7C3AED','#DC2626']

const exportCSV=(rows,filename)=>{
  const header=Object.keys(rows[0]).join(';')
  const csv=header+'\n'+rows.map(r=>Object.values(r).join(';')).join('\n')
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'})
  const url=URL.createObjectURL(blob)
  const a=document.createElement('a');a.href=url;a.download=filename+'.csv';a.click()
  URL.revokeObjectURL(url)
}

// ═══ ATOMS ═══
const Sp=()=><div style={{display:'flex',justifyContent:'center',padding:60}}><div style={{width:32,height:32,border:'3px solid var(--border)',borderTopColor:'var(--purple)',borderRadius:'50%',animation:'spin .6s linear infinite'}}/></div>

function Btn({children,onClick,disabled,full,variant='primary',small,style:sx,...r}){
  const S={
    primary:{bg:'var(--purple-grad)',c:'#fff',b:'none',sh:'0 2px 8px rgba(109,40,217,0.3)'},
    secondary:{bg:'var(--white)',c:'var(--text2)',b:'1.5px solid var(--border2)',sh:'none'},
    danger:{bg:'var(--red-bg)',c:'var(--red)',b:'1px solid rgba(220,38,38,0.18)',sh:'none'},
    ghost:{bg:'transparent',c:'var(--text2)',b:'none',sh:'none'}
  }[variant]||{bg:'var(--purple-grad)',c:'#fff',b:'none',sh:'0 2px 8px rgba(109,40,217,0.3)'}
  return<button onClick={disabled?undefined:onClick} style={{fontFamily:'inherit',fontSize:small?12:14,fontWeight:700,padding:small?'7px 13px':'10px 22px',width:full?'100%':'auto',color:disabled?'#aaa':S.c,background:disabled?'var(--border)':S.bg,border:S.b,borderRadius:9,cursor:disabled?'default':'pointer',boxShadow:disabled?'none':S.sh,transition:'all .15s',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6,...sx}}{...r}>{children}</button>
}
function Inp({label,required,...p}){return<div style={{marginBottom:13}}>{label&&<label style={{fontSize:12,fontWeight:600,color:'var(--text2)',marginBottom:5,display:'block',textTransform:'uppercase',letterSpacing:'0.04em'}}>{label}{required&&<span style={{color:'var(--red)'}}>*</span>}</label>}<input{...p}style={{width:'100%',padding:'10px 13px',fontSize:14,border:'1.5px solid var(--border2)',borderRadius:9,background:'var(--white)',color:'var(--text)',fontFamily:'inherit',...(p.style||{})}}/></div>}
function Sel({label,children,...p}){return<div style={{marginBottom:13}}>{label&&<label style={{fontSize:12,fontWeight:600,color:'var(--text2)',marginBottom:5,display:'block',textTransform:'uppercase',letterSpacing:'0.04em'}}>{label}</label>}<select{...p}style={{width:'100%',padding:'10px 13px',fontSize:14,border:'1.5px solid var(--border2)',borderRadius:9,background:'var(--white)',color:'var(--text)',cursor:'pointer',...(p.style||{})}}>{children}</select></div>}
function Modal({children,onClose}){return<div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(26,10,59,0.45)',backdropFilter:'blur(5px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:24}}><div onClick={e=>e.stopPropagation()} className="fade" style={{background:'var(--white)',borderRadius:18,padding:30,maxWidth:500,width:'100%',boxShadow:'var(--shadow-lg)',maxHeight:'88vh',overflowY:'auto'}}>{children}</div></div>}
function Stat({label,value,sub,icon,color='var(--purple)',bg='var(--purple-bg)'}){return<div className="fade" style={{background:'var(--white)',borderRadius:14,padding:'18px 20px',border:'1.5px solid var(--border)',boxShadow:'var(--shadow)',flex:1,minWidth:160}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}><div style={{fontSize:11,fontWeight:600,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.05em'}}>{label}</div><div style={{width:34,height:34,borderRadius:9,background:bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:17}}>{icon}</div></div><div style={{fontSize:27,fontWeight:900,lineHeight:1,color:'var(--text)'}}>{value}</div>{sub&&<div style={{fontSize:11,color:'var(--text3)',marginTop:6}}>{sub}</div>}</div>}

// ═══ SIDEBAR ═══
function Sidebar({active,onNav}){
  const[imgOk,setImgOk]=useState(true)
  const items=[{id:'dash',label:'Dashboard',icon:'📊'},{id:'cal',label:'Calendario',icon:'📅'},{id:'finance',label:'Finanzas',icon:'💰'},{id:'barbers',label:'Barberos',icon:'📈'},{id:'clients',label:'Clientes',icon:'👥'},{id:'team',label:'Equipo',icon:'👤'},{id:'services',label:'Servicios',icon:'✂️'},{id:'blocks',label:'Bloqueos',icon:'🚫'}]
  return<div style={{width:'var(--sidebar-w)',background:'var(--white)',borderRight:'1.5px solid var(--border)',height:'100vh',position:'fixed',left:0,top:0,display:'flex',flexDirection:'column',zIndex:10,boxShadow:'2px 0 12px rgba(109,40,217,0.06)'}}>
    <div style={{padding:'18px 16px',borderBottom:'1.5px solid var(--border)'}}>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <div style={{width:36,height:36,borderRadius:10,background:'var(--purple-grad)',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',flexShrink:0,boxShadow:'0 2px 8px rgba(109,40,217,0.35)'}}>
          {imgOk
            ?<img src="/images/icono-logo.png" alt="Logo" style={{width:'100%',height:'100%',objectFit:'cover'}} onError={()=>setImgOk(false)}/>
            :<span style={{fontSize:16,fontWeight:900,color:'#fff'}}>C</span>}
        </div>
        <div><div style={{fontSize:14,fontWeight:800,color:'var(--text)'}}>Clocks Admin</div><div style={{fontSize:10,color:'var(--text3)',fontWeight:500}}>Panel PRO</div></div>
      </div>
    </div>
    <nav style={{flex:1,padding:'8px 8px',overflowY:'auto'}}>
      {items.map(it=><button key={it.id} onClick={()=>onNav(it.id)} style={{display:'flex',alignItems:'center',gap:9,width:'100%',padding:'9px 11px',borderRadius:9,border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:active===it.id?700:400,background:active===it.id?'var(--purple-bg)':'transparent',color:active===it.id?'var(--purple)':'var(--text2)',marginBottom:1,transition:'all .15s'}}><span style={{fontSize:15}}>{it.icon}</span>{it.label}</button>)}
    </nav>
    <div style={{padding:'12px 16px',borderTop:'1.5px solid var(--border)'}}>
      <button onClick={async()=>{await supabase.auth.signOut();window.location.reload()}} style={{fontSize:12,color:'var(--text3)',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',fontWeight:500}}>Cerrar sesión →</button>
    </div>
  </div>
}

// ═══ AUTH ═══
function AdminAuth({onLogin}){
  const[em,setEm]=useState(''),[pw,setPw]=useState(''),[ld,setLd]=useState(false),[er,setEr]=useState(''),[imgOk,setImgOk]=useState(true)
  const sub=async()=>{setEr('');setLd(true);try{const{data,error:e}=await supabase.auth.signInWithPassword({email:em.trim(),password:pw});if(e)throw e;if(data.user)onLogin(data.user)}catch(e){setEr(e.message?.includes('Invalid')?'Credenciales incorrectas':e.message||'Error')}setLd(false)}
  return<div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)'}}>
    <div className="fade" style={{background:'var(--white)',borderRadius:20,padding:44,maxWidth:400,width:'100%',boxShadow:'var(--shadow-lg)',border:'1.5px solid var(--border)'}}>
      <div style={{textAlign:'center',marginBottom:32}}>
        <div style={{width:60,height:60,borderRadius:16,background:'var(--purple-grad)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',overflow:'hidden',boxShadow:'0 4px 16px rgba(109,40,217,0.35)'}}>
          {imgOk?<img src="/images/icono-logo.png" alt="Logo" style={{width:'100%',height:'100%',objectFit:'cover'}} onError={()=>setImgOk(false)}/>:<span style={{fontSize:26,fontWeight:900,color:'#fff'}}>C</span>}
        </div>
        <h1 style={{fontSize:22,fontWeight:900,color:'var(--text)'}}>Clocks Admin</h1>
        <p style={{fontSize:14,color:'var(--text3)',marginTop:4}}>Acceso restringido</p>
      </div>
      <Inp label="Email" type="email" value={em} onChange={e=>setEm(e.target.value)} placeholder="admin@clocks.com" onKeyDown={e=>e.key==='Enter'&&sub()}/>
      <Inp label="Contraseña" type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==='Enter'&&sub()}/>
      {er&&<div style={{padding:'10px 14px',background:'var(--red-bg)',borderRadius:9,marginBottom:12,border:'1px solid rgba(220,38,38,0.15)'}}><p style={{fontSize:13,color:'var(--red)',fontWeight:600}}>{er}</p></div>}
      <Btn full onClick={sub} disabled={ld}>{ld?'Accediendo...':'Entrar'}</Btn>
    </div>
  </div>
}

// ═══ DASHBOARD ═══
function Dashboard({data}){
  const{appts,profiles,stylists,services,expenses}=data
  const today=toK(new Date()),thisMonth=today.slice(0,7)
  const mAppts=appts.filter(a=>a.appointment_date.slice(0,7)===thisMonth)
  const mConf=mAppts.filter(a=>a.status==='confirmed'||a.status==='completed')
  const mCanc=mAppts.filter(a=>a.status==='cancelled').length
  const todayA=appts.filter(a=>a.appointment_date===today&&a.status==='confirmed')
  const revenue=mConf.reduce((s,a)=>{const sv=services.find(x=>x.id===a.service_id);return s+(sv?Number(sv.price):0)},0)
  const mExp=expenses.filter(e=>e.expense_date?.slice(0,7)===thisMonth).reduce((s,e)=>s+Number(e.amount),0)
  const profit=revenue-mExp
  const clients=new Set(mConf.map(a=>a.user_id).filter(Boolean)).size
  const bySty={}
  mConf.forEach(a=>{const st=stylists.find(s=>s.id===a.stylist_id);const sv=services.find(s=>s.id===a.service_id);if(!st)return;if(!bySty[st.name])bySty[st.name]={count:0,rev:0};bySty[st.name].count++;bySty[st.name].rev+=sv?Number(sv.price):0})
  const topSvc={}
  mConf.forEach(a=>{const sv=services.find(s=>s.id===a.service_id);if(!sv)return;if(!topSvc[sv.name])topSvc[sv.name]={c:0,r:0};topSvc[sv.name].c++;topSvc[sv.name].r+=Number(sv.price)})
  return<div>
    <div style={{marginBottom:24}}><h1 style={{fontSize:24,fontWeight:900}}>Dashboard</h1><p style={{fontSize:14,color:'var(--text3)'}}>{MO[new Date().getMonth()]} {new Date().getFullYear()}</p></div>
    <div style={{display:'flex',gap:14,marginBottom:20,flexWrap:'wrap'}}>
      <Stat label="Citas hoy" value={todayA.length} icon="📅" sub={`${mConf.length} este mes`}/>
      <Stat label="Ingresos" value={`${revenue.toFixed(0)}€`} icon="💰" color="var(--green)" bg="var(--green-bg)"/>
      <Stat label="Gastos" value={`${mExp.toFixed(0)}€`} icon="📉" color="var(--red)" bg="var(--red-bg)"/>
      <Stat label="Beneficio" value={`${profit.toFixed(0)}€`} icon={profit>=0?"📈":"📉"} color={profit>=0?"var(--green)":"var(--red)"} bg={profit>=0?"var(--green-bg)":"var(--red-bg)"}/>
      <Stat label="Clientes" value={clients} icon="👥" color="var(--blue)" bg="var(--blue-bg)"/>
      <Stat label="Cancelaciones" value={mCanc} icon="❌" color="var(--orange)" bg="var(--orange-bg)" sub={mConf.length>0?`${(mCanc/(mConf.length+mCanc)*100).toFixed(0)}%`:''}/>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
      <div className="fade fd1" style={{background:'var(--white)',borderRadius:14,border:'1.5px solid var(--border)',padding:20,boxShadow:'var(--shadow)'}}>
        <h3 style={{fontSize:15,fontWeight:700,marginBottom:14}}>Rendimiento por barbero</h3>
        {Object.entries(bySty).sort((a,b)=>b[1].rev-a[1].rev).map(([n,d])=>{const mx=Math.max(...Object.values(bySty).map(x=>x.rev),1);return<div key={n} style={{marginBottom:12}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:13}}><span style={{fontWeight:500}}>{n}</span><span style={{fontWeight:700,color:'var(--purple)'}}>{d.rev.toFixed(0)}€ · {d.count} citas</span></div><div style={{height:5,borderRadius:3,background:'var(--bg)'}}><div style={{height:5,borderRadius:3,background:'var(--purple-grad)',width:`${(d.rev/mx)*100}%`}}/></div></div>})}
        {Object.keys(bySty).length===0&&<p style={{fontSize:13,color:'var(--text3)'}}>Sin datos</p>}
      </div>
      <div className="fade fd2" style={{background:'var(--white)',borderRadius:14,border:'1.5px solid var(--border)',padding:20,boxShadow:'var(--shadow)'}}>
        <h3 style={{fontSize:15,fontWeight:700,marginBottom:14}}>Servicios más solicitados</h3>
        {Object.entries(topSvc).sort((a,b)=>b[1].c-a[1].c).slice(0,6).map(([n,d],i)=><div key={n} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:i<5?'1px solid var(--border)':'none'}}><div style={{width:24,height:24,borderRadius:6,background:'var(--purple-bg)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:'var(--purple)'}}>{i+1}</div><div style={{flex:1,fontSize:13,fontWeight:500}}>{n}</div><span style={{fontSize:13,fontWeight:700}}>{d.c}</span><span style={{fontSize:12,color:'var(--text3)'}}>· {d.r.toFixed(0)}€</span></div>)}
      </div>
    </div>
    <div className="fade fd3" style={{background:'var(--white)',borderRadius:14,border:'1.5px solid var(--border)',padding:20,boxShadow:'var(--shadow)',marginTop:14}}>
      <h3 style={{fontSize:15,fontWeight:700,marginBottom:14}}>Próximas citas hoy</h3>
      {todayA.length===0?<p style={{fontSize:13,color:'var(--text3)'}}>No hay más citas hoy</p>:
      <div style={{display:'flex',flexDirection:'column',gap:6}}>{todayA.sort((a,b)=>a.appointment_time.localeCompare(b.appointment_time)).slice(0,8).map(a=>{const sv=services.find(s=>s.id===a.service_id);const st=stylists.find(s=>s.id===a.stylist_id);const pr=profiles[a.user_id];const name=a.user_id?pr?.full_name:a.notes?.replace(/^\[TEL\]\s*/,'').split(' — ')[0]||'Tel.';return<div key={a.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'var(--bg)',borderRadius:8}}><span style={{fontSize:13,fontWeight:700,color:'var(--purple)',minWidth:46}}>{a.appointment_time?.slice(0,5)}</span><span style={{fontSize:13,fontWeight:500}}>{name||'—'}</span><span style={{fontSize:12,color:'var(--text3)'}}>{sv?.name} · {st?.name}</span></div>})}</div>}
    </div>
  </div>
}

// ═══ ADD APPOINTMENT MODAL ═══
function AddApptModal({data,defaultDate,defaultStylistId,onSave,onClose}){
  const{stylists,services}=data
  const[clientName,setClientName]=useState('')
  const[styId,setStyId]=useState(String(defaultStylistId||stylists[0]?.id||''))
  const[svcId,setSvcId]=useState(String(services[0]?.id||''))
  const[date,setDate]=useState(defaultDate||toK(new Date()))
  const[time,setTime]=useState('09:00')
  const[note,setNote]=useState('')
  const[saving,setSaving]=useState(false)
  const svc=services.find(s=>s.id===Number(svcId))
  const endTime=svc?aM(time,svc.duration):''
  const handleSave=async()=>{
    if(!clientName.trim()||!styId||!svcId||!date||!time)return
    setSaving(true)
    const noteFinal=`[TEL] ${clientName.trim()}${note?` — ${note}`:''}`
    await supabase.from('appointments').insert({user_id:null,stylist_id:Number(styId),service_id:Number(svcId),appointment_date:date,appointment_time:time,end_time:endTime,status:'confirmed',notes:noteFinal})
    setSaving(false);onSave();onClose()
  }
  return<Modal onClose={onClose}>
    <h3 style={{fontSize:19,fontWeight:900,marginBottom:18}}>➕ Nueva cita manual</h3>
    <Inp label="Nombre del cliente" required value={clientName} onChange={e=>setClientName(e.target.value)} placeholder="Ej: Carlos García"/>
    <Sel label="Barbero" value={styId} onChange={e=>setStyId(e.target.value)}>{stylists.filter(s=>s.active).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</Sel>
    <Sel label="Servicio" value={svcId} onChange={e=>setSvcId(e.target.value)}>{services.filter(s=>s.active!==false).map(s=><option key={s.id} value={s.id}>{s.name} — {Number(s.price).toFixed(0)}€ · {s.duration}min</option>)}</Sel>
    <div style={{display:'flex',gap:8}}>
      <div style={{flex:1}}><Inp label="Fecha" type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>
      <div style={{flex:1}}><Sel label="Hora" value={time} onChange={e=>setTime(e.target.value)}>{gS('09:00','20:00',15).map(h=><option key={h} value={h}>{h}</option>)}</Sel></div>
    </div>
    {svc&&<div style={{background:'var(--purple-bg)',borderRadius:10,padding:'10px 14px',marginBottom:13,fontSize:13,color:'var(--purple)',fontWeight:600}}>⏱ Finaliza a las {endTime} · 💰 {Number(svc.price).toFixed(0)}€</div>}
    <Inp label="Nota interna (opcional)" value={note} onChange={e=>setNote(e.target.value)} placeholder="Ej: cliente habitual, pago en efectivo..."/>
    <div style={{display:'flex',gap:8,marginTop:4}}>
      <Btn variant="secondary" onClick={onClose} style={{flex:1}}>Cancelar</Btn>
      <Btn onClick={handleSave} disabled={saving||!clientName.trim()||!styId||!svcId} style={{flex:1}}>{saving?'Guardando...':'Guardar cita'}</Btn>
    </div>
  </Modal>
}

// ═══ TEAM DROPDOWN ═══
function TeamDropdown({stylists,selected,onChange}){
  const[open,setOpen]=useState(false)
  const ref=useRef()
  useEffect(()=>{const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)};document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h)},[])
  const toggleAll=()=>{if(selected.length===stylists.length)onChange([]);else onChange(stylists.map(s=>s.id))}
  const toggle=id=>{if(selected.includes(id))onChange(selected.filter(x=>x!==id));else onChange([...selected,id])}
  const activeSty=stylists.filter(s=>s.active)
  return<div ref={ref} style={{position:'relative'}}>
    <button onClick={()=>setOpen(o=>!o)} style={{display:'flex',alignItems:'center',gap:7,padding:'8px 14px',fontSize:13,fontWeight:600,fontFamily:'inherit',background:'var(--white)',border:'1.5px solid var(--border2)',borderRadius:9,cursor:'pointer',color:'var(--text)',boxShadow:'var(--shadow)'}}>
      👥 Equipo
      {selected.length>0&&<span style={{background:'var(--purple-grad)',color:'#fff',borderRadius:20,fontSize:11,fontWeight:700,padding:'1px 7px'}}>{selected.length}</span>}
      <span style={{fontSize:10,color:'var(--text3)',marginLeft:2}}>{open?'▲':'▼'}</span>
    </button>
    {open&&<div style={{position:'absolute',top:'calc(100% + 6px)',left:0,background:'var(--white)',borderRadius:12,border:'1.5px solid var(--border)',boxShadow:'var(--shadow-md)',padding:8,minWidth:190,zIndex:100}}>
      <button onClick={toggleAll} style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'7px 10px',fontSize:12,fontWeight:700,fontFamily:'inherit',background:'var(--purple-bg)',borderRadius:7,border:'none',cursor:'pointer',color:'var(--purple)',marginBottom:4}}>
        {selected.length===activeSty.length?'✓ Todos seleccionados':'Seleccionar todos'}
      </button>
      {activeSty.map((s,i)=>{
        const checked=selected.includes(s.id)
        return<button key={s.id} onClick={()=>toggle(s.id)} style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'7px 10px',fontSize:13,fontWeight:checked?600:400,fontFamily:'inherit',background:checked?'var(--purple-bg)':'transparent',borderRadius:7,border:'none',cursor:'pointer',color:checked?'var(--purple)':'var(--text2)'}}>
          <span style={{width:14,height:14,borderRadius:4,border:`2px solid ${checked?'var(--purple)':'var(--border2)'}`,background:checked?'var(--purple)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            {checked&&<span style={{color:'#fff',fontSize:9,lineHeight:1,fontWeight:900}}>✓</span>}
          </span>
          <span style={{width:8,height:8,borderRadius:4,background:STY_COLORS[i%STY_COLORS.length],flexShrink:0}}/>
          {s.name}
        </button>
      })}
    </div>}
  </div>
}

// ═══ CALENDAR VIEW ═══
function CalendarView({data,onCancel,onApptAdded}){
  const{appts,profiles,stylists,services,blocks}=data
  const[week,setWeek]=useState(new Date())
  const[selAppt,setSelAppt]=useState(null)
  const[cancelM,setCancelM]=useState(null)
  const[addM,setAddM]=useState(null)
  const activeSty=stylists.filter(s=>s.active)
  const alvaroSty=activeSty.find(s=>normName(s.name).includes('alvaro'))||activeSty[0]
  const[selectedIds,setSelectedIds]=useState(()=>activeSty.map(s=>s.id))
  const[alvaroMode,setAlvaroMode]=useState(false)
  const visibleStylists=alvaroMode?activeSty.filter(s=>s.id===alvaroSty?.id):activeSty.filter(s=>selectedIds.includes(s.id))
  const numDays=daysForCount(visibleStylists.length)
  const allDays=getWeekDays(week)
  const days=allDays.slice(0,numDays)
  const SLOT_H=52,START_H=9,END_H=20
  const TOTAL_SLOTS=(END_H-START_H)*2
  const timelineH=TOTAL_SLOTS*SLOT_H
  const timeToY=t=>{const[h,m]=t.split(':').map(Number);return((h*60+m-START_H*60)/30)*SLOT_H}
  const durToH=min=>(min/30)*SLOT_H
  const getAppts=(dateKey,styId)=>appts.filter(a=>a.appointment_date===dateKey&&a.stylist_id===styId&&a.status==='confirmed')
  const getBlocks=(dateKey,styId)=>blocks.filter(b=>b.blocked_date===dateKey&&b.stylist_id===styId)
  const hourLabels=[]
  for(let h=START_H;h<=END_H;h++)hourLabels.push(`${String(h).padStart(2,'0')}:00`)

  return<div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 48px)'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexShrink:0,flexWrap:'wrap',gap:8}}>
      <div><h1 style={{fontSize:24,fontWeight:900}}>Calendario</h1><p style={{fontSize:13,color:'var(--text3)'}}>Vista semanal · {numDays} día{numDays!==1?'s':''}</p></div>
      <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
        <TeamDropdown stylists={activeSty} selected={selectedIds} onChange={ids=>{setSelectedIds(ids);setAlvaroMode(false)}}/>
        {alvaroSty&&<button onClick={()=>setAlvaroMode(m=>!m)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',fontSize:13,fontWeight:700,fontFamily:'inherit',background:alvaroMode?'var(--purple-grad)':'var(--white)',border:'1.5px solid var(--border2)',borderRadius:9,cursor:'pointer',color:alvaroMode?'#fff':'var(--text)',boxShadow:alvaroMode?'0 2px 8px rgba(109,40,217,0.3)':'var(--shadow)',transition:'all .2s'}}>
          👑 {alvaroSty.name}
        </button>}
        <Btn small onClick={()=>setAddM({date:toK(days[0]),stylistId:visibleStylists[0]?.id})}>+ Cita manual</Btn>
        <Btn small variant="ghost" onClick={()=>setWeek(new Date())}>Hoy</Btn>
        <Btn small variant="secondary" onClick={()=>{const d=new Date(week);d.setDate(d.getDate()-7);setWeek(d)}}>←</Btn>
        <span style={{fontSize:13,fontWeight:600,minWidth:160,textAlign:'center'}}>{fS(days[0])} — {fS(allDays[6])}</span>
        <Btn small variant="secondary" onClick={()=>{const d=new Date(week);d.setDate(d.getDate()+7);setWeek(d)}}>→</Btn>
      </div>
    </div>

    <div style={{display:'flex',gap:12,marginBottom:10,flexWrap:'wrap',flexShrink:0}}>
      {visibleStylists.map((s,i)=>{const idx=activeSty.findIndex(x=>x.id===s.id);return<div key={s.id} style={{display:'flex',alignItems:'center',gap:5}}><div style={{width:10,height:10,borderRadius:3,background:STY_COLORS[idx%STY_COLORS.length]}}/><span style={{fontSize:12,color:'var(--text2)',fontWeight:500}}>{s.name}</span></div>})}
    </div>

    <div style={{background:'var(--white)',borderRadius:14,border:'1.5px solid var(--border)',boxShadow:'var(--shadow)',overflow:'hidden',flex:1,display:'flex',flexDirection:'column'}}>
      {visibleStylists.length===0
        ?<div style={{display:'flex',alignItems:'center',justifyContent:'center',flex:1,color:'var(--text3)',fontSize:14}}>Selecciona al menos un barbero del menú Equipo</div>
        :<div style={{overflowX:'auto',overflowY:'auto',flex:1}}>
          <div style={{display:'flex',position:'sticky',top:0,zIndex:20,background:'var(--white)',borderBottom:'2px solid var(--border)'}}>
            <div style={{width:52,flexShrink:0,borderRight:'1px solid var(--border)'}}/>
            {days.map(day=>{
              const key=toK(day),today=isT(day)
              return<div key={key} style={{flex:1,borderRight:'1px solid var(--border)',background:today?'var(--purple-bg)':'var(--bg)'}}>
                <div style={{textAlign:'center',padding:'10px 4px 6px',borderBottom:'1px solid var(--border)'}}>
                  <div style={{fontSize:10,fontWeight:700,color:today?'var(--purple)':'var(--text3)',textTransform:'uppercase',letterSpacing:'0.06em'}}>{DL[(day.getDay()+6)%7]}</div>
                  <div style={{fontSize:18,fontWeight:today?900:600,color:today?'var(--purple)':'var(--text)',lineHeight:1.2}}>{day.getDate()}</div>
                </div>
                <div style={{display:'flex',borderBottom:'1px solid var(--border)'}}>
                  {visibleStylists.map((s,i)=>{
                    const idx=activeSty.findIndex(x=>x.id===s.id)
                    return<div key={s.id} style={{flex:1,padding:'4px 4px',textAlign:'center',borderRight:i<visibleStylists.length-1?'1px solid var(--border)':'none',fontSize:11,fontWeight:700,color:STY_COLORS[idx%STY_COLORS.length],background:`${STY_COLORS[idx%STY_COLORS.length]}12`,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                      {s.name.split(' ')[0]}
                    </div>
                  })}
                </div>
              </div>
            })}
          </div>

          <div style={{display:'flex'}}>
            <div style={{width:52,flexShrink:0,borderRight:'1px solid var(--border)',position:'relative',height:timelineH}}>
              {hourLabels.map((h,i)=><div key={h} style={{position:'absolute',top:i*SLOT_H*2-7,left:0,right:0,textAlign:'right',paddingRight:6,fontSize:10,fontWeight:600,color:'var(--text3)'}}>{h}</div>)}
            </div>
            {days.map(day=>{
              const key=toK(day)
              return<div key={key} style={{flex:1,borderRight:'1px solid var(--border)',display:'flex',position:'relative',height:timelineH}}>
                {hourLabels.map((_,i)=><div key={i} style={{position:'absolute',top:i*SLOT_H*2,left:0,right:0,height:1,background:'var(--border)',zIndex:0}}/>)}
                {hourLabels.map((_,i)=><div key={`h${i}`} style={{position:'absolute',top:i*SLOT_H*2+SLOT_H,left:0,right:0,height:1,background:'transparent',zIndex:0,borderTop:'1px dashed var(--border)'}}/>)}
                {visibleStylists.map((s,si)=>{
                  const idx=activeSty.findIndex(x=>x.id===s.id)
                  const color=STY_COLORS[idx%STY_COLORS.length]
                  const dayAppts=getAppts(key,s.id)
                  const dayBlocks=getBlocks(key,s.id)
                  const colW=`${100/visibleStylists.length}%`
                  const colL=`${(si/visibleStylists.length)*100}%`
                  return<div key={s.id} style={{position:'absolute',left:colL,width:colW,top:0,bottom:0,borderRight:si<visibleStylists.length-1?'1px solid var(--border)':'none'}}>
                    <div onClick={()=>setAddM({date:key,stylistId:s.id})} style={{position:'absolute',inset:0,cursor:'pointer',zIndex:1}} title={`+ cita para ${s.name}`}/>
                    {dayBlocks.map(b=>{const y=timeToY(b.start_time);const h=timeToY(b.end_time)-y;return<div key={b.id} style={{position:'absolute',top:y,height:Math.max(h,4),left:2,right:2,background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.25)',borderRadius:5,zIndex:2,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}><span style={{fontSize:9,fontWeight:600,color:'var(--red)',textAlign:'center',padding:'0 2px'}}>{b.reason||'Bloqueado'}</span></div>})}
                    {dayAppts.map(a=>{
                      const sv=services.find(x=>x.id===a.service_id)
                      const pr=profiles[a.user_id]
                      const name=a.user_id?pr?.full_name:a.notes?.replace(/^\[TEL\]\s*/,'').split(' — ')[0]||'Tel.'
                      const y=timeToY(a.appointment_time)
                      const h=durToH(sv?.duration||30)
                      return<div key={a.id} onClick={e=>{e.stopPropagation();setSelAppt(a)}} style={{position:'absolute',top:y+1,height:Math.max(h-2,20),left:2,right:2,background:color,borderRadius:6,zIndex:3,cursor:'pointer',padding:'3px 5px',overflow:'hidden',boxShadow:`0 1px 4px ${color}55`,transition:'opacity .15s'}} onMouseEnter={e=>e.currentTarget.style.opacity='.85'} onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                        <div style={{fontSize:10,fontWeight:700,color:'#fff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{a.appointment_time?.slice(0,5)} {name||'—'}</div>
                        {h>30&&<div style={{fontSize:9,color:'rgba(255,255,255,0.82)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{sv?.name}</div>}
                      </div>
                    })}
                  </div>
                })}
              </div>
            })}
          </div>
        </div>}
    </div>

    {selAppt&&<Modal onClose={()=>setSelAppt(null)}>
      {(()=>{const a=selAppt,sv=services.find(s=>s.id===a.service_id),st=stylists.find(s=>s.id===a.stylist_id),pr=profiles[a.user_id];const name=a.user_id?pr?.full_name:a.notes?.replace(/^\[TEL\]\s*/,'').split(' — ')[0]||'Tel.';return<>
        <h3 style={{fontSize:20,fontWeight:900,marginBottom:16}}>Detalle de cita</h3>
        {!a.user_id&&<div style={{background:'var(--purple-bg)',borderRadius:9,padding:'8px 12px',marginBottom:14,fontSize:12,fontWeight:600,color:'var(--purple)'}}>📞 Cita registrada por teléfono</div>}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px 20px',marginBottom:20}}>
          {[['Cliente',name||'—'],['Servicio',sv?.name||'—'],['Profesional',st?.name||'—'],['Fecha',fDF(parseDate(a.appointment_date))],['Hora',`${a.appointment_time?.slice(0,5)} — ${a.end_time?.slice(0,5)}`],['Precio',sv?`${Number(sv.price).toFixed(2)} €`:'—'],['Estado',a.status],['Notas',a.notes||'—']].map(([k,v])=><div key={k}><div style={{fontSize:11,fontWeight:600,color:'var(--text3)',textTransform:'uppercase',marginBottom:2}}>{k}</div><div style={{fontSize:14,fontWeight:500}}>{v}</div></div>)}
        </div>
        <div style={{display:'flex',gap:10}}><Btn variant="secondary" onClick={()=>setSelAppt(null)} style={{flex:1}}>Cerrar</Btn>{a.status==='confirmed'&&<Btn variant="danger" onClick={()=>{setCancelM(a);setSelAppt(null)}} style={{flex:1}}>Cancelar cita</Btn>}</div>
      </>})()}
    </Modal>}

    {cancelM&&<Modal onClose={()=>setCancelM(null)}>
      <h3 style={{fontSize:18,fontWeight:900,marginBottom:12}}>¿Cancelar esta cita?</h3>
      <div style={{padding:14,background:'var(--bg)',borderRadius:10,marginBottom:16,border:'1.5px solid var(--border)'}}>
        <div style={{fontSize:15,fontWeight:600}}>{cancelM.user_id?profiles[cancelM.user_id]?.full_name:cancelM.notes?.replace(/^\[TEL\]\s*/,'').split(' — ')[0]||'Tel.'}</div>
        <div style={{fontSize:13,color:'var(--text3)',marginTop:4}}>{services.find(s=>s.id===cancelM.service_id)?.name} · {cancelM.appointment_time?.slice(0,5)}h</div>
      </div>
      <div style={{display:'flex',gap:10}}><Btn variant="secondary" onClick={()=>setCancelM(null)} style={{flex:1}}>Volver</Btn><Btn variant="danger" onClick={()=>{onCancel(cancelM.id);setCancelM(null)}} style={{flex:1}}>Cancelar cita</Btn></div>
    </Modal>}

    {addM&&<AddApptModal data={data} defaultDate={addM.date} defaultStylistId={addM.stylistId} onSave={onApptAdded} onClose={()=>setAddM(null)}/>}
  </div>
}

// ═══ FINANCE ═══
function FinanceView({data,onAddExpense,onDelExpense}){
  const{appts,services,expenses}=data
  const[period,setPeriod]=useState('month'),[showAdd,setShowAdd]=useState(false)
  const[eAmt,setEAmt]=useState(''),[eDesc,setEDesc]=useState(''),[eCat,setECat]=useState('general'),[eDate,setEDate]=useState(toK(new Date()))
  const now=new Date(),thisMonth=toK(now).slice(0,7)
  const range=period==='week'?{s:toK(getWeekDays(now)[0]),e:toK(getWeekDays(now)[6]),l:`Semana ${fS(getWeekDays(now)[0])} — ${fS(getWeekDays(now)[6])}`}:{s:`${thisMonth}-01`,e:`${thisMonth}-31`,l:`${MO[now.getMonth()]} ${now.getFullYear()}`}
  const fAppts=appts.filter(a=>a.appointment_date>=range.s&&a.appointment_date<=range.e&&(a.status==='confirmed'||a.status==='completed'))
  const revenue=fAppts.reduce((s,a)=>{const sv=services.find(x=>x.id===a.service_id);return s+(sv?Number(sv.price):0)},0)
  const fExp=expenses.filter(e=>e.expense_date>=range.s&&e.expense_date<=range.e)
  const totalExp=fExp.reduce((s,e)=>s+Number(e.amount),0),profit=revenue-totalExp
  const byDay={};fAppts.forEach(a=>{if(!byDay[a.appointment_date])byDay[a.appointment_date]=0;const sv=services.find(x=>x.id===a.service_id);byDay[a.appointment_date]+=sv?Number(sv.price):0})
  const maxD=Math.max(...Object.values(byDay),1)
  const byCat={};fExp.forEach(e=>{if(!byCat[e.category])byCat[e.category]=0;byCat[e.category]+=Number(e.amount)})
  const handleAdd=()=>{if(!eAmt||!eDesc.trim())return;onAddExpense({amount:parseFloat(eAmt),description:eDesc.trim(),category:eCat,expense_date:eDate});setShowAdd(false);setEAmt('');setEDesc('');setECat('general')}
  const handleExport=()=>{const rows=fAppts.map(a=>{const sv=services.find(x=>x.id===a.service_id);const st=data.stylists.find(x=>x.id===a.stylist_id);const pr=data.profiles[a.user_id];return{Fecha:a.appointment_date,Hora:a.appointment_time?.slice(0,5),Cliente:pr?.full_name||'—',Servicio:sv?.name||'—',Barbero:st?.name||'—',Precio:sv?Number(sv.price).toFixed(2):'0',Estado:a.status}});if(rows.length>0)exportCSV(rows,`ingresos_${range.s}_${range.e}`)}
  const handleExportExp=()=>{const rows=fExp.map(e=>({Fecha:e.expense_date,Descripcion:e.description,Categoria:e.category,Importe:Number(e.amount).toFixed(2)}));if(rows.length>0)exportCSV(rows,`gastos_${range.s}_${range.e}`)}
  return<div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
      <div><h1 style={{fontSize:24,fontWeight:900}}>Finanzas</h1><p style={{fontSize:14,color:'var(--text3)'}}>{range.l}</p></div>
      <div style={{display:'flex',gap:8}}>
        <div style={{display:'flex',background:'var(--white)',borderRadius:9,padding:3,border:'1.5px solid var(--border)'}}>
          {[['week','Semana'],['month','Mes']].map(([id,l])=><button key={id} onClick={()=>setPeriod(id)} style={{padding:'7px 14px',fontSize:12,fontWeight:700,fontFamily:'inherit',border:'none',borderRadius:7,cursor:'pointer',background:period===id?'var(--purple-grad)':'transparent',color:period===id?'#fff':'var(--text3)'}}>{l}</button>)}
        </div>
        <Btn small variant="secondary" onClick={handleExport}>📥 Ingresos CSV</Btn>
        <Btn small variant="secondary" onClick={handleExportExp}>📥 Gastos CSV</Btn>
      </div>
    </div>
    <div style={{display:'flex',gap:14,marginBottom:20,flexWrap:'wrap'}}>
      <Stat label="Ingresos" value={`${revenue.toFixed(0)}€`} icon="💰" color="var(--green)" bg="var(--green-bg)" sub={`${fAppts.length} citas`}/>
      <Stat label="Gastos" value={`${totalExp.toFixed(0)}€`} icon="📉" color="var(--red)" bg="var(--red-bg)" sub={`${fExp.length} gastos`}/>
      <Stat label="Beneficio neto" value={`${profit.toFixed(0)}€`} icon={profit>=0?"✅":"⚠️"} color={profit>=0?"var(--green)":"var(--red)"} bg={profit>=0?"var(--green-bg)":"var(--red-bg)"} sub={revenue>0?`Margen: ${(profit/revenue*100).toFixed(0)}%`:''}/>
      <Stat label="Media por cita" value={fAppts.length>0?`${(revenue/fAppts.length).toFixed(0)}€`:'—'} icon="📊"/>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:14,marginBottom:20}}>
      <div className="fade" style={{background:'var(--white)',borderRadius:14,border:'1.5px solid var(--border)',padding:20,boxShadow:'var(--shadow)'}}>
        <h3 style={{fontSize:15,fontWeight:700,marginBottom:14}}>Ingresos por día</h3>
        <div style={{display:'flex',alignItems:'flex-end',gap:3,height:140}}>
          {Object.entries(byDay).sort().map(([day,rev])=><div key={day} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}><div style={{fontSize:9,fontWeight:600,color:'var(--purple)'}}>{rev.toFixed(0)}€</div><div style={{width:'100%',maxWidth:36,background:'var(--purple-grad)',borderRadius:3,height:`${Math.max((rev/maxD)*110,4)}px`}}/><div style={{fontSize:9,color:'var(--text3)'}}>{new Date(day+'T12:00').getDate()}</div></div>)}
          {Object.keys(byDay).length===0&&<p style={{fontSize:13,color:'var(--text3)',width:'100%',textAlign:'center',paddingTop:50}}>Sin datos</p>}
        </div>
      </div>
      <div className="fade fd1" style={{background:'var(--white)',borderRadius:14,border:'1.5px solid var(--border)',padding:20,boxShadow:'var(--shadow)'}}>
        <h3 style={{fontSize:15,fontWeight:700,marginBottom:14}}>Gastos por categoría</h3>
        {Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([cat,amt])=>{const c=EXPENSE_CATS.find(x=>x.id===cat);return<div key={cat} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid var(--border)'}}><span style={{fontSize:14}}>{c?.icon||'📦'}</span><span style={{flex:1,fontSize:13,fontWeight:500}}>{c?.label||cat}</span><span style={{fontSize:13,fontWeight:700,color:'var(--red)'}}>{amt.toFixed(0)}€</span></div>})}
        {Object.keys(byCat).length===0&&<p style={{fontSize:13,color:'var(--text3)'}}>Sin gastos</p>}
      </div>
    </div>
    <div className="fade fd2" style={{background:'var(--white)',borderRadius:14,border:'1.5px solid var(--border)',boxShadow:'var(--shadow)',overflow:'hidden'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'16px 20px',borderBottom:'1.5px solid var(--border)'}}>
        <h3 style={{fontSize:15,fontWeight:700}}>Gastos</h3><Btn small onClick={()=>setShowAdd(true)}>+ Añadir gasto</Btn>
      </div>
      {fExp.length===0?<div style={{padding:30,textAlign:'center',color:'var(--text3)',fontSize:13}}>Sin gastos en este período</div>:
      fExp.sort((a,b)=>b.expense_date.localeCompare(a.expense_date)).map((e,i)=>{const c=EXPENSE_CATS.find(x=>x.id===e.category);return<div key={e.id} style={{display:'flex',alignItems:'center',gap:14,padding:'12px 20px',borderBottom:i<fExp.length-1?'1px solid var(--border)':'none'}}>
        <div style={{width:36,height:36,borderRadius:9,background:'var(--red-bg)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>{c?.icon||'📦'}</div>
        <div style={{flex:1}}><div style={{fontSize:14,fontWeight:500}}>{e.description}</div><div style={{fontSize:12,color:'var(--text3)'}}>{c?.label||e.category} · {fS(new Date(e.expense_date+'T12:00'))}</div></div>
        <div style={{fontSize:15,fontWeight:700,color:'var(--red)'}}>-{Number(e.amount).toFixed(2)}€</div>
        <Btn small variant="danger" onClick={()=>onDelExpense(e.id)}>✕</Btn>
      </div>})}
    </div>
    {showAdd&&<Modal onClose={()=>setShowAdd(false)}>
      <h3 style={{fontSize:18,fontWeight:900,marginBottom:18}}>Añadir gasto</h3>
      <Inp label="Importe (€)" required type="number" step="0.01" value={eAmt} onChange={e=>setEAmt(e.target.value)} placeholder="0.00"/>
      <Inp label="Descripción" required value={eDesc} onChange={e=>setEDesc(e.target.value)} placeholder="Ej: Compra productos..."/>
      <Sel label="Categoría" value={eCat} onChange={e=>setECat(e.target.value)}>{EXPENSE_CATS.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}</Sel>
      <Inp label="Fecha" type="date" value={eDate} onChange={e=>setEDate(e.target.value)}/>
      <div style={{display:'flex',gap:10,marginTop:8}}><Btn variant="secondary" onClick={()=>setShowAdd(false)} style={{flex:1}}>Cancelar</Btn><Btn onClick={handleAdd} disabled={!eAmt||!eDesc.trim()} style={{flex:1}}>Guardar</Btn></div>
    </Modal>}
  </div>
}

// ═══ BARBER ANALYTICS ═══
function BarberStats({data}){
  const{appts,stylists,services}=data
  const[selSty,setSelSty]=useState(stylists[0]?.id)
  const now=new Date(),thisMonth=toK(now).slice(0,7)
  const sty=stylists.find(s=>s.id===selSty)
  const mAppts=appts.filter(a=>a.appointment_date.slice(0,7)===thisMonth&&a.stylist_id===selSty)
  const conf=mAppts.filter(a=>a.status==='confirmed'||a.status==='completed')
  const canc=mAppts.filter(a=>a.status==='cancelled').length
  const rev=conf.reduce((s,a)=>{const sv=services.find(x=>x.id===a.service_id);return s+(sv?Number(sv.price):0)},0)
  const clients=new Set(conf.map(a=>a.user_id).filter(Boolean)).size
  const daysInMonth=new Date(now.getFullYear(),now.getMonth()+1,0).getDate()
  let workDays=0;for(let i=1;i<=daysInMonth;i++){const d=new Date(now.getFullYear(),now.getMonth(),i);if(d.getDay()!==0)workDays++}
  const totalSlots=workDays*gS('09:00','20:00').length
  const satDays=Array.from({length:daysInMonth},(_,i)=>new Date(now.getFullYear(),now.getMonth(),i+1)).filter(d=>d.getDay()===6).length
  const adjustedSlots=totalSlots-satDays*(gS('14:00','20:00').length)
  let occupiedSlots=0;conf.forEach(a=>{const sv=services.find(x=>x.id===a.service_id);occupiedSlots+=sv?Math.ceil(sv.duration/30):1})
  const occupancyPct=adjustedSlots>0?(occupiedSlots/adjustedSlots*100).toFixed(0):0
  const byHour={};gS('09:00','20:00').forEach(h=>{byHour[h]=0});conf.forEach(a=>{const h=a.appointment_time?.slice(0,5);if(h&&byHour[h]!==undefined)byHour[h]++})
  const maxHour=Math.max(...Object.values(byHour),1)
  const bySvc={};conf.forEach(a=>{const sv=services.find(x=>x.id===a.service_id);if(!sv)return;if(!bySvc[sv.name])bySvc[sv.name]={c:0,r:0};bySvc[sv.name].c++;bySvc[sv.name].r+=Number(sv.price)})
  const byWeekday={Lun:0,Mar:0,Mié:0,Jue:0,Vie:0,Sáb:0};conf.forEach(a=>{const d=new Date(a.appointment_date+'T12:00');const wd=DL[(d.getDay()+6)%7];if(byWeekday[wd]!==undefined)byWeekday[wd]++})
  const handleExport=()=>{const rows=conf.map(a=>{const sv=services.find(x=>x.id===a.service_id);return{Fecha:a.appointment_date,Hora:a.appointment_time?.slice(0,5),Servicio:sv?.name||'—',Precio:sv?Number(sv.price).toFixed(2):'0'}});if(rows.length>0)exportCSV(rows,`barbero_${sty?.name}_${thisMonth}`)}
  return<div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
      <div><h1 style={{fontSize:24,fontWeight:900}}>Análisis por barbero</h1><p style={{fontSize:14,color:'var(--text3)'}}>{MO[now.getMonth()]} {now.getFullYear()}</p></div>
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        <select value={selSty} onChange={e=>setSelSty(Number(e.target.value))} style={{padding:'8px 32px 8px 13px',fontSize:13,border:'1.5px solid var(--border2)',borderRadius:9,background:'var(--white)',fontFamily:'inherit',cursor:'pointer'}}>
          {stylists.filter(s=>s.active).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <Btn small variant="secondary" onClick={handleExport}>📥 Exportar CSV</Btn>
      </div>
    </div>
    <div style={{display:'flex',gap:14,marginBottom:20,flexWrap:'wrap'}}>
      <Stat label="Citas" value={conf.length} icon="📅" sub={`${canc} canceladas`}/>
      <Stat label="Ingresos" value={`${rev.toFixed(0)}€`} icon="💰" color="var(--green)" bg="var(--green-bg)"/>
      <Stat label="% Ocupación" value={`${occupancyPct}%`} icon="⏱️" color={Number(occupancyPct)>70?"var(--green)":Number(occupancyPct)>40?"var(--orange)":"var(--red)"} bg={Number(occupancyPct)>70?"var(--green-bg)":Number(occupancyPct)>40?"var(--orange-bg)":"var(--red-bg)"} sub={`${occupiedSlots}/${adjustedSlots} slots`}/>
      <Stat label="Clientes" value={clients} icon="👥" color="var(--blue)" bg="var(--blue-bg)"/>
      <Stat label="Media/cita" value={conf.length>0?`${(rev/conf.length).toFixed(0)}€`:'—'} icon="📊"/>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
      <div className="fade" style={{background:'var(--white)',borderRadius:14,border:'1.5px solid var(--border)',padding:20,boxShadow:'var(--shadow)'}}>
        <h3 style={{fontSize:15,fontWeight:700,marginBottom:4}}>Distribución por hora</h3>
        <p style={{fontSize:12,color:'var(--text3)',marginBottom:14}}>Las horas con menos citas son oportunidad de mejora</p>
        <div style={{display:'flex',flexDirection:'column',gap:3}}>
          {Object.entries(byHour).map(([h,c])=>{const pct=maxHour>0?(c/maxHour)*100:0;const isEmpty=c===0;return<div key={h} style={{display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:11,fontWeight:500,color:'var(--text3)',minWidth:36}}>{h}</span><div style={{flex:1,height:14,borderRadius:3,background:'var(--bg)'}}><div style={{height:14,borderRadius:3,background:isEmpty?'transparent':pct>60?'var(--green)':pct>30?'var(--purple)':'var(--orange)',width:`${Math.max(pct,0)}%`,transition:'width .3s'}}/></div><span style={{fontSize:11,fontWeight:600,color:isEmpty?'var(--red)':'var(--text)',minWidth:20,textAlign:'right'}}>{c}</span>{isEmpty&&<span style={{fontSize:10,color:'var(--red)',fontWeight:500}}>vacía</span>}</div>})}
        </div>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <div className="fade fd1" style={{background:'var(--white)',borderRadius:14,border:'1.5px solid var(--border)',padding:20,boxShadow:'var(--shadow)'}}>
          <h3 style={{fontSize:15,fontWeight:700,marginBottom:14}}>Citas por día de la semana</h3>
          <div style={{display:'flex',gap:6,alignItems:'flex-end',height:80}}>
            {Object.entries(byWeekday).map(([d,c])=>{const mx=Math.max(...Object.values(byWeekday),1);return<div key={d} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}><span style={{fontSize:10,fontWeight:600,color:'var(--purple)'}}>{c}</span><div style={{width:'100%',background:'var(--purple-grad)',borderRadius:3,height:`${Math.max((c/mx)*60,3)}px`}}/><span style={{fontSize:10,color:'var(--text3)'}}>{d}</span></div>})}
          </div>
        </div>
        <div className="fade fd2" style={{background:'var(--white)',borderRadius:14,border:'1.5px solid var(--border)',padding:20,boxShadow:'var(--shadow)'}}>
          <h3 style={{fontSize:15,fontWeight:700,marginBottom:14}}>Servicios realizados</h3>
          {Object.entries(bySvc).sort((a,b)=>b[1].c-a[1].c).map(([n,d])=><div key={n} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--border)',fontSize:13}}><span style={{fontWeight:500}}>{n}</span><span style={{fontWeight:700,color:'var(--purple)'}}>{d.c} · {d.r.toFixed(0)}€</span></div>)}
          {Object.keys(bySvc).length===0&&<p style={{fontSize:13,color:'var(--text3)'}}>Sin datos</p>}
        </div>
      </div>
    </div>
  </div>
}

// ═══ CLIENTS ═══
function ClientsView({data}){
  const{appts,profiles,services}=data
  const[search,setSearch]=useState('')
  const clientMap={}
  appts.forEach(a=>{if(!a.user_id)return;if(!clientMap[a.user_id])clientMap[a.user_id]={v:0,r:0,c:0,last:null};if(a.status==='confirmed'||a.status==='completed'){clientMap[a.user_id].v++;const sv=services.find(x=>x.id===a.service_id);clientMap[a.user_id].r+=sv?Number(sv.price):0;if(!clientMap[a.user_id].last||a.appointment_date>clientMap[a.user_id].last)clientMap[a.user_id].last=a.appointment_date}if(a.status==='cancelled')clientMap[a.user_id].c++})
  let clients=Object.entries(clientMap).map(([id,d])=>({id,...d,p:profiles[id]})).filter(c=>c.p)
  if(search)clients=clients.filter(c=>c.p?.full_name?.toLowerCase().includes(search.toLowerCase())||c.p?.phone?.includes(search))
  clients.sort((a,b)=>b.r-a.r)
  const handleExport=()=>{const rows=clients.map(c=>({Nombre:c.p?.full_name||'—',Telefono:c.p?.phone||'—',Visitas:c.v,Ingresos:c.r.toFixed(2),Cancelaciones:c.c,Ultima_visita:c.last||'—'}));if(rows.length>0)exportCSV(rows,'clientes')}
  return<div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
      <div><h1 style={{fontSize:24,fontWeight:900}}>Clientes</h1><p style={{fontSize:14,color:'var(--text3)'}}>{clients.length} registrados</p></div>
      <div style={{display:'flex',gap:8}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar..." style={{padding:'8px 14px',fontSize:13,border:'1.5px solid var(--border2)',borderRadius:9,background:'var(--white)',fontFamily:'inherit',width:220}}/>
        <Btn small variant="secondary" onClick={handleExport}>📥 Exportar CSV</Btn>
      </div>
    </div>
    <div style={{background:'var(--white)',borderRadius:14,border:'1.5px solid var(--border)',boxShadow:'var(--shadow)',overflow:'hidden'}}>
      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 80px 100px 80px 100px',padding:'10px 20px',borderBottom:'1.5px solid var(--border)',background:'var(--bg)'}}>
        {['Cliente','Teléfono','Visitas','Ingresos','Canc.','Última'].map(h=><div key={h} style={{fontSize:11,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</div>)}
      </div>
      {clients.length===0?<div style={{padding:30,textAlign:'center',color:'var(--text3)'}}>No hay clientes</div>:
      clients.map(c=><div key={c.id} style={{display:'grid',gridTemplateColumns:'2fr 1fr 80px 100px 80px 100px',padding:'12px 20px',borderBottom:'1px solid var(--border)',alignItems:'center'}}>
        <div style={{fontSize:14,fontWeight:500}}>{c.p?.full_name}</div>
        <div style={{fontSize:13,color:'var(--text2)'}}>{c.p?.phone||'—'}</div>
        <div style={{fontSize:14,fontWeight:600}}>{c.v}</div>
        <div style={{fontSize:14,fontWeight:700,color:'var(--purple)'}}>{c.r.toFixed(0)}€</div>
        <div style={{fontSize:13,color:c.c>0?'var(--red)':'var(--text3)'}}>{c.c}</div>
        <div style={{fontSize:12,color:'var(--text3)'}}>{c.last?fS(new Date(c.last+'T12:00')):'—'}</div>
      </div>)}
    </div>
  </div>
}

// ═══ TEAM CRUD ═══
function TeamView({data,onSave,onDel}){
  const[edit,setEdit]=useState(null),[del,setDel]=useState(null)
  return<div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}><h1 style={{fontSize:24,fontWeight:900}}>Equipo</h1><Btn onClick={()=>setEdit({name:'',username:'',role_title:'Barbero',photo_url:'',active:true})}>+ Añadir</Btn></div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:14}}>
      {data.stylists.map(s=><div key={s.id} className="fade" style={{background:'var(--white)',borderRadius:14,border:'1.5px solid var(--border)',padding:18,boxShadow:'var(--shadow)',opacity:s.active?1:0.5}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
          <div style={{width:48,height:48,borderRadius:12,background:'var(--purple-bg)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:700,color:'var(--purple)',overflow:'hidden',flexShrink:0}}>{s.photo_url?<img src={s.photo_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:s.name[0]}</div>
          <div><div style={{fontSize:15,fontWeight:700}}>{s.name}</div><div style={{fontSize:12,color:'var(--text3)'}}>{s.role_title} · {s.username||'—'}</div></div>
        </div>
        <div style={{display:'flex',gap:6}}><Btn small variant="secondary" onClick={()=>setEdit(s)} style={{flex:1}}>Editar</Btn><Btn small variant="danger" onClick={()=>setDel(s)}>✕</Btn></div>
      </div>)}
    </div>
    {edit&&<StyModal d={edit} onSave={x=>{onSave(x);setEdit(null)}} onClose={()=>setEdit(null)}/>}
    {del&&<Modal onClose={()=>setDel(null)}><h3 style={{fontSize:18,fontWeight:900,marginBottom:12}}>¿Eliminar a {del.name}?</h3><div style={{display:'flex',gap:10,marginTop:16}}><Btn variant="secondary" onClick={()=>setDel(null)} style={{flex:1}}>Cancelar</Btn><Btn variant="danger" onClick={()=>{onDel(del.id);setDel(null)}} style={{flex:1}}>Eliminar</Btn></div></Modal>}
  </div>
}
function StyModal({d,onSave,onClose}){
  const[n,sN]=useState(d.name||''),[u,sU]=useState(d.username||''),[r,sR]=useState(d.role_title||'Barbero'),[p,sP]=useState(d.photo_url||''),[a,sA]=useState(d.active!==false)
  return<Modal onClose={onClose}><h3 style={{fontSize:18,fontWeight:900,marginBottom:16}}>{d.id?'Editar':'Nuevo'} profesional</h3><Inp label="Nombre" required value={n} onChange={e=>sN(e.target.value)}/><Inp label="Username" value={u} onChange={e=>sU(e.target.value)} placeholder="@user"/><Inp label="Rol" value={r} onChange={e=>sR(e.target.value)}/><Inp label="URL foto" value={p} onChange={e=>sP(e.target.value)} placeholder="/images/team-nombre.jpg"/>{p&&<div style={{marginBottom:10,width:50,height:50,borderRadius:10,overflow:'hidden',background:'var(--bg)'}}><img src={p} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>e.target.style.display='none'}/></div>}<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}><span style={{fontSize:13}}>Activo</span><button onClick={()=>sA(!a)} style={{width:40,height:22,borderRadius:11,border:'none',cursor:'pointer',background:a?'var(--purple)':'var(--border)',position:'relative',transition:'all .3s'}}><div style={{width:18,height:18,borderRadius:9,background:'#fff',position:'absolute',top:2,left:a?20:2,transition:'all .3s',boxShadow:'0 1px 2px rgba(0,0,0,0.15)'}}/></button></div><div style={{display:'flex',gap:8}}><Btn variant="secondary" onClick={onClose} style={{flex:1}}>Cancelar</Btn><Btn onClick={()=>onSave({...d,name:n,username:u,role_title:r,photo_url:p,active:a})} disabled={!n.trim()} style={{flex:1}}>Guardar</Btn></div></Modal>
}

// ═══ SERVICES CRUD ═══
function ServicesView({data,onSave,onDel}){
  const[edit,setEdit]=useState(null),[del,setDel]=useState(null)
  return<div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}><h1 style={{fontSize:24,fontWeight:900}}>Servicios</h1><Btn onClick={()=>setEdit({name:'',description:'',duration:30,price:0,category:'popular'})}>+ Añadir</Btn></div>
    <div style={{background:'var(--white)',borderRadius:14,border:'1.5px solid var(--border)',boxShadow:'var(--shadow)',overflow:'hidden'}}>
      {data.services.map((s,i)=><div key={s.id} className="fade" style={{display:'flex',alignItems:'center',gap:14,padding:'14px 20px',borderBottom:i<data.services.length-1?'1px solid var(--border)':'none',opacity:s.active?1:0.5}}>
        <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600}}>{s.name}</div><div style={{fontSize:12,color:'var(--text3)',marginTop:2}}>{s.description}</div></div>
        <div style={{fontSize:12,color:'var(--text3)'}}>{s.duration}min</div>
        <div style={{fontSize:15,fontWeight:800,color:'var(--purple)',minWidth:55,textAlign:'right'}}>{Number(s.price).toFixed(2)}€</div>
        <div style={{display:'flex',gap:4}}><Btn small variant="secondary" onClick={()=>setEdit(s)}>Editar</Btn><Btn small variant="danger" onClick={()=>setDel(s)}>✕</Btn></div>
      </div>)}
    </div>
    {edit&&<SvcModal d={edit} onSave={x=>{onSave(x);setEdit(null)}} onClose={()=>setEdit(null)}/>}
    {del&&<Modal onClose={()=>setDel(null)}><h3 style={{fontSize:18,fontWeight:900,marginBottom:12}}>¿Eliminar {del.name}?</h3><div style={{display:'flex',gap:10,marginTop:16}}><Btn variant="secondary" onClick={()=>setDel(null)} style={{flex:1}}>Cancelar</Btn><Btn variant="danger" onClick={()=>{onDel(del.id);setDel(null)}} style={{flex:1}}>Eliminar</Btn></div></Modal>}
  </div>
}
function SvcModal({d,onSave,onClose}){
  const[n,sN]=useState(d.name||''),[ds,sDs]=useState(d.description||''),[du,sDu]=useState(d.duration||30),[p,sP]=useState(d.price||0),[c,sC]=useState(d.category||'popular')
  return<Modal onClose={onClose}><h3 style={{fontSize:18,fontWeight:900,marginBottom:16}}>{d.id?'Editar':'Nuevo'} servicio</h3><Inp label="Nombre" required value={n} onChange={e=>sN(e.target.value)} placeholder="CORTE CLOCKS"/><Inp label="Descripción" value={ds} onChange={e=>sDs(e.target.value)}/><div style={{display:'flex',gap:8}}><div style={{flex:1}}><Inp label="Duración (min)" type="number" value={du} onChange={e=>sDu(parseInt(e.target.value)||0)}/></div><div style={{flex:1}}><Inp label="Precio (€)" type="number" step="0.01" value={p} onChange={e=>sP(parseFloat(e.target.value)||0)}/></div></div><Sel label="Categoría" value={c} onChange={e=>sC(e.target.value)}><option value="popular">Popular</option><option value="other">Otro</option></Sel><div style={{display:'flex',gap:8}}><Btn variant="secondary" onClick={onClose} style={{flex:1}}>Cancelar</Btn><Btn onClick={()=>onSave({...d,name:n,description:ds,duration:du,price:p,category:c})} disabled={!n.trim()} style={{flex:1}}>Guardar</Btn></div></Modal>
}

// ═══ BLOCKS ═══
function BlocksView({data,onAdd,onDel}){
  const[show,setShow]=useState(false),[bS,setBS]=useState(data.stylists[0]?.id),[bD,setBD]=useState(toK(new Date())),[bSt,setBSt]=useState('09:00'),[bE,setBE]=useState('10:00'),[bR,setBR]=useState('')
  const upcoming=data.blocks.filter(b=>b.blocked_date>=toK(new Date())).sort((a,b)=>a.blocked_date.localeCompare(b.blocked_date))
  return<div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}><h1 style={{fontSize:24,fontWeight:900}}>Bloqueos</h1><Btn onClick={()=>setShow(true)}>+ Bloquear horario</Btn></div>
    <div style={{background:'var(--white)',borderRadius:14,border:'1.5px solid var(--border)',boxShadow:'var(--shadow)',overflow:'hidden'}}>
      {upcoming.length===0?<div style={{padding:30,textAlign:'center',color:'var(--text3)'}}>No hay bloqueos activos</div>:
      upcoming.map((b,i)=><div key={b.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 20px',borderBottom:i<upcoming.length-1?'1px solid var(--border)':'none'}}>
        <div style={{width:36,height:36,borderRadius:9,background:'var(--red-bg)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>🚫</div>
        <div style={{flex:1}}><div style={{fontSize:14,fontWeight:500}}>{b.reason||'Bloqueado'}</div><div style={{fontSize:12,color:'var(--text3)'}}>{data.stylists.find(s=>s.id===b.stylist_id)?.name} · {fS(new Date(b.blocked_date+'T12:00'))} · {b.start_time?.slice(0,5)}—{b.end_time?.slice(0,5)}</div></div>
        <Btn small variant="danger" onClick={()=>onDel(b.id)}>Quitar</Btn>
      </div>)}
    </div>
    {show&&<Modal onClose={()=>setShow(false)}>
      <h3 style={{fontSize:18,fontWeight:900,marginBottom:16}}>Bloquear horario</h3>
      <Sel label="Profesional" value={bS} onChange={e=>setBS(Number(e.target.value))}>{data.stylists.filter(s=>s.active).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</Sel>
      <Inp label="Fecha" type="date" value={bD} onChange={e=>setBD(e.target.value)}/>
      <div style={{display:'flex',gap:8}}><div style={{flex:1}}><Sel label="Desde" value={bSt} onChange={e=>setBSt(e.target.value)}>{gS().map(h=><option key={h} value={h}>{h}</option>)}</Sel></div><div style={{flex:1}}><Sel label="Hasta" value={bE} onChange={e=>setBE(e.target.value)}>{gS('09:30','20:30').map(h=><option key={h} value={h}>{h}</option>)}</Sel></div></div>
      <Inp label="Motivo" value={bR} onChange={e=>setBR(e.target.value)} placeholder="Ej: Descanso..."/>
      <div style={{display:'flex',gap:8}}><Btn variant="secondary" onClick={()=>setShow(false)} style={{flex:1}}>Cancelar</Btn><Btn onClick={()=>{onAdd({stylist_id:bS,blocked_date:bD,start_time:bSt,end_time:bE,reason:bR||'Bloqueado'});setShow(false);setBR('')}} style={{flex:1}}>Bloquear</Btn></div>
    </Modal>}
  </div>
}

// ═══ MAIN ═══
export default function App(){
  const[user,setUser]=useState(null),[profile,setProfile]=useState(null),[view,setView]=useState('loading'),[page,setPage]=useState('dash')
  const[appts,setAppts]=useState([]),[profiles,setProfiles]=useState({}),[stylists,setStylists]=useState([]),[services,setServices]=useState([]),[blocks,setBlocks]=useState([]),[expenses,setExpenses]=useState([])

  const loadAll=useCallback(async()=>{
    const[{data:a},{data:st},{data:sv},{data:bl},{data:ex}]=await Promise.all([
      supabase.from('appointments').select('*').order('appointment_date',{ascending:false}).limit(1000),
      supabase.from('stylists').select('*').order('display_order'),
      supabase.from('services').select('*').order('display_order'),
      supabase.from('blocked_slots').select('*,stylists(name)').order('blocked_date',{ascending:false}),
      supabase.from('expenses').select('*').order('expense_date',{ascending:false}).limit(500),
    ])
    setAppts(a||[]);setStylists(st||[]);setServices(sv||[]);setBlocks(bl||[]);setExpenses(ex||[])
    const ids=[...new Set((a||[]).map(x=>x.user_id).filter(Boolean))]
    if(ids.length>0){const{data:p}=await supabase.from('profiles').select('id,full_name,phone').in('id',ids);const m={};(p||[]).forEach(pr=>{m[pr.id]=pr});setProfiles(m)}
  },[])

  useEffect(()=>{
    supabase.auth.getSession().then(async({data:{session}})=>{
      if(session?.user){setUser(session.user);const{data:prof}=await supabase.from('profiles').select('*').eq('id',session.user.id).single();if(prof?.role!=='admin'){setView('denied');return}setProfile(prof);setView('app');loadAll()}else{setView('auth')}
    })
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{if(!s?.user){setUser(null);setProfile(null);setView('auth')}})
    return()=>subscription.unsubscribe()
  },[loadAll])

  const handleLogin=async u=>{setUser(u);const{data:prof}=await supabase.from('profiles').select('*').eq('id',u.id).single();if(prof?.role!=='admin'){setView('denied');return}setProfile(prof);setView('app');loadAll()}
  const cancelAppt=async id=>{await supabase.from('appointments').update({status:'cancelled',cancelled_by:'admin'}).eq('id',id);loadAll()}
  const addBlock=async d=>{await supabase.from('blocked_slots').insert({...d,created_by:user.id});loadAll()}
  const rmBlock=async id=>{await supabase.from('blocked_slots').delete().eq('id',id);loadAll()}
  const saveSvc=async d=>{if(d.id){await supabase.from('services').update({name:d.name,description:d.description,duration:d.duration,price:d.price,category:d.category}).eq('id',d.id)}else{const mx=services.reduce((m,s)=>Math.max(m,s.display_order||0),0);await supabase.from('services').insert({...d,display_order:mx+1,active:true})}loadAll()}
  const delSvc=async id=>{await supabase.from('services').delete().eq('id',id);loadAll()}
  const saveSty=async d=>{if(d.id){await supabase.from('stylists').update({name:d.name,username:d.username,role_title:d.role_title,photo_url:d.photo_url,active:d.active}).eq('id',d.id)}else{const mx=stylists.reduce((m,s)=>Math.max(m,s.display_order||0),0);await supabase.from('stylists').insert({...d,display_order:mx+1,active:true})}loadAll()}
  const delSty=async id=>{await supabase.from('stylists').delete().eq('id',id);loadAll()}
  const addExpense=async d=>{await supabase.from('expenses').insert({...d,created_by:user.id});loadAll()}
  const delExpense=async id=>{await supabase.from('expenses').delete().eq('id',id);loadAll()}

  const D={appts,profiles,stylists,services,blocks,expenses}

  if(view==='loading')return<div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}><style>{CSS}</style><Sp/></div>
  if(view==='auth')return<><style>{CSS}</style><AdminAuth onLogin={handleLogin}/></>
  if(view==='denied')return<div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16}}><style>{CSS}</style><h2>⛔ Acceso denegado</h2><p style={{color:'var(--text3)'}}>Solo administradores.</p><Btn onClick={async()=>{await supabase.auth.signOut();setView('auth')}}>Cerrar sesión</Btn></div>

  return<div style={{display:'flex',minHeight:'100vh'}}>
    <style>{CSS}</style>
    <Sidebar active={page} onNav={setPage}/>
    <main style={{flex:1,marginLeft:'var(--sidebar-w)',padding:'24px 28px',maxWidth:'calc(100vw - var(--sidebar-w))'}}>
      {page==='dash'&&<Dashboard data={D}/>}
      {page==='cal'&&<CalendarView data={D} onCancel={cancelAppt} onApptAdded={loadAll}/>}
      {page==='finance'&&<FinanceView data={D} onAddExpense={addExpense} onDelExpense={delExpense}/>}
      {page==='barbers'&&<BarberStats data={D}/>}
      {page==='clients'&&<ClientsView data={D}/>}
      {page==='team'&&<TeamView data={D} onSave={saveSty} onDel={delSty}/>}
      {page==='services'&&<ServicesView data={D} onSave={saveSvc} onDel={delSvc}/>}
      {page==='blocks'&&<BlocksView data={D} onAdd={addBlock} onDel={rmBlock}/>}
    </main>
  </div>
}
