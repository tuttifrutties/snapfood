/**
 * Recipe Detail Screen
 * Shows full recipe without photo
 * Includes "I want to prepare this" button for memory feature
 * Saves to history when confirmed
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getCountryFlag } from '../../../src/services/recipeImage';
import { confirmRecipeAndUpdateMemory } from '../../../src/services/ingredients';
import { useUser } from '../../../src/contexts/UserContext';
import { updateDailyCalories } from '../../../src/services/nutritionCoach';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

// Fat types with calories per tablespoon
const FAT_TYPES = [
  { id: 'none', es: 'Sin grasa', en: 'No fat', caloriesPerTbsp: 0, icon: '🚫' },
  { id: 'olive_oil', es: 'Aceite de oliva', en: 'Olive oil', caloriesPerTbsp: 119, icon: '🫒' },
  { id: 'sunflower_oil', es: 'Aceite de girasol', en: 'Sunflower oil', caloriesPerTbsp: 120, icon: '🌻' },
  { id: 'butter', es: 'Manteca/Mantequilla', en: 'Butter', caloriesPerTbsp: 102, icon: '🧈' },
  { id: 'lard', es: 'Grasa de cerdo', en: 'Lard', caloriesPerTbsp: 115, icon: '🥓' },
  { id: 'coconut_oil', es: 'Aceite de coco', en: 'Coconut oil', caloriesPerTbsp: 121, icon: '🥥' },
  { id: 'vegetable_oil', es: 'Aceite vegetal', en: 'Vegetable oil', caloriesPerTbsp: 120, icon: '🫗' },
];

const TABLESPOON_OPTIONS = [0, 0.5, 1, 1.5, 2, 2.5, 3];

export default function RecipeDetailScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const params = useLocalSearchParams();
  const { userId } = useUser();
  
  const [recipe, setRecipe] = useState<any>(null);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (params.recipeData) {
      try {
        const parsed = JSON.parse(params.recipeData as string);
        setRecipe(parsed);
      } catch (error) {
        console.error('Failed to parse recipe data:', error);
      }
    }
    
    if (params.selectedIngredients) {
      try {
        const ingredients = JSON.parse(params.selectedIngredients as string);
        setSelectedIngredients(ingredients);
      } catch (error) {
        console.error('Failed to parse selected ingredients:', error);
      }
    }
  }, [params.recipeData, params.selectedIngredients]);

  const saveToHistory = async (recipeData: any) => {
    try {
      const historyKey = `food_history_${userId}`;
      const existingHistory = await AsyncStorage.getItem(historyKey);
      const history = existingHistory ? JSON.parse(existingHistory) : [];

      const newEntry = {
        id: `cooked_${Date.now()}`,
        userId,
        timestamp: new Date().toISOString(),
        foodName: recipeData.name,
        mealType: 'cooking',
        portions: 1,
        calories: recipeData.calories || 0,
        protein: recipeData.protein || 0,
        carbs: recipeData.carbs || 0,
        fats: recipeData.fats || 0,
        isCooked: true,
        cuisine: recipeData.cuisine || recipeData.countryOfOrigin,
      };

      history.unshift(newEntry);

      // Keep only 12 months of history
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      const filteredHistory = history.filter((item: any) => 
        new Date(item.timestamp) > twelveMonthsAgo
      );

      await AsyncStorage.setItem(historyKey, JSON.stringify(filteredHistory));
      
      // Update daily calories for nutrition tracking
      if (recipeData.calories) {
        await updateDailyCalories(recipeData.calories);
      }

      console.log('[Recipe] Saved to history:', newEntry.foodName);
    } catch (error) {
      console.error('[Recipe] Failed to save to history:', error);
    }
  };

  const handleConfirmRecipe = async () => {
    if (!recipe) return;
    
    setIsConfirming(true);
    try {
      // Update ingredients memory - remove used, save unused
      const unusedIngredients = await confirmRecipeAndUpdateMemory(
        recipe.ingredients || [],
        selectedIngredients
      );

      // Save to history
      await saveToHistory(recipe);
      
      setIsConfirmed(true);
      
      // Show confirmation message
      const message = i18n.language === 'es'
        ? unusedIngredients.length > 0
          ? `¡Perfecto! Guardado en tu historial (1 porción). Los ingredientes que no usaste (${unusedIngredients.join(', ')}) quedarán guardados para la próxima vez.`
          : '¡Perfecto! Guardado en tu historial (1 porción). ¡A cocinar!'
        : unusedIngredients.length > 0
          ? `Great! Saved to history (1 serving). Unused ingredients (${unusedIngredients.join(', ')}) will be saved for next time.`
          : 'Great! Saved to history (1 serving). Let\'s cook!';
      
      Alert.alert(
        i18n.language === 'es' ? '¡Manos a la obra!' : 'Let\'s Cook!',
        message,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to confirm recipe:', error);
    } finally {
      setIsConfirming(false);
    }
  };

  if (!recipe) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  const countryFlag = getCountryFlag(recipe.countryOfOrigin || recipe.cuisine || '');

  return (
    <View style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Recipe Header - No Image */}
        <View style={styles.recipeHeaderSection}>
          <View style={styles.recipeIconContainer}>
            <Ionicons name="restaurant" size={60} color="#FF6B6B" />
          </View>
          {countryFlag && (
            <View style={styles.flagBadgeTop}>
              <Text style={styles.flagEmojiTop}>{countryFlag}</Text>
              <Text style={styles.cuisineNameTop}>
                {recipe.countryOfOrigin || recipe.cuisine}
              </Text>
            </View>
          )}
        </View>

        {/* Recipe Info */}
        <View style={styles.recipeInfo}>
          <Text style={styles.recipeName}>{recipe.name}</Text>
          
          {/* Meta info row */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={18} color="#FF6B6B" />
              <Text style={styles.metaText}>{recipe.cookingTime} min</Text>
            </View>
            
            <View style={styles.metaItem}>
              <Ionicons name="flame-outline" size={18} color="#FF6B6B" />
              <Text style={styles.metaText}>{recipe.calories} cal</Text>
            </View>
            
            {(recipe.countryOfOrigin || recipe.cuisine) && (
              <View style={styles.metaItem}>
                <Text style={styles.metaFlag}>{countryFlag}</Text>
                <Text style={styles.metaText}>
                  {recipe.cuisine || recipe.countryOfOrigin}
                </Text>
              </View>
            )}
          </View>

          {/* Macros */}
          <View style={styles.macrosContainer}>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{recipe.protein}g</Text>
              <Text style={styles.macroLabel}>{t('recipe.protein')}</Text>
            </View>
            <View style={styles.macroDivider} />
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{recipe.carbs}g</Text>
              <Text style={styles.macroLabel}>{t('recipe.carbs')}</Text>
            </View>
            <View style={styles.macroDivider} />
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{recipe.fats}g</Text>
              <Text style={styles.macroLabel}>{t('recipe.fats')}</Text>
            </View>
          </View>

          {/* Description */}
          <Text style={styles.sectionTitle}>{t('recipe.description')}</Text>
          <Text style={styles.description}>{recipe.description}</Text>

          {/* Ingredients */}
          <Text style={styles.sectionTitle}>{t('recipe.ingredients')}</Text>
          <View style={styles.ingredientsList}>
            {recipe.ingredients?.map((ingredient: string, index: number) => (
              <View key={index} style={styles.ingredientItem}>
                <View style={styles.ingredientBullet} />
                <Text style={styles.ingredientText}>{ingredient}</Text>
              </View>
            ))}
          </View>

          {/* Confirm Button - shows before instructions */}
          {!isConfirmed && (
            <TouchableOpacity 
              style={styles.confirmButton}
              onPress={handleConfirmRecipe}
              disabled={isConfirming}
            >
              {isConfirming ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color="#fff" />
                  <Text style={styles.confirmButtonText}>
                    {i18n.language === 'es' 
                      ? '¡Quiero preparar esto!' 
                      : 'I want to prepare this!'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Instructions - shown after confirmation */}
          <Text style={styles.sectionTitle}>{t('recipe.instructions')}</Text>
          
          {!isConfirmed ? (
            <View style={styles.lockedInstructions}>
              <Ionicons name="lock-closed" size={40} color="#555" />
              <Text style={styles.lockedText}>
                {i18n.language === 'es'
                  ? 'Presiona el botón de arriba para ver los pasos'
                  : 'Press the button above to see the steps'}
              </Text>
              <Text style={styles.lockedSubtext}>
                {i18n.language === 'es'
                  ? 'Esto actualizará tu lista de ingredientes guardados'
                  : 'This will update your saved ingredients list'}
              </Text>
            </View>
          ) : (
            <View style={styles.instructionsList}>
              {recipe.instructions?.map((instruction: string, index: number) => (
                <View key={index} style={styles.instructionItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.instructionText}>{instruction}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Tips if available */}
          {recipe.tips && recipe.tips.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>{t('recipe.tips')}</Text>
              <View style={styles.tipsContainer}>
                <Ionicons name="bulb-outline" size={20} color="#FFD700" />
                <View style={styles.tipsList}>
                  {recipe.tips.map((tip: string, index: number) => (
                    <Text key={index} style={styles.tipText}>• {tip}</Text>
                  ))}
                </View>
              </View>
            </>
          )}

          {/* Bottom spacing */}
          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0c0c0c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  
  // Recipe Header Section (No Image)
  recipeHeaderSection: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B6B',
  },
  recipeIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FF6B6B20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  flagBadgeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  flagEmojiTop: {
    fontSize: 24,
  },
  cuisineNameTop: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },

  // Recipe info
  recipeInfo: {
    padding: 20,
  },
  recipeName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: '#aaa',
    fontSize: 14,
  },
  metaFlag: {
    fontSize: 16,
  },

  // Macros
  macrosContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    justifyContent: 'space-around',
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  macroLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  macroDivider: {
    width: 1,
    backgroundColor: '#333',
  },

  // Sections
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
    marginTop: 8,
  },
  description: {
    fontSize: 16,
    color: '#aaa',
    lineHeight: 24,
    marginBottom: 20,
  },

  // Ingredients
  ingredientsList: {
    marginBottom: 24,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingRight: 16,
  },
  ingredientBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
    marginTop: 6,
    marginRight: 12,
  },
  ingredientText: {
    flex: 1,
    fontSize: 16,
    color: '#ddd',
    lineHeight: 22,
  },

  // Instructions
  instructionsList: {
    marginBottom: 24,
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  instructionText: {
    flex: 1,
    fontSize: 16,
    color: '#ddd',
    lineHeight: 24,
  },

  // Tips
  tipsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  tipsList: {
    flex: 1,
  },
  tipText: {
    fontSize: 14,
    color: '#aaa',
    lineHeight: 22,
    marginBottom: 4,
  },
  
  // Confirm button
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginVertical: 24,
    gap: 12,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  // Locked instructions
  lockedInstructions: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
  },
  lockedText: {
    color: '#888',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  lockedSubtext: {
    color: '#555',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
