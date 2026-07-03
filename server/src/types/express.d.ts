/** Champs ajoutés à la requête Express par nos middlewares. */
declare namespace Express {
  interface Request {
    /** Id de l'utilisateur authentifié (posé par requireAuth). */
    userId?: string
  }
}
