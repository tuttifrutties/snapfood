/**
 * Recipe Detail Screen
 * Shows full recipe without photo
 * Includes "I want to prepare this" button for memory feature
 * Saves to history when confirmed
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
  TextInput,
  Modal,
  BackHandler,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
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
const PORTIONS_EATEN_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3];

export default function RecipeDetailScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const params = useLocalSearchParams();
  const { userId } = useUser();
  
  const [recipe, setRecipe] = useState<any>(null);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  
  // Fat selector state
  const [selectedFatType, setSelectedFatType] = useState('none');
  const [fatTablespoons, setFatTablespoons] = useState(0);
  const [portions, setPortions] = useState(1);
  const [showFatSelector, setShowFatSelector] = useState(false);
  const [showCustomPortions, setShowCustomPortions] = useState(false);
  const [customPortionsText, setCustomPortionsText] = useState('');

  // Portions eaten popup state
  const [showPortionsEatenModal, setShowPortionsEatenModal] = useState(false);
  const [portionsEaten, setPortionsEaten] = useState(1);
  const [savedEntryId, setSavedEntryId] = useState<string | null>(null);
  const [caloriesPerPortion, setCaloriesPerPortion] = useState(0);
  const pendingNavigation = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (params.recipeData) {
      try {
        const parsed = JSON.parse(params.recipeData as string);
        setRecipe(parsed);
        // Set initial portions to recipe servings (the base value)
        const baseServings = parsed.servings || 4;
        setPortions(baseServings);
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

  // Handle back button and navigation interception
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // If recipe was confirmed and we haven't asked about portions eaten yet
        if (isConfirmed && savedEntryId && !showPortionsEatenModal) {
          setShowPortionsEatenModal(true);
          return true; // Prevent default back behavior
        }
        return false; // Allow default back behavior
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [isConfirmed, savedEntryId, showPortionsEatenModal])
  );

  // Custom back handler that shows popup
  const handleBackWithPopup = () => {
    if (isConfirmed && savedEntryId) {
      setShowPortionsEatenModal(true);
    } else {
      router.back();
    }
  };

  // Update history with portions eaten
  const updatePortionsEaten = async (portionsEatenValue: number) => {
    if (!savedEntryId) return;
    
    try {
      const historyKey = `food_history_${userId}`;
      const existingHistory = await AsyncStorage.getItem(historyKey);
      const history = existingHistory ? JSON.parse(existingHistory) : [];
      
      const updatedHistory = history.map((entry: any) => {
        if (entry.id === savedEntryId) {
          const totalCalories = Math.round(caloriesPerPortion * portionsEatenValue);
          return {
            ...entry,
            portionsEaten: portionsEatenValue,
            calories: totalCalories,
            protein: Math.round((entry.protein || 0) * portionsEatenValue),
            carbs: Math.round((entry.carbs || 0) * portionsEatenValue),
            fats: Math.round((entry.fats || 0) * portionsEatenValue),
            needsPortionsEatenConfirmation: false,
          };
        }
        return entry;
      });
      
      await AsyncStorage.setItem(historyKey, JSON.stringify(updatedHistory));
      
      // Update daily calories (subtract old 1 portion, add new amount)
      const caloriesDiff = Math.round(caloriesPerPortion * (portionsEatenValue - 1));
      if (caloriesDiff !== 0) {
        await updateDailyCalories(caloriesDiff);
      }
      
      console.log('[Recipe] Updated portions eaten:', portionsEatenValue, 'total calories:', Math.round(caloriesPerPortion * portionsEatenValue));
    } catch (error) {
      console.error('[Recipe] Failed to update portions eaten:', error);
    }
  };

  // Handle portions eaten confirmation
  const confirmPortionsEaten = async () => {
    await updatePortionsEaten(portionsEaten);
    setShowPortionsEatenModal(false);
    router.back();
  };

  // Scale ingredient quantities based on portions selected vs base recipe servings
  const scaleIngredient = (ingredient: string, targetPortions: number): string => {
    const baseServings = recipe?.servings || 4;
    const multiplier = targetPortions / baseServings;
    
    if (multiplier === 1) return ingredient;
    
    // Regular expression to find numbers at the start or after common patterns
    const numberPattern = /^(\d+(?:[.,]\d+)?)\s*(.*)$/;
    const fractionPattern = /^(\d+)\/(\d+)\s*(.*)$/;
    const rangePattern = /^(\d+)-(\d+)\s*(.*)$/;
    
    // Check for fractions like "1/2 cup"
    const fractionMatch = ingredient.match(fractionPattern);
    if (fractionMatch) {
      const numerator = parseFloat(fractionMatch[1]);
      const denominator = parseFloat(fractionMatch[2]);
      const value = (numerator / denominator) * multiplier;
      const rest = fractionMatch[3];
      
      // Format nicely
      if (value === Math.floor(value)) {
        return `${Math.floor(value)} ${rest}`;
      } else {
        return `${value.toFixed(1).replace('.0', '')} ${rest}`;
      }
    }
    
    // Check for ranges like "2-3 cups"
    const rangeMatch = ingredient.match(rangePattern);
    if (rangeMatch) {
      const min = parseFloat(rangeMatch[1]) * multiplier;
      const max = parseFloat(rangeMatch[2]) * multiplier;
      const rest = rangeMatch[3];
      return `${Math.round(min)}-${Math.round(max)} ${rest}`;
    }
    
    // Check for simple numbers like "500g" or "2 cups"
    const numberMatch = ingredient.match(numberPattern);
    if (numberMatch) {
      const originalValue = parseFloat(numberMatch[1].replace(',', '.'));
      const rest = numberMatch[2];
      const scaledValue = originalValue * multiplier;
      
      // Format based on size
      if (scaledValue >= 100) {
        return `${Math.round(scaledValue)} ${rest}`;
      } else if (scaledValue >= 1) {
        return `${scaledValue.toFixed(1).replace('.0', '')} ${rest}`;
      } else {
        return `${scaledValue.toFixed(2)} ${rest}`;
      }
    }
    
    // No number found, return as-is
    return ingredient;
  };

  // Get scaled ingredients
  const getScaledIngredients = (): string[] => {
    if (!recipe?.ingredients) return [];
    return recipe.ingredients.map((ing: string) => scaleIngredient(ing, portions));
  };

  // Get portion multiplier for calorie calculations
  const getPortionMultiplier = () => {
    const baseServings = recipe?.servings || 4;
    return portions / baseServings;
  };

  // Calculate fat calories
  const getFatCalories = () => {
    const fatType = FAT_TYPES.find(f => f.id === selectedFatType);
    if (!fatType) return 0;
    return Math.round(fatType.caloriesPerTbsp * fatTablespoons);
  };

  // Get total calories including fat
  const getTotalCalories = () => {
    const baseCalories = (recipe?.calories || 0) * getPortionMultiplier();
    return Math.round(baseCalories + getFatCalories());
  };

  // Handle custom portions input
  const handleCustomPortionsSubmit = () => {
    const num = parseInt(customPortionsText, 10);
    if (num >= 1 && num <= 50) {
      setPortions(num);
      setShowCustomPortions(false);
      setCustomPortionsText('');
    } else {
      Alert.alert(
        i18n.language === 'es' ? 'Número inválido' : 'Invalid number',
        i18n.language === 'es' ? 'Ingresa un número entre 1 y 50' : 'Enter a number between 1 and 50'
      );
    }
  };

  // Get quick portion options based on recipe servings
  const getPortionOptions = () => {
    const baseServings = recipe?.servings || 4;
    // Generate options: 2, 4, 6, 8, 10, 12, 14, 16, 18, 20
    // But also include 1 if base is small, and include the base serving
    const options = [1, 2, 4, 6, 8];
    if (!options.includes(baseServings)) {
      options.push(baseServings);
      options.sort((a, b) => a - b);
    }
    return options.slice(0, 5); // Show max 5 buttons + custom
  };

  const saveToHistory = async (recipeData: any) => {
    try {
      const historyKey = `food_history_${userId}`;
      const existingHistory = await AsyncStorage.getItem(historyKey);
      const history = existingHistory ? JSON.parse(existingHistory) : [];

      const fatType = FAT_TYPES.find(f => f.id === selectedFatType);
      const fatCaloriesPerPortion = Math.round(getFatCalories() / portions);
      
      // Calories PER PORTION (what one person eats)
      const caloriesPerPortion = Math.round((recipeData.calories || 0) + fatCaloriesPerPortion);

      const newEntry = {
        id: `cooked_${Date.now()}`,
        odName: recipeData.name,
        userId,
        timestamp: Date.now(), // Unix timestamp for consistent timezone handling
        foodName: recipeData.name,
        mealType: 'cooking',
        portionsCooked: portions, // How many portions were COOKED
        portionsEaten: 1, // Default: user ate 1 portion (will be updated via popup)
        // Store PER PORTION values (base values for 1 portion)
        baseCaloriesPerPortion: recipeData.calories || 0,
        baseFatCaloriesPerPortion: fatCaloriesPerPortion,
        // Actual calories = per portion values (default 1 portion eaten)
        calories: caloriesPerPortion,
        protein: Math.round(recipeData.protein || 0),
        carbs: Math.round(recipeData.carbs || 0),
        fats: Math.round((recipeData.fats || 0) + (fatTablespoons > 0 ? Math.round((fatTablespoons * 14) / portions) : 0)),
        isCooked: true,
        cuisine: recipeData.cuisine || recipeData.countryOfOrigin,
        // Fat tracking
        fatType: selectedFatType,
        fatTypeName: fatType ? (i18n.language === 'es' ? fatType.es : fatType.en) : null,
        fatTablespoons: fatTablespoons,
        fatCaloriesPerPortion: fatCaloriesPerPortion,
        // Flag to show popup when leaving recipe screen
        needsPortionsEatenConfirmation: true,
      };

      history.unshift(newEntry);

      // Keep only 12 months of history
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      const filteredHistory = history.filter((item: any) => 
        new Date(item.timestamp) > twelveMonthsAgo
      );

      await AsyncStorage.setItem(historyKey, JSON.stringify(filteredHistory));
      
      // Update daily calories for nutrition tracking (ONE PORTION by default)
      if (caloriesPerPortion) {
        await updateDailyCalories(caloriesPerPortion);
      }

      console.log('[Recipe] Saved to history:', newEntry.foodName, '- calories per portion:', caloriesPerPortion);
      return newEntry; // Return for popup use
    } catch (error) {
      console.error('[Recipe] Failed to save to history:', error);
      return null;
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

      // Save to history and get the entry
      const savedEntry = await saveToHistory(recipe);
      
      // Store entry id and calories for the portions eaten popup
      if (savedEntry) {
        setSavedEntryId(savedEntry.id);
        const fatCalPerPortion = Math.round(getFatCalories() / portions);
        setCaloriesPerPortion(Math.round((recipe.calories || 0) + fatCalPerPortion));
      }
      
      setIsConfirmed(true);
      
      // Calculate per portion calories for message
      const fatCaloriesPerPortion = Math.round(getFatCalories() / portions);
      const calPerPortion = Math.round((recipe.calories || 0) + fatCaloriesPerPortion);
      
      // Show confirmation message
      const message = i18n.language === 'es'
        ? unusedIngredients.length > 0
          ? `¡Perfecto! Registramos ${calPerPortion} cal por porción en tu historial. Los ingredientes que no usaste (${unusedIngredients.join(', ')}) quedarán guardados.`
          : `¡Perfecto! Registramos ${calPerPortion} cal por porción en tu historial. ¡A cocinar!`
        : unusedIngredients.length > 0
          ? `Great! Logged ${calPerPortion} cal per serving to your history. Unused ingredients (${unusedIngredients.join(', ')}) will be saved.`
          : `Great! Logged ${calPerPortion} cal per serving to your history. Let's cook!`;
      
      Alert.alert(
        i18n.language === 'es' ? '¡Manos a la obra!' : 'Let\'s Cook!',
        message + (i18n.language === 'es' 
          ? '\n\n⚠️ No te olvides de indicar cuántas porciones comiste antes de salir.'
          : '\n\n⚠️ Don\'t forget to indicate how many portions you ate before leaving.'),
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
          <View style={styles.ingredientsTitleRow}>
            <Text style={styles.sectionTitle}>{t('recipe.ingredients')}</Text>
            <View style={styles.servingsBadge}>
              <Ionicons name="people-outline" size={16} color="#FF6B6B" />
              <Text style={styles.servingsText}>
                {i18n.language === 'es' ? 'Base:' : 'Base:'} {recipe.servings || 4}
              </Text>
            </View>
          </View>
          
          {/* Portions Selector - Clear question */}
          <View style={styles.portionsSelector}>
            <Text style={styles.portionsSelectorLabel}>
              {i18n.language === 'es' 
                ? '🍽️ ¿Para cuántas porciones vas a cocinar?' 
                : '🍽️ How many portions will you cook?'}
            </Text>
            <View style={styles.portionsButtons}>
              {getPortionOptions().map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.portionBtn,
                    portions === p && styles.portionBtnActive,
                  ]}
                  onPress={() => setPortions(p)}
                >
                  <Text style={[
                    styles.portionBtnText,
                    portions === p && styles.portionBtnTextActive,
                  ]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
              {/* Custom number button */}
              <TouchableOpacity
                style={[
                  styles.portionBtn,
                  styles.portionBtnCustom,
                  !getPortionOptions().includes(portions) && styles.portionBtnActive,
                ]}
                onPress={() => {
                  setCustomPortionsText(portions.toString());
                  setShowCustomPortions(true);
                }}
              >
                <Text style={[
                  styles.portionBtnText,
                  !getPortionOptions().includes(portions) && styles.portionBtnTextActive,
                ]}>
                  {!getPortionOptions().includes(portions) ? portions : '...'}
                </Text>
              </TouchableOpacity>
            </View>
            {portions !== (recipe.servings || 4) && (
              <Text style={styles.portionsHint}>
                {i18n.language === 'es' 
                  ? `📐 Ingredientes ajustados para ${portions} porciones`
                  : `📐 Ingredients adjusted for ${portions} portions`}
              </Text>
            )}
          </View>

          {/* Custom Portions Modal */}
          <Modal
            visible={showCustomPortions}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowCustomPortions(false)}
          >
            <TouchableOpacity 
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowCustomPortions(false)}
            >
              <View style={styles.customPortionsModal}>
                <Text style={styles.customPortionsTitle}>
                  {i18n.language === 'es' ? '¿Cuántas porciones?' : 'How many portions?'}
                </Text>
                <TextInput
                  style={styles.customPortionsInput}
                  keyboardType="number-pad"
                  value={customPortionsText}
                  onChangeText={setCustomPortionsText}
                  placeholder="Ej: 5"
                  placeholderTextColor="#666"
                  autoFocus
                  maxLength={2}
                />
                <View style={styles.customPortionsButtons}>
                  <TouchableOpacity 
                    style={styles.customPortionsCancelBtn}
                    onPress={() => setShowCustomPortions(false)}
                  >
                    <Text style={styles.customPortionsCancelText}>
                      {i18n.language === 'es' ? 'Cancelar' : 'Cancel'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.customPortionsConfirmBtn}
                    onPress={handleCustomPortionsSubmit}
                  >
                    <Text style={styles.customPortionsConfirmText}>
                      {i18n.language === 'es' ? 'Confirmar' : 'Confirm'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </Modal>

          <View style={styles.ingredientsList}>
            {getScaledIngredients().map((ingredient: string, index: number) => (
              <View key={index} style={styles.ingredientItem}>
                <View style={styles.ingredientBullet} />
                <Text style={[
                  styles.ingredientText,
                  portions !== (recipe.servings || 4) && styles.ingredientTextScaled
                ]}>{ingredient}</Text>
              </View>
            ))}
          </View>

          {/* Confirm Button - shows before instructions */}
          {!isConfirmed && (
            <>
              {/* FAT SELECTOR - VERY IMPORTANT */}
              <View style={styles.fatSelectorContainer}>
                <View style={styles.fatSelectorHeader}>
                  <Ionicons name="warning" size={24} color="#FFD700" />
                  <Text style={styles.fatSelectorTitle}>
                    {i18n.language === 'es' ? '⚠️ ¡IMPORTANTE! ¿Usaste grasa?' : '⚠️ IMPORTANT! Did you use fat?'}
                  </Text>
                </View>
                <Text style={styles.fatSelectorSubtitle}>
                  {i18n.language === 'es' 
                    ? 'Las grasas suman muchas calorías. Selecciona el tipo y cuántas cucharadas usaste:'
                    : 'Fats add many calories. Select the type and how many tablespoons you used:'}
                </Text>

                {/* Fat Type Selector */}
                <Text style={styles.fatTypeLabel}>
                  {i18n.language === 'es' ? 'Tipo de grasa:' : 'Fat type:'}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fatTypeScroll}>
                  {FAT_TYPES.map((fat) => (
                    <TouchableOpacity
                      key={fat.id}
                      style={[
                        styles.fatTypeButton,
                        selectedFatType === fat.id && styles.fatTypeButtonActive,
                      ]}
                      onPress={() => {
                        setSelectedFatType(fat.id);
                        if (fat.id === 'none') setFatTablespoons(0);
                      }}
                    >
                      <Text style={styles.fatTypeIcon}>{fat.icon}</Text>
                      <Text style={[
                        styles.fatTypeName,
                        selectedFatType === fat.id && styles.fatTypeNameActive,
                      ]}>
                        {i18n.language === 'es' ? fat.es : fat.en}
                      </Text>
                      {fat.caloriesPerTbsp > 0 && (
                        <Text style={styles.fatTypeCalories}>
                          {fat.caloriesPerTbsp} cal/cda
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Tablespoons Selector - only show if fat type selected */}
                {selectedFatType !== 'none' && (
                  <View style={styles.tablespoonRow}>
                    <Text style={styles.tablespoonLabel}>
                      {i18n.language === 'es' ? 'Cucharadas (cda):' : 'Tablespoons (tbsp):'}
                    </Text>
                    <Text style={styles.tablespoonHint}>
                      {i18n.language === 'es' ? '0.5 = media cda, 1 = una cda' : '0.5 = half tbsp, 1 = one tbsp'}
                    </Text>
                    <View style={styles.tablespoonButtons}>
                      {TABLESPOON_OPTIONS.map((tbsp) => (
                        <TouchableOpacity
                          key={tbsp}
                          style={[
                            styles.tablespoonButton,
                            fatTablespoons === tbsp && styles.tablespoonButtonActive,
                          ]}
                          onPress={() => setFatTablespoons(tbsp)}
                        >
                          <Text style={[
                            styles.tablespoonButtonText,
                            fatTablespoons === tbsp && styles.tablespoonButtonTextActive,
                          ]}>
                            {tbsp}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* PER PORTION Nutrition Summary */}
                <View style={styles.caloriesSummary}>
                  <Text style={styles.perPortionTitle}>
                    {i18n.language === 'es' 
                      ? `📊 POR CADA PORCIÓN (de ${portions}):` 
                      : `📊 PER SERVING (of ${portions}):`}
                  </Text>
                  
                  {/* Base recipe per portion */}
                  <View style={styles.macrosPerPortion}>
                    <View style={styles.macroPerPortionItem}>
                      <Text style={styles.macroPerPortionValue}>{recipe.calories || 0}</Text>
                      <Text style={styles.macroPerPortionLabel}>cal</Text>
                    </View>
                    <View style={styles.macroPerPortionItem}>
                      <Text style={styles.macroPerPortionValue}>{recipe.protein || 0}g</Text>
                      <Text style={styles.macroPerPortionLabel}>{i18n.language === 'es' ? 'prot' : 'prot'}</Text>
                    </View>
                    <View style={styles.macroPerPortionItem}>
                      <Text style={styles.macroPerPortionValue}>{recipe.carbs || 0}g</Text>
                      <Text style={styles.macroPerPortionLabel}>{i18n.language === 'es' ? 'carbs' : 'carbs'}</Text>
                    </View>
                    <View style={styles.macroPerPortionItem}>
                      <Text style={styles.macroPerPortionValue}>{recipe.fats || 0}g</Text>
                      <Text style={styles.macroPerPortionLabel}>{i18n.language === 'es' ? 'grasas' : 'fats'}</Text>
                    </View>
                  </View>

                  {/* Fat calories per portion (if added) */}
                  {fatTablespoons > 0 && (
                    <View style={styles.fatPerPortionRow}>
                      <Text style={styles.fatPerPortionLabel}>
                        + {i18n.language === 'es' ? 'Grasa' : 'Fat'} ({fatTablespoons} {i18n.language === 'es' ? 'cda' : 'tbsp'} ÷ {portions}):
                      </Text>
                      <Text style={styles.fatPerPortionValue}>
                        +{Math.round(getFatCalories() / portions)} cal/porción
                      </Text>
                    </View>
                  )}

                  {/* TOTAL per portion */}
                  <View style={styles.totalPerPortionRow}>
                    <Text style={styles.totalPerPortionLabel}>
                      🍽️ {i18n.language === 'es' ? 'TOTAL POR PORCIÓN:' : 'TOTAL PER SERVING:'}
                    </Text>
                    <Text style={styles.totalPerPortionValue}>
                      {Math.round((recipe.calories || 0) + (getFatCalories() / portions))} cal
                    </Text>
                  </View>

                  {/* Small note about total cooking */}
                  <Text style={styles.totalCookingNote}>
                    {i18n.language === 'es' 
                      ? `(Total cocinando ${portions} porciones: ${getTotalCalories()} cal)` 
                      : `(Total cooking ${portions} servings: ${getTotalCalories()} cal)`}
                  </Text>
                </View>
              </View>

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
                        ? `¡Quiero preparar esto!` 
                        : `I want to prepare this!`}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </>
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
  // Fat Selector Styles
  fatSelectorContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginVertical: 16,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  fatSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  fatSelectorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    flex: 1,
  },
  fatSelectorSubtitle: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 16,
  },
  portionRow: {
    marginBottom: 16,
  },
  portionLabel: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 8,
  },
  portionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  portionButton: {
    backgroundColor: '#333',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 45,
    alignItems: 'center',
  },
  portionButtonActive: {
    backgroundColor: '#FF6B6B',
  },
  portionButtonText: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600',
  },
  portionButtonTextActive: {
    color: '#fff',
  },
  fatTypeLabel: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 8,
  },
  fatTypeScroll: {
    marginBottom: 16,
  },
  fatTypeButton: {
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 12,
    marginRight: 10,
    alignItems: 'center',
    minWidth: 100,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  fatTypeButtonActive: {
    borderColor: '#FFD700',
    backgroundColor: '#FFD70020',
  },
  fatTypeIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  fatTypeName: {
    fontSize: 12,
    color: '#aaa',
    textAlign: 'center',
  },
  fatTypeNameActive: {
    color: '#FFD700',
    fontWeight: '600',
  },
  fatTypeCalories: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  tablespoonRow: {
    marginBottom: 16,
  },
  tablespoonLabel: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 8,
  },
  tablespoonButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  tablespoonButton: {
    backgroundColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 50,
    alignItems: 'center',
  },
  tablespoonButtonActive: {
    backgroundColor: '#FFD700',
  },
  tablespoonButtonText: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600',
  },
  tablespoonButtonTextActive: {
    color: '#000',
  },
  caloriesSummary: {
    backgroundColor: '#252525',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  caloriesSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  caloriesSummaryLabel: {
    fontSize: 14,
    color: '#aaa',
  },
  caloriesSummaryValue: {
    fontSize: 14,
    color: '#fff',
  },
  caloriesSummaryTotal: {
    borderTopWidth: 1,
    borderTopColor: '#444',
    paddingTop: 10,
    marginBottom: 0,
  },
  caloriesSummaryTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  caloriesSummaryTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  // Portions selector styles
  ingredientsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  servingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  servingsText: {
    fontSize: 13,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  portionsSelector: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  portionsSelectorLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 12,
  },
  portionsButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  portionBtn: {
    backgroundColor: '#333',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 50,
    alignItems: 'center',
  },
  portionBtnActive: {
    backgroundColor: '#FF6B6B',
  },
  portionBtnCustom: {
    paddingHorizontal: 14,
  },
  portionBtnText: {
    color: '#aaa',
    fontSize: 16,
    fontWeight: '600',
  },
  portionBtnTextActive: {
    color: '#fff',
  },
  portionsHint: {
    fontSize: 13,
    color: '#4CAF50',
    marginTop: 12,
    fontStyle: 'italic',
  },
  ingredientTextScaled: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  // Custom portions modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customPortionsModal: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 24,
    width: '80%',
    maxWidth: 300,
    alignItems: 'center',
  },
  customPortionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  customPortionsInput: {
    backgroundColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 24,
    color: '#fff',
    textAlign: 'center',
    width: '100%',
    marginBottom: 20,
  },
  customPortionsButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  customPortionsCancelBtn: {
    flex: 1,
    backgroundColor: '#333',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  customPortionsCancelText: {
    color: '#aaa',
    fontSize: 16,
    fontWeight: '600',
  },
  customPortionsConfirmBtn: {
    flex: 1,
    backgroundColor: '#FF6B6B',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  customPortionsConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tablespoonHint: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  // Per portion nutrition styles
  perPortionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 12,
  },
  macrosPerPortion: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  macroPerPortionItem: {
    alignItems: 'center',
  },
  macroPerPortionValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  macroPerPortionLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  fatPerPortionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  fatPerPortionLabel: {
    fontSize: 13,
    color: '#FFD700',
  },
  fatPerPortionValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFD700',
  },
  totalPerPortionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 4,
  },
  totalPerPortionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  totalPerPortionValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  totalCookingNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
});
