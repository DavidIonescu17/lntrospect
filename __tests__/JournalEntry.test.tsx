import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
// 1. Correct Path
import JournalScreen from '../components/JournalScreen'; 
import * as Firestore from 'firebase/firestore';
import { Alert } from 'react-native';

// --- MOCKS ---

// Mock Styles
jest.mock('../app/styles/specific-day.styles', () => ({
  journalContainer: {},
  moodOption: {},
  entryForm: {},
}));

// Mock Constants
jest.mock('../constants/moods', () => ({
  MOODS: {
    happy: { label: 'Happy', icon: 'emoticon-happy', color: '#FFD700' },
    sad: { label: 'Sad', icon: 'emoticon-sad', color: '#536DFE' },
  },
}));

// 2. FIXED ICON MOCK: We require View internally to avoid "hoisting" errors
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return {
    MaterialCommunityIcons: ({ name }) => <View testID={`icon-${name}`} />,
  };
});

// Mock Encryption
jest.mock('../app/utils/encryption', () => ({
  getEncryptionKey: jest.fn(() => Promise.resolve('test-key-123')),
}));

// Mock Image Picker
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ canceled: true })),
}));

jest.spyOn(Alert, 'alert');

// Mock CryptoJS
jest.mock('crypto-js', () => {
  const mockAES = {
    encrypt: jest.fn((data) => ({ toString: () => `ENCRYPTED_${data}` })),
    decrypt: jest.fn((encrypted) => ({
      toString: () => {
        if (typeof encrypted === 'string' && encrypted.startsWith('ENCRYPTED_')) {
          return encrypted.replace('ENCRYPTED_', '');
        }
        return '{}';
      },
    })),
  };
  return {
    AES: mockAES,
    enc: { Utf8: 'utf-8' },
  };
});

// Mock Firestore
const mockAddDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockDeleteDoc = jest.fn();
const mockGetDocs = jest.fn();

jest.spyOn(Firestore, 'getFirestore').mockReturnValue({});
jest.spyOn(Firestore, 'collection').mockReturnValue('collection-ref');
jest.spyOn(Firestore, 'query').mockReturnValue('query-ref');
jest.spyOn(Firestore, 'where').mockReturnValue('where-constraint');
jest.spyOn(Firestore, 'orderBy').mockReturnValue('orderBy-constraint');
jest.spyOn(Firestore, 'doc').mockReturnValue('doc-ref');
jest.spyOn(Firestore, 'addDoc').mockImplementation(mockAddDoc);
jest.spyOn(Firestore, 'updateDoc').mockImplementation(mockUpdateDoc);
jest.spyOn(Firestore, 'deleteDoc').mockImplementation(mockDeleteDoc);
jest.spyOn(Firestore, 'getDocs').mockImplementation(mockGetDocs);

const createMockDocs = (entries) => ({
  forEach: (callback) => {
    entries.forEach((entry) => {
      callback({
        id: entry.id,
        data: () => ({
          userId: 'test-user-id',
          encryptedContent: `ENCRYPTED_${JSON.stringify(entry)}`,
          createdAt: { toDate: () => new Date(entry.createdAt || Date.now()) },
        }),
      });
    });
  },
});

// --- TESTS ---

describe('JournalScreen', () => {
  const mockUser = { uid: 'test-user-id' };
  const todayDate = new Date().toISOString(); 

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly and fetches entries', async () => {
    const mockEntry = {
      id: 'entry-1',
      text: 'My first journal entry',
      mood: 'happy',
      date: todayDate,
      images: [],
    };

    mockGetDocs.mockResolvedValue(createMockDocs([mockEntry]));

    const { getByText, queryByText } = render(
      <JournalScreen date={todayDate} user={mockUser} openFormInitially={false} />
    );

    await waitFor(() => {
      expect(getByText('My first journal entry')).toBeTruthy();
      expect(getByText('Happy')).toBeTruthy(); 
    });

    expect(queryByText('Save Entry')).toBeNull();
  });

  it('allows adding a new entry', async () => {
    mockGetDocs.mockResolvedValue(createMockDocs([]));

    const { getByText, getByPlaceholderText } = render(
      <JournalScreen date={todayDate} user={mockUser} openFormInitially={true} />
    );

    await waitFor(() => expect(getByText('Save Entry')).toBeTruthy());

    const input = getByPlaceholderText("What's on your mind today?");
    fireEvent.changeText(input, 'Testing new entry');

    const moodBtn = getByText('Happy');
    fireEvent.press(moodBtn);

    const saveBtn = getByText('Save Entry');
    await act(async () => {
      fireEvent.press(saveBtn);
    });

    expect(mockAddDoc).toHaveBeenCalledWith(
      'collection-ref',
      expect.objectContaining({
        userId: 'test-user-id',
        encryptedContent: expect.stringContaining('ENCRYPTED_'),
      })
    );
  });

  it('allows editing an entry', async () => {
    const mockEntry = {
      id: 'entry-1',
      text: 'Original Text',
      mood: 'sad',
      date: todayDate,
      images: [],
    };
    mockGetDocs.mockResolvedValue(createMockDocs([mockEntry]));

    const { getByText, getByTestId, getByPlaceholderText } = render(
      <JournalScreen date={todayDate} user={mockUser} openFormInitially={false} />
    );

    await waitFor(() => expect(getByText('Original Text')).toBeTruthy());

    // --- FIND BUTTON BY ICON NAME ---
    // The testID comes from our mocked Icon component above
    const pencilIcon = getByTestId('icon-pencil');
    fireEvent.press(pencilIcon.parent || pencilIcon); 

    // Now form should open
    await waitFor(() => expect(getByPlaceholderText("What's on your mind today?")).toBeTruthy());
    
    const input = getByPlaceholderText("What's on your mind today?");
    fireEvent.changeText(input, 'Updated Text');

    const updateBtn = getByText('Update Entry');
    await act(async () => {
      fireEvent.press(updateBtn);
    });

    expect(mockUpdateDoc).toHaveBeenCalled();
  });

  it('deletes an entry', async () => {
    const mockEntry = {
      id: 'entry-to-delete',
      text: 'Delete me',
      mood: 'sad',
      date: todayDate,
      images: [],
    };
    mockGetDocs.mockResolvedValue(createMockDocs([mockEntry]));

    const { getByText, getByTestId } = render(
      <JournalScreen date={todayDate} user={mockUser} openFormInitially={false} />
    );

    await waitFor(() => expect(getByText('Delete me')).toBeTruthy());

    jest.spyOn(Alert, 'alert').mockImplementation((title, msg, buttons) => {
      const deleteButton = buttons.find(b => b.text === 'delete' || b.style === 'destructive');
      if (deleteButton) deleteButton.onPress();
    });

    const deleteIcon = getByTestId('icon-delete');
    fireEvent.press(deleteIcon.parent || deleteIcon);

    expect(Alert.alert).toHaveBeenCalled();
    expect(mockDeleteDoc).toHaveBeenCalledWith('doc-ref');
  });
});