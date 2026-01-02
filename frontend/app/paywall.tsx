import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '../src/contexts/UserContext';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export default function PaywallScreen() {
  const router = useRouter();
  const { setPremium } = useUser();
  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');

  const handlePurchase = () => {
    Alert.alert(
      t('paywall.purchaseTitle'),
      t('paywall.purchaseMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async () => {
            await setPremium(true);
            Alert.alert(t('common.success'), t('paywall.activated'), [
              { text: t('common.done'), onPress: () => router.back() },
            ]);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
        <Ionicons name="close" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Ionicons name="star" size={60} color="#FFD700" />
          <Text style={styles.title}>{t('paywall.title')}</Text>
          <Text style={styles.subtitle}>{t('paywall.subtitle')}</Text>
        </View>

        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={24} color="#fff" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{t('paywall.feature1Title')}</Text>
              <Text style={styles.featureDescription}>{t('paywall.feature1Desc')}</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={24} color="#fff" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{t('paywall.feature2Title')}</Text>
              <Text style={styles.featureDescription}>{t('paywall.feature2Desc')}</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={24} color="#fff" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{t('paywall.feature3Title')}</Text>
              <Text style={styles.featureDescription}>{t('paywall.feature3Desc')}</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={24} color="#fff" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{t('paywall.feature4Title')}</Text>
              <Text style={styles.featureDescription}>{t('paywall.feature4Desc')}</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={24} color="#fff" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{t('paywall.feature5Title')}</Text>
              <Text style={styles.featureDescription}>{t('paywall.feature5Desc')}</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={24} color="#fff" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{t('paywall.feature6Title')}</Text>
              <Text style={styles.featureDescription}>{t('paywall.feature6Desc')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.pricingContainer}>
          <TouchableOpacity
            style={[
              styles.pricingCard,
              selectedPlan === 'yearly' && styles.pricingCardSelected,
            ]}
            onPress={() => setSelectedPlan('yearly')}
          >
            {selectedPlan === 'yearly' && (
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsText}>{t('paywall.yearlySavings')}</Text>
              </View>
            )}
            <View style={styles.pricingRow}>
              <View>
                <Text style={styles.pricingTitle}>{t('paywall.yearly')}</Text>
                <Text style={styles.pricingDescription}>{t('paywall.yearlyBilled')}</Text>
              </View>
              <Text style={styles.price}>{t('paywall.yearlyPrice')}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.pricingCard,
              selectedPlan === 'monthly' && styles.pricingCardSelected,
            ]}
            onPress={() => setSelectedPlan('monthly')}
          >
            <View style={styles.pricingRow}>
              <View>
                <Text style={styles.pricingTitle}>{t('paywall.monthly')}</Text>
                <Text style={styles.pricingDescription}>{t('paywall.monthlyBilled')}</Text>
              </View>
              <Text style={styles.price}>{t('paywall.monthlyPrice')}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.purchaseButton} onPress={handlePurchase}>
          <Text style={styles.purchaseButtonText}>{t('paywall.startPremium')}</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>{t('paywall.disclaimer')}</Text>

        <TouchableOpacity style={styles.restoreButton}>
          <Text style={styles.restoreButtonText}>{t('paywall.restorePurchase')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
  },
  content: {
    padding: 24,
    paddingTop: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
  },
  featuresContainer: {
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 16,
  },
  checkCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#aaa',
  },
  pricingContainer: {
    marginBottom: 24,
  },
  pricingCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#333',
    position: 'relative',
  },
  pricingCardSelected: {
    borderColor: '#FFD700',
  },
  savingsBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  savingsText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pricingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  pricingDescription: {
    fontSize: 14,
    color: '#aaa',
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  purchaseButton: {
    backgroundColor: '#FFD700',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  purchaseButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disclaimer: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  restoreButton: {
    padding: 12,
    alignItems: 'center',
  },
  restoreButtonText: {
    color: '#aaa',
    fontSize: 14,
  },
});