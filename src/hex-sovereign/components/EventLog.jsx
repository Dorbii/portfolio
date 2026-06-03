export default function EventLog({ events }) {
  return (
    <section className="event-log" aria-label="Match event log">
      <div className="panel-header">
        <div>
          <p className="small-label">Match log</p>
          <h2>Events</h2>
        </div>
      </div>
      <ol>
        {events.map((event) => (
          <li key={event.id}>
            <span className={`event-dot ${event.seat ?? 'neutral'}`} />
            <div>
              <p>{event.message}</p>
              <small>
                {event.kind} | Cycle {event.cycle} | Turn {event.turn}
              </small>
              {event.detail && Object.keys(event.detail).length > 0 ? (
                <code>{JSON.stringify(event.detail)}</code>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
