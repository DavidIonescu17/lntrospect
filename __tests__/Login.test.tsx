import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import Login from '../app/index'; // Adjust path if needed

// We mock the local firebaseConfig just for this test file
jest.mock('../firebaseConfig', () => ({
  auth: {},
  db: {}
}));

describe('Login Screen', () => {
  
  it('renders correctly', () => {
    const { getByPlaceholderText, getByText } = render(<Login />);

    // Check if basic elements exist
    expect(getByText('Welcome Back!')).toBeTruthy();
    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
  });

  it('updates email input when typing', () => {
    const { getByPlaceholderText } = render(<Login />);
    
    const emailInput = getByPlaceholderText('Email');
    
    // Simulate typing
    fireEvent.changeText(emailInput, 'test@example.com');
    
    // Check if the input value updated (React Native Testing Library handles this state check)
    expect(emailInput.props.value).toBe('test@example.com');
  });
});