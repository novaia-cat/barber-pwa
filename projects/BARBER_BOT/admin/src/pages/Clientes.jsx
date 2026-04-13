import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const BARBERIA_ID = 'barber'

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

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

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

const EMPTY = { nombre: '', apellido: '', telefono: '', email: '' }

function normalizePhone(value) {
  return String(value ?? '').replace(/\s+/g, '').trim()
}

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // null | 'new' | 'edit'
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('clientes')
      .select('id, nombre, apellido, telefono, email, fecha_registro')
      .eq('barberia_id', BARBERIA_ID)
      .order('fecha_registro', { ascending: false })
    setClientes(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = clientes.filter(c => {
    const q = search.toLowerCase()
    return (
      c.nombre?.toLowerCase().includes(q) ||
      c.apellido?.toLowerCase().includes(q) ||
      c.telefono?.includes(q) ||
      c.email?.toLowerCase().includes(q)
    )
  })

  function openNew() {
    setForm(EMPTY)
    setEditId(null)
    setError('')
    setModal('new')
  }

  function openEdit(c) {
    setForm({ nombre: c.nombre ?? '', apellido: c.apellido ?? '', telefono: c.telefono ?? '', email: c.email ?? '' })
    setEditId(c.id)
    setError('')
    setModal('edit')
  }

  async function handleSave() {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return }
    const telefono = normalizePhone(form.telefono)
    if (!telefono.match(/^\d{9,15}$/)) { setError('El teléfono es obligatorio y debe tener entre 9 y 15 dígitos.'); return }
    setSaving(true)
    setError('')
    if (modal === 'new') {
      const { error: err } = await supabase.from('clientes').insert([{
        barberia_id: BARBERIA_ID,
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim() || null,
        telefono,
        email: form.email.trim() || null,
      }])
      if (err) setError(err.code === '23505' ? 'Ya existe un cliente con ese teléfono en esta barbería.' : err.message)
      else { setModal(null); load() }
    } else {
      const { error: err } = await supabase.from('clientes').update({
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim() || null,
        telefono,
        email: form.email.trim() || null,
      }).eq('id', editId).eq('barberia_id', BARBERIA_ID)
      if (err) setError(err.code === '23505' ? 'Ya existe un cliente con ese teléfono en esta barbería.' : err.message)
      else { setModal(null); load() }
    }
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('¿Borrar este cliente?')) return
    await supabase.from('clientes').delete().eq('id', id).eq('barberia_id', BARBERIA_ID)
    load()
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Clientes</h1>
        <button className="btn-primary" onClick={openNew}>+ Nuevo cliente</button>
      </div>

      <div className="search-bar">
        <input
          className="input"
          style={{ maxWidth: 280 }}
          placeholder="Buscar por nombre, teléfono o email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <span style={{ fontSize: 13, color: 'var(--color-on-surface-var)' }}>
          {filtered.length} cliente{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Email</th>
              <th>Registro</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--color-on-surface-var)' }}>Cargando...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--color-on-surface-var)' }}>Sin resultados</td></tr>
            )}
            {filtered.map(c => (
              <tr key={c.id}>
                <td style={{ fontWeight: 500 }}>{c.nombre} {c.apellido ?? ''}</td>
                <td className="td-muted">{c.telefono ?? '—'}</td>
                <td className="td-muted">{c.email ?? '—'}</td>
                <td className="td-muted">{formatDate(c.fecha_registro)}</td>
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
          title={modal === 'new' ? 'Nuevo cliente' : 'Editar cliente'}
          onClose={() => setModal(null)}
          onSave={handleSave}
          saving={saving}
        >
          {error && <div className="error-msg">{error}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Nombre *</label>
              <input className="input" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Nombre" />
            </div>
            <div className="form-group">
              <label className="form-label">Apellido</label>
              <input className="input" value={form.apellido} onChange={e => setForm(f => ({ ...f, apellido: e.target.value }))} placeholder="Apellido" />
            </div>
            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input className="input" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} placeholder="612345678" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="cliente@email.com" />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
