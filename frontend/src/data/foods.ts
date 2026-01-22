/**
 * Common Foods Database
 * Used for the food search feature in Track Food
 * Values are per serving (1 portion = 1 full plate/unit)
 */

export interface FoodItem {
  id: string;
  name: {
    es: string;
    en: string;
  };
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber?: number;
  icon: string;
}

export const FOOD_CATEGORIES = {
  fruits: { es: 'Frutas', en: 'Fruits', icon: '🍎' },
  vegetables: { es: 'Verduras', en: 'Vegetables', icon: '🥬' },
  proteins: { es: 'Proteínas', en: 'Proteins', icon: '🍗' },
  grains: { es: 'Granos y cereales', en: 'Grains & Cereals', icon: '🌾' },
  dairy: { es: 'Lácteos', en: 'Dairy', icon: '🧀' },
  snacks: { es: 'Snacks', en: 'Snacks', icon: '🍿' },
  drinks: { es: 'Bebidas', en: 'Drinks', icon: '🥤' },
  fastfood: { es: 'Comida rápida', en: 'Fast Food', icon: '🍔' },
  desserts: { es: 'Postres', en: 'Desserts', icon: '🍰' },
  prepared: { es: 'Platos preparados', en: 'Prepared Dishes', icon: '🍝' },
};

export const COMMON_FOODS: FoodItem[] = [
  // Fruits
  { id: 'apple', name: { es: 'Manzana', en: 'Apple' }, category: 'fruits', calories: 95, protein: 0.5, carbs: 25, fats: 0.3, fiber: 4, icon: '🍎' },
  { id: 'banana', name: { es: 'Banana', en: 'Banana' }, category: 'fruits', calories: 105, protein: 1.3, carbs: 27, fats: 0.4, fiber: 3, icon: '🍌' },
  { id: 'orange', name: { es: 'Naranja', en: 'Orange' }, category: 'fruits', calories: 62, protein: 1.2, carbs: 15, fats: 0.2, fiber: 3, icon: '🍊' },
  { id: 'strawberries', name: { es: 'Frutillas', en: 'Strawberries' }, category: 'fruits', calories: 50, protein: 1, carbs: 12, fats: 0.5, fiber: 3, icon: '🍓' },
  { id: 'grapes', name: { es: 'Uvas', en: 'Grapes' }, category: 'fruits', calories: 104, protein: 1, carbs: 27, fats: 0.2, fiber: 1, icon: '🍇' },
  { id: 'watermelon', name: { es: 'Sandía', en: 'Watermelon' }, category: 'fruits', calories: 86, protein: 1.8, carbs: 22, fats: 0.4, fiber: 1, icon: '🍉' },
  { id: 'pineapple', name: { es: 'Piña', en: 'Pineapple' }, category: 'fruits', calories: 82, protein: 0.9, carbs: 22, fats: 0.2, fiber: 2, icon: '🍍' },
  { id: 'mango', name: { es: 'Mango', en: 'Mango' }, category: 'fruits', calories: 99, protein: 1.4, carbs: 25, fats: 0.6, fiber: 3, icon: '🥭' },
  { id: 'peach', name: { es: 'Durazno', en: 'Peach' }, category: 'fruits', calories: 59, protein: 1.4, carbs: 14, fats: 0.4, fiber: 2, icon: '🍑' },
  { id: 'pear', name: { es: 'Pera', en: 'Pear' }, category: 'fruits', calories: 102, protein: 0.6, carbs: 27, fats: 0.2, fiber: 6, icon: '🍐' },
  
  // Vegetables
  { id: 'tomato', name: { es: 'Tomate', en: 'Tomato' }, category: 'vegetables', calories: 22, protein: 1.1, carbs: 4.8, fats: 0.2, fiber: 1.5, icon: '🍅' },
  { id: 'carrot', name: { es: 'Zanahoria', en: 'Carrot' }, category: 'vegetables', calories: 41, protein: 0.9, carbs: 10, fats: 0.2, fiber: 3, icon: '🥕' },
  { id: 'broccoli', name: { es: 'Brócoli', en: 'Broccoli' }, category: 'vegetables', calories: 55, protein: 3.7, carbs: 11, fats: 0.6, fiber: 5, icon: '🥦' },
  { id: 'lettuce', name: { es: 'Lechuga', en: 'Lettuce' }, category: 'vegetables', calories: 10, protein: 0.9, carbs: 2, fats: 0.1, fiber: 1, icon: '🥬' },
  { id: 'cucumber', name: { es: 'Pepino', en: 'Cucumber' }, category: 'vegetables', calories: 16, protein: 0.7, carbs: 3.6, fats: 0.1, fiber: 0.5, icon: '🥒' },
  { id: 'onion', name: { es: 'Cebolla', en: 'Onion' }, category: 'vegetables', calories: 44, protein: 1.2, carbs: 10, fats: 0.1, fiber: 2, icon: '🧅' },
  { id: 'potato', name: { es: 'Papa', en: 'Potato' }, category: 'vegetables', calories: 161, protein: 4.3, carbs: 37, fats: 0.2, fiber: 4, icon: '🥔' },
  { id: 'corn', name: { es: 'Choclo', en: 'Corn' }, category: 'vegetables', calories: 96, protein: 3.4, carbs: 21, fats: 1.5, fiber: 2.4, icon: '🌽' },
  { id: 'spinach', name: { es: 'Espinaca', en: 'Spinach' }, category: 'vegetables', calories: 23, protein: 2.9, carbs: 3.6, fats: 0.4, fiber: 2.2, icon: '🥬' },
  { id: 'avocado', name: { es: 'Palta', en: 'Avocado' }, category: 'vegetables', calories: 234, protein: 2.9, carbs: 12, fats: 21, fiber: 10, icon: '🥑' },
  
  // Proteins
  { id: 'chicken_breast', name: { es: 'Pechuga de pollo', en: 'Chicken Breast' }, category: 'proteins', calories: 165, protein: 31, carbs: 0, fats: 3.6, icon: '🍗' },
  { id: 'beef_steak', name: { es: 'Bife de carne', en: 'Beef Steak' }, category: 'proteins', calories: 271, protein: 26, carbs: 0, fats: 18, icon: '🥩' },
  { id: 'pork_chop', name: { es: 'Costilla de cerdo', en: 'Pork Chop' }, category: 'proteins', calories: 231, protein: 25, carbs: 0, fats: 14, icon: '🍖' },
  { id: 'salmon', name: { es: 'Salmón', en: 'Salmon' }, category: 'proteins', calories: 208, protein: 20, carbs: 0, fats: 13, icon: '🐟' },
  { id: 'tuna', name: { es: 'Atún', en: 'Tuna' }, category: 'proteins', calories: 132, protein: 28, carbs: 0, fats: 1, icon: '🐟' },
  { id: 'shrimp', name: { es: 'Camarones', en: 'Shrimp' }, category: 'proteins', calories: 99, protein: 24, carbs: 0.2, fats: 0.3, icon: '🦐' },
  { id: 'eggs', name: { es: 'Huevos (2)', en: 'Eggs (2)' }, category: 'proteins', calories: 156, protein: 12, carbs: 1.1, fats: 11, icon: '🥚' },
  { id: 'tofu', name: { es: 'Tofu', en: 'Tofu' }, category: 'proteins', calories: 144, protein: 15, carbs: 3.5, fats: 8, icon: '🧈' },
  { id: 'ground_beef', name: { es: 'Carne molida', en: 'Ground Beef' }, category: 'proteins', calories: 254, protein: 17, carbs: 0, fats: 20, icon: '🍖' },
  { id: 'turkey', name: { es: 'Pavo', en: 'Turkey' }, category: 'proteins', calories: 189, protein: 29, carbs: 0, fats: 7, icon: '🦃' },
  
  // Grains
  { id: 'white_rice', name: { es: 'Arroz blanco', en: 'White Rice' }, category: 'grains', calories: 206, protein: 4.3, carbs: 45, fats: 0.4, fiber: 0.6, icon: '🍚' },
  { id: 'brown_rice', name: { es: 'Arroz integral', en: 'Brown Rice' }, category: 'grains', calories: 216, protein: 5, carbs: 45, fats: 1.8, fiber: 3.5, icon: '🍚' },
  { id: 'pasta', name: { es: 'Pasta/Fideos', en: 'Pasta' }, category: 'grains', calories: 220, protein: 8, carbs: 43, fats: 1.3, fiber: 2.5, icon: '🍝' },
  { id: 'bread', name: { es: 'Pan (2 rebanadas)', en: 'Bread (2 slices)' }, category: 'grains', calories: 158, protein: 5, carbs: 30, fats: 2, fiber: 2, icon: '🍞' },
  { id: 'oatmeal', name: { es: 'Avena', en: 'Oatmeal' }, category: 'grains', calories: 154, protein: 6, carbs: 27, fats: 3, fiber: 4, icon: '🥣' },
  { id: 'quinoa', name: { es: 'Quinoa', en: 'Quinoa' }, category: 'grains', calories: 222, protein: 8, carbs: 39, fats: 3.5, fiber: 5, icon: '🌾' },
  { id: 'tortilla', name: { es: 'Tortilla', en: 'Tortilla' }, category: 'grains', calories: 159, protein: 4, carbs: 26, fats: 4, fiber: 2, icon: '🫓' },
  { id: 'cereal', name: { es: 'Cereal', en: 'Cereal' }, category: 'grains', calories: 150, protein: 3, carbs: 33, fats: 1, fiber: 3, icon: '🥣' },
  
  // Dairy
  { id: 'milk', name: { es: 'Leche (vaso)', en: 'Milk (glass)' }, category: 'dairy', calories: 149, protein: 8, carbs: 12, fats: 8, icon: '🥛' },
  { id: 'yogurt', name: { es: 'Yogur', en: 'Yogurt' }, category: 'dairy', calories: 100, protein: 17, carbs: 6, fats: 0.7, icon: '🥛' },
  { id: 'cheese', name: { es: 'Queso', en: 'Cheese' }, category: 'dairy', calories: 113, protein: 7, carbs: 0.4, fats: 9, icon: '🧀' },
  { id: 'cream_cheese', name: { es: 'Queso crema', en: 'Cream Cheese' }, category: 'dairy', calories: 99, protein: 2, carbs: 1.6, fats: 10, icon: '🧀' },
  { id: 'butter', name: { es: 'Manteca', en: 'Butter' }, category: 'dairy', calories: 102, protein: 0.1, carbs: 0, fats: 12, icon: '🧈' },
  { id: 'ice_cream', name: { es: 'Helado', en: 'Ice Cream' }, category: 'dairy', calories: 207, protein: 3.5, carbs: 24, fats: 11, icon: '🍦' },
  
  // Fast Food
  { id: 'hamburger', name: { es: 'Hamburguesa', en: 'Hamburger' }, category: 'fastfood', calories: 354, protein: 20, carbs: 29, fats: 17, icon: '🍔' },
  { id: 'pizza_slice', name: { es: 'Pizza (porción)', en: 'Pizza (slice)' }, category: 'fastfood', calories: 285, protein: 12, carbs: 36, fats: 10, icon: '🍕' },
  { id: 'hotdog', name: { es: 'Pancho/Hot Dog', en: 'Hot Dog' }, category: 'fastfood', calories: 290, protein: 11, carbs: 24, fats: 17, icon: '🌭' },
  { id: 'french_fries', name: { es: 'Papas fritas', en: 'French Fries' }, category: 'fastfood', calories: 365, protein: 4, carbs: 48, fats: 17, icon: '🍟' },
  { id: 'taco', name: { es: 'Taco', en: 'Taco' }, category: 'fastfood', calories: 226, protein: 9, carbs: 20, fats: 12, icon: '🌮' },
  { id: 'burrito', name: { es: 'Burrito', en: 'Burrito' }, category: 'fastfood', calories: 431, protein: 13, carbs: 50, fats: 19, icon: '🌯' },
  { id: 'fried_chicken', name: { es: 'Pollo frito', en: 'Fried Chicken' }, category: 'fastfood', calories: 320, protein: 25, carbs: 11, fats: 20, icon: '🍗' },
  { id: 'nuggets', name: { es: 'Nuggets (6)', en: 'Nuggets (6)' }, category: 'fastfood', calories: 286, protein: 14, carbs: 18, fats: 18, icon: '🍗' },
  
  // Prepared Dishes
  { id: 'spaghetti_bolognese', name: { es: 'Fideos con bolognesa', en: 'Spaghetti Bolognese' }, category: 'prepared', calories: 450, protein: 22, carbs: 52, fats: 16, icon: '🍝' },
  { id: 'chicken_rice', name: { es: 'Pollo con arroz', en: 'Chicken with Rice' }, category: 'prepared', calories: 380, protein: 28, carbs: 40, fats: 10, icon: '🍛' },
  { id: 'caesar_salad', name: { es: 'Ensalada César', en: 'Caesar Salad' }, category: 'prepared', calories: 260, protein: 14, carbs: 12, fats: 18, icon: '🥗' },
  { id: 'soup', name: { es: 'Sopa', en: 'Soup' }, category: 'prepared', calories: 150, protein: 8, carbs: 18, fats: 5, icon: '🍲' },
  { id: 'stew', name: { es: 'Guiso', en: 'Stew' }, category: 'prepared', calories: 380, protein: 25, carbs: 30, fats: 18, icon: '🍲' },
  { id: 'empanada', name: { es: 'Empanada', en: 'Empanada' }, category: 'prepared', calories: 280, protein: 10, carbs: 24, fats: 16, icon: '🥟' },
  { id: 'milanesa', name: { es: 'Milanesa', en: 'Milanesa' }, category: 'prepared', calories: 350, protein: 28, carbs: 20, fats: 18, icon: '🍖' },
  { id: 'sandwich', name: { es: 'Sándwich', en: 'Sandwich' }, category: 'prepared', calories: 350, protein: 15, carbs: 35, fats: 16, icon: '🥪' },
  { id: 'fried_rice', name: { es: 'Arroz frito', en: 'Fried Rice' }, category: 'prepared', calories: 340, protein: 12, carbs: 45, fats: 12, icon: '🍚' },
  { id: 'omelette', name: { es: 'Omelette', en: 'Omelette' }, category: 'prepared', calories: 230, protein: 14, carbs: 2, fats: 18, icon: '🍳' },
  
  // Snacks
  { id: 'chips', name: { es: 'Papas chips', en: 'Potato Chips' }, category: 'snacks', calories: 152, protein: 2, carbs: 15, fats: 10, icon: '🍿' },
  { id: 'popcorn', name: { es: 'Pochoclo', en: 'Popcorn' }, category: 'snacks', calories: 106, protein: 3, carbs: 21, fats: 1.2, fiber: 4, icon: '🍿' },
  { id: 'crackers', name: { es: 'Galletitas', en: 'Crackers' }, category: 'snacks', calories: 130, protein: 3, carbs: 22, fats: 3.5, icon: '🍪' },
  { id: 'chocolate', name: { es: 'Chocolate', en: 'Chocolate' }, category: 'snacks', calories: 235, protein: 3, carbs: 26, fats: 13, icon: '🍫' },
  { id: 'nuts', name: { es: 'Frutos secos', en: 'Nuts' }, category: 'snacks', calories: 172, protein: 5, carbs: 6, fats: 15, fiber: 2, icon: '🥜' },
  { id: 'granola_bar', name: { es: 'Barra de cereal', en: 'Granola Bar' }, category: 'snacks', calories: 120, protein: 2, carbs: 20, fats: 4, icon: '🍫' },
  
  // Drinks
  { id: 'coffee', name: { es: 'Café', en: 'Coffee' }, category: 'drinks', calories: 2, protein: 0.3, carbs: 0, fats: 0, icon: '☕' },
  { id: 'coffee_milk', name: { es: 'Café con leche', en: 'Coffee with Milk' }, category: 'drinks', calories: 67, protein: 3, carbs: 6, fats: 3.5, icon: '☕' },
  { id: 'tea', name: { es: 'Té', en: 'Tea' }, category: 'drinks', calories: 2, protein: 0, carbs: 0.5, fats: 0, icon: '🍵' },
  { id: 'juice', name: { es: 'Jugo de fruta', en: 'Fruit Juice' }, category: 'drinks', calories: 112, protein: 1, carbs: 26, fats: 0.3, icon: '🧃' },
  { id: 'soda', name: { es: 'Gaseosa', en: 'Soda' }, category: 'drinks', calories: 140, protein: 0, carbs: 39, fats: 0, icon: '🥤' },
  { id: 'smoothie', name: { es: 'Licuado', en: 'Smoothie' }, category: 'drinks', calories: 180, protein: 5, carbs: 35, fats: 2, icon: '🥤' },
  { id: 'beer', name: { es: 'Cerveza', en: 'Beer' }, category: 'drinks', calories: 153, protein: 1.6, carbs: 13, fats: 0, icon: '🍺' },
  { id: 'wine', name: { es: 'Vino (copa)', en: 'Wine (glass)' }, category: 'drinks', calories: 125, protein: 0.1, carbs: 4, fats: 0, icon: '🍷' },
  
  // Desserts
  { id: 'cake', name: { es: 'Torta (porción)', en: 'Cake (slice)' }, category: 'desserts', calories: 350, protein: 4, carbs: 50, fats: 15, icon: '🍰' },
  { id: 'cookie', name: { es: 'Galleta dulce', en: 'Cookie' }, category: 'desserts', calories: 78, protein: 1, carbs: 10, fats: 4, icon: '🍪' },
  { id: 'brownie', name: { es: 'Brownie', en: 'Brownie' }, category: 'desserts', calories: 230, protein: 3, carbs: 30, fats: 12, icon: '🍫' },
  { id: 'flan', name: { es: 'Flan', en: 'Flan' }, category: 'desserts', calories: 200, protein: 6, carbs: 30, fats: 6, icon: '🍮' },
  { id: 'donut', name: { es: 'Donut', en: 'Donut' }, category: 'desserts', calories: 253, protein: 4, carbs: 30, fats: 14, icon: '🍩' },
  { id: 'churros', name: { es: 'Churros', en: 'Churros' }, category: 'desserts', calories: 230, protein: 3, carbs: 28, fats: 12, icon: '🥖' },
];

/**
 * Search foods by name
 */
export const searchFoods = (query: string, language: 'es' | 'en' = 'es'): FoodItem[] => {
  if (!query.trim()) return [];
  
  const normalizedQuery = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  return COMMON_FOODS.filter(food => {
    const name = food.name[language].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return name.includes(normalizedQuery);
  }).slice(0, 20); // Limit to 20 results
};

/**
 * Get foods by category
 */
export const getFoodsByCategory = (categoryId: string): FoodItem[] => {
  return COMMON_FOODS.filter(food => food.category === categoryId);
};

/**
 * Get all categories
 */
export const getAllCategories = () => {
  return Object.entries(FOOD_CATEGORIES).map(([id, data]) => ({
    id,
    ...data,
  }));
};
