import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Share, FlatList, ActivityIndicator, Alert, Modal, TextInput, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { auth, db } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { FontAwesome } from '@expo/vector-icons';

export default function PsychologistDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [pairingCode, setPairingCode] = useState<string | null>(null);
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Profile Editing State
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [newName, setNewName] = useState('');
    const [newTitle, setNewTitle] = useState('');

    // Client Viewing State
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [clientJournals, setClientJournals] = useState<any[]>([]);
    const [loadingJournals, setLoadingJournals] = useState(false);

    // 1. Initial Data Load
    useEffect(() => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        // A. Get My Profile
        const fetchProfile = async () => {
            const userRef = doc(db, 'users', currentUser.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const data = userSnap.data();
                setUser(data);
                setNewName(data.fullName || '');
                setNewTitle(data.title || ''); // e.g., "Clinical Psychologist"

                // Generate Code if missing
                if (!data.pairingCode) {
                    const namePart = (data.fullName || "DOC").substring(0, 3).toUpperCase();
                    const randomPart = Math.floor(1000 + Math.random() * 9000);
                    const newCode = `${namePart}-${randomPart}`;
                    await updateDoc(userRef, { pairingCode: newCode });
                    setPairingCode(newCode);
                } else {
                    setPairingCode(data.pairingCode);
                }
            }
            setLoading(false);
        };
        fetchProfile();

        // B. Listen for Clients
        const q = query(collection(db, 'users'), where('psychologistId', '==', currentUser.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => unsubscribe();
    }, []);

    // 2. Profile Updates
    const handleUpdateProfile = async () => {
        if (!auth.currentUser) return;
        try {
            await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                fullName: newName,
                title: newTitle
            });
            setUser({ ...user, fullName: newName, title: newTitle });
            setEditModalVisible(false);
            Alert.alert("Success", "Profile updated! Clients will see these details.");
        } catch (error) {
            Alert.alert("Error", "Could not update profile.");
        }
    };

    // 3. View Client Journals (The "Shared" Logic)
    const handleViewClient = async (client: any) => {
        setSelectedClient(client);
        setLoadingJournals(true);
        try {
            // QUERY: Get entries where userId == ClientID AND isShared == true
            const q = query(
                collection(db, 'journal_entries'),
                where('userId', '==', client.id),
                where('isShared', '==', true), 
                orderBy('date', 'desc')
            );
            
            // Using getDocs for one-time fetch (or use onSnapshot for realtime)
            const unsubscribe = onSnapshot(q, (snapshot) => {
                setClientJournals(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
                setLoadingJournals(false);
            });
            
        } catch (error) {
            console.log(error);
            setLoadingJournals(false);
        }
    };

    const handleShare = async () => {
        if (pairingCode) Share.share({ message: `Connect with me on the app! Code: ${pairingCode}` });
    };

    const handleSignOut = async () => {
        await signOut(auth);
        router.replace('/');
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* --- HEADER --- */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>{user?.fullName || "Doctor"}</Text>
                    <Text style={styles.headerSubtitle}>{user?.title || "Psychologist"}</Text>
                </View>
                <View style={{flexDirection:'row', gap: 15}}>
                    <TouchableOpacity onPress={() => setEditModalVisible(true)}>
                        <FontAwesome name="pencil" size={24} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSignOut}>
                        <FontAwesome name="sign-out" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.content}>
                {/* --- CODE CARD --- */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Pairing Code</Text>
                    <TouchableOpacity onPress={handleShare} style={styles.codeBox}>
                        {loading ? <ActivityIndicator color="#6B4EFF" /> : (
                            <Text style={styles.codeText}>{pairingCode}</Text>
                        )}
                        <FontAwesome name="share-alt" size={20} color="#6B4EFF" />
                    </TouchableOpacity>
                </View>

                {/* --- CLIENTS LIST --- */}
                <Text style={styles.sectionTitle}>My Patients</Text>
                <FlatList 
                    data={clients}
                    keyExtractor={item => item.id}
                    ListEmptyComponent={<Text style={styles.emptyText}>No patients connected yet.</Text>}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.clientItem} onPress={() => handleViewClient(item)}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{(item.fullName || "U")[0]}</Text>
                            </View>
                            <View style={{flex:1}}>
                                <Text style={styles.clientName}>{item.fullName || "Client"}</Text>
                                <Text style={styles.clientEmail}>{item.email}</Text>
                            </View>
                            <FontAwesome name="chevron-right" size={14} color="#CBD5E0" />
                        </TouchableOpacity>
                    )}
                />
            </View>

            {/* --- MODAL 1: EDIT PROFILE --- */}
            <Modal visible={editModalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Edit Public Profile</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="Full Name (e.g. Dr. John)" 
                            value={newName} 
                            onChangeText={setNewName} 
                        />
                        <TextInput 
                            style={styles.input} 
                            placeholder="Title (e.g. Clinical Psychologist)" 
                            value={newTitle} 
                            onChangeText={setNewTitle} 
                        />
                        <TouchableOpacity style={styles.saveButton} onPress={handleUpdateProfile}>
                            <Text style={styles.saveText}>Save Details</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cancelButton} onPress={() => setEditModalVisible(false)}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* --- MODAL 2: CLIENT DETAILS & JOURNALS --- */}
            <Modal visible={!!selectedClient} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView style={{flex:1, backgroundColor:'#F7FAFC'}}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{selectedClient?.fullName}'s Shared Journal</Text>
                        <TouchableOpacity onPress={() => setSelectedClient(null)}>
                            <FontAwesome name="close" size={24} color="#2D3748" />
                        </TouchableOpacity>
                    </View>

                    {loadingJournals ? <ActivityIndicator size="large" color="#6B4EFF" style={{marginTop: 50}} /> : (
                        <FlatList
                            data={clientJournals}
                            contentContainerStyle={{padding: 20}}
                            keyExtractor={item => item.id}
                            ListEmptyComponent={
                                <View style={{alignItems:'center', marginTop: 50}}>
                                    <FontAwesome name="lock" size={40} color="#CBD5E0" />
                                    <Text style={styles.emptyText}>No shared entries found.</Text>
                                </View>
                            }
                            renderItem={({ item }) => (
                                <View style={styles.journalCard}>
                                    <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom:8}}>
                                        <Text style={styles.journalDate}>{new Date(item.date?.toDate()).toLocaleDateString()}</Text>
                                        <View style={styles.moodBadge}>
                                            <Text style={styles.moodText}>Mood: {item.mood}/10</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.journalText}>{item.text}</Text>
                                </View>
                            )}
                        />
                    )}
                </SafeAreaView>
            </Modal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F7FAFC' },
    header: { padding: 20, backgroundColor: '#6B4EFF', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    headerSubtitle: { color: '#E9D8FD', fontSize: 14 },
    content: { padding: 20 },
    card: { backgroundColor: 'white', padding: 20, borderRadius: 16, alignItems: 'center', marginBottom: 20, elevation: 2 },
    cardTitle: { fontSize: 14, color: '#718096', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
    codeBox: { flexDirection: 'row', alignItems: 'center', gap: 15, backgroundColor: '#F3F0FF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#D6BCFA' },
    codeText: { fontSize: 24, fontWeight: 'bold', color: '#6B4EFF' },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2D3748', marginBottom: 15, marginTop: 10 },
    clientItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 1 },
    avatar: { width: 45, height: 45, borderRadius: 25, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
    avatarText: { fontSize: 18, fontWeight: 'bold', color: '#4A5568' },
    clientName: { fontSize: 16, fontWeight: '600', color: '#2D3748' },
    clientEmail: { fontSize: 12, color: '#718096' },
    emptyText: { textAlign: 'center', color: '#A0AEC0', marginTop: 20 },
    
    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 25 },
    modalHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding: 20, borderBottomWidth:1, borderColor:'#E2E8F0', backgroundColor:'white' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#2D3748' },
    input: { backgroundColor: '#F7FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 15, marginBottom: 15, fontSize: 16 },
    saveButton: { backgroundColor: '#6B4EFF', padding: 15, borderRadius: 10, alignItems: 'center' },
    saveText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    cancelButton: { padding: 15, alignItems: 'center' },
    cancelText: { color: '#718096' },

    // Journal Card Styles in Modal
    journalCard: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
    journalDate: { fontSize: 14, color: '#718096', fontWeight: '600' },
    moodBadge: { backgroundColor: '#F0FFF4', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    moodText: { color: '#38A169', fontSize: 12, fontWeight: 'bold' },
    journalText: { fontSize: 16, color: '#2D3748', lineHeight: 22 },
});