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
import Notificaciones from './pages/Notificaciones'
import Barberias from './pages/Barberias'

const IconMenu = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
)

function ProtectedContent({ user }) {
  const { barberiaId, loading, isSuperAdmin, barberia } = useBarberia()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [headerHidden, setHeaderHidden] = useState(false)

  useEffect(() => {
    let lastY = window.scrollY
    function onScroll() {
      const y = window.scrollY
      setHeaderHidden(y > lastY && y > 40)
      lastY = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--color-on-surface-var)' }}>
      Cargando...
    </div>
  )

  if (!barberiaId && !isSuperAdmin) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, height: '100vh' }}>
      <p style={{ color: 'var(--color-error)' }}>Este usuario no tiene acceso a ninguna barbería.</p>
      <button className="btn-ghost" onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
    </div>
  )

  return (
    <>
      <header className={`mobile-header${headerHidden ? ' mobile-header--hidden' : ''}`}>
        <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Abrir menú">
          <IconMenu />
        </button>
        <span className="mobile-header-title">{barberia?.nombre ?? 'Admin'}</span>
      </header>
      <div className="admin-layout">
        <Sidebar user={user} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="main-content">
          <Routes>
            <Route path="/calendario" element={<Calendario />} />
            <Route path="/citas" element={<Citas />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/servicios" element={<Servicios />} />
            <Route path="/equipo" element={<Equipo />} />
            <Route path="/horario" element={<Horario />} />
            <Route path="/cierres" element={<Cierres />} />
            <Route path="/notificaciones" element={<Notificaciones />} />
            <Route path="/ajustes" element={<Ajustes />} />
            <Route path="/barberias" element={<Barberias />} />
            <Route path="*" element={<Navigate to={barberiaId ? "/calendario" : "/barberias"} replace />} />
          </Routes>
        </main>
      </div>
    </>
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
