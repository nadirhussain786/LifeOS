import {
  createPrivateRecord,
  deletePrivateRecord,
  listPrivateRecords,
} from '@/features/private/services/private-repository';
import {
  deleteVaultFile,
  readVaultFileAsDataUri,
  type PickedVaultMedia,
} from '@/features/private/services/vault-files';

/**
 * Vault items: the encrypted row that describes an encrypted file.
 *
 * The split matters. The *bytes* live on disk sealed under the vault key; the
 * *metadata* — original name, dimensions, when it was added — lives in the
 * encrypted row. Neither half says anything on its own: the directory is
 * opaque random names, and the table is opaque ciphertext.
 */
export type VaultItemFields = {
  fileName: string;
  mimeType: string;
  label: string;
  width: number | null;
  height: number | null;
  byteLength: number;
};

export type VaultItem = VaultItemFields & {
  id: string;
  createdAt: number;
  updatedAt: number;
};

export function listVaultItems(): VaultItem[] {
  return listPrivateRecords<VaultItemFields>('vault')
    .map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      fileName: typeof r.fileName === 'string' ? r.fileName : '',
      mimeType: typeof r.mimeType === 'string' ? r.mimeType : 'image/jpeg',
      label: typeof r.label === 'string' ? r.label : '',
      width: typeof r.width === 'number' ? r.width : null,
      height: typeof r.height === 'number' ? r.height : null,
      byteLength: typeof r.byteLength === 'number' ? r.byteLength : 0,
    }))
    .filter((item) => item.fileName !== '');
}

export function addVaultItems(media: PickedVaultMedia[], label = ''): number {
  let added = 0;
  for (const item of media) {
    const id = createPrivateRecord('vault', {
      fileName: item.file.fileName,
      mimeType: item.mimeType,
      label,
      width: item.width,
      height: item.height,
      byteLength: item.file.byteLength,
    } satisfies VaultItemFields);
    if (id) added += 1;
  }
  return added;
}

/**
 * Removes the row *and* the bytes.
 *
 * Order is deliberate: the file goes first. A crash between the two leaves an
 * orphaned row pointing at nothing, which renders as a missing thumbnail — the
 * other order would leave undeleted ciphertext on disk with no row to find it
 * by, which is the failure that actually matters.
 */
export function removeVaultItem(item: VaultItem): void {
  deleteVaultFile(item.fileName);
  deletePrivateRecord(item.id);
}

/** Decrypts one item for display. In memory — never written back to disk. */
export function vaultItemDataUri(item: VaultItem): string | null {
  return readVaultFileAsDataUri(item.fileName, item.mimeType);
}
