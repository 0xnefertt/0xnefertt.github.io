export const youtubePlayerOrigin = "https://www.youtube-nocookie.com";

export function youtubeVideo(value: string) {
  if (!/^https?:\/\/[^\s<>\\]+$/i.test(value)) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.username || url.password || url.port) return null;

  let id: string | null | undefined;
  if (url.hostname === "youtu.be") id = url.pathname.match(/^\/([\w-]{11})\/?$/)?.[1];
  else if (["www.youtube.com", "youtube.com", "m.youtube.com", "www.youtube-nocookie.com"].includes(url.hostname)) {
    id = url.pathname === "/watch" ? url.searchParams.get("v") : url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})\/?$/)?.[1];
  }
  if (!id || !/^[\w-]{11}$/.test(id)) return null;

  const time = url.searchParams.get("t") ?? url.searchParams.get("start") ?? "";
  const parts = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/.exec(time);
  const seconds = parts ? Number(parts[1] ?? 0) * 3600 + Number(parts[2] ?? 0) * 60 + Number(parts[3] ?? 0) : 0;
  const timed = seconds > 0 && Number.isSafeInteger(seconds);
  return {
    thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    url: `https://youtu.be/${id}${timed ? `?t=${seconds}` : ""}`,
    src: `${youtubePlayerOrigin}/embed/${id}${timed ? `?start=${seconds}` : ""}`,
  };
}

export function pixelWidth(value: unknown): string | null {
  const text = String(value ?? "");
  return /^[1-9]\d*$/.test(text) && Number.isSafeInteger(Number(text)) ? text : null;
}

export function youtubeFrameAttributes(video: NonNullable<ReturnType<typeof youtubeVideo>>, width?: unknown): Record<string, string> {
  const pixels = pixelWidth(width);
  return {
    class: "youtube-player",
    ...(pixels ? { width: pixels } : {}),
    src: video.src,
    title: "YouTube video player",
    loading: "lazy",
    referrerpolicy: "strict-origin-when-cross-origin",
    allow: "encrypted-media; picture-in-picture; fullscreen",
    allowfullscreen: "allowfullscreen",
  };
}
