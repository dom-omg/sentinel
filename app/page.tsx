'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'

const MG = {
  gradient: 'linear-gradient(110deg, #0b2e12 0%, #1a6b28 18%, #3fb950 38%, #9dffb2 52%, #3fb950 66%, #1a6b28 82%, #0b2e12 100%)',
  glow: '0 0 12px rgba(63,185,80,0.4), 0 0 30px rgba(63,185,80,0.15)',
  border: '1px solid rgba(63,185,80,0.35)',
}

function ShieldLock({ size = 20, dark = false }: { size?: number; dark?: boolean }) {
  const c = dark ? 'rgba(3,6,8,0.9)' : 'currentColor'
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M10 1.5L17 5.5V12.5C17 16 14 17.5 10 19C6 17.5 3 16 3 12.5V5.5L10 1.5Z" stroke={c} strokeWidth="1.4" strokeLinejoin="round"/>
      <rect x="7" y="10.5" width="6" height="4.5" rx="1" stroke={c} strokeWidth="1.2"/>
      <path d="M8 10.5V8.5C8 7.1 8.9 6.2 10 6.2C11.1 6.2 12 7.1 12 8.5V10.5" stroke={c} strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

function ShieldSoldier({ color = '#3fb950', delay = 0 }: { color?: string; delay?: number }) {
  return (
    <svg width="22" height="36" viewBox="0 0 22 36" fill="none"
      style={{ animation: `soldierMarch 1.2s ease-in-out ${delay}ms infinite` }}>
      <circle cx="11" cy="4" r="2.8" stroke={color} strokeWidth="1.3"/>
      <path d="M11 7V18" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M11 11L5 13" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M11 11L16 10" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M11 18L7.5 27" stroke={color} strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M11 18L14.5 27" stroke={color} strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M5 10L2 12V17C2 19 3.5 20 5 21C6.5 20 8 19 8 17V12L5 10Z"
        stroke={color} strokeWidth="1.2" strokeLinejoin="round" fill={`${color}20`}/>
      <rect x="3.8" y="15" width="2.4" height="2" rx="0.4" fill={color}/>
      <path d="M4.3 15V14C4.3 13.4 4.8 13 5 13C5.2 13 5.7 13.4 5.7 14V15"
        stroke={color} strokeWidth="0.8" strokeLinecap="round"/>
    </svg>
  )
}

function IntroAnimation({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<'black'|'scan'|'logo'|'pulse'|'text'|'soldiers'|'hold'|'flash'|'exit'>('black')
  const [lettersDone, setLettersDone] = useState(0)
  const [soldiersIn, setSoldiersIn] = useState<boolean[]>(new Array(7).fill(false))
  const [strokePct, setStrokePct] = useState(0)
  const [flashOn, setFlashOn] = useState(false)
  const WORD = 'BASTION'

  // Phase sequencer
  useEffect(() => { setTimeout(() => setPhase('scan'), 600) }, [])
  useEffect(() => { if (phase === 'scan') setTimeout(() => setPhase('logo'), 700) }, [phase])

  // Logo draw — slow, deliberate (2.2s)
  useEffect(() => {
    if (phase !== 'logo') return
    let pct = 0
    const iv = setInterval(() => {
      pct += 1.1
      setStrokePct(Math.min(pct, 100))
      if (pct >= 100) { clearInterval(iv); setPhase('pulse') }
    }, 22)
    return () => clearInterval(iv)
  }, [phase])

  // Pulse pause before text
  useEffect(() => { if (phase === 'pulse') setTimeout(() => setPhase('text'), 600) }, [phase])

  // Text — slower, weighted (140ms/letter)
  useEffect(() => {
    if (phase !== 'text') return
    let i = 0
    const iv = setInterval(() => {
      i++; setLettersDone(i)
      if (i >= WORD.length) { clearInterval(iv); setPhase('soldiers') }
    }, 140)
    return () => clearInterval(iv)
  }, [phase])

  // Soldiers march in with drama
  useEffect(() => {
    if (phase !== 'soldiers') return
    for (let i = 0; i < 7; i++) {
      setTimeout(() => setSoldiersIn(prev => { const n=[...prev]; n[i]=true; return n }), i * 180)
    }
    setTimeout(() => setPhase('hold'), 1800)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // Hold — let it breathe
  useEffect(() => { if (phase === 'hold') setTimeout(() => setPhase('flash'), 1200) }, [phase])

  // Flash — punch before exit
  useEffect(() => {
    if (phase !== 'flash') return
    setFlashOn(true)
    setTimeout(() => setFlashOn(false), 120)
    setTimeout(() => setPhase('exit'), 300)
  }, [phase])

  useEffect(() => { if (phase === 'exit') setTimeout(onComplete, 800) }, [phase, onComplete])

  const perim = 280
  const dashOffset = perim - (strokePct / 100) * perim
  const logoGlow = phase === 'pulse' || phase === 'text' || phase === 'soldiers' || phase === 'hold' || phase === 'flash'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: flashOn ? '#3fb950' : '#030608',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      transform: phase === 'exit' ? 'translateY(-100%)' : 'translateY(0)',
      transition: phase === 'exit' ? 'transform 0.8s cubic-bezier(0.76,0,0.24,1)' : 'background 0.08s ease',
    }}>
      {/* Scanlines */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.22) 2px,rgba(0,0,0,0.22) 4px)',
        opacity: phase === 'black' ? 0 : 0.5,
        transition: 'opacity 0.6s ease',
      }}/>

      {/* Scan line sweep */}
      {phase === 'scan' && (
        <div style={{
          position:'absolute', left:0, right:0, height:2,
          background:'linear-gradient(90deg,transparent,#3fb950,transparent)',
          animation:'scanLine 0.65s linear forwards',
          boxShadow:'0 0 20px rgba(63,185,80,0.8)',
        }}/>
      )}

      {/* Ambient radial */}
      <div style={{
        position:'absolute', width:600, height:600,
        background:'radial-gradient(circle,rgba(63,185,80,0.07) 0%,transparent 65%)',
        borderRadius:'50%', pointerEvents:'none',
        opacity: phase === 'black' || phase === 'scan' ? 0 : 1,
        transition:'opacity 0.8s ease',
      }}/>

      {/* Big shield */}
      <div style={{
        marginBottom: 32,
        filter: logoGlow
          ? 'drop-shadow(0 0 24px rgba(63,185,80,0.7)) drop-shadow(0 0 60px rgba(63,185,80,0.25))'
          : strokePct > 20 ? 'drop-shadow(0 0 12px rgba(63,185,80,0.4))' : 'none',
        transition: 'filter 0.5s ease',
        transform: phase === 'pulse' ? 'scale(1.04)' : 'scale(1)',
      }}>
        <svg width="130" height="130" viewBox="0 0 100 100" fill="none">
          <defs>
            <linearGradient id="ig" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1a6b28"/>
              <stop offset="30%" stopColor="#3fb950"/>
              <stop offset="52%" stopColor="#9dffb2"/>
              <stop offset="72%" stopColor="#3fb950"/>
              <stop offset="100%" stopColor="#1a6b28"/>
            </linearGradient>
          </defs>
          <path d="M50 5L90 25V55C90 78 72 88 50 95C28 88 10 78 10 55V25L50 5Z"
            stroke="url(#ig)" strokeWidth="3" strokeLinejoin="round"
            fill="rgba(63,185,80,0.04)"
            strokeDasharray={perim} strokeDashoffset={dashOffset}/>
          {strokePct > 65 && <>
            <rect x="35" y="54" width="30" height="23" rx="4"
              fill="none" stroke="url(#ig)" strokeWidth="2.5"
              style={{ opacity: Math.min((strokePct - 65) / 35, 1) }}/>
            <path d="M40 54V45C40 38 44.5 35 50 35C55.5 35 60 38 60 45V54"
              stroke="url(#ig)" strokeWidth="2.5" strokeLinecap="round" fill="none"
              style={{ opacity: Math.min((strokePct - 65) / 35, 1) }}/>
            <circle cx="50" cy="64" r="3.5" fill="#3fb950"
              style={{ opacity: Math.min((strokePct - 82) / 18, 1) }}/>
          </>}
        </svg>
      </div>

      {/* BASTION — letter by letter with weight */}
      <div style={{ display:'flex', gap:4, marginBottom:12, letterSpacing:'0.22em' }}>
        {WORD.split('').map((l, i) => (
          <span key={i} style={{
            fontSize: 48, fontWeight: 900,
            background: MG.gradient, backgroundSize:'200% 100%',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            opacity: i < lettersDone ? 1 : 0,
            transform: i < lettersDone ? 'translateY(0) scale(1)' : 'translateY(14px) scale(0.85)',
            transition: 'opacity 0.25s ease, transform 0.35s cubic-bezier(0.34,1.4,0.64,1)',
            textShadow: i < lettersDone ? '0 0 30px rgba(63,185,80,0.3)' : 'none',
          }}>{l}</span>
        ))}
      </div>

      {/* Tagline */}
      <p style={{
        color:'#3fb950', fontSize:11, fontWeight:500, letterSpacing:'0.2em',
        textTransform:'uppercase', marginBottom:56,
        opacity: phase === 'text' || phase === 'soldiers' || phase === 'hold' || phase === 'flash' ? 0.6 : 0,
        transform: phase === 'text' || phase === 'soldiers' || phase === 'hold' || phase === 'flash' ? 'translateY(0)' : 'translateY(6px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}>
        AI Workforce Control Plane · Canada
      </p>

      {/* Soldiers */}
      <div style={{ display:'flex', gap:20, alignItems:'flex-end', height:52 }}>
        {soldiersIn.map((isIn, i) => (
          <div key={i} style={{
            opacity: isIn ? 1 : 0,
            transform: isIn ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.7)',
            transition: 'opacity 0.35s ease, transform 0.5s cubic-bezier(0.34,1.56,0.64,1)',
            filter: 'drop-shadow(0 0 8px rgba(63,185,80,0.6))',
          }}>
            <ShieldSoldier color={i === 3 ? '#9dffb2' : '#3fb950'} delay={i * 200} />
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{
        position:'absolute', bottom:44, left:'50%', transform:'translateX(-50%)',
        width:220, height:1.5, background:'rgba(63,185,80,0.1)', borderRadius:2, overflow:'hidden',
      }}>
        <div style={{
          height:'100%',
          width: phase === 'hold' || phase === 'flash' || phase === 'exit' ? '100%' : `${strokePct}%`,
          background: MG.gradient, backgroundSize:'200% 100%',
          transition: 'width 0.15s linear',
          boxShadow:'0 0 8px rgba(63,185,80,0.5)',
        }}/>
      </div>
    </div>
  )
}

function MetallicButton({ href, children, outline = false }: { href: string; children: React.ReactNode; outline?: boolean }) {
  const [hov, setHov] = useState(false)
  return (
    <Link href={href}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display:'inline-flex', alignItems:'center', gap:8,
        background: outline ? 'transparent' : (hov
          ? 'linear-gradient(110deg,#1a6b28 0%,#3fb950 30%,#9dffb2 52%,#3fb950 70%,#1a6b28 100%)'
          : 'linear-gradient(110deg,#0f4a1a 0%,#2a8636 30%,#3fb950 52%,#2a8636 70%,#0f4a1a 100%)'),
        backgroundSize:'200% 100%',
        color: outline ? '#3fb950' : (hov ? '#030608' : '#e6fde9'),
        borderRadius:10, padding:'13px 28px', fontSize:15, fontWeight:700,
        textDecoration:'none', letterSpacing:'-0.01em',
        boxShadow: outline ? 'none' : (hov ? MG.glow : '0 0 8px rgba(63,185,80,0.2)'),
        border: hov ? '1px solid rgba(157,255,178,0.6)' : MG.border,
        transition:'all 0.22s ease',
      }}
    >{children}</Link>
  )
}

function AnimatedStat({ value, label, delay = 0 }: { value: string; label: string; delay?: number }) {
  const [vis, setVis] = useState(false)
  const [count, setCount] = useState(0)
  const isNum = /^\d+/.test(value)
  const numVal = parseInt(value) || 0
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { const t = setTimeout(() => setVis(true), delay); return () => clearTimeout(t) }, [delay])

  useEffect(() => {
    if (!vis || !isNum) return
    let n = 0
    const dur = 1200, step = 16
    const inc = numVal / (dur / step)
    const iv = setInterval(() => {
      n += inc
      if (n >= numVal) { setCount(numVal); clearInterval(iv) }
      else setCount(Math.floor(n))
    }, step)
    return () => clearInterval(iv)
  }, [vis, isNum, numVal])

  const display = isNum ? `${count}${value.replace(/^\d+/, '')}` : value

  return (
    <div ref={ref} style={{ textAlign:'center', opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(18px)', transition:'opacity 0.6s ease, transform 0.6s ease' }}>
      <div style={{
        fontSize:32, fontWeight:800, letterSpacing:'-0.03em', marginBottom:8,
        background: MG.gradient, backgroundSize:'300% 100%',
        WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
        animation:'metalShimmer 4s ease-in-out infinite',
        animationDelay:`${delay}ms`,
      }}>{display}</div>
      <div style={{ color:'var(--text-muted)', fontSize:12 }}>{label}</div>
    </div>
  )
}

function CanadaStat({ delay = 0 }: { delay?: number }) {
  const [vis, setVis] = useState(false)
  const [pulse, setPulse] = useState(false)
  useEffect(() => {
    const t1 = setTimeout(() => setVis(true), delay)
    const t2 = setTimeout(() => { setInterval(() => setPulse(p => !p), 1800) }, delay + 900)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [delay])
  return (
    <div style={{ textAlign:'center', opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(18px)', transition:'opacity 0.6s ease, transform 0.6s ease' }}>
      <div style={{ fontSize:32, fontWeight:800, letterSpacing:'-0.03em', marginBottom:8, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
        <span style={{ fontSize:26, filter: pulse ? 'drop-shadow(0 0 10px rgba(220,30,30,0.6))' : 'none', transition:'filter 0.8s ease' }}>🇨🇦</span>
        <span style={{
          background: MG.gradient, backgroundSize:'300% 100%',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
          animation:'metalShimmer 4s ease-in-out infinite', animationDelay:`${delay}ms`,
        }}>Canada</span>
      </div>
      <div style={{ color:'var(--text-muted)', fontSize:12 }}>Données hébergées au Canada</div>
    </div>
  )
}

const FEATURES = [
  { icon:'⬡', title:'Policy Engine', desc:'Chaque action IA évaluée avant exécution. Autoriser, logger, exiger approbation, bloquer — vous décidez.' },
  { icon:'◷', title:'Approbation Humaine', desc:'Aucun email client ne part sans que vous l\'ayez vu. Queue claire, actions en un clic, expiry automatique.' },
  { icon:'◈', title:'Audit Trail Immuable', desc:'Journal complet de chaque action. Qui, quoi, quand, quelle politique, pourquoi. Conforme Loi 25 / PIPEDA.' },
  { icon:'⬤', title:'Bilingue FR/EN', desc:'Détection automatique de la langue client. Français pour le Québec, anglais pour l\'Ontario.' },
  { icon:'▣', title:'Workspaces Isolés', desc:'Chaque équipe dans son propre espace. Politiques, données, accès — tout est isolé et contrôlé.' },
  { icon:'◉', title:'Hébergé au Canada', desc:'Données en ca-central-1. Souveraineté numérique. Rien ne quitte le Canada sans autorisation explicite.' },
]

const WORKFLOW = [
  'Admin importe le rapport AR',
  'L\'IA segmente par risque et langue',
  'OMNI génère les brouillons FR/EN',
  'Le Policy Engine évalue chaque action',
  'L\'approbateur valide avant envoi',
  'Audit trail complet enregistré',
]

export default function LandingPage() {
  const [done, setDone] = useState(false)
  const [statsVis, setStatsVis] = useState(false)
  useEffect(() => { if (done) setTimeout(() => setStatsVis(true), 400) }, [done])

  return (
    <>
      <style>{`
        @keyframes metalShimmer { 0%{background-position:100% 50%} 50%{background-position:0% 50%} 100%{background-position:100% 50%} }
        @keyframes soldierMarch { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-3px)} }
        @keyframes glow { 0%,100%{opacity:0.55} 50%{opacity:1} }
        @keyframes borderPulse { 0%,100%{border-color:rgba(63,185,80,0.2);box-shadow:none} 50%{border-color:rgba(157,255,178,0.45);box-shadow:0 0 18px rgba(63,185,80,0.2)} }
      `}</style>

      {!done && <IntroAnimation onComplete={() => setDone(true)} />}

      <div style={{ background:'var(--background)', minHeight:'100vh', color:'var(--text-primary)', opacity: done ? 1 : 0, transition:'opacity 0.5s ease' }}>

        {/* Nav */}
        <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 48px', borderBottom:'1px solid var(--border)', position:'sticky', top:0, background:'rgba(8,11,15,0.92)', backdropFilter:'blur(14px)', zIndex:100 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:33, height:33, background:'linear-gradient(135deg,#1a6b28 0%,#3fb950 50%,#9dffb2 100%)', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 14px rgba(63,185,80,0.4)' }}>
              <ShieldLock size={18} dark />
            </div>
            <span style={{ fontWeight:800, fontSize:17, letterSpacing:'0.06em', background: MG.gradient, backgroundSize:'200% 100%', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', animation:'metalShimmer 5s ease-in-out infinite' }}>BASTION</span>
            <span style={{ background:'rgba(63,185,80,0.1)', border: MG.border, borderRadius:4, padding:'2px 7px', color:'#3fb950', fontSize:10, fontWeight:700, letterSpacing:'0.06em' }}>BETA</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <span style={{ color:'var(--text-muted)', fontSize:13 }}>Collections Operator V1</span>
            <MetallicButton href="/login">Accéder →</MetallicButton>
          </div>
        </nav>

        {/* Hero */}
        <section style={{ padding:'96px 48px 72px', maxWidth:920, margin:'0 auto', textAlign:'center' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(63,185,80,0.07)', border: MG.border, borderRadius:20, padding:'6px 16px', marginBottom:36, animation:'borderPulse 3s ease-in-out infinite' }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#3fb950', display:'inline-block', animation:'glow 1.8s ease infinite' }}/>
            <span style={{ color:'#3fb950', fontSize:12, fontWeight:600 }}>Canada-first · Québec/Ontario · Conforme Loi 25</span>
          </div>
          <h1 style={{ fontSize:60, fontWeight:800, letterSpacing:'-0.04em', lineHeight:1.05, marginBottom:24 }}>
            <span style={{ background:'linear-gradient(180deg,#e6edf3 0%,#8b949e 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Déployez l'IA dans vos workflows.<br/></span>
            <span style={{ background: MG.gradient, backgroundSize:'300% 100%', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', animation:'metalShimmer 4s ease-in-out infinite' }}>Restez en contrôle.</span>
          </h1>
          <p style={{ color:'var(--text-secondary)', fontSize:18, lineHeight:1.7, maxWidth:600, margin:'0 auto 40px' }}>
            BASTION permet aux équipes canadiennes de déployer des opérateurs IA — avec politiques d'accès, approbations humaines, audit trail, et support bilingue FR/EN.
          </p>
          <div style={{ display:'flex', justifyContent:'center', gap:12, flexWrap:'wrap' }}>
            <MetallicButton href="/login">Accéder à la console →</MetallicButton>
            <a href="#workflow" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'var(--surface)', border:'1px solid var(--border-2)', color:'var(--text-primary)', borderRadius:10, padding:'13px 28px', fontSize:15, fontWeight:500, textDecoration:'none' }}>Voir le workflow</a>
          </div>
        </section>

        {/* Stats */}
        <div style={{ borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)', padding:'28px 48px', display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:24, maxWidth:1000, margin:'0 auto' }}>
          {statsVis && <>
            <AnimatedStat value="100%" label="Approbation humaine avant envoi" delay={0} />
            <AnimatedStat value="0" label="Actions sans audit trail" delay={200} />
            <AnimatedStat value="FR/EN" label="Bilingue natif" delay={400} />
            <CanadaStat delay={600} />
          </>}
        </div>

        {/* Workflow */}
        <section id="workflow" style={{ padding:'80px 48px', maxWidth:900, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:48 }}>
            <p style={{ color:'var(--text-muted)', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12 }}>Collections Operator</p>
            <h2 style={{ fontSize:34, fontWeight:700, letterSpacing:'-0.03em', marginBottom:14 }}>De l'aging report à l'email envoyé</h2>
          </div>
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
            {WORKFLOW.map((step, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:16, padding:'18px 24px', borderBottom: i < WORKFLOW.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width:30, height:30, borderRadius:8, flexShrink:0, background: i===4 ? 'rgba(63,185,80,0.08)' : 'var(--surface-2)', border: i===4 ? MG.border : '1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', color: i===4 ? '#3fb950' : 'var(--text-muted)', fontSize:12, fontWeight:700 }}>{i+1}</div>
                <span style={{ fontSize:14, fontWeight: i===4 ? 600 : 400, background: i===4 ? MG.gradient : undefined, backgroundSize: i===4 ? '300% 100%' : undefined, WebkitBackgroundClip: i===4 ? 'text' : undefined, WebkitTextFillColor: i===4 ? 'transparent' : undefined, color: i===4 ? undefined : 'var(--text-secondary)', animation: i===4 ? 'metalShimmer 3s ease-in-out infinite' : undefined }}>{step}</span>
                {i===4 && <span style={{ marginLeft:'auto', display:'inline-flex', alignItems:'center', gap:5, background:'rgba(63,185,80,0.07)', border: MG.border, borderRadius:5, padding:'3px 10px', color:'#3fb950', fontSize:11, fontWeight:600, animation:'borderPulse 2.5s ease-in-out infinite' }}>✓ Contrôle humain</span>}
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section style={{ padding:'0 48px 80px', maxWidth:1000, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:48 }}>
            <h2 style={{ fontSize:34, fontWeight:700, letterSpacing:'-0.03em', marginBottom:14 }}>Construit pour la confiance</h2>
            <p style={{ color:'var(--text-secondary)', fontSize:15 }}>Pas un chatbot. Un système d'exécution sécurisé pour opérations réelles.</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
            {FEATURES.map(f => (
              <div key={f.title}
                style={{ background:'var(--surface)', borderRadius:12, padding:'22px', border:'1px solid var(--border)', transition:'border-color 0.3s, box-shadow 0.3s' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor='rgba(63,185,80,0.3)'; el.style.boxShadow='0 0 22px rgba(63,185,80,0.08)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor='var(--border)'; el.style.boxShadow='none' }}
              >
                <div style={{ fontSize:20, marginBottom:12, background: MG.gradient, backgroundSize:'200% 100%', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', animation:'metalShimmer 4s ease-in-out infinite', display:'inline-block' }}>{f.icon}</div>
                <h3 style={{ fontSize:15, fontWeight:600, marginBottom:8 }}>{f.title}</h3>
                <p style={{ color:'var(--text-secondary)', fontSize:13, lineHeight:1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section style={{ maxWidth:860, margin:'0 auto 80px', padding:'0 48px' }}>
          <div style={{ background:'linear-gradient(135deg,rgba(63,185,80,0.05),rgba(88,166,255,0.03))', border: MG.border, borderRadius:16, padding:'52px 48px', textAlign:'center', animation:'borderPulse 4s ease-in-out infinite' }}>
            <div style={{ width:50, height:50, borderRadius:14, margin:'0 auto 20px', background:'linear-gradient(135deg,#1a6b28,#3fb950 50%,#9dffb2)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow: MG.glow }}>
              <ShieldLock size={26} dark />
            </div>
            <h2 style={{ fontSize:28, fontWeight:700, letterSpacing:'-0.03em', marginBottom:12 }}>Prêt à déployer votre Collections Operator?</h2>
            <p style={{ color:'var(--text-secondary)', fontSize:15, maxWidth:460, margin:'0 auto 32px' }}>Importez votre rapport AR et laissez BASTION gérer les relances — sous votre contrôle total.</p>
            <MetallicButton href="/login">Accéder à la console →</MetallicButton>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ borderTop:'1px solid var(--border)', padding:'24px 48px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:24, height:24, borderRadius:7, background:'linear-gradient(135deg,#1a6b28,#3fb950 60%,#9dffb2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <ShieldLock size={13} dark />
            </div>
            <span style={{ fontWeight:700, fontSize:13, letterSpacing:'0.06em', background: MG.gradient, backgroundSize:'200% 100%', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', animation:'metalShimmer 6s ease-in-out infinite' }}>BASTION</span>
          </div>
          <p style={{ color:'var(--text-muted)', fontSize:12 }}>Powered by OMNI · Données hébergées au Canada · Conforme Loi 25 / PIPEDA</p>
          <Link href="/login" style={{ color:'var(--text-muted)', fontSize:12, textDecoration:'none' }}>Connexion →</Link>
        </footer>
      </div>
    </>
  )
}
