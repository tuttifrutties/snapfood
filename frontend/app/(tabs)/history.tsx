/**
 * History Screen - Collapsible Hierarchical View
 * Shows meals organized by: Today > Days of Month > Previous Months
 * Premium feature with folder-like structure
 * Supports editing portions and deleting entries
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../../src/contexts/UserContext';
import { usePremium } from '../../src/contexts/PremiumContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { format, isToday, isThisMonth, startOfMonth, isSameDay } from 'date-fns';
import { es, enUS, ptBR, it, fr, de } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Meal {
  id: string;
  dishName: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  photoBase64?: string;
  timestamp: string;
  portions?: number;
  isCooked?: boolean;
  isSearched?: boolean;
  icon?: string;
  recipeData?: any;
  baseCalories?: number;
  baseProtein?: number;
  baseCarbs?: number;
  baseFats?: number;
  // Fat tracking
  fatType?: string;
  fatTypeName?: string;
  fatTablespoons?: number;
  fatCalories?: number;
}

// Fat types with calories per tablespoon
const FAT_TYPES = [
  { id: 'none', es: 'Sin grasa', en: 'No fat', caloriesPerTbsp: 0, icon: '🚫' },
  { id: 'olive_oil', es: 'Aceite de oliva', en: 'Olive oil', caloriesPerTbsp: 119, icon: '🫒' },
  { id: 'sunflower_oil', es: 'Aceite de girasol', en: 'Sunflower oil', caloriesPerTbsp: 120, icon: '🌻' },
  { id: 'butter', es: 'Manteca/Mantequilla', en: 'Butter', caloriesPerTbsp: 102, icon: '🧈' },
  { id: 'lard', es: 'Grasa de cerdo', en: 'Lard', caloriesPerTbsp: 115, icon: '🥓' },
  { id: 'coconut_oil', es: 'Aceite de coco', en: 'Coconut oil', caloriesPerTbsp: 121, icon: '🥥' },
];

const TABLESPOON_OPTIONS = [0, 0.5, 1, 1.5, 2, 2.5, 3];

interface DayGroup {
  date: Date;
  dateKey: string;
  meals: Meal[];
  totalCalories: number;
}

interface MonthGroup {
  month: string;
  monthKey: string;
  days: DayGroup[];
  totalCalories: number;
}

const getDateLocale = (lang: string) => {
  const locales: { [key: string]: any } = { es, en: enUS, pt: ptBR, it, fr, de };
  return locales[lang] || enUS;
};

const PORTION_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3];

export default function HistoryScreen() {
  const { userId } = useUser();
  const { isPremium } = usePremium();
  const { theme } = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [dailyTotals, setDailyTotals] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [showPortionModal, setShowPortionModal] = useState(false);
  const [detailMeal, setDetailMeal] = useState<Meal | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Collapsible state
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set(['today']));
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  const dateLocale = getDateLocale(i18n.language);

  useFocusEffect(
    useCallback(() => {
      if (!isPremium) {
        setIsLoading(false);
        return;
      }
      loadHistory();
    }, [userId, isPremium])
  );

  const loadHistory = async () => {
    if (!userId) return;

    try {
      // Load from API
      const [mealsResponse, totalsResponse] = await Promise.all([
        fetch(`${API_URL}/api/meals/${userId}`),
        fetch(`${API_URL}/api/meals/${userId}/daily-totals`),
      ]);

      const mealsData = await mealsResponse.json();
      const totalsData = await totalsResponse.json();
      
      // Load locally cooked meals
      const localHistoryKey = `food_history_${userId}`;
      const localHistory = await AsyncStorage.getItem(localHistoryKey);
      const localMeals = localHistory ? JSON.parse(localHistory) : [];
      
      // Transform local meals to match the format
      const transformedLocalMeals = localMeals.map((m: any) => ({
        id: m.id,
        dishName: m.foodName,
        calories: Math.round((m.calories || 0) * (m.portions || 1)),
        protein: Math.round((m.protein || 0) * (m.portions || 1)),
        carbs: Math.round((m.carbs || 0) * (m.portions || 1)),
        fats: Math.round((m.fats || 0) * (m.portions || 1)),
        timestamp: m.timestamp,
        portions: m.portions || 1,
        isCooked: m.isCooked || false,
        baseCalories: m.calories,
        baseProtein: m.protein,
        baseCarbs: m.carbs,
        baseFats: m.fats,
      }));

      // Combine API meals and local meals
      const allMeals = [...(mealsData.meals || []), ...transformedLocalMeals]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setMeals(allMeals);
      setDailyTotals(totalsData);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateMealPortions = async (meal: Meal, newPortions: number) => {
    if (meal.isCooked) {
      // Update local storage for cooked meals
      try {
        const localHistoryKey = `food_history_${userId}`;
        const localHistory = await AsyncStorage.getItem(localHistoryKey);
        const localMeals = localHistory ? JSON.parse(localHistory) : [];
        
        const updatedMeals = localMeals.map((m: any) => {
          if (m.id === meal.id) {
            return { ...m, portions: newPortions };
          }
          return m;
        });
        
        await AsyncStorage.setItem(localHistoryKey, JSON.stringify(updatedMeals));
        loadHistory(); // Reload
      } catch (error) {
        console.error('Failed to update portions:', error);
      }
    }
    setShowPortionModal(false);
    setEditingMeal(null);
  };

  const deleteMeal = async (mealId: string, isCooked: boolean = false) => {
    Alert.alert(
      t('history.deleteTitle'),
      t('history.deleteMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('history.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              if (isCooked) {
                // Delete from local storage
                const localHistoryKey = `food_history_${userId}`;
                const localHistory = await AsyncStorage.getItem(localHistoryKey);
                const localMeals = localHistory ? JSON.parse(localHistory) : [];
                const updatedMeals = localMeals.filter((m: any) => m.id !== mealId);
                await AsyncStorage.setItem(localHistoryKey, JSON.stringify(updatedMeals));
              } else {
                // Delete from API
                await fetch(`${API_URL}/api/meals/${mealId}`, { method: 'DELETE' });
              }
              loadHistory(); // Reload
            } catch (error) {
              console.error('Failed to delete meal:', error);
              Alert.alert(t('common.error'), t('history.deleteFailed'));
            }
          },
        },
      ]
    );
  };

  const openMealDetail = (meal: Meal) => {
    setDetailMeal(meal);
    setShowDetailModal(true);
  };

  const cookAgain = async () => {
    if (!detailMeal || !userId) return;

    try {
      // Save as new entry in history
      const historyKey = `food_history_${userId}`;
      const existingHistory = await AsyncStorage.getItem(historyKey);
      const history = existingHistory ? JSON.parse(existingHistory) : [];

      const newEntry = {
        id: `cooked_again_${Date.now()}`,
        userId,
        timestamp: new Date().toISOString(),
        foodName: detailMeal.dishName,
        mealType: detailMeal.isCooked ? 'cooking' : 'food',
        portions: 1,
        calories: detailMeal.baseCalories || detailMeal.calories,
        protein: detailMeal.baseProtein || detailMeal.protein,
        carbs: detailMeal.baseCarbs || detailMeal.carbs,
        fats: detailMeal.baseFats || detailMeal.fats,
        isCooked: detailMeal.isCooked || false,
        isSearched: detailMeal.isSearched || false,
        icon: detailMeal.icon,
        baseCalories: detailMeal.baseCalories || detailMeal.calories,
        baseProtein: detailMeal.baseProtein || detailMeal.protein,
        baseCarbs: detailMeal.baseCarbs || detailMeal.carbs,
        baseFats: detailMeal.baseFats || detailMeal.fats,
      };

      history.unshift(newEntry);
      await AsyncStorage.setItem(historyKey, JSON.stringify(history));

      setShowDetailModal(false);
      setDetailMeal(null);
      
      Alert.alert(
        i18n.language === 'es' ? '¡Agregado!' : 'Added!',
        i18n.language === 'es' 
          ? 'Se agregó una nueva entrada al historial (1 porción)'
          : 'New entry added to history (1 serving)'
      );
      
      loadHistory(); // Reload
    } catch (error) {
      console.error('Failed to cook again:', error);
      Alert.alert(t('common.error'), 'Failed to add entry');
    }
  };

  // Group meals by day and month
  const groupMeals = (): { today: DayGroup | null; thisMonth: DayGroup[]; previousMonths: MonthGroup[] } => {
    if (!meals || meals.length === 0) {
      return { today: null, thisMonth: [], previousMonths: [] };
    }

    const todayMeals: Meal[] = [];
    const thisMonthDays: Map<string, Meal[]> = new Map();
    const previousMonthsMap: Map<string, Map<string, Meal[]>> = new Map();

    meals.forEach(meal => {
      const mealDate = new Date(meal.timestamp);
      const dateKey = format(mealDate, 'yyyy-MM-dd');
      const monthKey = format(mealDate, 'yyyy-MM');

      if (isToday(mealDate)) {
        todayMeals.push(meal);
      } else if (isThisMonth(mealDate)) {
        if (!thisMonthDays.has(dateKey)) {
          thisMonthDays.set(dateKey, []);
        }
        thisMonthDays.get(dateKey)!.push(meal);
      } else {
        if (!previousMonthsMap.has(monthKey)) {
          previousMonthsMap.set(monthKey, new Map());
        }
        const monthMap = previousMonthsMap.get(monthKey)!;
        if (!monthMap.has(dateKey)) {
          monthMap.set(dateKey, []);
        }
        monthMap.get(dateKey)!.push(meal);
      }
    });

    // Build today group
    const today: DayGroup | null = todayMeals.length > 0 ? {
      date: new Date(),
      dateKey: 'today',
      meals: todayMeals,
      totalCalories: todayMeals.reduce((sum, m) => sum + m.calories, 0),
    } : null;

    // Build this month days
    const thisMonth: DayGroup[] = Array.from(thisMonthDays.entries())
      .map(([dateKey, dayMeals]) => ({
        date: new Date(dateKey),
        dateKey,
        meals: dayMeals,
        totalCalories: dayMeals.reduce((sum, m) => sum + m.calories, 0),
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    // Build previous months
    const previousMonths: MonthGroup[] = Array.from(previousMonthsMap.entries())
      .map(([monthKey, daysMap]) => {
        const days: DayGroup[] = Array.from(daysMap.entries())
          .map(([dateKey, dayMeals]) => ({
            date: new Date(dateKey),
            dateKey,
            meals: dayMeals,
            totalCalories: dayMeals.reduce((sum, m) => sum + m.calories, 0),
          }))
          .sort((a, b) => b.date.getTime() - a.date.getTime());

        return {
          month: format(new Date(monthKey + '-01'), 'MMMM yyyy', { locale: dateLocale }),
          monthKey,
          days,
          totalCalories: days.reduce((sum, d) => sum + d.totalCalories, 0),
        };
      })
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey));

    return { today, thisMonth, previousMonths };
  };

  const toggleDay = (dateKey: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(dateKey)) {
      newExpanded.delete(dateKey);
    } else {
      newExpanded.add(dateKey);
    }
    setExpandedDays(newExpanded);
  };

  const toggleMonth = (monthKey: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(monthKey)) {
      newExpanded.delete(monthKey);
    } else {
      newExpanded.add(monthKey);
    }
    setExpandedMonths(newExpanded);
  };

  const renderMealCard = (meal: Meal) => (
    <TouchableOpacity 
      key={meal.id} 
      style={[styles.mealCard, { backgroundColor: theme.surface }]}
      onPress={() => openMealDetail(meal)}
      activeOpacity={0.7}
    >
      {meal.icon && !meal.photoBase64 && (
        <Text style={styles.mealIcon}>{meal.icon}</Text>
      )}
      {meal.photoBase64 && (
        <Image
          source={{ uri: `data:image/jpeg;base64,${meal.photoBase64}` }}
          style={styles.mealImage}
        />
      )}
      {meal.isCooked && (
        <View style={[styles.cookedBadge, { backgroundColor: theme.primary + '20' }]}>
          <Ionicons name="restaurant" size={14} color={theme.primary} />
          <Text style={[styles.cookedBadgeText, { color: theme.primary }]}>
            {i18n.language === 'es' ? 'Cocinado' : 'Cooked'}
          </Text>
        </View>
      )}
      {meal.isSearched && !meal.isCooked && (
        <View style={[styles.cookedBadge, { backgroundColor: '#4CAF5020' }]}>
          <Ionicons name="search" size={14} color="#4CAF50" />
          <Text style={[styles.cookedBadgeText, { color: '#4CAF50' }]}>
            {i18n.language === 'es' ? 'Buscado' : 'Searched'}
          </Text>
        </View>
      )}
      <View style={styles.mealInfo}>
        <Text style={[styles.mealName, { color: theme.text }]}>{meal.dishName}</Text>
        <Text style={[styles.mealTime, { color: theme.textMuted }]}>
          {format(new Date(meal.timestamp), 'h:mm a', { locale: dateLocale })}
        </Text>
        {meal.portions && (
          <View style={[styles.portionBadge, { backgroundColor: theme.surfaceVariant }]}>
            <Ionicons name="restaurant-outline" size={12} color={theme.textSecondary} />
            <Text style={[styles.portionText, { color: theme.textSecondary }]}>
              {meal.portions} {i18n.language === 'es' ? (meal.portions === 1 ? 'porción' : 'porciones') : (meal.portions === 1 ? 'serving' : 'servings')}
            </Text>
          </View>
        )}
        <View style={styles.mealMacros}>
          <Text style={[styles.mealMacroText, { color: theme.primary }]}>{meal.calories} cal</Text>
          <Text style={[styles.mealMacroText, { color: theme.primary }]}>P: {meal.protein}g</Text>
          <Text style={[styles.mealMacroText, { color: theme.primary }]}>C: {meal.carbs}g</Text>
          <Text style={[styles.mealMacroText, { color: theme.primary }]}>F: {meal.fats}g</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
    </TouchableOpacity>
  );

  const renderDayGroup = (day: DayGroup, isNested: boolean = false) => {
    const isExpanded = expandedDays.has(day.dateKey);
    const dayLabel = day.dateKey === 'today' 
      ? (i18n.language === 'es' ? 'Hoy' : 'Today')
      : format(day.date, 'EEEE d', { locale: dateLocale });

    return (
      <View key={day.dateKey} style={[styles.dayContainer, isNested && styles.nestedDay]}>
        <TouchableOpacity 
          style={[styles.dayHeader, { backgroundColor: theme.surfaceVariant }]}
          onPress={() => toggleDay(day.dateKey)}
        >
          <View style={styles.dayHeaderLeft}>
            <Ionicons 
              name={isExpanded ? 'folder-open' : 'folder'} 
              size={20} 
              color={day.dateKey === 'today' ? theme.primary : theme.textSecondary} 
            />
            <Text style={[
              styles.dayTitle, 
              { color: day.dateKey === 'today' ? theme.primary : theme.text }
            ]}>
              {dayLabel}
            </Text>
            <View style={[styles.mealCountBadge, { backgroundColor: theme.primary + '30' }]}>
              <Text style={[styles.mealCountText, { color: theme.primary }]}>
                {day.meals.length}
              </Text>
            </View>
          </View>
          <View style={styles.dayHeaderRight}>
            <Text style={[styles.dayCalories, { color: theme.textSecondary }]}>
              {day.totalCalories} cal
            </Text>
            <Ionicons 
              name={isExpanded ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color={theme.textMuted} 
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.dayContent}>
            {day.meals.map(renderMealCard)}
          </View>
        )}
      </View>
    );
  };

  const renderMonthGroup = (month: MonthGroup) => {
    const isExpanded = expandedMonths.has(month.monthKey);

    return (
      <View key={month.monthKey} style={styles.monthContainer}>
        <TouchableOpacity 
          style={[styles.monthHeader, { backgroundColor: theme.surface }]}
          onPress={() => toggleMonth(month.monthKey)}
        >
          <View style={styles.monthHeaderLeft}>
            <Ionicons 
              name={isExpanded ? 'folder-open' : 'folder'} 
              size={24} 
              color={theme.warning} 
            />
            <Text style={[styles.monthTitle, { color: theme.text }]}>
              {month.month}
            </Text>
            <View style={[styles.dayCountBadge, { backgroundColor: theme.warning + '30' }]}>
              <Text style={[styles.dayCountText, { color: theme.warning }]}>
                {month.days.length} {i18n.language === 'es' ? 'días' : 'days'}
              </Text>
            </View>
          </View>
          <View style={styles.monthHeaderRight}>
            <Text style={[styles.monthCalories, { color: theme.textSecondary }]}>
              {month.totalCalories} cal
            </Text>
            <Ionicons 
              name={isExpanded ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color={theme.textMuted} 
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.monthContent}>
            {month.days.map(day => renderDayGroup(day, true))}
          </View>
        )}
      </View>
    );
  };

  // Premium gate
  if (!isPremium) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.surface }]}>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            {t('history.subtitle')}
          </Text>
        </View>
        <View style={styles.lockedContainer}>
          <Ionicons name="lock-closed" size={80} color={theme.textMuted} />
          <Text style={[styles.lockedTitle, { color: theme.text }]}>
            {t('history.premiumFeature')}
          </Text>
          <Text style={[styles.lockedText, { color: theme.textSecondary }]}>
            {t('history.premiumMessage')}
          </Text>
          <TouchableOpacity
            style={[styles.upgradeButton, { backgroundColor: theme.premium }]}
            onPress={() => router.push('/paywall')}
          >
            <Text style={styles.upgradeButtonText}>{t('history.upgradeNow')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.surface }]}>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            {t('history.subtitle')}
          </Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </View>
    );
  }

  const { today, thisMonth, previousMonths } = groupMeals();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
          {t('history.subtitle')}
        </Text>
      </View>

      {/* Today's Summary */}
      {dailyTotals && dailyTotals.mealCount > 0 && (
        <View style={[styles.dailySummary, { backgroundColor: theme.surface }]}>
          <Text style={[styles.summaryTitle, { color: theme.text }]}>
            {t('history.todaySummary')}
          </Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: theme.primary }]}>
                {dailyTotals.calories}
              </Text>
              <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>
                {t('trackFood.calories')}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: theme.primary }]}>
                {dailyTotals.protein.toFixed(1)}g
              </Text>
              <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>
                {t('trackFood.protein')}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: theme.primary }]}>
                {dailyTotals.carbs.toFixed(1)}g
              </Text>
              <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>
                {t('trackFood.carbs')}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: theme.primary }]}>
                {dailyTotals.fats.toFixed(1)}g
              </Text>
              <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>
                {t('trackFood.fats')}
              </Text>
            </View>
          </View>
        </View>
      )}

      <ScrollView style={styles.historyList} contentContainerStyle={styles.historyContent}>
        {!today && thisMonth.length === 0 && previousMonths.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant" size={60} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.text }]}>
              {t('history.noMeals')}
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
              {t('history.noMealsSubtext')}
            </Text>
          </View>
        ) : (
          <>
            {/* Today */}
            {today && renderDayGroup(today)}

            {/* This Month's Other Days */}
            {thisMonth.length > 0 && (
              <View style={styles.sectionContainer}>
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                  {i18n.language === 'es' ? 'Este mes' : 'This month'}
                </Text>
                {thisMonth.map(day => renderDayGroup(day))}
              </View>
            )}

            {/* Previous Months */}
            {previousMonths.length > 0 && (
              <View style={styles.sectionContainer}>
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                  {i18n.language === 'es' ? 'Meses anteriores' : 'Previous months'}
                </Text>
                {previousMonths.map(renderMonthGroup)}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Portion Edit Modal */}
      <Modal
        visible={showPortionModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowPortionModal(false);
          setEditingMeal(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.portionModal, { backgroundColor: theme.surface }]}>
            <Text style={[styles.portionModalTitle, { color: theme.text }]}>
              {i18n.language === 'es' ? 'Editar porciones' : 'Edit portions'}
            </Text>
            {editingMeal && (
              <Text style={[styles.portionModalSubtitle, { color: theme.textSecondary }]}>
                {editingMeal.dishName}
              </Text>
            )}
            <View style={styles.portionOptions}>
              {PORTION_OPTIONS.map(portion => (
                <TouchableOpacity
                  key={portion}
                  style={[
                    styles.portionOption,
                    { backgroundColor: theme.surfaceVariant },
                    editingMeal?.portions === portion && { backgroundColor: theme.primary }
                  ]}
                  onPress={() => editingMeal && updateMealPortions(editingMeal, portion)}
                >
                  <Text style={[
                    styles.portionOptionText,
                    { color: theme.text },
                    editingMeal?.portions === portion && { color: '#fff' }
                  ]}>
                    {portion}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.portionCancelButton, { borderColor: theme.textMuted }]}
              onPress={() => {
                setShowPortionModal(false);
                setEditingMeal(null);
              }}
            >
              <Text style={[styles.portionCancelText, { color: theme.textSecondary }]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Meal Detail Modal */}
      <Modal
        visible={showDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowDetailModal(false);
          setDetailMeal(null);
        }}
      >
        <View style={styles.detailModalOverlay}>
          <View style={[styles.detailModal, { backgroundColor: theme.surface }]}>
            {detailMeal && (
              <>
                <View style={styles.detailHeader}>
                  <TouchableOpacity onPress={() => { setShowDetailModal(false); setDetailMeal(null); }}>
                    <Ionicons name="close" size={28} color={theme.text} />
                  </TouchableOpacity>
                  <Text style={[styles.detailTitle, { color: theme.text }]}>
                    {i18n.language === 'es' ? 'Detalle' : 'Details'}
                  </Text>
                  <TouchableOpacity onPress={() => deleteMeal(detailMeal.id, detailMeal.isCooked || detailMeal.isSearched)}>
                    <Ionicons name="trash-outline" size={24} color={theme.primary} />
                  </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.detailContent}>
                  {detailMeal.icon && (
                    <Text style={styles.detailIcon}>{detailMeal.icon}</Text>
                  )}
                  {!detailMeal.icon && detailMeal.isCooked && (
                    <View style={styles.detailIconContainer}>
                      <Ionicons name="restaurant" size={50} color={theme.primary} />
                    </View>
                  )}
                  
                  <Text style={[styles.detailName, { color: theme.text }]}>
                    {detailMeal.dishName}
                  </Text>
                  
                  <Text style={[styles.detailTime, { color: theme.textMuted }]}>
                    {format(new Date(detailMeal.timestamp), "EEEE d 'de' MMMM, h:mm a", { locale: dateLocale })}
                  </Text>

                  {/* Badges */}
                  <View style={styles.detailBadges}>
                    {detailMeal.isCooked && (
                      <View style={[styles.detailBadge, { backgroundColor: theme.primary + '20' }]}>
                        <Ionicons name="restaurant" size={16} color={theme.primary} />
                        <Text style={[styles.detailBadgeText, { color: theme.primary }]}>
                          {i18n.language === 'es' ? 'Cocinado' : 'Cooked'}
                        </Text>
                      </View>
                    )}
                    {detailMeal.isSearched && (
                      <View style={[styles.detailBadge, { backgroundColor: '#4CAF5020' }]}>
                        <Ionicons name="search" size={16} color="#4CAF50" />
                        <Text style={[styles.detailBadgeText, { color: '#4CAF50' }]}>
                          {i18n.language === 'es' ? 'Buscado' : 'Searched'}
                        </Text>
                      </View>
                    )}
                    {detailMeal.portions && (
                      <View style={[styles.detailBadge, { backgroundColor: theme.surfaceVariant }]}>
                        <Ionicons name="pie-chart" size={16} color={theme.textSecondary} />
                        <Text style={[styles.detailBadgeText, { color: theme.textSecondary }]}>
                          {detailMeal.portions} {i18n.language === 'es' ? 'porción(es)' : 'serving(s)'}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Nutrition info */}
                  <View style={[styles.detailNutrition, { backgroundColor: theme.surfaceVariant }]}>
                    <View style={styles.detailNutritionRow}>
                      <Text style={[styles.detailNutritionLabel, { color: theme.textMuted }]}>
                        {i18n.language === 'es' ? 'Calorías' : 'Calories'}
                      </Text>
                      <Text style={[styles.detailNutritionValue, { color: theme.primary }]}>
                        {detailMeal.calories} kcal
                      </Text>
                    </View>
                    <View style={styles.detailNutritionRow}>
                      <Text style={[styles.detailNutritionLabel, { color: theme.textMuted }]}>
                        {i18n.language === 'es' ? 'Proteína' : 'Protein'}
                      </Text>
                      <Text style={[styles.detailNutritionValue, { color: theme.text }]}>
                        {detailMeal.protein}g
                      </Text>
                    </View>
                    <View style={styles.detailNutritionRow}>
                      <Text style={[styles.detailNutritionLabel, { color: theme.textMuted }]}>
                        {i18n.language === 'es' ? 'Carbohidratos' : 'Carbs'}
                      </Text>
                      <Text style={[styles.detailNutritionValue, { color: theme.text }]}>
                        {detailMeal.carbs}g
                      </Text>
                    </View>
                    <View style={styles.detailNutritionRow}>
                      <Text style={[styles.detailNutritionLabel, { color: theme.textMuted }]}>
                        {i18n.language === 'es' ? 'Grasas' : 'Fats'}
                      </Text>
                      <Text style={[styles.detailNutritionValue, { color: theme.text }]}>
                        {detailMeal.fats}g
                      </Text>
                    </View>
                  </View>

                  {/* Edit portions button */}
                  {(detailMeal.isCooked || detailMeal.isSearched) && (
                    <TouchableOpacity
                      style={[styles.detailEditButton, { borderColor: theme.textMuted }]}
                      onPress={() => {
                        setShowDetailModal(false);
                        setEditingMeal(detailMeal);
                        setShowPortionModal(true);
                      }}
                    >
                      <Ionicons name="pencil" size={20} color={theme.textSecondary} />
                      <Text style={[styles.detailEditButtonText, { color: theme.textSecondary }]}>
                        {i18n.language === 'es' ? 'Editar porciones' : 'Edit portions'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Cook again button */}
                  <TouchableOpacity
                    style={[styles.cookAgainButton, { backgroundColor: theme.primary }]}
                    onPress={cookAgain}
                  >
                    <Ionicons name="refresh" size={24} color="#fff" />
                    <Text style={styles.cookAgainButtonText}>
                      {i18n.language === 'es' ? 'Volver a comer / cocinar' : 'Eat / Cook again'}
                    </Text>
                  </TouchableOpacity>
                  <Text style={[styles.cookAgainHint, { color: theme.textMuted }]}>
                    {i18n.language === 'es' 
                      ? 'Agrega una nueva entrada al historial (1 porción)'
                      : 'Adds a new entry to history (1 serving)'}
                  </Text>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  lockedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 12,
  },
  lockedText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  upgradeButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  upgradeButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dailySummary: {
    padding: 20,
    margin: 16,
    borderRadius: 12,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  summaryLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  historyList: {
    flex: 1,
  },
  historyContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionContainer: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // Day styles
  dayContainer: {
    marginBottom: 8,
  },
  nestedDay: {
    marginLeft: 16,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
  },
  dayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dayHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  mealCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  mealCountText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dayCalories: {
    fontSize: 14,
  },
  dayContent: {
    paddingTop: 8,
    paddingLeft: 8,
  },
  // Month styles
  monthContainer: {
    marginBottom: 12,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
  },
  monthHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  monthHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dayCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dayCountText: {
    fontSize: 12,
    fontWeight: '600',
  },
  monthCalories: {
    fontSize: 14,
  },
  monthContent: {
    paddingTop: 8,
  },
  // Meal card
  mealCard: {
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  mealImage: {
    width: 80,
    height: 80,
  },
  mealInfo: {
    flex: 1,
    padding: 12,
  },
  mealName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  mealTime: {
    fontSize: 11,
    marginBottom: 6,
  },
  mealMacros: {
    flexDirection: 'row',
    gap: 8,
  },
  mealMacroText: {
    fontSize: 11,
  },
  deleteButton: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Cooked badge
  cookedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  cookedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Portion badge
  portionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  portionText: {
    fontSize: 11,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  portionModal: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  portionModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  portionModalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  portionOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  portionOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portionOptionText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  portionCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
  },
  portionCancelText: {
    fontSize: 16,
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
  // Meal icon
  mealIcon: {
    fontSize: 50,
    marginRight: 12,
    alignSelf: 'center',
  },
  // Detail Modal styles
  detailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  detailModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: '50%',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#33333350',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  detailContent: {
    padding: 24,
    alignItems: 'center',
  },
  detailIcon: {
    fontSize: 70,
    marginBottom: 16,
  },
  detailIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FF6B6B20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  detailName: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  detailTime: {
    fontSize: 14,
    marginBottom: 16,
  },
  detailBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  detailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  detailBadgeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  detailNutrition: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  detailNutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#33333330',
  },
  detailNutritionLabel: {
    fontSize: 15,
  },
  detailNutritionValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  detailEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginBottom: 16,
    width: '100%',
  },
  detailEditButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  cookAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 10,
    width: '100%',
  },
  cookAgainButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cookAgainHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
});
