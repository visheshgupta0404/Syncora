import { getGifUrl } from "./chat-media.js";

export const giphyKey = import.meta.env?.VITE_GIPHY_API_KEY?.trim() || "";

export async function requestGiphy(
  path,
  params,
  { key = giphyKey, signal, fetcher = fetch } = {},
) {
  if (!key)
    throw new Error(
      "GIF search is awaiting setup. You can still paste a direct GIF link below.",
    );
  const url = new URL(`https://api.giphy.com/v1/gifs/${path}`);
  url.search = new URLSearchParams({ api_key: key, ...params });
  const response = await fetcher(url, {
    signal,
    cache: "no-store",
    referrerPolicy: "no-referrer",
  });
  if (!response.ok)
    throw new Error(
      response.status === 429
        ? "GIF search has reached its usage limit. Please try later."
        : "GIFs are unavailable right now. Please try again.",
    );
  return response.json();
}

export function gifRendition(item) {
  return (
    getGifUrl(item?.images?.fixed_width?.url) ||
    getGifUrl(item?.images?.original?.url)
  );
}
