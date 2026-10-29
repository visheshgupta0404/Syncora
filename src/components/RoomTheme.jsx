import { useEffect, useState } from "react";
import { roomThemes, validRoomTheme } from "../lib/roomExtras.js";
import { readSaved, save } from "../lib/storage.js";

export default function RoomTheme({ roomId, onChange }) {
  const [theme, setTheme] = useState(() => validRoomTheme(readSaved(`theme:${roomId}`)));
  const selected = roomThemes.find((item) => item.id === theme);
  useEffect(() => {
    onChange(theme);
    save(`theme:${roomId}`, theme);
  }, [theme, roomId, onChange]);
  return (
    <div className="room-theme-picker">
      <label htmlFor="room-ambience">SET THE SCENE <span>Just for you</span></label>
      <div className="room-theme-control">
        <span className={`scene-swatch scene-swatch-${theme}`} aria-hidden="true" />
        <select id="room-ambience" value={theme} onChange={(event) => setTheme(validRoomTheme(event.target.value))} aria-describedby="room-mood">
          {roomThemes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </div>
      <span id="room-mood" className="room-mood">{selected.mood}</span>
    </div>
  );
}
