const bytesInOneGB = 1024 * 1024 * 1024; // 1024 * 1024 * 1024 Bytes

/**
 * Converts a given number of bytes into a human-readable string format.
 *
 * @param bytes - The number of bytes to be converted.
 * @returns A string representing the size in a more readable format (e.g., '10.24 KB', '1.00 MB').
 *
 * @example
 * ```typescript
 * formatBytes(1024); // '1.00 KB'
 * formatBytes(123456789); // '117.74 MB'
 * ```
 */
export function formatBytes(bytes: number, decimal?: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (
    parseFloat((bytes / Math.pow(k, i)).toFixed(decimal ? decimal : 0)) +
    ' ' +
    sizes[i]
  );
}

/**
 * Converts a given number of gigabytes into bytes.
 *
 * @param gigabytes - The number of gigabytes to be converted.
 * @returns The equivalent number of bytes.
 *
 * @example
 * ```typescript
 * gigabytesToBytes(1); // 1073741824
 * gigabytesToBytes(0.5); // 536870912
 * ```
 */
export function gigabytesToBytes(gigabytes: number): number {
  return gigabytes * bytesInOneGB;
}

/**
 * Converts a given number of bytes into gigabytes.
 *
 * @param bytes - The number of bytes to be converted.
 * @returns The equivalent number of gigabytes.
 *
 * @example
 * ```typescript
 * bytesToGigabytes(1073741824); // 1
 * bytesToGigabytes(536870912); // 0.5
 * ```
 */
export function bytesToGigabytes(bytes: number): number {
  return bytes / bytesInOneGB;
}

/**
 * Calculates the total size of all items in a given data storage object.
 *
 * @param dataStorage - The data storage object containing the items to calculate the total size of.
 * @returns The total size of all items in the data storage object.
 *
 * @example
 * ```typescript
 * getTotalSize(dataStorage); // 123456789
 * ```
 */
export function getTotalStorageSize(dataStorage: any): number {
  return dataStorage.reduce((total: number, item: any) => total + item.size, 0);
}
