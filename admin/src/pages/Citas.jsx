import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useBarberia } from '../lib/BarberiaContext'

const IconEdit = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)

const IconDelete = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
)

function formatFecha(iso) {
  if (!iso) return '—'
  // fecha_hora se almacena con +00:00 pero el valor es hora Madrid (no UTC).
  // Quitamos el offset para que JS lo interprete como hora local sin convertir.
  const localStr = iso.replace(/([+-]\d{2}:\d{2}|Z)$/, '')
  return new Date(localStr).toLocaleString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

const ESTADOS = ['confirmada', 'cancelada', 'pendiente']

function estadoBadge(estado) {
  if (estado === 'confirmada') return <span className="badge badge-green">Confirmada</span>
  if (estado === 'cancelada')  return <span className="badge badge-red">Cancelada</span>
  return <span className="badge badge-grey">Pendiente</span>
}

function Modal({ title, onClose, onSave, saving, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: '#fff', borderRadius: 'var(--radius-lg)', padding: 32, width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>{title}</h2>
        {children}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={onSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  )
}

export default function Citas() {
  const { barberiaId } = useBarberia()
  const [citas, setCitas] = useState([])
  const [clientes, setClientes] = useState([])
  const [servicios, setServicios] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('todas')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const [{ data: c }, { data: cl }, { data: sv }] = await Promise.all([
      supabase.from('citas').select('id, cliente_id, servicio_id, fecha_hora, duracion_min, estado').eq('barberia_id', barberiaId).order('fecha_hora', { ascending: false }),
      supabase.from('clientes').select('id, nombre, apellido').eq('barberia_id', barberiaId),
      supabase.from('servicios').select('id, nombre').eq('barberia_id', barberiaId),
    ])
    setCitas(c ?? [])
    setClientes(cl ?? [])
    setServicios(sv ?? [])
    setLoading(false)
  }

  useEffect(() => { if (barberiaId) load() }, [barberiaId])

  function clienteNombre(id) {
    const c = clientes.find(c => c.id === id)
    return c ? `${c.nombre} ${c.apellido ?? ''}`.trim() : '—'
  }

  function servicioNombre(id) {
    const s = servicios.find(s => s.id === id)
    return s?.nombre ?? id ?? '—'
  }

  const filtered = filtroEstado === 'todas' ? citas : citas.filter(c => c.estado === filtroEstado)

  function openEdit(c) {
    const fechaLocal = c.fecha_hora ? c.fecha_hora.replace(/([+-]\d{2}:\d{2}|Z)$/, '').slice(0, 16) : ''
    setForm({ cliente_id: c.cliente_id, servicio_id: c.servicio_id, fecha_hora: fechaLocal, duracion_min: c.duracion_min, estado: c.estado })
    setEditId(c.id)
    setError('')
    setModal('edit')
  }

  function openNew() {
    setForm({ cliente_id: clientes[0]?.id ?? '', servicio_id: servicios[0]?.id ?? '', fecha_hora: '', duracion_min: 30, estado: 'confirmada' })
    setEditId(null)
    setError('')
    setModal('new')
  }

  async function handleSave() {
    if (!form.fecha_hora) { setError('La fecha y hora son obligatorias.'); return }
    setSaving(true)
    setError('')

    const payload = {
      cliente_id: form.cliente_id,
      servicio_id: form.servicio_id,
      fecha_hora: form.fecha_hora + ':00+00:00',
      duracion_min: Number(form.duracion_min),
      estado: form.estado,
    }

    if (modal === 'new') {
      const { error: err } = await supabase.from('citas').insert([{ ...payload, barberia_id: barberiaId }])
      if (err) setError(err.message)
      else { setModal(null); load() }
    } else {
      const { error: err } = await supabase.from('citas').update(payload).eq('id', editId)
      if (err) setError(err.message)
      else { setModal(null); load() }
    }
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('¿Borrar esta cita?')) return
    await supabase.from('citas').delete().eq('id', id)
    load()
  }

  const filterBtns = ['todas', 'confirmada', 'cancelada', 'pendiente']

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Citas</h1>
        <button className="btn-primary" onClick={openNew}>+ Nueva cita</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {filterBtns.map(f => (
          <button
            key={f}
            onClick={() => setFiltroEstado(f)}
            style={{
              border: '1px solid var(--color-outline)',
              borderRadius: 'var(--radius-full)',
              padding: '5px 14px',
              fontSize: 13,
              fontWeight: filtroEstado === f ? 600 : 400,
              fontFamily: 'var(--font)',
              cursor: 'pointer',
              background: filtroEstado === f ? 'var(--color-secondary)' : '#fff',
              color: filtroEstado === f ? '#fff' : 'var(--color-on-surface-var)',
              transition: 'all 0.15s',
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <span style={{ fontSize: 13, color: 'var(--color-on-surface-var)', alignSelf: 'center', marginLeft: 4 }}>
          {filtered.length} cita{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Servicio</th>
              <th>Fecha / Hora</th>
              <th>Duración</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--color-on-surface-var)' }}>Cargando...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--color-on-surface-var)' }}>Sin citas</td></tr>
            )}
            {filtered.map(c => (
              <tr key={c.id}>
                <td style={{ fontWeight: 500 }}>{clienteNombre(c.cliente_id)}</td>
                <td className="td-muted">{servicioNombre(c.servicio_id)}</td>
                <td className="td-muted">{formatFecha(c.fecha_hora)}</td>
                <td className="td-muted">{c.duracion_min} min</td>
                <td>{estadoBadge(c.estado)}</td>
                <td>
                  <div className="actions">
                    <button className="icon-btn" onClick={() => openEdit(c)} title="Editar"><IconEdit /></button>
                    <button className="icon-btn danger" onClick={() => handleDelete(c.id)} title="Borrar"><IconDelete /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal
          title={modal === 'new' ? 'Nueva cita' : 'Editar cita'}
          onClose={() => setModal(null)}
          onSave={handleSave}
          saving={saving}
        >
          {error && <div className="error-msg">{error}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Cliente</label>
              <select className="input" value={form.cliente_id} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))}>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre} {c.apellido ?? ''}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Servicio</label>
              <select className="input" value={form.servicio_id} onChange={e => setForm(f => ({ ...f, servicio_id: e.target.value }))}>
                {servicios.map(s => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label">Fecha y hora *</label>
                <input className="input" type="datetime-local" value={form.fecha_hora} onChange={e => setForm(f => ({ ...f, fecha_hora: e.target.value }))} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Duración (min)</label>
                <input className="input" type="number" min="5" step="5" value={form.duracion_min} onChange={e => setForm(f => ({ ...f, duracion_min: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Estado</label>
              <select className="input" value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}>
                {ESTADOS.map(e => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
              </select>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
