import { buildYoutubeEmbedUrl, extractYoutubeVideoId } from './youtube';

describe('youtube utilities', () => {
  it('should extract YouTube video IDs from supported URL formats', () => {
    expect(extractYoutubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ'
    );
    expect(extractYoutubeVideoId('https://www.youtube.com/watch?v=Cstdq9o8TO8')).toBe(
      'Cstdq9o8TO8'
    );
    expect(extractYoutubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractYoutubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ?si=abc')).toBe(
      'dQw4w9WgXcQ'
    );
    expect(extractYoutubeVideoId('https://m.youtube.com/shorts/dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ'
    );
    expect(extractYoutubeVideoId('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ'
    );
    expect(extractYoutubeVideoId('https://www.youtube.com/live/dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ'
    );
    expect(
      extractYoutubeVideoId('https://www.youtube.com/attribution_link?u=/watch%3Fv%3DdQw4w9WgXcQ')
    ).toBe('dQw4w9WgXcQ');
    expect(extractYoutubeVideoId('v=Cstdq9o8TO8')).toBe('Cstdq9o8TO8');
    expect(extractYoutubeVideoId('?v=Cstdq9o8TO8')).toBe('Cstdq9o8TO8');
    expect(extractYoutubeVideoId('watch?v=Cstdq9o8TO8')).toBe('Cstdq9o8TO8');
    expect(extractYoutubeVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('should reject unsupported video values', () => {
    expect(extractYoutubeVideoId('https://example.com/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(extractYoutubeVideoId('not-a-valid-video-id')).toBeNull();
  });

  it('should build safe YouTube embed URLs from validated IDs', () => {
    expect(buildYoutubeEmbedUrl('dQw4w9WgXcQ')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'
    );
  });
});
