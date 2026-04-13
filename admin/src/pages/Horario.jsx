import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useBarberia } from '../lib/BarberiaContext'

const DIAS = [
  { key: 1, label: 'Lunes' },
  { key: 2, label: 'Martes' },
  { key: 3, label: 'Miércoles' },
  { key: 4, label: 'Jueves' },
  { key: 5, label: 'Viernes' },
  { key: 6, label: 'Sábado' },
  { key: 7, label: 'Domingo' },
]

const DEFAULT_DIA = {
  activo: false,
  apertura: '09:00',
  cierre: '19:00',
  descanso: false,
  descanso_inicio: '13:00',
  descanso_fin: '15:00',
}

function buildGrid(rows) {
  // rows: array de horarios del peluquero. 2 rows x día = con descanso, 1 row = sin descanso
  const grid = {}
  DIAS.forEach(d => { grid[d.key] = { ...DEFAULT_DIA } })

  // Agrupar rows por dia_semana
  const byDay = {}
  rows.forEach(r => {
    if (!byDay[r.dia_semana]) byDay[r.dia_semana] = []
    byDay[r.dia_semana].push(r)
  })

  Object.entries(byDay).forEach(([dia, dayRows]) => {
    const sorted = [...dayRows].sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
    if (sorted.length === 1) {
      grid[dia] = {
        activo: sorted[0].activo !== false,
        apertura: sorted[0].hora_inicio.slice(0, 5),
        cierre:   sorted[0].hora_fin.slice(0, 5),
        descanso: false,
        descanso_inicio: '13:00',
        descanso_fin:    '15:00',
      }
    } else if (sorted.length >= 2) {
      grid[dia] = {
        activo:          sorted[0].activo !== false,
        apertura:        sorted[0].hora_inicio.slice(0, 5),
        cierre:          sorted[1].hora_fin.slice(0, 5),
        descanso:        true,
        descanso_inicio: sorted[0].hora_fin.slice(0, 5),
        descanso_fin:    sorted[1].hora_inicio.slice(0, 5),
      }
    }
  })

  return grid
}

function TimeInput({ value, onChange, disabled }) {
  return (
    <input
      type="time"
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      style={{
        border: '1px solid var(--color-outline)',
        borderRadius: 'var(--radius-sm)',
        padding: '4px 8px',
        fontSize: 13,
        fontFamily: 'var(--font)',
        color: disabled ? 'var(--color-on-surface-var)' : 'var(--color-on-surface)',
        background: disabled ? 'var(--color-surface-low)' : '#fff',
        width: 90,
      }}
    />
  )
}

export default function Horario() {
  const [peluqueros, setPeluqueros]   = useState([])
  const [peluqueroId, setPeluqueroId] = useState('')
  const [grid, setGrid]               = useState({})
  const [loading, setLoading]         = useState(false)
  const [saving, setSaving]           = useState(false)
  const [msg, setMsg]                 = useState(null) // { type: 'ok'|'err', text }
  const { barberiaId }                = useBarberia()

  // Cargar lista de peluqueros
  useEffect(() => {
    supabase.from('peluqueros').select('id, nombre').eq('barberia_id', barberiaId).eq('activo', true).order('nombre')
      .then(({ data }) => {
        const list = data ?? []
        setPeluqueros(list)
        if (list.length > 0) setPeluqueroId(list[0].id)
      })
  }, [barberiaId])

  // Cargar horarios cuando cambia el peluquero
  useEffect(() => {
    if (!peluqueroId) return
    setLoading(true)
    setMsg(null)
    supabase.from('horarios').select('*').eq('peluquero_id', peluqueroId)
      .then(({ data }) => {
        setGrid(buildGrid(data ?? []))
        setLoading(false)
      })
  }, [peluqueroId])

  function setDia(key, field, value) {
    setGrid(g => ({ ...g, [key]: { ...g[key], [field]: value } }))
  }

  async function handleSave() {
    if (!peluqueroId) return
    setSaving(true)
    setMsg(null)

    // Borrar todos los horarios del peluquero y reinsertar
    const { error: delErr } = await supabase.from('horarios').delete().eq('peluquero_id', peluqueroId)
    if (delErr) { setMsg({ type: 'err', text: delErr.message }); setSaving(false); return }

    const rows = []
    DIAS.forEach(({ key }) => {
      const d = grid[key]
      if (!d?.activo) return
      if (d.descanso) {
        rows.push({ peluquero_id: peluqueroId, dia_semana: key, hora_inicio: d.apertura, hora_fin: d.descanso_inicio, activo: true })
        rows.push({ peluquero_id: peluqueroId, dia_semana: key, hora_inicio: d.descanso_fin, hora_fin: d.cierre, activo: true })
      } else {
        rows.push({ peluquero_id: peluqueroId, dia_semana: key, hora_inicio: d.apertura, hora_fin: d.cierre, activo: true })
      }
    })

    if (rows.length > 0) {
      const { error: insErr } = await supabase.from('horarios').insert(rows)
      if (insErr) { setMsg({ type: 'err', text: insErr.message }); setSaving(false); return }
    }

    setMsg({ type: 'ok', text: 'Horario guardado correctamente.' })
    setSaving(false)
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Horario semanal</h1>
        <button className="btn-primary" onClick={handleSave} disabled={saving || !peluqueroId}>
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      {/* Selector peluquero */}
      <div style={{ marginBottom: 24 }}>
        <select
          value={peluqueroId}
          onChange={e => setPeluqueroId(e.target.value)}
          className="input"
          style={{ maxWidth: 240 }}
        >
          {peluqueros.map(p => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
      </div>

      {/* Mensaje ok/error */}
      {msg && (
        <div className={msg.type === 'ok' ? 'success-msg' : 'error-msg'} style={{ marginBottom: 16 }}>
          {msg.text}
        </div>
      )}

      {/* Grid semanal */}
      {loading
        ? <p style={{ color: 'var(--color-on-surface-var)' }}>Cargando...</p>
        : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 110 }}>Día</th>
                  <th style={{ width: 70 }}>Activo</th>
                  <th>Apertura</th>
                  <th>Cierre</th>
                  <th style={{ width: 80 }}>Descanso</th>
                  <th>Inicio descanso</th>
                  <th>Fin descanso</th>
                </tr>
              </thead>
              <tbody>
                {DIAS.map(({ key, label }) => {
                  const d = grid[key] ?? { ...DEFAULT_DIA }
                  return (
                    <tr key={key} style={{ opacity: d.activo ? 1 : 0.45 }}>
                      <td style={{ fontWeight: 600 }}>{label}</td>
                      <td>
                        <input
                          type="checkbox"
                          checked={d.activo}
                          onChange={e => setDia(key, 'activo', e.target.checked)}
                          style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--color-secondary)' }}
                        />
                      </td>
                      <td><TimeInput value={d.apertura} onChange={v => setDia(key, 'apertura', v)} disabled={!d.activo} /></td>
                      <td><TimeInput value={d.cierre}   onChange={v => setDia(key, 'cierre', v)}   disabled={!d.activo} /></td>
                      <td>
                        <input
                          type="checkbox"
                          checked={d.descanso}
                          onChange={e => setDia(key, 'descanso', e.target.checked)}
                          disabled={!d.activo}
                          style={{ width: 18, height: 18, cursor: d.activo ? 'pointer' : 'default', accentColor: 'var(--color-secondary)' }}
                        />
                      </td>
                      <td><TimeInput value={d.descanso_inicio} onChange={v => setDia(key, 'descanso_inicio', v)} disabled={!d.activo || !d.descanso} /></td>
                      <td><TimeInput value={d.descanso_fin}    onChange={v => setDia(key, 'descanso_fin', v)}    disabled={!d.activo || !d.descanso} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  )
}
