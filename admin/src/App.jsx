import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { BarberiaProvider, useBarberia } from './lib/BarberiaContext'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Calendario from './pages/Calendario'
import Citas from './pages/Citas'
import Clientes from './pages/Clientes'
import Servicios from './pages/Servicios'
import Equipo from './pages/Equipo'
import Horario from './pages/Horario'
import Ajustes from './pages/Ajustes'
import Cierres from './pages/Cierres'

function ProtectedContent({ user }) {
  const { barberiaId, loading } = useBarberia()

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--color-on-surface-var)' }}>
      Cargando...
    </div>
  )

  if (!barberiaId) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, height: '100vh' }}>
      <p style={{ color: 'var(--color-error)' }}>Este usuario no tiene acceso a ninguna barbería.</p>
      <button className="btn-ghost" onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
    </div>
  )

  return (
    <div className="admin-layout">
      <Sidebar user={user} />
      <main className="main-content">
        <Routes>
          <Route path="/calendario" element={<Calendario />} />
          <Route path="/citas" element={<Citas />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/servicios" element={<Servicios />} />
          <Route path="/equipo" element={<Equipo />} />
          <Route path="/horario" element={<Horario />} />
          <Route path="/cierres" element={<Cierres />} />
          <Route path="/ajustes" element={<Ajustes />} />
          <Route path="*" element={<Navigate to="/calendario" replace />} />
        </Routes>
      </main>
    </div>
  )
}

function ProtectedLayout({ user }) {
  if (!user) return <Navigate to="/login" replace />
  return (
    <BarberiaProvider user={user}>
      <ProtectedContent user={user} />
    </BarberiaProvider>
  )
}

export default function App() {
  const [user, setUser] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (user === undefined) return null

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/calendario" replace /> : <Login />} />
        <Route path="/*" element={<ProtectedLayout user={user} />} />
      </Routes>
    </BrowserRouter>
  )
}
