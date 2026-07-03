import type { NextFunction, Request, Response } from 'express'
import type { ZodType } from 'zod'

/** Valide et normalise req.body ; une ZodError part au errorHandler (400). */
export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body)
    next()
  }
}
