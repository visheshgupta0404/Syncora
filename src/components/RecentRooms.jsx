export default function RecentRooms({
  rooms,
  rename,
  forget,
  rejoin,
  disabled,
}) {
  if (!rooms.length) return null;
  return (
    <section className="recent-rooms" aria-labelledby="recent-rooms-title">
      <h3 id="recent-rooms-title">Your rooms</h3>
      <p>Private shortcuts on this device. Open one room at a time.</p>
      {rooms.map((room) => (
        <article key={room.id}>
          <label>
            Room nickname
            <input
              aria-label={`Nickname for ${room.name}`}
              defaultValue={room.name}
              key={room.name}
              maxLength={40}
              onBlur={(event) => rename(room.id, event.target.value)}
            />
          </label>
          <small>
            Visited {new Date(room.lastUsed).toLocaleDateString()} · last known
            expiry {new Date(room.expiresAt).toLocaleDateString()}
          </small>
          <div className="library-actions">
            <button disabled={disabled} onClick={() => rejoin(room.code)}>
              Rejoin room ↗
            </button>
            <button onClick={() => forget(room.id)}>Forget shortcut</button>
          </div>
        </article>
      ))}
      <small>
        Nicknames are only visible to you. Clearing browser data removes these
        shortcuts. Forgetting a shortcut does not release your seat.
      </small>
    </section>
  );
}
