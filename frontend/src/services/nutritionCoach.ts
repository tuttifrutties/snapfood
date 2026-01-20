/**
 * Nutrition Coach Service
 * Manages calorie calculations, meal history, and smart suggestions
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_PROFILE_KEY = 'user_nutrition_profile';
const MEAL_HISTORY_KEY = 'meal_history';
const MAX_HISTORY_MONTHS = 12;

// ============================================
// TYPES
// ============================================

export interface PhysicalActivity {
  id: string;
  type: string;
  icon: string;
  durationMinutes: number;
  daysPerWeek: number[];  // 0 = Sunday, 1 = Monday, etc.
}

export interface UserNutritionProfile {
  age: number;
  height: number;  // cm
  weight: number;  // kg
  gender: 'male' | 'female';
  goal: 'lose' | 'maintain' | 'gain';
  country: string;
  region: string;
  activities: PhysicalActivity[];
  bmr: number;           // Basal Metabolic Rate
  tdee: number;          // Total Daily Energy Expenditure
  targetCalories: number; // Daily target based on goal
  lastUpdated: number;   // timestamp
}

export interface MealEntry {
  id: string;
  userId: string;
  dishName: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  photoBase64?: string;
  timestamp: number;
  date: string;  // YYYY-MM-DD format
}

export interface DayMeals {
  date: string;
  meals: MealEntry[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
  status: 'deficit' | 'balance' | 'surplus';
}

export interface MonthHistory {
  month: string;  // YYYY-MM format
  days: DayMeals[];
  averageCalories: number;
  daysInDeficit: number;
  daysInBalance: number;
  daysInSurplus: number;
}

export interface MealHistory {
  months: MonthHistory[];
  lastUpdated: number;
}

// ============================================
// PHYSICAL ACTIVITIES DATA
// ============================================

export const PHYSICAL_ACTIVITIES = [
  { id: 'walking', type: 'walking', icon: 'walk', metValue: 3.5 },
  { id: 'running', type: 'running', icon: 'fitness', metValue: 8.0 },
  { id: 'cycling', type: 'cycling', icon: 'bicycle', metValue: 6.0 },
  { id: 'swimming', type: 'swimming', icon: 'water', metValue: 7.0 },
  { id: 'gym', type: 'gym', icon: 'barbell', metValue: 5.0 },
  { id: 'dance', type: 'dance', icon: 'musical-notes', metValue: 5.5 },
  { id: 'yoga', type: 'yoga', icon: 'body', metValue: 2.5 },
  { id: 'martial_arts', type: 'martial_arts', icon: 'hand-left', metValue: 7.0 },
  { id: 'team_sports', type: 'team_sports', icon: 'football', metValue: 6.5 },
  { id: 'hiking', type: 'hiking', icon: 'trail-sign', metValue: 5.0 },
  { id: 'tennis', type: 'tennis', icon: 'tennisball', metValue: 6.0 },
  { id: 'climbing', type: 'climbing', icon: 'trending-up', metValue: 8.0 },
];

export const getActivityLabel = (type: string, language: string): string => {
  const labels: { [key: string]: { [lang: string]: string } } = {
    walking: { es: 'Caminar', en: 'Walking', pt: 'Caminhar', it: 'Camminare' },
    running: { es: 'Correr', en: 'Running', pt: 'Corrida', it: 'Corsa' },
    cycling: { es: 'Ciclismo', en: 'Cycling', pt: 'Ciclismo', it: 'Ciclismo' },
    swimming: { es: 'Natación', en: 'Swimming', pt: 'Natação', it: 'Nuoto' },
    gym: { es: 'Gimnasio', en: 'Gym/Weights', pt: 'Academia', it: 'Palestra' },
    dance: { es: 'Danza', en: 'Dance', pt: 'Dança', it: 'Danza' },
    yoga: { es: 'Yoga/Pilates', en: 'Yoga/Pilates', pt: 'Yoga/Pilates', it: 'Yoga/Pilates' },
    martial_arts: { es: 'Artes Marciales', en: 'Martial Arts', pt: 'Artes Marciais', it: 'Arti Marziali' },
    team_sports: { es: 'Deportes de Equipo', en: 'Team Sports', pt: 'Esportes Coletivos', it: 'Sport di Squadra' },
    hiking: { es: 'Senderismo', en: 'Hiking', pt: 'Trilha', it: 'Escursionismo' },
    tennis: { es: 'Tenis/Pádel', en: 'Tennis/Padel', pt: 'Tênis/Padel', it: 'Tennis/Padel' },
    climbing: { es: 'Escalada', en: 'Climbing', pt: 'Escalada', it: 'Arrampicata' },
  };
  return labels[type]?.[language] || labels[type]?.['en'] || type;
};

// ============================================
// CALORIE CALCULATIONS
// ============================================

/**
 * Calculate BMR using Mifflin-St Jeor equation
 */
export function calculateBMR(weight: number, height: number, age: number, gender: 'male' | 'female'): number {
  if (gender === 'male') {
    return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
  } else {
    return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
  }
}

/**
 * Calculate calories burned from activities per week
 */
export function calculateActivityCalories(activities: PhysicalActivity[], weight: number): number {
  let weeklyCalories = 0;
  
  for (const activity of activities) {
    const activityData = PHYSICAL_ACTIVITIES.find(a => a.id === activity.type);
    if (activityData) {
      // MET * weight (kg) * duration (hours) * days per week
      const caloriesPerSession = activityData.metValue * weight * (activity.durationMinutes / 60);
      weeklyCalories += caloriesPerSession * activity.daysPerWeek.length;
    }
  }
  
  return Math.round(weeklyCalories);
}

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 */
export function calculateTDEE(bmr: number, weeklyActivityCalories: number): number {
  // Base activity multiplier for daily life (1.2 for sedentary)
  const baseMultiplier = 1.2;
  const baseTDEE = bmr * baseMultiplier;
  
  // Add activity calories distributed over 7 days
  const dailyActivityBonus = weeklyActivityCalories / 7;
  
  return Math.round(baseTDEE + dailyActivityBonus);
}

/**
 * Calculate target calories based on goal
 */
export function calculateTargetCalories(tdee: number, goal: 'lose' | 'maintain' | 'gain'): number {
  switch (goal) {
    case 'lose':
      return Math.round(tdee * 0.8);  // 20% deficit
    case 'gain':
      return Math.round(tdee * 1.15); // 15% surplus
    case 'maintain':
    default:
      return tdee;
  }
}

// ============================================
// USER PROFILE MANAGEMENT
// ============================================

export async function saveUserNutritionProfile(profile: Omit<UserNutritionProfile, 'bmr' | 'tdee' | 'targetCalories' | 'lastUpdated'>): Promise<UserNutritionProfile> {
  const bmr = calculateBMR(profile.weight, profile.height, profile.age, profile.gender);
  const weeklyActivityCalories = calculateActivityCalories(profile.activities, profile.weight);
  const tdee = calculateTDEE(bmr, weeklyActivityCalories);
  const targetCalories = calculateTargetCalories(tdee, profile.goal);
  
  const fullProfile: UserNutritionProfile = {
    ...profile,
    bmr,
    tdee,
    targetCalories,
    lastUpdated: Date.now(),
  };
  
  await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(fullProfile));
  console.log('[NutritionCoach] Profile saved:', { bmr, tdee, targetCalories });
  
  return fullProfile;
}

export async function getUserNutritionProfile(): Promise<UserNutritionProfile | null> {
  try {
    const stored = await AsyncStorage.getItem(USER_PROFILE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return null;
  } catch (error) {
    console.error('[NutritionCoach] Error getting profile:', error);
    return null;
  }
}

export async function updateUserWeight(newWeight: number): Promise<UserNutritionProfile | null> {
  const profile = await getUserNutritionProfile();
  if (!profile) return null;
  
  return saveUserNutritionProfile({
    ...profile,
    weight: newWeight,
  });
}

export async function updateUserActivities(activities: PhysicalActivity[]): Promise<UserNutritionProfile | null> {
  const profile = await getUserNutritionProfile();
  if (!profile) return null;
  
  return saveUserNutritionProfile({
    ...profile,
    activities,
  });
}

// ============================================
// MEAL HISTORY MANAGEMENT
// ============================================

export async function getMealHistory(): Promise<MealHistory> {
  try {
    const stored = await AsyncStorage.getItem(MEAL_HISTORY_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return { months: [], lastUpdated: Date.now() };
  } catch (error) {
    console.error('[NutritionCoach] Error getting meal history:', error);
    return { months: [], lastUpdated: Date.now() };
  }
}

export async function saveMealToHistory(meal: MealEntry): Promise<void> {
  try {
    const history = await getMealHistory();
    const profile = await getUserNutritionProfile();
    const targetCalories = profile?.targetCalories || 2000;
    
    const mealDate = new Date(meal.timestamp);
    const monthKey = `${mealDate.getFullYear()}-${String(mealDate.getMonth() + 1).padStart(2, '0')}`;
    const dateKey = meal.date || mealDate.toISOString().split('T')[0];
    
    // Find or create month
    let monthIndex = history.months.findIndex(m => m.month === monthKey);
    if (monthIndex === -1) {
      history.months.unshift({
        month: monthKey,
        days: [],
        averageCalories: 0,
        daysInDeficit: 0,
        daysInBalance: 0,
        daysInSurplus: 0,
      });
      monthIndex = 0;
    }
    
    // Find or create day
    const month = history.months[monthIndex];
    let dayIndex = month.days.findIndex(d => d.date === dateKey);
    if (dayIndex === -1) {
      month.days.unshift({
        date: dateKey,
        meals: [],
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFats: 0,
        status: 'balance',
      });
      dayIndex = 0;
    }
    
    // Add meal to day
    const day = month.days[dayIndex];
    day.meals.push(meal);
    
    // Recalculate day totals
    day.totalCalories = day.meals.reduce((sum, m) => sum + m.calories, 0);
    day.totalProtein = day.meals.reduce((sum, m) => sum + m.protein, 0);
    day.totalCarbs = day.meals.reduce((sum, m) => sum + m.carbs, 0);
    day.totalFats = day.meals.reduce((sum, m) => sum + m.fats, 0);
    
    // Calculate status (with 10% tolerance for balance)
    const lowerBound = targetCalories * 0.9;
    const upperBound = targetCalories * 1.1;
    if (day.totalCalories < lowerBound) {
      day.status = 'deficit';
    } else if (day.totalCalories > upperBound) {
      day.status = 'surplus';
    } else {
      day.status = 'balance';
    }
    
    // Recalculate month stats
    month.averageCalories = Math.round(month.days.reduce((sum, d) => sum + d.totalCalories, 0) / month.days.length);
    month.daysInDeficit = month.days.filter(d => d.status === 'deficit').length;
    month.daysInBalance = month.days.filter(d => d.status === 'balance').length;
    month.daysInSurplus = month.days.filter(d => d.status === 'surplus').length;
    
    // Limit to MAX_HISTORY_MONTHS
    if (history.months.length > MAX_HISTORY_MONTHS) {
      history.months = history.months.slice(0, MAX_HISTORY_MONTHS);
    }
    
    history.lastUpdated = Date.now();
    await AsyncStorage.setItem(MEAL_HISTORY_KEY, JSON.stringify(history));
    console.log('[NutritionCoach] Meal saved to history');
  } catch (error) {
    console.error('[NutritionCoach] Error saving meal to history:', error);
  }
}

export async function getTodayMeals(): Promise<DayMeals | null> {
  const history = await getMealHistory();
  const today = new Date().toISOString().split('T')[0];
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  
  const month = history.months.find(m => m.month === currentMonth);
  if (!month) return null;
  
  return month.days.find(d => d.date === today) || null;
}

export async function getWeekSummary(): Promise<{
  totalCalories: number;
  averageCalories: number;
  daysTracked: number;
  daysInDeficit: number;
  daysInBalance: number;
  daysInSurplus: number;
  targetCalories: number;
}> {
  const history = await getMealHistory();
  const profile = await getUserNutritionProfile();
  const targetCalories = profile?.targetCalories || 2000;
  
  // Get last 7 days
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const weekDays: DayMeals[] = [];
  
  for (const month of history.months) {
    for (const day of month.days) {
      const dayDate = new Date(day.date);
      if (dayDate >= weekAgo && dayDate <= now) {
        weekDays.push(day);
      }
    }
  }
  
  const totalCalories = weekDays.reduce((sum, d) => sum + d.totalCalories, 0);
  
  return {
    totalCalories,
    averageCalories: weekDays.length > 0 ? Math.round(totalCalories / weekDays.length) : 0,
    daysTracked: weekDays.length,
    daysInDeficit: weekDays.filter(d => d.status === 'deficit').length,
    daysInBalance: weekDays.filter(d => d.status === 'balance').length,
    daysInSurplus: weekDays.filter(d => d.status === 'surplus').length,
    targetCalories,
  };
}

// ============================================
// SMART SUGGESTIONS - SNACKS BY COUNTRY
// ============================================

export interface SnackSuggestion {
  name: string;
  calories: number;
  description: string;
}

const SNACKS_BY_COUNTRY: { [countryCode: string]: SnackSuggestion[] } = {
  // Argentina
  AR: [
    { name: 'Yogur natural', calories: 100, description: 'Sin azúcar agregada' },
    { name: 'Frutas frescas', calories: 80, description: 'Manzana, banana, naranja' },
    { name: 'Mate', calories: 5, description: 'Para calmar el apetito' },
    { name: 'Tostadas con queso untable', calories: 120, description: 'Light, 2 unidades' },
    { name: 'Gelatina light', calories: 25, description: 'Postre bajo en calorías' },
    { name: 'Barra de cereal', calories: 90, description: 'Sin azúcar' },
  ],
  // Chile
  CL: [
    { name: 'Frutas frescas', calories: 80, description: 'Manzana, pera, uva' },
    { name: 'Yogur griego', calories: 100, description: 'Sin azúcar' },
    { name: 'Frutos secos', calories: 160, description: 'Nueces, almendras' },
    { name: 'Pan integral con palta', calories: 150, description: 'Media palta' },
    { name: 'Leche descremada', calories: 80, description: '1 vaso' },
    { name: 'Barrita de quinoa', calories: 100, description: 'Snack saludable' },
  ],
  // México
  MX: [
    { name: 'Jícama con limón', calories: 50, description: 'Con chile en polvo' },
    { name: 'Pepino con limón', calories: 30, description: 'Snack refrescante' },
    { name: 'Frutas frescas', calories: 80, description: 'Mango, papaya, sandía' },
    { name: 'Yogur natural', calories: 100, description: 'Sin azúcar' },
    { name: 'Palomitas naturales', calories: 90, description: 'Sin mantequilla' },
    { name: 'Nopales', calories: 20, description: 'Asados o en ensalada' },
  ],
  // Colombia
  CO: [
    { name: 'Frutas frescas', calories: 80, description: 'Guayaba, maracuyá, lulo' },
    { name: 'Yogur natural', calories: 100, description: 'Sin azúcar' },
    { name: 'Arepa pequeña', calories: 120, description: 'Con queso bajo en grasa' },
    { name: 'Aguacate', calories: 80, description: 'Un cuarto de unidad' },
    { name: 'Bocadillo con queso', calories: 130, description: 'Porción pequeña' },
    { name: 'Agua de panela', calories: 60, description: 'Sin exceso' },
  ],
  // Brasil
  BR: [
    { name: 'Frutas frescas', calories: 80, description: 'Açaí light, mamão, abacaxi' },
    { name: 'Iogurte natural', calories: 100, description: 'Sem açúcar' },
    { name: 'Castanha do Pará', calories: 100, description: '3 unidades' },
    { name: 'Tapioca leve', calories: 120, description: 'Com queijo cottage' },
    { name: 'Água de coco', calories: 45, description: 'Natural' },
    { name: 'Banana', calories: 90, description: 'Com canela' },
  ],
  // España
  ES: [
    { name: 'Yogur natural', calories: 100, description: 'Sin azúcar' },
    { name: 'Frutas de temporada', calories: 80, description: 'Manzana, pera, naranja' },
    { name: 'Tostada integral', calories: 100, description: 'Con tomate y aceite' },
    { name: 'Jamón serrano', calories: 70, description: '2 lonchas finas' },
    { name: 'Frutos secos', calories: 160, description: 'Almendras, nueces' },
    { name: 'Infusión', calories: 5, description: 'Sin azúcar' },
  ],
  // Italia
  IT: [
    { name: 'Frutta fresca', calories: 80, description: 'Mela, pera, uva' },
    { name: 'Yogurt greco', calories: 100, description: 'Senza zucchero' },
    { name: 'Parmigiano', calories: 110, description: 'Piccola porzione' },
    { name: 'Bruschetta', calories: 120, description: 'Con pomodoro' },
    { name: 'Frutta secca', calories: 160, description: 'Mandorle, noci' },
    { name: 'Tè verde', calories: 5, description: 'Senza zucchero' },
  ],
  // United States
  US: [
    { name: 'Greek yogurt', calories: 100, description: 'Plain, non-fat' },
    { name: 'Apple with almond butter', calories: 180, description: '1 tbsp butter' },
    { name: 'Baby carrots', calories: 40, description: 'With hummus' },
    { name: 'Rice cakes', calories: 70, description: 'With avocado' },
    { name: 'Mixed nuts', calories: 160, description: 'Small handful' },
    { name: 'String cheese', calories: 80, description: '1 piece' },
  ],
  // Canada
  CA: [
    { name: 'Greek yogurt', calories: 100, description: 'With berries' },
    { name: 'Apple slices', calories: 80, description: 'With peanut butter' },
    { name: 'Trail mix', calories: 150, description: 'Small portion' },
    { name: 'Cottage cheese', calories: 110, description: 'Low-fat' },
    { name: 'Whole grain crackers', calories: 100, description: 'With cheese' },
    { name: 'Maple water', calories: 20, description: 'Natural hydration' },
  ],
  // France
  FR: [
    { name: 'Yaourt nature', calories: 100, description: 'Sans sucre ajouté' },
    { name: 'Fruits frais', calories: 80, description: 'Pomme, poire, raisin' },
    { name: 'Fromage blanc', calories: 90, description: '0% de matière grasse' },
    { name: 'Pain complet', calories: 100, description: 'Avec un peu de beurre' },
    { name: 'Amandes', calories: 160, description: 'Petite poignée' },
    { name: 'Thé vert', calories: 5, description: 'Sans sucre' },
  ],
  // Germany
  DE: [
    { name: 'Naturjoghurt', calories: 100, description: 'Ohne Zucker' },
    { name: 'Frisches Obst', calories: 80, description: 'Apfel, Birne, Trauben' },
    { name: 'Vollkornbrot', calories: 100, description: 'Mit Käse' },
    { name: 'Quark', calories: 90, description: 'Magerquark' },
    { name: 'Nüsse', calories: 160, description: 'Kleine Portion' },
    { name: 'Grüner Tee', calories: 5, description: 'Ohne Zucker' },
  ],
  // United Kingdom
  GB: [
    { name: 'Greek yogurt', calories: 100, description: 'Plain, low-fat' },
    { name: 'Fresh fruit', calories: 80, description: 'Apple, pear, berries' },
    { name: 'Oatcakes', calories: 90, description: 'With cottage cheese' },
    { name: 'Rice cakes', calories: 70, description: 'With nut butter' },
    { name: 'Mixed nuts', calories: 160, description: 'Unsalted' },
    { name: 'Herbal tea', calories: 5, description: 'No sugar' },
  ],
  // Portugal
  PT: [
    { name: 'Iogurte natural', calories: 100, description: 'Sem açúcar' },
    { name: 'Fruta fresca', calories: 80, description: 'Maçã, pera, laranja' },
    { name: 'Tostas integrais', calories: 100, description: 'Com queijo fresco' },
    { name: 'Frutos secos', calories: 160, description: 'Amêndoas, nozes' },
    { name: 'Chá verde', calories: 5, description: 'Sem açúcar' },
    { name: 'Queijo fresco', calories: 90, description: 'Porção pequena' },
  ],
  // Japan
  JP: [
    { name: '枝豆 (Edamame)', calories: 120, description: 'Steamed soybeans' },
    { name: '果物 (Fresh fruit)', calories: 80, description: 'Apple, persimmon' },
    { name: 'おにぎり (Onigiri)', calories: 150, description: 'Small rice ball' },
    { name: '味噌汁 (Miso soup)', calories: 40, description: 'Warm and filling' },
    { name: '緑茶 (Green tea)', calories: 5, description: 'Unsweetened' },
    { name: '海苔 (Nori)', calories: 30, description: 'Roasted seaweed' },
  ],
  // Default / Other
  OTHER: [
    { name: 'Fresh fruit', calories: 80, description: 'Any seasonal fruit' },
    { name: 'Yogurt', calories: 100, description: 'Plain, low-fat' },
    { name: 'Mixed nuts', calories: 160, description: 'Small handful' },
    { name: 'Vegetables', calories: 40, description: 'Carrots, cucumber' },
    { name: 'Whole grain crackers', calories: 100, description: 'With cheese' },
    { name: 'Herbal tea', calories: 5, description: 'Unsweetened' },
  ],
};

// Fallback to region if country not found
const REGION_FALLBACKS: { [region: string]: string } = {
  latam: 'AR',
  northam: 'US',
  europe: 'ES',
  asia: 'JP',
  oceania: 'US',
  other: 'OTHER',
};

export function getSnackSuggestions(country: string, region: string, remainingCalories: number): SnackSuggestion[] {
  // Try country first, then region fallback
  let snacks = SNACKS_BY_COUNTRY[country];
  if (!snacks) {
    const fallbackCountry = REGION_FALLBACKS[region] || 'OTHER';
    snacks = SNACKS_BY_COUNTRY[fallbackCountry] || SNACKS_BY_COUNTRY.OTHER;
  }
  
  // Filter snacks that fit within remaining calories
  return snacks.filter(s => s.calories <= remainingCalories).slice(0, 3);
}

export async function getDailyCoachMessage(language: string): Promise<string | null> {
  const profile = await getUserNutritionProfile();
  const todayMeals = await getTodayMeals();
  
  if (!profile) return null;
  
  const consumed = todayMeals?.totalCalories || 0;
  const remaining = profile.targetCalories - consumed;
  const percentConsumed = (consumed / profile.targetCalories) * 100;
  const currentHour = new Date().getHours();
  
  const messages: { [lang: string]: { [key: string]: string } } = {
    es: {
      morning_empty: '¡Buenos días! Recuerda registrar tu desayuno para mantener el control de tus calorías.',
      morning_good: '¡Buen comienzo! Tu desayuno te deja bien encaminado para el día.',
      afternoon_low: `Llevas ${consumed} cal hoy. Aún tienes ${remaining} cal disponibles para el almuerzo y cena.`,
      afternoon_high: `Llevas ${consumed} cal. Considera opciones más ligeras para la cena.`,
      evening_deficit: `Hoy estás en déficit calórico. Perfecto si tu objetivo es bajar de peso.`,
      evening_surplus: `Hoy superaste tu objetivo por ${-remaining} cal. Mañana es un nuevo día.`,
      evening_balance: '¡Excelente! Hoy mantuviste un buen equilibrio calórico.',
    },
    en: {
      morning_empty: 'Good morning! Remember to log your breakfast to track your calories.',
      morning_good: 'Great start! Your breakfast sets you up well for the day.',
      afternoon_low: `You've had ${consumed} cal today. You still have ${remaining} cal for lunch and dinner.`,
      afternoon_high: `You've had ${consumed} cal. Consider lighter options for dinner.`,
      evening_deficit: `You're in a calorie deficit today. Perfect if your goal is weight loss.`,
      evening_surplus: `You exceeded your goal by ${-remaining} cal today. Tomorrow is a new day.`,
      evening_balance: 'Excellent! You maintained a good calorie balance today.',
    },
  };
  
  const lang = messages[language] ? language : 'en';
  const m = messages[lang];
  
  // Morning (6-11)
  if (currentHour >= 6 && currentHour < 12) {
    if (consumed === 0) return m.morning_empty;
    if (percentConsumed < 40) return m.morning_good;
  }
  
  // Afternoon (12-18)
  if (currentHour >= 12 && currentHour < 18) {
    if (percentConsumed < 70) return m.afternoon_low;
    if (percentConsumed > 85) return m.afternoon_high;
  }
  
  // Evening (18-23)
  if (currentHour >= 18) {
    if (remaining > profile.targetCalories * 0.15) return m.evening_deficit;
    if (remaining < -profile.targetCalories * 0.1) return m.evening_surplus;
    return m.evening_balance;
  }
  
  return null;
}

// ============================================
// WEEKLY NOTIFICATION
// ============================================

export async function getWeeklyMotivationalMessage(language: string): Promise<string> {
  const summary = await getWeekSummary();
  const profile = await getUserNutritionProfile();
  
  if (!profile || summary.daysTracked === 0) {
    const noData: { [lang: string]: string } = {
      es: '¡Nueva semana, nuevas oportunidades! Empieza a registrar tus comidas para ver tu progreso.',
      en: 'New week, new opportunities! Start logging your meals to see your progress.',
    };
    return noData[language] || noData.en;
  }
  
  const goalMessages: { [goal: string]: { [lang: string]: { success: string; partial: string; tryAgain: string } } } = {
    lose: {
      es: {
        success: `¡Felicitaciones! Esta semana tuviste ${summary.daysInDeficit} días en déficit calórico. ¡Sigue así!`,
        partial: `Buen trabajo. Tuviste ${summary.daysInDeficit} días en déficit. Cada día cuenta hacia tu meta.`,
        tryAgain: `Esta semana fue desafiante. Recuerda: pequeños cambios hacen grandes diferencias.`,
      },
      en: {
        success: `Congratulations! You had ${summary.daysInDeficit} days in calorie deficit this week. Keep it up!`,
        partial: `Good job. You had ${summary.daysInDeficit} days in deficit. Every day counts toward your goal.`,
        tryAgain: `This week was challenging. Remember: small changes make big differences.`,
      },
    },
    gain: {
      es: {
        success: `¡Felicitaciones! Esta semana tuviste ${summary.daysInSurplus} días en superávit. ¡Estás construyendo músculo!`,
        partial: `Buen progreso. Tuviste ${summary.daysInSurplus} días en superávit. Sigue alimentándote bien.`,
        tryAgain: `Intenta aumentar un poco las porciones esta semana para alcanzar tu objetivo.`,
      },
      en: {
        success: `Congratulations! You had ${summary.daysInSurplus} days in surplus this week. You're building muscle!`,
        partial: `Good progress. You had ${summary.daysInSurplus} days in surplus. Keep eating well.`,
        tryAgain: `Try increasing portions a bit this week to reach your goal.`,
      },
    },
    maintain: {
      es: {
        success: `¡Felicitaciones! Esta semana tuviste ${summary.daysInBalance} días en equilibrio. ¡Excelente control!`,
        partial: `Buen trabajo. Tuviste ${summary.daysInBalance} días en equilibrio. La consistencia es clave.`,
        tryAgain: `Ajusta un poco las porciones para mantener mejor el equilibrio calórico.`,
      },
      en: {
        success: `Congratulations! You had ${summary.daysInBalance} days in balance this week. Excellent control!`,
        partial: `Good job. You had ${summary.daysInBalance} days in balance. Consistency is key.`,
        tryAgain: `Adjust portions slightly to better maintain calorie balance.`,
      },
    },
  };
  
  const goalMsgs = goalMessages[profile.goal] || goalMessages.maintain;
  const msgs = goalMsgs[language] || goalMsgs.en;
  
  // Determine which message to show based on performance
  let relevantDays: number;
  if (profile.goal === 'lose') {
    relevantDays = summary.daysInDeficit;
  } else if (profile.goal === 'gain') {
    relevantDays = summary.daysInSurplus;
  } else {
    relevantDays = summary.daysInBalance;
  }
  
  const successRate = relevantDays / Math.max(summary.daysTracked, 1);
  
  if (successRate >= 0.7) return msgs.success;
  if (successRate >= 0.4) return msgs.partial;
  return msgs.tryAgain;
}
