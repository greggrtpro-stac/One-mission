import { createIcons, icons as lucideIcons } from 'lucide'
import { Lock } from 'lucide-react'
import { useLayoutEffect, useEffect, useRef, useState } from 'react'
import { DemoEngine } from './demoEngine'
import { DESIGN_WIDTH, MIN_SCALE, SCALE_PRECISION } from './interactiveDemoLayout'

interface Measurements {
  scale: number
  naturalHeight: number
  needsHScroll: boolean
}

/**
 * Variante DESKTOP (pointeur fin, souris) du mockup interactif embarqué sous
 * le hero : une fausse fenêtre de navigateur contenant une reproduction
 * jouable du dashboard (données fictives, 100 % locale). Le rendu lui-même
 * est délégué à `DemoEngine`, porté depuis l'export Claude Design — voir
 * demoEngine.ts.
 *
 * Sur écran tactile (mobile/tablette), c'est InteractiveDemoMobile qui est
 * rendu à la place — voir InteractiveDemo.tsx pour l'aiguillage. Cette
 * variante-ci recalcule son échelle en continu (ResizeObserver), ce qui est
 * précisément ce que la variante mobile évite pour ne pas reproduire le
 * crash WebKit au pincer-zoomer (voir le commentaire d'architecture
 * ci-dessous).
 *
 * Sur les écrans plus étroits que DESIGN_WIDTH (mobile, tablette), le
 * mockup n'est jamais reflow-é : il garde sa largeur de conception fixe et
 * est réduit dans son ensemble via `transform: scale()`, exactement comme un
 * zoom arrière — proportions, mise en page et interactivité identiques au
 * rendu desktop. En dessous de MIN_SCALE (petits téléphones), il n'est plus
 * réduit davantage : la fenêtre de lecture défile horizontalement à la place.
 *
 * Architecture de mesure (important — évite un crash WebKit au pincer-zoomer
 * iOS Safari constaté en production) :
 *
 * Un `ResizeObserver` ne DOIT jamais observer un élément dont une propriété
 * de mise en page (ici la hauteur) est elle-même dérivée du state qu'il
 * alimente — sinon chaque `setState` produit un nouveau layout, que
 * l'observateur détecte à son tour, etc. C'est exactement ce qui se
 * produisait ici : `outer` était à la fois observé ET sa hauteur
 * (`naturalHeight * scale`) dépendait du résultat de cette observation. En
 * usage normal, les deux mesures consécutives sont identiques et React
 * n'effectue aucun re-rendu (bail-out sur state inchangé) — mais un
 * pincer-zoomer sur iOS Safari relayoute en continu à des niveaux de zoom
 * fractionnaires, et deux mesures peuvent alors différer d'un sous-pixel,
 * ce qui suffit à faire repartir le cycle en rafale et à faire planter le
 * renderer.
 *
 * Trois garde-fous indépendants suppriment cette possibilité :
 * 1. `measureRef` est un élément dédié à la SEULE mesure de largeur : sa
 *    hauteur est fixe (0), jamais dérivée d'un state — il ne peut donc
 *    jamais réagir à ses propres conséquences.
 * 2. Le callback du `ResizeObserver` ne fait plus AUCUN `setState` : il ne
 *    fait que planifier un `requestAnimationFrame`, qui regroupe toute
 *    rafale de déclenchements (aussi nombreux soient-ils) en un seul calcul
 *    par frame.
 * 3. Ce calcul arrondit les valeurs puis les compare strictement à la
 *    dernière valeur réellement appliquée (`appliedRef`) : si rien n'a
 *    changé, aucun `setState` n'est déclenché — quel que soit le nombre
 *    d'invocations du `ResizeObserver`.
 */
export function InteractiveDemoDesktop() {
  const rootRef = useRef<HTMLDivElement>(null)
  const outerRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [naturalHeight, setNaturalHeight] = useState(860)
  const [needsHScroll, setNeedsHScroll] = useState(false)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const engine = new DemoEngine(() => createIcons({ icons: lucideIcons }))
    engine.mount(root)
    return () => engine.destroy(root)
  }, [])

  useLayoutEffect(() => {
    const measure = measureRef.current
    const root = rootRef.current
    if (!measure || !root) return

    const appliedRef: { current: Measurements } = { current: { scale, naturalHeight, needsHScroll } }
    let rafId: number | null = null

    /** Calcule les nouvelles valeurs et ne touche React que si elles diffèrent réellement de ce qui est déjà affiché. */
    function apply() {
      rafId = null
      const measureEl = measureRef.current
      const rootEl = rootRef.current
      if (!measureEl || !rootEl) return

      const nextHeight = Math.round(rootEl.offsetHeight)
      const availableWidth = measureEl.clientWidth

      let nextScale: number
      let nextNeedsHScroll: boolean
      if (availableWidth <= 0) {
        nextScale = 1
        nextNeedsHScroll = false
      } else {
        const fitScale = availableWidth / DESIGN_WIDTH
        const clamped = Math.min(1, Math.max(fitScale, MIN_SCALE))
        nextScale = Math.round(clamped * SCALE_PRECISION) / SCALE_PRECISION
        nextNeedsHScroll = nextScale > fitScale + 0.001
      }

      const prev = appliedRef.current
      if (
        prev.scale === nextScale &&
        prev.naturalHeight === nextHeight &&
        prev.needsHScroll === nextNeedsHScroll
      ) {
        return // valeurs identiques à ce qui est déjà à l'écran : aucun setState.
      }

      appliedRef.current = { scale: nextScale, naturalHeight: nextHeight, needsHScroll: nextNeedsHScroll }
      setScale(nextScale)
      setNaturalHeight(nextHeight)
      setNeedsHScroll(nextNeedsHScroll)
    }

    /** Le ResizeObserver ne fait QUE planifier — jamais de setState ici. Une
     *  rafale de déclenchements (ex. pincer-zoomer continu) ne produit
     *  jamais plus d'un calcul par frame, grâce au garde `rafId`. */
    function scheduleApply() {
      if (rafId !== null) return
      rafId = requestAnimationFrame(apply)
    }

    scheduleApply()
    const observer = new ResizeObserver(scheduleApply)
    observer.observe(measure)
    observer.observe(root)
    return () => {
      observer.disconnect()
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- appliedRef capture volontairement figée au montage, mise à jour par ref ensuite.
  }, [])

  return (
    <div
      ref={outerRef}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: DESIGN_WIDTH,
        margin: '0 auto',
        height: naturalHeight * scale,
        // Le plancher tactile (MIN_SCALE) peut rendre .omd-root plus large
        // que cette fenêtre : dans ce cas seulement, elle devient la zone de
        // défilement horizontal. Le cas "tout tient" (desktop/tablette,
        // overflow visible par défaut) reste strictement inchangé.
        overflowX: needsHScroll ? 'auto' : 'visible',
        overflowY: needsHScroll ? 'auto' : 'visible',
        WebkitOverflowScrolling: 'touch',
        // isolation:isolate — Safari/WebKit a un bug documenté et connu où un
        // ancêtre `overflow: hidden` distant (ici .landing-page) ne recadre
        // pas correctement un descendant transformé (notre .omd-root mis à
        // l'échelle) : selon la version, il l'affiche décalé/tronqué au lieu
        // de simplement le montrer réduit. Isoler ici crée un contexte
        // d'empilement propre exactement où vit le transform, ce qui est le
        // correctif documenté qui fonctionne dans tous les navigateurs.
        isolation: 'isolate',
        // L'animation d'entrée (CSS, anime transform:translateY) vit sur ce
        // wrapper plutôt que sur .omd-root : les deux ne peuvent pas partager
        // la propriété `transform` — une animation avec fill-mode "both"
        // écraserait silencieusement et définitivement le transform de
        // centrage/échelle de .omd-root une fois terminée.
        animation: 'omRiseFlat .8s cubic-bezier(.16,1,.3,1) both',
      }}
    >
      {/* Cible de mesure de largeur, seule observée pour la largeur : hauteur
          fixe (0), jamais dérivée d'un state — ne peut jamais réagir à ses
          propres conséquences (voir le commentaire d'architecture ci-dessus). */}
      <div
        ref={measureRef}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 0, pointerEvents: 'none' }}
      />
      <div
        ref={rootRef}
        className="omd-root"
        style={{
          position: 'absolute',
          top: 0,
          // Centré (left:50% + translateX(-50%)) quand tout tient dans la
          // fenêtre. Dès que le plancher tactile force un débordement, un
          // centrage laisserait la moitié gauche du mockup inaccessible (un
          // conteneur à défilement ne scrolle jamais "avant" son point de
          // départ) : on ancre alors à gauche pour que le défilement révèle
          // naturellement la suite vers la droite, comme sur desktop.
          left: needsHScroll ? 0 : '50%',
          width: DESIGN_WIDTH,
          transform: needsHScroll ? `scale(${scale})` : `translateX(-50%) scale(${scale})`,
          transformOrigin: needsHScroll ? 'top left' : 'top center',
          // will-change:transform force son propre calque de composition
          // dès le premier rendu sur WebKit mobile — complément défensif au
          // isolation:isolate du parent pour ce même bug de rendu Safari.
          willChange: 'transform',
          border: '1px solid rgba(255,255,255,.11)',
          borderRadius: 20,
          background: '#0b0b0f',
          overflow: 'hidden',
          boxShadow: '0 80px 200px -50px rgba(139,92,246,.55), 0 40px 100px -40px rgba(0,0,0,.95)',
          color: '#f6f6f4',
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
    </div>
  )
}
