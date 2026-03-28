import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from './supabase'

// ═══ CSS ═══
const CSS = `
:root{--bg:#F0F2F5;--white:#FFF;--border:#E4E7EB;--border2:#D1D5DB;--text:#111827;--text2:#4B5563;--text3:#9CA3AF;--teal:#00B4B4;--teal2:#009E9E;--teal-bg:rgba(0,180,180,0.06);--teal-bg2:rgba(0,180,180,0.12);--green:#16A34A;--green-bg:rgba(22,163,74,0.08);--yellow:#EAB308;--yellow-bg:rgba(234,179,8,0.08);--orange:#F97316;--orange-bg:rgba(249,115,22,0.08);--red:#DC2626;--red-bg:rgba(220,38,38,0.06);--blue:#2563EB;--blue-bg:rgba(37,99,235,0.06);--purple:#7C3AED;--purple-bg:rgba(124,58,237,0.06);--shadow:0 1px 3px rgba(0,0,0,0.06);--shadow-md:0 4px 12px rgba(0,0,0,0.08);--shadow-lg:0 8px 24px rgba(0,0,0,0.1);--sidebar-w:220px}
*{margin:0;padding:0;box-sizing:border-box}body{background:var(--bg);color:var(--text);font-family:'DM Sans',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
input:focus,select:focus,textarea:focus{outline:none;border-color:var(--teal)!important;box-shadow:0 0 0 3px var(--teal-bg2)!important}
::-webkit-scrollbar{width:6px}::-webkit-scrollbar-thumb{background:var(--border2);border-radius:6px}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
.fade{animation:fadeIn .3s ease both}.fd1{animation-delay:50ms}.fd2{animation-delay:100ms}.fd3{animation-delay:150ms}.fd4{animation-delay:200ms}
textarea,select{font-family:inherit;resize:none}
select{-webkit-appearance:none;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:32px!important}
`

// ═══ HELPERS ═══
const MO=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MS=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const DL=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
const DF=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const toK=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const isT=d=>toK(d)===toK(new Date())
const fD=d=>`${d.getDate()} de ${MO[d.getMonth()]}`
const fDF=d=>`${DF[d.getDay()]}, ${fD(d)}`
const fS=d=>`${d.getDate()} ${MS[d.getMonth()]}`
const aM=(t,m)=>{let[h,mi]=t.split(':').map(Number);mi+=m;while(mi>=60){h++;mi-=60}return`${String(h).padStart(2,'0')}:${String(mi).padStart(2,'0')}`}
const gS=(o='09:00',c='20:00',step=30)=>{const s=[];let[h,m]=o.split(':').map(Number);const[ch,cm]=c.split(':').map(Number);while(h<ch||(h===ch&&m<cm)){s.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);m+=step;if(m>=60){h++;m-=60}}return s}
const gMD=(y,m)=>{const f=new Date(y,m,1),l=new Date(y,m+1,0);let s=f.getDay()-1;if(s<0)s=6;const d=[];for(let i=0;i<s;i++)d.push(null);for(let i=1;i<=l.getDate();i++)d.push(new Date(y,m,i));return d}
const getWeekDays=d=>{const mon=new Date(d);const day=mon.getDay();const diff=day===0?-6:1-day;mon.setDate(mon.getDate()+diff);const days=[];for(let i=0;i<7;i++){const x=new Date(mon);x.setDate(mon.getDate()+i);days.push(x)}return days}

const EXPENSE_CATS=[{id:'alquiler',label:'Alquiler',icon:'🏠'},{id:'productos',label:'Productos',icon:'🧴'},{id:'suministros',label:'Suministros',icon:'💡'},{id:'marketing',label:'Marketing',icon:'📣'},{id:'personal',label:'Personal',icon:'👤'},{id:'equipamiento',label:'Equipamiento',icon:'🪑'},{id:'general',label:'General',icon:'📦'},{id:'otro',label:'Otro',icon:'📝'}]

// Excel export
const exportCSV=(rows,filename)=>{
  const header=Object.keys(rows[0]).join(';')
  const csv=header+'\n'+rows.map(r=>Object.values(r).join(';')).join('\n')
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'})
  const url=URL.createObjectURL(blob)
  const a=document.createElement('a');a.href=url;a.download=filename+'.csv';a.click()
  URL.revokeObjectURL(url)
}

// ═══ ATOMS ═══
const Sp=()=><div style={{display:'flex',justifyContent:'center',padding:60}}><div style={{width:32,height:32,border:'3px solid var(--border)',borderTopColor:'var(--teal)',borderRadius:'50%',animation:'spin .6s linear infinite'}}/></div>

function Btn({children,onClick,disabled,full,variant='primary',small,style:sx,...r}){
  const S={primary:{bg:'var(--teal)',c:'#fff',b:'none'},secondary:{bg:'var(--white)',c:'var(--text2)',b:'1px solid var(--border2)'},danger:{bg:'var(--red-bg)',c:'var(--red)',b:'1px solid rgba(220,38,38,0.15)'},ghost:{bg:'transparent',c:'var(--text2)',b:'none'}}[variant]
  return<button onClick={disabled?undefined:onClick} style={{fontFamily:'inherit',fontSize:small?12:14,fontWeight:600,padding:small?'7px 12px':'10px 20px',width:full?'100%':'auto',color:S.c,background:disabled?'var(--border)':S.bg,border:S.b,borderRadius:8,cursor:disabled?'default':'pointer',transition:'all .15s',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6,...sx}}{...r}>{children}</button>
}
function Inp({label,required,...p}){return<div style={{marginBottom:12}}>{label&&<label style={{fontSize:13,fontWeight:500,color:'var(--text2)',marginBottom:6,display:'block'}}>{label}{required&&<span style={{color:'var(--red)'}}>*</span>}</label>}<input{...p}style={{width:'100%',padding:'10px 12px',fontSize:14,border:'1px solid var(--border2)',borderRadius:8,background:'var(--white)',color:'var(--text)',fontFamily:'inherit',...(p.style||{})}}/></div>}
function Sel({label,children,...p}){return<div style={{marginBottom:12}}>{label&&<label style={{fontSize:13,fontWeight:500,color:'var(--text2)',marginBottom:6,display:'block'}}>{label}</label>}<select{...p}style={{width:'100%',padding:'10px 12px',fontSize:14,border:'1px solid var(--border2)',borderRadius:8,background:'var(--white)',color:'var(--text)',cursor:'pointer'}}>{children}</select></div>}
function Modal({children,onClose}){return<div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:24}}><div onClick={e=>e.stopPropagation()} className="fade" style={{background:'var(--white)',borderRadius:16,padding:28,maxWidth:500,width:'100%',boxShadow:'var(--shadow-lg)',maxHeight:'85vh',overflowY:'auto'}}>{children}</div></div>}
function Stat({label,value,sub,icon,color='var(--teal)',bg='var(--teal-bg)'}){return<div className="fade" style={{background:'var(--white)',borderRadius:12,padding:'18px 20px',border:'1px solid var(--border)',boxShadow:'var(--shadow)',flex:1,minWidth:160}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}><div style={{fontSize:12,color:'var(--text3)',fontWeight:500}}>{label}</div><div style={{width:32,height:32,borderRadius:8,background:bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>{icon}</div></div><div style={{fontSize:26,fontWeight:800,lineHeight:1}}>{value}</div>{sub&&<div style={{fontSize:11,color:'var(--text3)',marginTop:6}}>{sub}</div>}</div>}
const Bg=({children,color='var(--teal)',bg='var(--teal-bg)'})=><span style={{fontSize:11,fontWeight:700,color,background:bg,padding:'3px 10px',borderRadius:20,whiteSpace:'nowrap'}}>{children}</span>

// ═══ SIDEBAR ═══
function Sidebar({active,onNav}){
  const items=[{id:'dash',label:'Dashboard',icon:'📊'},{id:'cal',label:'Calendario',icon:'📅'},{id:'finance',label:'Finanzas',icon:'💰'},{id:'barbers',label:'Barberos',icon:'📈'},{id:'clients',label:'Clientes',icon:'👥'},{id:'team',label:'Equipo',icon:'👤'},{id:'services',label:'Servicios',icon:'✂️'},{id:'blocks',label:'Bloqueos',icon:'🚫'}]
  return<div style={{width:'var(--sidebar-w)',background:'var(--white)',borderRight:'1px solid var(--border)',height:'100vh',position:'fixed',left:0,top:0,display:'flex',flexDirection:'column',zIndex:10}}>
    <div style={{padding:'20px 16px',borderBottom:'1px solid var(--border)'}}>
      <div style={{display:'flex',alignItems:'center',gap:10}}><div style={{width:34,height:34,borderRadius:9,background:'var(--teal)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,fontWeight:800,color:'#fff'}}>C</div><div><div style={{fontSize:14,fontWeight:800}}>Clocks Admin</div><div style={{fontSize:10,color:'var(--text3)'}}>Panel PRO</div></div></div>
    </div>
    <nav style={{flex:1,padding:'8px 8px',overflowY:'auto'}}>
      {items.map(it=><button key={it.id} onClick={()=>onNav(it.id)} style={{display:'flex',alignItems:'center',gap:9,width:'100%',padding:'9px 10px',borderRadius:7,border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:active===it.id?600:400,background:active===it.id?'var(--teal-bg)':'transparent',color:active===it.id?'var(--teal)':'var(--text2)',marginBottom:1,transition:'all .15s'}}><span style={{fontSize:15}}>{it.icon}</span>{it.label}</button>)}
    </nav>
    <div style={{padding:'12px 16px',borderTop:'1px solid var(--border)'}}>
      <button onClick={async()=>{await supabase.auth.signOut();window.location.reload()}} style={{fontSize:12,color:'var(--text3)',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>Cerrar sesión</button>
    </div>
  </div>
}

// ═══ AUTH ═══
function AdminAuth({onLogin}){
  const[em,setEm]=useState(''),[pw,setPw]=useState(''),[ld,setLd]=useState(false),[er,setEr]=useState('')
  const sub=async()=>{setEr('');setLd(true);try{const{data,error:e}=await supabase.auth.signInWithPassword({email:em.trim(),password:pw});if(e)throw e;if(data.user)onLogin(data.user)}catch(e){setEr(e.message?.includes('Invalid')?'Credenciales incorrectas':e.message||'Error')}setLd(false)}
  return<div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)'}}>
    <div className="fade" style={{background:'var(--white)',borderRadius:16,padding:40,maxWidth:400,width:'100%',boxShadow:'var(--shadow-lg)'}}>
      <div style={{textAlign:'center',marginBottom:32}}><div style={{width:56,height:56,borderRadius:14,background:'var(--teal)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:24,fontWeight:800,color:'#fff'}}>C</div><h1 style={{fontSize:22,fontWeight:800}}>Clocks Admin</h1><p style={{fontSize:14,color:'var(--text3)',marginTop:4}}>Acceso restringido</p></div>
      <Inp label="Email" type="email" value={em} onChange={e=>setEm(e.target.value)} placeholder="admin@clocks.com"/>
      <Inp label="Contraseña" type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••"/>
      {er&&<div style={{padding:'10px 14px',background:'var(--red-bg)',borderRadius:8,marginBottom:12}}><p style={{fontSize:13,color:'var(--red)',fontWeight:500}}>{er}</p></div>}
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
  const clients=new Set(mConf.map(a=>a.user_id)).size

  const bySty={}
  mConf.forEach(a=>{const st=stylists.find(s=>s.id===a.stylist_id);const sv=services.find(s=>s.id===a.service_id);if(!st)return;if(!bySty[st.name])bySty[st.name]={count:0,rev:0};bySty[st.name].count++;bySty[st.name].rev+=sv?Number(sv.price):0})

  const topSvc={}
  mConf.forEach(a=>{const sv=services.find(s=>s.id===a.service_id);if(!sv)return;if(!topSvc[sv.name])topSvc[sv.name]={c:0,r:0};topSvc[sv.name].c++;topSvc[sv.name].r+=Number(sv.price)})

  return<div>
    <div style={{marginBottom:24}}><h1 style={{fontSize:24,fontWeight:800}}>Dashboard</h1><p style={{fontSize:14,color:'var(--text3)'}}>{MO[new Date().getMonth()]} {new Date().getFullYear()}</p></div>
    <div style={{display:'flex',gap:14,marginBottom:20,flexWrap:'wrap'}}>
      <Stat label="Citas hoy" value={todayA.length} icon="📅" sub={`${mConf.length} este mes`}/>
      <Stat label="Ingresos" value={`${revenue.toFixed(0)}€`} icon="💰" color="var(--green)" bg="var(--green-bg)"/>
      <Stat label="Gastos" value={`${mExp.toFixed(0)}€`} icon="📉" color="var(--red)" bg="var(--red-bg)"/>
      <Stat label="Beneficio" value={`${profit.toFixed(0)}€`} icon={profit>=0?"📈":"📉"} color={profit>=0?"var(--green)":"var(--red)"} bg={profit>=0?"var(--green-bg)":"var(--red-bg)"}/>
      <Stat label="Clientes" value={clients} icon="👥" color="var(--blue)" bg="var(--blue-bg)"/>
      <Stat label="Cancelaciones" value={mCanc} icon="❌" color="var(--orange)" bg="var(--orange-bg)" sub={mConf.length>0?`${(mCanc/(mConf.length+mCanc)*100).toFixed(0)}%`:''}/>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
      <div className="fade fd1" style={{background:'var(--white)',borderRadius:12,border:'1px solid var(--border)',padding:20,boxShadow:'var(--shadow)'}}>
        <h3 style={{fontSize:15,fontWeight:700,marginBottom:14}}>Rendimiento por barbero</h3>
        {Object.entries(bySty).sort((a,b)=>b[1].rev-a[1].rev).map(([n,d])=>{const mx=Math.max(...Object.values(bySty).map(x=>x.rev),1);return<div key={n} style={{marginBottom:12}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:13}}><span style={{fontWeight:500}}>{n}</span><span style={{fontWeight:700,color:'var(--teal)'}}>{d.rev.toFixed(0)}€ · {d.count} citas</span></div><div style={{height:5,borderRadius:3,background:'var(--bg)'}}><div style={{height:5,borderRadius:3,background:'var(--teal)',width:`${(d.rev/mx)*100}%`}}/></div></div>})}
        {Object.keys(bySty).length===0&&<p style={{fontSize:13,color:'var(--text3)'}}>Sin datos</p>}
      </div>
      <div className="fade fd2" style={{background:'var(--white)',borderRadius:12,border:'1px solid var(--border)',padding:20,boxShadow:'var(--shadow)'}}>
        <h3 style={{fontSize:15,fontWeight:700,marginBottom:14}}>Servicios más solicitados</h3>
        {Object.entries(topSvc).sort((a,b)=>b[1].c-a[1].c).slice(0,6).map(([n,d],i)=><div key={n} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:i<5?'1px solid var(--border)':'none'}}><div style={{width:24,height:24,borderRadius:6,background:'var(--teal-bg)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:'var(--teal)'}}>{i+1}</div><div style={{flex:1,fontSize:13,fontWeight:500}}>{n}</div><span style={{fontSize:13,fontWeight:700}}>{d.c}</span><span style={{fontSize:12,color:'var(--text3)'}}>· {d.r.toFixed(0)}€</span></div>)}
      </div>
    </div>
    <div className="fade fd3" style={{background:'var(--white)',borderRadius:12,border:'1px solid var(--border)',padding:20,boxShadow:'var(--shadow)',marginTop:14}}>
      <h3 style={{fontSize:15,fontWeight:700,marginBottom:14}}>Próximas citas hoy</h3>
      {todayA.length===0?<p style={{fontSize:13,color:'var(--text3)'}}>No hay más citas hoy</p>:
      <div style={{display:'flex',flexDirection:'column',gap:6}}>{todayA.sort((a,b)=>a.appointment_time.localeCompare(b.appointment_time)).slice(0,8).map(a=>{const sv=services.find(s=>s.id===a.service_id);const st=stylists.find(s=>s.id===a.stylist_id);const pr=profiles[a.user_id];return<div key={a.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'var(--bg)',borderRadius:6}}><span style={{fontSize:13,fontWeight:700,color:'var(--teal)',minWidth:46}}>{a.appointment_time?.slice(0,5)}</span><span style={{fontSize:13,fontWeight:500}}>{pr?.full_name||'—'}</span><span style={{fontSize:12,color:'var(--text3)'}}>{sv?.name} · {st?.name}</span></div>})}</div>}
    </div>
  </div>
}

// ═══ CALENDAR (FIXED) ═══
function CalendarView({data,onCancel}){
  const{appts,profiles,stylists,services,blocks}=data
  const[week,setWeek]=useState(new Date())
  const[selAppt,setSelAppt]=useState(null)
  const[cancelM,setCancelM]=useState(null)
  const days=getWeekDays(week)
  const hours=gS('09:00','20:00')
  const stColors=['#00B4B4','#F97316','#8B5CF6','#EC4899','#14B8A6','#F59E0B']

  return<div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
      <div><h1 style={{fontSize:24,fontWeight:800}}>Calendario</h1><p style={{fontSize:14,color:'var(--text3)'}}>Vista semanal</p></div>
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        <Btn small variant="ghost" onClick={()=>setWeek(new Date())}>Hoy</Btn>
        <Btn small variant="secondary" onClick={()=>{const d=new Date(week);d.setDate(d.getDate()-7);setWeek(d)}}>←</Btn>
        <span style={{fontSize:14,fontWeight:600,minWidth:180,textAlign:'center'}}>{fS(days[0])} — {fS(days[6])}, {days[0].getFullYear()}</span>
        <Btn small variant="secondary" onClick={()=>{const d=new Date(week);d.setDate(d.getDate()+7);setWeek(d)}}>→</Btn>
      </div>
    </div>

    <div style={{background:'var(--white)',borderRadius:12,border:'1px solid var(--border)',boxShadow:'var(--shadow)',overflow:'hidden'}}>
      {/* FIXED: Use table layout for perfect alignment */}
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',tableLayout:'fixed'}}>
          <thead>
            <tr>
              <th style={{width:60,padding:'12px 8px',borderBottom:'1px solid var(--border)',borderRight:'1px solid var(--border)',background:'var(--bg)',fontSize:11,color:'var(--text3)'}}></th>
              {days.map(d=><th key={toK(d)} style={{padding:'12px 8px',textAlign:'center',borderBottom:'1px solid var(--border)',borderRight:'1px solid var(--border)',background:isT(d)?'var(--teal-bg)':'var(--bg)'}}>
                <div style={{fontSize:11,fontWeight:600,color:'var(--text3)',textTransform:'uppercase'}}>{DL[(d.getDay()+6)%7]}</div>
                <div style={{fontSize:18,fontWeight:isT(d)?800:600,color:isT(d)?'var(--teal)':'var(--text)',marginTop:2}}>{d.getDate()}</div>
              </th>)}
            </tr>
          </thead>
          <tbody style={{maxHeight:'calc(100vh - 260px)',display:'block',overflowY:'auto'}}>
            {/* Reset display for proper table layout */}
          </tbody>
        </table>
        {/* Scrollable body with matching grid */}
        <div>
        {/* Header */}
        <div style={{display:'flex',borderBottom:'1px solid var(--border)'}}>
          <div style={{width:60,flexShrink:0,padding:'12px 8px',borderRight:'1px solid var(--border)',background:'var(--bg)'}}/>
          {days.map(d=><div key={toK(d)} style={{flex:1,padding:'12px 8px',textAlign:'center',borderRight:'1px solid var(--border)',background:isT(d)?'var(--teal-bg)':'var(--bg)'}}>
            <div style={{fontSize:11,fontWeight:600,color:'var(--text3)',textTransform:'uppercase'}}>{DL[(d.getDay()+6)%7]}</div>
            <div style={{fontSize:18,fontWeight:isT(d)?800:600,color:isT(d)?'var(--teal)':'var(--text)',marginTop:2}}>{d.getDate()}</div>
          </div>)}
        </div>
        {/* Rows */}
        <div>
                })}
              </div>
            })}
          </div>)}
        </div>
      </div>
    </div>
    <div style={{display:'flex',gap:14,marginTop:10,flexWrap:'wrap'}}>
      {stylists.filter(s=>s.active).map((s,i)=><div key={s.id} style={{display:'flex',alignItems:'center',gap:5}}><div style={{width:10,height:10,borderRadius:3,background:stColors[i%stColors.length]}}/><span style={{fontSize:12,color:'var(--text2)'}}>{s.name}</span></div>)}
    </div>

    {selAppt&&<Modal onClose={()=>setSelAppt(null)}>
      {(()=>{const a=selAppt,sv=services.find(s=>s.id===a.service_id),st=stylists.find(s=>s.id===a.stylist_id),pr=profiles[a.user_id];return<>
        <h3 style={{fontSize:20,fontWeight:800,marginBottom:16}}>Detalle de cita</h3>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px 20px',marginBottom:20}}>
          {[['Cliente',pr?.full_name||'—'],['Teléfono',pr?.phone||'—'],['Servicio',sv?.name||'—'],['Profesional',st?.name||'—'],['Fecha',fDF(new Date(a.appointment_date))],['Hora',`${a.appointment_time?.slice(0,5)} — ${a.end_time?.slice(0,5)}`],['Precio',sv?`${Number(sv.price).toFixed(2)} €`:'—'],['Estado',a.status]].map(([k,v])=><div key={k}><div style={{fontSize:12,color:'var(--text3)',marginBottom:2}}>{k}</div><div style={{fontSize:14,fontWeight:500}}>{v}</div></div>)}
        </div>
        <div style={{display:'flex',gap:10}}><Btn variant="secondary" onClick={()=>setSelAppt(null)} style={{flex:1}}>Cerrar</Btn>{a.status==='confirmed'&&<Btn variant="danger" onClick={()=>{setCancelM(a);setSelAppt(null)}} style={{flex:1}}>Cancelar cita</Btn>}</div>
      </>})()}
    </Modal>}

    {cancelM&&<Modal onClose={()=>setCancelM(null)}>
      <h3 style={{fontSize:18,fontWeight:800,marginBottom:12}}>¿Cancelar esta cita?</h3>
      <div style={{padding:14,background:'var(--bg)',borderRadius:8,marginBottom:16}}>
        <div style={{fontSize:15,fontWeight:600}}>{profiles[cancelM.user_id]?.full_name||'—'}</div>
        <div style={{fontSize:13,color:'var(--text3)',marginTop:4}}>{services.find(s=>s.id===cancelM.service_id)?.name} · {cancelM.appointment_time?.slice(0,5)}h</div>
      </div>
      <div style={{display:'flex',gap:10}}><Btn variant="secondary" onClick={()=>setCancelM(null)} style={{flex:1}}>Volver</Btn><Btn variant="danger" onClick={()=>{onCancel(cancelM.id);setCancelM(null)}} style={{flex:1}}>Cancelar cita</Btn></div>
    </Modal>}
  </div>
}

// ═══ FINANCE ═══
function FinanceView({data,onAddExpense,onDelExpense}){
  const{appts,services,expenses}=data
  const[period,setPeriod]=useState('month')
  const[showAdd,setShowAdd]=useState(false)
  const[eAmt,setEAmt]=useState(''),[eDesc,setEDesc]=useState(''),[eCat,setECat]=useState('general'),[eDate,setEDate]=useState(toK(new Date()))
  const now=new Date(),thisMonth=toK(now).slice(0,7)

  const range=period==='week'?{s:toK(getWeekDays(now)[0]),e:toK(getWeekDays(now)[6]),l:`Semana ${fS(getWeekDays(now)[0])} — ${fS(getWeekDays(now)[6])}`}:{s:`${thisMonth}-01`,e:`${thisMonth}-31`,l:`${MO[now.getMonth()]} ${now.getFullYear()}`}

  const fAppts=appts.filter(a=>a.appointment_date>=range.s&&a.appointment_date<=range.e&&(a.status==='confirmed'||a.status==='completed'))
  const revenue=fAppts.reduce((s,a)=>{const sv=services.find(x=>x.id===a.service_id);return s+(sv?Number(sv.price):0)},0)
  const fExp=expenses.filter(e=>e.expense_date>=range.s&&e.expense_date<=range.e)
  const totalExp=fExp.reduce((s,e)=>s+Number(e.amount),0)
  const profit=revenue-totalExp

  // By day chart
  const byDay={}
  fAppts.forEach(a=>{if(!byDay[a.appointment_date])byDay[a.appointment_date]=0;const sv=services.find(x=>x.id===a.service_id);byDay[a.appointment_date]+=sv?Number(sv.price):0})
  const maxD=Math.max(...Object.values(byDay),1)

  // Expenses by category
  const byCat={}
  fExp.forEach(e=>{if(!byCat[e.category])byCat[e.category]=0;byCat[e.category]+=Number(e.amount)})

  const handleAdd=()=>{if(!eAmt||!eDesc.trim())return;onAddExpense({amount:parseFloat(eAmt),description:eDesc.trim(),category:eCat,expense_date:eDate});setShowAdd(false);setEAmt('');setEDesc('');setECat('general')}

  const handleExport=()=>{
    const rows=fAppts.map(a=>{const sv=services.find(x=>x.id===a.service_id);const st=data.stylists.find(x=>x.id===a.stylist_id);const pr=data.profiles[a.user_id];return{Fecha:a.appointment_date,Hora:a.appointment_time?.slice(0,5),Cliente:pr?.full_name||'—',Servicio:sv?.name||'—',Barbero:st?.name||'—',Precio:sv?Number(sv.price).toFixed(2):'0',Estado:a.status}})
    if(rows.length>0)exportCSV(rows,`ingresos_${range.s}_${range.e}`)
  }

  const handleExportExp=()=>{
    const rows=fExp.map(e=>({Fecha:e.expense_date,Descripcion:e.description,Categoria:e.category,Importe:Number(e.amount).toFixed(2)}))
    if(rows.length>0)exportCSV(rows,`gastos_${range.s}_${range.e}`)
  }

  return<div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
      <div><h1 style={{fontSize:24,fontWeight:800}}>Finanzas</h1><p style={{fontSize:14,color:'var(--text3)'}}>{range.l}</p></div>
      <div style={{display:'flex',gap:8}}>
        <div style={{display:'flex',background:'var(--white)',borderRadius:8,padding:3,border:'1px solid var(--border)'}}>
          {[['week','Semana'],['month','Mes']].map(([id,l])=><button key={id} onClick={()=>setPeriod(id)} style={{padding:'7px 14px',fontSize:12,fontWeight:600,fontFamily:'inherit',border:'none',borderRadius:6,cursor:'pointer',background:period===id?'var(--teal)':'transparent',color:period===id?'#fff':'var(--text3)'}}>{l}</button>)}
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
      {/* Revenue chart */}
      <div className="fade" style={{background:'var(--white)',borderRadius:12,border:'1px solid var(--border)',padding:20,boxShadow:'var(--shadow)'}}>
        <h3 style={{fontSize:15,fontWeight:700,marginBottom:14}}>Ingresos por día</h3>
        <div style={{display:'flex',alignItems:'flex-end',gap:3,height:140}}>
          {Object.entries(byDay).sort().map(([day,rev])=><div key={day} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
            <div style={{fontSize:9,fontWeight:600,color:'var(--teal)'}}>{rev.toFixed(0)}€</div>
            <div style={{width:'100%',maxWidth:36,background:'var(--teal)',borderRadius:3,height:`${Math.max((rev/maxD)*110,4)}px`}}/>
            <div style={{fontSize:9,color:'var(--text3)'}}>{new Date(day).getDate()}</div>
          </div>)}
          {Object.keys(byDay).length===0&&<p style={{fontSize:13,color:'var(--text3)',width:'100%',textAlign:'center',paddingTop:50}}>Sin datos</p>}
        </div>
      </div>

      {/* Expenses by category */}
      <div className="fade fd1" style={{background:'var(--white)',borderRadius:12,border:'1px solid var(--border)',padding:20,boxShadow:'var(--shadow)'}}>
        <h3 style={{fontSize:15,fontWeight:700,marginBottom:14}}>Gastos por categoría</h3>
        {Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([cat,amt])=>{
          const c=EXPENSE_CATS.find(x=>x.id===cat)
          return<div key={cat} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid var(--border)'}}>
            <span style={{fontSize:14}}>{c?.icon||'📦'}</span>
            <span style={{flex:1,fontSize:13,fontWeight:500}}>{c?.label||cat}</span>
            <span style={{fontSize:13,fontWeight:700,color:'var(--red)'}}>{amt.toFixed(0)}€</span>
          </div>
        })}
        {Object.keys(byCat).length===0&&<p style={{fontSize:13,color:'var(--text3)'}}>Sin gastos</p>}
      </div>
    </div>

    {/* Expenses list */}
    <div className="fade fd2" style={{background:'var(--white)',borderRadius:12,border:'1px solid var(--border)',boxShadow:'var(--shadow)',overflow:'hidden'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'16px 20px',borderBottom:'1px solid var(--border)'}}>
        <h3 style={{fontSize:15,fontWeight:700}}>Gastos</h3>
        <Btn small onClick={()=>setShowAdd(true)}>+ Añadir gasto</Btn>
      </div>
      {fExp.length===0?<div style={{padding:30,textAlign:'center',color:'var(--text3)',fontSize:13}}>Sin gastos en este período</div>:
      fExp.sort((a,b)=>b.expense_date.localeCompare(a.expense_date)).map((e,i)=>{
        const c=EXPENSE_CATS.find(x=>x.id===e.category)
        return<div key={e.id} style={{display:'flex',alignItems:'center',gap:14,padding:'12px 20px',borderBottom:i<fExp.length-1?'1px solid var(--border)':'none'}}>
          <div style={{width:36,height:36,borderRadius:8,background:'var(--red-bg)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>{c?.icon||'📦'}</div>
          <div style={{flex:1}}><div style={{fontSize:14,fontWeight:500}}>{e.description}</div><div style={{fontSize:12,color:'var(--text3)'}}>{c?.label||e.category} · {fS(new Date(e.expense_date))}</div></div>
          <div style={{fontSize:15,fontWeight:700,color:'var(--red)'}}>-{Number(e.amount).toFixed(2)}€</div>
          <Btn small variant="danger" onClick={()=>onDelExpense(e.id)}>✕</Btn>
        </div>
      })}
    </div>

    {showAdd&&<Modal onClose={()=>setShowAdd(false)}>
      <h3 style={{fontSize:18,fontWeight:800,marginBottom:18}}>Añadir gasto</h3>
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
  const{appts,stylists,services,blocks}=data
  const[selSty,setSelSty]=useState(stylists[0]?.id)
  const now=new Date(),thisMonth=toK(now).slice(0,7)
  const sty=stylists.find(s=>s.id===selSty)
  const mAppts=appts.filter(a=>a.appointment_date.slice(0,7)===thisMonth&&a.stylist_id===selSty)
  const conf=mAppts.filter(a=>a.status==='confirmed'||a.status==='completed')
  const canc=mAppts.filter(a=>a.status==='cancelled').length
  const rev=conf.reduce((s,a)=>{const sv=services.find(x=>x.id===a.service_id);return s+(sv?Number(sv.price):0)},0)
  const clients=new Set(conf.map(a=>a.user_id)).size

  // Work days in month (excluding Sundays)
  const daysInMonth=new Date(now.getFullYear(),now.getMonth()+1,0).getDate()
  let workDays=0
  for(let i=1;i<=daysInMonth;i++){const d=new Date(now.getFullYear(),now.getMonth(),i);if(d.getDay()!==0)workDays++}
  const totalSlots=workDays*gS('09:00','20:00').length // approximate
  const satDays=Array.from({length:daysInMonth},(_,i)=>new Date(now.getFullYear(),now.getMonth(),i+1)).filter(d=>d.getDay()===6).length
  const adjustedSlots=totalSlots-satDays*(gS('14:00','20:00').length) // saturdays close at 14:00

  // Occupied slots
  let occupiedSlots=0
  conf.forEach(a=>{const sv=services.find(x=>x.id===a.service_id);occupiedSlots+=sv?Math.ceil(sv.duration/30):1})
  const occupancyPct=adjustedSlots>0?(occupiedSlots/adjustedSlots*100).toFixed(0):0

  // Hours distribution
  const byHour={}
  gS('09:00','20:00').forEach(h=>{byHour[h]=0})
  conf.forEach(a=>{const h=a.appointment_time?.slice(0,5);if(h&&byHour[h]!==undefined)byHour[h]++})
  const maxHour=Math.max(...Object.values(byHour),1)

  // Service breakdown
  const bySvc={}
  conf.forEach(a=>{const sv=services.find(x=>x.id===a.service_id);if(!sv)return;if(!bySvc[sv.name])bySvc[sv.name]={c:0,r:0};bySvc[sv.name].c++;bySvc[sv.name].r+=Number(sv.price)})

  // Day distribution
  const byWeekday={Lun:0,Mar:0,Mié:0,Jue:0,Vie:0,Sáb:0}
  conf.forEach(a=>{const d=new Date(a.appointment_date);const wd=DL[(d.getDay()+6)%7];if(byWeekday[wd]!==undefined)byWeekday[wd]++})

  const handleExport=()=>{
    const rows=conf.map(a=>{const sv=services.find(x=>x.id===a.service_id);return{Fecha:a.appointment_date,Hora:a.appointment_time?.slice(0,5),Servicio:sv?.name||'—',Precio:sv?Number(sv.price).toFixed(2):'0'}})
    if(rows.length>0)exportCSV(rows,`barbero_${sty?.name}_${thisMonth}`)
  }

  return<div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
      <div><h1 style={{fontSize:24,fontWeight:800}}>Análisis por barbero</h1><p style={{fontSize:14,color:'var(--text3)'}}>{MO[now.getMonth()]} {now.getFullYear()}</p></div>
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        <select value={selSty} onChange={e=>setSelSty(Number(e.target.value))} style={{padding:'8px 32px 8px 12px',fontSize:13,border:'1px solid var(--border2)',borderRadius:8,background:'var(--white)',fontFamily:'inherit',cursor:'pointer'}}>
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
      {/* Hours distribution */}
      <div className="fade" style={{background:'var(--white)',borderRadius:12,border:'1px solid var(--border)',padding:20,boxShadow:'var(--shadow)'}}>
        <h3 style={{fontSize:15,fontWeight:700,marginBottom:4}}>Distribución por hora</h3>
        <p style={{fontSize:12,color:'var(--text3)',marginBottom:14}}>Las horas con menos citas son oportunidad de mejora</p>
        <div style={{display:'flex',flexDirection:'column',gap:3}}>
          {Object.entries(byHour).map(([h,c])=>{
            const pct=maxHour>0?(c/maxHour)*100:0
            const isEmpty=c===0
            return<div key={h} style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:11,fontWeight:500,color:'var(--text3)',minWidth:36}}>{h}</span>
              <div style={{flex:1,height:14,borderRadius:3,background:'var(--bg)'}}>
                <div style={{height:14,borderRadius:3,background:isEmpty?'transparent':pct>60?'var(--green)':pct>30?'var(--teal)':'var(--orange)',width:`${Math.max(pct,0)}%`,transition:'width .3s'}}/>
              </div>
              <span style={{fontSize:11,fontWeight:600,color:isEmpty?'var(--red)':'var(--text)',minWidth:20,textAlign:'right'}}>{c}</span>
              {isEmpty&&<span style={{fontSize:10,color:'var(--red)',fontWeight:500}}>vacía</span>}
            </div>
          })}
        </div>
      </div>

      {/* Day distribution + services */}
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <div className="fade fd1" style={{background:'var(--white)',borderRadius:12,border:'1px solid var(--border)',padding:20,boxShadow:'var(--shadow)'}}>
          <h3 style={{fontSize:15,fontWeight:700,marginBottom:14}}>Citas por día de la semana</h3>
          <div style={{display:'flex',gap:6,alignItems:'flex-end',height:80}}>
            {Object.entries(byWeekday).map(([d,c])=>{const mx=Math.max(...Object.values(byWeekday),1);return<div key={d} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
              <span style={{fontSize:10,fontWeight:600,color:'var(--teal)'}}>{c}</span>
              <div style={{width:'100%',background:'var(--teal)',borderRadius:3,height:`${Math.max((c/mx)*60,3)}px`}}/>
              <span style={{fontSize:10,color:'var(--text3)'}}>{d}</span>
            </div>})}
          </div>
        </div>
        <div className="fade fd2" style={{background:'var(--white)',borderRadius:12,border:'1px solid var(--border)',padding:20,boxShadow:'var(--shadow)'}}>
          <h3 style={{fontSize:15,fontWeight:700,marginBottom:14}}>Servicios realizados</h3>
          {Object.entries(bySvc).sort((a,b)=>b[1].c-a[1].c).map(([n,d])=><div key={n} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--border)',fontSize:13}}>
            <span style={{fontWeight:500}}>{n}</span><span style={{fontWeight:700,color:'var(--teal)'}}>{d.c} · {d.r.toFixed(0)}€</span>
          </div>)}
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

  const handleExport=()=>{
    const rows=clients.map(c=>({Nombre:c.p?.full_name||'—',Telefono:c.p?.phone||'—',Visitas:c.v,Ingresos:c.r.toFixed(2),Cancelaciones:c.c,Ultima_visita:c.last||'—'}))
    if(rows.length>0)exportCSV(rows,'clientes')
  }

  return<div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
      <div><h1 style={{fontSize:24,fontWeight:800}}>Clientes</h1><p style={{fontSize:14,color:'var(--text3)'}}>{clients.length} registrados</p></div>
      <div style={{display:'flex',gap:8}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar..." style={{padding:'8px 14px',fontSize:13,border:'1px solid var(--border2)',borderRadius:8,background:'var(--white)',fontFamily:'inherit',width:220}}/>
        <Btn small variant="secondary" onClick={handleExport}>📥 Exportar CSV</Btn>
      </div>
    </div>
    <div style={{background:'var(--white)',borderRadius:12,border:'1px solid var(--border)',boxShadow:'var(--shadow)',overflow:'hidden'}}>
      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 80px 100px 80px 100px',padding:'10px 20px',borderBottom:'1px solid var(--border)',background:'var(--bg)'}}>
        {['Cliente','Teléfono','Visitas','Ingresos','Canc.','Última'].map(h=><div key={h} style={{fontSize:11,fontWeight:600,color:'var(--text3)',textTransform:'uppercase'}}>{h}</div>)}
      </div>
      {clients.length===0?<div style={{padding:30,textAlign:'center',color:'var(--text3)'}}>No hay clientes</div>:
      clients.map(c=><div key={c.id} style={{display:'grid',gridTemplateColumns:'2fr 1fr 80px 100px 80px 100px',padding:'12px 20px',borderBottom:'1px solid var(--border)',alignItems:'center'}}>
        <div style={{fontSize:14,fontWeight:500}}>{c.p?.full_name}</div>
        <div style={{fontSize:13,color:'var(--text2)'}}>{c.p?.phone||'—'}</div>
        <div style={{fontSize:14,fontWeight:600}}>{c.v}</div>
        <div style={{fontSize:14,fontWeight:700,color:'var(--teal)'}}>{c.r.toFixed(0)}€</div>
        <div style={{fontSize:13,color:c.c>0?'var(--red)':'var(--text3)'}}>{c.c}</div>
        <div style={{fontSize:12,color:'var(--text3)'}}>{c.last?fS(new Date(c.last)):'—'}</div>
      </div>)}
    </div>
  </div>
}

// ═══ TEAM CRUD ═══
function TeamView({data,onSave,onDel}){
  const[edit,setEdit]=useState(null),[del,setDel]=useState(null)
  return<div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}><h1 style={{fontSize:24,fontWeight:800}}>Equipo</h1><Btn onClick={()=>setEdit({name:'',username:'',role_title:'Barbero',photo_url:'',active:true})}>+ Añadir</Btn></div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:14}}>
      {data.stylists.map(s=><div key={s.id} className="fade" style={{background:'var(--white)',borderRadius:12,border:'1px solid var(--border)',padding:18,boxShadow:'var(--shadow)',opacity:s.active?1:0.5}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
          <div style={{width:48,height:48,borderRadius:12,background:'var(--teal-bg)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:700,color:'var(--teal)',overflow:'hidden',flexShrink:0}}>{s.photo_url?<img src={s.photo_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:s.name[0]}</div>
          <div><div style={{fontSize:15,fontWeight:600}}>{s.name}</div><div style={{fontSize:12,color:'var(--text3)'}}>{s.role_title} · {s.username||'—'}</div></div>
        </div>
        <div style={{display:'flex',gap:6}}><Btn small variant="secondary" onClick={()=>setEdit(s)} style={{flex:1}}>Editar</Btn><Btn small variant="danger" onClick={()=>setDel(s)}>✕</Btn></div>
      </div>)}
    </div>
    {edit&&<StyModal d={edit} onSave={x=>{onSave(x);setEdit(null)}} onClose={()=>setEdit(null)}/>}
    {del&&<Modal onClose={()=>setDel(null)}><h3 style={{fontSize:18,fontWeight:800,marginBottom:12}}>¿Eliminar a {del.name}?</h3><div style={{display:'flex',gap:10,marginTop:16}}><Btn variant="secondary" onClick={()=>setDel(null)} style={{flex:1}}>Cancelar</Btn><Btn variant="danger" onClick={()=>{onDel(del.id);setDel(null)}} style={{flex:1}}>Eliminar</Btn></div></Modal>}
  </div>
}
function StyModal({d,onSave,onClose}){const[n,sN]=useState(d.name||''),[u,sU]=useState(d.username||''),[r,sR]=useState(d.role_title||'Barbero'),[p,sP]=useState(d.photo_url||''),[a,sA]=useState(d.active!==false);return<Modal onClose={onClose}><h3 style={{fontSize:18,fontWeight:800,marginBottom:16}}>{d.id?'Editar':'Nuevo'} profesional</h3><Inp label="Nombre" required value={n} onChange={e=>sN(e.target.value)}/><Inp label="Username" value={u} onChange={e=>sU(e.target.value)} placeholder="@user"/><Inp label="Rol" value={r} onChange={e=>sR(e.target.value)}/><Inp label="URL foto" value={p} onChange={e=>sP(e.target.value)} placeholder="/images/team-nombre.jpg"/>{p&&<div style={{marginBottom:10,width:50,height:50,borderRadius:10,overflow:'hidden',background:'var(--bg)'}}><img src={p} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>e.target.style.display='none'}/></div>}<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}><span style={{fontSize:13}}>Activo</span><button onClick={()=>sA(!a)} style={{width:40,height:22,borderRadius:11,border:'none',cursor:'pointer',background:a?'var(--teal)':'var(--border)',position:'relative',transition:'all .3s'}}><div style={{width:18,height:18,borderRadius:9,background:'#fff',position:'absolute',top:2,left:a?20:2,transition:'all .3s',boxShadow:'0 1px 2px rgba(0,0,0,0.15)'}}/></button></div><div style={{display:'flex',gap:8}}><Btn variant="secondary" onClick={onClose} style={{flex:1}}>Cancelar</Btn><Btn onClick={()=>onSave({...d,name:n,username:u,role_title:r,photo_url:p,active:a})} disabled={!n.trim()} style={{flex:1}}>Guardar</Btn></div></Modal>}

// ═══ SERVICES CRUD ═══
function ServicesView({data,onSave,onDel}){
  const[edit,setEdit]=useState(null),[del,setDel]=useState(null)
  return<div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}><h1 style={{fontSize:24,fontWeight:800}}>Servicios</h1><Btn onClick={()=>setEdit({name:'',description:'',duration:30,price:0,category:'popular'})}>+ Añadir</Btn></div>
    <div style={{background:'var(--white)',borderRadius:12,border:'1px solid var(--border)',boxShadow:'var(--shadow)',overflow:'hidden'}}>
      {data.services.map((s,i)=><div key={s.id} className="fade" style={{display:'flex',alignItems:'center',gap:14,padding:'14px 20px',borderBottom:i<data.services.length-1?'1px solid var(--border)':'none',opacity:s.active?1:0.5}}>
        <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600}}>{s.name}</div><div style={{fontSize:12,color:'var(--text3)',marginTop:2}}>{s.description}</div></div>
        <div style={{fontSize:12,color:'var(--text3)'}}>{s.duration}min</div>
        <div style={{fontSize:15,fontWeight:800,color:'var(--teal)',minWidth:55,textAlign:'right'}}>{Number(s.price).toFixed(2)}€</div>
        <div style={{display:'flex',gap:4}}><Btn small variant="secondary" onClick={()=>setEdit(s)}>Editar</Btn><Btn small variant="danger" onClick={()=>setDel(s)}>✕</Btn></div>
      </div>)}
    </div>
    {edit&&<SvcModal d={edit} onSave={x=>{onSave(x);setEdit(null)}} onClose={()=>setEdit(null)}/>}
    {del&&<Modal onClose={()=>setDel(null)}><h3 style={{fontSize:18,fontWeight:800,marginBottom:12}}>¿Eliminar {del.name}?</h3><div style={{display:'flex',gap:10,marginTop:16}}><Btn variant="secondary" onClick={()=>setDel(null)} style={{flex:1}}>Cancelar</Btn><Btn variant="danger" onClick={()=>{onDel(del.id);setDel(null)}} style={{flex:1}}>Eliminar</Btn></div></Modal>}
  </div>
}
function SvcModal({d,onSave,onClose}){const[n,sN]=useState(d.name||''),[ds,sDs]=useState(d.description||''),[du,sDu]=useState(d.duration||30),[p,sP]=useState(d.price||0),[c,sC]=useState(d.category||'popular');return<Modal onClose={onClose}><h3 style={{fontSize:18,fontWeight:800,marginBottom:16}}>{d.id?'Editar':'Nuevo'} servicio</h3><Inp label="Nombre" required value={n} onChange={e=>sN(e.target.value)} placeholder="CORTE CLOCKS"/><Inp label="Descripción" value={ds} onChange={e=>sDs(e.target.value)}/><div style={{display:'flex',gap:8}}><div style={{flex:1}}><Inp label="Duración (min)" type="number" value={du} onChange={e=>sDu(parseInt(e.target.value)||0)}/></div><div style={{flex:1}}><Inp label="Precio (€)" type="number" step="0.01" value={p} onChange={e=>sP(parseFloat(e.target.value)||0)}/></div></div><Sel label="Categoría" value={c} onChange={e=>sC(e.target.value)}><option value="popular">Popular</option><option value="other">Otro</option></Sel><div style={{display:'flex',gap:8}}><Btn variant="secondary" onClick={onClose} style={{flex:1}}>Cancelar</Btn><Btn onClick={()=>onSave({...d,name:n,description:ds,duration:du,price:p,category:c})} disabled={!n.trim()} style={{flex:1}}>Guardar</Btn></div></Modal>}

// ═══ BLOCKS ═══
function BlocksView({data,onAdd,onDel}){
  const[show,setShow]=useState(false),[bS,setBS]=useState(data.stylists[0]?.id),[bD,setBD]=useState(toK(new Date())),[bSt,setBSt]=useState('09:00'),[bE,setBE]=useState('10:00'),[bR,setBR]=useState('')
  const upcoming=data.blocks.filter(b=>b.blocked_date>=toK(new Date())).sort((a,b)=>a.blocked_date.localeCompare(b.blocked_date))
  return<div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}><h1 style={{fontSize:24,fontWeight:800}}>Bloqueos</h1><Btn onClick={()=>setShow(true)}>+ Bloquear horario</Btn></div>
    <div style={{background:'var(--white)',borderRadius:12,border:'1px solid var(--border)',boxShadow:'var(--shadow)',overflow:'hidden'}}>
      {upcoming.length===0?<div style={{padding:30,textAlign:'center',color:'var(--text3)'}}>No hay bloqueos activos</div>:
      upcoming.map((b,i)=><div key={b.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 20px',borderBottom:i<upcoming.length-1?'1px solid var(--border)':'none'}}>
        <div style={{width:36,height:36,borderRadius:8,background:'var(--red-bg)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>🚫</div>
        <div style={{flex:1}}><div style={{fontSize:14,fontWeight:500}}>{b.reason||'Bloqueado'}</div><div style={{fontSize:12,color:'var(--text3)'}}>{data.stylists.find(s=>s.id===b.stylist_id)?.name} · {fS(new Date(b.blocked_date))} · {b.start_time?.slice(0,5)}—{b.end_time?.slice(0,5)}</div></div>
        <Btn small variant="danger" onClick={()=>onDel(b.id)}>Quitar</Btn>
      </div>)}
    </div>
    {show&&<Modal onClose={()=>setShow(false)}>
      <h3 style={{fontSize:18,fontWeight:800,marginBottom:16}}>Bloquear horario</h3>
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
      {page==='cal'&&<CalendarView data={D} onCancel={cancelAppt}/>}
      {page==='finance'&&<FinanceView data={D} onAddExpense={addExpense} onDelExpense={delExpense}/>}
      {page==='barbers'&&<BarberStats data={D}/>}
      {page==='clients'&&<ClientsView data={D}/>}
      {page==='team'&&<TeamView data={D} onSave={saveSty} onDel={delSty}/>}
      {page==='services'&&<ServicesView data={D} onSave={saveSvc} onDel={delSvc}/>}
      {page==='blocks'&&<BlocksView data={D} onAdd={addBlock} onDel={rmBlock}/>}
    </main>
  </div>
}
