// jest.setup.js

// 1. Mock Expo Router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  Stack: {
    Screen: () => null, // Mock Stack.Screen component
  }
}));

// 2. Mock Firebase Auth
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    currentUser: { uid: 'test-user-id', email: 'test@test.com' },
  })),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  initializeAuth: jest.fn(),
  getReactNativePersistence: jest.fn(),
}));

// 3. Mock Firebase Firestore (Added deleteField here!)
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  addDoc: jest.fn(),     
  deleteDoc: jest.fn(),  
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: jest.fn(),
  deleteField: jest.fn(() => 'DELETE_FIELD_SENTINEL'), // <--- ADDED THIS
}));

// 4. Mock Async Storage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// 5. Mock local firebaseConfig
jest.mock('./firebaseConfig', () => ({
  auth: {
    currentUser: { uid: 'test-user', email: 'test@example.com' },
    onAuthStateChanged: jest.fn(),
    signOut: jest.fn(),
  },
  db: {},
}));

// 6. Mock Expo Vector Icons (Fixes the "loadedNativeFonts" error)
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return {
    FontAwesome: (props) => <View {...props} testID="icon-fontawesome" />,
    MaterialCommunityIcons: (props) => <View {...props} testID="icon-material" />,
    Ionicons: (props) => <View {...props} testID="icon-ionicons" />,
  };
});

// 7. Mock Expo Font (Safety net)
jest.mock('expo-font', () => ({
  isLoaded: jest.fn(() => true),
  loadAsync: jest.fn(() => Promise.resolve()),
}));
