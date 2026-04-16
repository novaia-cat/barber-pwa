import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useBarberia } from '../lib/BarberiaContext'

const EMPTY_FORM = {
  id: '', nombre: '', direccion: '', telefono: '',
  email_admin: '', logo_url: '', imagen_url: '',
  color_primary: '#725b3f', color_secondary: '#2d2d2d',
  tier: 'free'
}

export default function Barberias() {
  const { allBarberias, setAllBarberias } = useBarberia()

  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState(null)

  function field(key, label, placeholder, type = 'text', opts = {}) {
    return (
      <div className="form-group" key={key}>
        <label className="form-label">{label}{opts.required ? ' *' : ''}</label>
        {type === 'select' ? (
          <select className="input" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="premium">Premium</option>
          </select>
        ) : (
          <input
            className="input" type={type}
            value={form[key]} placeholder={placeholder}
            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          />
        )}
      </div>
    )
  }

  async function handleCreate() {
    if (!form.id.trim() || !form.nombre.trim()) {
      setMsg({ type: 'err', text: 'ID y Nombre son obligatorios.' })
      return
    }
    if (!/^[a-z0-9-]+$/.test(form.id.trim())) {
      setMsg({ type: 'err', text: 'El ID solo puede contener letras minúsculas, números y guiones.' })
      return
    }
    setSaving(true)
    setMsg(null)
    const row = {
      id:             form.id.trim(),
      nombre:         form.nombre.trim(),
      direccion:      form.direccion.trim()      || null,
      telefono:       form.telefono.trim()       || null,
      email_admin:    form.email_admin.trim()    || null,
      logo_url:       form.logo_url.trim()       || null,
      imagen_url:     form.imagen_url.trim()     || null,
      color_primary:  form.color_primary.trim()  || '#725b3f',
      color_secondary:form.color_secondary.trim()|| '#2d2d2d',
      tier:           form.tier,
    }
    const { error } = await supabase.from('barberias').insert(row)
    if (error) {
      setMsg({ type: 'err', text: error.message })
    } else {
      setAllBarberias(prev => [...prev, row].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setForm(EMPTY_FORM)
      setShowForm(false)
      setMsg({ type: 'ok', text: `Barbería "${row.nombre}" creada correctamente.` })
    }
    setSaving(false)
  }

  const cardStyle = {
    background: '#fff', border: '1px solid var(--color-outline)',
    borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 20
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">Barberias</h1>
        <button className="btn-primary" onClick={() => { setShowForm(s => !s); setMsg(null) }}>
          {showForm ? 'Cancelar' : '+ Nueva barbería'}
        </button>
      </div>

      {msg && (
        <div className={msg.type === 'ok' ? 'success-msg' : 'error-msg'} style={{ marginBottom: 16 }}>
          {msg.text}
        </div>
      )}

      {/* Formulario nueva barbería */}
      {showForm && (
        <div style={cardStyle}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Nueva barbería</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {field('id',             'ID (slug único)',    'mi-barberia',          'text', { required: true })}
            {field('nombre',         'Nombre',             'La Barbería de Juan',  'text', { required: true })}
            {field('direccion',      'Dirección',          'Calle Mayor 1, Barcelona')}
            {field('telefono',       'Teléfono',           '612 345 678')}
            {field('email_admin',    'Email admin',        'admin@barberia.com')}
            {field('tier',           'Plan',               '',                     'select')}
            {field('logo_url',       'Logo (URL)',         'https://...')}
            {field('imagen_url',     'Imagen fondo (URL)','https://...')}
            {field('color_primary',  'Color primario',    '#725b3f',              'color')}
            {field('color_secondary','Color secundario',  '#2d2d2d',              'color')}
          </div>
          <div style={{ marginTop: 8, padding: '10px 12px', background: 'var(--color-surface-var)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--color-on-surface-var)' }}>
            Tras crear la barbería, ve a Supabase Auth para crear el usuario admin y vincula su UUID en la columna <code>auth_user_id</code>.
          </div>
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-primary" onClick={handleCreate} disabled={saving}>
              {saving ? 'Creando...' : 'Crear barbería'}
            </button>
          </div>
        </div>
      )}

      {/* Lista de barberias */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
          Barberias activas ({allBarberias.length})
        </h2>
        {allBarberias.length === 0 ? (
          <p style={{ color: 'var(--color-on-surface-var)', fontSize: 14 }}>No hay barberias.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-outline)' }}>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>ID</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>Nombre</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>Email admin</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>Plan</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>Colores</th>
              </tr>
            </thead>
            <tbody>
              {allBarberias.map(b => (
                <tr key={b.id} style={{ borderBottom: '1px solid var(--color-outline)' }}>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12, color: 'var(--color-on-surface-var)' }}>{b.id}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {b.logo_url && <img src={b.logo_url} alt="" style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'cover' }} />}
                      {b.nombre}
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--color-on-surface-var)' }}>{b.email_admin ?? '—'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                      background: b.tier === 'premium' ? '#f59e0b22' : b.tier === 'pro' ? '#3b82f622' : '#6b728022',
                      color:      b.tier === 'premium' ? '#b45309'   : b.tier === 'pro' ? '#1d4ed8'   : '#374151'
                    }}>
                      {b.tier ?? 'free'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span title={b.color_primary}   style={{ width: 20, height: 20, borderRadius: 4, background: b.color_primary   ?? '#725b3f', border: '1px solid #ccc' }} />
                      <span title={b.color_secondary} style={{ width: 20, height: 20, borderRadius: 4, background: b.color_secondary ?? '#2d2d2d', border: '1px solid #ccc' }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
