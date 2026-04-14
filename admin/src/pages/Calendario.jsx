import { useEffect, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import { supabase } from '../lib/supabase'
import { useBarberia } from '../lib/BarberiaContext'

// dia_semana en BD: 1=Lunes ... 7=Domingo
// FullCalendar daysOfWeek: 0=Domingo, 1=Lunes ... 6=Sábado
function toFCDay(diaSemana) {
  return diaSemana === 7 ? 0 : diaSemana
}

export default function Calendario() {
  const calendarRef = useRef(null)
  const [events, setEvents] = useState([])
  const [mostrarCanceladas, setMostrarCanceladas] = useState(false)
  // null = cargando (no renderizar FC hasta tener datos reales)
  const [businessHours, setBusinessHours] = useState(null)
  const { barberiaId } = useBarberia()

  useEffect(() => {
    if (!barberiaId) return
    async function loadBusinessHours() {
      try {
        // Solo peluqueros activos de esta barbería
        const { data: peluqueros } = await supabase
          .from('peluqueros')
          .select('id')
          .eq('barberia_id', barberiaId)
          .eq('activo', true)

        const ids = (peluqueros ?? []).map(p => p.id)
        if (ids.length === 0) { setBusinessHours([]); return }

        // Horarios de esos peluqueros activos
        const { data, error } = await supabase
          .from('horarios')
          .select('dia_semana, hora_inicio, hora_fin')
          .in('peluquero_id', ids)
          .eq('activo', true)

        if (error) { setBusinessHours([]); return }

        const hours = (data ?? []).map(h => ({
          daysOfWeek: [toFCDay(h.dia_semana)],
          startTime: h.hora_inicio.slice(0, 5),
          endTime: h.hora_fin.slice(0, 5),
        }))
        setBusinessHours(hours)
      } catch {
        setBusinessHours([])
      }
    }
    loadBusinessHours()
  }, [barberiaId])

  async function loadEvents(conCanceladas = false) {
    let query = supabase.from('citas').select('id, cliente_id, servicio_id, fecha_hora, duracion_min, estado').eq('barberia_id', barberiaId)
    if (!conCanceladas) query = query.neq('estado', 'cancelada')

    const [{ data: citas }, { data: clientes }, { data: servicios }, { data: bloqueos }, { data: peluqueros }] = await Promise.all([
      query,
      supabase.from('clientes').select('id, nombre, apellido'),
      supabase.from('servicios').select('id, nombre'),
      supabase.from('bloqueos').select('id, peluquero_id, fecha_inicio, fecha_fin, motivo, tipo').eq('barberia_id', barberiaId),
      supabase.from('peluqueros').select('id, nombre').eq('barberia_id', barberiaId),
    ])

    const clienteMap = Object.fromEntries((clientes ?? []).map(c => [c.id, `${c.nombre} ${c.apellido ?? ''}`.trim()]))
    const servicioMap = Object.fromEntries((servicios ?? []).map(s => [s.id, s.nombre]))
    const peluqueroMap = Object.fromEntries((peluqueros ?? []).map(p => [p.id, p.nombre]))

    const mapped = (citas ?? []).map(c => {
      // fecha_hora se almacena con +00:00 pero el valor es hora Madrid (no UTC).
      // Quitamos el offset para que JS lo interprete como hora local y no sume +2h.
      const localStr = (c.fecha_hora || '').replace(/([+-]\d{2}:\d{2}|Z)$/, '')
      const start = new Date(localStr)
      const end = new Date(start.getTime() + c.duracion_min * 60000)
      const cancelada = c.estado === 'cancelada'
      return {
        id: c.id,
        title: `${clienteMap[c.cliente_id] ?? '—'} · ${servicioMap[c.servicio_id] ?? c.servicio_id}`,
        start,
        end,
        backgroundColor: cancelada ? '#c4bdb8' : '#725b3f',
        borderColor: cancelada ? '#c4bdb8' : '#725b3f',
        textColor: '#fff',
        extendedProps: { estado: c.estado },
      }
    })

    const bloqueosEvents = (bloqueos ?? []).flatMap(b => {
      const isGeneral = !b.peluquero_id
      const label = b.motivo || (b.tipo === 'vacaciones' ? 'Ausencia' : 'Cierre')
      const title = isGeneral ? label : `${label} · ${peluqueroMap[b.peluquero_id] ?? ''}`
      const color = isGeneral ? '#dc2626' : '#ea580c'

      // Expandir el rango en días individuales para cubrir la rejilla horaria con fondo
      const events = []
      const cur = new Date(b.fecha_inicio.slice(0, 10) + 'T12:00:00')
      const fin = new Date(b.fecha_fin.slice(0, 10) + 'T12:00:00')
      let first = true
      while (cur <= fin) {
        const d = cur.toISOString().slice(0, 10)
        // Fondo que cubre la franja horaria visible
        events.push({
          id: `bloqueo-bg-${b.id}-${d}`,
          start: `${d}T08:00:00`,
          end: `${d}T20:00:00`,
          display: 'background',
          backgroundColor: color + '40',
        })
        // Etiqueta all-day solo en el primer día del rango
        if (first) {
          const endLabel = new Date(fin.getTime() + 86400000).toISOString().slice(0, 10)
          events.push({
            id: `bloqueo-label-${b.id}`,
            title,
            start: b.fecha_inicio.slice(0, 10),
            end: endLabel,
            allDay: true,
            backgroundColor: color,
            borderColor: color,
            textColor: '#fff',
          })
          first = false
        }
        cur.setDate(cur.getDate() + 1)
      }
      return events
    })

    setEvents([...mapped, ...bloqueosEvents])
  }

  useEffect(() => { if (barberiaId) loadEvents(mostrarCanceladas) }, [mostrarCanceladas, barberiaId])

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Calendario</h1>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-on-surface-var)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={mostrarCanceladas}
            onChange={e => setMostrarCanceladas(e.target.checked)}
          />
          Mostrar canceladas
        </label>
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--color-outline)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
        {businessHours === null
          ? <p style={{ color: 'var(--color-on-surface-var)', padding: 8 }}>Cargando calendario...</p>
          : <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          locale="es"
          headerToolbar={{
            left: 'prev,next,today',
            center: 'title',
            right: 'dayGridMonth timeGridWeek timeGridDay',
          }}
          buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día' }}
          slotMinTime="08:00:00"
          slotMaxTime="20:00:00"
          allDaySlot={true}
          weekends={true}
          hiddenDays={[0]} // ocultar domingo
          slotDuration="00:30:00"
          height="auto"
          businessHours={businessHours}
          events={events}
          eventClick={({ event }) => {
            const estado = event.extendedProps.estado
            alert(`${event.title}\nEstado: ${estado}`)
          }}
          nowIndicator={true}
        />}
      </div>
    </div>
  )
}
