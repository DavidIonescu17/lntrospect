import * as SecureStore from 'expo-secure-store';
import { getEncryptionKey } from '../app/utils/encryption'; 

// Mock SecureStore directly
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

describe('Encryption Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates a new key if none exists', async () => {
    // 1. Mock SecureStore to return null (no key found)
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    const key = await getEncryptionKey();

    // 2. It should return a string (the new key)
    expect(key).toBeTruthy();
    expect(typeof key).toBe('string');
    
    // 3. FIX: Updated expectation to match your actual app logic ('encryption_key')
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'encryption_key', 
      expect.any(String)
    );
  });

  it('returns existing key from storage if found', async () => {
    // 1. Mock SecureStore to return a fake saved key
    const fakeKey = 'saved-secret-key-123';
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(fakeKey);

    const key = await getEncryptionKey();

    // 2. It should return exactly that key
    expect(key).toBe(fakeKey);
    
    // 3. It should NOT try to save a new one
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });
});