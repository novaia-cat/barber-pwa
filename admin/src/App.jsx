import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Calendario from './pages/Calendario'
import Citas from './pages/Citas'
import Clientes from './pages/Clientes'
import Servicios from './pages/Servicios'
import Equipo from './pages/Equipo'
import Horario from './pages/Horario'

function ProtectedLayout({ user }) {
  if (!user) return <Navigate to="/login" replace />
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
          <Route path="*" element={<Navigate to="/calendario" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(undefined) // undefined = cargando

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (user === undefined) return null // splash mínimo mientras carga sesión

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/calendario" replace /> : <Login />} />
        <Route path="/*" element={<ProtectedLayout user={user} />} />
      </Routes>
    </BrowserRouter>
  )
}
