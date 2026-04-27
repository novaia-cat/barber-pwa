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
    <div className="modal-overlay">
      <div className="modal-box">
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

const FALLBACK_SLOTS = Array.from({ length: 27 }, (_, i) => {
  const mins = 8 * 60 + i * 30
  return String(Math.floor(mins / 60)).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0')
})

function toMins(t) { const [h, m] = t.slice(0, 5).split(':').map(Number); return h * 60 + m }
function fromMins(m) { return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0') }

export default function Citas() {
  const { barberiaId } = useBarberia()
  const [citas, setCitas] = useState([])
  const [clientes, setClientes] = useState([])
  const [servicios, setServicios] = useState([])
  const [peluqueros, setPeluqueros] = useState([])
  const [slots, setSlots] = useState(FALLBACK_SLOTS)
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('todas')
  const [filtroFecha, setFiltroFecha] = useState('todas')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const [{ data: c }, { data: sv }, { data: pl }] = await Promise.all([
      supabase.from('citas').select('id, cliente_id, peluquero_id, servicio_id, fecha_hora, duracion_min, estado').eq('barberia_id', barberiaId).order('fecha_hora', { ascending: false }),
      supabase.from('servicios').select('id, nombre, duracion_min').eq('barberia_id', barberiaId),
      supabase.from('peluqueros').select('id, nombre').eq('barberia_id', barberiaId).eq('activo', true).order('nombre'),
    ])
    const citas = c ?? []
    setCitas(citas)
    setServicios(sv ?? [])
    setPeluqueros(pl ?? [])
    const ids = [...new Set(citas.map(x => x.cliente_id).filter(Boolean))]
    if (ids.length) {
      const { data: cl } = await supabase.from('clientes').select('id, nombre, apellido').in('id', ids)
      setClientes(cl ?? [])
    } else {
      setClientes([])
    }
    setLoading(false)
  }

  useEffect(() => { if (barberiaId) load() }, [barberiaId])

  useEffect(() => {
    if (!modal || !form.peluquero_id || !form.fecha) { setSlots(FALLBACK_SLOTS); return }
    const jsDay = new Date(form.fecha + 'T12:00:00').getDay()
    const dbDay = jsDay === 0 ? 7 : jsDay
    supabase.from('horarios').select('hora_inicio, hora_fin')
      .eq('peluquero_id', form.peluquero_id).eq('dia_semana', dbDay)
      .then(({ data }) => {
        if (!data || data.length === 0) { setSlots(FALLBACK_SLOTS); return }
        const computed = []
        const sorted = [...data].sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
        sorted.forEach(({ hora_inicio, hora_fin }) => {
          let cur = toMins(hora_inicio)
          const end = toMins(hora_fin)
          while (cur < end) { computed.push(fromMins(cur)); cur += 30 }
        })
        if (form.hora && !computed.includes(form.hora)) computed.push(form.hora)
        setSlots(computed.length > 0 ? computed : FALLBACK_SLOTS)
      })
  }, [form.peluquero_id, form.fecha, modal])

  function clienteNombre(id) {
    const c = clientes.find(c => c.id === id)
    return c ? `${c.nombre} ${c.apellido ?? ''}`.trim() : '—'
  }

  function servicioNombre(id) {
    const s = servicios.find(s => s.id === id)
    return s?.nombre ?? id ?? '—'
  }

  function peluqueroNombre(id) {
    const p = peluqueros.find(p => p.id === id)
    return p?.nombre ?? '—'
  }

  function isSameDay(isoStr, date) {
    const d = new Date(isoStr.replace(/([+-]\d{2}:\d{2}|Z)$/, ''))
    return d.getFullYear() === date.getFullYear() &&
      d.getMonth() === date.getMonth() &&
      d.getDate() === date.getDate()
  }

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)

  const filtered = citas.filter(c => {
    if (filtroEstado !== 'todas' && c.estado !== filtroEstado) return false
    if (filtroFecha === 'hoy') return isSameDay(c.fecha_hora, new Date())
    if (filtroFecha === 'manana') return isSameDay(c.fecha_hora, tomorrow)
    return true
  })

  function openEdit(c) {
    const stripped = c.fecha_hora ? c.fecha_hora.replace(/([+-]\d{2}:\d{2}|Z)$/, '') : ''
    const fecha = stripped.slice(0, 10)
    const hora  = stripped.slice(11, 16)
    setForm({ cliente_id: c.cliente_id, peluquero_id: c.peluquero_id, servicio_id: c.servicio_id, fecha, hora, duracion_min: c.duracion_min, estado: c.estado })
    setEditId(c.id)
    setError('')
    setModal('edit')
  }

  function openNew() {
    setForm({ cliente_id: clientes[0]?.id ?? '', peluquero_id: peluqueros[0]?.id ?? '', servicio_id: servicios[0]?.id ?? '', fecha: '', hora: '', duracion_min: servicios[0]?.duracion_min ?? 30, estado: 'confirmada' })
    setEditId(null)
    setError('')
    setModal('new')
  }

  async function handleSave() {
    if (!form.fecha || !form.hora) { setError('La fecha y hora son obligatorias.'); return }
    setSaving(true)
    setError('')

    const newStart = new Date(form.fecha + 'T' + form.hora + ':00')
    const newEnd = new Date(newStart.getTime() + Number(form.duracion_min) * 60000)

    let q = supabase.from('citas')
      .select('id, fecha_hora, duracion_min, cliente_id')
      .eq('peluquero_id', form.peluquero_id)
      .eq('barberia_id', barberiaId)
      .neq('estado', 'cancelada')
      .gte('fecha_hora', form.fecha + 'T00:00:00')
      .lte('fecha_hora', form.fecha + 'T23:59:59')
    if (editId) q = q.neq('id', editId)
    const { data: existing } = await q

    const conflict = (existing ?? []).find(ex => {
      const exStart = new Date(ex.fecha_hora.replace(/([+-]\d{2}:\d{2}|Z)$/, ''))
      const exEnd = new Date(exStart.getTime() + ex.duracion_min * 60000)
      return newStart < exEnd && newEnd > exStart
    })
    if (conflict) {
      const conflictHora = new Date(conflict.fecha_hora.replace(/([+-]\d{2}:\d{2}|Z)$/, '')).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      setError(`Colisión: ${peluqueroNombre(form.peluquero_id)} ya tiene cita con ${clienteNombre(conflict.cliente_id)} a las ${conflictHora}.`)
      setSaving(false)
      return
    }

    const payload = {
      cliente_id: form.cliente_id,
      peluquero_id: form.peluquero_id,
      servicio_id: form.servicio_id,
      fecha_hora: form.fecha + 'T' + form.hora + ':00+00:00',
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
  const fechaBtns = [
    { key: 'todas', label: 'Todas las fechas' },
    { key: 'hoy', label: 'Hoy' },
    { key: 'manana', label: 'Mañana' },
  ]

  function filterPillStyle(active) {
    return {
      border: '1px solid var(--color-outline)',
      borderRadius: 'var(--radius-full)',
      padding: '5px 14px',
      fontSize: 13,
      fontWeight: active ? 600 : 400,
      fontFamily: 'var(--font)',
      cursor: 'pointer',
      background: active ? 'var(--color-secondary)' : '#fff',
      color: active ? '#fff' : 'var(--color-on-surface-var)',
      transition: 'all 0.15s',
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Citas</h1>
        <button className="btn-primary" onClick={openNew}>+ Nueva cita</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {fechaBtns.map(f => (
            <button key={f.key} onClick={() => setFiltroFecha(f.key)} style={filterPillStyle(filtroFecha === f.key)}>
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {filterBtns.map(f => (
            <button key={f} onClick={() => setFiltroEstado(f)} style={filterPillStyle(filtroEstado === f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <span style={{ fontSize: 13, color: 'var(--color-on-surface-var)', marginLeft: 4 }}>
            {filtered.length} cita{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Peluquero</th>
              <th>Servicio</th>
              <th>Fecha / Hora</th>
              <th>Duración</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--color-on-surface-var)' }}>Cargando...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--color-on-surface-var)' }}>Sin citas</td></tr>
            )}
            {filtered.map(c => (
              <tr key={c.id}>
                <td style={{ fontWeight: 500 }}>{clienteNombre(c.cliente_id)}</td>
                <td className="td-muted">{peluqueroNombre(c.peluquero_id)}</td>
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
              <label className="form-label">Peluquero</label>
              <select className="input" value={form.peluquero_id} onChange={e => setForm(f => ({ ...f, peluquero_id: e.target.value }))}>
                {peluqueros.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Servicio</label>
              <select className="input" value={form.servicio_id} onChange={e => {
                const s = servicios.find(s => s.id === e.target.value)
                setForm(f => ({ ...f, servicio_id: e.target.value, duracion_min: s?.duracion_min ?? f.duracion_min }))
              }}>
                {servicios.map(s => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label">Fecha *</label>
                <input className="input" type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Hora *</label>
                <select className="input" value={form.hora} onChange={e => setForm(f => ({ ...f, hora: e.target.value }))}>
                  {!form.hora && <option value="">--</option>}
                  {slots.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
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
