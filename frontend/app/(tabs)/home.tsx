import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../../src/contexts/UserContext';
import { usePremium } from '../../src/contexts/PremiumContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function HomeScreen() {
  const { userId } = useUser();
  const { isPremium } = usePremium();
  const { theme } = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [todayCount, setTodayCount] = useState(0);

  const checkTodayCount = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await fetch(`${API_URL}/api/analysis-count/${userId}/today`);
      const data = await response.json();
      console.log('[Home] Today analysis count:', data.count);
      setTodayCount(data.count);
    } catch (error) {
      console.error('Failed to check today count:', error);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      checkTodayCount();
    }, [checkTodayCount])
  );

  const handleTrackFood = () => {
    if (!isPremium && todayCount >= 2) {
      Alert.alert(
        t('home.dailyLimitReached'),
        t('home.upgradeForUnlimited'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('history.upgradeNow'), onPress: () => router.push('/paywall') },
        ]
      );
      return;
    }
    router.push('/track-food');
  };

  const handleWhatToCook = () => {
    if (!isPremium) {
      Alert.alert(
        t('cooking.premiumFeature'),
        i18n.language === 'es' 
          ? 'Las sugerencias de recetas son solo para usuarios Premium. ¡Actualizá ahora!'
          : 'Recipe suggestions are only available for Premium users. Upgrade now!',
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('history.upgradeNow'), onPress: () => router.push('/paywall') },
        ]
      );
      return;
    }
    router.push('/cooking');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('home.title')}</Text>
        {!isPremium && (
          <View style={[styles.limitBadge, { backgroundColor: theme.primary + '20' }]}>
            <Text style={[styles.limitText, { color: theme.primary }]}>
              {t('home.dailyLimit', { count: todayCount })}
            </Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Track Food */}
        <TouchableOpacity 
          style={[styles.actionCard, { backgroundColor: theme.surface, borderColor: theme.border }]} 
          onPress={handleTrackFood}
        >
          <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
            <Ionicons name="camera" size={48} color={theme.primary} />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{t('home.trackFood')}</Text>
            <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>
              {t('home.trackFoodDesc')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={theme.textMuted} />
        </TouchableOpacity>

        {/* What to Cook */}
        <TouchableOpacity 
          style={[styles.actionCard, { backgroundColor: theme.surface, borderColor: theme.border }]} 
          onPress={handleWhatToCook}
        >
          <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
            <Ionicons name="restaurant" size={48} color={theme.primary} />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{t('home.whatToCook')}</Text>
            <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>
              {t('home.whatToCookDesc')}
            </Text>
            {!isPremium && (
              <View style={styles.premiumBadge}>
                <Ionicons name="lock-closed" size={14} color={theme.premium} />
                <Text style={[styles.premiumText, { color: theme.premium }]}>Premium</Text>
              </View>
            )}
          </View>
          <Ionicons name="chevron-forward" size={24} color={theme.textMuted} />
        </TouchableOpacity>

        {/* Mi Ficha Personal */}
        <TouchableOpacity 
          style={[styles.actionCard, { backgroundColor: theme.surface, borderColor: theme.border }]} 
          onPress={() => router.push('/profile' as any)}
        >
          <View style={[styles.iconContainer, { backgroundColor: theme.premium + '20' }]}>
            <Ionicons name="person-circle" size={48} color={theme.premium} />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              {i18n.language === 'es' ? 'Mi Ficha Personal' : 'My Profile'}
            </Text>
            <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>
              {i18n.language === 'es' 
                ? 'Tu progreso, estadísticas y objetivos' 
                : 'Your progress, stats and goals'}
            </Text>
            {!isPremium && (
              <View style={styles.premiumBadge}>
                <Ionicons name="lock-closed" size={14} color={theme.premium} />
                <Text style={[styles.premiumText, { color: theme.premium }]}>Premium</Text>
              </View>
            )}
          </View>
          <Ionicons name="chevron-forward" size={24} color={theme.textMuted} />
        </TouchableOpacity>

        {/* Upgrade Prompt */}
        {!isPremium && todayCount >= 2 && (
          <View style={[styles.upgradePrompt, { backgroundColor: theme.surface }]}>
            <Text style={[styles.upgradeText, { color: theme.text }]}>
              {t('home.dailyLimitReached')}
            </Text>
            <TouchableOpacity
              style={[styles.upgradeButton, { backgroundColor: theme.premium }]}
              onPress={() => router.push('/paywall')}
            >
              <Text style={styles.upgradeButtonText}>{t('history.upgradeNow')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  limitBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  limitText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 2,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  premiumText: {
    fontSize: 12,
    fontWeight: '600',
  },
  upgradePrompt: {
    marginTop: 20,
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
  },
  upgradeText: {
    fontSize: 16,
    marginBottom: 12,
  },
  upgradeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  upgradeButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
