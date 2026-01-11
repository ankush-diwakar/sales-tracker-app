import { View, Text, FlatList, TouchableOpacity, Image, RefreshControl, ActivityIndicator, Animated, Alert, LayoutAnimation, UIManager, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useState, useCallback, useRef, useEffect } from 'react';
import LottieView from 'lottie-react-native'; // <--- 1. Import Lottie
import { getDashboardStats, deleteSale, getUserProfile } from '../services/db'; 

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- HELPER: Smart Icon Picker ---
const getCategoryIcon = (category: string, itemName: string) => {
  const text = (category + " " + itemName).toLowerCase();
  
  if (text.includes('phone') || text.includes('mobile')) return 'phone-iphone';
  if (text.includes('glass') || text.includes('screen')) return 'smartphone'; 
  if (text.includes('cover') || text.includes('case')) return 'cases';
  if (text.includes('earphone') || text.includes('headset') || text.includes('buds')) return 'headset';
  if (text.includes('charger') || text.includes('cable') || text.includes('usb')) return 'electrical-services';
  if (text.includes('sim') || text.includes('network')) return 'sim-card';
  if (text.includes('recharge')) return 'flash-on';
  if (text.includes('repair')) return 'build';

  if (text.includes('pan')) return 'badge';
  if (text.includes('aadhar') || text.includes('card')) return 'credit-card';
  if (text.includes('print') || text.includes('xerox')) return 'print';
  if (text.includes('form')) return 'assignment';
  if (text.includes('scan')) return 'scanner';
  if (text.includes('lamination')) return 'layers';
  
  if (text.includes('pen') || text.includes('book') || text.includes('stationery')) return 'edit';

  return 'local-offer'; 
};

// --- HELPER: Accurate Time Ago ---
const getTimeAgo = (dateInput: string | Date) => {
  if (!dateInput) return "";

  let saleDate: Date;
  if (dateInput instanceof Date) {
      saleDate = new Date(Date.UTC(
          dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate(),
          dateInput.getHours(), dateInput.getMinutes(), dateInput.getSeconds()
      ));
  } else {
      let cleanDate = String(dateInput).trim().replace(' ', 'T');
      if (!cleanDate.endsWith('Z')) cleanDate += 'Z';
      saleDate = new Date(cleanDate);
  }

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - saleDate.getTime()) / 1000);

  if (diffInSeconds < 30) return "Just now";
  const minutes = Math.floor(diffInSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return saleDate.toLocaleDateString(); 
};

// --- HELPER: Get Greeting ---
const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
};

// --- COMPONENT: Fade In Animation Wrapper ---
const FadeInItem = ({ children, index }: { children: React.ReactNode, index: number }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                delay: index * 50, 
                useNativeDriver: true,
            }),
            Animated.spring(translateAnim, {
                toValue: 0,
                damping: 12,
                stiffness: 100,
                useNativeDriver: true,
            })
        ]).start();
    }, []);

    return (
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: translateAnim }] }}>
            {children}
        </Animated.View>
    );
};

export default function Home() {
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalSales: 0, totalProfit: 0 });
  const [user, setUser] = useState<any>(null); 
  const [refreshing, setRefreshing] = useState(false);
  
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const fetchData = async () => {
    try {
      const data = await getDashboardStats();
      if (data) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSales(data.sales);
        setStats({
            totalSales: data.totalSales || 0,
            totalProfit: data.totalProfit || 0
        });
      }
      
      const userData = await getUserProfile();
      if (userData) setUser(userData);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
      if (params.saleAdded === 'true' || params.saleUpdated === 'true') {
        showToast();
        router.setParams({ saleAdded: 'false', saleUpdated: 'false' });
      }
    }, [params.saleAdded, params.saleUpdated])
  );

  const showToast = () => {
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true })
    ]).start();
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      "Delete Sale",
      "Are you sure you want to remove this sale?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setSales(prev => prev.filter(item => item.id !== id)); 
            await deleteSale(id);
            fetchData(); 
          }
        }
      ]
    );
  };

  const handleEdit = (item: any) => {
    router.push({
      pathname: '/add-sale',
      params: {
        id: item.id,
        itemName: item.item_name,
        sellingPrice: item.selling_price,
        costPrice: item.cost_price,
        category: item.category
      }
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-black"> 
      
      {/* SUCCESS TOAST */}
      <Animated.View 
        style={{ opacity: toastOpacity, transform: [{ translateY: toastOpacity.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }}
        className="absolute left-0 right-0 z-50 items-center top-20"
      >
        <View className="flex-row items-center gap-2 px-6 py-2 rounded-full shadow-lg bg-primary">
            <Ionicons name="checkmark-circle" size={20} color="white" />
            <Text className="font-bold text-white">Updated Successfully</Text>
        </View>
      </Animated.View>

      {/* --- NEW HEADER (IMPROVED TYPOGRAPHY) --- */}
      <View className="flex-row items-center justify-between px-5 py-5 border-b border-white/10">
        <View className="flex-row items-center flex-1">
             {/* Profile Image - Bigger (w-14 h-14) */}
            <View className="overflow-hidden border-2 rounded-full w-14 h-14 border-primary/20">
                 <Image 
                    source={{uri: user?.profile_image || 'https://i.pravatar.cc/300'}} 
                    className="w-full h-full"
                 />
            </View>
            
            {/* Typography Stack */}
            <View className="ml-4">
                {/* Row 1: Greeting */}
                <Text className="text-xs font-medium tracking-wider text-gray-400 uppercase">
                    {getGreeting()},
                </Text>
                
                {/* Row 2: Name (Big) */}
                <Text className="text-2xl font-bold text-white">
                    {user?.full_name || 'User'}
                </Text>

                {/* Row 3: Business (Separate Line) */}
                <Text className="text-sm font-medium text-primary">
                    {user?.business_name || 'Vidyarthi Inc.'}
                </Text>
            </View>
        </View>

        {/* Settings Icon */}
        <TouchableOpacity 
            onPress={() => router.push('/profile')} 
            className="p-2 border rounded-full bg-white/5 border-white/10 active:bg-white/10"
        >
            <Ionicons name="settings-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Scoreboard */}
      <View className="flex-row border-b divide-x divide-white/10 border-white/10">
        <View className="flex-1 p-4">
          <Text className="text-xs font-bold uppercase text-primary">Today's Sales</Text>
          <Text className="mt-1 text-3xl font-bold text-white">
            ₹{stats.totalSales.toLocaleString('en-IN')}
          </Text>
        </View>
        <View className="flex-1 p-4">
          <Text className="text-xs font-bold uppercase text-primary">Today's Profit</Text>
          <Text className="mt-1 text-3xl font-bold text-white">
            ₹{stats.totalProfit.toLocaleString('en-IN')}
          </Text>
        </View>
      </View>

      {/* Feed */}
      {loading ? (
        <View className="items-center justify-center flex-1">
            <ActivityIndicator size="large" color="#1D9BF0" />
        </View>
      ) : (
        <FlatList 
            data={sales}
            keyExtractor={item => item.id.toString()}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1D9BF0" />
            }
            ListEmptyComponent={
                <View className="items-center justify-center pt-20">
                    {/* --- LOTTIE ANIMATION --- */}
                    <LottieView
                        source={require('../../assets/nothing.json')} // <--- Load your file
                        autoPlay
                        loop
                        style={{ width: 250, height: 250 }}
                    />
                    <Text className="mt-4 text-center text-gray-500">No sales yet today.</Text>
                    <Text className="mt-1 text-primary">Tap + to add the first one!</Text>
                </View>
            }
            renderItem={({ item, index }) => {
                const iconName = getCategoryIcon(item.category, item.item_name);
                
                return (
                <FadeInItem index={index}>
                    <View className="flex-row p-4 border-b border-white/15">
                        {/* Icon Bubble */}
                        <View className="items-center justify-center w-12 h-12 mr-3 bg-black border rounded-full border-white/25">
                            <MaterialIcons 
                                name={iconName as any} 
                                size={24} 
                                color="white" 
                            />
                        </View>
                        
                        {/* Content */}
                        <View className="flex-1">
                            <View className="flex-row justify-between">
                                <Text className="font-bold text-white">
                                    {item.item_name} <Text className="font-normal text-primary">· {getTimeAgo(item.sale_date)}</Text>
                                </Text>
                            </View>
                            
                            <Text className="mt-1 text-white">
                                Sold for <Text className="font-bold">₹{item.selling_price}</Text> | Profit: <Text className="font-bold text-primary">₹{item.profit}</Text>
                            </Text>

                            {/* Action Bar */}
                            <View className="flex-row items-center justify-start gap-6 mt-3">
                                <TouchableOpacity onPress={() => handleEdit(item)} className="p-2 -ml-2">
                                    <Ionicons name="create-outline" size={20} color="white" />
                                </TouchableOpacity>
                                
                                <TouchableOpacity onPress={() => handleDelete(item.id)} className="p-2">
                                    <Ionicons name="trash-outline" size={20} color="white" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </FadeInItem>
                );
            }}
        />
      )}

      {/* FAB */}
      <TouchableOpacity 
        onPress={() => router.push('/add-sale')}
        className="absolute items-center justify-center rounded-full shadow-lg bottom-6 right-5 w-14 h-14 bg-primary"
      >
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}