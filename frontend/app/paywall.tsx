import React from 'react';
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

export default function PaywallScreen() {
  const router = useRouter();
  const { setPremium } = useUser();

  const handlePurchase = () => {
    Alert.alert(
      'Purchase Premium',
      'In a real app, this would open the in-app purchase flow. For testing, we\'ll activate Premium now.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate',
          onPress: async () => {
            await setPremium(true);
            Alert.alert('Success!', 'Premium activated!', [
              { text: 'OK', onPress: () => router.back() },
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
          <Text style={styles.title}>Upgrade to Premium</Text>
          <Text style={styles.subtitle}>Unlock the full FoodSnap experience</Text>
        </View>

        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={24} color="#fff" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Unlimited Photo Tracking</Text>
              <Text style={styles.featureDescription}>
                Log as many meals as you want, every day
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={24} color="#fff" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Full Nutrition History</Text>
              <Text style={styles.featureDescription}>
                View detailed meal history and daily summaries
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={24} color="#fff" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Smart Meal Suggestions</Text>
              <Text style={styles.featureDescription}>
                AI-powered meal recommendations based on your goals
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={24} color="#fff" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Evening Notifications</Text>
              <Text style={styles.featureDescription}>
                Get daily nutrition summaries and suggestions
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={24} color="#fff" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>No Ads</Text>
              <Text style={styles.featureDescription}>
                Enjoy an ad-free, seamless experience
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={24} color="#fff" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Ingredient-Based Recipes</Text>
              <Text style={styles.featureDescription}>
                Get recipes based on what you have in your fridge
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.pricingCard}>
          <View style={styles.pricingRow}>
            <View>
              <Text style={styles.pricingTitle}>Monthly</Text>
              <Text style={styles.pricingDescription}>Billed monthly</Text>
            </View>
            <Text style={styles.price}>$9.99/mo</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.purchaseButton} onPress={handlePurchase}>
          <Text style={styles.purchaseButtonText}>Start Premium</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          *This is a demo. In a real app, payment would be processed through App Store / Google
          Play.
        </Text>

        <TouchableOpacity style={styles.restoreButton}>
          <Text style={styles.restoreButtonText}>Restore Purchase</Text>
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
  pricingCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#FFD700',
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