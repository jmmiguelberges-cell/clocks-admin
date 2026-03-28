import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

// ═══ STYLES ═══
const CSS = `
:root{--bg:#F0F2F5;--white:#FFF;--border:#E4E7EB;--border2:#D1D5DB;--text:#111827;--text2:#4B5563;--text3:#9CA3AF;--teal:#00B4B4;--teal2:#009E9E;--teal-bg:rgba(0,180,180,0.06);--teal-bg2:rgba(0,180,180,0.12);--green:#16A34A;--green-bg:rgba(22,163,74,0.08);--yellow:#EAB308;--yellow-bg:rgba(234,179,8,0.08);--orange:#F97316;--orange-bg:rgba(249,115,22,0.08);--red:#DC2626;--red-bg:rgba(220,38,38,0.06);--blue:#2563EB;--blue-bg:rgba(37,99,235,0.06);--shadow:0 1px 3px rgba(0,0,0,0.06);--shadow-md:0 4px 12px rgba(0,0,0,0.08);--shadow-lg:0 8px 24px rgba(0,0,0,0.1);--sidebar-w:240px}
*{margin:0;padding:0;box-sizing:border-box}body{background:var(--bg);color:var(--text);font-family:'DM Sans',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
input:focus,select:focus,textarea:focus{outline:none;border-color:var(--teal)!important;box-shadow:0 0 0 3px var(--teal-bg2)!important}
::-webkit-scrollbar{width:6px}::-webkit-scrollbar-thumb{background:var(--border2);border-radius:6px}::-webkit-scrollbar-thumb:hover{background:var(--text3)}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.fade{animation:fadeIn .3s ease both}
.fade-d1{animation-delay:50ms}.fade-d2{animation-delay:100ms}.fade-d3{animation-delay:150ms}.fade-d4{animation-delay:200ms}
textarea,select{font-family:inherit}
select{-webkit-appearance:none;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:32px!important}
`

// ═══ HELPERS ═══
const MO = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const DL = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
const DF = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const toK = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const isT = d => toK(d) === toK(new Date())
const fD = d => `${d.getDate()} de ${MO[d.getMonth()]}`
const fDF = d => `${DF[d.getDay()]}, ${fD(d)}`
const fS = d => `${d.getDate()} ${MS[d.getMonth()]}`
const aM = (t,m) => { let[h,mi]=t.split(':').map(Number);mi+=m;while(mi>=60){h++;mi-=60}return`${String(h).padStart(2,'0')}:${String(mi).padStart(2,'0')}` }
const gS = (o='09:00',c='20:00',step=30)=>{const s=[];let[h,m]=o.split(':').map(Number);const[ch,cm]=c.split(':').map(Number);while(h<ch||(h===ch&&m<cm)){s.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);m+=step;if(m>=60){h++;m-=60}}return s}
const gMD = (y,m)=>{const f=new Date(y,m,1),l=new Date(y,m+1,0);let s=f.getDay()-1;if(s<0)s=6;const d=[];for(let i=0;i<s;i++)d.push(null);for(let i=1;i<=l.getDate();i++)d.push(new Date(y,m,i));return d}
const getWeekDays = (d) => { const mon = new Date(d); const day = mon.getDay(); const diff = day === 0 ? -6 : 1 - day; mon.setDate(mon.getDate() + diff); const days = []; for(let i=0;i<7;i++){const x=new Date(mon);x.setDate(mon.getDate()+i);days.push(x)}return days }
const HOURS = gS('09:00','20:30')

// ═══ ATOMS ═══
const Sp = () => <div style={{display:'flex',justifyContent:'center',padding:60}}><div style={{width:32,height:32,border:'3px solid var(--border)',borderTopColor:'var(--teal)',borderRadius:'50%',animation:'spin .6s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>

function Btn({children,onClick,disabled,full,variant='primary',small,style:sx,...r}){
  const styles = {
    primary:{bg:'var(--teal)',color:'#fff',border:'none',hbg:'var(--teal2)'},
    secondary:{bg:'var(--white)',color:'var(--text2)',border:'1px solid var(--border2)',hbg:'var(--bg)'},
    danger:{bg:'var(--red-bg)',color:'var(--red)',border:'1px solid rgba(220,38,38,0.15)',hbg:'rgba(220,38,38,0.1)'},
    ghost:{bg:'transparent',color:'var(--text2)',border:'none',hbg:'var(--bg)'},
  }[variant]
  return<button onClick={disabled?undefined:onClick} style={{fontFamily:'inherit',fontSize:small?13:14,fontWeight:600,padding:small?'8px 14px':'10px 20px',width:full?'100%':'auto',color:styles.color,background:disabled?'var(--border)':styles.bg,border:styles.border,borderRadius:8,cursor:disabled?'default':'pointer',transition:'all .15s',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6,...sx}} {...r}>{children}</button>
}

function Input({label,required,...p}){return<div style={{marginBottom:12}}>{label&&<label style={{fontSize:13,fontWeight:500,color:'var(--text2)',marginBottom:6,display:'block'}}>{label}{required&&<span style={{color:'var(--red)'}}>*</span>}</label>}<input{...p}style={{width:'100%',padding:'10px 12px',fontSize:14,border:'1px solid var(--border2)',borderRadius:8,background:'var(--white)',color:'var(--text)',fontFamily:'inherit',...(p.style||{})}}/></div>}

function Select({label,children,...p}){return<div style={{marginBottom:12}}>{label&&<label style={{fontSize:13,fontWeight:500,color:'var(--text2)',marginBottom:6,display:'block'}}>{label}</label>}<select{...p}style={{width:'100%',padding:'10px 12px',fontSize:14,border:'1px solid var(--border2)',borderRadius:8,background:'var(--white)',color:'var(--text)',cursor:'pointer'}}>{children}</select></div>}

function Modal({children,onClose}){return<div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:24}}><div onClick={e=>e.stopPropagation()} className="fade" style={{background:'var(--white)',borderRadius:16,padding:28,maxWidth:480,width:'100%',boxShadow:'var(--shadow-lg)',maxHeight:'85vh',overflowY:'auto'}}>{children}</div></div>}

function StatCard({label,value,sub,icon,color='var(--teal)',bg='var(--teal-bg)'}){return<div className="fade" style={{background:'var(--white)',borderRadius:12,padding:'20px 22px',border:'1px solid var(--border)',boxShadow:'var(--shadow)',flex:1,minWidth:180}}>
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
    <div style={{fontSize:13,color:'var(--text3)',fontWeight:500}}>{label}</div>
    <div style={{width:36,height:36,borderRadius:10,background:bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>{icon}</div>
  </div>
  <div style={{fontSize:28,fontWeight:800,color:'var(--text)',lineHeight:1}}>{value}</div>
  {sub && <div style={{fontSize:12,color:'var(--text3)',marginTop:6}}>{sub}</div>}
</div>}

// ═══ SIDEBAR ═══
function Sidebar({active,onNav,salon}){
  const items = [
    {id:'dash',label:'Dashboard',icon:'📊'},
    {id:'cal',label:'Calendario',icon:'📅'},
    {id:'clients',label:'Clientes',icon:'👥'},
    {id:'reports',label:'Informes',icon:'📈'},
    {id:'team',label:'Equipo',icon:'👤'},
    {id:'services',label:'Servicios',icon:'✂️'},
    {id:'blocks',label:'Bloqueos',icon:'🚫'},
  ]
  return<div style={{width:'var(--sidebar-w)',background:'var(--white)',borderRight:'1px solid var(--border)',height:'100vh',position:'fixed',left:0,top:0,display:'flex',flexDirection:'column',zIndex:10}}>
    <div style={{padding:'24px 20px 20px',borderBottom:'1px solid var(--border)'}}>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <div style={{width:36,height:36,borderRadius:10,background:'var(--teal)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:800,color:'#fff'}}>C</div>
        <div><div style={{fontSize:15,fontWeight:800}}>Clocks Admin</div><div style={{fontSize:11,color:'var(--text3)'}}>Panel de gestión</div></div>
      </div>
    </div>
    <nav style={{flex:1,padding:'12px 10px',overflowY:'auto'}}>
      {items.map(it=><button key={it.id} onClick={()=>onNav(it.id)} style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'10px 12px',borderRadius:8,border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:14,fontWeight:active===it.id?600:400,background:active===it.id?'var(--teal-bg)':'transparent',color:active===it.id?'var(--teal)':'var(--text2)',marginBottom:2,transition:'all .15s'}}>
        <span style={{fontSize:16}}>{it.icon}</span>{it.label}
      </button>)}
    </nav>
    <div style={{padding:'16px 20px',borderTop:'1px solid var(--border)',fontSize:12,color:'var(--text3)'}}>Clocks Estudio Barbería</div>
  </div>
}

// ═══ AUTH ═══
function AdminAuth({onLogin}){
  const[em,setEm]=useState(''),[pw,setPw]=useState(''),[ld,setLd]=useState(false),[er,setEr]=useState('')
  const sub=async()=>{setEr('');setLd(true);try{const{data,error:e}=await supabase.auth.signInWithPassword({email:em.trim(),password:pw});if(e)throw e;if(data.user)onLogin(data.user)}catch(e){setEr(e.message?.includes('Invalid')?'Credenciales incorrectas':e.message||'Error')}setLd(false)}
  return<div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)'}}>
    <div className="fade" style={{background:'var(--white)',borderRadius:16,padding:40,maxWidth:400,width:'100%',boxShadow:'var(--shadow-lg)'}}>
      <div style={{textAlign:'center',marginBottom:32}}>
        <div style={{width:56,height:56,borderRadius:14,background:'var(--teal)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:24,fontWeight:800,color:'#fff'}}>C</div>
        <h1 style={{fontSize:22,fontWeight:800}}>Clocks Admin</h1>
        <p style={{fontSize:14,color:'var(--text3)',marginTop:4}}>Acceso restringido</p>
      </div>
      <Input label="Email" type="email" value={em} onChange={e=>setEm(e.target.value)} placeholder="admin@clocks.com"/>
      <Input label="Contraseña" type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••"/>
      {er&&<div style={{padding:'10px 14px',background:'var(--red-bg)',borderRadius:8,marginBottom:12}}><p style={{fontSize:13,color:'var(--red)',fontWeight:500}}>{er}</p></div>}
      <Btn full onClick={sub} disabled={ld}>{ld?'Accediendo...':'Entrar'}</Btn>
    </div>
  </div>
}

// ═══ DASHBOARD ═══
function Dashboard({appts,profiles,stylists,services}){
  const today = toK(new Date())
  const todayAppts = appts.filter(a=>a.appointment_date===today&&a.status==='confirmed')
  const thisMonth = appts.filter(a=>a.appointment_date.slice(0,7)===today.slice(0,7))
  const completedMonth = thisMonth.filter(a=>a.status==='confirmed'||a.status==='completed')
  const revenue = completedMonth.reduce((s,a)=>{const sv=services.find(x=>x.id===a.service_id);return s+(sv?Number(sv.price):0)},0)
  const cancelledMonth = thisMonth.filter(a=>a.status==='cancelled').length
  const uniqueClients = new Set(completedMonth.map(a=>a.user_id)).size

  // Revenue by stylist
  const byStylist = {}
  completedMonth.forEach(a=>{
    const st = stylists.find(s=>s.id===a.stylist_id)
    const sv = services.find(s=>s.id===a.service_id)
    if(!st) return
    if(!byStylist[st.name]) byStylist[st.name]={count:0,revenue:0}
    byStylist[st.name].count++
    byStylist[st.name].revenue += sv ? Number(sv.price) : 0
  })

  // Top services
  const bySvc = {}
  completedMonth.forEach(a=>{
    const sv = services.find(s=>s.id===a.service_id)
    if(!sv) return
    if(!bySvc[sv.name]) bySvc[sv.name]={count:0,revenue:0}
    bySvc[sv.name].count++
    bySvc[sv.name].revenue += Number(sv.price)
  })
  const topSvcs = Object.entries(bySvc).sort((a,b)=>b[1].count-a[1].count).slice(0,5)

  // Upcoming today
  const upcoming = todayAppts.sort((a,b)=>a.appointment_time.localeCompare(b.appointment_time)).slice(0,5)

  return<div>
    <div style={{marginBottom:24}}><h1 style={{fontSize:24,fontWeight:800}}>Dashboard</h1><p style={{fontSize:14,color:'var(--text3)'}}>Resumen de {MO[new Date().getMonth()]} {new Date().getFullYear()}</p></div>

    {/* Stats */}
    <div style={{display:'flex',gap:16,marginBottom:24,flexWrap:'wrap'}}>
      <StatCard label="Citas hoy" value={todayAppts.length} icon="📅" sub={`${completedMonth.length} este mes`}/>
      <StatCard label="Ingresos del mes" value={`${revenue.toFixed(0)}€`} icon="💰" color="var(--green)" bg="var(--green-bg)"/>
      <StatCard label="Clientes únicos" value={uniqueClients} icon="👥" color="var(--blue)" bg="var(--blue-bg)"/>
      <StatCard label="Cancelaciones" value={cancelledMonth} icon="❌" color="var(--red)" bg="var(--red-bg)" sub={completedMonth.length>0?`${(cancelledMonth/(completedMonth.length+cancelledMonth)*100).toFixed(0)}% del total`:''}/>
    </div>

    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
      {/* Revenue by stylist */}
      <div className="fade fade-d1" style={{background:'var(--white)',borderRadius:12,border:'1px solid var(--border)',padding:22,boxShadow:'var(--shadow)'}}>
        <h3 style={{fontSize:16,fontWeight:700,marginBottom:16}}>Rendimiento por profesional</h3>
        {Object.entries(byStylist).map(([name,data])=>{
          const maxRev = Math.max(...Object.values(byStylist).map(d=>d.revenue),1)
          return<div key={name} style={{marginBottom:14}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
              <span style={{fontSize:14,fontWeight:500}}>{name}</span>
              <span style={{fontSize:14,fontWeight:700,color:'var(--teal)'}}>{data.revenue.toFixed(0)}€ · {data.count} citas</span>
            </div>
            <div style={{height:6,borderRadius:3,background:'var(--bg)'}}>
              <div style={{height:6,borderRadius:3,background:'var(--teal)',width:`${(data.revenue/maxRev)*100}%`,transition:'width .5s'}}/>
            </div>
          </div>
        })}
        {Object.keys(byStylist).length===0&&<p style={{fontSize:13,color:'var(--text3)'}}>Sin datos este mes</p>}
      </div>

      {/* Top services */}
      <div className="fade fade-d2" style={{background:'var(--white)',borderRadius:12,border:'1px solid var(--border)',padding:22,boxShadow:'var(--shadow)'}}>
        <h3 style={{fontSize:16,fontWeight:700,marginBottom:16}}>Servicios más solicitados</h3>
        {topSvcs.map(([name,data],i)=>
          <div key={name} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:i<topSvcs.length-1?'1px solid var(--border)':'none'}}>
            <div style={{width:28,height:28,borderRadius:8,background:'var(--teal-bg)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:'var(--teal)'}}>{i+1}</div>
            <div style={{flex:1}}><div style={{fontSize:14,fontWeight:500}}>{name}</div></div>
            <div style={{textAlign:'right'}}><span style={{fontSize:14,fontWeight:700}}>{data.count}</span><span style={{fontSize:12,color:'var(--text3)',marginLeft:4}}>· {data.revenue.toFixed(0)}€</span></div>
          </div>
        )}
        {topSvcs.length===0&&<p style={{fontSize:13,color:'var(--text3)'}}>Sin datos este mes</p>}
      </div>
    </div>

    {/* Upcoming today */}
    <div className="fade fade-d3" style={{background:'var(--white)',borderRadius:12,border:'1px solid var(--border)',padding:22,boxShadow:'var(--shadow)',marginTop:16}}>
      <h3 style={{fontSize:16,fontWeight:700,marginBottom:16}}>Próximas citas de hoy</h3>
      {upcoming.length===0?<p style={{fontSize:13,color:'var(--text3)'}}>No hay más citas hoy</p>:
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {upcoming.map(a=>{
          const sv=services.find(s=>s.id===a.service_id)
          const st=stylists.find(s=>s.id===a.stylist_id)
          const pr=profiles[a.user_id]
          return<div key={a.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',background:'var(--bg)',borderRadius:8}}>
            <span style={{fontSize:14,fontWeight:700,color:'var(--teal)',minWidth:50}}>{a.appointment_time?.slice(0,5)}</span>
            <div style={{flex:1}}><span style={{fontSize:14,fontWeight:500}}>{pr?.full_name||'—'}</span><span style={{fontSize:13,color:'var(--text3)',marginLeft:8}}>{sv?.name} · {st?.name}</span></div>
          </div>
        })}
      </div>}
    </div>
  </div>
}

// ═══ WEEKLY CALENDAR ═══
function CalendarView({appts,profiles,stylists,services,blocks,onCancel,onBlock}){
  const[week,setWeek]=useState(new Date())
  const[selAppt,setSelAppt]=useState(null)
  const[cancelModal,setCancelModal]=useState(null)
  const days=getWeekDays(week)
  const hours=gS('09:00','20:00')
  const stColors=['#00B4B4','#F97316','#8B5CF6','#EC4899','#14B8A6','#F59E0B']

  const prevWeek=()=>{const d=new Date(week);d.setDate(d.getDate()-7);setWeek(d)}
  const nextWeek=()=>{const d=new Date(week);d.setDate(d.getDate()+7);setWeek(d)}
  const goToday=()=>setWeek(new Date())

  const getApptsForSlot=(date,hour)=>{
    const dk=toK(date)
    return appts.filter(a=>a.appointment_date===dk&&a.status==='confirmed'&&a.appointment_time?.slice(0,5)===hour)
  }

  const getBlocksForSlot=(date,hour)=>{
    const dk=toK(date)
    return blocks.filter(b=>b.blocked_date===dk&&b.start_time?.slice(0,5)<=hour&&b.end_time?.slice(0,5)>hour)
  }

  return<div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
      <div><h1 style={{fontSize:24,fontWeight:800}}>Calendario</h1><p style={{fontSize:14,color:'var(--text3)'}}>Vista semanal</p></div>
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        <Btn small variant="ghost" onClick={goToday}>Hoy</Btn>
        <Btn small variant="secondary" onClick={prevWeek}>←</Btn>
        <span style={{fontSize:14,fontWeight:600,minWidth:180,textAlign:'center'}}>{fS(days[0])} — {fS(days[6])}, {days[0].getFullYear()}</span>
        <Btn small variant="secondary" onClick={nextWeek}>→</Btn>
      </div>
    </div>

    <div style={{background:'var(--white)',borderRadius:12,border:'1px solid var(--border)',boxShadow:'var(--shadow)',overflow:'hidden'}}>
      {/* Header */}
      <div style={{display:'grid',gridTemplateColumns:'60px repeat(7,1fr)',borderBottom:'1px solid var(--border)'}}>
        <div style={{padding:'12px 8px',borderRight:'1px solid var(--border)'}}/>
        {days.map(d=><div key={toK(d)} style={{padding:'12px 8px',textAlign:'center',borderRight:'1px solid var(--border)',background:isT(d)?'var(--teal-bg)':'transparent'}}>
          <div style={{fontSize:11,fontWeight:600,color:'var(--text3)',textTransform:'uppercase'}}>{DL[(d.getDay()+6)%7]}</div>
          <div style={{fontSize:18,fontWeight:isT(d)?800:600,color:isT(d)?'var(--teal)':'var(--text)',marginTop:2}}>{d.getDate()}</div>
        </div>)}
      </div>

      {/* Time grid */}
      <div style={{maxHeight:'calc(100vh - 240px)',overflowY:'auto'}}>
        {hours.map(h=><div key={h} style={{display:'grid',gridTemplateColumns:'60px repeat(7,1fr)',minHeight:48,borderBottom:'1px solid var(--border)'}}>
          <div style={{padding:'4px 8px',fontSize:11,color:'var(--text3)',fontWeight:500,borderRight:'1px solid var(--border)',textAlign:'right',paddingRight:12}}>{h}</div>
          {days.map(d=>{
            const dk=toK(d)
            const slotAppts=getApptsForSlot(d,h)
            const slotBlocks=getBlocksForSlot(d,h)
            return<div key={dk+h} style={{borderRight:'1px solid var(--border)',padding:2,position:'relative',background:isT(d)?'rgba(0,180,180,0.02)':'transparent',cursor:'pointer'}} onClick={()=>{if(slotAppts.length===0&&slotBlocks.length===0)onBlock(dk,h)}}>
              {slotBlocks.length>0&&<div style={{background:'var(--red-bg)',border:'1px solid rgba(220,38,38,0.1)',borderRadius:4,padding:'2px 6px',fontSize:11,color:'var(--red)',fontWeight:500}}>🚫 Bloqueado</div>}
              {slotAppts.map(a=>{
                const sv=services.find(s=>s.id===a.service_id)
                const st=stylists.find(s=>s.id===a.stylist_id)
                const pr=profiles[a.user_id]
                const stIdx=stylists.findIndex(s=>s.id===a.stylist_id)
                const col=stColors[stIdx%stColors.length]
                return<div key={a.id} onClick={e=>{e.stopPropagation();setSelAppt(a)}} style={{background:`${col}15`,borderLeft:`3px solid ${col}`,borderRadius:4,padding:'3px 6px',marginBottom:1,cursor:'pointer',transition:'all .15s'}}>
                  <div style={{fontSize:11,fontWeight:600,color:col}}>{pr?.full_name||'—'}</div>
                  <div style={{fontSize:10,color:'var(--text3)'}}>{sv?.name} · {st?.name}</div>
                </div>
              })}
            </div>
          })}
        </div>)}
      </div>
    </div>

    {/* Stylist color legend */}
    <div style={{display:'flex',gap:16,marginTop:12,flexWrap:'wrap'}}>
      {stylists.filter(s=>s.active).map((s,i)=><div key={s.id} style={{display:'flex',alignItems:'center',gap:6}}>
        <div style={{width:12,height:12,borderRadius:3,background:stColors[i%stColors.length]}}/>
        <span style={{fontSize:12,color:'var(--text2)'}}>{s.name}</span>
      </div>)}
    </div>

    {/* Appointment detail modal */}
    {selAppt&&<Modal onClose={()=>setSelAppt(null)}>
      {(()=>{
        const a=selAppt,sv=services.find(s=>s.id===a.service_id),st=stylists.find(s=>s.id===a.stylist_id),pr=profiles[a.user_id]
        return<>
          <h3 style={{fontSize:20,fontWeight:800,marginBottom:16}}>Detalle de cita</h3>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px 20px',marginBottom:20}}>
            {[['Cliente',pr?.full_name||'—'],['Teléfono',pr?.phone||'—'],['Servicio',sv?.name],['Profesional',st?.name],['Fecha',fDF(new Date(a.appointment_date))],['Hora',`${a.appointment_time?.slice(0,5)} — ${a.end_time?.slice(0,5)}`],['Precio',sv?`${Number(sv.price).toFixed(2)} €`:'—'],['Estado',a.status==='confirmed'?'Confirmada':'Cancelada']].map(([k,v])=>
              <div key={k}><div style={{fontSize:12,color:'var(--text3)',marginBottom:2}}>{k}</div><div style={{fontSize:14,fontWeight:500}}>{v}</div></div>
            )}
          </div>
          {a.notes&&<div style={{padding:12,background:'var(--bg)',borderRadius:8,marginBottom:16}}><div style={{fontSize:12,color:'var(--text3)',marginBottom:4}}>Notas</div><div style={{fontSize:14}}>{a.notes}</div></div>}
          <div style={{display:'flex',gap:10}}>
            <Btn variant="secondary" onClick={()=>setSelAppt(null)} style={{flex:1}}>Cerrar</Btn>
            {a.status==='confirmed'&&<Btn variant="danger" onClick={()=>{setCancelModal(a);setSelAppt(null)}} style={{flex:1}}>Cancelar cita</Btn>}
          </div>
        </>
      })()}
    </Modal>}

    {cancelModal&&<Modal onClose={()=>setCancelModal(null)}>
      <h3 style={{fontSize:18,fontWeight:800,marginBottom:12}}>¿Cancelar esta cita?</h3>
      <div style={{padding:16,background:'var(--bg)',borderRadius:10,marginBottom:16}}>
        <div style={{fontSize:15,fontWeight:600}}>{profiles[cancelModal.user_id]?.full_name||'—'}</div>
        <div style={{fontSize:13,color:'var(--text3)',marginTop:4}}>{services.find(s=>s.id===cancelModal.service_id)?.name} · {cancelModal.appointment_time?.slice(0,5)}h</div>
      </div>
      <div style={{display:'flex',gap:10}}>
        <Btn variant="secondary" onClick={()=>setCancelModal(null)} style={{flex:1}}>Volver</Btn>
        <Btn variant="danger" onClick={()=>{onCancel(cancelModal.id);setCancelModal(null)}} style={{flex:1}}>Cancelar cita</Btn>
      </div>
    </Modal>}
  </div>
}

// ═══ CLIENTS ═══
function ClientsView({appts,profiles,services}){
  const[search,setSearch]=useState('')
  const clientMap={}
  appts.forEach(a=>{
    if(!a.user_id) return
    if(!clientMap[a.user_id]) clientMap[a.user_id]={visits:0,revenue:0,cancelled:0,lastVisit:null}
    if(a.status==='confirmed'||a.status==='completed'){
      clientMap[a.user_id].visits++
      const sv=services.find(s=>s.id===a.service_id)
      clientMap[a.user_id].revenue += sv ? Number(sv.price) : 0
      if(!clientMap[a.user_id].lastVisit || a.appointment_date > clientMap[a.user_id].lastVisit) clientMap[a.user_id].lastVisit = a.appointment_date
    }
    if(a.status==='cancelled') clientMap[a.user_id].cancelled++
  })
  let clients = Object.entries(clientMap).map(([id,data])=>({id,...data,profile:profiles[id]})).filter(c=>c.profile)
  if(search) clients = clients.filter(c=>c.profile?.full_name?.toLowerCase().includes(search.toLowerCase())||c.profile?.phone?.includes(search))
  clients.sort((a,b)=>b.revenue-a.revenue)

  return<div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
      <div><h1 style={{fontSize:24,fontWeight:800}}>Clientes</h1><p style={{fontSize:14,color:'var(--text3)'}}>{clients.length} clientes registrados</p></div>
      <div style={{width:280}}><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar cliente..." style={{width:'100%',padding:'10px 14px',fontSize:14,border:'1px solid var(--border2)',borderRadius:8,background:'var(--white)',fontFamily:'inherit'}}/></div>
    </div>
    <div style={{background:'var(--white)',borderRadius:12,border:'1px solid var(--border)',boxShadow:'var(--shadow)',overflow:'hidden'}}>
      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr',padding:'12px 20px',borderBottom:'1px solid var(--border)',background:'var(--bg)'}}>
        {['Cliente','Teléfono','Visitas','Ingresos','Última visita'].map(h=><div key={h} style={{fontSize:12,fontWeight:600,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.04em'}}>{h}</div>)}
      </div>
      {clients.length===0?<div style={{padding:40,textAlign:'center',color:'var(--text3)',fontSize:14}}>No hay clientes</div>:
      clients.map(c=><div key={c.id} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr',padding:'14px 20px',borderBottom:'1px solid var(--border)',alignItems:'center'}}>
        <div><div style={{fontSize:14,fontWeight:600}}>{c.profile?.full_name}</div><div style={{fontSize:12,color:'var(--text3)'}}>{c.profile?.phone||'—'}</div></div>
        <div style={{fontSize:13,color:'var(--text2)'}}>{c.profile?.phone||'—'}</div>
        <div style={{fontSize:14,fontWeight:600}}>{c.visits}</div>
        <div style={{fontSize:14,fontWeight:700,color:'var(--teal)'}}>{c.revenue.toFixed(0)}€</div>
        <div style={{fontSize:13,color:'var(--text3)'}}>{c.lastVisit?fS(new Date(c.lastVisit)):'—'}</div>
      </div>)}
    </div>
  </div>
}

// ═══ REPORTS ═══
function ReportsView({appts,services,stylists}){
  const[period,setPeriod]=useState('month') // week | month
  const now=new Date()

  const getRange=()=>{
    if(period==='week'){
      const wk=getWeekDays(now)
      return{start:toK(wk[0]),end:toK(wk[6]),label:`Semana del ${fS(wk[0])} al ${fS(wk[6])}`}
    }
    return{start:`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`,end:`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-31`,label:`${MO[now.getMonth()]} ${now.getFullYear()}`}
  }

  const range=getRange()
  const filtered=appts.filter(a=>a.appointment_date>=range.start&&a.appointment_date<=range.end)
  const confirmed=filtered.filter(a=>a.status==='confirmed'||a.status==='completed')
  const cancelled=filtered.filter(a=>a.status==='cancelled')
  const revenue=confirmed.reduce((s,a)=>{const sv=services.find(x=>x.id===a.service_id);return s+(sv?Number(sv.price):0)},0)

  // Revenue by day
  const byDay={}
  confirmed.forEach(a=>{
    if(!byDay[a.appointment_date]) byDay[a.appointment_date]=0
    const sv=services.find(x=>x.id===a.service_id)
    byDay[a.appointment_date]+=sv?Number(sv.price):0
  })
  const maxDayRev=Math.max(...Object.values(byDay),1)

  // By service
  const bySvc={}
  confirmed.forEach(a=>{const sv=services.find(x=>x.id===a.service_id);if(!sv)return;if(!bySvc[sv.name])bySvc[sv.name]={count:0,rev:0};bySvc[sv.name].count++;bySvc[sv.name].rev+=Number(sv.price)})

  return<div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
      <div><h1 style={{fontSize:24,fontWeight:800}}>Informes</h1><p style={{fontSize:14,color:'var(--text3)'}}>{range.label}</p></div>
      <div style={{display:'flex',gap:4,background:'var(--white)',borderRadius:8,padding:3,border:'1px solid var(--border)'}}>
        {[['week','Semana'],['month','Mes']].map(([id,l])=><button key={id} onClick={()=>setPeriod(id)} style={{padding:'8px 16px',fontSize:13,fontWeight:600,fontFamily:'inherit',border:'none',borderRadius:6,cursor:'pointer',background:period===id?'var(--teal)':'transparent',color:period===id?'#fff':'var(--text3)'}}>{l}</button>)}
      </div>
    </div>

    <div style={{display:'flex',gap:16,marginBottom:24,flexWrap:'wrap'}}>
      <StatCard label="Ingresos" value={`${revenue.toFixed(0)}€`} icon="💰" color="var(--green)" bg="var(--green-bg)"/>
      <StatCard label="Citas realizadas" value={confirmed.length} icon="✅" color="var(--teal)" bg="var(--teal-bg)"/>
      <StatCard label="Cancelaciones" value={cancelled.length} icon="❌" color="var(--red)" bg="var(--red-bg)"/>
      <StatCard label="Media por cita" value={confirmed.length>0?`${(revenue/confirmed.length).toFixed(0)}€`:'—'} icon="📊"/>
    </div>

    <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:16}}>
      {/* Revenue chart */}
      <div className="fade" style={{background:'var(--white)',borderRadius:12,border:'1px solid var(--border)',padding:22,boxShadow:'var(--shadow)'}}>
        <h3 style={{fontSize:16,fontWeight:700,marginBottom:16}}>Ingresos por día</h3>
        <div style={{display:'flex',alignItems:'flex-end',gap:4,height:160}}>
          {Object.entries(byDay).sort().map(([day,rev])=>
            <div key={day} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
              <div style={{fontSize:10,fontWeight:600,color:'var(--teal)'}}>{rev.toFixed(0)}€</div>
              <div style={{width:'100%',maxWidth:40,background:'var(--teal)',borderRadius:4,height:`${(rev/maxDayRev)*120}px`,minHeight:4,transition:'height .3s'}}/>
              <div style={{fontSize:10,color:'var(--text3)'}}>{new Date(day).getDate()}</div>
            </div>
          )}
          {Object.keys(byDay).length===0&&<p style={{fontSize:13,color:'var(--text3)',width:'100%',textAlign:'center',paddingTop:60}}>Sin datos</p>}
        </div>
      </div>

      {/* By service */}
      <div className="fade fade-d1" style={{background:'var(--white)',borderRadius:12,border:'1px solid var(--border)',padding:22,boxShadow:'var(--shadow)'}}>
        <h3 style={{fontSize:16,fontWeight:700,marginBottom:16}}>Por servicio</h3>
        {Object.entries(bySvc).sort((a,b)=>b[1].rev-a[1].rev).map(([name,data])=>
          <div key={name} style={{padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:14}}><span style={{fontWeight:500}}>{name}</span><span style={{fontWeight:700,color:'var(--teal)'}}>{data.rev.toFixed(0)}€</span></div>
            <div style={{fontSize:12,color:'var(--text3)',marginTop:2}}>{data.count} cita{data.count!==1?'s':''}</div>
          </div>
        )}
        {Object.keys(bySvc).length===0&&<p style={{fontSize:13,color:'var(--text3)'}}>Sin datos</p>}
      </div>
    </div>
  </div>
}

// ═══ TEAM MANAGEMENT ═══
function TeamView({stylists,onSave,onDelete}){
  const[edit,setEdit]=useState(null)
  const[del,setDel]=useState(null)
  return<div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
      <h1 style={{fontSize:24,fontWeight:800}}>Equipo</h1>
      <Btn onClick={()=>setEdit({name:'',username:'',role_title:'Barbero',photo_url:'',active:true})}>+ Añadir profesional</Btn>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16}}>
      {stylists.map(s=><div key={s.id} className="fade" style={{background:'var(--white)',borderRadius:12,border:'1px solid var(--border)',padding:20,boxShadow:'var(--shadow)',opacity:s.active?1:0.5}}>
        <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:14}}>
          <div style={{width:52,height:52,borderRadius:14,background:'var(--teal-bg)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:700,color:'var(--teal)',overflow:'hidden',flexShrink:0}}>
            {s.photo_url?<img src={s.photo_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:s.name[0]}
          </div>
          <div><div style={{fontSize:16,fontWeight:600}}>{s.name}</div><div style={{fontSize:13,color:'var(--text3)'}}>{s.role_title}</div><div style={{fontSize:12,color:'var(--text3)'}}>{s.username||'—'}</div></div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <Btn small variant="secondary" onClick={()=>setEdit(s)} style={{flex:1}}>Editar</Btn>
          <Btn small variant="danger" onClick={()=>setDel(s)}>Eliminar</Btn>
        </div>
      </div>)}
    </div>
    {edit&&<StyModal data={edit} onSave={d=>{onSave(d);setEdit(null)}} onClose={()=>setEdit(null)}/>}
    {del&&<Modal onClose={()=>setDel(null)}>
      <h3 style={{fontSize:18,fontWeight:800,marginBottom:12}}>¿Eliminar a {del.name}?</h3>
      <p style={{fontSize:14,color:'var(--text2)',marginBottom:20}}>Se eliminará permanentemente.</p>
      <div style={{display:'flex',gap:10}}><Btn variant="secondary" onClick={()=>setDel(null)} style={{flex:1}}>Cancelar</Btn><Btn variant="danger" onClick={()=>{onDelete(del.id);setDel(null)}} style={{flex:1}}>Eliminar</Btn></div>
    </Modal>}
  </div>
}

function StyModal({data,onSave,onClose}){
  const[n,sN]=useState(data.name||''),[u,sU]=useState(data.username||''),[r,sR]=useState(data.role_title||'Barbero'),[p,sP]=useState(data.photo_url||''),[a,sA]=useState(data.active!==false)
  return<Modal onClose={onClose}>
    <h3 style={{fontSize:18,fontWeight:800,marginBottom:18}}>{data.id?'Editar profesional':'Nuevo profesional'}</h3>
    <Input label="Nombre" required value={n} onChange={e=>sN(e.target.value)} placeholder="Nombre"/>
    <Input label="Username" value={u} onChange={e=>sU(e.target.value)} placeholder="@usuario"/>
    <Input label="Rol" value={r} onChange={e=>sR(e.target.value)} placeholder="Barbero"/>
    <Input label="URL foto" value={p} onChange={e=>sP(e.target.value)} placeholder="/images/team-nombre.jpg"/>
    {p&&<div style={{marginBottom:12,width:60,height:60,borderRadius:12,overflow:'hidden',background:'var(--bg)'}}><img src={p} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>e.target.style.display='none'}/></div>}
    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
      <span style={{fontSize:13,fontWeight:500}}>Activo</span>
      <button onClick={()=>sA(!a)} style={{width:44,height:24,borderRadius:12,position:'relative',cursor:'pointer',border:'none',background:a?'var(--teal)':'var(--border)',transition:'all .3s'}}><div style={{width:20,height:20,borderRadius:10,background:'#fff',position:'absolute',top:2,left:a?22:2,transition:'all .3s',boxShadow:'0 1px 3px rgba(0,0,0,0.15)'}}/></button>
    </div>
    <div style={{display:'flex',gap:10}}><Btn variant="secondary" onClick={onClose} style={{flex:1}}>Cancelar</Btn><Btn onClick={()=>onSave({...data,name:n,username:u,role_title:r,photo_url:p,active:a})} disabled={!n.trim()} style={{flex:1}}>Guardar</Btn></div>
  </Modal>
}

// ═══ SERVICES MANAGEMENT ═══
function ServicesView({services,onSave,onDelete}){
  const[edit,setEdit]=useState(null),[del,setDel]=useState(null)
  return<div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
      <h1 style={{fontSize:24,fontWeight:800}}>Servicios</h1>
      <Btn onClick={()=>setEdit({name:'',description:'',duration:30,price:0,category:'popular'})}>+ Añadir servicio</Btn>
    </div>
    <div style={{background:'var(--white)',borderRadius:12,border:'1px solid var(--border)',boxShadow:'var(--shadow)',overflow:'hidden'}}>
      {services.map((s,i)=><div key={s.id} className="fade" style={{display:'flex',alignItems:'center',gap:16,padding:'16px 20px',borderBottom:i<services.length-1?'1px solid var(--border)':'none',opacity:s.active?1:0.5}}>
        <div style={{flex:1}}><div style={{fontSize:15,fontWeight:600}}>{s.name}</div><div style={{fontSize:13,color:'var(--text3)',marginTop:2}}>{s.description}</div></div>
        <div style={{fontSize:13,color:'var(--text3)'}}>{s.duration} min</div>
        <div style={{fontSize:16,fontWeight:800,color:'var(--teal)',minWidth:60,textAlign:'right'}}>{Number(s.price).toFixed(2)}€</div>
        <div style={{display:'flex',gap:6}}><Btn small variant="secondary" onClick={()=>setEdit(s)}>Editar</Btn><Btn small variant="danger" onClick={()=>setDel(s)}>✕</Btn></div>
      </div>)}
    </div>
    {edit&&<SvcModal data={edit} onSave={d=>{onSave(d);setEdit(null)}} onClose={()=>setEdit(null)}/>}
    {del&&<Modal onClose={()=>setDel(null)}><h3 style={{fontSize:18,fontWeight:800,marginBottom:12}}>¿Eliminar {del.name}?</h3><p style={{fontSize:14,color:'var(--text2)',marginBottom:20}}>Se eliminará permanentemente.</p><div style={{display:'flex',gap:10}}><Btn variant="secondary" onClick={()=>setDel(null)} style={{flex:1}}>Cancelar</Btn><Btn variant="danger" onClick={()=>{onDelete(del.id);setDel(null)}} style={{flex:1}}>Eliminar</Btn></div></Modal>}
  </div>
}

function SvcModal({data,onSave,onClose}){
  const[n,sN]=useState(data.name||''),[d,sD]=useState(data.description||''),[du,sDu]=useState(data.duration||30),[p,sP]=useState(data.price||0),[c,sC]=useState(data.category||'popular')
  return<Modal onClose={onClose}>
    <h3 style={{fontSize:18,fontWeight:800,marginBottom:18}}>{data.id?'Editar servicio':'Nuevo servicio'}</h3>
    <Input label="Nombre" required value={n} onChange={e=>sN(e.target.value)} placeholder="CORTE CLOCKS"/>
    <Input label="Descripción" value={d} onChange={e=>sD(e.target.value)} placeholder="Descripción"/>
    <div style={{display:'flex',gap:10}}><div style={{flex:1}}><Input label="Duración (min)" type="number" value={du} onChange={e=>sDu(parseInt(e.target.value)||0)}/></div><div style={{flex:1}}><Input label="Precio (€)" type="number" step="0.01" value={p} onChange={e=>sP(parseFloat(e.target.value)||0)}/></div></div>
    <Select label="Categoría" value={c} onChange={e=>sC(e.target.value)}><option value="popular">Popular</option><option value="other">Otro</option></Select>
    <div style={{display:'flex',gap:10}}><Btn variant="secondary" onClick={onClose} style={{flex:1}}>Cancelar</Btn><Btn onClick={()=>onSave({...data,name:n,description:d,duration:du,price:p,category:c})} disabled={!n.trim()} style={{flex:1}}>Guardar</Btn></div>
  </Modal>
}

// ═══ BLOCKS ═══
function BlocksView({blocks,stylists,onAdd,onRemove}){
  const[show,setShow]=useState(false),[bS,setBS]=useState(stylists[0]?.id),[bD,setBD]=useState(toK(new Date())),[bSt,setBSt]=useState('09:00'),[bE,setBE]=useState('10:00'),[bR,setBR]=useState('')
  const upcoming=blocks.filter(b=>b.blocked_date>=toK(new Date())).sort((a,b)=>a.blocked_date.localeCompare(b.blocked_date)||a.start_time.localeCompare(b.start_time))
  return<div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
      <h1 style={{fontSize:24,fontWeight:800}}>Bloqueos</h1>
      <Btn onClick={()=>setShow(true)}>+ Bloquear horario</Btn>
    </div>
    <div style={{background:'var(--white)',borderRadius:12,border:'1px solid var(--border)',boxShadow:'var(--shadow)',overflow:'hidden'}}>
      {upcoming.length===0?<div style={{padding:40,textAlign:'center',color:'var(--text3)',fontSize:14}}>No hay bloqueos activos</div>:
      upcoming.map((b,i)=><div key={b.id} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 20px',borderBottom:i<upcoming.length-1?'1px solid var(--border)':'none'}}>
        <div style={{width:40,height:40,borderRadius:10,background:'var(--red-bg)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>🚫</div>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:600}}>{b.reason||'Bloqueado'}</div>
          <div style={{fontSize:13,color:'var(--text3)'}}>{stylists.find(s=>s.id===b.stylist_id)?.name} · {fS(new Date(b.blocked_date))} · {b.start_time?.slice(0,5)} — {b.end_time?.slice(0,5)}</div>
        </div>
        <Btn small variant="danger" onClick={()=>onRemove(b.id)}>Quitar</Btn>
      </div>)}
    </div>
    {show&&<Modal onClose={()=>setShow(false)}>
      <h3 style={{fontSize:18,fontWeight:800,marginBottom:18}}>Bloquear horario</h3>
      <Select label="Profesional" value={bS} onChange={e=>setBS(Number(e.target.value))}>{stylists.filter(s=>s.active).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</Select>
      <Input label="Fecha" type="date" value={bD} onChange={e=>setBD(e.target.value)}/>
      <div style={{display:'flex',gap:10}}><div style={{flex:1}}><Select label="Desde" value={bSt} onChange={e=>setBSt(e.target.value)}>{gS().map(h=><option key={h} value={h}>{h}</option>)}</Select></div><div style={{flex:1}}><Select label="Hasta" value={bE} onChange={e=>setBE(e.target.value)}>{gS('09:30','20:30').map(h=><option key={h} value={h}>{h}</option>)}</Select></div></div>
      <Input label="Motivo" value={bR} onChange={e=>setBR(e.target.value)} placeholder="Ej: Descanso, formación..."/>
      <div style={{display:'flex',gap:10}}><Btn variant="secondary" onClick={()=>setShow(false)} style={{flex:1}}>Cancelar</Btn><Btn onClick={()=>{onAdd({stylist_id:bS,blocked_date:bD,start_time:bSt,end_time:bE,reason:bR||'Bloqueado'});setShow(false);setBR('')}} style={{flex:1}}>Bloquear</Btn></div>
    </Modal>}
  </div>
}

// ═══ MAIN APP ═══
export default function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [view, setView] = useState('loading')
  const [page, setPage] = useState('dash')
  const [appts, setAppts] = useState([])
  const [profiles, setProfiles] = useState({})
  const [stylists, setStylists] = useState([])
  const [services, setServices] = useState([])
  const [blocks, setBlocks] = useState([])

  const loadAll = useCallback(async () => {
    const [{ data: a }, { data: st }, { data: sv }, { data: bl }] = await Promise.all([
      supabase.from('appointments').select('*').order('appointment_date', { ascending: false }).limit(500),
      supabase.from('stylists').select('*').order('display_order'),
      supabase.from('services').select('*').order('display_order'),
      supabase.from('blocked_slots').select('*,stylists(name)').order('blocked_date', { ascending: false }),
    ])
    setAppts(a || []); setStylists(st || []); setServices(sv || []); setBlocks(bl || [])

    // Load all profiles for appointment users
    const ids = [...new Set((a || []).map(x => x.user_id).filter(Boolean))]
    if (ids.length > 0) {
      const { data: p } = await supabase.from('profiles').select('id,full_name,phone').in('id', ids)
      const map = {}; (p || []).forEach(pr => { map[pr.id] = pr }); setProfiles(map)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
        if (prof?.role !== 'admin') { setView('denied'); return }
        setProfile(prof)
        setView('app')
        loadAll()
      } else { setView('auth') }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!s?.user) { setUser(null); setProfile(null); setView('auth') }
    })
    return () => subscription.unsubscribe()
  }, [loadAll])

  const handleLogin = async (u) => {
    setUser(u)
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', u.id).single()
    if (prof?.role !== 'admin') { setView('denied'); return }
    setProfile(prof); setView('app'); loadAll()
  }

  const cancelAppt = async id => { await supabase.from('appointments').update({ status: 'cancelled', cancelled_by: 'admin' }).eq('id', id); loadAll() }
  const addBlock = async data => { await supabase.from('blocked_slots').insert({ ...data, created_by: user.id }); loadAll() }
  const rmBlock = async id => { await supabase.from('blocked_slots').delete().eq('id', id); loadAll() }
  const saveSvc = async data => { if (data.id) { await supabase.from('services').update({ name: data.name, description: data.description, duration: data.duration, price: data.price, category: data.category }).eq('id', data.id) } else { const mx = services.reduce((m, s) => Math.max(m, s.display_order || 0), 0); await supabase.from('services').insert({ ...data, display_order: mx + 1, active: true }) } loadAll() }
  const delSvc = async id => { await supabase.from('services').delete().eq('id', id); loadAll() }
  const saveSty = async data => { if (data.id) { await supabase.from('stylists').update({ name: data.name, username: data.username, role_title: data.role_title, photo_url: data.photo_url, active: data.active }).eq('id', data.id) } else { const mx = stylists.reduce((m, s) => Math.max(m, s.display_order || 0), 0); await supabase.from('stylists').insert({ ...data, display_order: mx + 1, active: true }) } loadAll() }
  const delSty = async id => { await supabase.from('stylists').delete().eq('id', id); loadAll() }
  const handleBlock = (date, time) => { setPage('blocks') }

  if (view === 'loading') return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><style>{CSS}</style><Sp /></div>
  if (view === 'auth') return <><style>{CSS}</style><AdminAuth onLogin={handleLogin} /></>
  if (view === 'denied') return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}><style>{CSS}</style><h2>⛔ Acceso denegado</h2><p style={{ color: 'var(--text3)' }}>Esta cuenta no tiene permisos de administrador.</p><Btn onClick={async () => { await supabase.auth.signOut(); setView('auth') }}>Cerrar sesión</Btn></div>

  return <div style={{ display: 'flex', minHeight: '100vh' }}>
    <style>{CSS}</style>
    <Sidebar active={page} onNav={setPage} />
    <main style={{ flex: 1, marginLeft: 'var(--sidebar-w)', padding: '28px 32px' }}>
      {page === 'dash' && <Dashboard appts={appts} profiles={profiles} stylists={stylists} services={services} />}
      {page === 'cal' && <CalendarView appts={appts} profiles={profiles} stylists={stylists} services={services} blocks={blocks} onCancel={cancelAppt} onBlock={handleBlock} />}
      {page === 'clients' && <ClientsView appts={appts} profiles={profiles} services={services} />}
      {page === 'reports' && <ReportsView appts={appts} services={services} stylists={stylists} />}
      {page === 'team' && <TeamView stylists={stylists} onSave={saveSty} onDelete={delSty} />}
      {page === 'services' && <ServicesView services={services} onSave={saveSvc} onDelete={delSvc} />}
      {page === 'blocks' && <BlocksView blocks={blocks} stylists={stylists} onAdd={addBlock} onRemove={rmBlock} />}
    </main>
  </div>
}
