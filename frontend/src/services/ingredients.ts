/**
 * Ingredients Service
 * Handles saving and retrieving user's available ingredients
 * Auto-saves when user selects ingredients
 * Includes memory feature with 1-week expiration
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const LOCAL_INGREDIENTS_KEY = 'user_ingredients_cache';
const INGREDIENTS_MEMORY_KEY = 'ingredients_memory';
const MEMORY_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds

interface IngredientsResponse {
  ingredients: string[];
  lastUpdated: string | null;
  count: number;
}

interface IngredientMemoryItem {
  ingredient: string;
  savedAt: number; // timestamp
}

interface IngredientsMemory {
  items: IngredientMemoryItem[];
  lastUpdated: number;
}

/**
 * Save ingredients to the server (and local cache)
 * @param userId User ID
 * @param ingredients Array of ingredient names
 * @param append If true, adds to existing. If false, replaces all.
 */
export async function saveIngredients(
  userId: string,
  ingredients: string[],
  append: boolean = true
): Promise<boolean> {
  try {
    // First save to local cache
    if (append) {
      const existing = await getLocalIngredients();
      const merged = [...new Set([...existing, ...ingredients])];
      await AsyncStorage.setItem(LOCAL_INGREDIENTS_KEY, JSON.stringify(merged));
    } else {
      await AsyncStorage.setItem(LOCAL_INGREDIENTS_KEY, JSON.stringify(ingredients));
    }

    // Then try to sync with server
    const response = await fetch(`${API_URL}/api/users/${userId}/ingredients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ingredients, append }),
    });

    return response.ok;
  } catch (error) {
    console.error('[Ingredients] Error saving:', error);
    // Even if server fails, local save succeeded
    return true;
  }
}

/**
 * Get ingredients from server, fallback to local cache
 */
export async function getIngredients(userId: string): Promise<string[]> {
  try {
    const response = await fetch(`${API_URL}/api/users/${userId}/ingredients`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      const data: IngredientsResponse = await response.json();
      // Update local cache
      await AsyncStorage.setItem(LOCAL_INGREDIENTS_KEY, JSON.stringify(data.ingredients));
      return data.ingredients;
    }
  } catch (error) {
    console.log('[Ingredients] Server fetch failed, using local cache');
  }

  // Fallback to local
  return getLocalIngredients();
}

/**
 * Get locally cached ingredients
 */
async function getLocalIngredients(): Promise<string[]> {
  try {
    const cached = await AsyncStorage.getItem(LOCAL_INGREDIENTS_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch (error) {
    return [];
  }
}

/**
 * Remove specific ingredients
 */
export async function removeIngredients(
  userId: string,
  ingredientsToRemove: string[]
): Promise<boolean> {
  try {
    // Update local cache
    const current = await getLocalIngredients();
    const filtered = current.filter(i => !ingredientsToRemove.includes(i));
    await AsyncStorage.setItem(LOCAL_INGREDIENTS_KEY, JSON.stringify(filtered));

    // Sync with server
    const response = await fetch(`${API_URL}/api/users/${userId}/ingredients`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredients_to_remove: ingredientsToRemove }),
    });

    return response.ok;
  } catch (error) {
    console.error('[Ingredients] Error removing:', error);
    return true; // Local update succeeded
  }
}

/**
 * Clear all ingredients
 */
export async function clearAllIngredients(userId: string): Promise<boolean> {
  try {
    await AsyncStorage.setItem(LOCAL_INGREDIENTS_KEY, JSON.stringify([]));

    const response = await fetch(`${API_URL}/api/users/${userId}/ingredients`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    return response.ok;
  } catch (error) {
    console.error('[Ingredients] Error clearing:', error);
    return true;
  }
}

// ============================================
// INGREDIENTS MEMORY FUNCTIONS
// Stores unused ingredients for 1 week
// ============================================

/**
 * Save ingredients to memory (with expiration)
 * Called when user has ingredients they haven't used yet
 */
export async function saveIngredientsToMemory(ingredients: string[]): Promise<void> {
  try {
    const now = Date.now();
    const memory = await getIngredientsMemory();
    
    // Add new ingredients with current timestamp
    const existingNames = memory.items.map(i => i.ingredient.toLowerCase());
    const newItems: IngredientMemoryItem[] = ingredients
      .filter(ing => !existingNames.includes(ing.toLowerCase()))
      .map(ingredient => ({
        ingredient,
        savedAt: now,
      }));
    
    // Merge with existing (update timestamp for existing ones)
    const updatedItems = memory.items.map(item => {
      const match = ingredients.find(ing => ing.toLowerCase() === item.ingredient.toLowerCase());
      if (match) {
        return { ...item, savedAt: now }; // Refresh timestamp
      }
      return item;
    });
    
    const finalMemory: IngredientsMemory = {
      items: [...updatedItems, ...newItems],
      lastUpdated: now,
    };
    
    await AsyncStorage.setItem(INGREDIENTS_MEMORY_KEY, JSON.stringify(finalMemory));
    console.log('[Ingredients] Saved to memory:', ingredients.length, 'ingredients');
  } catch (error) {
    console.error('[Ingredients] Error saving to memory:', error);
  }
}

/**
 * Get ingredients from memory (filters out expired ones)
 */
export async function getIngredientsMemory(): Promise<IngredientsMemory> {
  try {
    const stored = await AsyncStorage.getItem(INGREDIENTS_MEMORY_KEY);
    if (!stored) {
      return { items: [], lastUpdated: 0 };
    }
    
    const memory: IngredientsMemory = JSON.parse(stored);
    const now = Date.now();
    
    // Filter out expired ingredients (older than 1 week)
    const validItems = memory.items.filter(item => {
      const age = now - item.savedAt;
      return age < MEMORY_EXPIRATION_MS;
    });
    
    // If some items expired, update storage
    if (validItems.length !== memory.items.length) {
      const updatedMemory: IngredientsMemory = {
        items: validItems,
        lastUpdated: now,
      };
      await AsyncStorage.setItem(INGREDIENTS_MEMORY_KEY, JSON.stringify(updatedMemory));
    }
    
    return { items: validItems, lastUpdated: memory.lastUpdated };
  } catch (error) {
    console.error('[Ingredients] Error getting memory:', error);
    return { items: [], lastUpdated: 0 };
  }
}

/**
 * Get remembered ingredient names (non-expired)
 */
export async function getRememberedIngredients(): Promise<string[]> {
  const memory = await getIngredientsMemory();
  return memory.items.map(item => item.ingredient);
}

/**
 * Remove ingredients from memory (when user uses them in a recipe)
 */
export async function removeIngredientsFromMemory(ingredientsToRemove: string[]): Promise<void> {
  try {
    const memory = await getIngredientsMemory();
    const lowerCaseToRemove = ingredientsToRemove.map(i => i.toLowerCase());
    
    const filteredItems = memory.items.filter(item => 
      !lowerCaseToRemove.some(remove => 
        item.ingredient.toLowerCase().includes(remove) || 
        remove.includes(item.ingredient.toLowerCase())
      )
    );
    
    const updatedMemory: IngredientsMemory = {
      items: filteredItems,
      lastUpdated: Date.now(),
    };
    
    await AsyncStorage.setItem(INGREDIENTS_MEMORY_KEY, JSON.stringify(updatedMemory));
    console.log('[Ingredients] Removed from memory:', ingredientsToRemove.length, 'ingredients');
  } catch (error) {
    console.error('[Ingredients] Error removing from memory:', error);
  }
}

/**
 * Clear all ingredients memory
 */
export async function clearIngredientsMemory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(INGREDIENTS_MEMORY_KEY);
    console.log('[Ingredients] Memory cleared');
  } catch (error) {
    console.error('[Ingredients] Error clearing memory:', error);
  }
}

/**
 * Process recipe confirmation: remove used ingredients from memory
 * @param recipeIngredients - Ingredients used in the recipe
 * @param allSelectedIngredients - All ingredients the user had selected
 */
export async function confirmRecipeAndUpdateMemory(
  recipeIngredients: string[],
  allSelectedIngredients: string[]
): Promise<string[]> {
  try {
    // Find ingredients that were NOT used in the recipe
    const unusedIngredients = allSelectedIngredients.filter(selected => {
      const selectedLower = selected.toLowerCase();
      // Check if this ingredient was used in the recipe
      return !recipeIngredients.some(recipeIng => {
        const recipeLower = recipeIng.toLowerCase();
        return recipeLower.includes(selectedLower) || selectedLower.includes(recipeLower);
      });
    });
    
    // Save unused ingredients to memory for next time
    if (unusedIngredients.length > 0) {
      await saveIngredientsToMemory(unusedIngredients);
      console.log('[Ingredients] Saved unused ingredients to memory:', unusedIngredients);
    }
    
    // Remove used ingredients from memory (in case they were there)
    const usedIngredients = allSelectedIngredients.filter(ing => !unusedIngredients.includes(ing));
    if (usedIngredients.length > 0) {
      await removeIngredientsFromMemory(usedIngredients);
    }
    
    return unusedIngredients;
  } catch (error) {
    console.error('[Ingredients] Error updating memory after recipe:', error);
    return [];
  }
}
