// Extracts YouTube video ID from any format of YouTube URL
export const getYouTubeVideoId = (rawUrl?: string): string | null => {
  if (!rawUrl) return null;
  const url = rawUrl.trim();

  const regExp = /(?:youtube(?:-nocookie)?\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/i;
  const match = url.match(regExp);
  if (match && match[1]) {
    return match[1];
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").replace(/^m\./, "");
    if (host === "youtube.com") {
      const v = parsed.searchParams.get("v");
      if (v) return v;
      if (parsed.pathname.startsWith("/embed/") || parsed.pathname.startsWith("/shorts/")) {
        return parsed.pathname.split("/")[2] || null;
      }
    }
    if (host === "youtu.be") {
      return parsed.pathname.slice(1).split("/")[0] || null;
    }
  } catch {
    // not a valid URL object
  }

  return null;
};

// Returns standard high quality YouTube thumbnail image URL (480x360)
export const getYouTubeThumbnail = (rawUrl?: string): string | null => {
  const id = getYouTubeVideoId(rawUrl);
  if (!id) return null;
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
};

// Intelligently resolves the thumbnail for any course:
// 1. If thumbnail is a YouTube link, converts to YouTube thumbnail
// 2. If thumbnail is empty, extracts from previewVideoUrl
export const resolveThumbnail = (thumbnail?: string, previewVideoUrl?: string): string | undefined => {
  if (thumbnail && thumbnail.trim()) {
    const trimmed = thumbnail.trim();
    const yt = getYouTubeThumbnail(trimmed);
    if (yt) return yt;
    return trimmed;
  }

  if (previewVideoUrl && previewVideoUrl.trim()) {
    const yt = getYouTubeThumbnail(previewVideoUrl.trim());
    if (yt) return yt;
  }

  return undefined;
};
