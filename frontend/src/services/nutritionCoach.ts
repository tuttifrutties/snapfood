/**
 * Nutrition Coach Service
 * Handles TDEE calculations, profile management, and weekly/monthly summaries
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const NUTRITION_PROFILE_KEY = 'user_nutrition_profile';
const WEEKLY_SUMMARY_KEY = 'weekly_summary';
const MONTHLY_SUMMARY_KEY = 'monthly_summary';

export interface PhysicalActivity {
  id: string;
  type: string;
  icon: string;
  durationMinutes: number;
  daysPerWeek: number[];
}

export interface UserNutritionProfile {
  name?: string;
  age: number;
  height: number; // cm
  weight: number; // kg
  gender: 'male' | 'female';
  goal: 'lose' | 'maintain' | 'gain';
  country: string;
  region: string;
  activities: PhysicalActivity[];
  bmr?: number;
  tdee?: number;
  targetCalories?: number;
  createdAt?: string;
  updatedAt?: string;
}

export const PHYSICAL_ACTIVITIES = [
  { id: 'gym', type: 'gym', icon: 'barbell-outline' },
  { id: 'walking', type: 'walking', icon: 'walk-outline' },
  { id: 'running', type: 'running', icon: 'fitness-outline' },
  { id: 'cycling', type: 'cycling', icon: 'bicycle-outline' },
  { id: 'swimming', type: 'swimming', icon: 'water-outline' },
  { id: 'yoga', type: 'yoga', icon: 'body-outline' },
  { id: 'dancing', type: 'dancing', icon: 'musical-notes-outline' },
  { id: 'sports', type: 'sports', icon: 'football-outline' },
  { id: 'hiking', type: 'hiking', icon: 'trail-sign-outline' },
  { id: 'martial_arts', type: 'martial_arts', icon: 'hand-left-outline' },
];

const ACTIVITY_LABELS: { [key: string]: { es: string; en: string } } = {
  gym: { es: 'Gimnasio', en: 'Gym' },
  walking: { es: 'Caminar', en: 'Walking' },
  running: { es: 'Correr', en: 'Running' },
  cycling: { es: 'Ciclismo', en: 'Cycling' },
  swimming: { es: 'Natación', en: 'Swimming' },
  yoga: { es: 'Yoga', en: 'Yoga' },
  dancing: { es: 'Baile', en: 'Dancing' },
  sports: { es: 'Deportes', en: 'Sports' },
  hiking: { es: 'Senderismo', en: 'Hiking' },
  martial_arts: { es: 'Artes marciales', en: 'Martial Arts' },
};

export const getActivityLabel = (activityId: string, language: string = 'en'): string => {
  const labels = ACTIVITY_LABELS[activityId];
  if (!labels) return activityId;
  return language === 'es' ? labels.es : labels.en;
};

/**
 * Calculate BMR using Mifflin-St Jeor Equation
 */
export const calculateBMR = (
  weight: number,
  height: number,
  age: number,
  gender: 'male' | 'female'
): number => {
  if (gender === 'male') {
    return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
  } else {
    return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
  }
};

/**
 * Calculate activity multiplier based on activities
 */
const calculateActivityMultiplier = (activities: PhysicalActivity[]): number => {
  if (!activities || activities.length === 0) return 1.2; // Sedentary

  // Calculate total weekly exercise minutes
  let totalWeeklyMinutes = 0;
  activities.forEach(activity => {
    totalWeeklyMinutes += activity.durationMinutes * activity.daysPerWeek.length;
  });

  // Convert to activity multiplier
  if (totalWeeklyMinutes < 60) return 1.2; // Sedentary
  if (totalWeeklyMinutes < 180) return 1.375; // Light
  if (totalWeeklyMinutes < 360) return 1.55; // Moderate
  if (totalWeeklyMinutes < 540) return 1.725; // Active
  return 1.9; // Very active
};

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 */
export const calculateTDEE = (
  bmr: number,
  activities: PhysicalActivity[]
): number => {
  const multiplier = calculateActivityMultiplier(activities);
  return Math.round(bmr * multiplier);
};

/**
 * Calculate target calories based on goal
 */
export const calculateTargetCalories = (
  tdee: number,
  goal: 'lose' | 'maintain' | 'gain'
): number => {
  switch (goal) {
    case 'lose':
      return Math.round(tdee - 500); // 500 cal deficit
    case 'gain':
      return Math.round(tdee + 300); // 300 cal surplus for lean gain
    default:
      return tdee;
  }
};

/**
 * Save user nutrition profile
 */
export const saveUserNutritionProfile = async (
  profile: Omit<UserNutritionProfile, 'bmr' | 'tdee' | 'targetCalories' | 'createdAt' | 'updatedAt'>
): Promise<UserNutritionProfile> => {
  const bmr = calculateBMR(profile.weight, profile.height, profile.age, profile.gender);
  const tdee = calculateTDEE(bmr, profile.activities);
  const targetCalories = calculateTargetCalories(tdee, profile.goal);

  const existingProfile = await getUserNutritionProfile();
  
  const fullProfile: UserNutritionProfile = {
    ...profile,
    bmr,
    tdee,
    targetCalories,
    createdAt: existingProfile?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(NUTRITION_PROFILE_KEY, JSON.stringify(fullProfile));
  console.log('[NutritionCoach] Profile saved:', fullProfile.name, 'TDEE:', tdee, 'Target:', targetCalories);
  
  return fullProfile;
};

/**
 * Get user nutrition profile
 */
export const getUserNutritionProfile = async (): Promise<UserNutritionProfile | null> => {
  try {
    const data = await AsyncStorage.getItem(NUTRITION_PROFILE_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch (error) {
    console.error('[NutritionCoach] Failed to get profile:', error);
    return null;
  }
};

/**
 * Get user name from profile
 */
export const getUserName = async (): Promise<string | null> => {
  try {
    const profile = await getUserNutritionProfile();
    return profile?.name || null;
  } catch {
    return null;
  }
};

/**
 * Get local date string in YYYY-MM-DD format
 * This ensures the date is in the user's local timezone
 */
const getLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Update daily calories (called when meal is saved)
 */
export const updateDailyCalories = async (calories: number): Promise<void> => {
  try {
    const today = getLocalDateString();
    const key = `daily_calories_${today}`;
    
    const existing = await AsyncStorage.getItem(key);
    const currentTotal = existing ? parseInt(existing) : 0;
    
    await AsyncStorage.setItem(key, (currentTotal + calories).toString());
    console.log('[NutritionCoach] Updated daily calories:', currentTotal + calories);
  } catch (error) {
    console.error('[NutritionCoach] Failed to update daily calories:', error);
  }
};

/**
 * Get today's calorie total
 */
export const getTodayCalories = async (): Promise<number> => {
  try {
    const today = getLocalDateString();
    const key = `daily_calories_${today}`;
    const data = await AsyncStorage.getItem(key);
    return data ? parseInt(data) : 0;
  } catch {
    return 0;
  }
};

/**
 * Get current week's start date (Monday)
 */
const getWeekStart = (date: Date = new Date()): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

/**
 * Get current month's start date
 */
const getMonthStart = (date: Date = new Date()): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

/**
 * Get week summary with calorie tracking
 */
export const getWeekSummary = async (): Promise<{
  daysTracked: number;
  totalCalories: number;
  averageCalories: number;
  daysInDeficit: number;
  daysInBalance: number;
  daysInSurplus: number;
  weekStart: string;
  weekEnd: string;
}> => {
  try {
    const profile = await getUserNutritionProfile();
    const targetCalories = profile?.targetCalories || 2000;
    const tolerance = 100; // +/- 100 cal is considered "balance"

    const weekStart = getWeekStart();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    let daysTracked = 0;
    let totalCalories = 0;
    let daysInDeficit = 0;
    let daysInBalance = 0;
    let daysInSurplus = 0;

    // Check each day of the week
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(weekStart);
      checkDate.setDate(checkDate.getDate() + i);
      
      // Don't check future dates
      if (checkDate > new Date()) continue;

      const dateKey = getLocalDateString(checkDate);
      const key = `daily_calories_${dateKey}`;
      const data = await AsyncStorage.getItem(key);

      if (data) {
        const dayCalories = parseInt(data);
        daysTracked++;
        totalCalories += dayCalories;

        const diff = dayCalories - targetCalories;
        if (diff < -tolerance) {
          daysInDeficit++;
        } else if (diff > tolerance) {
          daysInSurplus++;
        } else {
          daysInBalance++;
        }
      }
    }

    return {
      daysTracked,
      totalCalories,
      averageCalories: daysTracked > 0 ? Math.round(totalCalories / daysTracked) : 0,
      daysInDeficit,
      daysInBalance,
      daysInSurplus,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
    };
  } catch (error) {
    console.error('[NutritionCoach] Failed to get week summary:', error);
    return {
      daysTracked: 0,
      totalCalories: 0,
      averageCalories: 0,
      daysInDeficit: 0,
      daysInBalance: 0,
      daysInSurplus: 0,
      weekStart: '',
      weekEnd: '',
    };
  }
};

/**
 * Get month summary for a specific month (previous month by default)
 */
export const getMonthSummary = async (monthOffset: number = -1): Promise<{
  daysTracked: number;
  totalCalories: number;
  averageCalories: number;
  daysInDeficit: number;
  daysInBalance: number;
  daysInSurplus: number;
  monthName: string;
  monthYear: string;
}> => {
  try {
    const profile = await getUserNutritionProfile();
    const targetCalories = profile?.targetCalories || 2000;
    const tolerance = 100;

    // Get the target month
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);

    let daysTracked = 0;
    let totalCalories = 0;
    let daysInDeficit = 0;
    let daysInBalance = 0;
    let daysInSurplus = 0;

    // Check each day of the month
    const daysInMonth = monthEnd.getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      const checkDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), i);
      const dateKey = checkDate.toISOString().split('T')[0];
      const key = `daily_calories_${dateKey}`;
      const data = await AsyncStorage.getItem(key);

      if (data) {
        const dayCalories = parseInt(data);
        daysTracked++;
        totalCalories += dayCalories;

        const diff = dayCalories - targetCalories;
        if (diff < -tolerance) {
          daysInDeficit++;
        } else if (diff > tolerance) {
          daysInSurplus++;
        } else {
          daysInBalance++;
        }
      }
    }

    const monthNames = {
      es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
      en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    };

    return {
      daysTracked,
      totalCalories,
      averageCalories: daysTracked > 0 ? Math.round(totalCalories / daysTracked) : 0,
      daysInDeficit,
      daysInBalance,
      daysInSurplus,
      monthName: monthNames.es[targetDate.getMonth()],
      monthYear: targetDate.getFullYear().toString(),
    };
  } catch (error) {
    console.error('[NutritionCoach] Failed to get month summary:', error);
    return {
      daysTracked: 0,
      totalCalories: 0,
      averageCalories: 0,
      daysInDeficit: 0,
      daysInBalance: 0,
      daysInSurplus: 0,
      monthName: '',
      monthYear: '',
    };
  }
};
