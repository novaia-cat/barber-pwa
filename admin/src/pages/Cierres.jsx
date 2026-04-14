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

const TIPOS = [
  { value: 'cierre', label: 'Cierre general' },
  { value: 'festivo', label: 'Festivo' },
  { value: 'vacaciones', label: 'Ausencia peluquero' },
]

function tipoBadge(tipo) {
  if (tipo === 'cierre')     return <span className="badge badge-red">Cierre general</span>
  if (tipo === 'festivo')    return <span className="badge badge-grey">Festivo</span>
  if (tipo === 'vacaciones') return <span className="badge badge-green">Ausencia peluquero</span>
  return <span className="badge badge-grey">{tipo}</span>
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
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

export default function Cierres() {
  const { barberiaId } = useBarberia()
  const [bloqueos, setBloqueos] = useState([])
  const [peluqueros, setPeluqueros] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const [{ data: b }, { data: p }] = await Promise.all([
      supabase.from('bloqueos')
        .select('id, peluquero_id, fecha_inicio, fecha_fin, motivo, tipo')
        .eq('barberia_id', barberiaId)
        .order('fecha_inicio', { ascending: false }),
      supabase.from('peluqueros')
        .select('id, nombre')
        .eq('barberia_id', barberiaId)
        .order('nombre'),
    ])
    setBloqueos(b ?? [])
    setPeluqueros(p ?? [])
    setLoading(false)
  }

  useEffect(() => { if (barberiaId) load() }, [barberiaId])

  function peluqueroNombre(id) {
    if (!id) return 'Todos'
    const p = peluqueros.find(p => p.id === id)
    return p?.nombre ?? '—'
  }

  function openNew() {
    setForm({ tipo: 'cierre', motivo: '', fecha_inicio: '', fecha_fin: '', peluquero_id: '' })
    setEditId(null)
    setError('')
    setModal('form')
  }

  function openEdit(b) {
    setForm({
      tipo: b.tipo ?? 'cierre',
      motivo: b.motivo ?? '',
      fecha_inicio: b.fecha_inicio ?? '',
      fecha_fin: b.fecha_fin ?? '',
      peluquero_id: b.peluquero_id ?? '',
    })
    setEditId(b.id)
    setError('')
    setModal('form')
  }

  async function handleSave() {
    if (!form.fecha_inicio || !form.fecha_fin) { setError('Las fechas son obligatorias.'); return }
    if (form.fecha_fin < form.fecha_inicio) { setError('La fecha fin debe ser igual o posterior a la fecha inicio.'); return }
    if (form.tipo === 'vacaciones' && !form.peluquero_id) { setError('Selecciona un peluquero para este tipo de ausencia.'); return }

    setSaving(true)
    setError('')

    const payload = {
      tipo: form.tipo,
      motivo: form.motivo || null,
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin,
      peluquero_id: form.tipo === 'vacaciones' ? form.peluquero_id : null,
      barberia_id: barberiaId,
    }

    if (modal === 'form' && !editId) {
      const { error: err } = await supabase.from('bloqueos').insert([payload])
      if (err) setError(err.message)
      else { setModal(null); load() }
    } else {
      const { error: err } = await supabase.from('bloqueos').update(payload).eq('id', editId)
      if (err) setError(err.message)
      else { setModal(null); load() }
    }
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('¿Borrar este bloqueo?')) return
    await supabase.from('bloqueos').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Cierres y Festivos</h1>
        <button className="btn-primary" onClick={openNew}>+ Nuevo cierre</button>
      </div>

      <p style={{ fontSize: 13, color: 'var(--color-on-surface-var)', marginBottom: 20 }}>
        Define días o períodos en los que la barbería no atiende. El sistema no ofrecerá citas en esas fechas.
      </p>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Motivo</th>
              <th>Tipo</th>
              <th>Fecha inicio</th>
              <th>Fecha fin</th>
              <th>Peluquero</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--color-on-surface-var)' }}>Cargando...</td></tr>
            )}
            {!loading && bloqueos.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--color-on-surface-var)' }}>Sin cierres definidos</td></tr>
            )}
            {bloqueos.map(b => (
              <tr key={b.id}>
                <td style={{ fontWeight: 500 }}>{b.motivo || <span style={{ color: 'var(--color-on-surface-var)' }}>—</span>}</td>
                <td>{tipoBadge(b.tipo)}</td>
                <td className="td-muted">{formatDate(b.fecha_inicio)}</td>
                <td className="td-muted">{formatDate(b.fecha_fin)}</td>
                <td className="td-muted">{peluqueroNombre(b.peluquero_id)}</td>
                <td>
                  <div className="actions">
                    <button className="icon-btn" onClick={() => openEdit(b)} title="Editar"><IconEdit /></button>
                    <button className="icon-btn danger" onClick={() => handleDelete(b.id)} title="Borrar"><IconDelete /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal
          title={editId ? 'Editar cierre' : 'Nuevo cierre'}
          onClose={() => setModal(null)}
          onSave={handleSave}
          saving={saving}
        >
          {error && <div className="error-msg">{error}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Tipo</label>
              <select className="input" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value, peluquero_id: '' }))}>
                {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Motivo</label>
              <input
                className="input"
                type="text"
                placeholder="Ej. Navidad, vacaciones verano..."
                value={form.motivo}
                onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))}
              />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Fecha inicio *</label>
                <input className="input" type="date" value={form.fecha_inicio} onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Fecha fin *</label>
                <input className="input" type="date" value={form.fecha_fin} onChange={e => setForm(f => ({ ...f, fecha_fin: e.target.value }))} />
              </div>
            </div>
            {form.tipo === 'vacaciones' && (
              <div className="form-group">
                <label className="form-label">Peluquero *</label>
                <select className="input" value={form.peluquero_id} onChange={e => setForm(f => ({ ...f, peluquero_id: e.target.value }))}>
                  <option value="">Seleccionar peluquero...</option>
                  {peluqueros.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
