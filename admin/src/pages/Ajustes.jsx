import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useBarberia } from '../lib/BarberiaContext'

export default function Ajustes() {
  const { barberia, barberiaId, setBarberia } = useBarberia()

  const [form, setForm] = useState({
    nombre:     barberia?.nombre     ?? '',
    direccion:  barberia?.direccion  ?? '',
    telefono:   barberia?.telefono   ?? '',
    logo_url:   barberia?.logo_url   ?? '',
    imagen_url: barberia?.imagen_url ?? '',
  })
  const [savingBarberia, setSavingBarberia] = useState(false)
  const [msgBarberia, setMsgBarberia]       = useState(null)

  const [pwd, setPwd] = useState({ nueva: '', confirmar: '' })
  const [savingPwd, setSavingPwd] = useState(false)
  const [msgPwd, setMsgPwd]       = useState(null)

  async function handleSaveBarberia() {
    if (!form.nombre.trim()) {
      setMsgBarberia({ type: 'err', text: 'El nombre es obligatorio.' })
      return
    }
    setSavingBarberia(true)
    setMsgBarberia(null)
    const updates = {
      nombre:     form.nombre.trim(),
      direccion:  form.direccion.trim()  || null,
      telefono:   form.telefono.trim()   || null,
      logo_url:   form.logo_url.trim()   || null,
      imagen_url: form.imagen_url.trim() || null,
    }
    const { error } = await supabase
      .from('barberias')
      .update(updates)
      .eq('id', barberiaId)
    if (error) {
      setMsgBarberia({ type: 'err', text: error.message })
    } else {
      setBarberia(prev => ({ ...prev, ...updates }))
      setMsgBarberia({ type: 'ok', text: 'Datos guardados correctamente.' })
    }
    setSavingBarberia(false)
  }

  async function handleSavePwd() {
    if (!pwd.nueva || pwd.nueva.length < 6) {
      setMsgPwd({ type: 'err', text: 'La contraseña debe tener al menos 6 caracteres.' })
      return
    }
    if (pwd.nueva !== pwd.confirmar) {
      setMsgPwd({ type: 'err', text: 'Las contraseñas no coinciden.' })
      return
    }
    setSavingPwd(true)
    setMsgPwd(null)
    const { error } = await supabase.auth.updateUser({ password: pwd.nueva })
    if (error) {
      setMsgPwd({ type: 'err', text: error.message })
    } else {
      setPwd({ nueva: '', confirmar: '' })
      setMsgPwd({ type: 'ok', text: 'Contraseña actualizada correctamente.' })
    }
    setSavingPwd(false)
  }

  const cardStyle = {
    background: '#fff',
    border: '1px solid var(--color-outline)',
    borderRadius: 'var(--radius-lg)',
    padding: 28,
    marginBottom: 24,
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="page-header">
        <h1 className="page-title">Ajustes</h1>
      </div>

      {/* Datos de la barbería */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Datos de la barbería</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Nombre *</label>
            <input className="input" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Nombre de la barbería" />
          </div>
          <div className="form-group">
            <label className="form-label">Dirección</label>
            <input className="input" value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} placeholder="Calle, número, ciudad" />
          </div>
          <div className="form-group">
            <label className="form-label">Teléfono</label>
            <input className="input" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} placeholder="612 345 678" />
          </div>
          <div className="form-group">
            <label className="form-label">Logo (URL)</label>
            <input className="input" value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} placeholder="https://..." />
          </div>
          <div className="form-group">
            <label className="form-label">Imagen de fondo (URL)</label>
            <input className="input" value={form.imagen_url} onChange={e => setForm(f => ({ ...f, imagen_url: e.target.value }))} placeholder="https://..." />
          </div>
        </div>
        {msgBarberia && (
          <div className={msgBarberia.type === 'ok' ? 'success-msg' : 'error-msg'} style={{ marginTop: 16 }}>
            {msgBarberia.text}
          </div>
        )}
        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-primary" onClick={handleSaveBarberia} disabled={savingBarberia}>
            {savingBarberia ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {/* Cambiar contraseña */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Cambiar contraseña</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Nueva contraseña</label>
            <input className="input" type="password" value={pwd.nueva} onChange={e => setPwd(p => ({ ...p, nueva: e.target.value }))} placeholder="Mínimo 6 caracteres" autoComplete="new-password" />
          </div>
          <div className="form-group">
            <label className="form-label">Confirmar contraseña</label>
            <input className="input" type="password" value={pwd.confirmar} onChange={e => setPwd(p => ({ ...p, confirmar: e.target.value }))} placeholder="Repite la contraseña" autoComplete="new-password" />
          </div>
        </div>
        {msgPwd && (
          <div className={msgPwd.type === 'ok' ? 'success-msg' : 'error-msg'} style={{ marginTop: 16 }}>
            {msgPwd.text}
          </div>
        )}
        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-primary" onClick={handleSavePwd} disabled={savingPwd}>
            {savingPwd ? 'Guardando...' : 'Cambiar contraseña'}
          </button>
        </div>
      </div>
    </div>
  )
}
