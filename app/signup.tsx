import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, SafeAreaView, Image, ScrollView, View } from 'react-native';
import { auth } from '../firebaseConfig';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { useRouter, Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { Poppins_400Regular, Poppins_700Bold } from '@expo-google-fonts/poppins';

export default function SignUp() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [repeatPassword, setRepeatPassword] = useState('');
    const [userRole, setUserRole] = useState<'Psychologist' | 'Client' | ''>('');
    const router = useRouter();
    const db = getFirestore();

    // Password validation function
    const validatePassword = (password: string): { isValid: boolean; message: string } => {
        const minLength = 8;
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);

        if (password.length < minLength) {
            return { isValid: false, message: `Password must be at least ${minLength} characters long` };
        }
        if (!hasSpecialChar) {
            return { isValid: false, message: 'Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)' };
        }
        if (!hasNumber) {
            return { isValid: false, message: 'Password must contain at least one number' };
        }
        if (!hasUpperCase) {
            return { isValid: false, message: 'Password must contain at least one uppercase letter' };
        }
        if (!hasLowerCase) {
            return { isValid: false, message: 'Password must contain at least one lowercase letter' };
        }

        return { isValid: true, message: 'Password is valid' };
    };

    const signUp = async () => {
        // Check if role is selected
        if (!userRole) {
            alert('Please select a role (Psychologist or Client)');
            return;
        }

        // Check if passwords match
        if (password !== repeatPassword) {
            alert('Passwords do not match');
            return;
        }

        // Validate password complexity
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            alert(passwordValidation.message);
            return;
        }

        try {
            // Create user account
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Store user role in Firestore
            await setDoc(doc(db, 'users', user.uid), {
                email: email,
                role: userRole,
                createdAt: new Date().toISOString(),
            });

            // Navigate to psychologist dashboard
            if (userRole === 'Psychologist') {
                router.replace('/psychologist-dashboard');
            } else {
                router.replace('/(tabs)');
            }
        } catch (error: any) {
            console.log(error);
            alert('Sign up failed: ' + error.message);
        }
    };

    return (
        <>
            <Stack.Screen 
                options={{
                    headerShown: false,
                }} 
            />
            <SafeAreaView style={styles.container}>
                <ScrollView 
                    contentContainerStyle={styles.scrollContainer}
                    showsVerticalScrollIndicator={false}
                >
                    <Image
                        source={require('../assets/images/logoFinal2.png')}
                        style={styles.logo}
                    />
                    <Text style={styles.title}>Create Account</Text>

                    {/* Role Selection */}
                    <Text style={styles.label}>Select Your Role</Text>
                    <View style={styles.roleContainer}>
                        <TouchableOpacity
                            style={[
                                styles.roleButton,
                                userRole === 'Psychologist' && styles.roleButtonSelected
                            ]}
                            onPress={() => setUserRole('Psychologist')}
                        >
                            <Text style={[
                                styles.roleButtonText,
                                userRole === 'Psychologist' && styles.roleButtonTextSelected
                            ]}>
                                Psychologist
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.roleButton,
                                userRole === 'Client' && styles.roleButtonSelected
                            ]}
                            onPress={() => setUserRole('Client')}
                        >
                            <Text style={[
                                styles.roleButtonText,
                                userRole === 'Client' && styles.roleButtonTextSelected
                            ]}>
                                Client
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <TextInput
                        style={styles.textInput}
                        placeholder="Email"
                        value={email}
                        onChangeText={setEmail}
                        placeholderTextColor="#9EA0A4"
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                    <TextInput
                        style={styles.textInput}
                        placeholder="Password"
                        value={password}
                        onChangeText={setPassword}
                        placeholderTextColor="#9EA0A4"
                        secureTextEntry
                        autoCapitalize="none"
                    />
                    <Text style={styles.passwordHint}>
                        Password must be at least 8 characters with uppercase, lowercase, number, and special character
                    </Text>
                    <TextInput
                        style={styles.textInput}
                        placeholder="Confirm Password"
                        value={repeatPassword}
                        onChangeText={setRepeatPassword}
                        placeholderTextColor="#9EA0A4"
                        secureTextEntry
                        autoCapitalize="none"
                    />
                    <TouchableOpacity style={styles.primaryButton} onPress={signUp}>
                        <Text style={styles.buttonText}>Create Account</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.secondaryButton} 
                        onPress={() => router.back()}
                    >
                        <Text style={styles.secondaryButtonText}>Back to Login</Text>
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        marginBottom: 20,
        color: '#6B4EFF',
        fontFamily: 'Poppins_700Bold',
        textAlign: 'center',
        shadowColor: '#6B46C1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    logo: {
        width: 250,
        height: 250,
        marginBottom: 20,
        resizeMode: 'contain',
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2D3748',
        fontFamily: 'Poppins_700Bold',
        marginBottom: 12,
        width: '85%',
    },
    roleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '85%',
        marginBottom: 24,
    },
    roleButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E2E8F0',
        backgroundColor: '#F7FAFC',
        marginHorizontal: 4,
        alignItems: 'center',
    },
    roleButtonSelected: {
        borderColor: '#6B4EFF',
        backgroundColor: '#EDE9FE',
    },
    roleButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#718096',
        fontFamily: 'Poppins_700Bold',
    },
    roleButtonTextSelected: {
        color: '#6B4EFF',
    },
    textInput: {
        height: 56,
        borderColor: '#E2E8F0',
        borderWidth: 1.5,
        borderRadius: 12,
        paddingHorizontal: 16,
        marginBottom: 16,
        width: '85%',
        backgroundColor: '#F7FAFC',
        fontSize: 16,
        color: '#2D3748',
        fontFamily: 'Poppins_400Regular',
    },
    passwordHint: {
        fontSize: 12,
        color: '#718096',
        fontFamily: 'Poppins_400Regular',
        width: '85%',
        marginBottom: 16,
        marginTop: -8,
    },
    primaryButton: {
        backgroundColor: '#6B4EFF',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
        width: '85%',
        shadowColor: '#6B46C1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    secondaryButton: {
        backgroundColor: '#EDF2F7',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 12,
        width: '85%',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        fontFamily: 'Poppins_700Bold',
    },
    secondaryButtonText: {
        color: '#6B4EFF',
        fontSize: 16,
        fontWeight: '600',
        fontFamily: 'Poppins_700Bold',
    },
});