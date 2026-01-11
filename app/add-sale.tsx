import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useState, useEffect, useRef } from 'react';
import LottieView from 'lottie-react-native'; // <--- Import Lottie
import { addSale, updateSale } from './services/db';

export default function AddSale() {
  const router = useRouter();
  const params = useLocalSearchParams(); 
  const isEditMode = !!params.id; 

  const [loading, setLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false); // <--- State for animation

  const [itemName, setItemName] = useState(params.itemName ? String(params.itemName) : '');
  const [sellingPrice, setSellingPrice] = useState(params.sellingPrice ? String(params.sellingPrice) : '');
  const [costPrice, setCostPrice] = useState(params.costPrice ? String(params.costPrice) : '');
  const [category, setCategory] = useState(params.category ? String(params.category) : 'Pan Card');

  const categories = ['Pan Card', 'Form Filling', 'Accessories', 'Stationery', 'Other'];

  const handleSave = async () => {
    if (!itemName || !sellingPrice || !costPrice) {
        Alert.alert("Missing Info", "Please fill in all fields");
        return;
    }

    setLoading(true);

    let result;
    if (isEditMode) {
        result = await updateSale(
            Number(params.id),
            itemName, 
            category, 
            parseFloat(sellingPrice), 
            parseFloat(costPrice)
        );
    } else {
        result = await addSale(
            itemName, 
            category, 
            parseFloat(sellingPrice), 
            parseFloat(costPrice)
        );
    }

    setLoading(false);

    if (result.success) {
        // --- PLAY ANIMATION BEFORE LEAVING ---
        setShowConfetti(true);
        
        // Wait 1.5 seconds for animation to play, then go back
        setTimeout(() => {
            router.replace(isEditMode ? '/(tabs)/home?saleUpdated=true' : '/(tabs)/home?saleAdded=true');
        }, 1500);
    } else {
        Alert.alert("Error", "Operation failed. Please try again.");
    }
  };

  return (
    <View className="relative flex-1 pt-12 bg-bg-dark">
      <Stack.Screen options={{ presentation: 'modal', headerShown: false }} />

      {/* --- CONFETTI OVERLAY --- */}
      {showConfetti && (
        <View className="absolute top-0 bottom-0 left-0 right-0 z-50 items-center justify-center bg-black/50">
            <LottieView
                source={require('../assets/party.json')} // <--- Load your file
                autoPlay
                loop={false}
                style={{ width: 400, height: 400 }}
                resizeMode="cover"
            />
        </View>
      )}

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pb-4 border-b border-twitter-border">
        <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-lg text-text-main">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-white">
            {isEditMode ? 'Edit Sale' : 'New Sale'}
        </Text>
        <TouchableOpacity 
            className="px-5 py-2 rounded-full bg-primary"
            onPress={handleSave}
            disabled={loading}
        >
            {loading ? <ActivityIndicator color="white" size="small" /> : (
                <Text className="text-sm font-bold text-white">
                    {isEditMode ? 'Update' : 'Save'}
                </Text>
            )}
        </TouchableOpacity>
      </View>

      {/* Inputs */}
      <View className="px-4 mt-6">
        <TextInput 
            placeholder="What did you sell?"
            placeholderTextColor="#71767B"
            className="mb-8 text-3xl font-bold text-text-main"
            value={itemName}
            onChangeText={setItemName}
            autoFocus={!isEditMode} 
        />

        {/* Prices - Selling Price */}
        <View className="flex-row items-center mb-6">
            {/* Circle with Rupee Symbol */}
            <View className="items-center justify-center w-10 h-10 mr-4 rounded-full bg-twitter-border/30">
                <Text className="text-xl font-bold text-text-muted">₹</Text>
            </View>
            <View className="flex-1 pb-2 border-b border-twitter-border">
                <Text className="text-xs font-bold uppercase text-text-muted">Selling Price</Text>
                <View className="flex-row items-center">
                    {/* Removed the extra '₹' text here */}
                    <TextInput 
                        placeholder="0.00" 
                        placeholderTextColor="#71767B" 
                        className="flex-1 text-xl font-bold text-text-main"
                        keyboardType="numeric"
                        value={sellingPrice}
                        onChangeText={setSellingPrice}
                    />
                </View>
            </View>
        </View>

        {/* Prices - Cost Price */}
        <View className="flex-row items-center mb-10">
             {/* Circle with Rupee Symbol */}
            <View className="items-center justify-center w-10 h-10 mr-4 rounded-full bg-twitter-border/30">
                <Text className="text-xl font-bold text-text-muted">₹</Text>
            </View>
            <View className="flex-1 pb-2 border-b border-twitter-border">
                <Text className="text-xs font-bold uppercase text-text-muted">Cost Price</Text>
                <View className="flex-row items-center">
                    {/* Removed the extra '₹' text here */}
                    <TextInput 
                        placeholder="0.00" 
                        placeholderTextColor="#71767B" 
                        className="flex-1 text-xl font-bold text-text-main"
                        keyboardType="numeric"
                        value={costPrice}
                        onChangeText={setCostPrice}
                    />
                </View>
            </View>
        </View>

        {/* Categories */}
        <View>
            <Text className="mb-3 text-xs font-bold uppercase text-text-muted">Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                {categories.map((cat) => (
                    <TouchableOpacity 
                        key={cat}
                        onPress={() => setCategory(cat)}
                        className={`px-5 py-2 rounded-full border ${category === cat ? 'bg-primary border-primary' : 'bg-transparent border-twitter-border'}`}
                    >
                        <Text className={`font-bold ${category === cat ? 'text-white' : 'text-text-muted'}`}>{cat}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
      </View>
    </View>
  );
}