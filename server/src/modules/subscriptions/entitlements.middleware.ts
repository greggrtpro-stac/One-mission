import {
  getFeature,
  planIncludes,
  type FeatureKey,
  type UpgradeRequiredDetails,
} from '@one-mission/shared'
import type { NextFunction, Request, Response } from 'express'
import { getUserId } from '../../middleware/auth.js'
import { ApiError } from '../../middleware/error.js'
import { getEffectivePlan } from './subscriptions.service.js'

/**
 * Garde d'accès par abonnement, à placer derrière requireAuth.
 * Protéger une nouvelle fonctionnalité = la déclarer dans le catalogue
 * partagé (FEATURES) puis poser `requireFeature('<clé>')` sur ses routes.
 *
 * En cas de refus : 403 UPGRADE_REQUIRED avec l'offre requise dans
 * `details`, que le client transforme en invitation à passer sur Level Up.
 */
export function requireFeature(key: FeatureKey) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const currentPlan = await getEffectivePlan(getUserId(req))
    if (!planIncludes(currentPlan, key)) {
      const feature = getFeature(key)
      const details: UpgradeRequiredDetails = {
        feature: key,
        requiredPlan: feature.minPlan,
        currentPlan,
      }
      throw new ApiError(
        403,
        `« ${feature.label} » nécessite l'offre ${feature.minPlan}`,
        'UPGRADE_REQUIRED',
        details,
      )
    }
    next()
  }
}
