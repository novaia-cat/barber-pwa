import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const IconEdit = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)

const IconDelete = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
)

function Modal({ title, onClose, onSave, saving, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: '#fff', borderRadius: 'var(--radius-lg)', padding: 32, width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{title}</h2>
        {children}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={onSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

const EMPTY = { nombre: '', foto_url: '', activo: true }

export default function Equipo() {
  const [peluqueros, setPeluqueros] = useState([])
  const [loading, setLoading]       = useState(true)
  const [modal, setModal]           = useState(null)
  const [form, setForm]             = useState(EMPTY)
  const [editId, setEditId]         = useState(null)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('peluqueros')
      .select('id, nombre, foto_url, activo')
      .eq('barberia_id', 'barber')
      .order('nombre')
    setPeluqueros(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setForm(EMPTY)
    setEditId(null)
    setError('')
    setModal('new')
  }

  function openEdit(p) {
    setForm({ nombre: p.nombre, foto_url: p.foto_url ?? '', activo: p.activo })
    setEditId(p.id)
    setError('')
    setModal('edit')
  }

  async function handleSave() {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return }
    setSaving(true)
    setError('')

    const payload = {
      nombre:   form.nombre.trim(),
      foto_url: form.foto_url.trim() || null,
      activo:   form.activo,
    }

    if (modal === 'new') {
      const { error: err } = await supabase
        .from('peluqueros')
        .insert([{ ...payload, barberia_id: 'barber' }])
      if (err) setError(err.message)
      else { setModal(null); load() }
    } else {
      const { error: err } = await supabase
        .from('peluqueros')
        .update(payload)
        .eq('id', editId)
      if (err) setError(err.message)
      else { setModal(null); load() }
    }
    setSaving(false)
  }

  async function toggleActivo(p) {
    await supabase.from('peluqueros').update({ activo: !p.activo }).eq('id', p.id)
    load()
  }

  async function handleDelete(id) {
    if (!confirm('Borrar este peluquero?')) return
    await supabase.from('peluqueros').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Equipo</h1>
        <button className="btn-primary" onClick={openNew}>+ Nuevo peluquero</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Nombre</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24, color: 'var(--color-on-surface-var)' }}>Cargando...</td></tr>
            )}
            {!loading && peluqueros.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24, color: 'var(--color-on-surface-var)' }}>Sin peluqueros</td></tr>
            )}
            {peluqueros.map(p => (
              <tr key={p.id}>
                <td style={{ width: 48 }}>
                  {p.foto_url
                    ? <img src={p.foto_url} alt={p.nombre} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
                    : <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-surface-high)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'var(--color-secondary)' }}>
                        {p.nombre.charAt(0).toUpperCase()}
                      </div>
                  }
                </td>
                <td style={{ fontWeight: 500 }}>{p.nombre}</td>
                <td>
                  <button
                    onClick={() => toggleActivo(p)}
                    style={{
                      border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-full)',
                      padding: '3px 12px', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font)',
                      background: p.activo ? '#e8f5ee' : 'var(--color-surface-high)',
                      color: p.activo ? 'var(--color-badge-green)' : 'var(--color-badge-grey)',
                    }}
                  >
                    {p.activo ? 'Activo' : 'Inactivo'}
                  </button>
                </td>
                <td>
                  <div className="actions">
                    <button className="icon-btn" onClick={() => openEdit(p)}><IconEdit /></button>
                    <button className="icon-btn danger" onClick={() => handleDelete(p.id)}><IconDelete /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal
          title={modal === 'new' ? 'Nuevo peluquero' : 'Editar peluquero'}
          onClose={() => setModal(null)}
          onSave={handleSave}
          saving={saving}
        >
          {error && <div className="error-msg">{error}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Nombre *</label>
              <input
                className="input"
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="Nombre del peluquero"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Foto (URL)</label>
              <input
                className="input"
                value={form.foto_url}
                onChange={e => setForm(f => ({ ...f, foto_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.activo}
                onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))}
              />
              <span className="form-label" style={{ margin: 0 }}>Activo</span>
            </label>
          </div>
        </Modal>
      )}
    </div>
  )
}
