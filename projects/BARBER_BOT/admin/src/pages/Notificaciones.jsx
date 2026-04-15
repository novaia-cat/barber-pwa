import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useBarberia } from '../lib/BarberiaContext'

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY
const EDGE_SEND_PUSH = `${SUPABASE_URL}/functions/v1/send-push`

const IconBell = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
)

const IconSend = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
)

const IconRefresh = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
)

function StatCard({ label, value, sub }) {
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 13, color: 'var(--color-on-surface-var)' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-on-surface)' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--color-on-surface-var)' }}>{sub}</div>}
    </div>
  )
}

export default function Notificaciones() {
  const { barberiaId } = useBarberia()

  const [subs, setSubs]         = useState([])
  const [log, setLog]           = useState([])
  const [loading, setLoading]   = useState(true)
  const [sending, setSending]   = useState(false)
  const [resultado, setResultado] = useState(null)

  const [titulo, setTitulo]     = useState('')
  const [cuerpo, setCuerpo]     = useState('')
  const [destino, setDestino]   = useState('todos') // 'todos' | 'cita_hoy'

  async function loadData() {
    if (!barberiaId) return
    setLoading(true)
    const [{ data: subsData }, { data: logData }] = await Promise.all([
      supabase.from('push_subscriptions').select('id, endpoint, p256dh, auth, is_admin, created_at, cliente_id').eq('barberia_id', barberiaId).order('created_at', { ascending: false }),
      supabase.from('notificaciones_log').select('*').eq('barberia_id', barberiaId).order('created_at', { ascending: false }).limit(20)
    ])
    setSubs(subsData ?? [])
    setLog(logData ?? [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [barberiaId])

  async function getDestinatarios() {
    if (destino === 'todos') return subs

    // Solo clientes con cita hoy
    const hoy = new Date().toISOString().slice(0, 10)
    const { data: citas } = await supabase
      .from('citas')
      .select('cliente_id')
      .eq('barberia_id', barberiaId)
      .gte('fecha_hora', `${hoy}T00:00:00`)
      .lte('fecha_hora', `${hoy}T23:59:59`)
      .neq('estado', 'cancelada')

    if (!citas?.length) return []
    const clienteIds = new Set(citas.map(c => c.cliente_id))
    return subs.filter(s => clienteIds.has(s.cliente_id))
  }

  async function handleSend() {
    if (!titulo.trim()) return
    setSending(true)
    setResultado(null)

    try {
      const destinatarios = await getDestinatarios()

      if (!destinatarios.length) {
        setResultado({ ok: 0, err: 0, msg: 'Sin suscriptores para el destino seleccionado.' })
        setSending(false)
        return
      }

      const subscriptions = destinatarios.map(s => {
        // endpoint guardado como objeto JSON o string
        try {
          const parsed = typeof s.endpoint === 'string' && s.endpoint.startsWith('{')
            ? JSON.parse(s.endpoint)
            : s
          return { endpoint: parsed.endpoint ?? s.endpoint, p256dh: s.p256dh, auth: s.auth }
        } catch {
          return { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth }
        }
      })

      const res = await fetch(EDGE_SEND_PUSH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON}` },
        body: JSON.stringify({ subscriptions, title: titulo, body: cuerpo, url: '/' })
      })
      const data = await res.json()
      setResultado({ ok: data.ok ?? 0, err: data.err ?? 0, errors: data.errors })

      // Guardar en log
      await supabase.from('notificaciones_log').insert({
        barberia_id: barberiaId,
        tipo: 'push_cliente',
        titulo,
        cuerpo,
        enviado_a: destino,
        ok_count: data.ok ?? 0,
        err_count: data.err ?? 0
      })

      await loadData()
    } catch (e) {
      setResultado({ ok: 0, err: 1, msg: e.message })
    }
    setSending(false)
  }

  const totalClientes = subs.filter(s => !s.is_admin).length
  const totalAdmin    = subs.filter(s => s.is_admin).length

  function fmtDate(d) {
    return new Date(d).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Notificaciones Push</h1>
        <button className="btn-ghost" onClick={loadData} title="Refrescar">
          <IconRefresh />
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard label="Suscriptores clientes" value={loading ? '…' : totalClientes} sub="dispositivos activos" />
        <StatCard label="Suscriptores admin" value={loading ? '…' : totalAdmin} sub="este panel" />
        <StatCard label="Pushes enviados" value={loading ? '…' : log.length} sub="últimos 20" />
      </div>

      {/* Formulario envío */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 28, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <IconBell />
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Enviar notificación</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Título *</label>
            <input
              className="form-input"
              placeholder="Ej: Oferta especial hoy!"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              maxLength={80}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mensaje</label>
            <textarea
              className="form-input"
              placeholder="Texto de la notificación (opcional)"
              rows={3}
              style={{ resize: 'vertical' }}
              value={cuerpo}
              onChange={e => setCuerpo(e.target.value)}
              maxLength={200}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Destinatarios</label>
            <select className="form-input" value={destino} onChange={e => setDestino(e.target.value)}>
              <option value="todos">Todos los suscriptores ({totalClientes})</option>
              <option value="cita_hoy">Solo clientes con cita hoy</option>
            </select>
          </div>

          {resultado && (
            <div style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: resultado.err > 0 ? 'var(--color-error-bg, #fef2f2)' : '#f0fdf4',
              border: `1px solid ${resultado.err > 0 ? 'var(--color-error, #ef4444)' : '#86efac'}`,
              fontSize: 13
            }}>
              {resultado.msg
                ? resultado.msg
                : <>Enviados: <strong>{resultado.ok}</strong> &nbsp;|&nbsp; Errores: <strong>{resultado.err}</strong>
                  {resultado.errors?.length > 0 && <div style={{ marginTop: 4, opacity: 0.7 }}>{resultado.errors[0]}</div>}
                </>
              }
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="btn-primary"
              onClick={handleSend}
              disabled={sending || !titulo.trim() || totalClientes === 0}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <IconSend />
              {sending ? 'Enviando...' : 'Enviar push'}
            </button>
          </div>
        </div>
      </div>

      {/* Historial */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--color-border)', fontWeight: 600, fontSize: 15 }}>
          Historial reciente
        </div>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-on-surface-var)' }}>Cargando...</div>
        ) : log.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-on-surface-var)' }}>
            Sin envíos todavía.
          </div>
        ) : (
          <table className="table-wrap" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Título</th>
                <th>Destinatarios</th>
                <th>Enviados</th>
                <th>Errores</th>
              </tr>
            </thead>
            <tbody>
              {log.map(item => (
                <tr key={item.id}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>{fmtDate(item.created_at)}</td>
                  <td style={{ fontWeight: 500 }}>{item.titulo}</td>
                  <td>
                    <span className="badge badge-grey">
                      {item.enviado_a === 'todos' ? 'Todos' : item.enviado_a === 'cita_hoy' ? 'Cita hoy' : item.enviado_a}
                    </span>
                  </td>
                  <td style={{ color: '#16a34a', fontWeight: 600 }}>{item.ok_count}</td>
                  <td style={{ color: item.err_count > 0 ? 'var(--color-error)' : 'inherit' }}>{item.err_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
