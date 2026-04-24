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

function Modal({ title, onClose, onSave, saving, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: '#fff', borderRadius: 'var(--radius-lg)', padding: 32, width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 20 }}>
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

const EMPTY = { id: '', nombre: '', duracion_min: 30, precio_eur: 0, activo: true }

export default function Servicios() {
  const { barberiaId } = useBarberia()
  const [servicios, setServicios] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('servicios')
      .select('id, nombre, duracion_min, precio_eur, activo')
      .eq('barberia_id', barberiaId)
      .order('id')
    setServicios(data ?? [])
    setLoading(false)
  }

  useEffect(() => { if (barberiaId) load() }, [barberiaId])

  function openNew() {
    setForm(EMPTY)
    setEditId(null)
    setError('')
    setModal('new')
  }

  function openEdit(s) {
    setForm({ id: s.id, nombre: s.nombre, duracion_min: s.duracion_min, precio_eur: s.precio_eur, activo: s.activo })
    setEditId(s.id)
    setError('')
    setModal('edit')
  }

  async function handleSave() {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return }
    if (!form.id.trim() && modal === 'new') { setError('El ID es obligatorio (ej: SRV004).'); return }
    setSaving(true)
    setError('')

    if (modal === 'new') {
      const { error: err } = await supabase.from('servicios').insert([{
        id: form.id.trim().toUpperCase(),
        barberia_id: barberiaId,
        nombre: form.nombre.trim(),
        duracion_min: Number(form.duracion_min),
        precio_eur: Number(form.precio_eur),
        activo: form.activo,
      }])
      if (err) setError(err.message)
      else { setModal(null); load() }
    } else {
      const { error: err } = await supabase.from('servicios').update({
        nombre: form.nombre.trim(),
        duracion_min: Number(form.duracion_min),
        precio_eur: Number(form.precio_eur),
        activo: form.activo,
      }).eq('barberia_id', barberiaId).eq('id', editId)
      if (err) setError(err.message)
      else { setModal(null); load() }
    }
    setSaving(false)
  }

  async function toggleActivo(s) {
    await supabase.from('servicios').update({ activo: !s.activo }).eq('barberia_id', barberiaId).eq('id', s.id)
    load()
  }

  async function handleDelete(id) {
    if (!confirm('¿Borrar este servicio? Las citas existentes no se verán afectadas.')) return
    await supabase.from('servicios').delete().eq('barberia_id', barberiaId).eq('id', id)
    load()
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Servicios</h1>
        <button className="btn-primary" onClick={openNew}>+ Nuevo servicio</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Servicio</th>
              <th>Duración</th>
              <th>Precio</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--color-on-surface-var)' }}>Cargando...</td></tr>
            )}
            {!loading && servicios.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--color-on-surface-var)' }}>Sin servicios</td></tr>
            )}
            {servicios.map(s => (
              <tr key={s.id}>
                <td style={{ fontWeight: 500 }}>{s.nombre}</td>
                <td className="td-muted">{s.duracion_min} min</td>
                <td className="td-muted">{Number(s.precio_eur).toFixed(2)} €</td>
                <td>
                  <div className="toggle-wrap">
                    <span className={`toggle-label${s.activo ? ' on' : ''}`}>
                      {s.activo ? 'Activo' : 'Inactivo'}
                    </span>
                    <label className="toggle-switch">
                      <input type="checkbox" checked={s.activo} onChange={() => toggleActivo(s)} />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                </td>
                <td>
                  <div className="actions">
                    <button className="icon-btn" onClick={() => openEdit(s)} title="Editar"><IconEdit /></button>
                    <button className="icon-btn danger" onClick={() => handleDelete(s.id)} title="Borrar"><IconDelete /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal
          title={modal === 'new' ? 'Nuevo servicio' : 'Editar servicio'}
          onClose={() => setModal(null)}
          onSave={handleSave}
          saving={saving}
        >
          {error && <div className="error-msg">{error}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {modal === 'new' && (
              <div className="form-group">
                <label className="form-label">ID (ej: SRV004) *</label>
                <input className="input" value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value }))} placeholder="SRV004" />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Nombre *</label>
              <input className="input" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Nombre del servicio" />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Duración (min)</label>
                <input className="input" type="number" min="5" step="5" value={form.duracion_min} onChange={e => setForm(f => ({ ...f, duracion_min: e.target.value }))} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Precio (€)</label>
                <input className="input" type="number" min="0" step="0.5" value={form.precio_eur} onChange={e => setForm(f => ({ ...f, precio_eur: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} />
                <span className="form-label" style={{ marginBottom: 0 }}>Activo</span>
              </label>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
