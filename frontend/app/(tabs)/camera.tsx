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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../../src/contexts/UserContext';
import { useRouter } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function CameraScreen() {
  const { userId, isPremium } = useUser();
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [todayCount, setTodayCount] = useState(0);

  useEffect(() => {
    checkTodayCount();
  }, [userId]);

  const checkTodayCount = async () => {
    if (!userId) return;
    try {
      const response = await fetch(`${API_URL}/api/meals/${userId}/today`);
      const data = await response.json();
      setTodayCount(data.count);
    } catch (error) {
      console.error('Failed to check today count:', error);
    }
  };

  const canTakePhoto = () => {
    if (isPremium) return true;
    return todayCount < 1;
  };

  const pickImage = async () => {
    if (!canTakePhoto()) {
      Alert.alert(
        'Daily Limit Reached',
        'Free users can only log 1 meal per day. Upgrade to Premium for unlimited tracking!',
        [
          { text: 'Maybe Later', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/paywall') },
        ]
      );
      return;
    }

    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Camera permission is needed to take photos.');
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
    if (!canTakePhoto()) {
      Alert.alert(
        'Daily Limit Reached',
        'Free users can only log 1 meal per day. Upgrade to Premium for unlimited tracking!',
        [
          { text: 'Maybe Later', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/paywall') },
        ]
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
    if (!userId) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch(`${API_URL}/api/analyze-food`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          imageBase64: base64Image,
        }),
      });

      const data = await response.json();
      setAnalysisResult(data);
    } catch (error) {
      console.error('Failed to analyze food:', error);
      Alert.alert('Analysis Failed', 'Failed to analyze the food. Please try again.');
      setSelectedImage(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveMeal = async () => {
    if (!userId || !selectedImage || !analysisResult) return;

    try {
      // Convert URI to base64
      const response = await fetch(selectedImage);
      const blob = await response.blob();
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const base64Data = base64.split(',')[1];

        await fetch(`${API_URL}/api/meals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            photoBase64: base64Data,
            ...analysisResult,
          }),
        });

        Alert.alert('Success', 'Meal saved successfully!');
        setSelectedImage(null);
        setAnalysisResult(null);
        checkTodayCount();
      };
      
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Failed to save meal:', error);
      Alert.alert('Save Failed', 'Failed to save the meal. Please try again.');
    }
  };

  const cancel = () => {
    setSelectedImage(null);
    setAnalysisResult(null);
  };

  if (selectedImage) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: selectedImage }} style={styles.image} />
        </View>

        {isAnalyzing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6B6B" />
            <Text style={styles.loadingText}>Analyzing your food...</Text>
          </View>
        ) : analysisResult ? (
          <View style={styles.resultContainer}>
            <Text style={styles.dishName}>{analysisResult.dishName}</Text>

            <View style={styles.macrosContainer}>
              <View style={styles.macroBox}>
                <Text style={styles.macroValue}>{analysisResult.calories}</Text>
                <Text style={styles.macroLabel}>Calories</Text>
              </View>
              <View style={styles.macroBox}>
                <Text style={styles.macroValue}>{analysisResult.protein}g</Text>
                <Text style={styles.macroLabel}>Protein</Text>
              </View>
              <View style={styles.macroBox}>
                <Text style={styles.macroValue}>{analysisResult.carbs}g</Text>
                <Text style={styles.macroLabel}>Carbs</Text>
              </View>
              <View style={styles.macroBox}>
                <Text style={styles.macroValue}>{analysisResult.fats}g</Text>
                <Text style={styles.macroLabel}>Fats</Text>
              </View>
            </View>

            {analysisResult.warnings && analysisResult.warnings.length > 0 && (
              <View style={styles.warningsContainer}>
                {analysisResult.warnings.map((warning: string, index: number) => (
                  <View key={index} style={styles.warningItem}>
                    <Ionicons name="warning" size={16} color="#FFA500" />
                    <Text style={styles.warningText}>{warning}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.ingredientsContainer}>
              <Text style={styles.sectionTitle}>Ingredients</Text>
              {analysisResult.ingredients.map((ingredient: string, index: number) => (
                <Text key={index} style={styles.ingredientText}>• {ingredient}</Text>
              ))}
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={cancel}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={saveMeal}>
                <Text style={styles.saveButtonText}>Save Meal</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Track Your Food</Text>
        {!isPremium && (
          <View style={styles.limitBadge}>
            <Text style={styles.limitText}>{todayCount}/1 photos today</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Ionicons name="camera" size={120} color="#FF6B6B" />
        <Text style={styles.instructionText}>
          Take a photo of your meal to get instant nutrition information
        </Text>

        <TouchableOpacity style={styles.primaryButton} onPress={pickImage}>
          <Ionicons name="camera" size={24} color="#fff" />
          <Text style={styles.primaryButtonText}>Take Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={pickFromGallery}>
          <Ionicons name="images" size={24} color="#FF6B6B" />
          <Text style={styles.secondaryButtonText}>Choose from Gallery</Text>
        </TouchableOpacity>

        {!isPremium && todayCount >= 1 && (
          <View style={styles.upgradePrompt}>
            <Text style={styles.upgradeText}>Daily limit reached!</Text>
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => router.push('/paywall')}
            >
              <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
            </TouchableOpacity>
          </View>
        )}
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
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#1a1a1a',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  limitBadge: {
    backgroundColor: '#FF6B6B20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  limitText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
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
  upgradePrompt: {
    marginTop: 40,
    alignItems: 'center',
  },
  upgradeText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
  },
  upgradeButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  upgradeButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
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
    backgroundColor: '#FF6B6B',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});