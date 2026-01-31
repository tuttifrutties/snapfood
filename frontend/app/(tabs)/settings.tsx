import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePremium } from '../../src/contexts/PremiumContext';
import { useTheme, ACCENT_COLORS, ThemeMode } from '../../src/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { changeLanguage, getSupportedLanguages } from '../../src/i18n';
import {
  registerForPushNotificationsAsync,
  scheduleLunchReminder,
  scheduleDinnerReminder,
  scheduleSnackReminder,
  scheduleFridayReminder,
  getLunchReminderStatus,
  getDinnerReminderStatus,
  getSnackReminderStatus,
  getFridayReminderStatus,
  getReminderTime,
  setReminderTime,
  DEFAULT_LUNCH_HOUR,
  DEFAULT_LUNCH_MINUTE,
  DEFAULT_DINNER_HOUR,
  DEFAULT_DINNER_MINUTE,
  DEFAULT_SNACK_HOUR,
  DEFAULT_SNACK_MINUTE,
  DEFAULT_FRIDAY_HOUR,
  DEFAULT_FRIDAY_MINUTE,
} from '../../src/services/notifications';

export default function SettingsScreen() {
  const { isPremium } = usePremium();
  const { theme, themeMode, accentColor, setThemeMode, setAccentColor } = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [saveToGallery, setSaveToGallery] = useState(true);
  const [lunchReminder, setLunchReminder] = useState(false);
  const [dinnerReminder, setDinnerReminder] = useState(false);
  const [snackReminder, setSnackReminder] = useState(false);
  const [fridayReminder, setFridayReminder] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [editingReminderType, setEditingReminderType] = useState<'lunch' | 'dinner' | 'snack' | 'friday' | null>(null);
  const [reminderTimes, setReminderTimes] = useState({
    lunch: { hour: DEFAULT_LUNCH_HOUR, minute: DEFAULT_LUNCH_MINUTE },
    dinner: { hour: DEFAULT_DINNER_HOUR, minute: DEFAULT_DINNER_MINUTE },
    snack: { hour: DEFAULT_SNACK_HOUR, minute: DEFAULT_SNACK_MINUTE },
    friday: { hour: DEFAULT_FRIDAY_HOUR, minute: DEFAULT_FRIDAY_MINUTE },
  });
  
  const supportedLanguages = getSupportedLanguages();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const savedPref = await AsyncStorage.getItem('saveToGallery');
    if (savedPref !== null) {
      setSaveToGallery(savedPref === 'true');
    }
    
    // Load notification settings
    const lunchStatus = await getLunchReminderStatus();
    const dinnerStatus = await getDinnerReminderStatus();
    const snackStatus = await getSnackReminderStatus();
    const fridayStatus = await getFridayReminderStatus();
    setLunchReminder(lunchStatus);
    setDinnerReminder(dinnerStatus);
    setSnackReminder(snackStatus);
    setFridayReminder(fridayStatus);
    
    // Load custom times
    const lunchTime = await getReminderTime('lunch');
    const dinnerTime = await getReminderTime('dinner');
    const snackTime = await getReminderTime('snack');
    const fridayTime = await getReminderTime('friday');
    setReminderTimes({
      lunch: lunchTime,
      dinner: dinnerTime,
      snack: snackTime,
      friday: fridayTime,
    });
  };

  const toggleSaveToGallery = async (value: boolean) => {
    setSaveToGallery(value);
    await AsyncStorage.setItem('saveToGallery', value.toString());
  };

  const toggleLunchReminder = async (value: boolean) => {
    if (value) {
      await registerForPushNotificationsAsync();
    }
    await scheduleLunchReminder(value, i18n.language);
    setLunchReminder(value);
    
    if (value) {
      Alert.alert(
        t('settings.notificationsEnabled'),
        t('settings.lunchReminderDesc')
      );
    }
  };

  const toggleDinnerReminder = async (value: boolean) => {
    if (value) {
      await registerForPushNotificationsAsync();
    }
    await scheduleDinnerReminder(value, i18n.language);
    setDinnerReminder(value);
    
    if (value) {
      Alert.alert(
        t('settings.notificationsEnabled'),
        t('settings.dinnerReminderDesc')
      );
    }
  };

  const toggleSnackReminder = async (value: boolean) => {
    if (value) {
      await registerForPushNotificationsAsync();
    }
    await scheduleSnackReminder(value, i18n.language);
    setSnackReminder(value);
    
    if (value) {
      Alert.alert(
        t('settings.notificationsEnabled'),
        t('settings.snackReminderDesc')
      );
    }
  };

  const toggleFridayReminder = async (value: boolean) => {
    if (value) {
      await registerForPushNotificationsAsync();
    }
    await scheduleFridayReminder(value, i18n.language);
    setFridayReminder(value);
    
    if (value) {
      Alert.alert(
        t('settings.notificationsEnabled'),
        t('settings.fridayReminderDesc')
      );
    }
  };

  const toggleLanguage = async () => {
    setLanguageModalVisible(true);
  };

  const selectLanguage = async (langCode: string) => {
    await changeLanguage(langCode);
    setLanguageModalVisible(false);
    
    // Update all notifications with new language
    if (lunchReminder) await scheduleLunchReminder(true, langCode);
    if (dinnerReminder) await scheduleDinnerReminder(true, langCode);
    if (snackReminder) await scheduleSnackReminder(true, langCode);
    if (fridayReminder) await scheduleFridayReminder(true, langCode);
  };

  const formatTime = (hour: number, minute: number) => {
    const h = hour % 12 || 12;
    const m = minute.toString().padStart(2, '0');
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${h}:${m} ${ampm}`;
  };

  const openTimePicker = (type: 'lunch' | 'dinner' | 'snack' | 'friday') => {
    setEditingReminderType(type);
    setTimePickerVisible(true);
  };

  const selectTime = async (hour: number, minute: number) => {
    if (!editingReminderType) return;
    
    await setReminderTime(editingReminderType, hour, minute);
    setReminderTimes(prev => ({
      ...prev,
      [editingReminderType]: { hour, minute }
    }));
    
    // Reschedule the notification with new time
    const isEnabled = {
      lunch: lunchReminder,
      dinner: dinnerReminder,
      snack: snackReminder,
      friday: fridayReminder,
    }[editingReminderType];
    
    if (isEnabled) {
      const scheduleFunc = {
        lunch: scheduleLunchReminder,
        dinner: scheduleDinnerReminder,
        snack: scheduleSnackReminder,
        friday: scheduleFridayReminder,
      }[editingReminderType];
      
      await scheduleFunc(true, i18n.language);
    }
    
    setTimePickerVisible(false);
    setEditingReminderType(null);
  };

  // Generate time options (every 30 minutes)
  const timeOptions = [];
  for (let h = 6; h <= 23; h++) {
    timeOptions.push({ hour: h, minute: 0 });
    timeOptions.push({ hour: h, minute: 30 });
  }

  const getCurrentLanguageDisplay = () => {
    const currentLang = supportedLanguages.find(l => l.code === i18n.language);
    return currentLang ? `${currentLang.flag} ${currentLang.name}` : 'English';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
          {t('settings.subtitle')}
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {isPremium && (
          <View style={[styles.premiumBadge, { backgroundColor: theme.premium + '20' }]}>
            <Ionicons name="star" size={24} color={theme.premium} />
            <Text style={[styles.premiumText, { color: theme.premium }]}>
              {t('settings.premiumMember')}
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            {t('settings.general')}
          </Text>
          
          <TouchableOpacity 
            style={[styles.settingRow, { backgroundColor: theme.surface }]} 
            onPress={toggleLanguage}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>
                {t('settings.language')}
              </Text>
              <Text style={[styles.settingDescription, { color: theme.textMuted }]}>
                {getCurrentLanguageDisplay()}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>

          {/* Theme Settings */}
          <TouchableOpacity 
            style={[styles.settingRow, { backgroundColor: theme.surface }]} 
            onPress={() => setThemeModalVisible(true)}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>
                {i18n.language === 'es' ? 'Tema' : 'Theme'}
              </Text>
              <Text style={[styles.settingDescription, { color: theme.textMuted }]}>
                {themeMode === 'dark' 
                  ? (i18n.language === 'es' ? 'Oscuro' : 'Dark')
                  : (i18n.language === 'es' ? 'Claro' : 'Light')}
                {' • '}{accentColor.name}
              </Text>
            </View>
            <View style={[styles.colorPreview, { backgroundColor: theme.primary }]} />
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>

          <View style={[styles.settingRow, { backgroundColor: theme.surface }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>
                {t('settings.saveToGallery')}
              </Text>
              <Text style={[styles.settingDescription, { color: theme.textMuted }]}>
                {t('settings.saveToGalleryDesc')}
              </Text>
            </View>
            <Switch
              value={saveToGallery}
              onValueChange={toggleSaveToGallery}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            {t('settings.notifications')}
          </Text>
          
          <View style={[styles.settingRow, { backgroundColor: theme.surface }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>
                {t('settings.lunchReminder')}
              </Text>
              <TouchableOpacity onPress={() => openTimePicker('lunch')}>
                <Text style={[styles.timeButton, { color: theme.primary }]}>
                  🕐 {formatTime(reminderTimes.lunch.hour, reminderTimes.lunch.minute)}
                </Text>
              </TouchableOpacity>
            </View>
            <Switch
              value={lunchReminder}
              onValueChange={toggleLunchReminder}
              trackColor={{ false: '#333', true: theme.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={[styles.settingRow, { backgroundColor: theme.surface }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>{t('settings.dinnerReminder')}</Text>
              <TouchableOpacity onPress={() => openTimePicker('dinner')}>
                <Text style={[styles.timeButton, { color: theme.primary }]}>
                  🕐 {formatTime(reminderTimes.dinner.hour, reminderTimes.dinner.minute)}
                </Text>
              </TouchableOpacity>
            </View>
            <Switch
              value={dinnerReminder}
              onValueChange={toggleDinnerReminder}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={[styles.settingRow, { backgroundColor: theme.surface }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>{t('settings.snackReminder')}</Text>
              <TouchableOpacity onPress={() => openTimePicker('snack')}>
                <Text style={[styles.timeButton, { color: theme.primary }]}>
                  🕐 {formatTime(reminderTimes.snack.hour, reminderTimes.snack.minute)}
                </Text>
              </TouchableOpacity>
            </View>
            <Switch
              value={snackReminder}
              onValueChange={toggleSnackReminder}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={[styles.settingRow, { backgroundColor: theme.surface }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>{t('settings.fridayReminder')}</Text>
              <TouchableOpacity onPress={() => openTimePicker('friday')}>
                <Text style={[styles.timeButton, { color: theme.primary }]}>
                  🕐 {formatTime(reminderTimes.friday.hour, reminderTimes.friday.minute)}
                </Text>
              </TouchableOpacity>
            </View>
            <Switch
              value={fridayReminder}
              onValueChange={toggleFridayReminder}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('settings.subscription')}</Text>
          
          {!isPremium ? (
            <TouchableOpacity
              style={[styles.upgradeCard, { backgroundColor: theme.surface }]}
              onPress={() => router.push('/paywall')}
            >
              <View style={styles.upgradeContent}>
                <Ionicons name="star" size={40} color="#FFD700" />
                <View style={styles.upgradeText}>
                  <Text style={[styles.upgradeTitle, { color: theme.text }]}>{t('settings.upgradePremium')}</Text>
                  <Text style={[styles.upgradeDescription, { color: theme.textMuted }]}>
                    {t('settings.upgradePremiumDesc')}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color={theme.textMuted} />
            </TouchableOpacity>
          ) : (
            <View style={[styles.premiumCard, { backgroundColor: theme.surface }]}>
              <Text style={[styles.premiumCardText, { color: theme.text }]}>{t('settings.premiumActive')}</Text>
              <Text style={[styles.premiumCardSubtext, { color: theme.textMuted }]}>{t('settings.premiumActiveDesc')}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('settings.about')}</Text>
          
          <TouchableOpacity 
            style={[styles.menuItem, { backgroundColor: theme.surface }]}
            onPress={() => router.push('/legal/privacy')}
          >
            <Text style={[styles.menuText, { color: theme.text }]}>{t('settings.privacyPolicy')}</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.menuItem, { backgroundColor: theme.surface }]}
            onPress={() => router.push('/legal/terms')}
          >
            <Text style={[styles.menuText, { color: theme.text }]}>{t('settings.termsOfService')}</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.menuItem, { backgroundColor: theme.surface }]}
            onPress={() => router.push('/legal/help')}
          >
            <Text style={[styles.menuText, { color: theme.text }]}>{t('settings.helpSupport')}</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>{t('settings.version')}</Text>
        </View>
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal
        visible={languageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setLanguageModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('settings.language')}</Text>
            {supportedLanguages.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageOption,
                  i18n.language === lang.code && styles.languageOptionSelected
                ]}
                onPress={() => selectLanguage(lang.code)}
              >
                <Text style={styles.languageFlag}>{lang.flag}</Text>
                <Text style={[
                  styles.languageText,
                  i18n.language === lang.code && styles.languageTextSelected
                ]}>
                  {lang.name}
                </Text>
                {i18n.language === lang.code && (
                  <Ionicons name="checkmark" size={24} color="theme.primary" />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setLanguageModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Theme Modal */}
      <Modal
        visible={themeModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setThemeModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setThemeModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {i18n.language === 'es' ? 'Tema' : 'Theme'}
            </Text>
            
            {/* Mode selection */}
            <Text style={styles.themeSubtitle}>
              {i18n.language === 'es' ? 'Modo' : 'Mode'}
            </Text>
            <View style={styles.themeModeRow}>
              <TouchableOpacity
                style={[
                  styles.themeModeButton,
                  themeMode === 'light' && styles.themeModeButtonSelected
                ]}
                onPress={() => setThemeMode('light')}
              >
                <Ionicons 
                  name="sunny" 
                  size={24} 
                  color={themeMode === 'light' ? theme.primary : '#aaa'} 
                />
                <Text style={[
                  styles.themeModeText,
                  themeMode === 'light' && { color: theme.primary }
                ]}>
                  {i18n.language === 'es' ? 'Claro' : 'Light'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.themeModeButton,
                  themeMode === 'dark' && styles.themeModeButtonSelected
                ]}
                onPress={() => setThemeMode('dark')}
              >
                <Ionicons 
                  name="moon" 
                  size={24} 
                  color={themeMode === 'dark' ? theme.primary : '#aaa'} 
                />
                <Text style={[
                  styles.themeModeText,
                  themeMode === 'dark' && { color: theme.primary }
                ]}>
                  {i18n.language === 'es' ? 'Oscuro' : 'Dark'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Color selection */}
            <Text style={styles.themeSubtitle}>
              {i18n.language === 'es' ? 'Color' : 'Accent Color'}
            </Text>
            <View style={styles.colorGrid}>
              {ACCENT_COLORS.map((color) => (
                <TouchableOpacity
                  key={color.id}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color.primary },
                    accentColor.id === color.id && styles.colorOptionSelected
                  ]}
                  onPress={() => setAccentColor(color.id)}
                >
                  {accentColor.id === color.id && (
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.modalCloseButton, { backgroundColor: theme.primary }]}
              onPress={() => setThemeModalVisible(false)}
            >
              <Text style={[styles.modalCloseText, { color: '#fff' }]}>
                {i18n.language === 'es' ? 'Listo' : 'Done'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Time Picker Modal */}
      <Modal
        visible={timePickerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setTimePickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setTimePickerVisible(false)}
        >
          <View style={[styles.modalContent, { maxHeight: '70%' }]}>
            <Text style={styles.modalTitle}>
              {i18n.language === 'es' ? '🕐 Seleccionar hora' : '🕐 Select time'}
            </Text>
            <ScrollView style={{ maxHeight: 350 }}>
              {timeOptions.map((t, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.languageOption,
                    editingReminderType && 
                    reminderTimes[editingReminderType].hour === t.hour && 
                    reminderTimes[editingReminderType].minute === t.minute && 
                    styles.languageOptionSelected
                  ]}
                  onPress={() => selectTime(t.hour, t.minute)}
                >
                  <Text style={[
                    styles.languageText,
                    editingReminderType && 
                    reminderTimes[editingReminderType].hour === t.hour && 
                    reminderTimes[editingReminderType].minute === t.minute && 
                    styles.languageTextSelected
                  ]}>
                    {formatTime(t.hour, t.minute)}
                  </Text>
                  {editingReminderType && 
                   reminderTimes[editingReminderType].hour === t.hour && 
                   reminderTimes[editingReminderType].minute === t.minute && (
                    <Ionicons name="checkmark" size={24} color="theme.primary" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setTimePickerVisible(false)}
            >
              <Text style={styles.modalCloseText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  headerSubtitle: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 4,
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
    marginBottom: 8,
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
  timeButton: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
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
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  versionText: {
    fontSize: 14,
    color: '#555',
  },
  // Language Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    width: '85%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#2a2a2a',
  },
  languageOptionSelected: {
    backgroundColor: 'theme.primary20',
    borderWidth: 1,
    borderColor: 'theme.primary',
  },
  languageFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  languageText: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  languageTextSelected: {
    color: 'theme.primary',
    fontWeight: '600',
  },
  modalCloseButton: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#333',
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#aaa',
  },
  // Theme Modal Styles
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  themeSubtitle: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 12,
    marginTop: 8,
  },
  themeModeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  themeModeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeModeButtonSelected: {
    borderColor: 'theme.primary',
    backgroundColor: 'theme.primary10',
  },
  themeModeText: {
    fontSize: 16,
    color: '#aaa',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 16,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#fff',
  },
});