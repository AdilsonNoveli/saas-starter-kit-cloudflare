import type { CardDavConnection } from '@prisma/client';
import type { CardDavClientInterface, AddressBook } from './client';
import { createModuleLogger } from '@/lib/logger';

const log = createModuleLogger('carddav');

/**
 * Resolve the address book to use for sync operations.
 *
 * If the connection has a stored `addressBookUrl`, find the matching address
 * book from the server. Falls back to the first address book if the stored
 * URL is no longer available (e.g., server reorganized).
 */
export async function getAddressBook(
  client: CardDavClientInterface,
  connection: Pick<CardDavConnection, 'addressBookUrl'>
): Promise<AddressBook> {
  const addressBooks = await client.fetchAddressBooks();

  if (addressBooks.length === 0) {
    throw new Error('No address books found');
  }

  if (connection.addressBookUrl) {
    const match = addressBooks.find(ab => ab.url === connection.addressBookUrl);
    if (match) return match;
    log.warn(
      { stored: connection.addressBookUrl },
      'Stored address book URL not found on server, falling back to first address book'
    );
  }

  return addressBooks[0];
}
