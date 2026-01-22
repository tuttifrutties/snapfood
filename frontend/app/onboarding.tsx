import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '../src/contexts/UserContext';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PHYSICAL_ACTIVITIES,
  getActivityLabel,
  saveUserNutritionProfile,
  PhysicalActivity,
} from '../src/services/nutritionCoach';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// List of countries with regions for snack recommendations
const COUNTRIES = [
  // Latin America
  { code: 'AR', name: 'Argentina', region: 'latam', flag: '🇦🇷' },
  { code: 'BO', name: 'Bolivia', region: 'latam', flag: '🇧🇴' },
  { code: 'BR', name: 'Brasil', region: 'latam', flag: '🇧🇷' },
  { code: 'CL', name: 'Chile', region: 'latam', flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia', region: 'latam', flag: '🇨🇴' },
  { code: 'CR', name: 'Costa Rica', region: 'latam', flag: '🇨🇷' },
  { code: 'CU', name: 'Cuba', region: 'latam', flag: '🇨🇺' },
  { code: 'EC', name: 'Ecuador', region: 'latam', flag: '🇪🇨' },
  { code: 'SV', name: 'El Salvador', region: 'latam', flag: '🇸🇻' },
  { code: 'GT', name: 'Guatemala', region: 'latam', flag: '🇬🇹' },
  { code: 'HN', name: 'Honduras', region: 'latam', flag: '🇭🇳' },
  { code: 'MX', name: 'México', region: 'latam', flag: '🇲🇽' },
  { code: 'NI', name: 'Nicaragua', region: 'latam', flag: '🇳🇮' },
  { code: 'PA', name: 'Panamá', region: 'latam', flag: '🇵🇦' },
  { code: 'PY', name: 'Paraguay', region: 'latam', flag: '🇵🇾' },
  { code: 'PE', name: 'Perú', region: 'latam', flag: '🇵🇪' },
  { code: 'DO', name: 'Rep. Dominicana', region: 'latam', flag: '🇩🇴' },
  { code: 'UY', name: 'Uruguay', region: 'latam', flag: '🇺🇾' },
  { code: 'VE', name: 'Venezuela', region: 'latam', flag: '🇻🇪' },
  // North America
  { code: 'US', name: 'United States', region: 'northam', flag: '🇺🇸' },
  { code: 'CA', name: 'Canada', region: 'northam', flag: '🇨🇦' },
  // Europe
  { code: 'ES', name: 'España', region: 'europe', flag: '🇪🇸' },
  { code: 'IT', name: 'Italia', region: 'europe', flag: '🇮🇹' },
  { code: 'FR', name: 'France', region: 'europe', flag: '🇫🇷' },
  { code: 'DE', name: 'Deutschland', region: 'europe', flag: '🇩🇪' },
  { code: 'GB', name: 'United Kingdom', region: 'europe', flag: '🇬🇧' },
  { code: 'PT', name: 'Portugal', region: 'europe', flag: '🇵🇹' },
  { code: 'NL', name: 'Netherlands', region: 'europe', flag: '🇳🇱' },
  // Asia
  { code: 'JP', name: '日本', region: 'asia', flag: '🇯🇵' },
  { code: 'CN', name: '中国', region: 'asia', flag: '🇨🇳' },
  { code: 'KR', name: '한국', region: 'asia', flag: '🇰🇷' },
  { code: 'IN', name: 'India', region: 'asia', flag: '🇮🇳' },
  { code: 'TH', name: 'ไทย', region: 'asia', flag: '🇹🇭' },
  // Oceania
  { code: 'AU', name: 'Australia', region: 'oceania', flag: '🇦🇺' },
  { code: 'NZ', name: 'New Zealand', region: 'oceania', flag: '🇳🇿' },
  // Other
  { code: 'OTHER', name: 'Otro / Other', region: 'other', flag: '🌍' },
];

const DAYS_OF_WEEK = [
  { id: 0, short: 'D', label: 'Domingo' },
  { id: 1, short: 'L', label: 'Lunes' },
  { id: 2, short: 'M', label: 'Martes' },
  { id: 3, short: 'X', label: 'Miércoles' },
  { id: 4, short: 'J', label: 'Jueves' },
  { id: 5, short: 'V', label: 'Viernes' },
  { id: 6, short: 'S', label: 'Sábado' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { userId, completeOnboarding } = useUser();
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState(1);

  const [country, setCountry] = useState<string>('');
  const [countrySearch, setCountrySearch] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [goal, setGoal] = useState<'lose' | 'maintain' | 'gain'>('maintain');
  const [userName, setUserName] = useState('');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  
  // Physical activities state
  const [selectedActivities, setSelectedActivities] = useState<PhysicalActivity[]>([]);
  const [editingActivity, setEditingActivity] = useState<string | null>(null);
  const [activityDuration, setActivityDuration] = useState('30');
  const [activityDays, setActivityDays] = useState<number[]>([]);

  const filteredCountries = COUNTRIES.filter(c => 
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const selectedCountryData = COUNTRIES.find(c => c.code === country);

  const toggleActivitySelection = (activityId: string) => {
    const existing = selectedActivities.find(a => a.id === activityId);
    if (existing) {
      // Remove activity
      setSelectedActivities(selectedActivities.filter(a => a.id !== activityId));
    } else {
      // Start editing this activity
      setEditingActivity(activityId);
      setActivityDuration('30');
      setActivityDays([]);
    }
  };

  const confirmActivity = () => {
    if (!editingActivity || activityDays.length === 0) {
      Alert.alert(
        i18n.language === 'es' ? 'Selecciona días' : 'Select days',
        i18n.language === 'es' ? 'Elige al menos un día de la semana' : 'Choose at least one day of the week'
      );
      return;
    }

    const activityData = PHYSICAL_ACTIVITIES.find(a => a.id === editingActivity);
    if (!activityData) return;

    const newActivity: PhysicalActivity = {
      id: editingActivity,
      type: activityData.type,
      icon: activityData.icon,
      durationMinutes: parseInt(activityDuration) || 30,
      daysPerWeek: activityDays,
    };

    setSelectedActivities([...selectedActivities, newActivity]);
    setEditingActivity(null);
    setActivityDuration('30');
    setActivityDays([]);
  };

  const cancelActivityEdit = () => {
    setEditingActivity(null);
    setActivityDuration('30');
    setActivityDays([]);
  };

  const toggleDay = (dayId: number) => {
    if (activityDays.includes(dayId)) {
      setActivityDays(activityDays.filter(d => d !== dayId));
    } else {
      setActivityDays([...activityDays, dayId]);
    }
  };

  const handleFinish = async () => {
    if (!userName.trim() || !age || !height || !weight) {
      Alert.alert(t('onboarding.missingInfo'), t('onboarding.fillAllFields'));
      return;
    }

    try {
      // Save country and region for snack recommendations
      const countryData = COUNTRIES.find(c => c.code === country);
      await AsyncStorage.setItem('user_country', country || 'OTHER');
      await AsyncStorage.setItem('user_region', countryData?.region || 'other');
      await AsyncStorage.setItem('user_gender', gender);
      await AsyncStorage.setItem('user_name', userName.trim());

      // Save to backend
      await fetch(`${API_URL}/api/users/${userId}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          name: userName.trim(),
          age: parseInt(age),
          height: parseFloat(height),
          weight: parseFloat(weight),
          activityLevel: selectedActivities.length > 3 ? 'very_active' : 
                        selectedActivities.length > 1 ? 'active' : 
                        selectedActivities.length > 0 ? 'moderate' : 'sedentary',
          goal,
          gender,
          country: country || 'OTHER',
          region: countryData?.region || 'other',
        }),
      });

      // Save nutrition profile locally with full calculations
      await saveUserNutritionProfile({
        name: userName.trim(),
        age: parseInt(age),
        height: parseFloat(height),
        weight: parseFloat(weight),
        gender,
        goal,
        country: country || 'OTHER',
        region: countryData?.region || 'other',
        activities: selectedActivities,
      });

      await completeOnboarding();
      router.replace('/(tabs)/home');
    } catch (error) {
      console.error('Failed to save goals:', error);
      Alert.alert(t('common.error'), 'Failed to save your information. Please try again.');
    }
  };

  // Step 1: Welcome
  if (step === 1) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Ionicons name="restaurant" size={80} color="#FF6B6B" />
          <Text style={styles.title}>{t('onboarding.welcome')}</Text>
          <Text style={styles.subtitle}>{t('onboarding.subtitle')}</Text>

          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Ionicons name="camera" size={24} color="#FF6B6B" />
              <Text style={styles.featureText}>{t('onboarding.feature1')}</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="analytics" size={24} color="#FF6B6B" />
              <Text style={styles.featureText}>{t('onboarding.feature2')}</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="trending-up" size={24} color="#FF6B6B" />
              <Text style={styles.featureText}>{t('onboarding.feature3')}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.button} onPress={() => setStep(2)}>
            <Text style={styles.buttonText}>{t('onboarding.getStarted')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Step 2: Country selection
  if (step === 2) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>{t('onboarding.whereAreYouFrom')}</Text>
          <Text style={styles.subtitle}>{t('onboarding.countryHelps')}</Text>

          <TextInput
            style={styles.searchInput}
            placeholder={t('onboarding.searchCountry')}
            placeholderTextColor="#555"
            value={countrySearch}
            onChangeText={setCountrySearch}
          />

          <FlatList
            data={filteredCountries}
            keyExtractor={(item) => item.code}
            style={styles.countryList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.countryItem,
                  country === item.code && styles.countryItemSelected,
                ]}
                onPress={() => setCountry(item.code)}
              >
                <Text style={styles.countryFlag}>{item.flag}</Text>
                <Text style={[
                  styles.countryName,
                  country === item.code && styles.countryNameSelected,
                ]}>
                  {item.name}
                </Text>
                {country === item.code && (
                  <Ionicons name="checkmark-circle" size={24} color="#FF6B6B" />
                )}
              </TouchableOpacity>
            )}
          />

          <TouchableOpacity 
            style={[styles.button, !country && styles.buttonDisabled]} 
            onPress={() => country && setStep(3)}
            disabled={!country}
          >
            <Text style={styles.buttonText}>{t('common.continue')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Step 3: Gender selection
  if (step === 3) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{t('onboarding.yourGender')}</Text>
          <Text style={styles.subtitle}>{t('onboarding.genderHelps')}</Text>

          <TouchableOpacity
            style={[styles.genderCard, gender === 'male' && styles.genderCardSelected]}
            onPress={() => setGender('male')}
          >
            <Ionicons
              name="male"
              size={48}
              color={gender === 'male' ? '#FF6B6B' : '#aaa'}
            />
            <Text style={[styles.genderTitle, gender === 'male' && styles.genderTitleSelected]}>
              {t('onboarding.male')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.genderCard, gender === 'female' && styles.genderCardSelected]}
            onPress={() => setGender('female')}
          >
            <Ionicons
              name="female"
              size={48}
              color={gender === 'female' ? '#FF6B6B' : '#aaa'}
            />
            <Text style={[styles.genderTitle, gender === 'female' && styles.genderTitleSelected]}>
              {t('onboarding.female')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={() => setStep(4)}>
            <Text style={styles.buttonText}>{t('common.continue')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Step 4: Goal selection
  if (step === 4) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{t('onboarding.goal')}</Text>
          <Text style={styles.subtitle}>{t('onboarding.goalSubtitle')}</Text>

          <TouchableOpacity
            style={[styles.goalCard, goal === 'lose' && styles.goalCardSelected]}
            onPress={() => setGoal('lose')}
          >
            <Ionicons
              name="trending-down"
              size={32}
              color={goal === 'lose' ? '#FF6B6B' : '#aaa'}
            />
            <Text style={[styles.goalTitle, goal === 'lose' && styles.goalTitleSelected]}>
              {t('onboarding.loseWeight')}
            </Text>
            <Text style={styles.goalDescription}>{t('onboarding.loseWeightDesc')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.goalCard, goal === 'maintain' && styles.goalCardSelected]}
            onPress={() => setGoal('maintain')}
          >
            <Ionicons
              name="remove"
              size={32}
              color={goal === 'maintain' ? '#FF6B6B' : '#aaa'}
            />
            <Text style={[styles.goalTitle, goal === 'maintain' && styles.goalTitleSelected]}>
              {t('onboarding.maintainWeight')}
            </Text>
            <Text style={styles.goalDescription}>{t('onboarding.maintainWeightDesc')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.goalCard, goal === 'gain' && styles.goalCardSelected]}
            onPress={() => setGoal('gain')}
          >
            <Ionicons
              name="trending-up"
              size={32}
              color={goal === 'gain' ? '#FF6B6B' : '#aaa'}
            />
            <Text style={[styles.goalTitle, goal === 'gain' && styles.goalTitleSelected]}>
              {t('onboarding.gainMuscle')}
            </Text>
            <Text style={styles.goalDescription}>{t('onboarding.gainMuscleDesc')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={() => setStep(5)}>
            <Text style={styles.buttonText}>{t('common.continue')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Step 5: Physical activities
  if (step === 5) {
    const activityTexts = {
      es: {
        title: '¿Qué actividad física realizas?',
        subtitle: 'Selecciona todas las que apliquen y configura cada una',
        skip: 'No hago ejercicio',
        duration: 'Duración por sesión',
        minutes: 'minutos',
        days: '¿Qué días?',
        add: 'Agregar actividad',
        cancel: 'Cancelar',
        selected: 'actividades seleccionadas',
      },
      en: {
        title: 'What physical activity do you do?',
        subtitle: 'Select all that apply and configure each one',
        skip: "I don't exercise",
        duration: 'Duration per session',
        minutes: 'minutes',
        days: 'Which days?',
        add: 'Add activity',
        cancel: 'Cancel',
        selected: 'activities selected',
      },
    };
    const texts = activityTexts[i18n.language as keyof typeof activityTexts] || activityTexts.en;

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{texts.title}</Text>
          <Text style={styles.subtitle}>{texts.subtitle}</Text>

          {selectedActivities.length > 0 && (
            <View style={styles.selectedActivitiesBadge}>
              <Ionicons name="fitness" size={18} color="#4CAF50" />
              <Text style={styles.selectedActivitiesText}>
                {selectedActivities.length} {texts.selected}
              </Text>
            </View>
          )}

          {/* Activity being edited */}
          {editingActivity && (
            <View style={styles.activityEditor}>
              <View style={styles.activityEditorHeader}>
                <Ionicons 
                  name={PHYSICAL_ACTIVITIES.find(a => a.id === editingActivity)?.icon as any || 'fitness'} 
                  size={24} 
                  color="#FF6B6B" 
                />
                <Text style={styles.activityEditorTitle}>
                  {getActivityLabel(editingActivity, i18n.language)}
                </Text>
              </View>

              <Text style={styles.editorLabel}>{texts.duration}</Text>
              <View style={styles.durationRow}>
                {['15', '30', '45', '60', '90'].map(dur => (
                  <TouchableOpacity
                    key={dur}
                    style={[
                      styles.durationButton,
                      activityDuration === dur && styles.durationButtonSelected,
                    ]}
                    onPress={() => setActivityDuration(dur)}
                  >
                    <Text style={[
                      styles.durationText,
                      activityDuration === dur && styles.durationTextSelected,
                    ]}>
                      {dur}'
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.editorLabel}>{texts.days}</Text>
              <View style={styles.daysRow}>
                {DAYS_OF_WEEK.map(day => (
                  <TouchableOpacity
                    key={day.id}
                    style={[
                      styles.dayButton,
                      activityDays.includes(day.id) && styles.dayButtonSelected,
                    ]}
                    onPress={() => toggleDay(day.id)}
                  >
                    <Text style={[
                      styles.dayText,
                      activityDays.includes(day.id) && styles.dayTextSelected,
                    ]}>
                      {day.short}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.editorButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={cancelActivityEdit}>
                  <Text style={styles.cancelButtonText}>{texts.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.addButton} onPress={confirmActivity}>
                  <Text style={styles.addButtonText}>{texts.add}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Activity list */}
          {!editingActivity && (
            <View style={styles.activitiesGrid}>
              {PHYSICAL_ACTIVITIES.map(activity => {
                const isSelected = selectedActivities.some(a => a.id === activity.id);
                const selectedActivity = selectedActivities.find(a => a.id === activity.id);
                
                return (
                  <TouchableOpacity
                    key={activity.id}
                    style={[
                      styles.activityCard,
                      isSelected && styles.activityCardSelected,
                    ]}
                    onPress={() => toggleActivitySelection(activity.id)}
                  >
                    <Ionicons
                      name={activity.icon as any}
                      size={28}
                      color={isSelected ? '#FF6B6B' : '#aaa'}
                    />
                    <Text style={[
                      styles.activityName,
                      isSelected && styles.activityNameSelected,
                    ]}>
                      {getActivityLabel(activity.id, i18n.language)}
                    </Text>
                    {isSelected && selectedActivity && (
                      <Text style={styles.activityDetails}>
                        {selectedActivity.durationMinutes}' × {selectedActivity.daysPerWeek.length}d
                      </Text>
                    )}
                    {isSelected && (
                      <View style={styles.checkBadge}>
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <TouchableOpacity style={styles.button} onPress={() => setStep(6)}>
            <Text style={styles.buttonText}>{t('common.continue')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={() => setStep(6)}>
            <Text style={styles.skipButtonText}>{texts.skip}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Step 6: Personal info (final step)
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('onboarding.aboutYou')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.aboutYouSubtitle')}</Text>

        {/* Selected country badge */}
        {selectedCountryData && (
          <View style={styles.selectedCountryBadge}>
            <Text style={styles.selectedCountryFlag}>{selectedCountryData.flag}</Text>
            <Text style={styles.selectedCountryName}>{selectedCountryData.name}</Text>
          </View>
        )}

        {/* Selected activities summary */}
        {selectedActivities.length > 0 && (
          <View style={styles.activitiesSummary}>
            <Ionicons name="fitness" size={18} color="#4CAF50" />
            <Text style={styles.activitiesSummaryText}>
              {selectedActivities.map(a => getActivityLabel(a.id, i18n.language)).join(', ')}
            </Text>
          </View>
        )}

        {/* Name field with warning */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>
            {i18n.language === 'es' ? 'Tu nombre' : 'Your name'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={i18n.language === 'es' ? 'Ej: Facundo' : 'E.g: John'}
            placeholderTextColor="#555"
            value={userName}
            onChangeText={setUserName}
            autoCapitalize="words"
          />
          <Text style={styles.nameWarning}>
            {i18n.language === 'es' 
              ? '⚠️ El nombre no se podrá cambiar después' 
              : '⚠️ Name cannot be changed later'}
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{t('onboarding.age')}</Text>
          <TextInput
            style={styles.input}
            placeholder="25"
            placeholderTextColor="#555"
            keyboardType="number-pad"
            value={age}
            onChangeText={setAge}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{t('onboarding.height')}</Text>
          <TextInput
            style={styles.input}
            placeholder="170"
            placeholderTextColor="#555"
            keyboardType="decimal-pad"
            value={height}
            onChangeText={setHeight}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{t('onboarding.weight')}</Text>
          <TextInput
            style={styles.input}
            placeholder="70"
            placeholderTextColor="#555"
            keyboardType="decimal-pad"
            value={weight}
            onChangeText={setWeight}
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleFinish}>
          <Text style={styles.buttonText}>{t('onboarding.finishSetup')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  content: {
    padding: 24,
    paddingTop: 60,
    flexGrow: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 24,
  },
  featuresList: {
    marginBottom: 40,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    gap: 16,
  },
  featureText: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  button: {
    backgroundColor: '#FF6B6B',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: '#555',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Country selection
  searchInput: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  countryList: {
    flex: 1,
    marginBottom: 10,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  countryItemSelected: {
    borderWidth: 2,
    borderColor: '#FF6B6B',
    backgroundColor: '#FF6B6B10',
  },
  countryFlag: {
    fontSize: 28,
  },
  countryName: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  countryNameSelected: {
    color: '#FF6B6B',
    fontWeight: 'bold',
  },
  // Gender selection
  genderCard: {
    backgroundColor: '#1a1a1a',
    padding: 32,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  genderCardSelected: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FF6B6B10',
  },
  genderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#aaa',
    marginTop: 12,
  },
  genderTitleSelected: {
    color: '#FF6B6B',
  },
  // Goal selection
  goalCard: {
    backgroundColor: '#1a1a1a',
    padding: 24,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  goalCardSelected: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FF6B6B10',
  },
  goalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#aaa',
    marginTop: 12,
    marginBottom: 4,
  },
  goalTitleSelected: {
    color: '#FF6B6B',
  },
  goalDescription: {
    fontSize: 14,
    color: '#666',
  },
  // Personal info
  selectedCountryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 12,
    gap: 8,
  },
  selectedCountryFlag: {
    fontSize: 24,
  },
  selectedCountryName: {
    color: '#fff',
    fontSize: 14,
  },
  activitiesSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF5020',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  activitiesSummaryText: {
    color: '#4CAF50',
    fontSize: 14,
    flex: 1,
    flexWrap: 'wrap',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    padding: 16,
    borderRadius: 12,
    fontSize: 18,
  },
  // Physical activities
  selectedActivitiesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF5020',
    padding: 10,
    borderRadius: 20,
    marginBottom: 16,
    gap: 8,
  },
  selectedActivitiesText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  activitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  activityCard: {
    width: '45%',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  activityCardSelected: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FF6B6B10',
  },
  activityName: {
    fontSize: 13,
    color: '#aaa',
    marginTop: 8,
    textAlign: 'center',
  },
  activityNameSelected: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  activityDetails: {
    fontSize: 11,
    color: '#4CAF50',
    marginTop: 4,
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Activity editor
  activityEditor: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  activityEditorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  activityEditorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  editorLabel: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 8,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  durationButton: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  durationButtonSelected: {
    backgroundColor: '#FF6B6B',
  },
  durationText: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600',
  },
  durationTextSelected: {
    color: '#fff',
  },
  daysRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 20,
  },
  dayButton: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  dayButtonSelected: {
    backgroundColor: '#4CAF50',
  },
  dayText: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: 'bold',
  },
  dayTextSelected: {
    color: '#fff',
  },
  editorButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#333',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#aaa',
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    padding: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#666',
    fontSize: 16,
  },
});
