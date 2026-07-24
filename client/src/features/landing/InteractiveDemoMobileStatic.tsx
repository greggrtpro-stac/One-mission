import { createIcons, icons as lucideIcons } from 'lucide'
import { DemoEngine } from './demoEngine'
import { DESIGN_WIDTH, NATURAL_HEIGHT } from './interactiveDemoLayout'

/** Largeur (en px de design, avant échelle) de la sidebar — voir InteractiveDemoDesktop, fixée en dur dans le JSX ci-dessous. */
const SIDEBAR_WIDTH = 236

/**
 * Contrairement à InteractiveDemoDesktop, ce mockup n'est jamais interactif
 * (pointer-events:none, aucun listener) : le plancher d'échelle MIN_SCALE
 * partagé — pensé pour garder des zones tactiles atteignables au doigt — ne
 * s'applique donc pas ici.
 *
 * Cadrage « vitrine » : on choisit l'échelle pour que cette largeur de
 * design tienne dans la fenêtre visible. Les cartes de stats (Niveau, Série,
 * DeepWork, Sans addiction) forment une grille sur 4 colonnes égales qui
 * occupe TOUTE la largeur du contenu, jusqu'au même bord droit que la
 * colonne « Progression / Citation du jour » juste en dessous : les deux
 * partagent donc exactement le même bord droit, il est géométriquement
 * impossible de rogner l'un sans rogner l'autre. Pour ne jamais couper les
 * cartes du haut, la cible est donc la largeur du design ENTIÈRE (1180px) —
 * la colonne de droite se retrouve de facto intégralement visible elle
 * aussi. Le reste (au-delà de ce qui rentre) déborde à droite et est rogné
 * (overflow:hidden, jamais scrollable) — jamais la sidebar, ancrée à gauche
 * (voir `applyStaticLayout` : pas de centrage).
 */
const TARGET_VISIBLE_DESIGN_WIDTH = DESIGN_WIDTH

/**
 * Variante MOBILE (écran tactile) du mockup : une simple vitrine figée sur
 * l'écran "Tableau de bord", sans la moindre interactivité — stratégie
 * « Linear » adoptée après un crash WebKit au pincer-zoomer sur iOS Safari
 * qui persistait malgré la suppression des animations (voir l'historique de
 * bissection sur la branche).
 *
 * Contrairement à InteractiveDemoDesktop, ce composant :
 * - ne contient aucun useState ni useEffect (donc aucun re-rendu possible
 *   après le montage) ;
 * - n'attache aucun listener (ni clic, ni clavier, ni resize, ni scroll) —
 *   le HTML du tableau de bord garde ses attributs `data-act` de l'export
 *   d'origine, mais rien ne les interprète : cliquer dessus ne fait rien ;
 * - ne crée ni ResizeObserver, ni requestAnimationFrame, ni timer ;
 * - n'anime rien (pas de transition, pas de keyframes).
 *
 * Le HTML du tableau de bord est produit par `DemoEngine.renderStaticDashboard()`
 * — exactement la même fonction de rendu que la variante desktop, appelée une
 * seule fois sur l'état par défaut — pour garantir un rendu visuel identique
 * sans dupliquer le template à la main.
 *
 * La seule lecture du DOM (largeur disponible, pour reproduire la même
 * échelle que le desktop) se fait via un `ref` callback : une fonction
 * simple, pas un hook, invoquée une seule fois par React à l'attachement du
 * nœud, qui applique le style directement (mutation DOM impérative, sans
 * `setState`) puis ne fait plus jamais rien. Aucune boucle de recalcul n'est
 * possible puisque rien n'observe quoi que ce soit après ce point.
 */
export function InteractiveDemoMobileStatic() {
  const { navHtml, contentHtml } = new DemoEngine(() => {}).renderStaticDashboard()

  function applyStaticLayout(wrapper: HTMLDivElement | null) {
    if (!wrapper) return
    const rootEl = wrapper.querySelector<HTMLDivElement>('.omd-root')
    if (!rootEl) return

    const availableWidth = wrapper.clientWidth
    // Plafond défensif : quel que soit le réglage de TARGET_VISIBLE_DESIGN_WIDTH,
    // la sidebar (236px) ne doit jamais dépasser la fenêtre visible — sinon
    // elle serait elle-même rognée, ce qui est exclu.
    const maxScaleForSidebar = availableWidth > 0 ? availableWidth / SIDEBAR_WIDTH : 1
    const targetScale = availableWidth > 0 ? availableWidth / TARGET_VISIBLE_DESIGN_WIDTH : 1
    const scale = Math.min(1, targetScale, maxScaleForSidebar)

    wrapper.style.height = `${NATURAL_HEIGHT * scale}px`
    // Ancré à gauche (jamais centré) : ce qui déborde est toujours coupé à
    // droite, jamais du côté de la sidebar.
    rootEl.style.transform = `scale(${scale})`

    // Les icônes (<i data-lucide>) ne sont converties en SVG qu'ici, une
    // seule fois, après l'insertion du HTML dans le DOM — même mécanisme que
    // la variante desktop, jamais répété ensuite.
    createIcons({ icons: lucideIcons })
  }

  return (
    <div
      ref={applyStaticLayout}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: DESIGN_WIDTH,
        margin: '0 auto',
        height: NATURAL_HEIGHT,
        // Toujours masqué, jamais 'auto' : aucun débordement du mockup ne
        // doit être atteignable, y compris par défilement horizontal.
        overflow: 'hidden',
        // Même correctif que la variante desktop pour le bug WebKit de
        // recadrage d'un descendant transformé sous un ancêtre
        // overflow:hidden distant — indépendant du crash au pincer-zoomer.
        isolation: 'isolate',
      }}
    >
      <div
        className="omd-root"
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: DESIGN_WIDTH,
          transform: 'scale(1)',
          transformOrigin: 'top left',
          border: '1px solid rgba(255,255,255,.11)',
          borderRadius: 20,
          background: '#0b0b0f',
          overflow: 'hidden',
          boxShadow: '0 80px 200px -50px rgba(139,92,246,.55), 0 40px 100px -40px rgba(0,0,0,.95)',
          color: '#f6f6f4',
          pointerEvents: 'none',
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
            dangerouslySetInnerHTML={{ __html: navHtml }}
          />
          <div
            className="omd-content"
            style={{ flex: 1, minWidth: 0, padding: '26px 28px' }}
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
        </div>
      </div>
    </div>
  )
}
