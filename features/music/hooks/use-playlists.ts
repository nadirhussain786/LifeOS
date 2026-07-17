import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSongsByIds } from '@/features/music/services/songs-repository';
import {
  addSongToPlaylist,
  createPlaylist,
  deletePlaylist,
  getPlaylist,
  listPlaylists,
  listPlaylistSongIds,
  removeSongFromPlaylist,
  renamePlaylist,
  reorderPlaylistSongs,
} from '@/features/music/services/playlists-repository';

export function usePlaylists() {
  return useQuery({ queryKey: ['music', 'playlists'], queryFn: listPlaylists });
}

export function usePlaylist(id: string) {
  return useQuery({ queryKey: ['music', 'playlists', id], queryFn: () => getPlaylist(id), enabled: !!id });
}

export function usePlaylistSongs(id: string) {
  return useQuery({
    queryKey: ['music', 'playlists', id, 'songs'],
    queryFn: () => getSongsByIds(listPlaylistSongIds(id)),
    enabled: !!id,
  });
}

export function usePlaylistMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['music', 'playlists'] });

  const create = useMutation({
    mutationFn: async ({ name, colorToken }: { name: string; colorToken: string | null }) => createPlaylist(name, colorToken),
    onSuccess: invalidate,
  });

  const rename = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => renamePlaylist(id, name),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => deletePlaylist(id),
    onSuccess: invalidate,
  });

  const addSong = useMutation({
    mutationFn: async ({ playlistId, songId }: { playlistId: string; songId: string }) => addSongToPlaylist(playlistId, songId),
    onSuccess: invalidate,
  });

  const removeSong = useMutation({
    mutationFn: async ({ playlistId, songId }: { playlistId: string; songId: string }) => removeSongFromPlaylist(playlistId, songId),
    onSuccess: invalidate,
  });

  const reorderSongs = useMutation({
    mutationFn: async ({ playlistId, orderedSongIds }: { playlistId: string; orderedSongIds: string[] }) =>
      reorderPlaylistSongs(playlistId, orderedSongIds),
    onSuccess: invalidate,
  });

  return { create, rename, remove, addSong, removeSong, reorderSongs };
}
