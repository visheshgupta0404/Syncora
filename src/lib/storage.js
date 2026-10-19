export function readSaved(key, fallback = null) {
  try {
    return JSON.parse(localStorage.getItem(`syncora:${key}`)) ?? fallback;
  } catch {
    return fallback;
  }
}
export function save(key, value) {
  try {
    if (value === null) localStorage.removeItem(`syncora:${key}`);
    else localStorage.setItem(`syncora:${key}`, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
