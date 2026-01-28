import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LUNCH_REMINDER_KEY = 'lunch_reminder_enabled';
const DINNER_REMINDER_KEY = 'dinner_reminder_enabled';
const SNACK_REMINDER_KEY = 'snack_reminder_enabled';
const FRIDAY_REMINDER_KEY = 'friday_reminder_enabled';
const USER_ID_KEY = 'userId';
const SMART_NOTIFICATION_CACHE_KEY = 'smart_notification_cache';
const LAST_WEIGHT_CHECK_KEY = 'last_weight_check_month';

// Custom time keys
const LUNCH_TIME_KEY = 'lunch_reminder_time';
const DINNER_TIME_KEY = 'dinner_reminder_time';
const SNACK_TIME_KEY = 'snack_reminder_time';
const FRIDAY_TIME_KEY = 'friday_reminder_time';

// Default times
export const DEFAULT_LUNCH_HOUR = 10;
export const DEFAULT_LUNCH_MINUTE = 0;
export const DEFAULT_DINNER_HOUR = 20; // Changed from 18 to 20
export const DEFAULT_DINNER_MINUTE = 0;
export const DEFAULT_SNACK_HOUR = 15;
export const DEFAULT_SNACK_MINUTE = 30;
export const DEFAULT_FRIDAY_HOUR = 19;
export const DEFAULT_FRIDAY_MINUTE = 0;

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Helper functions to get/set custom times
export async function getReminderTime(type: 'lunch' | 'dinner' | 'snack' | 'friday'): Promise<{ hour: number; minute: number }> {
  const key = {
    lunch: LUNCH_TIME_KEY,
    dinner: DINNER_TIME_KEY,
    snack: SNACK_TIME_KEY,
    friday: FRIDAY_TIME_KEY,
  }[type];
  
  const defaults = {
    lunch: { hour: DEFAULT_LUNCH_HOUR, minute: DEFAULT_LUNCH_MINUTE },
    dinner: { hour: DEFAULT_DINNER_HOUR, minute: DEFAULT_DINNER_MINUTE },
    snack: { hour: DEFAULT_SNACK_HOUR, minute: DEFAULT_SNACK_MINUTE },
    friday: { hour: DEFAULT_FRIDAY_HOUR, minute: DEFAULT_FRIDAY_MINUTE },
  }[type];
  
  try {
    const stored = await AsyncStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.log('Error getting reminder time:', e);
  }
  return defaults;
}

export async function setReminderTime(type: 'lunch' | 'dinner' | 'snack' | 'friday', hour: number, minute: number): Promise<void> {
  const key = {
    lunch: LUNCH_TIME_KEY,
    dinner: DINNER_TIME_KEY,
    snack: SNACK_TIME_KEY,
    friday: FRIDAY_TIME_KEY,
  }[type];
  
  await AsyncStorage.setItem(key, JSON.stringify({ hour, minute }));
}

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('meal-reminders', {
      name: 'Meal Reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B6B',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

/**
 * Get user's country/region for local snack recommendations
 */
async function getUserRegion(): Promise<string> {
  try {
    const region = await AsyncStorage.getItem('user_region');
    return region || 'other';
  } catch {
    return 'other';
  }
}

/**
 * Get smart snack suggestions based on region and nutritional needs
 */
function getSnackSuggestions(region: string, language: string): string[] {
  const snacksByRegion: Record<string, { en: string[]; es: string[] }> = {
    latam: {
      en: ['Banana', 'Mango', 'Papaya', 'Avocado toast', 'Mixed nuts', 'Greek yogurt', 'Apple with peanut butter'],
      es: ['Banana', 'Mango', 'Papaya', 'Tostada con palta', 'Mix de frutos secos', 'Yogur griego', 'Manzana con mantequilla de maní'],
    },
    northam: {
      en: ['Apple', 'Almonds', 'String cheese', 'Celery with hummus', 'Trail mix', 'Protein bar', 'Berries'],
      es: ['Manzana', 'Almendras', 'Queso en tiras', 'Apio con hummus', 'Mix de frutos secos', 'Barra de proteína', 'Frutos rojos'],
    },
    europe: {
      en: ['Orange', 'Walnuts', 'Dark chocolate', 'Olives', 'Rice cakes', 'Cottage cheese', 'Pear'],
      es: ['Naranja', 'Nueces', 'Chocolate negro', 'Aceitunas', 'Tortitas de arroz', 'Requesón', 'Pera'],
    },
    asia: {
      en: ['Edamame', 'Mango', 'Rice cakes', 'Seaweed snacks', 'Lychee', 'Green tea', 'Dragon fruit'],
      es: ['Edamame', 'Mango', 'Tortitas de arroz', 'Snacks de alga', 'Lichi', 'Té verde', 'Pitaya'],
    },
    oceania: {
      en: ['Kiwi', 'Macadamia nuts', 'Vegemite toast', 'Greek yogurt', 'Banana', 'Avocado', 'Berries'],
      es: ['Kiwi', 'Nueces de macadamia', 'Tostada', 'Yogur griego', 'Banana', 'Palta', 'Frutos rojos'],
    },
    other: {
      en: ['Apple', 'Banana', 'Mixed nuts', 'Greek yogurt', 'Carrot sticks', 'Protein bar', 'Orange'],
      es: ['Manzana', 'Banana', 'Mix de frutos secos', 'Yogur griego', 'Palitos de zanahoria', 'Barra de proteína', 'Naranja'],
    },
  };

  const regionSnacks = snacksByRegion[region] || snacksByRegion.other;
  const langSnacks = language === 'es' ? regionSnacks.es : regionSnacks.en;
  
  // Return 2-3 random suggestions
  const shuffled = langSnacks.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3);
}

/**
 * Fetch smart notification content from server
 */
async function getSmartNotificationContent(
  mealType: 'lunch' | 'dinner',
  language: string
): Promise<{ title: string; body: string; suggestedRecipes?: string[] } | null> {
  try {
    const userId = await AsyncStorage.getItem(USER_ID_KEY);
    if (!userId) return null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${API_URL}/api/users/${userId}/smart-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, mealType, language }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        
        await AsyncStorage.setItem(
          `${SMART_NOTIFICATION_CACHE_KEY}_${mealType}`,
          JSON.stringify({ ...data, timestamp: Date.now() })
        );

        const title = mealType === 'lunch'
          ? (language === 'es' ? '🍽️ ¡Hora del almuerzo!' : '🍽️ Lunch time!')
          : (language === 'es' ? '🌙 ¡Hora de la cena!' : '🌙 Dinner time!');

        return { 
          title, 
          body: data.message,
          suggestedRecipes: data.suggestedRecipes || []
        };
      }
    } catch (fetchError) {
      console.log('[Notifications] Server fetch failed, using cache');
    }

    // Fallback to cache
    const cached = await AsyncStorage.getItem(`${SMART_NOTIFICATION_CACHE_KEY}_${mealType}`);
    if (cached) {
      const data = JSON.parse(cached);
      if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
        const title = mealType === 'lunch'
          ? (language === 'es' ? '🍽️ ¡Hora del almuerzo!' : '🍽️ Lunch time!')
          : (language === 'es' ? '🌙 ¡Hora de la cena!' : '🌙 Dinner time!');
        return { 
          title, 
          body: data.message,
          suggestedRecipes: data.suggestedRecipes || []
        };
      }
    }

    return null;
  } catch (error) {
    console.error('[Notifications] Error getting smart content:', error);
    return null;
  }
}

function getFallbackContent(mealType: 'lunch' | 'dinner', language: string): { title: string; body: string } {
  if (mealType === 'lunch') {
    return {
      title: language === 'es' ? '🍽️ ¡Hora de planear tu almuerzo!' : '🍽️ Time to plan your lunch!',
      body: language === 'es' 
        ? '¿Qué vas a comer hoy? Abrí Snapfood para ver sugerencias saludables.'
        : "What are you having today? Open Snapfood for healthy suggestions.",
    };
  } else {
    return {
      title: language === 'es' ? '🌙 ¡Hora de planear tu cena!' : '🌙 Time to plan your dinner!',
      body: language === 'es' 
        ? '¿Ya sabés qué cenar? Revisá tu día y elegí algo nutritivo.'
        : "Know what's for dinner? Check your day and pick something nutritious.",
    };
  }
}

export async function scheduleLunchReminder(enabled: boolean, language: string = 'en'): Promise<void> {
  const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of allNotifications) {
    if (notification.identifier.startsWith('lunch-')) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }

  if (!enabled) {
    await AsyncStorage.setItem(LUNCH_REMINDER_KEY, 'false');
    return;
  }

  await AsyncStorage.setItem(LUNCH_REMINDER_KEY, 'true');

  const smartContent = await getSmartNotificationContent('lunch', language);
  const content = smartContent || { ...getFallbackContent('lunch', language), suggestedRecipes: [] };
  const time = await getReminderTime('lunch');

  await Notifications.scheduleNotificationAsync({
    identifier: 'lunch-reminder',
    content: {
      title: content.title,
      body: content.body,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
      data: { 
        type: 'smart_lunch', 
        language,
        suggestedRecipes: content.suggestedRecipes || [],
        navigateTo: 'cooking'
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: time.hour,
      minute: time.minute,
    },
  });
}

export async function scheduleDinnerReminder(enabled: boolean, language: string = 'en'): Promise<void> {
  const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of allNotifications) {
    if (notification.identifier.startsWith('dinner-')) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }

  if (!enabled) {
    await AsyncStorage.setItem(DINNER_REMINDER_KEY, 'false');
    return;
  }

  await AsyncStorage.setItem(DINNER_REMINDER_KEY, 'true');

  const smartContent = await getSmartNotificationContent('dinner', language);
  const content = smartContent || { ...getFallbackContent('dinner', language), suggestedRecipes: [] };
  const time = await getReminderTime('dinner');

  await Notifications.scheduleNotificationAsync({
    identifier: 'dinner-reminder',
    content: {
      title: content.title,
      body: content.body,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
      data: { 
        type: 'smart_dinner', 
        language,
        suggestedRecipes: content.suggestedRecipes || [],
        navigateTo: 'cooking'
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: time.hour,
      minute: time.minute,
    },
  });
}

/**
 * Schedule snack reminder (3:30 PM - between lunch and dinner)
 */
export async function scheduleSnackReminder(enabled: boolean, language: string = 'en'): Promise<void> {
  const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of allNotifications) {
    if (notification.identifier.startsWith('snack-')) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }

  if (!enabled) {
    await AsyncStorage.setItem(SNACK_REMINDER_KEY, 'false');
    return;
  }

  await AsyncStorage.setItem(SNACK_REMINDER_KEY, 'true');

  const region = await getUserRegion();
  const snacks = getSnackSuggestions(region, language);
  const time = await getReminderTime('snack');
  
  const title = language === 'es' ? '🍎 ¡Hora del snack!' : '🍎 Snack time!';
  const body = language === 'es'
    ? `Un snack saludable te da energía. Prueba: ${snacks.join(', ')}`
    : `A healthy snack boosts your energy. Try: ${snacks.join(', ')}`;

  await Notifications.scheduleNotificationAsync({
    identifier: 'snack-reminder',
    content: {
      title,
      body,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.DEFAULT,
      data: { type: 'snack', language },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: time.hour,
      minute: time.minute,
    },
  });
}

/**
 * Schedule Friday night balance reminder (Friday at 7 PM)
 */
export async function scheduleFridayReminder(enabled: boolean, language: string = 'en'): Promise<void> {
  const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of allNotifications) {
    if (notification.identifier.startsWith('friday-')) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }

  if (!enabled) {
    await AsyncStorage.setItem(FRIDAY_REMINDER_KEY, 'false');
    return;
  }

  await AsyncStorage.setItem(FRIDAY_REMINDER_KEY, 'true');

  const title = language === 'es' ? '🎉 ¡Es viernes!' : '🎉 It\'s Friday!';
  const body = language === 'es'
    ? 'Disfrutá tu fin de semana, pero recordá mantener el equilibrio. Un exceso hoy no arruina tu progreso si volvés al plan mañana. ¡Vos podés! 💪'
    : 'Enjoy your weekend, but remember balance is key. One indulgence won\'t ruin your progress if you get back on track tomorrow. You got this! 💪';

  const time = await getReminderTime('friday');

  await Notifications.scheduleNotificationAsync({
    identifier: 'friday-balance',
    content: {
      title,
      body,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.DEFAULT,
      data: { type: 'friday_balance', language },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 6, // Friday (1 = Sunday, 6 = Friday)
      hour: time.hour,
      minute: time.minute,
    },
  });
}

/**
 * Check if it's end of month and prompt for weight update
 */
export async function checkMonthlyWeightReminder(language: string = 'en'): Promise<boolean> {
  try {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${now.getMonth()}`;
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    
    // Check on the last 3 days of the month
    if (dayOfMonth < daysInMonth - 2) {
      return false;
    }

    const lastCheck = await AsyncStorage.getItem(LAST_WEIGHT_CHECK_KEY);
    if (lastCheck === currentMonth) {
      return false; // Already checked this month
    }

    // Mark as checked
    await AsyncStorage.setItem(LAST_WEIGHT_CHECK_KEY, currentMonth);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get monthly check-in notification content
 */
export function getMonthlyCheckInContent(language: string): { title: string; body: string } {
  return {
    title: language === 'es' ? '📊 ¡Fin de mes!' : '📊 End of month!',
    body: language === 'es'
      ? '¿Cómo te fue este mes? Actualizá tu peso y revisá si querés ajustar tu plan.'
      : 'How did this month go? Update your weight and check if you want to adjust your plan.',
  };
}

export async function refreshSmartNotifications(language: string = 'en'): Promise<void> {
  const lunchEnabled = await getLunchReminderStatus();
  const dinnerEnabled = await getDinnerReminderStatus();
  const snackEnabled = await getSnackReminderStatus();
  const fridayEnabled = await getFridayReminderStatus();

  if (lunchEnabled) await scheduleLunchReminder(true, language);
  if (dinnerEnabled) await scheduleDinnerReminder(true, language);
  if (snackEnabled) await scheduleSnackReminder(true, language);
  if (fridayEnabled) await scheduleFridayReminder(true, language);
}

export async function getLunchReminderStatus(): Promise<boolean> {
  const status = await AsyncStorage.getItem(LUNCH_REMINDER_KEY);
  return status === 'true';
}

export async function getDinnerReminderStatus(): Promise<boolean> {
  const status = await AsyncStorage.getItem(DINNER_REMINDER_KEY);
  return status === 'true';
}

export async function getSnackReminderStatus(): Promise<boolean> {
  const status = await AsyncStorage.getItem(SNACK_REMINDER_KEY);
  return status === 'true';
}

export async function getFridayReminderStatus(): Promise<boolean> {
  const status = await AsyncStorage.getItem(FRIDAY_REMINDER_KEY);
  return status === 'true';
}

export async function sendTestNotification(language: string = 'en'): Promise<void> {
  const title = language === 'es' ? '🎉 ¡Notificaciones activadas!' : '🎉 Notifications enabled!';
  const body = language === 'es' 
    ? 'Recibirás recordatorios inteligentes para tus comidas.'
    : "You'll receive smart reminders for your meals.";

  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null,
  });
}

export async function sendSmartNotificationNow(
  mealType: 'lunch' | 'dinner',
  language: string = 'en'
): Promise<void> {
  const smartContent = await getSmartNotificationContent(mealType, language);
  const content = smartContent || getFallbackContent(mealType, language);

  await Notifications.scheduleNotificationAsync({
    content: { title: content.title, body: content.body, sound: true },
    trigger: null,
  });
}

// ============================================
// WEEKLY MOTIVATIONAL NOTIFICATION
// ============================================

const WEEKLY_NOTIFICATION_KEY = 'weekly_notification_enabled';

export async function getWeeklyReminderStatus(): Promise<boolean> {
  const status = await AsyncStorage.getItem(WEEKLY_NOTIFICATION_KEY);
  return status === 'true';
}

export async function scheduleWeeklyMotivationalNotification(
  enabled: boolean,
  language: string = 'en',
  goal: 'lose' | 'maintain' | 'gain' = 'maintain'
): Promise<void> {
  // Cancel existing weekly notifications
  const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of allNotifications) {
    if (notification.identifier.startsWith('weekly-')) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }

  if (!enabled) {
    await AsyncStorage.setItem(WEEKLY_NOTIFICATION_KEY, 'false');
    return;
  }

  await AsyncStorage.setItem(WEEKLY_NOTIFICATION_KEY, 'true');

  // Get motivational message based on goal
  let title = '';
  let body = '';

  if (language === 'es') {
    title = '📊 ¡Tu resumen semanal!';
    if (goal === 'lose') {
      body = 'Revisá cómo fue tu semana en tu Ficha Personal. Cada día en déficit te acerca a tu meta. ¡Seguí así!';
    } else if (goal === 'gain') {
      body = 'Revisá tu progreso semanal. Cada día en superávit te ayuda a ganar masa muscular. ¡Vamos por más!';
    } else {
      body = 'Mirá tu resumen semanal en tu Ficha Personal. Mantener el equilibrio es clave para tu bienestar.';
    }
  } else {
    title = '📊 Your weekly summary!';
    if (goal === 'lose') {
      body = "Check your weekly progress in your Profile. Every day in deficit brings you closer to your goal. Keep it up!";
    } else if (goal === 'gain') {
      body = "Review your weekly progress. Every day in surplus helps you build muscle. Let's keep going!";
    } else {
      body = "Check your weekly summary in your Profile. Maintaining balance is key to your wellbeing.";
    }
  }

  // Schedule for Sunday at 8 PM (end of week review)
  await Notifications.scheduleNotificationAsync({
    identifier: 'weekly-motivation',
    content: {
      title,
      body,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.DEFAULT,
      data: { type: 'weekly_summary', language, goal },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1, // Sunday (1 = Sunday)
      hour: 20,
      minute: 0,
    },
  });

  console.log('[Notifications] Weekly motivational notification scheduled for Sundays at 8 PM');
}

