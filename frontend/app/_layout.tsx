import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { UserProvider } from '../src/contexts/UserContext';
import { PremiumProvider } from '../src/contexts/PremiumContext';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import React, { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Platform, AppState } from 'react-native';
import initI18n from '../src/i18n';
import * as NavigationBar from 'expo-navigation-bar';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { refreshSmartNotifications, registerForPushNotificationsAsync } from '../src/services/notifications';
import i18n from 'i18next';

// Error boundary component to catch crashes
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>
            {this.state.error?.message || 'Unknown error'}
          </Text>
          <Text style={styles.errorHint}>Please restart the app</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

// Key for storing notification recipes to show in cooking screen
const NOTIFICATION_RECIPES_KEY = 'notification_suggested_recipes';

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const initialize = async () => {
      try {
        await initI18n();
        
        // Configure Android navigation bar for immersive mode
        if (Platform.OS === 'android') {
          try {
            // Set navigation bar behavior - hide on swipe, show on gesture
            await NavigationBar.setVisibilityAsync('hidden');
            await NavigationBar.setBehaviorAsync('overlay-swipe');
            await NavigationBar.setBackgroundColorAsync('#00000000'); // Transparent
          } catch (navError) {
            console.log('[RootLayout] Navigation bar config error:', navError);
          }
        }
        
        // Register for push notifications and refresh scheduled notifications
        try {
          await registerForPushNotificationsAsync();
          const language = i18n.language || 'es';
          await refreshSmartNotifications(language);
          console.log('[RootLayout] Notifications refreshed on app start');
        } catch (notifError) {
          console.log('[RootLayout] Notification setup error:', notifError);
        }
        
        setI18nReady(true);
      } catch (error) {
        console.error('[RootLayout] init error:', error);
        // Continue anyway with default language
        setI18nReady(true);
      }
    };

    initialize();
    
    // Also refresh notifications when app comes back to foreground
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('[RootLayout] App came to foreground, refreshing notifications');
        try {
          const language = i18n.language || 'es';
          await refreshSmartNotifications(language);
        } catch (e) {
          console.log('[RootLayout] Error refreshing notifications:', e);
        }
      }
      appState.current = nextAppState;
    });
    
    // Handle notification tap - this fires when user taps a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(async (response) => {
      console.log('[Notification] User tapped notification:', response);
      const data = response.notification.request.content.data;
      
      if (data?.navigateTo === 'cooking') {
        // Store the suggested recipes so cooking screen can pick them up
        if (data?.suggestedRecipes && Array.isArray(data.suggestedRecipes) && data.suggestedRecipes.length > 0) {
          await AsyncStorage.setItem(
            NOTIFICATION_RECIPES_KEY,
            JSON.stringify({
              recipes: data.suggestedRecipes,
              timestamp: Date.now(),
              mealType: data.type === 'smart_lunch' ? 'lunch' : 'dinner'
            })
          );
          console.log('[Notification] Stored suggested recipes:', data.suggestedRecipes);
        }
        
        // Navigate to cooking screen
        // Using a small delay to ensure the app is fully loaded
        setTimeout(() => {
          try {
            const router = require('expo-router').router;
            router.push('/cooking');
            console.log('[Notification] Navigated to /cooking');
          } catch (navError) {
            console.log('[Notification] Navigation error:', navError);
          }
        }, 500);
      }
    });

    return () => {
      subscription.remove();
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  if (!i18nReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <UserProvider>
          <PremiumProvider>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="paywall" />
              <Stack.Screen name="cooking" />
              <Stack.Screen name="track-food" />
              <Stack.Screen name="legal" />
              <Stack.Screen name="profile" />
            </Stack>
          </PremiumProvider>
        </UserProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#0c0c0c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#0c0c0c',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'theme.primary',
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorHint: {
    fontSize: 16,
    color: '#fff',
  },
});
