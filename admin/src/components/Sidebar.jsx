import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const IconCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)

const IconCitas = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
)

const IconClientes = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

const IconServicios = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
  </svg>
)

const IconLogout = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)

export default function Sidebar({ user }) {
  const navigate = useNavigate()
  const [nombreBarberia, setNombreBarberia] = useState('Artisan Cut')
  const [logoUrl, setLogoUrl] = useState(null)

  useEffect(() => {
    supabase.from('barberias').select('nombre, logo_url').eq('id', 'barber').single()
      .then(({ data }) => {
        if (data?.nombre) setNombreBarberia(data.nombre)
        if (data?.logo_url) setLogoUrl(data.logo_url)
      })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? '?'

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          {logoUrl
            ? <img src={logoUrl} alt="logo" style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', objectFit: 'cover' }} />
            : '✂'}
        </div>
        <div>
          <div className="sidebar-logo-text">{nombreBarberia}</div>
          <div className="sidebar-logo-sub">Panel de gestión</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/calendario" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <IconCalendar /> Calendario
        </NavLink>
        <NavLink to="/citas" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <IconCitas /> Citas
        </NavLink>
        <NavLink to="/clientes" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <IconClientes /> Clientes
        </NavLink>
        <NavLink to="/servicios" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <IconServicios /> Servicios
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{initials}</div>
          <span style={{ fontSize: 13, color: 'var(--color-on-surface-var)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email ?? ''}
          </span>
        </div>
        <button className="nav-item" onClick={handleLogout} style={{ color: 'var(--color-error)' }}>
          <IconLogout /> Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
