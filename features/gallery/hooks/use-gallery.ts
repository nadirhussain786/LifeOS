import { useQuery } from '@tanstack/react-query';

import {
  getAlbum,
  getPhoto,
  listAlbumsWithCover,
  listFavorites,
  listPhotos,
  listPhotosByAlbum,
} from '@/features/gallery/services/gallery-repository';

export function useAlbums() {
  return useQuery({ queryKey: ['gallery', 'albums'], queryFn: async () => listAlbumsWithCover() });
}

export function useAlbum(id: string | undefined) {
  return useQuery({
    queryKey: ['gallery', 'album', id],
    queryFn: async () => (id ? getAlbum(id) : null),
    enabled: !!id,
  });
}

export function usePhotos() {
  return useQuery({ queryKey: ['gallery', 'photos'], queryFn: async () => listPhotos() });
}

export function usePhotosByAlbum(albumId: string | undefined) {
  return useQuery({
    queryKey: ['gallery', 'photos', 'album', albumId],
    queryFn: async () => (albumId ? listPhotosByAlbum(albumId) : []),
    enabled: !!albumId,
  });
}

export function useFavoritePhotos() {
  return useQuery({ queryKey: ['gallery', 'photos', 'favorites'], queryFn: async () => listFavorites() });
}

export function usePhoto(id: string | undefined) {
  return useQuery({
    queryKey: ['gallery', 'photo', id],
    queryFn: async () => (id ? getPhoto(id) : null),
    enabled: !!id,
  });
}
