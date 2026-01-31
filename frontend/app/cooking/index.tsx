import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  FlatList,
  SectionList,
  Modal,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../../src/contexts/UserContext';
import { usePremium } from '../../src/contexts/PremiumContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getIngredientsByCategory, searchIngredients, getTotalIngredientsCount } from '../../src/data/ingredients';
import { saveIngredients, getRememberedIngredients } from '../../src/services/ingredients';
import { refreshSmartNotifications } from '../../src/services/notifications';
import { getUserName } from '../../src/services/nutritionCoach';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width, height } = Dimensions.get('window');

export default function CookingScreen() {
  const { userId } = useUser();
  const { isPremium } = usePremium();
  const { theme } = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState<'select' | 'photo' | 'manual' | 'results' | 'searchRecipe'>('select');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [recipes, setRecipes] = useState<any[]>([]);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(false);
  const [todayCookingCount, setTodayCookingCount] = useState(0);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  
  // Recipe search state
  const [recipeSearchQuery, setRecipeSearchQuery] = useState('');
  const [searchedRecipes, setSearchedRecipes] = useState<any[]>([]);
  const [isSearchingRecipes, setIsSearchingRecipes] = useState(false);
  
  // Notification suggested recipes
  const [notificationRecipes, setNotificationRecipes] = useState<string[]>([]);
  const [notificationMealType, setNotificationMealType] = useState<string | null>(null);

  // Get ingredients by category based on current language
  const ingredientCategories = getIngredientsByCategory(i18n.language as 'en' | 'es');
  const totalIngredients = getTotalIngredientsCount();

  // Search results
  const searchResults = searchQuery.trim() 
    ? searchIngredients(searchQuery, i18n.language as 'en' | 'es')
    : [];

  useEffect(() => {
    checkTodayCookingCount();
    loadRememberedIngredients();
    loadUserName();
    checkNotificationRecipes();
  }, [userId]);
  
  // Check if user came from a notification with suggested recipes
  const checkNotificationRecipes = async () => {
    try {
      const stored = await AsyncStorage.getItem('notification_suggested_recipes');
      if (stored) {
        const data = JSON.parse(stored);
        // Only use if less than 30 minutes old
        if (Date.now() - data.timestamp < 30 * 60 * 1000) {
          setNotificationRecipes(data.recipes || []);
          setNotificationMealType(data.mealType || null);
          console.log('[Cooking] Loaded notification recipes:', data.recipes);
        }
        // Clear it after reading
        await AsyncStorage.removeItem('notification_suggested_recipes');
      }
    } catch (error) {
      console.error('[Cooking] Error loading notification recipes:', error);
    }
  };

  const loadUserName = async () => {
    const name = await getUserName();
    setUserName(name);
  };

  const loadRememberedIngredients = async () => {
    try {
      const remembered = await getRememberedIngredients();
      if (remembered.length > 0) {
        setSelectedIngredients(remembered);
        console.log('[Cooking] Loaded remembered ingredients:', remembered.length);
      }
    } catch (error) {
      console.error('[Cooking] Failed to load remembered ingredients:', error);
    }
  };

  const checkTodayCookingCount = async () => {
    if (!userId) return;
    try {
      const key = `cooking_count_${userId}_${new Date().toDateString()}`;
      const count = await AsyncStorage.getItem(key);
      setTodayCookingCount(count ? parseInt(count) : 0);
    } catch (error) {
      console.error('Failed to check cooking count:', error);
    }
  };

  const incrementCookingCount = async () => {
    if (!userId) return;
    try {
      const key = `cooking_count_${userId}_${new Date().toDateString()}`;
      const newCount = todayCookingCount + 1;
      await AsyncStorage.setItem(key, newCount.toString());
      setTodayCookingCount(newCount);
    } catch (error) {
      console.error('Failed to increment cooking count:', error);
    }
  };

  const canUseCooking = () => {
    if (isPremium) return true;
    return todayCookingCount < 1;
  };

  const toggleCategory = (categoryId: string) => {
    if (expandedCategories.includes(categoryId)) {
      setExpandedCategories(expandedCategories.filter(id => id !== categoryId));
    } else {
      setExpandedCategories([...expandedCategories, categoryId]);
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(t('common.error'), 'Camera permission is needed.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setSelectedImage(result.assets[0].uri);
      analyzeIngredients(result.assets[0].base64);
    }
  };

  const pickFromGallery = async () => {
    // Request media library permission
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert(
        i18n.language === 'es' ? 'Permiso requerido' : 'Permission required',
        i18n.language === 'es' 
          ? 'Necesitamos acceso a tu galería para seleccionar fotos de ingredientes.'
          : 'We need access to your gallery to select ingredient photos.'
      );
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setSelectedImage(result.assets[0].uri);
      analyzeIngredients(result.assets[0].base64);
    }
  };

  const analyzeIngredients = async (base64Image: string) => {
    if (!userId) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch(`${API_URL}/api/analyze-ingredients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          imageBase64: base64Image,
          language: i18n.language,
        }),
      });

      const data = await response.json();
      setSelectedIngredients(data.ingredients || []);
      setMode('manual');
    } catch (error) {
      console.error('Failed to analyze ingredients:', error);
      Alert.alert(t('common.error'), 'Failed to analyze ingredients. Please try again.');
    } finally {
      setIsAnalyzing(false);
      setSelectedImage(null);
    }
  };

  const toggleIngredient = (ingredient: string) => {
    if (selectedIngredients.includes(ingredient)) {
      setSelectedIngredients(selectedIngredients.filter(i => i !== ingredient));
    } else {
      setSelectedIngredients([...selectedIngredients, ingredient]);
    }
  };

  const handleGetSuggestionsPress = () => {
    if (!canUseCooking()) {
      Alert.alert(
        t('cooking.premiumFeature'),
        'Free users can use this feature once per day. Upgrade to Premium for unlimited access!',
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('history.upgradeNow'), onPress: () => router.push('/paywall') },
        ]
      );
      return;
    }

    if (selectedIngredients.length === 0) {
      Alert.alert(t('common.error'), 'Please select at least one ingredient.');
      return;
    }

    // Show confirmation modal
    setShowConfirmModal(true);
  };

  const getRecipeSuggestions = async () => {
    setShowConfirmModal(false);
    setShowLoadingScreen(true);

    // Get language from AsyncStorage to ensure we have the correct one
    let currentLanguage = i18n.language || 'en';
    try {
      const savedLanguage = await AsyncStorage.getItem('app_language');
      if (savedLanguage) {
        currentLanguage = savedLanguage;
      }
    } catch (error) {
      console.error('Failed to get language:', error);
    }
    
    console.log('Getting recipes in language:', currentLanguage); // Debug log

    setIsLoadingRecipes(true);
    try {
      // Auto-save ingredients for smart notifications
      if (userId && selectedIngredients.length > 0) {
        saveIngredients(userId, selectedIngredients, true).then(() => {
          // Refresh smart notifications with new ingredients
          refreshSmartNotifications(currentLanguage).catch(console.error);
        }).catch(console.error);
      }

      // Get user health restrictions
      const healthConditionsStr = await AsyncStorage.getItem('user_health_conditions');
      const foodAllergiesStr = await AsyncStorage.getItem('user_food_allergies');
      const healthConditions = healthConditionsStr ? JSON.parse(healthConditionsStr) : ['none'];
      const foodAllergies = foodAllergiesStr ? JSON.parse(foodAllergiesStr) : [];

      const response = await fetch(`${API_URL}/api/recipe-suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          ingredients: selectedIngredients,
          language: currentLanguage,
          healthConditions: healthConditions,
          foodAllergies: foodAllergies,
        }),
      });

      const data = await response.json();
      setRecipes(data.recipes || []);
      setShowLoadingScreen(false);
      setMode('results');
      
      // Increment cooking count for free users
      if (!isPremium) {
        await incrementCookingCount();
      }
    } catch (error) {
      console.error('Failed to get recipes:', error);
      setShowLoadingScreen(false);
      Alert.alert(t('common.error'), 'Failed to get recipe suggestions. Please try again.');
    } finally {
      setIsLoadingRecipes(false);
    }
  };

  const viewRecipe = (recipe: any) => {
    router.push({
      pathname: '/cooking/recipe/[id]',
      params: { 
        id: recipe.id,
        recipeData: JSON.stringify(recipe),
        selectedIngredients: JSON.stringify(selectedIngredients),
      },
    });
  };

  const searchRecipesAPI = async () => {
    if (!recipeSearchQuery.trim()) return;
    
    setIsSearchingRecipes(true);
    try {
      const response = await fetch(`${API_URL}/api/search-recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: recipeSearchQuery,
          userIngredients: selectedIngredients,
          language: i18n.language,
        }),
      });
      
      const data = await response.json();
      setSearchedRecipes(data.recipes || []);
    } catch (error) {
      console.error('Failed to search recipes:', error);
      Alert.alert(t('common.error'), 'Failed to search recipes');
    } finally {
      setIsSearchingRecipes(false);
    }
  };

  const cancel = () => {
    router.back();
  };

  // Mode: Recipe Search
  if (mode === 'searchRecipe') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setMode('select'); setSearchedRecipes([]); setRecipeSearchQuery(''); }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {i18n.language === 'es' ? 'Buscar Recetas' : 'Search Recipes'}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.recipeSearchContainer}>
          <View style={styles.recipeSearchInputContainer}>
            <Ionicons name="search" size={20} color="#888" />
            <TextInput
              style={styles.recipeSearchInput}
              placeholder={i18n.language === 'es' ? 'Ej: pollo, pasta, ensalada...' : 'E.g: chicken, pasta, salad...'}
              placeholderTextColor="#666"
              value={recipeSearchQuery}
              onChangeText={setRecipeSearchQuery}
              onSubmitEditing={searchRecipesAPI}
              returnKeyType="search"
            />
            {recipeSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setRecipeSearchQuery(''); setSearchedRecipes([]); }}>
                <Ionicons name="close-circle" size={20} color="#888" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.searchButton, !recipeSearchQuery.trim() && styles.searchButtonDisabled]}
            onPress={searchRecipesAPI}
            disabled={!recipeSearchQuery.trim() || isSearchingRecipes}
          >
            {isSearchingRecipes ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.searchButtonText}>
                {i18n.language === 'es' ? 'Buscar' : 'Search'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Info about ingredient matching */}
        {selectedIngredients.length > 0 && (
          <View style={styles.ingredientMatchInfo}>
            <Ionicons name="information-circle" size={18} color="#4CAF50" />
            <Text style={styles.ingredientMatchText}>
              {i18n.language === 'es' 
                ? `Ordenado por coincidencia con tus ${selectedIngredients.length} ingredientes`
                : `Sorted by match with your ${selectedIngredients.length} ingredients`}
            </Text>
          </View>
        )}

        {isSearchingRecipes ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.loadingText}>
              {i18n.language === 'es' ? 'Buscando recetas...' : 'Searching recipes...'}
            </Text>
          </View>
        ) : searchedRecipes.length > 0 ? (
          <ScrollView contentContainerStyle={styles.searchResultsContainer}>
            {searchedRecipes.map((recipe, index) => (
              <TouchableOpacity
                key={recipe.id || index}
                style={styles.searchedRecipeCard}
                onPress={() => viewRecipe(recipe)}
              >
                <View style={styles.searchedRecipeHeader}>
                  <View style={styles.searchedRecipeInfo}>
                    <Text style={styles.searchedRecipeName}>{recipe.name}</Text>
                    <View style={styles.searchedRecipeMeta}>
                      <Ionicons name="time-outline" size={14} color="#888" />
                      <Text style={styles.searchedRecipeMetaText}>{recipe.cookingTime} min</Text>
                      <Text style={styles.searchedRecipeMetaText}>•</Text>
                      <Text style={styles.searchedRecipeMetaText}>{recipe.calories} cal</Text>
                    </View>
                  </View>
                  
                  {/* Match percentage badge */}
                  {selectedIngredients.length > 0 && (
                    <View style={[
                      styles.matchBadge,
                      recipe.matchPercentage >= 70 ? styles.matchBadgeGood :
                      recipe.matchPercentage >= 40 ? styles.matchBadgeMedium :
                      styles.matchBadgeLow
                    ]}>
                      <Text style={styles.matchBadgeText}>{recipe.matchPercentage}%</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.searchedRecipeDescription} numberOfLines={2}>
                  {recipe.description}
                </Text>

                {/* Missing ingredients */}
                {recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
                  <View style={styles.missingIngredientsContainer}>
                    <Text style={styles.missingIngredientsLabel}>
                      {i18n.language === 'es' ? 'Te falta:' : 'Missing:'}
                    </Text>
                    <Text style={styles.missingIngredientsList} numberOfLines={1}>
                      {recipe.missingIngredients.slice(0, 3).join(', ')}
                      {recipe.missingIngredients.length > 3 && '...'}
                    </Text>
                  </View>
                )}

                <View style={styles.searchedRecipeFooter}>
                  <Text style={styles.viewRecipeText}>
                    {i18n.language === 'es' ? 'Ver receta' : 'View recipe'}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={theme.primary} />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : recipeSearchQuery.length > 0 && !isSearchingRecipes ? (
          <View style={styles.emptySearchState}>
            <Ionicons name="restaurant-outline" size={60} color="#555" />
            <Text style={styles.emptySearchText}>
              {i18n.language === 'es' ? 'Presiona buscar para encontrar recetas' : 'Press search to find recipes'}
            </Text>
          </View>
        ) : (
          <View style={styles.searchHintState}>
            <Ionicons name="search" size={60} color="#555" />
            <Text style={styles.searchHintTitle}>
              {i18n.language === 'es' ? '¿Qué quieres cocinar?' : 'What do you want to cook?'}
            </Text>
            <Text style={styles.searchHintText}>
              {i18n.language === 'es' 
                ? 'Busca cualquier plato: pollo, pasta, ensalada, tacos...'
                : 'Search any dish: chicken, pasta, salad, tacos...'}
            </Text>
            {selectedIngredients.length > 0 && (
              <Text style={styles.searchHintIngredients}>
                {i18n.language === 'es' 
                  ? `Las recetas se ordenarán por coincidencia con tus ${selectedIngredients.length} ingredientes seleccionados`
                  : `Recipes will be sorted by match with your ${selectedIngredients.length} selected ingredients`}
              </Text>
            )}
          </View>
        )}
      </View>
    );
  }

  // Mode: Select method
  if (mode === 'select') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={cancel}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('cooking.title')}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Notification Suggested Recipes Banner */}
          {notificationRecipes.length > 0 && (
            <View style={styles.notificationBanner}>
              <View style={styles.notificationBannerHeader}>
                <Ionicons name="restaurant" size={20} color="#FF6B6B" />
                <Text style={styles.notificationBannerTitle}>
                  {i18n.language === 'es' 
                    ? `🔔 Sugerencias para tu ${notificationMealType === 'lunch' ? 'almuerzo' : 'cena'}`
                    : `🔔 Suggestions for your ${notificationMealType}`}
                </Text>
              </View>
              <Text style={styles.notificationBannerSubtitle}>
                {i18n.language === 'es' 
                  ? 'Basado en tus ingredientes:'
                  : 'Based on your ingredients:'}
              </Text>
              <View style={styles.notificationRecipesList}>
                {notificationRecipes.map((recipe, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.notificationRecipeItem}
                    onPress={() => {
                      setRecipeSearchQuery(recipe);
                      setMode('searchRecipe');
                    }}
                  >
                    <Text style={styles.notificationRecipeText}>
                      👨‍🍳 {recipe}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="#FF6B6B" />
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={styles.notificationDismissBtn}
                onPress={() => setNotificationRecipes([])}
              >
                <Text style={styles.notificationDismissText}>
                  {i18n.language === 'es' ? 'Cerrar' : 'Dismiss'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          
          <Text style={styles.subtitle}>{t('cooking.subtitle')}</Text>

          <TouchableOpacity
            style={styles.methodCard}
            onPress={() => setMode('photo')}
          >
            <Ionicons name="camera" size={48} color={theme.primary} />
            <Text style={styles.methodTitle}>{t('cooking.takePhotoIngredients')}</Text>
            <Text style={styles.methodDescription}>{t('cooking.takePhotoIngredientsDesc')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.methodCard}
            onPress={() => setMode('manual')}
          >
            <Ionicons name="list" size={48} color={theme.primary} />
            <Text style={styles.methodTitle}>
              {i18n.language === 'es' ? 'Selecciona tus ingredientes' : 'Select your ingredients'}
            </Text>
            <Text style={styles.methodDescription}>
              {i18n.language === 'es' 
                ? 'Elige ingredientes de una lista'
                : 'Choose ingredients from a list'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.methodCard}
            onPress={() => setMode('searchRecipe')}
          >
            <Ionicons name="search" size={48} color={theme.primary} />
            <Text style={styles.methodTitle}>
              {i18n.language === 'es' ? 'Buscar Receta' : 'Search Recipe'}
            </Text>
            <Text style={styles.methodDescription}>
              {i18n.language === 'es' 
                ? 'Busca por nombre de plato y ve qué ingredientes te faltan'
                : 'Search by dish name and see which ingredients you need'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Mode: Photo capture
  if (mode === 'photo') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setMode('select')}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('cooking.takePhotoIngredients')}</Text>
          <View style={{ width: 24 }} />
        </View>

        {isAnalyzing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.loadingText}>{t('cooking.analyzingIngredients')}</Text>
          </View>
        ) : selectedImage ? (
          <View style={styles.imagePreview}>
            <Image source={{ uri: selectedImage }} style={styles.image} />
          </View>
        ) : (
          <View style={styles.content}>
            <Ionicons name="camera" size={120} color={theme.primary} />
            <Text style={styles.instructionText}>
              Take a photo of your fridge or pantry ingredients
            </Text>

            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: theme.primary }]} onPress={pickImage}>
              <Ionicons name="camera" size={24} color="#fff" />
              <Text style={styles.primaryButtonText}>{t('trackFood.takePhoto')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.secondaryButton, { borderColor: theme.primary }]} onPress={pickFromGallery}>
              <Ionicons name="images" size={24} color={theme.primary} />
              <Text style={[styles.secondaryButtonText, { color: theme.primary }]}>{t('trackFood.chooseGallery')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // Mode: Manual selection
  if (mode === 'manual') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setMode('select')}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('cooking.selectIngredients')}</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#aaa" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={`${t('cooking.searchIngredients')} (${totalIngredients}+)`}
            placeholderTextColor="#555"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#aaa" />
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.selectedBadge, { backgroundColor: theme.primary + '20' }]}>
          <Text style={[styles.selectedText, { color: theme.primary }]}>
            {t('cooking.selectedCount', { count: selectedIngredients.length })}
          </Text>
          {selectedIngredients.length > 0 && (
            <TouchableOpacity onPress={() => setSelectedIngredients([])}>
              <Text style={[styles.clearText, { color: theme.primary }]}>{t('common.clear')}</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.ingredientListContainer}>
          {/* Selected Ingredients Accordion - Always first */}
          {selectedIngredients.length > 0 && !searchQuery.trim() && (
            <View style={styles.categoryContainer}>
              <TouchableOpacity
                style={[styles.categoryHeader, styles.selectedCategoryHeader]}
                onPress={() => toggleCategory('_selected_')}
              >
                <View style={styles.categoryTitleRow}>
                  <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                  <Text style={[styles.categoryTitle, styles.selectedCategoryTitle, { color: theme.primary }]}>
                    {i18n.language === 'es' ? 'Seleccionados' : 'Selected'}
                  </Text>
                  <View style={[styles.categoryBadge, { backgroundColor: theme.primary }]}>
                    <Text style={styles.categoryBadgeText}>{selectedIngredients.length}</Text>
                  </View>
                </View>
                <Ionicons 
                  name={expandedCategories.includes('_selected_') ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={theme.primary} 
                />
              </TouchableOpacity>
              
              {expandedCategories.includes('_selected_') && (
                <View style={styles.ingredientGrid}>
                  {selectedIngredients.map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={[styles.ingredientItem, { borderColor: theme.primary, backgroundColor: theme.primary + '20' }]}
                      onPress={() => toggleIngredient(item)}
                    >
                      <Text style={[styles.ingredientText, styles.ingredientTextSelected, { color: theme.primary }]} numberOfLines={2}>
                        {item}
                      </Text>
                      <Ionicons name="close-circle" size={18} color={theme.primary} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Search results */}
          {searchQuery.trim() && searchResults.length > 0 ? (
            <View style={styles.searchResultsContainer}>
              <Text style={styles.searchResultsTitle}>
                {i18n.language === 'es' ? 'Resultados de búsqueda' : 'Search Results'} ({searchResults.length})
              </Text>
              <View style={styles.ingredientGrid}>
                {searchResults.map((item) => {
                  const isSelected = selectedIngredients.includes(item);
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[
                        styles.ingredientItem,
                        isSelected && { borderColor: theme.primary, backgroundColor: theme.primary + '20' },
                      ]}
                      onPress={() => toggleIngredient(item)}
                    >
                      <Text
                        style={[
                          styles.ingredientText,
                          isSelected && [styles.ingredientTextSelected, { color: theme.primary }],
                        ]}
                        numberOfLines={2}
                      >
                        {item}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={18} color={theme.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : searchQuery.trim() && searchResults.length === 0 ? (
            <View style={styles.noResults}>
              <Ionicons name="search" size={48} color="#555" />
              <Text style={styles.noResultsText}>
                {i18n.language === 'es' ? 'No se encontraron ingredientes' : 'No ingredients found'}
              </Text>
            </View>
          ) : (
            /* Categories */
            ingredientCategories.map((category) => {
              const isExpanded = expandedCategories.includes(category.id);
              const selectedInCategory = category.ingredients.filter(ing => 
                selectedIngredients.includes(ing)
              ).length;
              
              return (
                <View key={category.id} style={styles.categoryContainer}>
                  <TouchableOpacity
                    style={styles.categoryHeader}
                    onPress={() => toggleCategory(category.id)}
                  >
                    <View style={styles.categoryTitleRow}>
                      <Text style={styles.categoryTitle}>{category.name}</Text>
                      {selectedInCategory > 0 && (
                        <View style={[styles.categoryBadge, { backgroundColor: theme.primary }]}>
                          <Text style={styles.categoryBadgeText}>{selectedInCategory}</Text>
                        </View>
                      )}
                    </View>
                    <Ionicons 
                      name={isExpanded ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color="#aaa" 
                    />
                  </TouchableOpacity>
                  
                  {isExpanded && (
                    <View style={styles.ingredientGrid}>
                      {category.ingredients.map((item) => {
                        const isSelected = selectedIngredients.includes(item);
                        return (
                          <TouchableOpacity
                            key={item}
                            style={[
                              styles.ingredientItem,
                              isSelected && { borderColor: theme.primary, backgroundColor: theme.primary + '20' },
                            ]}
                            onPress={() => toggleIngredient(item)}
                          >
                            <Text
                              style={[
                                styles.ingredientText,
                                isSelected && [styles.ingredientTextSelected, { color: theme.primary }],
                              ]}
                              numberOfLines={2}
                            >
                              {item}
                            </Text>
                            {isSelected && (
                              <Ionicons name="checkmark-circle" size={18} color={theme.primary} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })
          )}
          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={styles.bottomButton}>
          <TouchableOpacity
            style={[
              styles.getSuggestionsButton,
              { backgroundColor: theme.primary },
              selectedIngredients.length === 0 && styles.getSuggestionsButtonDisabled
            ]}
            onPress={handleGetSuggestionsPress}
            disabled={isLoadingRecipes || selectedIngredients.length === 0}
          >
            {isLoadingRecipes ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.getSuggestionsButtonText}>
                {t('cooking.getSuggestions')} ({selectedIngredients.length})
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Confirmation Modal */}
        <Modal
          visible={showConfirmModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowConfirmModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.confirmModal, { backgroundColor: theme.mode === 'dark' ? '#1a1a2e' : '#fff' }]}>
              <Ionicons name="help-circle" size={60} color={theme.primary} />
              <Text style={[styles.confirmTitle, { color: theme.mode === 'dark' ? '#fff' : '#000' }]}>
                {i18n.language === 'es' ? '¿Estás seguro?' : 'Are you sure?'}
              </Text>
              <Text style={[styles.confirmMessage, { color: theme.mode === 'dark' ? '#aaa' : '#666' }]}>
                {i18n.language === 'es' 
                  ? '¿No te olvidaste ningún ingrediente?' 
                  : "Didn't you forget any ingredient?"}
              </Text>
              <View style={styles.confirmButtons}>
                <TouchableOpacity
                  style={[styles.confirmButton, styles.confirmButtonSecondary]}
                  onPress={() => setShowConfirmModal(false)}
                >
                  <Text style={styles.confirmButtonSecondaryText}>
                    {i18n.language === 'es' ? 'Agregar más' : 'Add more'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmButton, { backgroundColor: theme.primary }]}
                  onPress={getRecipeSuggestions}
                >
                  <Text style={styles.confirmButtonPrimaryText}>
                    {i18n.language === 'es' ? 'Continuar' : 'Continue'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Full Screen Loading */}
        <Modal
          visible={showLoadingScreen}
          transparent={false}
          animationType="fade"
        >
          <View style={[styles.loadingFullScreen, { backgroundColor: theme.mode === 'dark' ? '#0a0a0a' : '#f5f5f5' }]}>
            <View style={[styles.menuCard, { backgroundColor: theme.mode === 'dark' ? '#1a1a2e' : '#fff' }]}>
              {/* Restaurant Menu Header */}
              <View style={styles.menuHeader}>
                <View style={styles.menuLogoContainer}>
                  <Ionicons name="restaurant" size={40} color={theme.primary} />
                </View>
                <Text style={[styles.menuRestaurantName, { color: theme.mode === 'dark' ? '#fff' : '#000' }]}>
                  Snapfood
                </Text>
                <View style={styles.menuDivider} />
              </View>

              {/* Menu Title */}
              <Text style={[styles.menuTitle, { color: theme.primary }]}>
                {i18n.language === 'es' ? 'Cargando menú del chef...' : 'Loading chef menu...'}
              </Text>

              {/* Ingredients List */}
              <View style={styles.menuIngredientsContainer}>
                <Text style={[styles.menuIngredientsTitle, { color: theme.mode === 'dark' ? '#aaa' : '#666' }]}>
                  {i18n.language === 'es' ? 'Ingredientes seleccionados' : 'Selected ingredients'}
                </Text>
                <View style={styles.menuIngredientsList}>
                  {selectedIngredients.slice(0, 8).map((ing, index) => (
                    <View key={ing} style={styles.menuIngredientLine}>
                      <View style={styles.menuBullet} />
                      <Text style={[styles.menuIngredientText, { color: theme.mode === 'dark' ? '#ccc' : '#333' }]} numberOfLines={1}>
                        {ing}
                      </Text>
                    </View>
                  ))}
                  {selectedIngredients.length > 8 && (
                    <Text style={[styles.menuMoreText, { color: theme.mode === 'dark' ? '#888' : '#999' }]}>
                      +{selectedIngredients.length - 8} más...
                    </Text>
                  )}
                </View>
              </View>

              {/* Loading Animation */}
              <View style={styles.menuLoadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>

              {/* Decorative Bottom */}
              <View style={styles.menuFooter}>
                <View style={styles.menuFooterLine} />
                <Ionicons name="leaf" size={20} color="#4CAF50" />
                <View style={styles.menuFooterLine} />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // Mode: Recipe results
  if (mode === 'results') {
    // Separate recipes into two groups
    const mainRecipes = recipes.filter(r => !r.requiresExtraIngredients);
    const bonusRecipes = recipes.filter(r => r.requiresExtraIngredients);
    
    // Get current date in Spanish
    const today = new Date();
    const dateOptions: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    };
    const formattedDate = today.toLocaleDateString(
      i18n.language === 'es' ? 'es-ES' : 'en-US', 
      dateOptions
    );
    
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setMode('manual')}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('cooking.recipeSuggestions')}</Text>
          <View style={{ width: 24 }} />
        </View>

        {recipes.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant" size={80} color="#555" />
            <Text style={styles.emptyText}>{t('cooking.noRecipes')}</Text>
            <Text style={styles.emptySubtext}>{t('cooking.noRecipesMessage')}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.recipeList}>
            {/* Personalized Title */}
            <View style={styles.chefTitleContainer}>
              <Text style={styles.chefTitle}>
                {i18n.language === 'es' 
                  ? `Menú del Chef ${userName || 'Chef'}` 
                  : `Chef ${userName || 'Chef'}'s Menu`}
              </Text>
              <Text style={styles.chefSubtitle}>
                {i18n.language === 'es' 
                  ? `para el día de hoy` 
                  : `for today`}
              </Text>
              <Text style={styles.chefDate}>{formattedDate}</Text>
              <Text style={styles.chefHint}>
                {i18n.language === 'es' ? 'Elige tu plato' : 'Choose your dish'}
              </Text>
            </View>

            {/* Main recipes - using only user's ingredients */}
            {mainRecipes.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.sectionTitle}>
                    {i18n.language === 'es' ? 'Con tus ingredientes' : 'With your ingredients'}
                  </Text>
                </View>
                
                {mainRecipes.map((recipe) => (
                  <TouchableOpacity
                    key={recipe.id}
                    style={styles.recipeCard}
                    onPress={() => viewRecipe(recipe)}
                  >
                    <View style={styles.recipeHeader}>
                      <Text style={styles.recipeName}>{recipe.name}</Text>
                      <View style={styles.recipeTimeContainer}>
                        <Ionicons name="time" size={16} color="#aaa" />
                        <Text style={styles.recipeTime}>
                          {t('cooking.cookingTime', { time: recipe.cookingTime })}
                        </Text>
                      </View>
                    </View>
                    
                    {/* Country/Cuisine badge */}
                    {(recipe.countryOfOrigin || recipe.cuisine) && (
                      <View style={styles.cuisineBadge}>
                        <Ionicons name="globe-outline" size={14} color={theme.primary} />
                        <Text style={styles.cuisineText}>
                          {recipe.cuisine || recipe.countryOfOrigin}
                          {recipe.countryOfOrigin && recipe.cuisine ? ` • ${recipe.countryOfOrigin}` : ''}
                        </Text>
                      </View>
                    )}
                    
                    <Text style={styles.recipeDescription}>{recipe.description}</Text>
                    <View style={styles.recipeMacros}>
                      <Text style={styles.recipeMacroText}>{recipe.calories} cal</Text>
                      <Text style={styles.recipeMacroText}>P: {recipe.protein}g</Text>
                      <Text style={styles.recipeMacroText}>C: {recipe.carbs}g</Text>
                      <Text style={styles.recipeMacroText}>F: {recipe.fats}g</Text>
                    </View>
                    <TouchableOpacity style={styles.viewRecipeButton}>
                      <Text style={styles.viewRecipeButtonText}>{t('cooking.viewRecipe')}</Text>
                      <Ionicons name="chevron-forward" size={20} color={theme.primary} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </>
            )}
            
            {/* Bonus recipes - need extra ingredients */}
            {bonusRecipes.length > 0 && (
              <>
                <View style={styles.bonusSectionHeader}>
                  <View style={styles.bonusSectionTitleRow}>
                    <Ionicons name="sparkles" size={20} color="#FFD700" />
                    <Text style={styles.bonusSectionTitle}>
                      {i18n.language === 'es' 
                        ? '¿Y si consigues algo más?' 
                        : 'What if you get a bit more?'}
                    </Text>
                  </View>
                  <Text style={styles.bonusSectionSubtitle}>
                    {i18n.language === 'es'
                      ? 'Estas recetas necesitan 1-2 ingredientes extra'
                      : 'These recipes need 1-2 extra ingredients'}
                  </Text>
                </View>
                
                {bonusRecipes.map((recipe) => (
                  <TouchableOpacity
                    key={recipe.id}
                    style={[styles.recipeCard, styles.bonusRecipeCard]}
                    onPress={() => viewRecipe(recipe)}
                  >
                    <View style={styles.recipeHeader}>
                      <Text style={styles.recipeName}>{recipe.name}</Text>
                      <View style={styles.recipeTimeContainer}>
                        <Ionicons name="time" size={16} color="#aaa" />
                        <Text style={styles.recipeTime}>
                          {t('cooking.cookingTime', { time: recipe.cookingTime })}
                        </Text>
                      </View>
                    </View>
                    
                    {/* Extra ingredients needed badge */}
                    {recipe.extraIngredientsNeeded && recipe.extraIngredientsNeeded.length > 0 && (
                      <View style={styles.extraIngredientsBadge}>
                        <Ionicons name="cart-outline" size={14} color="#FFD700" />
                        <Text style={styles.extraIngredientsText}>
                          {i18n.language === 'es' ? 'Necesitas: ' : 'You need: '}
                          {recipe.extraIngredientsNeeded.join(', ')}
                        </Text>
                      </View>
                    )}
                    
                    {/* Country/Cuisine badge */}
                    {(recipe.countryOfOrigin || recipe.cuisine) && (
                      <View style={styles.cuisineBadge}>
                        <Ionicons name="globe-outline" size={14} color={theme.primary} />
                        <Text style={styles.cuisineText}>
                          {recipe.cuisine || recipe.countryOfOrigin}
                          {recipe.countryOfOrigin && recipe.cuisine ? ` • ${recipe.countryOfOrigin}` : ''}
                        </Text>
                      </View>
                    )}
                    
                    <Text style={styles.recipeDescription}>{recipe.description}</Text>
                    <View style={styles.recipeMacros}>
                      <Text style={styles.recipeMacroText}>{recipe.calories} cal</Text>
                      <Text style={styles.recipeMacroText}>P: {recipe.protein}g</Text>
                      <Text style={styles.recipeMacroText}>C: {recipe.carbs}g</Text>
                      <Text style={styles.recipeMacroText}>F: {recipe.fats}g</Text>
                    </View>
                    <TouchableOpacity style={styles.viewRecipeButton}>
                      <Text style={styles.viewRecipeButtonText}>{t('cooking.viewRecipe')}</Text>
                      <Ionicons name="chevron-forward" size={20} color={theme.primary} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </ScrollView>
        )}
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#1a1a1a',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 40,
  },
  methodCard: {
    backgroundColor: '#1a1a1a',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
    borderWidth: 2,
    borderColor: '#333',
  },
  methodTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  methodDescription: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  imagePreview: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  instructionText: {
    color: '#aaa',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    margin: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 12,
  },
  selectedBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
  },
  selectedText: {
    fontSize: 14,
    fontWeight: '600',
  },
  ingredientList: {
    padding: 16,
  },
  ingredientItem: {
    backgroundColor: '#252525',
    margin: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '47%',
  },
  ingredientItemSelected: {
    // Colors applied inline with theme.primary
  },
  ingredientText: {
    color: '#ccc',
    fontSize: 13,
    flex: 1,
  },
  ingredientTextSelected: {
    fontWeight: '600',
  },
  bottomButton: {
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  getSuggestionsButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  getSuggestionsButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    marginTop: 8,
  },
  recipeList: {
    padding: 16,
  },
  recipeCard: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recipeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  recipeTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recipeTime: {
    fontSize: 12,
    color: '#aaa',
  },
  recipeDescription: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 12,
  },
  recipeMacros: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  recipeMacroText: {
    fontSize: 12,
    // Color applied inline with theme.primary
  },
  viewRecipeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  viewRecipeButtonText: {
    // Color applied inline with theme.primary
    fontSize: 16,
    fontWeight: '600',
  },
  // New styles for categories and search
  ingredientListContainer: {
    flex: 1,
  },
  categoryContainer: {
    marginBottom: 8,
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#222',
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedCategoryHeader: {
    // Background applied inline with theme.primary
    borderRadius: 12,
  },
  selectedCategoryTitle: {
    // Color applied inline with theme.primary
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  categoryBadge: {
    // Background applied inline with theme.primary
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  categoryBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  ingredientGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    justifyContent: 'flex-start',
  },
  clearText: {
    // Color applied inline with theme.primary
    fontSize: 14,
    fontWeight: '600',
  },
  selectedPreview: {
    maxHeight: 50,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  selectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    // Background applied inline with theme.primary
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
  },
  selectedTagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  searchResultsContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  searchResultsTitle: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 12,
  },
  noResults: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noResultsText: {
    color: '#555',
    fontSize: 16,
    marginTop: 12,
  },
  getSuggestionsButtonDisabled: {
    backgroundColor: '#333',
  },
  cuisineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
    gap: 4,
  },
  cuisineText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: '500',
  },
  // Section headers for recipe results
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4CAF50',
  },
  bonusSectionHeader: {
    marginTop: 24,
    marginBottom: 16,
    paddingTop: 24,
    borderTopWidth: 2,
    borderTopColor: '#FFD700',
    borderStyle: 'dashed',
  },
  bonusSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  bonusSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFD700',
  },
  bonusSectionSubtitle: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 4,
  },
  bonusRecipeCard: {
    borderWidth: 1,
    borderColor: '#FFD70050',
    borderStyle: 'dashed',
  },
  extraIngredientsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD70020',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
    gap: 6,
  },
  extraIngredientsText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '500',
  },
  // Confirmation Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModal: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  confirmTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    width: '100%',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonSecondary: {
    backgroundColor: '#333',
  },
  confirmButtonPrimary: {
    backgroundColor: '#FF6B6B',
  },
  confirmButtonSecondaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Full Screen Loading (Menu Style)
  loadingFullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  menuCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  menuLogoContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FF6B6B20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  menuRestaurantName: {
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  menuDivider: {
    width: 60,
    height: 2,
    backgroundColor: '#FF6B6B',
    marginTop: 12,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  menuIngredientsContainer: {
    marginBottom: 20,
  },
  menuIngredientsTitle: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    textAlign: 'center',
  },
  menuIngredientsList: {
    paddingHorizontal: 8,
  },
  menuIngredientLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  menuBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FF6B6B',
    marginRight: 10,
  },
  menuIngredientText: {
    fontSize: 14,
    flex: 1,
  },
  menuMoreText: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  menuLoadingContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  menuFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 12,
  },
  menuFooterLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#33333350',
  },
  // Chef Title Styles
  chefTitleContainer: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B6B',
  },
  chefTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B6B',
    textAlign: 'center',
  },
  chefSubtitle: {
    fontSize: 16,
    color: '#aaa',
    marginTop: 4,
  },
  chefDate: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    fontStyle: 'italic',
  },
  chefHint: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 12,
    fontWeight: '600',
  },
  // Recipe Search Styles
  recipeSearchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  recipeSearchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  recipeSearchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 12,
  },
  searchButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
  },
  searchButtonDisabled: {
    backgroundColor: '#555',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  ingredientMatchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  ingredientMatchText: {
    color: '#4CAF50',
    fontSize: 13,
  },
  recipeSearchResultsContainer: {
    padding: 16,
    paddingTop: 0,
  },
  searchedRecipeCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  searchedRecipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  searchedRecipeInfo: {
    flex: 1,
  },
  searchedRecipeName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  searchedRecipeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  searchedRecipeMetaText: {
    color: '#888',
    fontSize: 13,
  },
  matchBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 10,
  },
  matchBadgeGood: {
    backgroundColor: '#4CAF5030',
  },
  matchBadgeMedium: {
    backgroundColor: '#FFC10730',
  },
  matchBadgeLow: {
    backgroundColor: '#FF6B6B30',
  },
  matchBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  searchedRecipeDescription: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 10,
    lineHeight: 20,
  },
  missingIngredientsContainer: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
    gap: 6,
  },
  missingIngredientsLabel: {
    color: '#FF6B6B',
    fontSize: 13,
    fontWeight: '600',
  },
  missingIngredientsList: {
    color: '#888',
    fontSize: 13,
    flex: 1,
  },
  searchedRecipeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 4,
  },
  viewRecipeText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '500',
  },
  emptySearchState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptySearchText: {
    color: '#888',
    marginTop: 16,
    fontSize: 16,
  },
  searchHintState: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 30,
  },
  searchHintTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
  },
  searchHintText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
  searchHintIngredients: {
    color: '#4CAF50',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
  },
  // Notification Banner Styles
  notificationBanner: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  notificationBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  notificationBannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  notificationBannerSubtitle: {
    fontSize: 13,
    color: '#aaa',
    marginBottom: 12,
  },
  notificationRecipesList: {
    gap: 8,
  },
  notificationRecipeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,107,107,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  notificationRecipeText: {
    color: '#fff',
    fontSize: 15,
    flex: 1,
  },
  notificationDismissBtn: {
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
  notificationDismissText: {
    color: '#888',
    fontSize: 13,
  },
});