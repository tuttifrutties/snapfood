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
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Common ingredient list
const COMMON_INGREDIENTS = [
  'Chicken', 'Beef', 'Pork', 'Fish', 'Eggs', 'Milk', 'Cheese', 'Butter',
  'Rice', 'Pasta', 'Bread', 'Flour', 'Potatoes', 'Tomatoes', 'Onions',
  'Garlic', 'Carrots', 'Broccoli', 'Lettuce', 'Spinach', 'Bell Peppers',
  'Mushrooms', 'Beans', 'Lentils', 'Olive Oil', 'Salt', 'Pepper',
];

const COMMON_INGREDIENTS_ES = [
  'Pollo', 'Carne', 'Cerdo', 'Pescado', 'Huevos', 'Leche', 'Queso', 'Mantequilla',
  'Arroz', 'Pasta', 'Pan', 'Harina', 'Papas', 'Tomates', 'Cebollas',
  'Ajo', 'Zanahorias', 'Brócoli', 'Lechuga', 'Espinaca', 'Pimientos',
  'Champiñones', 'Frijoles', 'Lentejas', 'Aceite de Oliva', 'Sal', 'Pimienta',
];

export default function CookingScreen() {
  const { userId, isPremium } = useUser();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState<'select' | 'photo' | 'manual' | 'results'>('select');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('')
  const [recipes, setRecipes] = useState<any[]>([]);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(false);
  const [todayCookingCount, setTodayCookingCount] = useState(0);

  const ingredientList = i18n.language === 'es' ? COMMON_INGREDIENTS_ES : COMMON_INGREDIENTS;

  useEffect(() => {
    checkTodayCookingCount();
  }, [userId]);

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

  const filteredIngredients = ingredientList.filter(ing =>
    ing.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const getRecipeSuggestions = async () => {
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
      const response = await fetch(`${API_URL}/api/recipe-suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          ingredients: selectedIngredients,
          language: currentLanguage,
        }),
      });

      const data = await response.json();
      setRecipes(data.recipes || []);
      setMode('results');
      
      // Increment cooking count for free users
      if (!isPremium) {
        await incrementCookingCount();
      }
    } catch (error) {
      console.error('Failed to get recipes:', error);
      Alert.alert(t('common.error'), 'Failed to get recipe suggestions. Please try again.');
    } finally {
      setIsLoadingRecipes(false);
    }
  };

  const viewRecipe = (recipe: any) => {
    router.push({
      pathname: '/cooking/recipe/[id]',
      params: { recipeData: JSON.stringify(recipe) },
    });
  };

  const cancel = () => {
    router.back();
  };

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
          <Text style={styles.subtitle}>{t('cooking.subtitle')}</Text>

          <TouchableOpacity
            style={styles.methodCard}
            onPress={() => setMode('photo')}
          >
            <Ionicons name="camera" size={48} color="#FF6B6B" />
            <Text style={styles.methodTitle}>{t('cooking.takePhotoIngredients')}</Text>
            <Text style={styles.methodDescription}>{t('cooking.takePhotoIngredientsDesc')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.methodCard}
            onPress={() => setMode('manual')}
          >
            <Ionicons name="list" size={48} color="#FF6B6B" />
            <Text style={styles.methodTitle}>{t('cooking.manualSelect')}</Text>
            <Text style={styles.methodDescription}>{t('cooking.manualSelectDesc')}</Text>
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
            <ActivityIndicator size="large" color="#FF6B6B" />
            <Text style={styles.loadingText}>{t('cooking.analyzingIngredients')}</Text>
          </View>
        ) : selectedImage ? (
          <View style={styles.imagePreview}>
            <Image source={{ uri: selectedImage }} style={styles.image} />
          </View>
        ) : (
          <View style={styles.content}>
            <Ionicons name="camera" size={120} color="#FF6B6B" />
            <Text style={styles.instructionText}>
              Take a photo of your fridge or pantry ingredients
            </Text>

            <TouchableOpacity style={styles.primaryButton} onPress={pickImage}>
              <Ionicons name="camera" size={24} color="#fff" />
              <Text style={styles.primaryButtonText}>{t('trackFood.takePhoto')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={pickFromGallery}>
              <Ionicons name="images" size={24} color="#FF6B6B" />
              <Text style={styles.secondaryButtonText}>{t('trackFood.chooseGallery')}</Text>
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
            placeholder={t('cooking.searchIngredients')}
            placeholderTextColor="#555"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.selectedBadge}>
          <Text style={styles.selectedText}>
            {t('cooking.selectedCount', { count: selectedIngredients.length })}
          </Text>
        </View>

        <FlatList
          data={filteredIngredients}
          keyExtractor={(item) => item}
          numColumns={2}
          contentContainerStyle={styles.ingredientList}
          renderItem={({ item }) => {
            const isSelected = selectedIngredients.includes(item);
            return (
              <TouchableOpacity
                style={[
                  styles.ingredientItem,
                  isSelected && styles.ingredientItemSelected,
                ]}
                onPress={() => toggleIngredient(item)}
              >
                <Text
                  style={[
                    styles.ingredientText,
                    isSelected && styles.ingredientTextSelected,
                  ]}
                >
                  {item}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={20} color="#FF6B6B" />
                )}
              </TouchableOpacity>
            );
          }}
        />

        <View style={styles.bottomButton}>
          <TouchableOpacity
            style={styles.getSuggestionsButton}
            onPress={getRecipeSuggestions}
            disabled={isLoadingRecipes}
          >
            {isLoadingRecipes ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.getSuggestionsButtonText}>
                {t('cooking.getSuggestions')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Mode: Recipe results
  if (mode === 'results') {
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
            {recipes.map((recipe) => (
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
                <Text style={styles.recipeDescription}>{recipe.description}</Text>
                <View style={styles.recipeMacros}>
                  <Text style={styles.recipeMacroText}>{recipe.calories} cal</Text>
                  <Text style={styles.recipeMacroText}>P: {recipe.protein}g</Text>
                  <Text style={styles.recipeMacroText}>C: {recipe.carbs}g</Text>
                  <Text style={styles.recipeMacroText}>F: {recipe.fats}g</Text>
                </View>
                <TouchableOpacity style={styles.viewRecipeButton}>
                  <Text style={styles.viewRecipeButtonText}>{t('cooking.viewRecipe')}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#FF6B6B" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
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
    backgroundColor: '#FF6B6B20',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  selectedText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
  },
  ingredientList: {
    padding: 16,
  },
  ingredientItem: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    margin: 4,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ingredientItemSelected: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FF6B6B10',
  },
  ingredientText: {
    color: '#aaa',
    fontSize: 14,
  },
  ingredientTextSelected: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  bottomButton: {
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  getSuggestionsButton: {
    backgroundColor: '#FF6B6B',
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
    color: '#FF6B6B',
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
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
  },
});