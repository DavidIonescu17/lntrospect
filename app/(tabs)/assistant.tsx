import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator, Image } from 'react-native';
import { auth, db } from '../../firebaseConfig'; // Adjust path based on where firebaseConfig is
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { FontAwesome } from '@expo/vector-icons';

export default function TherapyTab() {
    const [user, setUser] = useState<any>(null);
    const [psychologist, setPsychologist] = useState<any>(null);
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            if (!auth.currentUser) return;
            const userRef = doc(db, 'users', auth.currentUser.uid);
            const snap = await getDoc(userRef);
            if (snap.exists()) {
                const data = snap.data();
                setUser(data);
                
                // If already linked, get doctor details
                if (data.psychologistId) {
                    const docRef = doc(db, 'users', data.psychologistId);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) setPsychologist(docSnap.data());
                }
            }
        };
        fetchData();
    }, []);

    const handleConnect = async () => {
        if (code.length < 5) return Alert.alert("Error", "Enter a valid code.");
        setLoading(true);
        try {
            // Find Doctor by Code
            const q = query(collection(db, 'users'), where('pairingCode', '==', code.toUpperCase().trim()));
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                Alert.alert("Invalid Code", "No psychologist found.");
                setLoading(false);
                return;
            }

            const docUser = snapshot.docs[0];
            const docData = docUser.data();

            // Link in Database
            await updateDoc(doc(db, 'users', auth.currentUser!.uid), {
                psychologistId: docUser.id
            });

            setPsychologist(docData);
            Alert.alert("Connected!", `You are now linked to ${docData.fullName}`);
        } catch (err) {
            Alert.alert("Error", "Connection failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async () => {
        Alert.alert("Disconnect", "Are you sure?", [
            { text: "Cancel" },
            { text: "Yes", onPress: async () => {
                await updateDoc(doc(db, 'users', auth.currentUser!.uid), { psychologistId: null });
                setPsychologist(null);
            }}
        ]);
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.header}>My Therapy</Text>

            {psychologist ? (
                // --- VIEW: CONNECTED ---
                <View style={styles.card}>
                    <View style={styles.doctorHeader}>
                        <View style={styles.iconBox}>
                            <FontAwesome name="user-md" size={32} color="#6B4EFF" />
                        </View>
                        <View>
                            <Text style={styles.docLabel}>Your Psychologist</Text>
                            <Text style={styles.docName}>{psychologist.fullName || "Dr. Unknown"}</Text>
                        </View>
                    </View>
                    
                    <View style={styles.divider} />
                    
                    <TouchableOpacity style={styles.actionRow}>
                        <FontAwesome name="calendar" size={20} color="#4A5568" />
                        <Text style={styles.actionText}>Request Appointment</Text>
                        <FontAwesome name="chevron-right" size={14} color="#CBD5E0" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionRow}>
                        <FontAwesome name="file-text-o" size={20} color="#4A5568" />
                        <Text style={styles.actionText}>Shared Notes</Text>
                        <FontAwesome name="chevron-right" size={14} color="#CBD5E0" />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleDisconnect} style={styles.disconnectBtn}>
                        <Text style={styles.disconnectText}>Disconnect</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                // --- VIEW: NOT CONNECTED ---
                <View style={styles.centerContent}>
                    <FontAwesome name="link" size={60} color="#E2E8F0" />
                    <Text style={styles.title}>Connect with your Doctor</Text>
                    <Text style={styles.subtitle}>
                        Enter the pairing code provided by your psychologist to start sharing data.
                    </Text>

                    <TextInput 
                        style={styles.input} 
                        placeholder="e.g. DAN-8821" 
                        placeholderTextColor="#A0AEC0"
                        value={code}
                        onChangeText={setCode}
                        autoCapitalize="characters"
                    />

                    <TouchableOpacity style={styles.button} onPress={handleConnect} disabled={loading}>
                        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Connect Account</Text>}
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F7FAFC', padding: 20 },
    header: { fontSize: 28, fontWeight: 'bold', color: '#2D3748', marginBottom: 20 },
    
    // Connected Styles
    card: { backgroundColor: 'white', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    doctorHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    iconBox: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#F3F0FF', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
    docLabel: { fontSize: 12, color: '#718096', textTransform: 'uppercase', letterSpacing: 1 },
    docName: { fontSize: 20, fontWeight: 'bold', color: '#2D3748' },
    divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 10 },
    actionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F7FAFC' },
    actionText: { flex: 1, marginLeft: 15, fontSize: 16, color: '#4A5568' },
    disconnectBtn: { marginTop: 20, alignItems: 'center', padding: 10 },
    disconnectText: { color: '#E53E3E', fontWeight: 'bold' },

    // Not Connected Styles
    centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: -50 },
    title: { fontSize: 22, fontWeight: 'bold', color: '#2D3748', marginTop: 20 },
    subtitle: { textAlign: 'center', color: '#718096', marginVertical: 10, paddingHorizontal: 20 },
    input: { width: '100%', backgroundColor: 'white', height: 56, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 20, fontSize: 18, marginTop: 20, textAlign: 'center' },
    button: { width: '100%', backgroundColor: '#6B4EFF', height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 15 },
    btnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});