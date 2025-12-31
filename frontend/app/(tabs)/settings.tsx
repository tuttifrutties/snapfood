import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../../src/contexts/UserContext';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const { isPremium, setPremium } = useUser();
  const router = useRouter();
  const [saveToGallery, setSaveToGallery] = React.useState(true);

  React.useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const savedPref = await AsyncStorage.getItem('saveToGallery');
    if (savedPref !== null) {
      setSaveToGallery(savedPref === 'true');
    }
  };

  const toggleSaveToGallery = async (value: boolean) => {
    setSaveToGallery(value);
    await AsyncStorage.setItem('saveToGallery', value.toString());
  };

  const simulatePremiumToggle = () => {
    Alert.alert(
      isPremium ? 'Disable Premium?' : 'Enable Premium?',
      isPremium
        ? 'This will disable all premium features'
        : 'This will enable all premium features for testing',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => setPremium(!isPremium),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        {isPremium && (
          <View style={styles.premiumBadge}>
            <Ionicons name="star" size={24} color="#FFD700" />
            <Text style={styles.premiumText}>Premium Member</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Save Photos to Gallery</Text>
              <Text style={styles.settingDescription}>
                Automatically save food photos to your device
              </Text>
            </View>
            <Switch
              value={saveToGallery}
              onValueChange={toggleSaveToGallery}
              trackColor={{ false: '#333', true: '#FF6B6B' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription</Text>
          
          {!isPremium ? (
            <TouchableOpacity
              style={styles.upgradeCard}
              onPress={() => router.push('/paywall')}
            >
              <View style={styles.upgradeContent}>
                <Ionicons name="star" size={40} color="#FFD700" />
                <View style={styles.upgradeText}>
                  <Text style={styles.upgradeTitle}>Upgrade to Premium</Text>
                  <Text style={styles.upgradeDescription}>
                    Unlimited tracking, smart suggestions, no ads
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#aaa" />
            </TouchableOpacity>
          ) : (
            <View style={styles.premiumCard}>
              <Text style={styles.premiumCardText}>You have Premium access</Text>
              <Text style={styles.premiumCardSubtext}>
                Enjoying all premium features
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color="#aaa" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={20} color="#aaa" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color="#aaa" />
          </TouchableOpacity>
        </View>

        {/* Test/Debug option */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Developer</Text>
          <TouchableOpacity
            style={styles.testButton}
            onPress={simulatePremiumToggle}
          >
            <Text style={styles.testButtonText}>
              {isPremium ? 'Test: Disable Premium' : 'Test: Enable Premium'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>FoodSnap v1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#1a1a1a',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD70020',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    gap: 12,
  },
  premiumText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFD700',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#aaa',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#aaa',
  },
  upgradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  upgradeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  upgradeText: {
    flex: 1,
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 4,
  },
  upgradeDescription: {
    fontSize: 14,
    color: '#aaa',
  },
  premiumCard: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  premiumCardText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  premiumCardSubtext: {
    fontSize: 14,
    color: '#aaa',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuText: {
    fontSize: 16,
    color: '#fff',
  },
  testButton: {
    backgroundColor: '#FF6B6B',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  versionText: {
    fontSize: 14,
    color: '#555',
  },
});