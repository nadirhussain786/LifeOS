import { and, desc, eq, isNull } from 'drizzle-orm';

import { getDb } from '@/database/client';
import { galleryAlbums, galleryPhotos } from '@/database/schema';
import { deleteMediaFiles } from '@/features/gallery/services/gallery-storage';
import { generateId } from '@/lib/id';
import { LOCAL_USER_ID } from '@/lib/local-user';
import type {
  AlbumCategory,
  AlbumWithCover,
  CreatePhotoInput,
  GalleryAlbum,
  GalleryPhoto,
  UpdatePhotoInput,
} from '@/features/gallery/types/gallery.types';

function toAlbum(row: typeof galleryAlbums.$inferSelect): GalleryAlbum {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    coverPhotoId: row.coverPhotoId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toPhoto(row: typeof galleryPhotos.$inferSelect): GalleryPhoto {
  return {
    id: row.id,
    albumId: row.albumId,
    uri: row.uri,
    mediaType: row.mediaType,
    durationMs: row.durationMs,
    thumbnailUri: row.thumbnailUri,
    width: row.width,
    height: row.height,
    caption: row.caption,
    tags: row.tags ? (JSON.parse(row.tags) as string[]) : [],
    isFavorite: row.isFavorite,
    takenAt: row.takenAt,
    createdAt: row.createdAt,
  };
}

function activePhotoRows() {
  return getDb()
    .select()
    .from(galleryPhotos)
    .where(and(eq(galleryPhotos.userId, LOCAL_USER_ID), isNull(galleryPhotos.deletedAt)))
    .orderBy(desc(galleryPhotos.takenAt))
    .all();
}

// ---- Albums ----

export function listAlbumsWithCover(): AlbumWithCover[] {
  const albums = getDb()
    .select()
    .from(galleryAlbums)
    .where(and(eq(galleryAlbums.userId, LOCAL_USER_ID), isNull(galleryAlbums.deletedAt)))
    .orderBy(desc(galleryAlbums.updatedAt))
    .all()
    .map(toAlbum);

  const photos = activePhotoRows().map(toPhoto);
  const byAlbum = new Map<string, GalleryPhoto[]>();
  for (const photo of photos) {
    if (!photo.albumId) continue;
    if (!byAlbum.has(photo.albumId)) byAlbum.set(photo.albumId, []);
    byAlbum.get(photo.albumId)!.push(photo);
  }

  return albums.map((album) => {
    const albumPhotos = byAlbum.get(album.id) ?? [];
    // Explicit cover, else the most recent photo (photos already sorted desc).
    const cover = album.coverPhotoId
      ? (albumPhotos.find((p) => p.id === album.coverPhotoId) ?? albumPhotos[0])
      : albumPhotos[0];
    const videoCount = albumPhotos.reduce((n, p) => n + (p.mediaType === 'video' ? 1 : 0), 0);
    return {
      ...album,
      coverUri: cover ? (cover.thumbnailUri ?? cover.uri) : null,
      photoCount: albumPhotos.length,
      videoCount,
    };
  });
}

export function getAlbum(id: string): GalleryAlbum | null {
  const row = getDb().select().from(galleryAlbums).where(eq(galleryAlbums.id, id)).get();
  return row ? toAlbum(row) : null;
}

export function createAlbum(name: string, category: AlbumCategory): GalleryAlbum {
  const now = Date.now();
  const album: GalleryAlbum = { id: generateId(), name: name.trim(), category, coverPhotoId: null, createdAt: now, updatedAt: now };
  getDb()
    .insert(galleryAlbums)
    .values({ ...album, userId: LOCAL_USER_ID })
    .run();
  return album;
}

export function updateAlbum(id: string, patch: Partial<Pick<GalleryAlbum, 'name' | 'category' | 'coverPhotoId'>>) {
  getDb().update(galleryAlbums).set({ ...patch, updatedAt: Date.now() }).where(eq(galleryAlbums.id, id)).run();
}

/** Soft-deletes an album and unfiles its photos (they move to All Photos rather
 * than being destroyed — the images are precious progress records). */
export function deleteAlbum(id: string) {
  const db = getDb();
  db.update(galleryAlbums).set({ deletedAt: Date.now() }).where(eq(galleryAlbums.id, id)).run();
  db.update(galleryPhotos).set({ albumId: null, updatedAt: Date.now() }).where(eq(galleryPhotos.albumId, id)).run();
}

// ---- Photos ----

export function listPhotos(): GalleryPhoto[] {
  return activePhotoRows().map(toPhoto);
}

export function listPhotosByAlbum(albumId: string): GalleryPhoto[] {
  return activePhotoRows()
    .map(toPhoto)
    .filter((photo) => photo.albumId === albumId);
}

export function listFavorites(): GalleryPhoto[] {
  return activePhotoRows()
    .map(toPhoto)
    .filter((photo) => photo.isFavorite);
}

export function getPhoto(id: string): GalleryPhoto | null {
  const row = getDb().select().from(galleryPhotos).where(eq(galleryPhotos.id, id)).get();
  return row ? toPhoto(row) : null;
}

export function createPhoto(input: CreatePhotoInput): GalleryPhoto {
  const now = Date.now();
  const photo: GalleryPhoto = {
    id: generateId(),
    albumId: input.albumId,
    uri: input.uri,
    mediaType: input.mediaType ?? 'photo',
    durationMs: input.durationMs ?? null,
    thumbnailUri: input.thumbnailUri ?? null,
    width: input.width ?? null,
    height: input.height ?? null,
    caption: input.caption ?? null,
    tags: input.tags ?? [],
    isFavorite: false,
    takenAt: input.takenAt ?? now,
    createdAt: now,
  };
  getDb()
    .insert(galleryPhotos)
    .values({
      ...photo,
      tags: photo.tags.length ? JSON.stringify(photo.tags) : null,
      userId: LOCAL_USER_ID,
      updatedAt: now,
      syncStatus: 'pending',
    })
    .run();
  return photo;
}

export function updatePhoto(id: string, input: UpdatePhotoInput) {
  const { tags, ...rest } = input;
  getDb()
    .update(galleryPhotos)
    .set({
      ...rest,
      ...(tags !== undefined ? { tags: tags.length ? JSON.stringify(tags) : null } : {}),
      updatedAt: Date.now(),
      syncStatus: 'pending',
    })
    .where(eq(galleryPhotos.id, id))
    .run();
}

export function togglePhotoFavorite(id: string, isFavorite: boolean) {
  getDb().update(galleryPhotos).set({ isFavorite, updatedAt: Date.now(), syncStatus: 'pending' }).where(eq(galleryPhotos.id, id)).run();
}

export function deletePhoto(id: string) {
  const photo = getPhoto(id);
  const db = getDb();
  db.update(galleryPhotos).set({ deletedAt: Date.now(), syncStatus: 'pending' }).where(eq(galleryPhotos.id, id)).run();
  // Clear any album cover that pointed at this photo.
  db.update(galleryAlbums).set({ coverPhotoId: null }).where(eq(galleryAlbums.coverPhotoId, id)).run();
  if (photo) deleteMediaFiles(photo.uri, photo.thumbnailUri);
}
