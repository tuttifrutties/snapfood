import React, { useState } from 'react';
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
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@/src/contexts/UserContext';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateDailyCalories } from '../../src/services/nutritionCoach';

// API Food Item type (from external search)
interface ApiFoodItem {
  id: string;
  name: string;
  category: string;
  description: string;
  serving_size: string;
  serving_unit: string;
  is_drink: boolean;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  sugar: number;
  icon: string;
}

// Fat types with calories per tablespoon
const FAT_TYPES = [
  { id: 'none', es: 'Sin grasa', en: 'No fat', caloriesPerTbsp: 0, icon: '🚫' },
  { id: 'olive_oil', es: 'Aceite de oliva', en: 'Olive oil', caloriesPerTbsp: 119, icon: '🫒' },
  { id: 'sunflower_oil', es: 'Aceite de girasol', en: 'Sunflower oil', caloriesPerTbsp: 120, icon: '🌻' },
  { id: 'butter', es: 'Manteca/Mantequilla', en: 'Butter', caloriesPerTbsp: 102, icon: '🧈' },
  { id: 'lard', es: 'Grasa de cerdo', en: 'Lard', caloriesPerTbsp: 115, icon: '🥓' },
  { id: 'coconut_oil', es: 'Aceite de coco', en: 'Coconut oil', caloriesPerTbsp: 121, icon: '🥥' },
];

const TABLESPOON_OPTIONS = [0, 0.5, 1, 1.5, 2, 2.5, 3];

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function TrackFoodScreen() {
  const { userId } = useUser();
  const { theme } = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState<'select' | 'photo' | 'search'>('select');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [portions, setPortions] = useState(1);
  const [customPortions, setCustomPortions] = useState('');
  const [showCustomPortions, setShowCustomPortions] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ApiFoodItem[]>([]);
  const [selectedFood, setSelectedFood] = useState<ApiFoodItem | null>(null);
  const [foodPortions, setFoodPortions] = useState(1);
  const [isSearching, setIsSearching] = useState(false);
  
  // Fat selector state for search
  const [selectedFatType, setSelectedFatType] = useState('none');
  const [fatTablespoons, setFatTablespoons] = useState(0);
  
  // Fat selector state for photo
  const [photoFatType, setPhotoFatType] = useState('none');
  const [photoFatTablespoons, setPhotoFatTablespoons] = useState(0);
  
  // Missing ingredient state
  const [showAddIngredient, setShowAddIngredient] = useState(false);
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [ingredientSearchResults, setIngredientSearchResults] = useState<ApiFoodItem[]>([]);
  const [isSearchingIngredient, setIsSearchingIngredient] = useState(false);
  const [addedIngredients, setAddedIngredients] = useState<{name: string, calories: number, protein: number, carbs: number, fats: number}[]>([]);
  
  // Edit ingredient state
  const [editingIngredientIndex, setEditingIngredientIndex] = useState<number | null>(null);
  const [editIngredientText, setEditIngredientText] = useState('');

  const PORTION_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3];

  const getAdjustedValue = (value: number) => {
    return Math.round(value * portions);
  };

  const getAdjustedDecimal = (value: number) => {
    return (value * portions).toFixed(1);
  };

  // Search functions - using external API
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`${API_URL}/api/search-food`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query,
          language: i18n.language,
        }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setSearchResults(data.foods || []);
    } catch (error) {
      console.error('Food search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounce search to avoid too many API calls
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  
  const debouncedSearch = (query: string) => {
    setSearchQuery(query);
    
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    const timeout = setTimeout(() => {
      handleSearch(query);
    }, 400); // Wait 400ms after user stops typing
    
    setSearchTimeout(timeout);
  };

  const selectFoodFromSearch = (food: ApiFoodItem) => {
    setSelectedFood(food);
    setFoodPortions(1);
    setSelectedFatType('none');
    setFatTablespoons(0);
  };

  // Calculate fat calories for search
  const getSearchFatCalories = () => {
    const fatType = FAT_TYPES.find(f => f.id === selectedFatType);
    if (!fatType) return 0;
    return Math.round(fatType.caloriesPerTbsp * fatTablespoons);
  };

  // Calculate fat calories for photo
  const getPhotoFatCalories = () => {
    const fatType = FAT_TYPES.find(f => f.id === photoFatType);
    if (!fatType) return 0;
    return Math.round(fatType.caloriesPerTbsp * photoFatTablespoons);
  };

  const saveFoodFromSearch = async () => {
    if (!userId || !selectedFood) return;

    try {
      const fatCalories = getSearchFatCalories();
      const baseCalories = Math.round(selectedFood.calories * foodPortions);
      const totalCalories = baseCalories + fatCalories;
      const adjustedProtein = Math.round(selectedFood.protein * foodPortions * 10) / 10;
      const adjustedCarbs = Math.round(selectedFood.carbs * foodPortions * 10) / 10;
      const adjustedFats = Math.round(selectedFood.fats * foodPortions * 10) / 10 + (fatTablespoons > 0 ? Math.round(fatTablespoons * 14) : 0);

      // Save to local history
      const historyKey = `food_history_${userId}`;
      const existingHistory = await AsyncStorage.getItem(historyKey);
      const history = existingHistory ? JSON.parse(existingHistory) : [];

      const fatType = FAT_TYPES.find(f => f.id === selectedFatType);

      const newEntry = {
        id: `food_${Date.now()}`,
        userId,
        timestamp: Date.now(), // Unix timestamp for consistent timezone handling
        foodName: selectedFood.name,
        mealType: 'food',
        portions: foodPortions,
        calories: totalCalories,
        protein: adjustedProtein,
        carbs: adjustedCarbs,
        fats: adjustedFats,
        icon: selectedFood.icon,
        isSearched: true,
        baseCalories: selectedFood.calories,
        baseProtein: selectedFood.protein,
        baseCarbs: selectedFood.carbs,
        baseFats: selectedFood.fats,
        servingSize: selectedFood.serving_size,
        category: selectedFood.category,
        isDrink: selectedFood.is_drink,
        // Fat tracking
        fatType: selectedFatType,
        fatTypeName: fatType ? (i18n.language === 'es' ? fatType.es : fatType.en) : null,
        fatTablespoons: fatTablespoons,
        fatCalories: fatCalories,
      };

      history.unshift(newEntry);
      await AsyncStorage.setItem(historyKey, JSON.stringify(history));

      // Update daily calories (with fat included)
      await updateDailyCalories(totalCalories);

      Alert.alert(
        t('common.success'), 
        i18n.language === 'es' ? '¡Alimento guardado!' : 'Food saved!'
      );
      router.back();
    } catch (error) {
      console.error('Failed to save food:', error);
      Alert.alert(t('common.error'), 'Failed to save food');
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
      analyzeFood(result.assets[0].base64);
    }
  };

  const pickFromGallery = async () => {
    // Request media library permission
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert(
        i18n.language === 'es' ? 'Permiso requerido' : 'Permission required',
        i18n.language === 'es' 
          ? 'Necesitamos acceso a tu galería para seleccionar fotos de comida.'
          : 'We need access to your gallery to select food photos.'
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
      analyzeFood(result.assets[0].base64);
    }
  };

  const analyzeFood = async (base64Image: string) => {
    if (!userId) {
      Alert.alert(t('common.error'), 'User not found. Please restart the app.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
    
    try {
      console.log('Starting food analysis...');
      const response = await fetch(`${API_URL}/api/analyze-food`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          imageBase64: base64Image,
          language: i18n.language,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check if response is OK
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error:', response.status, errorText);
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      
      // Validate response has required fields
      if (!data.dishName || data.calories === undefined) {
        console.error('Invalid response format:', data);
        throw new Error('Invalid response format');
      }
      
      console.log('Analysis successful:', data.dishName);
      setAnalysisResult(data);
    } catch (error: any) {
      console.error('Failed to analyze food:', error);
      
      // Handle specific error types
      if (error.name === 'AbortError') {
        Alert.alert(
          t('trackFood.analysisFailed'), 
          'Analysis took too long. Please try again with a clearer photo.'
        );
      } else {
        Alert.alert(t('trackFood.analysisFailed'), t('trackFood.analysisFailedMessage'));
      }
      
      setSelectedImage(null);
      setAnalysisResult(null);
    } finally {
      clearTimeout(timeoutId);
      setIsAnalyzing(false);
    }
  };

  const saveMeal = async () => {
    if (!userId || !selectedImage || !analysisResult) return;

    try {
      const response = await fetch(selectedImage);
      const blob = await response.blob();
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const base64Data = base64.split(',')[1];

        const fatType = FAT_TYPES.find(f => f.id === photoFatType);
        const fatCalories = getPhotoFatCalories();
        
        // Calculate added ingredients calories
        const addedCalories = addedIngredients.reduce((sum, ing) => sum + ing.calories, 0);
        const addedProtein = addedIngredients.reduce((sum, ing) => sum + ing.protein, 0);
        const addedCarbs = addedIngredients.reduce((sum, ing) => sum + ing.carbs, 0);
        const addedFats = addedIngredients.reduce((sum, ing) => sum + ing.fats, 0);
        
        const totalCalories = getAdjustedValue(analysisResult.calories) + fatCalories + addedCalories;

        // Save with adjusted values based on portions, fat and added ingredients
        await fetch(`${API_URL}/api/meals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            photoBase64: base64Data,
            dishName: analysisResult.dishName,
            calories: totalCalories,
            protein: parseFloat(getAdjustedDecimal(analysisResult.protein)) + addedProtein,
            carbs: parseFloat(getAdjustedDecimal(analysisResult.carbs)) + addedCarbs,
            fats: parseFloat(getAdjustedDecimal(analysisResult.fats)) + addedFats + (photoFatTablespoons > 0 ? Math.round(photoFatTablespoons * 14) : 0),
            ingredients: [...analysisResult.ingredients, ...addedIngredients.map(i => i.name)],
            warnings: analysisResult.warnings,
            portions: portions,
            timestamp: Date.now(), // Send local timestamp from device
            // Fat tracking
            fatType: photoFatType,
            fatTypeName: fatType ? (i18n.language === 'es' ? fatType.es : fatType.en) : null,
            fatTablespoons: photoFatTablespoons,
            fatCalories: fatCalories,
            // Added ingredients
            addedIngredients: addedIngredients,
          }),
        });

        // Update daily calories (with fat and added ingredients included)
        await updateDailyCalories(totalCalories);

        Alert.alert(t('common.success'), t('trackFood.mealSaved'));
        router.back();
      };
      
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Failed to save meal:', error);
      Alert.alert(t('trackFood.saveFailed'), t('trackFood.saveFailedMessage'));
    }
  };

  const cancel = () => {
    if (mode !== 'select') {
      setMode('select');
      setSelectedImage(null);
      setAnalysisResult(null);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedFood(null);
    } else {
      router.back();
    }
  };

  // Mode: Search food
  if (mode === 'search') {
    if (selectedFood) {
      // Show selected food details
      return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
          <View style={[styles.header, { backgroundColor: theme.surface }]}>
            <TouchableOpacity onPress={() => setSelectedFood(null)}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              {i18n.language === 'es' ? 'Confirmar alimento' : 'Confirm Food'}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.foodDetailContainer}>
            <Text style={styles.foodDetailIcon}>{selectedFood.icon}</Text>
            <Text style={[styles.foodDetailName, { color: theme.text }]}>
              {selectedFood.name}
            </Text>
            
            {/* Serving size info */}
            <Text style={[styles.servingSizeText, { color: theme.textMuted }]}>
              {selectedFood.serving_size}
              {selectedFood.is_drink && ` 🍹`}
            </Text>

            {/* Portions selector */}
            <View style={[styles.portionContainer, { backgroundColor: theme.surface }]}>
              <Text style={[styles.portionLabel, { color: theme.text }]}>
                {i18n.language === 'es' ? 'Porciones' : 'Portions'}
              </Text>
              <Text style={[styles.portionHint, { color: theme.textMuted }]}>
                {i18n.language === 'es' 
                  ? `1 porción = ${selectedFood.serving_size}` 
                  : `1 portion = ${selectedFood.serving_size}`}
              </Text>
              <View style={styles.portionButtons}>
                {PORTION_OPTIONS.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.portionButton,
                      { backgroundColor: theme.surfaceVariant },
                      foodPortions === p && { backgroundColor: theme.primary },
                    ]}
                    onPress={() => setFoodPortions(p)}
                  >
                    <Text
                      style={[
                        styles.portionButtonText,
                        { color: theme.textMuted },
                        foodPortions === p && styles.portionButtonTextActive,
                      ]}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* FAT SELECTOR */}
            <View style={[styles.fatSelectorBox, { backgroundColor: theme.surface, borderColor: '#FFD700' }]}>
              <View style={styles.fatSelectorHeader}>
                <Ionicons name="flame" size={20} color="#FFD700" />
                <Text style={[styles.fatSelectorTitle, { color: theme.text }]}>
                  {i18n.language === 'es' ? '¿Usaste grasa para cocinar?' : 'Did you use cooking fat?'}
                </Text>
              </View>
              
              {/* Fat Type */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fatTypeScrollView}>
                {FAT_TYPES.map((fat) => (
                  <TouchableOpacity
                    key={fat.id}
                    style={[
                      styles.fatTypeChip,
                      { backgroundColor: theme.surfaceVariant },
                      selectedFatType === fat.id && styles.fatTypeChipActive,
                    ]}
                    onPress={() => {
                      setSelectedFatType(fat.id);
                      if (fat.id === 'none') setFatTablespoons(0);
                    }}
                  >
                    <Text style={styles.fatTypeChipIcon}>{fat.icon}</Text>
                    <Text style={[
                      styles.fatTypeChipText,
                      { color: theme.textMuted },
                      selectedFatType === fat.id && styles.fatTypeChipTextActive,
                    ]}>
                      {i18n.language === 'es' ? fat.es : fat.en}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Tablespoons - only if fat selected */}
              {selectedFatType !== 'none' && (
                <View style={styles.tablespoonContainer}>
                  <Text style={[styles.tablespoonLabel, { color: theme.text }]}>
                    {i18n.language === 'es' ? 'Cucharadas:' : 'Tablespoons:'}
                  </Text>
                  <View style={styles.tablespoonRow}>
                    {TABLESPOON_OPTIONS.map((tbsp) => (
                      <TouchableOpacity
                        key={tbsp}
                        style={[
                          styles.tablespoonChip,
                          { backgroundColor: theme.surfaceVariant },
                          fatTablespoons === tbsp && styles.tablespoonChipActive,
                        ]}
                        onPress={() => setFatTablespoons(tbsp)}
                      >
                        <Text style={[
                          styles.tablespoonChipText,
                          { color: theme.textMuted },
                          fatTablespoons === tbsp && styles.tablespoonChipTextActive,
                        ]}>
                          {tbsp}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {fatTablespoons > 0 && (
                    <Text style={[styles.fatCaloriesInfo, { color: '#FFD700' }]}>
                      +{getSearchFatCalories()} cal {i18n.language === 'es' ? 'de grasa' : 'from fat'}
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Nutritional info */}
            <View style={[styles.nutritionCard, { backgroundColor: theme.surface }]}>
              <View style={styles.nutritionRow}>
                <Text style={[styles.nutritionLabel, { color: theme.textMuted }]}>
                  {i18n.language === 'es' ? 'Calorías base' : 'Base calories'}
                </Text>
                <Text style={[styles.nutritionValue, { color: theme.text }]}>
                  {Math.round(selectedFood.calories * foodPortions)} kcal
                </Text>
              </View>
              {fatTablespoons > 0 && (
                <View style={styles.nutritionRow}>
                  <Text style={[styles.nutritionLabel, { color: '#FFD700' }]}>
                    + {i18n.language === 'es' ? 'Grasa' : 'Fat'} ({fatTablespoons} {i18n.language === 'es' ? 'cda' : 'tbsp'})
                  </Text>
                  <Text style={[styles.nutritionValue, { color: '#FFD700' }]}>
                    +{getSearchFatCalories()} kcal
                  </Text>
                </View>
              )}
              <View style={[styles.nutritionRow, styles.totalRow]}>
                <Text style={[styles.nutritionLabel, { color: theme.primary, fontWeight: 'bold' }]}>
                  TOTAL
                </Text>
                <Text style={[styles.nutritionValue, { color: theme.primary, fontWeight: 'bold', fontSize: 18 }]}>
                  {Math.round(selectedFood.calories * foodPortions) + getSearchFatCalories()} kcal
                </Text>
              </View>
              <View style={styles.nutritionRow}>
                <Text style={[styles.nutritionLabel, { color: theme.textMuted }]}>
                  {i18n.language === 'es' ? 'Proteína' : 'Protein'}
                </Text>
                <Text style={[styles.nutritionValue, { color: theme.text }]}>
                  {(selectedFood.protein * foodPortions).toFixed(1)}g
                </Text>
              </View>
              <View style={styles.nutritionRow}>
                <Text style={[styles.nutritionLabel, { color: theme.textMuted }]}>
                  {i18n.language === 'es' ? 'Carbohidratos' : 'Carbs'}
                </Text>
                <Text style={[styles.nutritionValue, { color: theme.text }]}>
                  {(selectedFood.carbs * foodPortions).toFixed(1)}g
                </Text>
              </View>
              <View style={styles.nutritionRow}>
                <Text style={[styles.nutritionLabel, { color: theme.textMuted }]}>
                  {i18n.language === 'es' ? 'Grasas' : 'Fats'}
                </Text>
                <Text style={[styles.nutritionValue, { color: theme.text }]}>
                  {(selectedFood.fats * foodPortions).toFixed(1)}g
                </Text>
              </View>
              {selectedFood.sugar > 0 && (
                <View style={styles.nutritionRow}>
                  <Text style={[styles.nutritionLabel, { color: theme.textMuted }]}>
                    {i18n.language === 'es' ? 'Azúcar' : 'Sugar'}
                  </Text>
                  <Text style={[styles.nutritionValue, { color: theme.text }]}>
                    {(selectedFood.sugar * foodPortions).toFixed(1)}g
                  </Text>
                </View>
              )}
              {selectedFood.fiber > 0 && (
                <View style={styles.nutritionRow}>
                  <Text style={[styles.nutritionLabel, { color: theme.textMuted }]}>
                    {i18n.language === 'es' ? 'Fibra' : 'Fiber'}
                  </Text>
                  <Text style={[styles.nutritionValue, { color: theme.text }]}>
                    {(selectedFood.fiber * foodPortions).toFixed(1)}g
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: theme.primary }]} 
              onPress={saveFoodFromSearch}
            >
              <Ionicons name="checkmark" size={24} color="#fff" />
              <Text style={styles.saveButtonText}>
                {i18n.language === 'es' ? 'Guardar en historial' : 'Save to history'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    }

    // Show search screen
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.surface }]}>
          <TouchableOpacity onPress={cancel}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {i18n.language === 'es' ? 'Buscar alimento' : 'Search Food'}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
          <Ionicons name="search" size={20} color={theme.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder={i18n.language === 'es' ? 'Buscar: daiquiri, pizza, sushi...' : 'Search: daiquiri, pizza, sushi...'}
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={debouncedSearch}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
              <Ionicons name="close-circle" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {isSearching ? (
          <View style={styles.loadingSearchContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textMuted }]}>
              {i18n.language === 'es' ? 'Buscando...' : 'Searching...'}
            </Text>
          </View>
        ) : searchResults.length > 0 ? (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.foodItem, { backgroundColor: theme.surface }]}
                onPress={() => selectFoodFromSearch(item)}
              >
                <Text style={styles.foodItemIcon}>{item.icon}</Text>
                <View style={styles.foodItemInfo}>
                  <Text style={[styles.foodItemName, { color: theme.text }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.foodItemServing, { color: theme.textMuted }]}>
                    {item.serving_size} {item.is_drink && '🍹'}
                  </Text>
                  <Text style={[styles.foodItemCalories, { color: theme.textMuted }]}>
                    {item.calories} kcal • P:{item.protein}g • C:{item.carbs}g • G:{item.fats}g
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.searchResultsList}
          />
        ) : searchQuery.length >= 2 ? (
          <View style={styles.emptySearchContainer}>
            <Ionicons name="search" size={60} color={theme.textMuted} />
            <Text style={[styles.emptySearchText, { color: theme.textMuted }]}>
              {i18n.language === 'es' ? 'No se encontraron resultados' : 'No results found'}
            </Text>
            <Text style={[styles.emptySearchHint, { color: theme.textMuted }]}>
              {i18n.language === 'es' 
                ? 'Intenta con otro término de búsqueda' 
                : 'Try a different search term'}
            </Text>
          </View>
        ) : (
          <View style={styles.searchHintContainer}>
            <Ionicons name="restaurant-outline" size={60} color={theme.textMuted} />
            <Text style={[styles.searchHintTitle, { color: theme.text }]}>
              {i18n.language === 'es' 
                ? '¡Busca cualquier alimento o bebida!' 
                : 'Search any food or drink!'}
            </Text>
            <Text style={[styles.searchHintText, { color: theme.textMuted }]}>
              {i18n.language === 'es' 
                ? 'Ejemplos: daiquiri, sushi, empanada, café con leche, pizza...' 
                : 'Examples: daiquiri, sushi, coffee, pizza, burger...'}
            </Text>
          </View>
        )}
      </View>
    );
  }

  if (selectedImage) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.surface }]}>
          <TouchableOpacity onPress={cancel}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{t('trackFood.title')}</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.imageContainer}>
          <Image source={{ uri: selectedImage }} style={styles.image} />
        </View>

        {isAnalyzing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.text }]}>{t('trackFood.analyzing')}</Text>
          </View>
        ) : analysisResult ? (
          <View style={[styles.resultContainer, { backgroundColor: theme.surface }]}>
            <Text style={[styles.dishName, { color: theme.text }]}>{analysisResult.dishName}</Text>

            {/* Smart Portion Info Badge */}
            {analysisResult.foodType && (
              <View style={[styles.smartPortionBadge, { 
                backgroundColor: analysisResult.foodType === 'shareable' ? '#4CAF5020' : 
                                 analysisResult.foodType === 'container' ? '#2196F320' : '#FF980020'
              }]}>
                <Ionicons 
                  name={analysisResult.foodType === 'shareable' ? 'pizza-outline' : 
                        analysisResult.foodType === 'container' ? 'beer-outline' : 'restaurant-outline'} 
                  size={18} 
                  color={analysisResult.foodType === 'shareable' ? '#4CAF50' : 
                         analysisResult.foodType === 'container' ? '#2196F3' : '#FF9800'} 
                />
                <Text style={[styles.smartPortionText, { 
                  color: analysisResult.foodType === 'shareable' ? '#4CAF50' : 
                         analysisResult.foodType === 'container' ? '#2196F3' : '#FF9800'
                }]}>
                  {analysisResult.foodType === 'shareable' 
                    ? (i18n.language === 'es' 
                        ? `🍕 Dividido típicamente en ${analysisResult.typicalServings || 8} porciones` 
                        : `🍕 Typically divided into ${analysisResult.typicalServings || 8} portions`)
                    : analysisResult.foodType === 'container'
                    ? (i18n.language === 'es' 
                        ? `🥫 1 unidad = 1 porción completa` 
                        : `🥫 1 unit = 1 full portion`)
                    : (i18n.language === 'es' 
                        ? `🍽️ 1 plato = 1 porción completa` 
                        : `🍽️ 1 plate = 1 full portion`)
                  }
                </Text>
              </View>
            )}

            {/* Serving description */}
            {analysisResult.servingDescription && (
              <Text style={[styles.servingDescText, { color: theme.textMuted }]}>
                {i18n.language === 'es' ? 'Por porción: ' : 'Per portion: '}{analysisResult.servingDescription}
              </Text>
            )}

            {/* Portion Selector */}
            <View style={styles.portionContainer}>
              <Text style={[styles.portionLabel, { color: theme.textSecondary }]}>
                {i18n.language === 'es' ? '¿Cuántas porciones comiste?' : 'How many portions did you eat?'}
              </Text>
              
              {/* For shareable items, show helpful context */}
              {analysisResult.foodType === 'shareable' && analysisResult.totalCalories && (
                <Text style={[styles.portionHint, { color: theme.textMuted }]}>
                  {i18n.language === 'es' 
                    ? `Total del plato: ~${analysisResult.totalCalories} cal (${analysisResult.typicalServings || 8} porciones)` 
                    : `Total dish: ~${analysisResult.totalCalories} cal (${analysisResult.typicalServings || 8} portions)`}
                </Text>
              )}
              
              <View style={styles.portionButtons}>
                {PORTION_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.portionButton,
                      { backgroundColor: theme.surfaceVariant },
                      portions === option && !showCustomPortions && { backgroundColor: theme.primary },
                    ]}
                    onPress={() => {
                      setPortions(option);
                      setShowCustomPortions(false);
                      setCustomPortions('');
                    }}
                  >
                    <Text
                      style={[
                        styles.portionButtonText,
                        { color: theme.textMuted },
                        portions === option && !showCustomPortions && { color: '#fff' },
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
                {/* Custom portions button */}
                <TouchableOpacity
                  style={[
                    styles.portionButton,
                    { backgroundColor: theme.surfaceVariant },
                    showCustomPortions && { backgroundColor: theme.primary },
                  ]}
                  onPress={() => setShowCustomPortions(true)}
                >
                  <Text
                    style={[
                      styles.portionButtonText,
                      { color: theme.textMuted },
                      showCustomPortions && { color: '#fff' },
                    ]}
                  >
                    ...
                  </Text>
                </TouchableOpacity>
              </View>
              
              {/* Custom portions input */}
              {showCustomPortions && (
                <View style={styles.customPortionsContainer}>
                  <TextInput
                    style={[styles.customPortionsInput, { backgroundColor: theme.surfaceVariant, color: theme.text }]}
                    placeholder={i18n.language === 'es' ? 'Ej: 6' : 'E.g.: 6'}
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    value={customPortions}
                    onChangeText={(text) => {
                      setCustomPortions(text);
                      const num = parseFloat(text);
                      if (!isNaN(num) && num > 0) {
                        setPortions(num);
                      }
                    }}
                    autoFocus
                  />
                  <Text style={[styles.customPortionsHint, { color: theme.textMuted }]}>
                    {i18n.language === 'es' ? 'porciones' : 'portions'}
                  </Text>
                </View>
              )}
            </View>

            {/* FAT SELECTOR FOR PHOTO ANALYSIS */}
            <View style={[styles.fatSelectorBox, { backgroundColor: theme.surfaceVariant, borderColor: '#FFD700' }]}>
              <View style={styles.fatSelectorHeader}>
                <Ionicons name="flame" size={20} color="#FFD700" />
                <Text style={[styles.fatSelectorTitle, { color: theme.text }]}>
                  {i18n.language === 'es' ? '¿Usaste grasa para cocinar?' : 'Did you use cooking fat?'}
                </Text>
              </View>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fatTypeScrollView}>
                {FAT_TYPES.map((fat) => (
                  <TouchableOpacity
                    key={fat.id}
                    style={[
                      styles.fatTypeChip,
                      { backgroundColor: theme.surface },
                      photoFatType === fat.id && styles.fatTypeChipActive,
                    ]}
                    onPress={() => {
                      setPhotoFatType(fat.id);
                      if (fat.id === 'none') setPhotoFatTablespoons(0);
                    }}
                  >
                    <Text style={styles.fatTypeChipIcon}>{fat.icon}</Text>
                    <Text style={[
                      styles.fatTypeChipText,
                      { color: theme.textMuted },
                      photoFatType === fat.id && styles.fatTypeChipTextActive,
                    ]}>
                      {i18n.language === 'es' ? fat.es : fat.en}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {photoFatType !== 'none' && (
                <View style={styles.tablespoonContainer}>
                  <Text style={[styles.tablespoonLabel, { color: theme.text }]}>
                    {i18n.language === 'es' ? 'Cucharadas:' : 'Tablespoons:'}
                  </Text>
                  <View style={styles.tablespoonRow}>
                    {TABLESPOON_OPTIONS.map((tbsp) => (
                      <TouchableOpacity
                        key={tbsp}
                        style={[
                          styles.tablespoonChip,
                          { backgroundColor: theme.surface },
                          photoFatTablespoons === tbsp && styles.tablespoonChipActive,
                        ]}
                        onPress={() => setPhotoFatTablespoons(tbsp)}
                      >
                        <Text style={[
                          styles.tablespoonChipText,
                          { color: theme.textMuted },
                          photoFatTablespoons === tbsp && styles.tablespoonChipTextActive,
                        ]}>
                          {tbsp}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {photoFatTablespoons > 0 && (
                    <Text style={[styles.fatCaloriesInfo, { color: '#FFD700' }]}>
                      +{getPhotoFatCalories()} cal {i18n.language === 'es' ? 'de grasa' : 'from fat'}
                    </Text>
                  )}
                </View>
              )}
            </View>

            <View style={styles.macrosContainer}>
              <View style={[styles.macroBox, { backgroundColor: theme.surfaceVariant }]}>
                <Text style={[styles.macroValue, { color: theme.primary }]}>
                  {getAdjustedValue(analysisResult.calories) + getPhotoFatCalories() + addedIngredients.reduce((sum, ing) => sum + ing.calories, 0)}
                </Text>
                <Text style={[styles.macroLabel, { color: theme.textMuted }]}>{t('trackFood.calories')}</Text>
              </View>
              <View style={[styles.macroBox, { backgroundColor: theme.surfaceVariant }]}>
                <Text style={[styles.macroValue, { color: theme.primary }]}>
                  {(parseFloat(getAdjustedDecimal(analysisResult.protein)) + addedIngredients.reduce((sum, ing) => sum + ing.protein, 0)).toFixed(1)}g
                </Text>
                <Text style={[styles.macroLabel, { color: theme.textMuted }]}>{t('trackFood.protein')}</Text>
              </View>
              <View style={[styles.macroBox, { backgroundColor: theme.surfaceVariant }]}>
                <Text style={[styles.macroValue, { color: theme.primary }]}>
                  {(parseFloat(getAdjustedDecimal(analysisResult.carbs)) + addedIngredients.reduce((sum, ing) => sum + ing.carbs, 0)).toFixed(1)}g
                </Text>
                <Text style={[styles.macroLabel, { color: theme.textMuted }]}>{t('trackFood.carbs')}</Text>
              </View>
              <View style={[styles.macroBox, { backgroundColor: theme.surfaceVariant }]}>
                <Text style={[styles.macroValue, { color: theme.primary }]}>
                  {(parseFloat(getAdjustedDecimal(analysisResult.fats)) + addedIngredients.reduce((sum, ing) => sum + ing.fats, 0)).toFixed(1)}g
                </Text>
                <Text style={[styles.macroLabel, { color: theme.textMuted }]}>{t('trackFood.fats')}</Text>
              </View>
            </View>

            {analysisResult.warnings && analysisResult.warnings.length > 0 && (
              <View style={styles.warningsContainer}>
                {analysisResult.warnings.map((warning: string, index: number) => (
                  <View key={index} style={styles.warningItem}>
                    <Ionicons name="warning" size={16} color={theme.warning} />
                    <Text style={[styles.warningText, { color: theme.warning }]}>{warning}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.ingredientsContainer}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('trackFood.ingredients')}</Text>
              {analysisResult.ingredients.map((ingredient: string, index: number) => (
                <View key={index} style={styles.ingredientEditRow}>
                  <Text style={[styles.ingredientText, { color: theme.textSecondary, flex: 1 }]}>• {ingredient}</Text>
                  <TouchableOpacity 
                    onPress={() => {
                      setEditingIngredientIndex(index);
                      setEditIngredientText(ingredient);
                    }}
                    style={styles.editIngredientButton}
                  >
                    <Ionicons name="pencil" size={16} color={theme.primary} />
                  </TouchableOpacity>
                </View>
              ))}
              
              {/* Added ingredients */}
              {addedIngredients.map((ing, index) => (
                <View key={`added-${index}`} style={styles.addedIngredientRow}>
                  <Text style={[styles.ingredientText, { color: theme.primary }]}>+ {ing.name}</Text>
                  <TouchableOpacity onPress={() => {
                    setAddedIngredients(addedIngredients.filter((_, i) => i !== index));
                  }}>
                    <Ionicons name="close-circle" size={18} color={theme.error || '#FF6B6B'} />
                  </TouchableOpacity>
                </View>
              ))}
              
              {/* Add missing ingredient button */}
              <TouchableOpacity 
                style={[styles.addIngredientButton, { borderColor: theme.primary }]}
                onPress={() => setShowAddIngredient(true)}
              >
                <Ionicons name="add-circle-outline" size={20} color={theme.primary} />
                <Text style={[styles.addIngredientText, { color: theme.primary }]}>
                  {i18n.language === 'es' ? '¿Falta algún ingrediente?' : 'Missing an ingredient?'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Edit Ingredient Modal */}
            <Modal
              visible={editingIngredientIndex !== null}
              animationType="fade"
              transparent={true}
              onRequestClose={() => setEditingIngredientIndex(null)}
            >
              <View style={styles.editIngredientModalOverlay}>
                <View style={[styles.editIngredientModal, { backgroundColor: theme.surface }]}>
                  <Text style={[styles.editIngredientTitle, { color: theme.text }]}>
                    {i18n.language === 'es' ? 'Editar ingrediente' : 'Edit ingredient'}
                  </Text>
                  <Text style={[styles.editIngredientHint, { color: theme.textMuted }]}>
                    {i18n.language === 'es' 
                      ? '¿La IA se equivocó? Corregí el nombre:' 
                      : 'Did the AI make a mistake? Fix the name:'}
                  </Text>
                  <TextInput
                    style={[styles.editIngredientInput, { backgroundColor: theme.surfaceVariant, color: theme.text }]}
                    value={editIngredientText}
                    onChangeText={setEditIngredientText}
                    placeholder={i18n.language === 'es' ? 'Nombre del ingrediente' : 'Ingredient name'}
                    placeholderTextColor={theme.textMuted}
                    autoFocus
                  />
                  <View style={styles.editIngredientButtons}>
                    <TouchableOpacity 
                      style={[styles.editIngredientCancelBtn, { backgroundColor: theme.surfaceVariant }]}
                      onPress={() => {
                        setEditingIngredientIndex(null);
                        setEditIngredientText('');
                      }}
                    >
                      <Text style={[styles.editIngredientCancelText, { color: theme.textMuted }]}>
                        {i18n.language === 'es' ? 'Cancelar' : 'Cancel'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.editIngredientSaveBtn, { backgroundColor: theme.primary }]}
                      onPress={() => {
                        if (editingIngredientIndex !== null && editIngredientText.trim()) {
                          // Update the ingredient in analysisResult
                          const newIngredients = [...analysisResult.ingredients];
                          newIngredients[editingIngredientIndex] = editIngredientText.trim();
                          setAnalysisResult({
                            ...analysisResult,
                            ingredients: newIngredients
                          });
                        }
                        setEditingIngredientIndex(null);
                        setEditIngredientText('');
                      }}
                    >
                      <Text style={styles.editIngredientSaveText}>
                        {i18n.language === 'es' ? 'Guardar' : 'Save'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>

            {/* Add Ingredient Modal */}
            <Modal
              visible={showAddIngredient}
              animationType="slide"
              transparent={true}
              onRequestClose={() => setShowAddIngredient(false)}
            >
              <View style={styles.ingredientModalOverlay}>
                <View style={[styles.ingredientModal, { backgroundColor: theme.surface }]}>
                  <View style={styles.ingredientModalHeader}>
                    <Text style={[styles.ingredientModalTitle, { color: theme.text }]}>
                      {i18n.language === 'es' ? 'Añadir ingrediente' : 'Add ingredient'}
                    </Text>
                    <TouchableOpacity onPress={() => {
                      setShowAddIngredient(false);
                      setIngredientSearch('');
                      setIngredientSearchResults([]);
                    }}>
                      <Ionicons name="close" size={28} color={theme.text} />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={[styles.ingredientSearchBox, { backgroundColor: theme.surfaceVariant }]}>
                    <Ionicons name="search" size={20} color={theme.textMuted} />
                    <TextInput
                      style={[styles.ingredientSearchInput, { color: theme.text }]}
                      placeholder={i18n.language === 'es' ? 'Buscar: huevo, queso, jamón...' : 'Search: egg, cheese, ham...'}
                      placeholderTextColor={theme.textMuted}
                      value={ingredientSearch}
                      onChangeText={async (text) => {
                        setIngredientSearch(text);
                        if (text.length >= 2) {
                          setIsSearchingIngredient(true);
                          try {
                            const response = await fetch(`${API_URL}/api/search-food`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ query: text, language: i18n.language }),
                            });
                            const data = await response.json();
                            setIngredientSearchResults(data.foods || []);
                          } catch (e) {
                            console.error(e);
                          } finally {
                            setIsSearchingIngredient(false);
                          }
                        } else {
                          setIngredientSearchResults([]);
                        }
                      }}
                      autoFocus
                    />
                  </View>
                  
                  {isSearchingIngredient ? (
                    <ActivityIndicator size="small" color={theme.primary} style={{ marginTop: 20 }} />
                  ) : (
                    <ScrollView style={styles.ingredientResultsList}>
                      {ingredientSearchResults.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.ingredientResultItem, { backgroundColor: theme.surfaceVariant }]}
                          onPress={() => {
                            // Add proportional to portions
                            const proportionalCalories = Math.round(item.calories / 8 * portions);
                            const proportionalProtein = Math.round(item.protein / 8 * portions * 10) / 10;
                            const proportionalCarbs = Math.round(item.carbs / 8 * portions * 10) / 10;
                            const proportionalFats = Math.round(item.fats / 8 * portions * 10) / 10;
                            
                            setAddedIngredients([...addedIngredients, {
                              name: item.name,
                              calories: proportionalCalories,
                              protein: proportionalProtein,
                              carbs: proportionalCarbs,
                              fats: proportionalFats,
                            }]);
                            setShowAddIngredient(false);
                            setIngredientSearch('');
                            setIngredientSearchResults([]);
                          }}
                        >
                          <Text style={styles.ingredientResultIcon}>{item.icon}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.ingredientResultName, { color: theme.text }]}>{item.name}</Text>
                            <Text style={[styles.ingredientResultCals, { color: theme.textMuted }]}>
                              ~{Math.round(item.calories / 8)} cal {i18n.language === 'es' ? 'por porción' : 'per portion'}
                            </Text>
                          </View>
                          <Ionicons name="add-circle" size={24} color={theme.primary} />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              </View>
            </Modal>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={[styles.cancelButton, { backgroundColor: theme.surfaceVariant }]} onPress={cancel}>
                <Text style={[styles.cancelButtonText, { color: theme.textMuted }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.primary }]} onPress={saveMeal}>
                <Text style={styles.saveButtonText}>{t('trackFood.saveMeal')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </ScrollView>
    );
  }

  // Mode: Select option
  if (mode === 'select') {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.surface }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{t('trackFood.title')}</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          <Ionicons name="nutrition" size={80} color={theme.primary} />
          <Text style={[styles.instructionText, { color: theme.textSecondary }]}>
            {i18n.language === 'es' ? '¿Cómo quieres registrar tu comida?' : 'How do you want to track your food?'}
          </Text>

          <TouchableOpacity 
            style={[styles.methodCard, { backgroundColor: theme.surface }]} 
            onPress={() => { setMode('photo'); pickImage(); }}
          >
            <Ionicons name="camera" size={40} color={theme.primary} />
            <View style={styles.methodCardText}>
              <Text style={[styles.methodCardTitle, { color: theme.text }]}>
                {t('trackFood.takePhoto')}
              </Text>
              <Text style={[styles.methodCardDesc, { color: theme.textMuted }]}>
                {i18n.language === 'es' ? 'Toma una foto de tu plato' : 'Take a photo of your plate'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.methodCard, { backgroundColor: theme.surface }]} 
            onPress={() => { setMode('photo'); pickFromGallery(); }}
          >
            <Ionicons name="images" size={40} color={theme.primary} />
            <View style={styles.methodCardText}>
              <Text style={[styles.methodCardTitle, { color: theme.text }]}>
                {t('trackFood.chooseGallery')}
              </Text>
              <Text style={[styles.methodCardDesc, { color: theme.textMuted }]}>
                {i18n.language === 'es' ? 'Selecciona una imagen guardada' : 'Select a saved image'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.methodCard, { backgroundColor: theme.surface }]} 
            onPress={() => setMode('search')}
          >
            <Ionicons name="search" size={40} color={theme.primary} />
            <View style={styles.methodCardText}>
              <Text style={[styles.methodCardTitle, { color: theme.text }]}>
                {i18n.language === 'es' ? 'Buscar alimento' : 'Search Food'}
              </Text>
              <Text style={[styles.methodCardDesc, { color: theme.textMuted }]}>
                {i18n.language === 'es' ? 'Busca en la base de datos' : 'Search in the database'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.textMuted} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Default return for photo mode without image yet
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={cancel}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('trackFood.title')}</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.text }]}>
          {i18n.language === 'es' ? 'Preparando cámara...' : 'Preparing camera...'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor applied inline with theme.background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    // backgroundColor applied inline with theme.surface
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    // color applied inline with theme.text
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  portionContainer: {
    marginBottom: 20,
    // backgroundColor applied inline with theme.surface
    padding: 16,
    borderRadius: 12,
  },
  portionLabel: {
    // color applied inline with theme.text
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  portionHint: {
    fontSize: 12,
    marginBottom: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  portionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  portionButton: {
    flex: 1,
    // backgroundColor applied inline with theme.surfaceVariant
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  portionButtonActive: {
    // backgroundColor applied inline with theme.primary
  },
  portionButtonText: {
    // color applied inline with theme.textMuted
    fontSize: 14,
    fontWeight: '600',
  },
  portionButtonTextActive: {
    color: '#fff',
  },
  customPortionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  customPortionsInput: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  customPortionsHint: {
    fontSize: 14,
  },
  instructionText: {
    // color applied inline with theme.textSecondary
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor applied inline with theme.primary
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
    // borderColor applied inline with theme.primary
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  secondaryButtonText: {
    // color applied inline with theme.primary
    fontSize: 18,
    fontWeight: '600',
  },
  imageContainer: {
    width: '100%',
    height: 300,
    // backgroundColor applied inline with theme.surface
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    // color applied inline with theme.text
    marginTop: 16,
    fontSize: 16,
  },
  resultContainer: {
    padding: 20,
  },
  dishName: {
    fontSize: 24,
    fontWeight: 'bold',
    // color applied inline with theme.text
    marginBottom: 12,
  },
  smartPortionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  smartPortionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  servingDescText: {
    fontSize: 13,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  macrosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  macroBox: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 20,
    fontWeight: 'bold',
    // color applied inline with theme.primary
  },
  macroLabel: {
    fontSize: 12,
    // color applied inline with theme.textMuted
    marginTop: 4,
  },
  warningsContainer: {
    backgroundColor: '#FFA50020',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  warningText: {
    color: '#FFA500',
    fontSize: 14,
  },
  ingredientsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    // color applied inline with theme.text
    marginBottom: 8,
  },
  ingredientText: {
    // color applied inline with theme.textSecondary
    fontSize: 14,
    marginBottom: 4,
  },
  addedIngredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  addIngredientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    marginTop: 12,
  },
  addIngredientText: {
    fontSize: 14,
    fontWeight: '500',
  },
  ingredientModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  ingredientModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  ingredientModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  ingredientModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  ingredientSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  ingredientSearchInput: {
    flex: 1,
    fontSize: 16,
  },
  ingredientResultsList: {
    maxHeight: 300,
  },
  ingredientResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  ingredientResultIcon: {
    fontSize: 28,
  },
  ingredientResultName: {
    fontSize: 15,
    fontWeight: '500',
  },
  ingredientResultCals: {
    fontSize: 12,
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    // backgroundColor applied inline with theme.surfaceVariant
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    // color applied inline with theme.text
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    // backgroundColor applied inline with theme.primary
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Method cards
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 16,
    width: '100%',
  },
  methodCardText: {
    flex: 1,
  },
  methodCardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  methodCardDesc: {
    fontSize: 13,
    marginTop: 4,
  },
  // Search styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    margin: 16,
    borderRadius: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  searchResultsList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    gap: 12,
  },
  foodItemIcon: {
    fontSize: 32,
  },
  foodItemInfo: {
    flex: 1,
  },
  foodItemName: {
    fontSize: 16,
    fontWeight: '500',
  },
  foodItemCalories: {
    fontSize: 12,
    marginTop: 2,
  },
  foodItemServing: {
    fontSize: 13,
    marginTop: 2,
    fontStyle: 'italic',
  },
  emptySearchContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptySearchText: {
    fontSize: 16,
    marginTop: 16,
  },
  emptySearchHint: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  loadingSearchContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  searchHintContainer: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    paddingTop: 60,
  },
  searchHintTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  searchHintText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  // Food detail styles
  foodDetailContainer: {
    padding: 20,
    alignItems: 'center',
  },
  foodDetailIcon: {
    fontSize: 80,
    marginBottom: 16,
  },
  foodDetailName: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  servingSizeText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  nutritionCard: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#33333350',
  },
  totalRow: {
    borderTopWidth: 2,
    borderTopColor: '#4CAF50',
    marginTop: 8,
    paddingTop: 12,
  },
  nutritionLabel: {
    fontSize: 15,
  },
  nutritionValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  // Fat selector styles
  fatSelectorBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 16,
    width: '100%',
  },
  fatSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  fatSelectorTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  fatTypeScrollView: {
    marginBottom: 12,
  },
  fatTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
  },
  fatTypeChipActive: {
    backgroundColor: '#FFD70030',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  fatTypeChipIcon: {
    fontSize: 16,
  },
  fatTypeChipText: {
    fontSize: 12,
  },
  fatTypeChipTextActive: {
    color: '#FFD700',
    fontWeight: '600',
  },
  tablespoonContainer: {
    marginTop: 8,
  },
  tablespoonLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  tablespoonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tablespoonChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 44,
    alignItems: 'center',
  },
  tablespoonChipActive: {
    backgroundColor: '#FFD700',
  },
  tablespoonChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  tablespoonChipTextActive: {
    color: '#000',
  },
  fatCaloriesInfo: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
});