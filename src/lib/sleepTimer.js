export function sleepTimerDue(timer, now, key, ended = false) {
  if (!timer) return false;
  return timer.mode === "time"
    ? now >= timer.until
    : ended || key !== timer.key;
}
