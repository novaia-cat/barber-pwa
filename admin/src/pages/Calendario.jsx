import { useEffect, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import { supabase } from '../lib/supabase'

export default function Calendario() {
  const calendarRef = useRef(null)
  const [events, setEvents] = useState([])
  const [mostrarCanceladas, setMostrarCanceladas] = useState(false)

  async function loadEvents(conCanceladas = false) {
    let query = supabase.from('citas').select('id, cliente_id, servicio_id, fecha_hora, duracion_min, estado')
    if (!conCanceladas) query = query.neq('estado', 'cancelada')

    const [{ data: citas }, { data: clientes }, { data: servicios }] = await Promise.all([
      query,
      supabase.from('clientes').select('id, nombre, apellido'),
      supabase.from('servicios').select('id, nombre'),
    ])

    const clienteMap = Object.fromEntries((clientes ?? []).map(c => [c.id, `${c.nombre} ${c.apellido ?? ''}`.trim()]))
    const servicioMap = Object.fromEntries((servicios ?? []).map(s => [s.id, s.nombre]))

    const mapped = (citas ?? []).map(c => {
      const start = new Date(c.fecha_hora)
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
    setEvents(mapped)
  }

  useEffect(() => { loadEvents(mostrarCanceladas) }, [mostrarCanceladas])

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
        <FullCalendar
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
          allDaySlot={false}
          weekends={true}
          hiddenDays={[0]} // ocultar domingo
          slotDuration="00:30:00"
          height="auto"
          events={events}
          eventClick={({ event }) => {
            const estado = event.extendedProps.estado
            alert(`${event.title}\nEstado: ${estado}`)
          }}
          nowIndicator={true}
        />
      </div>
    </div>
  )
}
