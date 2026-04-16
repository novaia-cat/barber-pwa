import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useBarberia } from '../lib/BarberiaContext'

const SUPABASE_URL = 'https://cynnuucihcniqusomgol.supabase.co'
const SUPABASE_SERVICE_ROLE = 'REDACTED_ROTATE_KEY'

async function createAdminUser(email, password, barberia_id) {
  // Crear usuario en Supabase Auth
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE}`
    },
    body: JSON.stringify({ email, password, email_confirm: true })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.msg ?? data.message ?? JSON.stringify(data))

  // Vincular auth_user_id en barberias
  const patch = await fetch(`${SUPABASE_URL}/rest/v1/barberias?id=eq.${barberia_id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ auth_user_id: data.id })
  })
  if (!patch.ok) throw new Error('Usuario creado pero error al vincular barbería')
  return data.id
}

const EMPTY_FORM = {
  id: '', nombre: '', direccion: '', telefono: '',
  email_admin: '', logo_url: '', imagen_url: '',
  color_primary: '#5f5e5e', color_secondary: '#725b3f',
  tier: 'free',
  admin_email: '', admin_password: ''
}

const EDIT_FIELDS = ['nombre', 'direccion', 'telefono', 'email_admin', 'logo_url', 'imagen_url', 'color_primary', 'color_secondary', 'tier']

function FieldInput({ fieldKey, label, value, onChange, placeholder, type = 'text', required }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}{required ? ' *' : ''}</label>
      {type === 'select' ? (
        <select className="input" value={value} onChange={e => onChange(fieldKey, e.target.value)}>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="premium">Premium</option>
        </select>
      ) : (
        <input className="input" type={type} value={value} placeholder={placeholder}
          onChange={e => onChange(fieldKey, e.target.value)} />
      )}
    </div>
  )
}

function FormGrid({ data, onChange, includeId = false, includeAdminUser = false }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      {includeId && (
        <FieldInput fieldKey="id" label="ID (slug único)" value={data.id}
          onChange={onChange} placeholder="mi-barberia" required />
      )}
      <FieldInput fieldKey="nombre"          label="Nombre"              value={data.nombre}          onChange={onChange} placeholder="La Barbería de Juan" required />
      <FieldInput fieldKey="direccion"       label="Dirección"           value={data.direccion}       onChange={onChange} placeholder="Calle Mayor 1, Barcelona" />
      <FieldInput fieldKey="telefono"        label="Teléfono"            value={data.telefono}        onChange={onChange} placeholder="612 345 678" />
      <FieldInput fieldKey="email_admin"     label="Email admin (info)"  value={data.email_admin}     onChange={onChange} placeholder="admin@barberia.com" />
      <FieldInput fieldKey="tier"            label="Plan"                value={data.tier}            onChange={onChange} type="select" />
      <FieldInput fieldKey="logo_url"        label="Logo (URL)"          value={data.logo_url}        onChange={onChange} placeholder="https://..." />
      <FieldInput fieldKey="imagen_url"      label="Imagen fondo (URL)"  value={data.imagen_url}      onChange={onChange} placeholder="https://..." />
      <FieldInput fieldKey="color_primary"   label="Color primario"      value={data.color_primary}   onChange={onChange} type="color" />
      <FieldInput fieldKey="color_secondary" label="Color secundario"    value={data.color_secondary} onChange={onChange} type="color" />
      {includeAdminUser && (
        <>
          <div style={{ gridColumn: '1 / -1', height: 1, background: 'var(--color-outline)', margin: '4px 0' }} />
          <FieldInput fieldKey="admin_email"    label="Email acceso admin"     value={data.admin_email}    onChange={onChange} placeholder="nuevo@barberia.com" type="email" />
          <FieldInput fieldKey="admin_password" label="Contraseña temporal"    value={data.admin_password} onChange={onChange} placeholder="Min. 8 caracteres" type="password" />
        </>
      )}
    </div>
  )
}

function EditRow({ b, onSaved, onCancel }) {
  const [form, setForm] = useState({
    nombre: b.nombre ?? '', direccion: b.direccion ?? '', telefono: b.telefono ?? '',
    email_admin: b.email_admin ?? '', logo_url: b.logo_url ?? '', imagen_url: b.imagen_url ?? '',
    color_primary: b.color_primary ?? '#5f5e5e', color_secondary: b.color_secondary ?? '#725b3f',
    tier: b.tier ?? 'free',
    admin_email: '', admin_password: ''
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState(null)

  function handleChange(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSave() {
    if (!form.nombre.trim()) { setErr('El nombre es obligatorio.'); return }
    setSaving(true); setErr(null)
    const updates = {
      nombre:          form.nombre.trim(),
      direccion:       form.direccion.trim()       || null,
      telefono:        form.telefono.trim()        || null,
      email_admin:     form.email_admin.trim()     || null,
      logo_url:        form.logo_url.trim()        || null,
      imagen_url:      form.imagen_url.trim()      || null,
      color_primary:   form.color_primary          || '#725b3f',
      color_secondary: form.color_secondary        || '#2d2d2d',
      tier:            form.tier,
    }
    const { error } = await supabase.from('barberias').update(updates).eq('id', b.id)
    if (error) { setErr(error.message); setSaving(false); return }

    if (form.admin_email.trim() && form.admin_password.trim()) {
      if (form.admin_password.trim().length < 8) { setErr('La contraseña debe tener al menos 8 caracteres.'); setSaving(false); return }
      try {
        await createAdminUser(form.admin_email.trim(), form.admin_password.trim(), b.id)
      } catch (e) { setErr(`Guardado pero error al crear usuario: ${e.message}`); setSaving(false); return }
    }

    onSaved({ ...b, ...updates })
    setSaving(false)
  }

  return (
    <tr style={{ background: '#f8f9ff' }}>
      <td colSpan={6} style={{ padding: '16px 12px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-on-surface-var)', marginBottom: 12 }}>
          Editando: <code style={{ fontFamily: 'monospace' }}>{b.id}</code>
        </div>
        <FormGrid data={form} onChange={handleChange} includeAdminUser />
        {err && <div className="error-msg" style={{ marginTop: 12 }}>{err}</div>}
        <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn-ghost" onClick={onCancel}>Cancelar</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function Barberias() {
  const { allBarberias, setAllBarberias } = useBarberia()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState(null)
  const [editingId, setEditingId] = useState(null)

  function handleFormChange(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function handleCreate() {
    if (!form.id.trim() || !form.nombre.trim()) {
      setMsg({ type: 'err', text: 'ID y Nombre son obligatorios.' }); return
    }
    if (!/^[a-z0-9-]+$/.test(form.id.trim())) {
      setMsg({ type: 'err', text: 'El ID solo puede contener letras minúsculas, números y guiones.' }); return
    }
    setSaving(true); setMsg(null)
    const row = {
      id:              form.id.trim(),
      nombre:          form.nombre.trim(),
      direccion:       form.direccion.trim()       || null,
      telefono:        form.telefono.trim()        || null,
      email_admin:     form.email_admin.trim()     || null,
      logo_url:        form.logo_url.trim()        || null,
      imagen_url:      form.imagen_url.trim()      || null,
      color_primary:   form.color_primary          || '#725b3f',
      color_secondary: form.color_secondary        || '#2d2d2d',
      tier:            form.tier,
    }
    const { error } = await supabase.from('barberias').insert(row)
    if (error) {
      setMsg({ type: 'err', text: error.message })
      setSaving(false)
      return
    }

    // Si se rellenaron credenciales admin, crear usuario via n8n
    if (form.admin_email.trim() && form.admin_password.trim()) {
      if (form.admin_password.trim().length < 8) {
        setMsg({ type: 'err', text: 'La contraseña debe tener al menos 8 caracteres.' })
        setSaving(false)
        return
      }
      try {
        const userId = await createAdminUser(form.admin_email.trim(), form.admin_password.trim(), row.id)
        row.auth_user_id = userId
      } catch (e) {
        setMsg({ type: 'err', text: `Barbería creada pero error al crear usuario: ${e.message}` })
        setSaving(false)
        return
      }
    }

    setAllBarberias(prev => [...prev, row].sort((a, b) => a.nombre.localeCompare(b.nombre)))
    setForm(EMPTY_FORM)
    setShowForm(false)
    const userMsg = form.admin_email.trim()
      ? `Barbería "${row.nombre}" creada con usuario admin (${form.admin_email.trim()}).`
      : `Barbería "${row.nombre}" creada. Vincula el admin en Supabase Auth → auth_user_id.`
    setMsg({ type: 'ok', text: userMsg })
    setSaving(false)
  }

  function handleSaved(updated) {
    setAllBarberias(prev => prev.map(b => b.id === updated.id ? updated : b))
    setEditingId(null)
  }

  const cardStyle = {
    background: '#fff', border: '1px solid var(--color-outline)',
    borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 20
  }

  const tierBadge = tier => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
    background: tier === 'premium' ? '#f59e0b22' : tier === 'pro' ? '#3b82f622' : '#6b728022',
    color:      tier === 'premium' ? '#b45309'   : tier === 'pro' ? '#1d4ed8'   : '#374151'
  })

  return (
    <div style={{ maxWidth: 760 }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">Barberias</h1>
        <button className="btn-primary" onClick={() => { setShowForm(s => !s); setMsg(null); setEditingId(null) }}>
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
          <FormGrid data={form} onChange={handleFormChange} includeId includeAdminUser />
          <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--color-surface-var)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--color-on-surface-var)' }}>
            Si rellenas <strong>Email acceso admin</strong> + <strong>Contraseña temporal</strong>, se creará el usuario en Supabase Auth y se vinculará automáticamente. Si los dejas en blanco, deberás hacerlo manualmente.
          </div>
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-primary" onClick={handleCreate} disabled={saving}>
              {saving ? 'Creando...' : 'Crear barbería'}
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
          Barberias ({allBarberias.length})
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
                <th style={{ padding: '8px 12px' }} />
              </tr>
            </thead>
            <tbody>
              {allBarberias.map(b => (
                editingId === b.id
                  ? <EditRow key={b.id} b={b} onSaved={handleSaved} onCancel={() => setEditingId(null)} />
                  : (
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
                        <span style={tierBadge(b.tier)}>{b.tier ?? 'free'}</span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <span title={b.color_primary}   style={{ width: 20, height: 20, borderRadius: 4, background: b.color_primary   ?? '#725b3f', border: '1px solid #ccc' }} />
                          <span title={b.color_secondary} style={{ width: 20, height: 20, borderRadius: 4, background: b.color_secondary ?? '#2d2d2d', border: '1px solid #ccc' }} />
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <button
                          className="btn-ghost"
                          style={{ fontSize: 12, padding: '4px 12px' }}
                          onClick={() => { setEditingId(b.id); setShowForm(false) }}
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  )
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
