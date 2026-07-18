export type AlbumCategory =
  | 'gym'
  | 'body'
  | 'weight_loss'
  | 'certificates'
  | 'achievements'
  | 'memories'
  | 'custom';

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

/** The URI to render as a still (video poster if present, else the media). */
export function displayUri(media: Pick<GalleryPhoto, 'uri' | 'thumbnailUri'>): string {
  return media.thumbnailUri ?? media.uri;
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

export type UpdatePhotoInput = Partial<Pick<GalleryPhoto, 'caption' | 'tags' | 'albumId' | 'takenAt' | 'isFavorite'>>;
