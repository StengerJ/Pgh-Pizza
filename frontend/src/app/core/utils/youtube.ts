const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;
const YOUTUBE_PATH_ID_PATTERN = /^\/(?:embed|shorts|live|v)\/([a-zA-Z0-9_-]{11})(?:\/|$)/;

export function extractYoutubeVideoId(value: string | null | undefined): string | null {
  const candidate = value?.trim();

  if (!candidate) {
    return null;
  }

  if (YOUTUBE_ID_PATTERN.test(candidate)) {
    return candidate;
  }

  const queryOnlyId = extractYoutubeVideoIdFromQuery(candidate);
  if (queryOnlyId) {
    return queryOnlyId;
  }

  try {
    const url = new URL(candidate);
    const host = url.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return id && YOUTUBE_ID_PATTERN.test(id) ? id : null;
    }

    if (isYoutubeHost(host)) {
      const watchId = url.searchParams.get('v');

      if (watchId && YOUTUBE_ID_PATTERN.test(watchId)) {
        return watchId;
      }

      const pathMatch = url.pathname.match(YOUTUBE_PATH_ID_PATTERN);
      if (pathMatch) {
        return pathMatch[1];
      }

      const nestedUrl = url.searchParams.get('u') ?? url.searchParams.get('url');
      if (!nestedUrl) {
        return null;
      }

      const nestedCandidate = nestedUrl.startsWith('/')
        ? new URL(nestedUrl, 'https://www.youtube.com').toString()
        : nestedUrl;
      return extractYoutubeVideoId(nestedCandidate);
    }
  } catch {
    return null;
  }

  return null;
}

export function buildYoutubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}

function isYoutubeHost(host: string): boolean {
  return [
    'youtube.com',
    'm.youtube.com',
    'music.youtube.com',
    'youtube-nocookie.com'
  ].includes(host);
}

function extractYoutubeVideoIdFromQuery(candidate: string): string | null {
  const query = candidate.startsWith('?')
    ? candidate.slice(1)
    : candidate.startsWith('watch?')
      ? candidate.slice('watch?'.length)
      : candidate.startsWith('/watch?')
        ? candidate.slice('/watch?'.length)
        : candidate.startsWith('v=')
          ? candidate
          : '';

  if (!query) {
    return null;
  }

  const id = new URLSearchParams(query).get('v');
  return id && YOUTUBE_ID_PATTERN.test(id) ? id : null;
}
