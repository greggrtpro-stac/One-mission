import { createIcons, icons as lucideIcons } from 'lucide'
import { Lock } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { DemoEngine } from './demoEngine'

/**
 * Mockup interactif embarqué sous le hero : une fausse fenêtre de navigateur
 * contenant une reproduction jouable du dashboard (données fictives, 100 %
 * locale). Le rendu lui-même est délégué à `DemoEngine`, porté depuis
 * l'export Claude Design — voir demoEngine.ts.
 */
export function InteractiveDemo() {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const engine = new DemoEngine(() => createIcons({ icons: lucideIcons }))
    engine.mount(root)
    return () => engine.destroy(root)
  }, [])

  return (
    <div
      ref={rootRef}
      className="omd-root"
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 1180,
        margin: '0 auto',
        border: '1px solid rgba(255,255,255,.11)',
        borderRadius: 20,
        background: '#0b0b0f',
        overflow: 'hidden',
        boxShadow: '0 80px 200px -50px rgba(139,92,246,.55), 0 40px 100px -40px rgba(0,0,0,.95)',
        color: '#f6f6f4',
        animation: 'omRiseFlat .8s cubic-bezier(.16,1,.3,1) both',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          height: 48,
          borderBottom: '1px solid rgba(255,255,255,.07)',
          padding: '0 18px',
          background: '#0e0e13',
        }}
      >
        <span style={{ width: 12, height: 12, borderRadius: 99, background: 'rgba(255,255,255,.14)' }} />
        <span style={{ width: 12, height: 12, borderRadius: 99, background: 'rgba(255,255,255,.14)' }} />
        <span style={{ width: 12, height: 12, borderRadius: 99, background: 'rgba(255,255,255,.14)' }} />
        <div
          style={{
            marginLeft: 14,
            flex: 1,
            maxWidth: 460,
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            height: 30,
            borderRadius: 8,
            background: 'rgba(255,255,255,.05)',
            border: '1px solid rgba(255,255,255,.07)',
            padding: '0 12px',
          }}
        >
          <svg width={15} height={15} viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="17" stroke="#f6f6f4" strokeWidth="5" strokeLinecap="round" strokeDasharray="70 36.8" transform="rotate(-90 24 24)" />
            <circle cx="24" cy="24" r="17" stroke="#8b5cf6" strokeWidth="5" strokeLinecap="round" strokeDasharray="17 89.8" transform="rotate(66 24 24)" />
            <circle cx="24" cy="24" r="5.5" fill="#8b5cf6" />
          </svg>
          <Lock size={11} color="#55555e" />
          <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12, color: '#c9c9d0' }}>one-mission.fr</span>
        </div>
        <div style={{ flex: 1 }} />
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            height: 24,
            borderRadius: 999,
            border: '1px solid rgba(139,92,246,.3)',
            background: 'rgba(139,92,246,.08)',
            padding: '0 9px',
            fontSize: 10.5,
            fontWeight: 600,
            color: '#c4b5fd',
          }}
        >
          Démo
        </span>
      </div>
      <div style={{ display: 'flex', height: 812 }}>
        <aside
          className="omd-navbar"
          style={{ width: 236, flex: 'none', borderRight: '1px solid rgba(255,255,255,.07)', padding: '16px 12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        />
        <div className="omd-content" style={{ flex: 1, minWidth: 0, padding: '26px 28px' }} />
      </div>
    </div>
  )
}
