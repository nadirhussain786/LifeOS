import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Image } from 'react-native';

import type { MediaType } from '@/features/gallery/types/gallery.types';

/**
 * On-device media storage for the Progress Gallery. Picked photos AND videos
 * are copied out of the OS cache into the app's own document directory so they
 * survive relaunch and album edits — the SQLite row only ever stores the copied
 * file's URI, never the volatile picker URI. Videos additionally get a poster
 * frame extracted (also copied in) so grids never have to decode the video.
 * The directory is built lazily (a top-level Paths.document call is risky under
 * expo-router).
 */
function getGalleryDirectory(): Directory {
  const directory = new Directory(Paths.document, 'gallery');
  if (!directory.exists) directory.create({ intermediates: true, idempotent: true });
  return directory;
}

/** Hard cap on imported video size. Videos over this are rejected rather than
 * silently bloating on-device storage. */
export const MAX_VIDEO_BYTES = 30 * 1024 * 1024;
export const MAX_VIDEO_MB = 30;

/** Longest in-app recording, in seconds — keeps camera captures under the cap. */
const MAX_RECORD_SECONDS = 60;

export type MediaSource = 'library' | 'camera';
export type MediaKind = 'images' | 'videos';

export type PickedMedia = {
  uri: string;
  mediaType: MediaType;
  durationMs: number | null;
  thumbnailUri: string | null;
  width: number | null;
  height: number | null;
};

export type PickResult = { items: PickedMedia[]; rejectedOversize: number };

function extensionOf(uri: string, fallback: string): string {
  return uri.split('.').pop()?.split('?')[0]?.toLowerCase() || fallback;
}

/** Extracts the first frame of a copied video and copies it into gallery
 * storage. Returns null on any failure — a missing poster is non-fatal (the
 * grid falls back to a placeholder). */
async function makeVideoThumbnail(videoUri: string, directory: Directory): Promise<string | null> {
  try {
    const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, { time: 0, quality: 0.7 });
    const destination = new File(directory, `thumb-${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`);
    new File(uri).copy(destination);
    return destination.uri;
  } catch {
    return null;
  }
}

async function persistAsset(asset: ImagePicker.ImagePickerAsset, directory: Directory): Promise<PickedMedia | 'oversize' | null> {
  const isVideo = asset.type === 'video';

  // Reject oversized videos before doing the (potentially large) copy.
  if (isVideo && asset.fileSize != null && asset.fileSize > MAX_VIDEO_BYTES) return 'oversize';

  const extension = extensionOf(asset.uri, isVideo ? 'mp4' : 'jpg');
  const destination = new File(directory, `${Date.now()}-${Math.round(Math.random() * 1e6)}.${extension}`);
  try {
    new File(asset.uri).copy(destination);
  } catch {
    return null;
  }

  // When the picker didn't report a size (common for camera captures), verify
  // against the copied file and roll back if it's over the cap.
  if (isVideo && asset.fileSize == null) {
    const size = new File(destination.uri).size ?? 0;
    if (size > MAX_VIDEO_BYTES) {
      try {
        new File(destination.uri).delete();
      } catch {
        // best-effort cleanup
      }
      return 'oversize';
    }
  }

  const thumbnailUri = isVideo ? await makeVideoThumbnail(destination.uri, directory) : null;

  return {
    uri: destination.uri,
    mediaType: isVideo ? 'video' : 'photo',
    durationMs: asset.duration ?? null,
    thumbnailUri,
    width: asset.width ?? null,
    height: asset.height ?? null,
  };
}

/**
 * Picks (library) or captures (camera) photos/videos and copies each into app
 * storage. Returns the persisted copies plus a count of videos rejected for
 * exceeding {@link MAX_VIDEO_BYTES}. Returns null when permission is denied so
 * callers can surface a prompt.
 */
export async function pickMedia(opts: { source: MediaSource; mediaTypes: MediaKind[] }): Promise<PickResult | null> {
  const { source, mediaTypes } = opts;

  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return null;
  } else {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return null;
  }

  const shared = { mediaTypes, quality: 0.85 as const };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ ...shared, videoMaxDuration: MAX_RECORD_SECONDS })
      : await ImagePicker.launchImageLibraryAsync({ ...shared, allowsMultipleSelection: true });

  if (result.canceled) return { items: [], rejectedOversize: 0 };

  const directory = getGalleryDirectory();
  const items: PickedMedia[] = [];
  let rejectedOversize = 0;
  for (const asset of result.assets) {
    const persisted = await persistAsset(asset, directory);
    if (persisted === 'oversize') rejectedOversize += 1;
    else if (persisted) items.push(persisted);
  }
  return { items, rejectedOversize };
}

/** Copies an in-app captured image (e.g. a rendered before/after card from
 * react-native-view-shot) into permanent gallery storage and returns its size.
 * Used by "Save to feed" so a comparison becomes a real, shareable feed post. */
export async function saveCapturedImage(tempUri: string): Promise<{ uri: string; width: number | null; height: number | null }> {
  const directory = getGalleryDirectory();
  const destination = new File(directory, `compare-${Date.now()}-${Math.round(Math.random() * 1e6)}.png`);
  new File(tempUri).copy(destination);
  const size = await imageSize(destination.uri);
  return { uri: destination.uri, ...size };
}

/** Promisified RN Image.getSize — resolves to nulls rather than rejecting so a
 * failed measure never blocks a save. */
function imageSize(uri: string): Promise<{ width: number | null; height: number | null }> {
  return new Promise((resolve) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      () => resolve({ width: null, height: null }),
    );
  });
}

/** Best-effort delete of a stored media file (and its poster, if any) — a
 * missing file is fine, the row is being removed regardless. */
export function deleteMediaFiles(uri: string, thumbnailUri?: string | null) {
  for (const target of [uri, thumbnailUri]) {
    if (!target) continue;
    try {
      const file = new File(target);
      if (file.exists) file.delete();
    } catch {
      // The DB row removal is the source of truth; a leaked file is harmless.
    }
  }
}
