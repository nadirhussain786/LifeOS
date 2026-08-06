export type AlbumCategory =
  'gym' | 'body' | 'weight_loss' | 'certificates' | 'achievements' | 'memories' | 'custom';

export type GalleryAlbum = {
  id: string;
  name: string;
  category: AlbumCategory;
  coverPhotoId: string | null;
  createdAt: number;
  updatedAt: number;
};

export type MediaType = 'photo' | 'video';

export type GalleryPhoto = {
  id: string;
  albumId: string | null;
  uri: string;
  mediaType: MediaType;
  durationMs: number | null;
  /** Poster frame for videos; null for photos (which render their own uri). */
  thumbnailUri: string | null;
  width: number | null;
  height: number | null;
  caption: string | null;
  tags: string[];
  isFavorite: boolean;
  takenAt: number;
  createdAt: number;
};

/**
 * Whether this device holds the actual file.
 *
 * Gallery rows sync; the photo and video files do not. A row pulled from
 * another phone carries everything *about* the media — its album, caption,
 * favourite flag, when it was taken — and an empty `uri`, because the path it
 * had on the other device means nothing here. That is a normal state, not an
 * error, and the UI says "not on this device" rather than rendering a broken
 * image. See features/sync/config/sync-tables.ts.
 */
export function isOnThisDevice(media: Pick<GalleryPhoto, 'uri'>): boolean {
  return media.uri.length > 0;
}

/** The URI to render as a still (video poster if present, else the media), or
 * null when the file lives on another device. */
export function displayUri(media: Pick<GalleryPhoto, 'uri' | 'thumbnailUri'>): string | null {
  return media.thumbnailUri || media.uri || null;
}

/** Formats a video duration in ms as "m:ss" (e.g. 75000 → "1:15"). */
export function formatDuration(ms: number | null): string {
  if (!ms || ms <= 0) return '0:00';
  const total = Math.round(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export type AlbumWithCover = GalleryAlbum & {
  coverUri: string | null;
  photoCount: number;
  videoCount: number;
  /** The two ends of the transformation: oldest and newest media by `takenAt`.
   *  Both null while the album is still empty. */
  firstUri: string | null;
  latestUri: string | null;
  firstTakenAt: number | null;
  latestTakenAt: number | null;
};

export type CreatePhotoInput = {
  albumId: string | null;
  uri: string;
  mediaType?: MediaType;
  durationMs?: number | null;
  thumbnailUri?: string | null;
  width?: number | null;
  height?: number | null;
  takenAt?: number;
  caption?: string | null;
  tags?: string[];
};

export type UpdatePhotoInput = Partial<
  Pick<GalleryPhoto, 'caption' | 'tags' | 'albumId' | 'takenAt' | 'isFavorite'>
>;
