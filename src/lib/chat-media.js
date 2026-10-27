// Only direct GIF media from these providers can become image messages.
export function getGifUrl(text) {
  if (typeof text !== "string" || text.trim().length > 500) return null;
  try {
    const url = new URL(text.trim());
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      !/^(?:media\d*\.giphy\.com|i\.giphy\.com|media\.tenor\.com|c\.tenor\.com)$/.test(
        url.hostname,
      ) ||
      !/\.gif$/i.test(url.pathname)
    )
      return null;
    return text.trim();
  } catch {
    return null;
  }
}

export function getGiphyId(text) {
  if (typeof text !== "string") return null;
  return (
    text
      .trim()
      .match(/^https:\/\/giphy\.com\/gifs\/([a-zA-Z0-9]{1,80})$/)?.[1] ?? null
  );
}
