import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import TherapyTab from '../app/(tabs)/assistant';
import * as Firestore from 'firebase/firestore';

// Mock specific Firestore methods
const mockUpdateDoc = jest.fn();
jest.spyOn(Firestore, 'updateDoc').mockImplementation(mockUpdateDoc);
jest.spyOn(Firestore, 'doc').mockReturnValue('mock-doc-ref');

// Mock Data
const mockUserNotConnected = {
  id: 'user-1',
  psychologistId: null 
};

const mockUserConnected = {
  id: 'user-1',
  psychologistId: 'doc-123'
};

const mockPsychologist = {
  id: 'doc-123',
  fullName: 'Dr. Freud',
  pairingCode: 'DOC-123'
};

describe('Therapy Tab (Assistant)', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders "Connect with your Doctor" when not linked', async () => {
    // 1. Mock "Get My Profile" to return a user WITHOUT a doctor
    jest.spyOn(Firestore, 'getDoc').mockResolvedValue({
      exists: () => true,
      data: () => mockUserNotConnected
    });

    const { getByText, getByPlaceholderText } = render(<TherapyTab />);

    await waitFor(() => {
      expect(getByText('Connect with your Doctor')).toBeTruthy();
    });

    // Check input field exists
    expect(getByPlaceholderText('e.g. DAN-8821')).toBeTruthy();
  });

  it('renders Doctor details when already connected', async () => {
    // 1. Mock "Get My Profile" to return user WITH doctor
    // 2. Mock "Get Doctor Profile" to return doctor details
    jest.spyOn(Firestore, 'getDoc')
      .mockResolvedValueOnce({ // First call: Get User
        exists: () => true,
        data: () => mockUserConnected
      })
      .mockResolvedValueOnce({ // Second call: Get Doctor
        exists: () => true,
        data: () => mockPsychologist
      });

    const { getByText } = render(<TherapyTab />);

    await waitFor(() => {
      // Should show the view with the doctor's name
      expect(getByText('Your Psychologist')).toBeTruthy();
      expect(getByText('Dr. Freud')).toBeTruthy();
    });
  });

  it('updates input value when typing pairing code', async () => {
    // Setup unconnected state
    jest.spyOn(Firestore, 'getDoc').mockResolvedValue({
      exists: () => true,
      data: () => mockUserNotConnected
    });

    const { getByPlaceholderText } = render(<TherapyTab />);

    await waitFor(() => getByPlaceholderText('e.g. DAN-8821'));

    const input = getByPlaceholderText('e.g. DAN-8821');
    fireEvent.changeText(input, 'ABC-123');

    // Verify input works (RNTL handles state updates internally for inputs)
    expect(input.props.value).toBe('ABC-123');
  });
});