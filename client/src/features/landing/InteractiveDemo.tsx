import { useState } from 'react'
import { InteractiveDemoDesktop } from './InteractiveDemoDesktop'
import { InteractiveDemoMobileStatic } from './InteractiveDemoMobileStatic'

/**
 * `(hover: none) and (pointer: coarse)` cible les écrans tactiles (mobile,
 * tablette) sans dépendre d'une largeur de viewport : contrairement à un
 * seuil en px, ce media query ne change pas de valeur pendant un
 * pincer-zoomer, donc lire cette valeur UNE SEULE FOIS au montage (sans
 * listener) ne peut jamais faire basculer l'aiguillage en cours de geste.
 */
function isCoarsePointer(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches
}

/**
 * Aiguillage entre les deux variantes du mockup interactif : desktop
 * (interactive, animée, recalculée au resize) et mobile (vitrine figée sur
 * le tableau de bord, sans aucune interactivité — voir
 * InteractiveDemoMobileStatic.tsx pour la raison : un crash WebKit au
 * pincer-zoomer sur iOS Safari qui persistait malgré la suppression des
 * animations). Décidé une seule fois au montage, jamais réévalué ensuite.
 */
export function InteractiveDemo() {
  const [isMobile] = useState(isCoarsePointer)
  return isMobile ? <InteractiveDemoMobileStatic /> : <InteractiveDemoDesktop />
}
