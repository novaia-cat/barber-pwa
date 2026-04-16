import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const BarberiaContext = createContext(null)

const SUPER_ADMIN_EMAIL = 'holanovaia@gmail.com'

export function BarberiaProvider({ user, children }) {
  const [barberia, setBarberia] = useState(null)
  const [allBarberias, setAllBarberias] = useState([])
  const [loading, setLoading] = useState(true)

  const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('barberias')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()
      setBarberia(data ?? null)

      if (isSuperAdmin) {
        const { data: all } = await supabase
          .from('barberias')
          .select('*')
          .order('nombre')
        setAllBarberias(all ?? [])
      }
      setLoading(false)
    }
    load()
  }, [user.id, isSuperAdmin])

  function switchBarberia(id) {
    const found = allBarberias.find(b => b.id === id)
    if (found) setBarberia(found)
  }

  return (
    <BarberiaContext.Provider value={{
      barberia, barberiaId: barberia?.id ?? null, loading, setBarberia,
      isSuperAdmin, allBarberias, setAllBarberias, switchBarberia
    }}>
      {children}
    </BarberiaContext.Provider>
  )
}

export function useBarberia() {
  return useContext(BarberiaContext)
}
