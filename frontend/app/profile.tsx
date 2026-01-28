/**
 * Personal Profile Screen ("Mi Ficha Personal")
 * Premium feature - Shows user stats, weekly progress, and allows editing
 * Includes shareable weekly summary with chart as IMAGE
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Share,
  Dimensions,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { usePremium } from '../src/contexts/PremiumContext';
import { useTheme } from '../src/contexts/ThemeContext';
import { useUser } from '../src/contexts/UserContext';
import { useFocusEffect } from '@react-navigation/native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getUserNutritionProfile,
  saveUserNutritionProfile,
  getWeekSummary,
  getMonthSummary,
  PHYSICAL_ACTIVITIES,
  getActivityLabel,
  PhysicalActivity,
  UserNutritionProfile,
  getUserName,
} from '../src/services/nutritionCoach';

const { width } = Dimensions.get('window');

// Health conditions that affect diet
const HEALTH_CONDITIONS = [
  { id: 'none', es: 'Sin restricciones', en: 'No restrictions', icon: '✅' },
  { id: 'diabetes', es: 'Diabetes', en: 'Diabetes', icon: '💉' },
  { id: 'celiac', es: 'Celiaquía (sin gluten)', en: 'Celiac (gluten-free)', icon: '🌾' },
  { id: 'hypertension', es: 'Hipertensión', en: 'Hypertension', icon: '❤️' },
  { id: 'cholesterol', es: 'Colesterol alto', en: 'High cholesterol', icon: '🫀' },
  { id: 'lactose', es: 'Intolerancia a la lactosa', en: 'Lactose intolerance', icon: '🥛' },
  { id: 'vegetarian', es: 'Vegetariano', en: 'Vegetarian', icon: '🥬' },
  { id: 'vegan', es: 'Vegano', en: 'Vegan', icon: '🌱' },
  { id: 'keto', es: 'Dieta cetogénica', en: 'Keto diet', icon: '🥑' },
  { id: 'pregnant', es: 'Embarazo', en: 'Pregnancy', icon: '🤰' },
  { id: 'gastritis', es: 'Gastritis', en: 'Gastritis', icon: '🔥' },
  { id: 'ibs', es: 'Síndrome de intestino irritable', en: 'IBS', icon: '😣' },
];

// Common food allergies and intolerances
const FOOD_ALLERGIES = [
  { id: 'peanuts', es: 'Maní/Cacahuate', en: 'Peanuts', icon: '🥜' },
  { id: 'tree_nuts', es: 'Frutos secos', en: 'Tree nuts', icon: '🌰' },
  { id: 'milk', es: 'Leche', en: 'Milk', icon: '🥛' },
  { id: 'eggs', es: 'Huevos', en: 'Eggs', icon: '🥚' },
  { id: 'wheat', es: 'Trigo', en: 'Wheat', icon: '🌾' },
  { id: 'soy', es: 'Soja', en: 'Soy', icon: '🫘' },
  { id: 'fish', es: 'Pescado', en: 'Fish', icon: '🐟' },
  { id: 'shellfish', es: 'Mariscos', en: 'Shellfish', icon: '🦐' },
  { id: 'sesame', es: 'Sésamo', en: 'Sesame', icon: '🫘' },
  { id: 'banana', es: 'Banana/Plátano', en: 'Banana', icon: '🍌' },
  { id: 'strawberry', es: 'Fresa/Frutilla', en: 'Strawberry', icon: '🍓' },
  { id: 'avocado', es: 'Aguacate/Palta', en: 'Avocado', icon: '🥑' },
  { id: 'tomato', es: 'Tomate', en: 'Tomato', icon: '🍅' },
  { id: 'chocolate', es: 'Chocolate', en: 'Chocolate', icon: '🍫' },
];

// Simple Pie Chart Component
const PieChart = ({ 
  deficit, 
  balance, 
  surplus, 
  goal,
  textColor 
}: { 
  deficit: number; 
  balance: number; 
  surplus: number;
  goal: 'lose' | 'maintain' | 'gain';
  textColor: string;
}) => {
  const total = deficit + balance + surplus;
  if (total === 0) return null;

  const deficitPercent = (deficit / total) * 100;
  const balancePercent = (balance / total) * 100;
  const surplusPercent = (surplus / total) * 100;

  // Colors based on goal
  const getStatusColor = (status: 'deficit' | 'balance' | 'surplus'): string => {
    if (goal === 'lose') {
      if (status === 'deficit') return '#4CAF50'; // Green = good for losing weight
      if (status === 'balance') return '#FFC107'; // Yellow = neutral
      return '#F44336'; // Red = bad for losing weight
    } else if (goal === 'gain') {
      if (status === 'surplus') return '#4CAF50'; // Green = good for gaining
      if (status === 'balance') return '#FFC107'; // Yellow = neutral
      return '#F44336'; // Red = bad for gaining
    } else {
      // Maintain
      if (status === 'balance') return '#4CAF50'; // Green = good for maintaining
      return '#FFC107'; // Yellow for others
    }
  };

  return (
    <View style={styles.chartContainer}>
      <View style={styles.pieChart}>
        <View style={[styles.pieSegment, { 
          backgroundColor: getStatusColor('deficit'),
          width: `${Math.max(deficitPercent, 5)}%`,
        }]} />
        <View style={[styles.pieSegment, { 
          backgroundColor: getStatusColor('balance'),
          width: `${Math.max(balancePercent, 5)}%`,
        }]} />
        <View style={[styles.pieSegment, { 
          backgroundColor: getStatusColor('surplus'),
          width: `${Math.max(surplusPercent, 5)}%`,
        }]} />
      </View>
      
      <View style={styles.chartLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: getStatusColor('deficit') }]} />
          <Text style={[styles.legendText, { color: textColor }]}>Déficit ({deficit}d)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: getStatusColor('balance') }]} />
          <Text style={[styles.legendText, { color: textColor }]}>Equilibrio ({balance}d)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: getStatusColor('surplus') }]} />
          <Text style={[styles.legendText, { color: textColor }]}>Superávit ({surplus}d)</Text>
        </View>
      </View>
    </View>
  );
};

export default function PersonalProfileScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { isPremium } = usePremium();
  const { theme } = useTheme();
  const { userName } = useUser();
  const summaryScrollRef = useRef<ScrollView>(null);
  const shareImageRef = useRef<ViewShot>(null);

  const [profile, setProfile] = useState<UserNutritionProfile | null>(null);
  const [weekSummary, setWeekSummary] = useState<any>(null);
  const [monthSummary, setMonthSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showingMonthly, setShowingMonthly] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  
  // Editable fields
  const [editWeight, setEditWeight] = useState('');
  const [editHeight, setEditHeight] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editGoal, setEditGoal] = useState<'lose' | 'maintain' | 'gain'>('maintain');
  const [editActivities, setEditActivities] = useState<PhysicalActivity[]>([]);
  const [editHealthConditions, setEditHealthConditions] = useState<string[]>(['none']);
  const [editFoodAllergies, setEditFoodAllergies] = useState<string[]>([]);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [showActivityPicker, setShowActivityPicker] = useState(false);
  
  // Activity configuration state
  const [configuringActivity, setConfiguringActivity] = useState<string | null>(null);
  const [activityMinutes, setActivityMinutes] = useState(30);
  const [activityDays, setActivityDays] = useState<number[]>([1, 3, 5]);
  const [showExtendedMinutes, setShowExtendedMinutes] = useState(false);

  // Day labels
  const dayLabels = i18n.language === 'es' 
    ? ['L', 'M', 'X', 'J', 'V', 'S', 'D']
    : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  // Minute options
  const basicMinutes = [15, 30, 45, 60, 90, 120];
  const extendedMinutes = [150, 180, 210, 240, 270, 300, 330, 360, 390, 420, 450, 480, 510, 540, 570, 600];

  // Get personalized title
  const getPersonalizedTitle = () => {
    const displayName = userName || '';
    if (displayName) {
      return i18n.language === 'es' 
        ? `Ficha de ${displayName}` 
        : `${displayName}'s Profile`;
    }
    return i18n.language === 'es' ? 'Mi Ficha Personal' : 'My Personal Profile';
  };

  // Texts
  const texts = {
    es: {
      title: getPersonalizedTitle(),
      weekSummary: 'Resumen Semanal',
      monthSummary: 'Resumen Mensual',
      daysTracked: 'días registrados',
      avgCalories: 'Promedio diario',
      cal: 'cal',
      yourGoal: 'Tu objetivo',
      lose: 'Bajar de peso',
      maintain: 'Mantener peso',
      gain: 'Ganar masa',
      editProfile: 'Editar perfil',
      save: 'Guardar',
      cancel: 'Cancelar',
      share: 'Compartir',
      weight: 'Peso (kg)',
      height: 'Altura (cm)',
      age: 'Edad',
      activities: 'Actividades físicas',
      targetCalories: 'Calorías objetivo',
      tdee: 'Gasto diario',
      noData: 'Sin datos esta semana',
      noMonthData: 'Sin datos del mes anterior',
      startTracking: 'Empieza a registrar tus comidas',
      weeklyProgress: 'Tu progreso esta semana',
      monthlyProgress: 'Tu progreso del mes',
      onTrack: '¡Vas muy bien!',
      needsWork: 'Puedes mejorar',
      premiumRequired: 'Función Premium',
      premiumMessage: 'Accede a tu ficha personal con estadísticas detalladas',
      swipeHint: 'Desliza para ver mensual →',
      swipeBack: '← Desliza para ver semanal',
    },
    en: {
      title: getPersonalizedTitle(),
      weekSummary: 'Weekly Summary',
      monthSummary: 'Monthly Summary',
      daysTracked: 'days tracked',
      avgCalories: 'Daily average',
      cal: 'cal',
      yourGoal: 'Your goal',
      lose: 'Lose weight',
      maintain: 'Maintain weight',
      gain: 'Build muscle',
      editProfile: 'Edit profile',
      save: 'Save',
      cancel: 'Cancel',
      share: 'Share',
      weight: 'Weight (kg)',
      height: 'Height (cm)',
      age: 'Age',
      activities: 'Physical activities',
      targetCalories: 'Target calories',
      tdee: 'Daily expenditure',
      noData: 'No data this week',
      noMonthData: 'No data from last month',
      startTracking: 'Start tracking your meals',
      weeklyProgress: 'Your progress this week',
      monthlyProgress: 'Your monthly progress',
      onTrack: "You're doing great!",
      needsWork: 'Room for improvement',
      premiumRequired: 'Premium Feature',
      premiumMessage: 'Access your personal profile with detailed stats',
      swipeHint: 'Swipe for monthly →',
      swipeBack: '← Swipe for weekly',
    },
  };
  const t2 = texts[i18n.language as keyof typeof texts] || texts.en;

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [profileData, summaryData, monthData] = await Promise.all([
        getUserNutritionProfile(),
        getWeekSummary(),
        getMonthSummary(-1), // Previous month
      ]);
      
      setProfile(profileData);
      setWeekSummary(summaryData);
      setMonthSummary(monthData);
      
      if (profileData) {
        setEditWeight(profileData.weight.toString());
        setEditHeight(profileData.height.toString());
        setEditAge(profileData.age.toString());
        setEditGoal(profileData.goal);
        setEditActivities(profileData.activities || []);
        
        // Load health restrictions
        const healthConditionsStr = await AsyncStorage.getItem('user_health_conditions');
        const foodAllergiesStr = await AsyncStorage.getItem('user_food_allergies');
        setEditHealthConditions(healthConditionsStr ? JSON.parse(healthConditionsStr) : ['none']);
        setEditFoodAllergies(foodAllergiesStr ? JSON.parse(foodAllergiesStr) : []);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (isPremium) {
        loadData();
      } else {
        setIsLoading(false);
      }
    }, [isPremium])
  );

  const handleSave = async () => {
    if (!profile) return;

    try {
      const updatedProfile = await saveUserNutritionProfile({
        ...profile,
        weight: parseFloat(editWeight) || profile.weight,
        height: parseFloat(editHeight) || profile.height,
        age: parseInt(editAge) || profile.age,
        goal: editGoal,
        healthConditions: editHealthConditions,
        foodAllergies: editFoodAllergies,
      });
      
      // Save health restrictions to AsyncStorage
      await AsyncStorage.setItem('user_health_conditions', JSON.stringify(editHealthConditions));
      await AsyncStorage.setItem('user_food_allergies', JSON.stringify(editFoodAllergies));
      
      setProfile(updatedProfile);
      setIsEditing(false);
      
      Alert.alert(
        i18n.language === 'es' ? '¡Guardado!' : 'Saved!',
        i18n.language === 'es' 
          ? 'Tu perfil ha sido actualizado' 
          : 'Your profile has been updated'
      );
    } catch (error) {
      console.error('Failed to save profile:', error);
    }
  };

  const handleShare = async () => {
    const summary = showingMonthly ? monthSummary : weekSummary;
    if (!profile || !summary) return;

    // Show the share modal and capture image
    setShowShareModal(true);
    
    // Wait for modal to render
    setTimeout(async () => {
      await captureAndShare();
    }, 500);
  };

  const captureAndShare = async () => {
    try {
      setIsCapturing(true);
      
      if (shareImageRef.current) {
        const uri = await shareImageRef.current.capture?.();
        
        if (uri) {
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(uri, {
              mimeType: 'image/png',
              dialogTitle: 'SnapFood Progress',
            });
          } else {
            // Fallback to text sharing
            const summary = showingMonthly ? monthSummary : weekSummary;
            const goalText = editGoal === 'lose' ? t2.lose : editGoal === 'gain' ? t2.gain : t2.maintain;
            const message = i18n.language === 'es'
              ? `📊 Mi progreso en SnapFood\n\n🎯 Objetivo: ${goalText}\n📅 ${summary.daysTracked} días registrados\n🔥 Promedio: ${summary.averageCalories} cal/día\n\n#SnapFood #Nutrición`
              : `📊 My progress on SnapFood\n\n🎯 Goal: ${goalText}\n📅 ${summary.daysTracked} days tracked\n🔥 Average: ${summary.averageCalories} cal/day\n\n#SnapFood #Nutrition`;
            await Share.share({ message });
          }
        }
      }
    } catch (error) {
      console.error('Failed to share:', error);
      Alert.alert(
        i18n.language === 'es' ? 'Error' : 'Error',
        i18n.language === 'es' ? 'No se pudo compartir la imagen' : 'Could not share the image'
      );
    } finally {
      setIsCapturing(false);
      setShowShareModal(false);
    }
  };

  // Get colors based on goal for the pie chart
  const getStatusColor = (status: 'deficit' | 'balance' | 'surplus'): string => {
    const goal = profile?.goal || 'maintain';
    if (goal === 'lose') {
      if (status === 'deficit') return '#4CAF50';
      if (status === 'balance') return '#FFC107';
      return '#F44336';
    } else if (goal === 'gain') {
      if (status === 'surplus') return '#4CAF50';
      if (status === 'balance') return '#FFC107';
      return '#F44336';
    } else {
      if (status === 'balance') return '#4CAF50';
      return '#FFC107';
    }
  };

  // Premium gate
  if (!isPremium) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.surface }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{t2.title}</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={styles.premiumGate}>
          <Ionicons name="lock-closed" size={80} color="#FFD700" />
          <Text style={[styles.premiumTitle, { color: theme.text }]}>{t2.premiumRequired}</Text>
          <Text style={[styles.premiumText, { color: theme.textMuted }]}>{t2.premiumMessage}</Text>
          <TouchableOpacity 
            style={[styles.upgradeButton, { backgroundColor: theme.primary }]}
            onPress={() => router.push('/paywall')}
          >
            <Text style={styles.upgradeButtonText}>
              {i18n.language === 'es' ? 'Obtener Premium' : 'Get Premium'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t2.title}</Text>
        <TouchableOpacity onPress={handleShare}>
          <Ionicons name="share-social" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Summary Card with Horizontal Scroll for Weekly/Monthly */}
        <View style={[styles.summaryCard, { backgroundColor: theme.surface }]}>
          {/* Tabs for Weekly/Monthly */}
          <View style={styles.summaryTabs}>
            <TouchableOpacity
              style={[
                styles.summaryTab,
                !showingMonthly && { borderBottomColor: theme.primary, borderBottomWidth: 2 }
              ]}
              onPress={() => setShowingMonthly(false)}
            >
              <Text style={[
                styles.summaryTabText,
                { color: !showingMonthly ? theme.primary : theme.textMuted }
              ]}>
                {t2.weekSummary}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.summaryTab,
                showingMonthly && { borderBottomColor: theme.primary, borderBottomWidth: 2 }
              ]}
              onPress={() => setShowingMonthly(true)}
            >
              <Text style={[
                styles.summaryTabText,
                { color: showingMonthly ? theme.primary : theme.textMuted }
              ]}>
                {t2.monthSummary}
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Weekly Summary */}
          {!showingMonthly && (
            <>
              {weekSummary && weekSummary.daysTracked > 0 ? (
                <>
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: theme.text }]}>{weekSummary.daysTracked}</Text>
                      <Text style={[styles.statLabel, { color: theme.textMuted }]}>{t2.daysTracked}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: theme.text }]}>{weekSummary.averageCalories}</Text>
                      <Text style={[styles.statLabel, { color: theme.textMuted }]}>{t2.avgCalories}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: theme.text }]}>{profile?.targetCalories || '-'}</Text>
                      <Text style={[styles.statLabel, { color: theme.textMuted }]}>{t2.targetCalories}</Text>
                    </View>
                  </View>

                  <PieChart 
                    deficit={weekSummary.daysInDeficit}
                    balance={weekSummary.daysInBalance}
                    surplus={weekSummary.daysInSurplus}
                    goal={profile?.goal || 'maintain'}
                    textColor={theme.text}
                  />

                  <View style={[styles.progressMessage, { backgroundColor: theme.surfaceVariant }]}>
                    {((profile?.goal === 'lose' && weekSummary.daysInDeficit >= weekSummary.daysTracked / 2) ||
                      (profile?.goal === 'gain' && weekSummary.daysInSurplus >= weekSummary.daysTracked / 2) ||
                      (profile?.goal === 'maintain' && weekSummary.daysInBalance >= weekSummary.daysTracked / 2)) ? (
                      <>
                        <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                        <Text style={[styles.progressTextGood, { color: theme.text }]}>{t2.onTrack}</Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="fitness" size={24} color="#FFC107" />
                        <Text style={[styles.progressTextNeutral, { color: theme.text }]}>{t2.needsWork}</Text>
                      </>
                    )}
                  </View>
                </>
              ) : (
                <View style={styles.noDataContainer}>
                  <Ionicons name="calendar-outline" size={50} color={theme.textMuted} />
                  <Text style={[styles.noDataText, { color: theme.textMuted }]}>{t2.noData}</Text>
                  <Text style={[styles.noDataSubtext, { color: theme.textMuted }]}>{t2.startTracking}</Text>
                </View>
              )}
            </>
          )}

          {/* Monthly Summary */}
          {showingMonthly && (
            <>
              {monthSummary && monthSummary.daysTracked > 0 ? (
                <>
                  <Text style={[styles.monthLabel, { color: theme.primary }]}>
                    {monthSummary.monthName} {monthSummary.monthYear}
                  </Text>
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: theme.text }]}>{monthSummary.daysTracked}</Text>
                      <Text style={[styles.statLabel, { color: theme.textMuted }]}>{t2.daysTracked}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: theme.text }]}>{monthSummary.averageCalories}</Text>
                      <Text style={[styles.statLabel, { color: theme.textMuted }]}>{t2.avgCalories}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: theme.text }]}>{monthSummary.totalCalories}</Text>
                      <Text style={[styles.statLabel, { color: theme.textMuted }]}>Total cal</Text>
                    </View>
                  </View>

                  <PieChart 
                    deficit={monthSummary.daysInDeficit}
                    balance={monthSummary.daysInBalance}
                    surplus={monthSummary.daysInSurplus}
                    goal={profile?.goal || 'maintain'}
                    textColor={theme.text}
                  />

                  <View style={[styles.progressMessage, { backgroundColor: theme.surfaceVariant }]}>
                    {((profile?.goal === 'lose' && monthSummary.daysInDeficit >= monthSummary.daysTracked / 2) ||
                      (profile?.goal === 'gain' && monthSummary.daysInSurplus >= monthSummary.daysTracked / 2) ||
                      (profile?.goal === 'maintain' && monthSummary.daysInBalance >= monthSummary.daysTracked / 2)) ? (
                      <>
                        <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                        <Text style={[styles.progressTextGood, { color: theme.text }]}>{t2.onTrack}</Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="fitness" size={24} color="#FFC107" />
                        <Text style={[styles.progressTextNeutral, { color: theme.text }]}>{t2.needsWork}</Text>
                      </>
                    )}
                  </View>
                </>
              ) : (
                <View style={styles.noDataContainer}>
                  <Ionicons name="calendar-outline" size={50} color={theme.textMuted} />
                  <Text style={[styles.noDataText, { color: theme.textMuted }]}>{t2.noMonthData}</Text>
                  <Text style={[styles.noDataSubtext, { color: theme.textMuted }]}>{t2.startTracking}</Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Profile Data Card */}
        <View style={[styles.profileCard, { backgroundColor: theme.surface }]}>
          <View style={styles.profileHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {isEditing ? t2.editProfile : (i18n.language === 'es' ? 'Mis Datos' : 'My Data')}
            </Text>
            {!isEditing && (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Ionicons name="pencil" size={20} color={theme.primary} />
              </TouchableOpacity>
            )}
          </View>

          {isEditing ? (
            <>
              <View style={styles.inputRow}>
                <Text style={[styles.inputLabel, { color: theme.textMuted }]}>{t2.weight}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surfaceVariant, color: theme.text }]}
                  value={editWeight}
                  onChangeText={setEditWeight}
                  keyboardType="decimal-pad"
                  placeholder="70"
                  placeholderTextColor="#555"
                />
              </View>

              <View style={styles.inputRow}>
                <Text style={[styles.inputLabel, { color: theme.textMuted }]}>{t2.height}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surfaceVariant, color: theme.text }]}
                  value={editHeight}
                  onChangeText={setEditHeight}
                  keyboardType="decimal-pad"
                  placeholder="170"
                  placeholderTextColor={theme.textMuted}
                />
              </View>

              <View style={styles.inputRow}>
                <Text style={[styles.inputLabel, { color: theme.textMuted }]}>{t2.age}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surfaceVariant, color: theme.text }]}
                  value={editAge}
                  onChangeText={setEditAge}
                  keyboardType="number-pad"
                  placeholder="25"
                  placeholderTextColor={theme.textMuted}
                />
              </View>

              <Text style={[styles.inputLabel, { color: theme.textMuted }]}>{t2.yourGoal}</Text>
              <View style={styles.goalButtons}>
                {(['lose', 'maintain', 'gain'] as const).map(g => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.goalButton, 
                      { backgroundColor: theme.surfaceVariant },
                      editGoal === g && { backgroundColor: theme.primary }
                    ]}
                    onPress={() => setEditGoal(g)}
                  >
                    <Ionicons 
                      name={g === 'lose' ? 'trending-down' : g === 'gain' ? 'trending-up' : 'remove'} 
                      size={18} 
                      color={editGoal === g ? '#fff' : theme.textMuted} 
                    />
                    <Text style={[
                      styles.goalButtonText, 
                      { color: theme.textMuted },
                      editGoal === g && { color: '#fff' }
                    ]}>
                      {g === 'lose' ? t2.lose : g === 'gain' ? t2.gain : t2.maintain}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.editButtons}>
                <TouchableOpacity 
                  style={[styles.cancelButton, { backgroundColor: theme.surfaceVariant }]} 
                  onPress={() => setIsEditing(false)}
                >
                  <Text style={[styles.cancelButtonText, { color: theme.textMuted }]}>{t2.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.saveButton, { backgroundColor: theme.primary }]} 
                  onPress={handleSave}
                >
                  <Text style={styles.saveButtonText}>{t2.save}</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={[styles.dataRow, { borderBottomColor: theme.divider }]}>
                <Text style={[styles.dataLabel, { color: theme.textMuted }]}>{t2.weight}</Text>
                <Text style={[styles.dataValue, { color: theme.text }]}>{profile?.weight || '-'} kg</Text>
              </View>
              <View style={[styles.dataRow, { borderBottomColor: theme.divider }]}>
                <Text style={[styles.dataLabel, { color: theme.textMuted }]}>{t2.height}</Text>
                <Text style={[styles.dataValue, { color: theme.text }]}>{profile?.height || '-'} cm</Text>
              </View>
              <View style={[styles.dataRow, { borderBottomColor: theme.divider }]}>
                <Text style={[styles.dataLabel, { color: theme.textMuted }]}>{t2.age}</Text>
                <Text style={[styles.dataValue, { color: theme.text }]}>{profile?.age || '-'}</Text>
              </View>
              <View style={[styles.dataRow, { borderBottomColor: theme.divider }]}>
                <Text style={[styles.dataLabel, { color: theme.textMuted }]}>{t2.yourGoal}</Text>
                <Text style={[styles.dataValueHighlight, { color: theme.primary }]}>
                  {profile?.goal === 'lose' ? t2.lose : profile?.goal === 'gain' ? t2.gain : t2.maintain}
                </Text>
              </View>
              <View style={[styles.dataRow, { borderBottomColor: theme.divider }]}>
                <Text style={[styles.dataLabel, { color: theme.textMuted }]}>{t2.tdee}</Text>
                <Text style={[styles.dataValue, { color: theme.text }]}>{profile?.tdee || '-'} {t2.cal}</Text>
              </View>
              <View style={[styles.dataRow, { borderBottomColor: theme.divider }]}>
                <Text style={[styles.dataLabel, { color: theme.textMuted }]}>{t2.targetCalories}</Text>
                <Text style={[styles.dataValueHighlight, { color: theme.primary }]}>{profile?.targetCalories || '-'} {t2.cal}</Text>
              </View>
            </>
          )}
        </View>

        {/* Activities Card */}
        {profile && (
          <View style={[styles.activitiesCard, { backgroundColor: theme.surface }]}>
            <View style={styles.activitiesHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{t2.activities}</Text>
              <TouchableOpacity 
                style={[styles.editActivitiesButton, { borderColor: theme.primary }]}
                onPress={() => setShowActivityPicker(true)}
              >
                <Ionicons name="pencil" size={16} color={theme.primary} />
                <Text style={[styles.editActivitiesText, { color: theme.primary }]}>
                  {i18n.language === 'es' ? 'Editar' : 'Edit'}
                </Text>
              </TouchableOpacity>
            </View>
            {profile.activities && profile.activities.length > 0 ? (
              profile.activities.map(activity => (
                <View key={activity.id} style={styles.activityItem}>
                  <Ionicons name={activity.icon as any} size={20} color={theme.primary} />
                  <Text style={[styles.activityName, { color: theme.text }]}>
                    {getActivityLabel(activity.id, i18n.language)}
                  </Text>
                  <Text style={[styles.activityDetails, { color: theme.textMuted }]}>
                    {activity.durationMinutes}' × {activity.daysPerWeek.length}d
                  </Text>
                </View>
              ))
            ) : (
              <Text style={[styles.noActivitiesText, { color: theme.textMuted }]}>
                {i18n.language === 'es' 
                  ? 'No hay actividades. Toca "Editar" para agregar.'
                  : 'No activities. Tap "Edit" to add.'}
              </Text>
            )}
          </View>
        )}

        {/* Health & Restrictions Card */}
        {profile && (
          <View style={[styles.activitiesCard, { backgroundColor: theme.surface }]}>
            <View style={styles.activitiesHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {i18n.language === 'es' ? '🏥 Salud y Restricciones' : '🏥 Health & Restrictions'}
              </Text>
              <TouchableOpacity 
                style={[styles.editActivitiesButton, { borderColor: theme.primary }]}
                onPress={() => setShowHealthModal(true)}
              >
                <Ionicons name="pencil" size={16} color={theme.primary} />
                <Text style={[styles.editActivitiesText, { color: theme.primary }]}>
                  {i18n.language === 'es' ? 'Editar' : 'Edit'}
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Health Conditions Display */}
            <Text style={[styles.healthSubtitle, { color: theme.textMuted }]}>
              {i18n.language === 'es' ? 'Condiciones:' : 'Conditions:'}
            </Text>
            <View style={styles.healthChipsContainer}>
              {editHealthConditions.map(conditionId => {
                const condition = HEALTH_CONDITIONS.find(c => c.id === conditionId);
                if (!condition) return null;
                return (
                  <View key={conditionId} style={[styles.healthChip, { backgroundColor: theme.primary + '20' }]}>
                    <Text style={styles.healthChipText}>
                      {condition.icon} {i18n.language === 'es' ? condition.es : condition.en}
                    </Text>
                  </View>
                );
              })}
            </View>
            
            {/* Food Allergies Display */}
            {editFoodAllergies.length > 0 && (
              <>
                <Text style={[styles.healthSubtitle, { color: theme.textMuted, marginTop: 12 }]}>
                  {i18n.language === 'es' ? 'Alergias/Intolerancias:' : 'Allergies/Intolerances:'}
                </Text>
                <View style={styles.healthChipsContainer}>
                  {editFoodAllergies.map(allergyId => {
                    const allergy = FOOD_ALLERGIES.find(a => a.id === allergyId);
                    if (!allergy) return null;
                    return (
                      <View key={allergyId} style={[styles.healthChip, styles.allergyChipColor]}>
                        <Text style={styles.healthChipText}>
                          {allergy.icon} {i18n.language === 'es' ? allergy.es : allergy.en}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        )}

        {/* Activity Picker Modal */}
        <Modal
          visible={showActivityPicker}
          animationType="slide"
          transparent={true}
          onRequestClose={() => {
            setShowActivityPicker(false);
            setConfiguringActivity(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.activityModal, { backgroundColor: theme.surface }]}>
              <View style={styles.activityModalHeader}>
                <Text style={[styles.activityModalTitle, { color: theme.text }]}>
                  {i18n.language === 'es' ? 'Selecciona Actividades' : 'Select Activities'}
                </Text>
                <TouchableOpacity onPress={() => {
                  setShowActivityPicker(false);
                  setConfiguringActivity(null);
                }}>
                  <Ionicons name="close" size={28} color={theme.text} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.activityList}>
                {PHYSICAL_ACTIVITIES.map(activity => {
                  const existingActivity = editActivities.find(a => a.id === activity.id);
                  const isSelected = !!existingActivity;
                  const isConfiguring = configuringActivity === activity.id;
                  
                  return (
                    <View key={activity.id}>
                      <TouchableOpacity
                        style={[
                          styles.activityPickerItem,
                          { borderColor: theme.border },
                          isSelected && { backgroundColor: theme.primary + '20', borderColor: theme.primary }
                        ]}
                        onPress={() => {
                          if (isSelected) {
                            // Deselect
                            setEditActivities(editActivities.filter(a => a.id !== activity.id));
                            if (isConfiguring) setConfiguringActivity(null);
                          } else {
                            // Select and open config
                            setActivityMinutes(30);
                            setActivityDays([1, 3, 5]);
                            setConfiguringActivity(activity.id);
                          }
                        }}
                      >
                        <Ionicons name={activity.icon as any} size={24} color={isSelected ? theme.primary : theme.textMuted} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.activityPickerName, { color: theme.text }]}>
                            {getActivityLabel(activity.id, i18n.language)}
                          </Text>
                          {isSelected && existingActivity && (
                            <Text style={[styles.activityConfigText, { color: theme.textMuted }]}>
                              {existingActivity.durationMinutes}' × {existingActivity.daysPerWeek.length}d
                            </Text>
                          )}
                        </View>
                        {isSelected ? (
                          <TouchableOpacity 
                            onPress={() => setConfiguringActivity(isConfiguring ? null : activity.id)}
                            style={styles.editActivityButton}
                          >
                            <Ionicons name={isConfiguring ? "chevron-up" : "settings-outline"} size={20} color={theme.primary} />
                          </TouchableOpacity>
                        ) : null}
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
                        )}
                      </TouchableOpacity>
                      
                      {/* Configuration Panel */}
                      {(isConfiguring || (isSelected && configuringActivity === activity.id)) && (
                        <View style={[styles.activityConfigPanel, { backgroundColor: theme.surfaceVariant }]}>
                          {/* Minutes */}
                          <Text style={[styles.configLabel, { color: theme.text }]}>
                            {i18n.language === 'es' ? 'Minutos por sesión:' : 'Minutes per session:'}
                          </Text>
                          <View style={styles.minutesRow}>
                            {basicMinutes.map(mins => {
                              const currentMins = isSelected ? existingActivity?.durationMinutes : activityMinutes;
                              return (
                                <TouchableOpacity
                                  key={mins}
                                  style={[
                                    styles.minuteChip,
                                    { backgroundColor: theme.surface },
                                    currentMins === mins && { backgroundColor: theme.primary }
                                  ]}
                                  onPress={() => {
                                    if (isSelected && existingActivity) {
                                      setEditActivities(editActivities.map(a => 
                                        a.id === activity.id ? { ...a, durationMinutes: mins } : a
                                      ));
                                    } else {
                                      setActivityMinutes(mins);
                                    }
                                  }}
                                >
                                  <Text style={[
                                    styles.minuteChipText,
                                    { color: theme.textMuted },
                                    currentMins === mins && { color: '#fff' }
                                  ]}>
                                    {mins}'
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                            {/* More options button */}
                            <TouchableOpacity
                              style={[
                                styles.minuteChip,
                                { backgroundColor: theme.surface },
                                extendedMinutes.includes(isSelected ? existingActivity?.durationMinutes || 0 : activityMinutes) && { backgroundColor: theme.primary }
                              ]}
                              onPress={() => setShowExtendedMinutes(!showExtendedMinutes)}
                            >
                              <Text style={[
                                styles.minuteChipText,
                                { color: theme.textMuted },
                                extendedMinutes.includes(isSelected ? existingActivity?.durationMinutes || 0 : activityMinutes) && { color: '#fff' }
                              ]}>
                                ...
                              </Text>
                            </TouchableOpacity>
                          </View>
                          
                          {/* Extended minutes (150-600) */}
                          {showExtendedMinutes && (
                            <View style={[styles.extendedMinutesContainer, { backgroundColor: theme.surface }]}>
                              <Text style={[styles.extendedMinutesTitle, { color: theme.textMuted }]}>
                                {i18n.language === 'es' ? 'Más opciones (hasta 10 horas):' : 'More options (up to 10 hours):'}
                              </Text>
                              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View style={styles.extendedMinutesRow}>
                                  {extendedMinutes.map(mins => {
                                    const currentMins = isSelected ? existingActivity?.durationMinutes : activityMinutes;
                                    const hours = Math.floor(mins / 60);
                                    const remainingMins = mins % 60;
                                    const label = remainingMins > 0 ? `${hours}h${remainingMins}'` : `${hours}h`;
                                    return (
                                      <TouchableOpacity
                                        key={mins}
                                        style={[
                                          styles.extendedMinuteChip,
                                          { backgroundColor: theme.surfaceVariant },
                                          currentMins === mins && { backgroundColor: theme.primary }
                                        ]}
                                        onPress={() => {
                                          if (isSelected && existingActivity) {
                                            setEditActivities(editActivities.map(a => 
                                              a.id === activity.id ? { ...a, durationMinutes: mins } : a
                                            ));
                                          } else {
                                            setActivityMinutes(mins);
                                          }
                                          setShowExtendedMinutes(false);
                                        }}
                                      >
                                        <Text style={[
                                          styles.extendedMinuteChipText,
                                          { color: theme.textMuted },
                                          currentMins === mins && { color: '#fff' }
                                        ]}>
                                          {label}
                                        </Text>
                                      </TouchableOpacity>
                                    );
                                  })}
                                </View>
                              </ScrollView>
                            </View>
                          )}
                          
                          {/* Days */}
                          <Text style={[styles.configLabel, { color: theme.text, marginTop: 12 }]}>
                            {i18n.language === 'es' ? 'Días de la semana:' : 'Days of the week:'}
                          </Text>
                          <View style={styles.daysRow}>
                            {dayLabels.map((label, idx) => {
                              const dayNum = idx + 1;
                              const currentDays = isSelected ? existingActivity?.daysPerWeek || [] : activityDays;
                              const isActive = currentDays.includes(dayNum);
                              return (
                                <TouchableOpacity
                                  key={idx}
                                  style={[
                                    styles.dayChip,
                                    { backgroundColor: theme.surface },
                                    isActive && { backgroundColor: theme.primary }
                                  ]}
                                  onPress={() => {
                                    let newDays: number[];
                                    if (isActive) {
                                      newDays = currentDays.filter(d => d !== dayNum);
                                    } else {
                                      newDays = [...currentDays, dayNum].sort();
                                    }
                                    if (isSelected && existingActivity) {
                                      setEditActivities(editActivities.map(a => 
                                        a.id === activity.id ? { ...a, daysPerWeek: newDays } : a
                                      ));
                                    } else {
                                      setActivityDays(newDays);
                                    }
                                  }}
                                >
                                  <Text style={[
                                    styles.dayChipText,
                                    { color: theme.textMuted },
                                    isActive && { color: '#fff' }
                                  ]}>
                                    {label}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                          
                          {/* Add button (only for new activities) */}
                          {!isSelected && (
                            <TouchableOpacity
                              style={[styles.addActivityButton, { backgroundColor: theme.primary }]}
                              onPress={() => {
                                setEditActivities([...editActivities, {
                                  id: activity.id,
                                  type: activity.type,
                                  icon: activity.icon,
                                  durationMinutes: activityMinutes,
                                  daysPerWeek: activityDays,
                                }]);
                                setConfiguringActivity(null);
                              }}
                            >
                              <Ionicons name="add" size={20} color="#fff" />
                              <Text style={styles.addActivityButtonText}>
                                {i18n.language === 'es' ? 'Añadir' : 'Add'}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>

              <TouchableOpacity 
                style={[styles.saveActivitiesButton, { backgroundColor: theme.primary }]}
                onPress={async () => {
                  if (profile) {
                    const updatedProfile = { ...profile, activities: editActivities };
                    // saveUserNutritionProfile recalcula TDEE y targetCalories
                    const savedProfile = await saveUserNutritionProfile(updatedProfile);
                    setProfile(savedProfile); // Usar el perfil guardado con TDEE actualizado
                    setShowActivityPicker(false);
                    setConfiguringActivity(null);
                  }
                }}
              >
                <Text style={styles.saveActivitiesText}>
                  {i18n.language === 'es' ? 'Guardar' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Share Button */}
        <TouchableOpacity style={[styles.shareButton, { backgroundColor: theme.primary }]} onPress={handleShare}>
          <Ionicons name="share-social" size={24} color="#fff" />
          <Text style={styles.shareButtonText}>{t2.share}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Share Image Modal - Hidden, used for capture */}
      <Modal
        visible={showShareModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={shareStyles.modalOverlay}>
          <ViewShot 
            ref={shareImageRef}
            options={{ format: 'png', quality: 1 }}
            style={shareStyles.shareCard}
          >
            {/* Professional Share Card Design */}
            <View style={shareStyles.cardContainer}>
              {/* Header with gradient effect */}
              <View style={shareStyles.cardHeader}>
                <View style={shareStyles.logoContainer}>
                  <Ionicons name="nutrition" size={32} color="#fff" />
                  <Text style={shareStyles.logoText}>SnapFood</Text>
                </View>
                <Text style={shareStyles.periodText}>
                  {showingMonthly 
                    ? (i18n.language === 'es' ? 'Resumen Mensual' : 'Monthly Summary')
                    : (i18n.language === 'es' ? 'Resumen Semanal' : 'Weekly Summary')
                  }
                </Text>
              </View>

              {/* User name */}
              {userName && (
                <Text style={shareStyles.userName}>{userName}</Text>
              )}

              {/* Pie Chart Visual */}
              <View style={shareStyles.chartSection}>
                <View style={shareStyles.pieChartContainer}>
                  {(() => {
                    const summary = showingMonthly ? monthSummary : weekSummary;
                    if (!summary) return null;
                    const total = summary.daysInDeficit + summary.daysInBalance + summary.daysInSurplus;
                    if (total === 0) return null;
                    
                    const deficitPercent = (summary.daysInDeficit / total) * 100;
                    const balancePercent = (summary.daysInBalance / total) * 100;
                    const surplusPercent = (summary.daysInSurplus / total) * 100;
                    
                    return (
                      <>
                        <View style={shareStyles.pieChart}>
                          <View style={[shareStyles.pieSegment, { 
                            backgroundColor: getStatusColor('deficit'),
                            width: `${Math.max(deficitPercent, 5)}%`,
                          }]} />
                          <View style={[shareStyles.pieSegment, { 
                            backgroundColor: getStatusColor('balance'),
                            width: `${Math.max(balancePercent, 5)}%`,
                          }]} />
                          <View style={[shareStyles.pieSegment, { 
                            backgroundColor: getStatusColor('surplus'),
                            width: `${Math.max(surplusPercent, 5)}%`,
                          }]} />
                        </View>
                        
                        {/* Legend */}
                        <View style={shareStyles.legendContainer}>
                          <View style={shareStyles.legendItem}>
                            <View style={[shareStyles.legendDot, { backgroundColor: getStatusColor('deficit') }]} />
                            <Text style={shareStyles.legendText}>
                              {i18n.language === 'es' ? 'Déficit' : 'Deficit'} ({summary.daysInDeficit}d)
                            </Text>
                          </View>
                          <View style={shareStyles.legendItem}>
                            <View style={[shareStyles.legendDot, { backgroundColor: getStatusColor('balance') }]} />
                            <Text style={shareStyles.legendText}>
                              {i18n.language === 'es' ? 'Equilibrio' : 'Balance'} ({summary.daysInBalance}d)
                            </Text>
                          </View>
                          <View style={shareStyles.legendItem}>
                            <View style={[shareStyles.legendDot, { backgroundColor: getStatusColor('surplus') }]} />
                            <Text style={shareStyles.legendText}>
                              {i18n.language === 'es' ? 'Superávit' : 'Surplus'} ({summary.daysInSurplus}d)
                            </Text>
                          </View>
                        </View>
                      </>
                    );
                  })()}
                </View>
              </View>

              {/* Stats Grid */}
              <View style={shareStyles.statsGrid}>
                <View style={shareStyles.statBox}>
                  <Text style={shareStyles.statValue}>
                    {(showingMonthly ? monthSummary : weekSummary)?.daysTracked || 0}
                  </Text>
                  <Text style={shareStyles.statLabel}>
                    {i18n.language === 'es' ? 'Días' : 'Days'}
                  </Text>
                </View>
                <View style={shareStyles.statBox}>
                  <Text style={shareStyles.statValue}>
                    {(showingMonthly ? monthSummary : weekSummary)?.averageCalories || 0}
                  </Text>
                  <Text style={shareStyles.statLabel}>
                    {i18n.language === 'es' ? 'Cal/día' : 'Cal/day'}
                  </Text>
                </View>
                <View style={shareStyles.statBox}>
                  <Text style={shareStyles.statValue}>
                    {profile?.targetCalories || '-'}
                  </Text>
                  <Text style={shareStyles.statLabel}>
                    {i18n.language === 'es' ? 'Objetivo' : 'Target'}
                  </Text>
                </View>
              </View>

              {/* Goal Badge */}
              <View style={[shareStyles.goalBadge, { backgroundColor: theme.primary }]}>
                <Ionicons 
                  name={profile?.goal === 'lose' ? 'trending-down' : profile?.goal === 'gain' ? 'trending-up' : 'remove'} 
                  size={18} 
                  color="#fff" 
                />
                <Text style={shareStyles.goalText}>
                  {profile?.goal === 'lose' 
                    ? (i18n.language === 'es' ? 'Bajar de peso' : 'Lose weight')
                    : profile?.goal === 'gain'
                    ? (i18n.language === 'es' ? 'Ganar masa' : 'Build muscle')
                    : (i18n.language === 'es' ? 'Mantener' : 'Maintain')
                  }
                </Text>
              </View>

              {/* Progress Message */}
              {(() => {
                const summary = showingMonthly ? monthSummary : weekSummary;
                if (!summary) return null;
                const goal = profile?.goal || 'maintain';
                const isOnTrack = 
                  (goal === 'lose' && summary.daysInDeficit >= summary.daysTracked / 2) ||
                  (goal === 'gain' && summary.daysInSurplus >= summary.daysTracked / 2) ||
                  (goal === 'maintain' && summary.daysInBalance >= summary.daysTracked / 2);
                
                return (
                  <View style={[shareStyles.progressBadge, { backgroundColor: isOnTrack ? '#4CAF5020' : '#FFC10720' }]}>
                    <Ionicons 
                      name={isOnTrack ? 'checkmark-circle' : 'fitness'} 
                      size={20} 
                      color={isOnTrack ? '#4CAF50' : '#FFC107'} 
                    />
                    <Text style={[shareStyles.progressText, { color: isOnTrack ? '#4CAF50' : '#FFC107' }]}>
                      {isOnTrack 
                        ? (i18n.language === 'es' ? '¡En camino!' : 'On track!')
                        : (i18n.language === 'es' ? 'Sigo trabajando' : 'Keep going!')
                      }
                    </Text>
                  </View>
                );
              })()}

              {/* Footer */}
              <View style={shareStyles.footer}>
                <Text style={shareStyles.footerText}>snapfood.app</Text>
              </View>
            </View>
          </ViewShot>

          {/* Loading indicator */}
          {isCapturing && (
            <View style={shareStyles.loadingOverlay}>
              <Text style={shareStyles.loadingText}>
                {i18n.language === 'es' ? 'Generando imagen...' : 'Generating image...'}
              </Text>
            </View>
          )}
        </View>
      </Modal>

      {/* Health & Restrictions Modal */}
      <Modal
        visible={showHealthModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowHealthModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.activityModal, { backgroundColor: theme.surface }]}>
            <View style={styles.activityModalHeader}>
              <Text style={[styles.activityModalTitle, { color: theme.text }]}>
                {i18n.language === 'es' ? '🏥 Salud y Restricciones' : '🏥 Health & Restrictions'}
              </Text>
              <TouchableOpacity onPress={() => setShowHealthModal(false)}>
                <Ionicons name="close" size={28} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ maxHeight: 500 }}>
              {/* Health Conditions */}
              <Text style={[styles.healthModalSubtitle, { color: theme.text }]}>
                {i18n.language === 'es' ? 'Condiciones de salud' : 'Health conditions'}
              </Text>
              <View style={styles.healthOptionsGrid}>
                {HEALTH_CONDITIONS.map((condition) => {
                  const isSelected = editHealthConditions.includes(condition.id);
                  return (
                    <TouchableOpacity
                      key={condition.id}
                      style={[
                        styles.healthModalOption,
                        { borderColor: theme.border },
                        isSelected && { backgroundColor: theme.primary + '20', borderColor: theme.primary },
                      ]}
                      onPress={() => {
                        if (condition.id === 'none') {
                          setEditHealthConditions(['none']);
                        } else {
                          let updated = editHealthConditions.filter(c => c !== 'none');
                          if (updated.includes(condition.id)) {
                            updated = updated.filter(c => c !== condition.id);
                            if (updated.length === 0) updated = ['none'];
                          } else {
                            updated.push(condition.id);
                          }
                          setEditHealthConditions(updated);
                        }
                      }}
                    >
                      <Text style={styles.healthModalOptionIcon}>{condition.icon}</Text>
                      <Text style={[
                        styles.healthModalOptionText,
                        { color: isSelected ? theme.primary : theme.text }
                      ]} numberOfLines={2}>
                        {i18n.language === 'es' ? condition.es : condition.en}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Food Allergies */}
              <Text style={[styles.healthModalSubtitle, { color: theme.text, marginTop: 20 }]}>
                {i18n.language === 'es' ? 'Alergias / Intolerancias' : 'Allergies / Intolerances'}
              </Text>
              <View style={styles.healthOptionsGrid}>
                {FOOD_ALLERGIES.map((allergy) => {
                  const isSelected = editFoodAllergies.includes(allergy.id);
                  return (
                    <TouchableOpacity
                      key={allergy.id}
                      style={[
                        styles.healthModalOption,
                        { borderColor: theme.border },
                        isSelected && { backgroundColor: '#FFD70030', borderColor: '#FFD700' },
                      ]}
                      onPress={() => {
                        if (isSelected) {
                          setEditFoodAllergies(editFoodAllergies.filter(a => a !== allergy.id));
                        } else {
                          setEditFoodAllergies([...editFoodAllergies, allergy.id]);
                        }
                      }}
                    >
                      <Text style={styles.healthModalOptionIcon}>{allergy.icon}</Text>
                      <Text style={[
                        styles.healthModalOptionText,
                        { color: isSelected ? '#FFD700' : theme.text }
                      ]} numberOfLines={1}>
                        {i18n.language === 'es' ? allergy.es : allergy.en}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.healthModalSaveBtn, { backgroundColor: theme.primary }]}
              onPress={async () => {
                await AsyncStorage.setItem('user_health_conditions', JSON.stringify(editHealthConditions));
                await AsyncStorage.setItem('user_food_allergies', JSON.stringify(editFoodAllergies));
                setShowHealthModal(false);
                Alert.alert(
                  i18n.language === 'es' ? '¡Guardado!' : 'Saved!',
                  i18n.language === 'es' ? 'Tus restricciones se han actualizado' : 'Your restrictions have been updated'
                );
              }}
            >
              <Text style={styles.healthModalSaveBtnText}>
                {i18n.language === 'es' ? 'Guardar cambios' : 'Save changes'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#1a1a1a',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  // Premium Gate
  premiumGate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  premiumTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    marginTop: 20,
  },
  premiumText: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 30,
  },
  upgradeButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  upgradeButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Summary Card
  summaryCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  statLabel: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 4,
  },
  // Chart
  chartContainer: {
    marginVertical: 16,
  },
  pieChart: {
    flexDirection: 'row',
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  pieSegment: {
    height: '100%',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#aaa',
  },
  // Progress Message
  progressMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    padding: 12,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
  },
  progressTextGood: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  progressTextNeutral: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFC107',
  },
  // No Data
  noDataContainer: {
    alignItems: 'center',
    padding: 30,
  },
  noDataText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 12,
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 4,
  },
  // Profile Card
  profileCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  dataLabel: {
    fontSize: 14,
    color: '#aaa',
  },
  dataValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  dataValueHighlight: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: 'bold',
  },
  // Edit Form
  inputRow: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 16,
  },
  goalButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  goalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 12,
  },
  goalButtonSelected: {
    backgroundColor: '#FF6B6B',
  },
  goalButtonText: {
    fontSize: 12,
    color: '#aaa',
  },
  goalButtonTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  // Summary Tabs
  summaryTabs: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  summaryTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#33333350',
  },
  summaryTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#333',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#aaa',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Activities Card
  activitiesCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    gap: 12,
  },
  activityName: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
  },
  activityDetails: {
    fontSize: 12,
    color: '#4CAF50',
  },
  // Share Button
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FF6B6B',
    padding: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Activities Header
  activitiesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editActivitiesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  editActivitiesText: {
    fontSize: 13,
    fontWeight: '500',
  },
  noActivitiesText: {
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
  },
  // Activity Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  activityModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  activityModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  activityModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  activityList: {
    maxHeight: 400,
  },
  activityPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  activityPickerName: {
    flex: 1,
    fontSize: 15,
  },
  activityConfigText: {
    fontSize: 12,
    marginTop: 2,
  },
  editActivityButton: {
    padding: 8,
    marginRight: 8,
  },
  activityConfigPanel: {
    padding: 16,
    marginHorizontal: 0,
    marginBottom: 10,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginTop: -10,
  },
  configLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  minutesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  minuteChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 50,
    alignItems: 'center',
  },
  minuteChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  extendedMinutesContainer: {
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
  },
  extendedMinutesTitle: {
    fontSize: 12,
    marginBottom: 8,
  },
  extendedMinutesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  extendedMinuteChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 50,
    alignItems: 'center',
  },
  extendedMinuteChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  daysRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dayChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addActivityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  addActivityButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  saveActivitiesButton: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  saveActivitiesText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Health & Restrictions styles
  healthSubtitle: {
    fontSize: 13,
    marginBottom: 8,
  },
  healthChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  healthChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  allergyChipColor: {
    backgroundColor: '#FFD70030',
  },
  healthChipText: {
    fontSize: 13,
    color: '#fff',
  },
  healthModalSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  healthOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  healthModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
    minWidth: 100,
  },
  healthModalOptionIcon: {
    fontSize: 18,
  },
  healthModalOptionText: {
    fontSize: 13,
    flex: 1,
  },
  healthModalSaveBtn: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  healthModalSaveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

// Styles for the share image card
const shareStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareCard: {
    width: 350,
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    overflow: 'hidden',
  },
  cardContainer: {
    padding: 24,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  periodText: {
    fontSize: 14,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  chartSection: {
    marginBottom: 20,
  },
  pieChartContainer: {
    alignItems: 'center',
  },
  pieChart: {
    flexDirection: 'row',
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    width: '100%',
  },
  pieSegment: {
    height: '100%',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#aaa',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingVertical: 16,
    backgroundColor: '#252525',
    borderRadius: 16,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    marginBottom: 16,
  },
  goalText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  progressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    letterSpacing: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 12,
  },
});
