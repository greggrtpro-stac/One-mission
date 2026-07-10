import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Input, type InputProps } from './Input'

/** Champ mot de passe avec l'œil afficher/masquer, mêmes props que Input. */
export function PasswordInput(props: Omit<InputProps, 'type' | 'trailing'>) {
  const [visible, setVisible] = useState(false)
  return (
    <Input
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          title={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          className="flex size-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-3 hover:text-ink"
          tabIndex={-1}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      }
    />
  )
}
