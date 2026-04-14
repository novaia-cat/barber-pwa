import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const BarberiaContext = createContext(null)

export function BarberiaProvider({ user, children }) {
  const [barberia, setBarberia] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('barberias')
      .select('*')
      .eq('auth_user_id', user.id)
      .single()
      .then(({ data }) => {
        setBarberia(data ?? null)
        setLoading(false)
      })
  }, [user.id])

  return (
    <BarberiaContext.Provider value={{ barberia, barberiaId: barberia?.id ?? null, loading, setBarberia }}>
      {children}
    </BarberiaContext.Provider>
  )
}

export function useBarberia() {
  return useContext(BarberiaContext)
}
