import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBarberia } from '../lib/BarberiaContext'

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

const IconHorario = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
)

const IconEquipo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

const IconCierres = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    <line x1="9.5" y1="15" x2="14.5" y2="20"/><line x1="14.5" y1="15" x2="9.5" y2="20"/>
  </svg>
)

const IconBell = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
)

const IconAjustes = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
)

const IconLogout = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)

const IconBarberias = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)

export default function Sidebar({ user }) {
  const navigate = useNavigate()
  const { barberia, isSuperAdmin, allBarberias, switchBarberia } = useBarberia()

  const nombreBarberia = barberia?.nombre ?? 'Artisan Cut'
  const logoUrl = barberia?.logo_url ?? null

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
        <div style={{ flex: 1, minWidth: 0 }}>
          {isSuperAdmin && allBarberias.length > 0 ? (
            <select
              value={barberia?.id ?? ''}
              onChange={e => switchBarberia(e.target.value)}
              style={{
                width: '100%', background: 'transparent', border: 'none', outline: 'none',
                fontSize: 14, fontWeight: 700, color: 'var(--color-on-surface)',
                cursor: 'pointer', padding: 0
              }}
            >
              {allBarberias.map(b => (
                <option key={b.id} value={b.id}>{b.nombre}</option>
              ))}
            </select>
          ) : (
            <div className="sidebar-logo-text">{nombreBarberia}</div>
          )}
          <div className="sidebar-logo-sub">
            {isSuperAdmin ? '⚡ Super Admin' : 'Panel de gestión'}
          </div>
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
        <NavLink to="/equipo" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <IconEquipo /> Equipo
        </NavLink>
        <NavLink to="/horario" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <IconHorario /> Horario
        </NavLink>
        <NavLink to="/cierres" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <IconCierres /> Cierres
        </NavLink>
        <NavLink to="/notificaciones" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <IconBell /> Notificaciones
        </NavLink>
        <NavLink to="/ajustes" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <IconAjustes /> Ajustes
        </NavLink>
        {isSuperAdmin && (
          <>
            <div style={{ height: 1, background: 'var(--color-outline)', margin: '8px 0', opacity: 0.5 }} />
            <NavLink to="/barberias" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <IconBarberias /> Barberias
            </NavLink>
          </>
        )}
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
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-on-surface-var)', opacity: 0.5, paddingTop: 8 }}>
          v1.9.3
        </div>
      </div>
    </aside>
  )
}
