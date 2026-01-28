import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { UserProvider } from '../src/contexts/UserContext';
import { PremiumProvider } from '../src/contexts/PremiumContext';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import React, { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Platform } from 'react-native';
import initI18n from '../src/i18n';
import * as NavigationBar from 'expo-navigation-bar';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    const initialize = async () => {
      try {
        await initI18n();
        
        // Configure Android navigation bar for immersive mode
        if (Platform.OS === 'android') {
          // Set navigation bar behavior - hide on swipe, show on gesture
          await NavigationBar.setVisibilityAsync('hidden');
          await NavigationBar.setBehaviorAsync('overlay-swipe');
          await NavigationBar.setBackgroundColorAsync('#00000000'); // Transparent
        }
        
        setI18nReady(true);
      } catch (error) {
        console.error('[RootLayout] init error:', error);
        // Continue anyway with default language
        setI18nReady(true);
      }
    };

    initialize();
    
    // Handle notification tap - this fires when user taps a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(async (response) => {
      console.log('[Notification] User tapped notification:', response);
      const data = response.notification.request.content.data;
      
      if (data?.navigateTo === 'cooking' && data?.suggestedRecipes) {
        // Store the suggested recipes so cooking screen can pick them up
        await AsyncStorage.setItem(
          NOTIFICATION_RECIPES_KEY,
          JSON.stringify({
            recipes: data.suggestedRecipes,
            timestamp: Date.now(),
            mealType: data.type === 'smart_lunch' ? 'lunch' : 'dinner'
          })
        );
        console.log('[Notification] Stored suggested recipes for cooking screen');
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
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
    color: '#FF6B6B',
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
