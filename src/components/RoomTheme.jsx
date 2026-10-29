import { useEffect, useState } from "react";
import { roomThemes, validRoomTheme } from "../lib/roomExtras.js";
import { readSaved, save } from "../lib/storage.js";

export default function RoomTheme({ roomId, onChange }) {
  const [theme, setTheme] = useState(() =>
    validRoomTheme(readSaved(`theme:${roomId}`)),
  );
  useEffect(() => {
    onChange(theme);
    save(`theme:${roomId}`, theme);
  }, [theme, roomId, onChange]);
  return (
    <label className="room-theme-picker">
      Your room theme
      <select
        value={theme}
        onChange={(event) => setTheme(validRoomTheme(event.target.value))}
      >
        {roomThemes.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
    </label>
  );
}
