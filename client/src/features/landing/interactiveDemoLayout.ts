/**
 * Constantes de mise à l'échelle partagées entre InteractiveDemoDesktop et
 * InteractiveDemoMobileStatic — les deux variantes doivent rendre le mockup
 * à l'identique (mêmes dimensions, même seuil de bascule en défilement
 * horizontal), seul le mécanisme de calcul (réactif vs figé une fois) diffère.
 */

/** Largeur de conception du mockup (mise en page interne entièrement en
 *  pixels fixes). Ne JAMAIS la remplacer par une largeur fluide (%). */
export const DESIGN_WIDTH = 1180

/** Sous ce seuil de largeur rendue, on arrête de réduire l'échelle (zones
 *  tactiles trop petites) et on bascule en défilement horizontal — voir
 *  InteractiveDemoDesktop pour le détail du compromis. */
export const MIN_COMFORTABLE_RENDERED_WIDTH = 780
export const MIN_SCALE = MIN_COMFORTABLE_RENDERED_WIDTH / DESIGN_WIDTH

/** Précision de l'échelle après arrondi (4 décimales). */
export const SCALE_PRECISION = 10_000

/**
 * Hauteur naturelle (à l'échelle 1) du mockup : 48px d'en-tête + 812px de
 * ligne de contenu, toutes deux fixées en dur dans le JSX et jamais
 * dépendantes du contenu (le contenu déborde en `overflow:hidden`, il ne
 * peut jamais agrandir la boîte). Constante déterministe — aucune mesure du
 * DOM n'est nécessaire pour la connaître.
 */
export const NATURAL_HEIGHT = 860
