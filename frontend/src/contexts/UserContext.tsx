import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Helper function for fetch with timeout
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 10000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
};

interface UserContextType {
  userId: string | null;
  isPremium: boolean;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;
  createUser: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  setPremium: (premium: boolean) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
    initializeUser();
  }, []);

  const initializeUser = async () => {
    try {
      console.log('[UserContext] Starting initialization...');
      const storedUserId = await AsyncStorage.getItem('userId');
      const onboardingComplete = await AsyncStorage.getItem('onboardingComplete');
      const storedPremium = await AsyncStorage.getItem('isPremium');
      
      // Set premium from local storage first
      if (storedPremium === 'true') {
        setIsPremium(true);
      }
      
      if (storedUserId) {
        console.log('[UserContext] Found stored user:', storedUserId);
        setUserId(storedUserId);
        setHasCompletedOnboarding(onboardingComplete === 'true');
        // Don't await this - let it run in background
        refreshUser(storedUserId).catch(console.error);
      } else {
        console.log('[UserContext] No stored user, creating new...');
        await createUser();
      }
    } catch (error) {
      console.error('[UserContext] Failed to initialize user:', error);
      // Even on error, we should stop loading to prevent infinite hang
    } finally {
      console.log('[UserContext] Initialization complete');
      setIsLoading(false);
    }
  };

  const createUser = async () => {
    try {
      console.log('[UserContext] Creating new user...');
      const response = await fetchWithTimeout(`${API_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }, 15000); // 15 second timeout
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      
      const data = await response.json();
      await AsyncStorage.setItem('userId', data.userId);
      setUserId(data.userId);
      setIsPremium(data.isPremium);
      console.log('[UserContext] User created:', data.userId);
    } catch (error) {
      console.error('[UserContext] Failed to create user:', error);
      // Generate a local UUID as fallback
      const fallbackId = 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      await AsyncStorage.setItem('userId', fallbackId);
      setUserId(fallbackId);
      console.log('[UserContext] Using fallback user ID:', fallbackId);
    }
  };

  const refreshUser = async (id?: string) => {
    const targetId = id || userId;
    if (!targetId) return;
    
    try {
      const response = await fetch(`${API_URL}/api/users/${targetId}`);
      const data = await response.json();
      setIsPremium(data.isPremium || false);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const completeOnboarding = async () => {
    await AsyncStorage.setItem('onboardingComplete', 'true');
    setHasCompletedOnboarding(true);
  };

  const setPremium = async (premium: boolean) => {
    try {
      // Update locally first for immediate UI feedback
      console.log('Setting premium to:', premium);
      setIsPremium(premium);
      await AsyncStorage.setItem('isPremium', premium.toString());
      console.log('Premium state updated successfully');
      
      // Then update on server if userId exists
      if (userId) {
        const response = await fetch(`${API_URL}/api/users/${userId}/premium?is_premium=${premium}`, {
          method: 'PATCH',
        });
        
        if (!response.ok) {
          console.error('Server error updating premium');
        }
      }
    } catch (error) {
      console.error('Failed to update premium status:', error);
      // Keep the local state even if server fails
    }
  };

  return (
    <UserContext.Provider
      value={{
        userId,
        isPremium,
        isLoading,
        hasCompletedOnboarding,
        createUser,
        completeOnboarding,
        setPremium,
        refreshUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}