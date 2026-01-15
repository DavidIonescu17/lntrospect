import styles from '../styles/index.styles';
import React, { useState, useEffect, useCallback } from 'react';
import { 
  TouchableOpacity, 
  Text, 
  ScrollView, 
  Image, 
  View, 
  Dimensions, 
  Alert, 
  Modal, 
  Linking, 
  Vibration,
  StyleSheet 
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { auth } from '../../firebaseConfig';
import { getAuth } from 'firebase/auth';
import { router, useFocusEffect } from 'expo-router';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import CryptoJS from 'crypto-js';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getEncryptionKey } from '../utils/encryption';

const MOODS = {
  veryHappy: { icon: 'emoticon-excited-outline', color: '#FFD93D', label: 'Very Happy' },
  happy: { icon: 'emoticon-happy-outline', color: '#4CAF50', label: 'Happy' },
  content: { icon: 'emoticon-outline', color: '#7ED6DF', label: 'Content' },
  neutral: { icon: 'emoticon-neutral-outline', color: '#92beb5', label: 'Neutral' },
  anxious: { icon: 'emoticon-frown-outline', color: '#9b59b6', label: 'Anxious' },
  angry: { icon: 'emoticon-angry-outline', color: '#e74c3c', label: 'Angry' },
  sad: { icon: 'emoticon-sad-outline', color: '#7286D3', label: 'Sad' },
  verySad: { icon: 'emoticon-cry-outline', color: '#b44560', label: 'Very Sad' },
  overwhelmed: { icon: 'emoticon-confused-outline', color: '#ffa502', label: 'Overwhelmed' },
  tired: { icon: 'emoticon-sick-outline', color: '#95a5a6', label: 'Tired' },
  hopeful: { icon: 'emoticon-wink-outline', color: '#00cec9', label: 'Hopeful' }
};

const { width } = Dimensions.get('window');

// --- CRISIS MODULE CONSTANTS ---
const EMERGENCY_NUMBERS = [
  { name: 'Emergency (112)', number: '112', icon: 'ambulance' },
  { name: 'Anti-Suicide Alliance', number: '0800 801 200', icon: 'lifebuoy' },
  { name: 'Domestic Violence', number: '0800 500 333', icon: 'home-alert' },
  { name: 'DepreHUB', number: '0726 666 266', icon: 'headset' },
];

export default function TabOneScreen() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [moodData, setMoodData] = useState<{ [date: string]: string[] }>({});
  const [dailyHabitStats, setDailyHabitStats] = useState<{ [date: string]: { completed: number, total: number } }>({});
  const [loading, setLoading] = useState(true);
  const [isHabitView, setIsHabitView] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState<string | null>(null);
  const [isEncryptionKeyLoaded, setIsEncryptionKeyLoaded] = useState(false);
  
  // --- PANIC MODE STATE ---
  const [panicModalVisible, setPanicModalVisible] = useState(false);

  const user = getAuth().currentUser;

  useEffect(() => {
    const loadKey = async () => {
      const key = await getEncryptionKey();
      setEncryptionKey(key);
      setIsEncryptionKeyLoaded(true);
    };
    loadKey();
  }, []);

  useEffect(() => {
    const unsubscribe = getAuth().onAuthStateChanged((user) => {
      if (!user) router.replace('/');
    });
    return () => unsubscribe();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (user && isEncryptionKeyLoaded) {
        loadMoodData();
        fetchDailyHabitStats();
      }
    }, [user, isEncryptionKeyLoaded])
  );

  // --- PANIC BUTTON LOGIC (FR-19 to FR-22) ---
  const handlePanicLongPress = () => {
    Vibration.vibrate(100); // Haptic feedback confirmation
    setPanicModalVisible(true);
  };

  const handleCall = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  const handleSafeCircleAlert = () => {
    // FR-21: In a real app, this would use SMS API or Push Notifications to specific contacts.
    // Here we open the SMS app pre-filled.
    const message = "I am having a crisis and need support. Please contact me.";
    Linking.openURL(`sms:?body=${message}`);
  };

  const handlePanicPressShort = () => {
    // FR-20: Prevent accidental activation
    Alert.alert("Hold to Activate", "Please long-press the SOS button for 2 seconds to activate Emergency Mode.");
  };

  const decryptData = (encryptedData: string | undefined | null) => {
    if (!encryptionKey || typeof encryptedData !== 'string' || encryptedData.length < 8) {
      return null;
    }
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
      const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedString) return null;
      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('Decryption error:', error);
      return null;
    }
  };

  const getCleanDateString = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const formatLocalYYYYMMDD = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const fetchDailyHabitStats = async () => {
    if (!user) return;

    try {
      const todayKey = formatLocalYYYYMMDD(new Date());
      const start = new Date();
      start.setDate(start.getDate() - 365);
      const startKey = formatLocalYYYYMMDD(start);

      const q = query(
        collection(db, 'daily_habits'),
        where('userId', '==', user.uid),
        where('date', '>=', startKey),
        where('date', '<=', todayKey)
      );
      const querySnapshot = await getDocs(q);

      const stats: { [date: string]: { completed: number, total: number } } = {};
      querySnapshot.forEach(docSnap => {
        const docData = docSnap.data();
        const habits = docData.habits as { completed: boolean }[] || [];
        const date = docData.date as string;
        const completedCount = habits.filter(h => h.completed).length;
        const totalCount = habits.length;
        stats[date] = { completed: completedCount, total: totalCount };
      });
      setDailyHabitStats(stats);
    } catch (error) {
      console.error('Error fetching daily habit stats:', error);
    }
  };

  const loadMoodData = async () => {
    if (!user || !isEncryptionKeyLoaded || !encryptionKey) return;

    try {
      setLoading(true);
      const q = query(
        collection(db, 'journal_entries'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const moodByDate: { [date: string]: string[] } = {};

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const encryptedDataFromFirestore = data.encryptedContent || data.cryptedContent;
        const decryptedData = decryptData(encryptedDataFromFirestore);

        if (decryptedData && typeof decryptedData === 'object' && decryptedData.mood) {
          const entryDate = new Date(decryptedData.date).toISOString().split('T')[0];

          if (!moodByDate[entryDate]) {
            moodByDate[entryDate] = [];
          }
          moodByDate[entryDate].push(decryptedData.mood);
        }
      });

      setMoodData(moodByDate);
    } catch (error) {
      console.error('Error loading mood data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDayPress = (day: { dateString: string }) => {
    const now = new Date();
    const todayDateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    if (day.dateString > todayDateString) {
      Alert.alert('Future Date', 'You cannot view future dates.', [{ text: 'OK' }]);
      return;
    }

    router.push({
      pathname: '/specific-day',
      params: { date: day.dateString },
    });
  };

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  const getMarkedDates = useCallback(() => {
    const todayDate = getTodayDate();
    const marked: any = {
      [todayDate]: {
        selected: true,
        selectedColor: '#6B4EFF',
        selectedTextColor: 'white',
      },
    };

    if (isHabitView) {
      Object.keys(dailyHabitStats).forEach(date => {
        const stats = dailyHabitStats[date];
        if (stats) {
          if (date === todayDate) {
            marked[date] = { ...marked[date], habitStats: stats };
          } else {
            marked[date] = {
              habitStats: stats,
              customStyles: {
                container: { backgroundColor: 'white', borderRadius: 16 },
                text: { color: '#2d3436' }
              }
            };
          }
        }
      });
    } else {
      Object.keys(moodData).forEach(date => {
        const moodsForDay = moodData[date];
        if (moodsForDay && moodsForDay.length > 0) {
          if (date === todayDate) {
            marked[date] = { ...marked[date], moods: moodsForDay };
          } else {
            marked[date] = {
              moods: moodsForDay,
              customStyles: {
                container: { backgroundColor: 'white', borderRadius: 16 },
                text: { color: '#2d3436' }
              }
            };
          }
        }
      });
    }
    return marked;
  }, [isHabitView, moodData, dailyHabitStats]);

  const CustomDayWithMultiMoods = ({ date, state, marking, onPress }: any) => {
    const isSelected = marking?.selected;
    const moodsForDay = marking?.moods || [];
    const habitStatsForDay = marking?.habitStats;

    return (
      <TouchableOpacity
        style={[
          styles.dayWrapper,
          isSelected && styles.selectedDayWrapper,
          state === 'disabled' && styles.disabledDayWrapper,
        ]}
        onPress={() => onPress(date)}
        disabled={state === 'disabled'}
      >
        <Text
          style={[
            styles.dayNumber,
            isSelected && styles.selectedDayNumber,
            state === 'disabled' && styles.disabledDayNumber,
          ]}
        >
          {date.day}
        </Text>
        {isHabitView ? (
          habitStatsForDay ? (
            <View style={styles.habitCountContainer}>
              <Text style={styles.habitCountText}>
                {habitStatsForDay.completed}/{habitStatsForDay.total}
              </Text>
              <MaterialCommunityIcons name="check-all" size={12} color="#6B4EFF" />
            </View>
          ) : null
        ) : (
          moodsForDay.length > 0 && (
            <View style={styles.multiMoodContainer}>
              {moodsForDay.map((mood: string, index: number) => {
                const moodIcon = MOODS[mood]?.icon;
                const moodColor = MOODS[mood]?.color;
                return (
                  <MaterialCommunityIcons
                    key={`${mood}-${index}`}
                    name={moodIcon || 'emoticon-outline'}
                    size={12}
                    color={moodColor || '#ccc'}
                    style={styles.multiMoodIcon}
                  />
                );
              })}
            </View>
          )
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={{flex: 1}}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          {/* FR-19: Persistent Panic Button */}
          <View style={localStyles.panicButtonContainer}>
            <TouchableOpacity 
              style={localStyles.panicButton}
              onLongPress={handlePanicLongPress} // FR-20: Long press required
              onPress={handlePanicPressShort} // Warning for short press
              delayLongPress={1500}
              activeOpacity={0.8}
            >
              <Text style={localStyles.panicButtonText}>SOS</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.heroContent}>
            <Image
              source={require('../../assets/images/logo2.png')}
              style={styles.logo}
            />
            <Text style={styles.heroTitle}>Welcome to your Journey of self-discovery</Text>
          </View>
        </View>

        {/* Calendar Section */}
        <View style={styles.calendarSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionSubtitle}>Tap any day to explore your memories</Text>
            <TouchableOpacity
              style={styles.toggleViewButton}
              onPress={() => setIsHabitView(!isHabitView)}
            >
              <MaterialCommunityIcons
                name={isHabitView ? "emoticon-outline" : "check-all"}
                size={20}
                color="#6B4EFF"
              />
              <Text style={styles.toggleViewButtonText}>
                {isHabitView ? "Show Moods" : "Show Habits"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.calendarContainer}>
             <Calendar
              onDayPress={handleDayPress}
              style={styles.calendar}
              markingType="custom"
              markedDates={getMarkedDates()}
              dayComponent={CustomDayWithMultiMoods}
              theme={{
                textDayFontFamily: 'System',
                textMonthFontFamily: 'System',
                textDayHeaderFontFamily: 'System',
                textDayFontWeight: '400',
                textMonthFontWeight: '600',
                textDayHeaderFontWeight: '600',
                textDayFontSize: 16,
                textMonthFontSize: 18,
                textDayHeaderFontSize: 14
              }}
            />

            {!isHabitView && (
              <View style={styles.legend}>
                <Text style={styles.legendTitle}>Mood Legend</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.legendScrollViewContent}>
                  {Object.entries(MOODS).map(([key, mood]) => (
                    <View key={key} style={styles.legendItem}>
                      <MaterialCommunityIcons
                        name={mood.icon}
                        size={20}
                        color={mood.color}
                        style={styles.legendIcon}
                      />
                      <Text style={styles.legendText}>{mood.label}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push({
              pathname: '/specific-day',
              params: {
                date: getTodayDate(),
                initialTab: 'journal',
                openForm: 'true'
              }
            })}
          >
            <LinearGradient
              colors={['#6B4EFF', '#8A4FFF']}
              style={styles.actionButtonGradient}
            >
              <MaterialCommunityIcons name="plus-circle" size={24} color="white" />
              <Text style={styles.actionButtonText}>Add Today's Entry</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/all-entries')}
          >
            <View style={styles.secondaryActionButton}>
              <MaterialCommunityIcons name="book-open" size={24} color="#6B4EFF" />
              <Text style={styles.secondaryActionButtonText}>View All Entries</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* FR-21 & FR-22: CRISIS MODE MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={panicModalVisible}
        onRequestClose={() => setPanicModalVisible(false)}
      >
        <View style={localStyles.modalOverlay}>
          <View style={localStyles.modalContent}>
            <View style={localStyles.modalHeader}>
              <MaterialCommunityIcons name="alert-circle" size={32} color="#FF4E4E" />
              <Text style={localStyles.modalTitle}>Emergency Support</Text>
            </View>
            
            <Text style={localStyles.modalSubtitle}>
              You are not alone. Please choose an option below.
            </Text>

            {/* Safe Circle Button */}
            <TouchableOpacity 
              style={[localStyles.modalButton, localStyles.safeCircleButton]}
              onPress={handleSafeCircleAlert}
            >
              <MaterialCommunityIcons name="message-alert" size={24} color="white" />
              <View style={localStyles.buttonTextContainer}>
                <Text style={localStyles.buttonTitle}>Alert Safe Circle</Text>
                <Text style={localStyles.buttonDesc}>Send emergency SMS to contacts</Text>
              </View>
            </TouchableOpacity>

            <View style={localStyles.divider} />
            <Text style={localStyles.hotlineHeader}>Immediate Hotlines (Romania)</Text>

            {/* Hotline Buttons */}
            {EMERGENCY_NUMBERS.map((item, index) => (
              <TouchableOpacity 
                key={index}
                style={localStyles.hotlineButton}
                onPress={() => handleCall(item.number)}
              >
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <View style={localStyles.iconCircle}>
                    <MaterialCommunityIcons name={item.icon} size={20} color="#6B4EFF" />
                  </View>
                  <Text style={localStyles.hotlineName}>{item.name}</Text>
                </View>
                <Text style={localStyles.hotlineNumber}>{item.number}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity 
              style={localStyles.closeModalButton}
              onPress={() => setPanicModalVisible(false)}
            >
              <Text style={localStyles.closeModalText}>Close / I'm Safe</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Local styles for the panic button features
const localStyles = StyleSheet.create({
  panicButtonContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 100,
  },
  panicButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF4E4E',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF4E4E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  panicButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 500,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    gap: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  safeCircleButton: {
    backgroundColor: '#6B4EFF',
    shadowColor: '#6B4EFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonTextContainer: {
    marginLeft: 16,
  },
  buttonTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonDesc: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 20,
  },
  hotlineHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 12,
  },
  hotlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F7FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E9D8FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  hotlineName: {
    fontSize: 16,
    color: '#2D3748',
    fontWeight: '500',
  },
  hotlineNumber: {
    fontSize: 16,
    color: '#6B4EFF',
    fontWeight: 'bold',
  },
  closeModalButton: {
    marginTop: 20,
    padding: 16,
    alignItems: 'center',
  },
  closeModalText: {
    fontSize: 16,
    color: '#718096',
    fontWeight: '600',
  },
});