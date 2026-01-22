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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@/src/contexts/UserContext';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { searchFoods, getAllCategories, getFoodsByCategory, FoodItem } from '../../src/data/foods';
import { updateDailyCalories } from '../../src/services/nutritionCoach';

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
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [foodPortions, setFoodPortions] = useState(1);

  const PORTION_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3];

  const getAdjustedValue = (value: number) => {
    return Math.round(value * portions);
  };

  const getAdjustedDecimal = (value: number) => {
    return (value * portions).toFixed(1);
  };

  // Search functions
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      const results = searchFoods(query, i18n.language as 'es' | 'en');
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const selectFoodFromSearch = (food: FoodItem) => {
    setSelectedFood(food);
    setFoodPortions(1);
  };

  const saveFoodFromSearch = async () => {
    if (!userId || !selectedFood) return;

    try {
      const adjustedCalories = Math.round(selectedFood.calories * foodPortions);
      const adjustedProtein = Math.round(selectedFood.protein * foodPortions * 10) / 10;
      const adjustedCarbs = Math.round(selectedFood.carbs * foodPortions * 10) / 10;
      const adjustedFats = Math.round(selectedFood.fats * foodPortions * 10) / 10;

      // Save to local history
      const historyKey = `food_history_${userId}`;
      const existingHistory = await AsyncStorage.getItem(historyKey);
      const history = existingHistory ? JSON.parse(existingHistory) : [];

      const newEntry = {
        id: `food_${Date.now()}`,
        userId,
        timestamp: new Date().toISOString(),
        foodName: selectedFood.name[i18n.language as 'es' | 'en'] || selectedFood.name.es,
        mealType: 'food',
        portions: foodPortions,
        calories: adjustedCalories,
        protein: adjustedProtein,
        carbs: adjustedCarbs,
        fats: adjustedFats,
        icon: selectedFood.icon,
        isSearched: true,
        baseCalories: selectedFood.calories,
        baseProtein: selectedFood.protein,
        baseCarbs: selectedFood.carbs,
        baseFats: selectedFood.fats,
      };

      history.unshift(newEntry);
      await AsyncStorage.setItem(historyKey, JSON.stringify(history));

      // Update daily calories
      await updateDailyCalories(adjustedCalories);

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

        // Save with adjusted values based on portions
        await fetch(`${API_URL}/api/meals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            photoBase64: base64Data,
            dishName: analysisResult.dishName,
            calories: getAdjustedValue(analysisResult.calories),
            protein: parseFloat(getAdjustedDecimal(analysisResult.protein)),
            carbs: parseFloat(getAdjustedDecimal(analysisResult.carbs)),
            fats: parseFloat(getAdjustedDecimal(analysisResult.fats)),
            ingredients: analysisResult.ingredients,
            warnings: analysisResult.warnings,
            portions: portions,
          }),
        });

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
              {selectedFood.name[i18n.language as 'es' | 'en'] || selectedFood.name.es}
            </Text>

            {/* Portions selector */}
            <View style={[styles.portionContainer, { backgroundColor: theme.surface }]}>
              <Text style={[styles.portionLabel, { color: theme.text }]}>
                {i18n.language === 'es' ? 'Porciones (1 = lo que ves en la foto)' : 'Portions (1 = what you see)'}
              </Text>
              <Text style={[styles.portionHint, { color: theme.textMuted }]}>
                {i18n.language === 'es' 
                  ? '1 hamburguesa = 1 porción, 1 muffin = 1 porción' 
                  : '1 burger = 1 portion, 1 muffin = 1 portion'}
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

            {/* Nutritional info */}
            <View style={[styles.nutritionCard, { backgroundColor: theme.surface }]}>
              <View style={styles.nutritionRow}>
                <Text style={[styles.nutritionLabel, { color: theme.textMuted }]}>
                  {i18n.language === 'es' ? 'Calorías' : 'Calories'}
                </Text>
                <Text style={[styles.nutritionValue, { color: theme.primary }]}>
                  {Math.round(selectedFood.calories * foodPortions)} kcal
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
            placeholder={i18n.language === 'es' ? 'Buscar: naranja, pollo, arroz...' : 'Search: orange, chicken, rice...'}
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={handleSearch}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
              <Ionicons name="close-circle" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {searchResults.length > 0 ? (
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
                    {item.name[i18n.language as 'es' | 'en'] || item.name.es}
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
          </View>
        ) : (
          <View style={styles.searchHintContainer}>
            <Text style={[styles.searchHintText, { color: theme.textMuted }]}>
              {i18n.language === 'es' 
                ? 'Escribe al menos 2 letras para buscar' 
                : 'Type at least 2 letters to search'}
            </Text>
            <View style={styles.categoriesGrid}>
              {getAllCategories().map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryChip, { backgroundColor: theme.surface }]}
                  onPress={() => {
                    const foods = getFoodsByCategory(cat.id);
                    setSearchResults(foods);
                    setSearchQuery(cat.es);
                  }}
                >
                  <Text style={styles.categoryChipIcon}>{cat.icon}</Text>
                  <Text style={[styles.categoryChipText, { color: theme.text }]}>
                    {i18n.language === 'es' ? cat.es : cat.en}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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

            {/* Portion Selector */}
            <View style={styles.portionContainer}>
              <Text style={[styles.portionLabel, { color: theme.textSecondary }]}>{t('trackFood.portionSize')}</Text>
              <View style={styles.portionButtons}>
                {PORTION_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.portionButton,
                      { backgroundColor: theme.surfaceVariant },
                      portions === option && { backgroundColor: theme.primary },
                    ]}
                    onPress={() => setPortions(option)}
                  >
                    <Text
                      style={[
                        styles.portionButtonText,
                        { color: theme.textMuted },
                        portions === option && { color: '#fff' },
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.macrosContainer}>
              <View style={[styles.macroBox, { backgroundColor: theme.surfaceVariant }]}>
                <Text style={[styles.macroValue, { color: theme.primary }]}>{getAdjustedValue(analysisResult.calories)}</Text>
                <Text style={[styles.macroLabel, { color: theme.textMuted }]}>{t('trackFood.calories')}</Text>
              </View>
              <View style={[styles.macroBox, { backgroundColor: theme.surfaceVariant }]}>
                <Text style={[styles.macroValue, { color: theme.primary }]}>{getAdjustedDecimal(analysisResult.protein)}g</Text>
                <Text style={[styles.macroLabel, { color: theme.textMuted }]}>{t('trackFood.protein')}</Text>
              </View>
              <View style={[styles.macroBox, { backgroundColor: theme.surfaceVariant }]}>
                <Text style={[styles.macroValue, { color: theme.primary }]}>{getAdjustedDecimal(analysisResult.carbs)}g</Text>
                <Text style={[styles.macroLabel, { color: theme.textMuted }]}>{t('trackFood.carbs')}</Text>
              </View>
              <View style={[styles.macroBox, { backgroundColor: theme.surfaceVariant }]}>
                <Text style={[styles.macroValue, { color: theme.primary }]}>{getAdjustedDecimal(analysisResult.fats)}g</Text>
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
                <Text key={index} style={[styles.ingredientText, { color: theme.textSecondary }]}>• {ingredient}</Text>
              ))}
            </View>

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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  portionContainer: {
    marginBottom: 20,
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
  },
  portionLabel: {
    color: '#fff',
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
    backgroundColor: '#333',
    paddingVertical: 12,
    borderRadius: 8,
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
    backgroundColor: '#FF6B6B',
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
    borderColor: '#FF6B6B',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  secondaryButtonText: {
    color: '#FF6B6B',
    fontSize: 18,
    fontWeight: '600',
  },
  imageContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#1a1a1a',
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
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  resultContainer: {
    padding: 20,
  },
  dishName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
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
    color: '#FF6B6B',
  },
  macroLabel: {
    fontSize: 12,
    color: '#aaa',
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
    color: '#fff',
    marginBottom: 8,
  },
  ingredientText: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#333',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FF6B6B',
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
    marginTop: 4,
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
  searchHintContainer: {
    flex: 1,
    padding: 20,
  },
  searchHintText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  categoryChipIcon: {
    fontSize: 18,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
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
    marginBottom: 20,
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
  nutritionLabel: {
    fontSize: 15,
  },
  nutritionValue: {
    fontSize: 15,
    fontWeight: '600',
  },
});