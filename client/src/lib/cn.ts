import { clsx, type ClassValue } from 'clsx'

/** Concatène des classes conditionnelles (wrapper clsx). */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}
