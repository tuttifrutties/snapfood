/**
 * Personal Profile Screen ("Mi Ficha Personal")
 * Premium feature - Shows user stats, weekly progress, and allows editing
 * Includes shareable weekly summary with chart
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { usePremium } from '../src/contexts/PremiumContext';
import { useTheme } from '../src/contexts/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import {
  getUserNutritionProfile,
  saveUserNutritionProfile,
  getWeekSummary,
  getMonthSummary,
  PHYSICAL_ACTIVITIES,
  getActivityLabel,
  PhysicalActivity,
  UserNutritionProfile,
} from '../src/services/nutritionCoach';

const { width } = Dimensions.get('window');

// Simple Pie Chart Component
const PieChart = ({ 
  deficit, 
  balance, 
  surplus, 
  goal 
}: { 
  deficit: number; 
  balance: number; 
  surplus: number;
  goal: 'lose' | 'maintain' | 'gain';
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
          <Text style={styles.legendText}>Déficit ({deficit}d)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: getStatusColor('balance') }]} />
          <Text style={styles.legendText}>Equilibrio ({balance}d)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: getStatusColor('surplus') }]} />
          <Text style={styles.legendText}>Superávit ({surplus}d)</Text>
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
  const summaryScrollRef = useRef<ScrollView>(null);

  const [profile, setProfile] = useState<UserNutritionProfile | null>(null);
  const [weekSummary, setWeekSummary] = useState<any>(null);
  const [monthSummary, setMonthSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showingMonthly, setShowingMonthly] = useState(false);
  
  // Editable fields
  const [editWeight, setEditWeight] = useState('');
  const [editHeight, setEditHeight] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editGoal, setEditGoal] = useState<'lose' | 'maintain' | 'gain'>('maintain');

  // Texts
  const texts = {
    es: {
      title: 'Mi Ficha Personal',
      weekSummary: 'Resumen Semanal',
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
      startTracking: 'Empieza a registrar tus comidas',
      weeklyProgress: 'Tu progreso esta semana',
      onTrack: '¡Vas muy bien!',
      needsWork: 'Puedes mejorar',
      premiumRequired: 'Función Premium',
      premiumMessage: 'Accede a tu ficha personal con estadísticas detalladas',
    },
    en: {
      title: 'My Personal Profile',
      weekSummary: 'Weekly Summary',
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
      startTracking: 'Start tracking your meals',
      weeklyProgress: 'Your progress this week',
      onTrack: "You're doing great!",
      needsWork: 'Room for improvement',
      premiumRequired: 'Premium Feature',
      premiumMessage: 'Access your personal profile with detailed stats',
    },
  };
  const t2 = texts[i18n.language as keyof typeof texts] || texts.en;

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [profileData, summaryData] = await Promise.all([
        getUserNutritionProfile(),
        getWeekSummary(),
      ]);
      
      setProfile(profileData);
      setWeekSummary(summaryData);
      
      if (profileData) {
        setEditWeight(profileData.weight.toString());
        setEditHeight(profileData.height.toString());
        setEditAge(profileData.age.toString());
        setEditGoal(profileData.goal);
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
      });
      
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
    if (!profile || !weekSummary) return;

    const goalText = editGoal === 'lose' ? t2.lose : editGoal === 'gain' ? t2.gain : t2.maintain;
    
    let progressText = '';
    if (editGoal === 'lose' && weekSummary.daysInDeficit > weekSummary.daysTracked / 2) {
      progressText = '🟢 ' + (i18n.language === 'es' ? '¡En camino a mi meta!' : 'On track to my goal!');
    } else if (editGoal === 'gain' && weekSummary.daysInSurplus > weekSummary.daysTracked / 2) {
      progressText = '🟢 ' + (i18n.language === 'es' ? '¡Construyendo músculo!' : 'Building muscle!');
    } else if (editGoal === 'maintain' && weekSummary.daysInBalance > weekSummary.daysTracked / 2) {
      progressText = '🟢 ' + (i18n.language === 'es' ? '¡Manteniendo el equilibrio!' : 'Keeping balance!');
    } else {
      progressText = '💪 ' + (i18n.language === 'es' ? '¡Sigo trabajando en ello!' : 'Still working on it!');
    }

    const message = i18n.language === 'es'
      ? `📊 Mi progreso semanal en SnapFood\n\n🎯 Objetivo: ${goalText}\n📅 ${weekSummary.daysTracked} días registrados\n🔥 Promedio: ${weekSummary.averageCalories} cal/día\n\n${progressText}\n\n#SnapFood #Nutrición #Salud`
      : `📊 My weekly progress on SnapFood\n\n🎯 Goal: ${goalText}\n📅 ${weekSummary.daysTracked} days tracked\n🔥 Average: ${weekSummary.averageCalories} cal/day\n\n${progressText}\n\n#SnapFood #Nutrition #Health`;

    try {
      await Share.share({
        message,
        title: 'SnapFood Progress',
      });
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  // Premium gate
  if (!isPremium) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t2.title}</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={styles.premiumGate}>
          <Ionicons name="lock-closed" size={80} color="#FFD700" />
          <Text style={styles.premiumTitle}>{t2.premiumRequired}</Text>
          <Text style={styles.premiumText}>{t2.premiumMessage}</Text>
          <TouchableOpacity 
            style={styles.upgradeButton}
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
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t2.title}</Text>
        <TouchableOpacity onPress={handleShare}>
          <Ionicons name="share-social" size={24} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Weekly Summary Card - Shareable */}
        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>{t2.weekSummary}</Text>
          
          {weekSummary && weekSummary.daysTracked > 0 ? (
            <>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{weekSummary.daysTracked}</Text>
                  <Text style={styles.statLabel}>{t2.daysTracked}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{weekSummary.averageCalories}</Text>
                  <Text style={styles.statLabel}>{t2.avgCalories}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{profile?.targetCalories || '-'}</Text>
                  <Text style={styles.statLabel}>{t2.targetCalories}</Text>
                </View>
              </View>

              {/* Pie Chart */}
              <PieChart 
                deficit={weekSummary.daysInDeficit}
                balance={weekSummary.daysInBalance}
                surplus={weekSummary.daysInSurplus}
                goal={profile?.goal || 'maintain'}
              />

              {/* Progress Message */}
              <View style={styles.progressMessage}>
                {((profile?.goal === 'lose' && weekSummary.daysInDeficit >= weekSummary.daysTracked / 2) ||
                  (profile?.goal === 'gain' && weekSummary.daysInSurplus >= weekSummary.daysTracked / 2) ||
                  (profile?.goal === 'maintain' && weekSummary.daysInBalance >= weekSummary.daysTracked / 2)) ? (
                  <>
                    <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                    <Text style={styles.progressTextGood}>{t2.onTrack}</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="trending-up" size={24} color="#FFC107" />
                    <Text style={styles.progressTextNeutral}>{t2.needsWork}</Text>
                  </>
                )}
              </View>
            </>
          ) : (
            <View style={styles.noDataContainer}>
              <Ionicons name="calendar-outline" size={48} color="#555" />
              <Text style={styles.noDataText}>{t2.noData}</Text>
              <Text style={styles.noDataSubtext}>{t2.startTracking}</Text>
            </View>
          )}
        </View>

        {/* Profile Data Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Text style={styles.sectionTitle}>
              {isEditing ? t2.editProfile : (i18n.language === 'es' ? 'Mis Datos' : 'My Data')}
            </Text>
            {!isEditing && (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Ionicons name="pencil" size={20} color="#FF6B6B" />
              </TouchableOpacity>
            )}
          </View>

          {isEditing ? (
            <>
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>{t2.weight}</Text>
                <TextInput
                  style={styles.input}
                  value={editWeight}
                  onChangeText={setEditWeight}
                  keyboardType="decimal-pad"
                  placeholder="70"
                  placeholderTextColor="#555"
                />
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>{t2.height}</Text>
                <TextInput
                  style={styles.input}
                  value={editHeight}
                  onChangeText={setEditHeight}
                  keyboardType="decimal-pad"
                  placeholder="170"
                  placeholderTextColor="#555"
                />
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>{t2.age}</Text>
                <TextInput
                  style={styles.input}
                  value={editAge}
                  onChangeText={setEditAge}
                  keyboardType="number-pad"
                  placeholder="25"
                  placeholderTextColor="#555"
                />
              </View>

              <Text style={styles.inputLabel}>{t2.yourGoal}</Text>
              <View style={styles.goalButtons}>
                {(['lose', 'maintain', 'gain'] as const).map(g => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.goalButton, editGoal === g && styles.goalButtonSelected]}
                    onPress={() => setEditGoal(g)}
                  >
                    <Ionicons 
                      name={g === 'lose' ? 'trending-down' : g === 'gain' ? 'trending-up' : 'remove'} 
                      size={18} 
                      color={editGoal === g ? '#fff' : '#aaa'} 
                    />
                    <Text style={[styles.goalButtonText, editGoal === g && styles.goalButtonTextSelected]}>
                      {g === 'lose' ? t2.lose : g === 'gain' ? t2.gain : t2.maintain}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.editButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setIsEditing(false)}>
                  <Text style={styles.cancelButtonText}>{t2.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                  <Text style={styles.saveButtonText}>{t2.save}</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>{t2.weight}</Text>
                <Text style={styles.dataValue}>{profile?.weight || '-'} kg</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>{t2.height}</Text>
                <Text style={styles.dataValue}>{profile?.height || '-'} cm</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>{t2.age}</Text>
                <Text style={styles.dataValue}>{profile?.age || '-'}</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>{t2.yourGoal}</Text>
                <Text style={styles.dataValueHighlight}>
                  {profile?.goal === 'lose' ? t2.lose : profile?.goal === 'gain' ? t2.gain : t2.maintain}
                </Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>{t2.tdee}</Text>
                <Text style={styles.dataValue}>{profile?.tdee || '-'} {t2.cal}</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>{t2.targetCalories}</Text>
                <Text style={styles.dataValueHighlight}>{profile?.targetCalories || '-'} {t2.cal}</Text>
              </View>
            </>
          )}
        </View>

        {/* Activities Card */}
        {profile && profile.activities && profile.activities.length > 0 && (
          <View style={styles.activitiesCard}>
            <Text style={styles.sectionTitle}>{t2.activities}</Text>
            {profile.activities.map(activity => (
              <View key={activity.id} style={styles.activityItem}>
                <Ionicons name={activity.icon as any} size={20} color="#FF6B6B" />
                <Text style={styles.activityName}>
                  {getActivityLabel(activity.id, i18n.language)}
                </Text>
                <Text style={styles.activityDetails}>
                  {activity.durationMinutes}' × {activity.daysPerWeek.length}d
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Share Button */}
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-social" size={24} color="#fff" />
          <Text style={styles.shareButtonText}>{t2.share}</Text>
        </TouchableOpacity>
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
});
