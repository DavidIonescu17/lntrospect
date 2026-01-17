import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import PsychologistDashboard from '../app/psychologist-dashboard';
import * as Firestore from 'firebase/firestore';

// Mock specific Firestore methods
jest.spyOn(Firestore, 'doc').mockReturnValue('mock-doc-ref');

// Helper for snapshot
const mockSnapshot = (dataList) => ({
  docs: dataList.map((item) => ({
    id: item.id,
    data: () => item,
  })),
});

describe('Psychologist Dashboard', () => {

  it('renders client list correctly', async () => {
    // 1. Mock the "My Profile" fetch (getDoc)
    jest.spyOn(Firestore, 'getDoc').mockResolvedValue({
      exists: () => true,
      data: () => ({ fullName: 'Dr. Test', title: 'Therapist', pairingCode: 'DOC-123' })
    });

    // 2. Mock the "Clients List" listener (onSnapshot)
    const mockClients = [
      { id: 'client-1', fullName: 'John Doe', email: 'john@test.com' },
      { id: 'client-2', fullName: 'Jane Smith', email: 'jane@test.com' }
    ];

    jest.spyOn(Firestore, 'onSnapshot').mockImplementation((query, callback) => {
      // Immediate callback with data
      callback(mockSnapshot(mockClients));
      return jest.fn(); // Unsubscribe
    });

    const { getByText, getAllByText } = render(<PsychologistDashboard />);

    // 3. Check for Doctor Name
    await waitFor(() => {
      expect(getByText('Dr. Test')).toBeTruthy();
    });

    // 4. Check for Clients
    expect(getByText('John Doe')).toBeTruthy();
    expect(getByText('Jane Smith')).toBeTruthy();
    
    // Check Pairing Code
    expect(getByText('DOC-123')).toBeTruthy();
  });

  it('shows empty state when no clients connected', async () => {
    // Mock empty list
    jest.spyOn(Firestore, 'onSnapshot').mockImplementation((query, callback) => {
      callback(mockSnapshot([])); 
      return jest.fn();
    });

    const { getByText } = render(<PsychologistDashboard />);

    await waitFor(() => {
      expect(getByText('No patients connected yet.')).toBeTruthy();
    });
  });
});