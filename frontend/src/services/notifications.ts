import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LUNCH_REMINDER_KEY = 'lunch_reminder_enabled';
const DINNER_REMINDER_KEY = 'dinner_reminder_enabled';
const USER_ID_KEY = 'userId';
const SMART_NOTIFICATION_CACHE_KEY = 'smart_notification_cache';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

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
 * Fetch smart notification content from server
 * Falls back to cached data if server is unavailable
 */
async function getSmartNotificationContent(
  mealType: 'lunch' | 'dinner',
  language: string
): Promise<{ title: string; body: string } | null> {
  try {
    const userId = await AsyncStorage.getItem(USER_ID_KEY);
    if (!userId) {
      console.log('[Notifications] No userId found');
      return null;
    }

    // Try to fetch from server
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

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
        
        // Cache the response
        await AsyncStorage.setItem(
          `${SMART_NOTIFICATION_CACHE_KEY}_${mealType}`,
          JSON.stringify({ ...data, timestamp: Date.now() })
        );

        const title = mealType === 'lunch'
          ? (language === 'es' ? '🍽️ ¡Hora del almuerzo!' : '🍽️ Lunch time!')
          : (language === 'es' ? '🌙 ¡Hora de la cena!' : '🌙 Dinner time!');

        return { title, body: data.message };
      }
    } catch (fetchError) {
      console.log('[Notifications] Server fetch failed, using cache');
    }

    // Fallback to cache
    const cached = await AsyncStorage.getItem(`${SMART_NOTIFICATION_CACHE_KEY}_${mealType}`);
    if (cached) {
      const data = JSON.parse(cached);
      // Use cache if it's less than 24 hours old
      if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
        const title = mealType === 'lunch'
          ? (language === 'es' ? '🍽️ ¡Hora del almuerzo!' : '🍽️ Lunch time!')
          : (language === 'es' ? '🌙 ¡Hora de la cena!' : '🌙 Dinner time!');
        return { title, body: data.message };
      }
    }

    return null;
  } catch (error) {
    console.error('[Notifications] Error getting smart content:', error);
    return null;
  }
}

/**
 * Get fallback notification content (when smart notifications aren't available)
 */
function getFallbackContent(mealType: 'lunch' | 'dinner', language: string): { title: string; body: string } {
  if (mealType === 'lunch') {
    return {
      title: language === 'es' ? '🍽️ ¡Hora de planear tu almuerzo!' : '🍽️ Time to plan your lunch!',
      body: language === 'es' 
        ? '¿Qué vas a comer hoy? Abre FoodSnap para ver sugerencias saludables.'
        : "What are you having today? Open FoodSnap for healthy suggestions.",
    };
  } else {
    return {
      title: language === 'es' ? '🌙 ¡Hora de planear tu cena!' : '🌙 Time to plan your dinner!',
      body: language === 'es' 
        ? '¿Ya sabes qué cenar? Revisa tu día y elige algo nutritivo.'
        : "Know what's for dinner? Check your day and pick something nutritious.",
    };
  }
}

export async function scheduleLunchReminder(enabled: boolean, language: string = 'en'): Promise<void> {
  // Cancel existing lunch reminders
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

  // Try to get smart content, fallback to default
  const smartContent = await getSmartNotificationContent('lunch', language);
  const content = smartContent || getFallbackContent('lunch', language);

  // Schedule for 10:00 AM every day (2 hours before typical lunch)
  await Notifications.scheduleNotificationAsync({
    identifier: 'lunch-reminder',
    content: {
      title: content.title,
      body: content.body,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
      data: { type: 'smart_lunch', language },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 10,
      minute: 0,
    },
  });
}

export async function scheduleDinnerReminder(enabled: boolean, language: string = 'en'): Promise<void> {
  // Cancel existing dinner reminders
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

  // Try to get smart content, fallback to default
  const smartContent = await getSmartNotificationContent('dinner', language);
  const content = smartContent || getFallbackContent('dinner', language);

  // Schedule for 6:00 PM every day (2 hours before typical dinner)
  await Notifications.scheduleNotificationAsync({
    identifier: 'dinner-reminder',
    content: {
      title: content.title,
      body: content.body,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
      data: { type: 'smart_dinner', language },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 18,
      minute: 0,
    },
  });
}

/**
 * Update notifications with fresh smart content
 * Call this when app opens or when meals/ingredients change
 */
export async function refreshSmartNotifications(language: string = 'en'): Promise<void> {
  const lunchEnabled = await getLunchReminderStatus();
  const dinnerEnabled = await getDinnerReminderStatus();

  if (lunchEnabled) {
    await scheduleLunchReminder(true, language);
  }
  if (dinnerEnabled) {
    await scheduleDinnerReminder(true, language);
  }
}

export async function getLunchReminderStatus(): Promise<boolean> {
  const status = await AsyncStorage.getItem(LUNCH_REMINDER_KEY);
  return status === 'true';
}

export async function getDinnerReminderStatus(): Promise<boolean> {
  const status = await AsyncStorage.getItem(DINNER_REMINDER_KEY);
  return status === 'true';
}

export async function sendTestNotification(language: string = 'en'): Promise<void> {
  const title = language === 'es' ? '🎉 ¡Notificaciones activadas!' : '🎉 Notifications enabled!';
  const body = language === 'es' 
    ? 'Recibirás recordatorios inteligentes para el almuerzo y la cena.'
    : "You'll receive smart reminders for lunch and dinner.";

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger: null, // Send immediately
  });
}

/**
 * Send an immediate smart notification (for testing)
 */
export async function sendSmartNotificationNow(
  mealType: 'lunch' | 'dinner',
  language: string = 'en'
): Promise<void> {
  const smartContent = await getSmartNotificationContent(mealType, language);
  const content = smartContent || getFallbackContent(mealType, language);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: content.title,
      body: content.body,
      sound: true,
    },
    trigger: null, // Send immediately
  });
}
