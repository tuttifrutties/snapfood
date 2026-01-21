/**
 * Theme Context
 * Manages app themes: Light/Dark mode + accent colors
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = 'app_theme';
const ACCENT_COLOR_KEY = 'app_accent_color';

// Theme modes
export type ThemeMode = 'light' | 'dark';

// Accent color options
export interface AccentColor {
  id: string;
  name: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
}

export const ACCENT_COLORS: AccentColor[] = [
  { id: 'coral', name: 'Coral', primary: '#FF6B6B', primaryLight: '#FF8E8E', primaryDark: '#E55555' },
  { id: 'blue', name: 'Azul', primary: '#4A90D9', primaryLight: '#6BA8E8', primaryDark: '#3A7BC8' },
  { id: 'green', name: 'Verde', primary: '#4CAF50', primaryLight: '#6EC071', primaryDark: '#3D9141' },
  { id: 'purple', name: 'Púrpura', primary: '#9C27B0', primaryLight: '#BA68C8', primaryDark: '#7B1FA2' },
  { id: 'orange', name: 'Naranja', primary: '#FF9800', primaryLight: '#FFB74D', primaryDark: '#F57C00' },
  { id: 'teal', name: 'Turquesa', primary: '#009688', primaryLight: '#4DB6AC', primaryDark: '#00796B' },
  { id: 'pink', name: 'Rosa', primary: '#E91E63', primaryLight: '#F06292', primaryDark: '#C2185B' },
  { id: 'indigo', name: 'Índigo', primary: '#3F51B5', primaryLight: '#7986CB', primaryDark: '#303F9F' },
];

// Theme colors interface
export interface ThemeColors {
  // Mode
  mode: ThemeMode;
  
  // Backgrounds
  background: string;
  surface: string;
  surfaceVariant: string;
  card: string;
  
  // Text
  text: string;
  textSecondary: string;
  textMuted: string;
  
  // Accent (from selected color)
  primary: string;
  primaryLight: string;
  primaryDark: string;
  
  // Status colors
  success: string;
  warning: string;
  error: string;
  
  // UI elements
  border: string;
  divider: string;
  icon: string;
  iconMuted: string;
  
  // Special
  premium: string;
  overlay: string;
}

// Light theme base
const lightBase: Omit<ThemeColors, 'primary' | 'primaryLight' | 'primaryDark' | 'mode'> = {
  background: '#F5F5F5',
  surface: '#FFFFFF',
  surfaceVariant: '#F0F0F0',
  card: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#555555',
  textMuted: '#888888',
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#F44336',
  border: '#E0E0E0',
  divider: '#EEEEEE',
  icon: '#333333',
  iconMuted: '#999999',
  premium: '#FFD700',
  overlay: 'rgba(0,0,0,0.5)',
};

// Dark theme base
const darkBase: Omit<ThemeColors, 'primary' | 'primaryLight' | 'primaryDark' | 'mode'> = {
  background: '#0C0C0C',
  surface: '#1A1A1A',
  surfaceVariant: '#252525',
  card: '#1A1A1A',
  text: '#FFFFFF',
  textSecondary: '#AAAAAA',
  textMuted: '#666666',
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#F44336',
  border: '#333333',
  divider: '#2A2A2A',
  icon: '#FFFFFF',
  iconMuted: '#666666',
  premium: '#FFD700',
  overlay: 'rgba(0,0,0,0.7)',
};

// Build complete theme
const buildTheme = (mode: ThemeMode, accent: AccentColor): ThemeColors => {
  const base = mode === 'light' ? lightBase : darkBase;
  return {
    mode,
    ...base,
    primary: accent.primary,
    primaryLight: accent.primaryLight,
    primaryDark: accent.primaryDark,
  };
};

// Context interface
interface ThemeContextType {
  theme: ThemeColors;
  themeMode: ThemeMode;
  accentColor: AccentColor;
  setThemeMode: (mode: ThemeMode) => void;
  setAccentColor: (colorId: string) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Provider component
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [accentColor, setAccentColorState] = useState<AccentColor>(ACCENT_COLORS[0]);
  const [theme, setTheme] = useState<ThemeColors>(buildTheme('dark', ACCENT_COLORS[0]));

  // Load saved preferences
  useEffect(() => {
    loadThemePreferences();
  }, []);

  const loadThemePreferences = async () => {
    try {
      const [savedMode, savedAccent] = await Promise.all([
        AsyncStorage.getItem(THEME_STORAGE_KEY),
        AsyncStorage.getItem(ACCENT_COLOR_KEY),
      ]);

      const mode: ThemeMode = (savedMode as ThemeMode) || 'dark';
      const accent = ACCENT_COLORS.find(c => c.id === savedAccent) || ACCENT_COLORS[0];

      setThemeModeState(mode);
      setAccentColorState(accent);
      setTheme(buildTheme(mode, accent));
    } catch (error) {
      console.error('[Theme] Error loading preferences:', error);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    setTheme(buildTheme(mode, accentColor));
    await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
  };

  const setAccentColor = async (colorId: string) => {
    const accent = ACCENT_COLORS.find(c => c.id === colorId) || ACCENT_COLORS[0];
    setAccentColorState(accent);
    setTheme(buildTheme(themeMode, accent));
    await AsyncStorage.setItem(ACCENT_COLOR_KEY, colorId);
  };

  const toggleTheme = () => {
    setThemeMode(themeMode === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      themeMode,
      accentColor,
      setThemeMode,
      setAccentColor,
      toggleTheme,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook to use theme
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Default export for convenience
export default ThemeContext;
