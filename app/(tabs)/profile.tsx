import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons'; 
import { useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { getUserProfile, updateUserProfile, logoutUser } from '../services/db';
import CustomAlert from '../../components/CustomAlert'; // <--- 1. Import Component

export default function Profile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false); // <--- 2. Add State
  
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [username, setUsername] = useState('');
  const [image, setImage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    setLoading(true);
    const user = await getUserProfile();
    if (user) {
        setFullName(user.full_name);
        setBusinessName(user.business_name);
        setUsername(user.username);
        if (user.profile_image) {
            setImage(user.profile_image); 
        }
    }
    setLoading(false);
  };

  const pickImage = async () => {
    if (!isEditing) return;
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleSave = async () => {
    if (!fullName || !businessName) return;
    setSaving(true);
    await updateUserProfile(fullName, businessName, image);
    setSaving(false);
    setIsEditing(false);
  };

  // --- 3. New Logout Logic ---
  const confirmLogout = async () => {
    setLogoutModalVisible(false);
    await logoutUser();
    router.replace('/'); 
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
        {/* --- 4. Render Modal --- */}
        <CustomAlert 
            visible={logoutModalVisible}
            title="Log Out"
            message="Are you sure you want to log out of your account?"
            confirmText="Log Out"
            isDestructive={true} // Red button for logout
            onCancel={() => setLogoutModalVisible(false)}
            onConfirm={confirmLogout}
        />

        {loading ? (
            <View className="items-center justify-center flex-1">
                <ActivityIndicator size="large" color="#1D9BF0" />
            </View>
        ) : (
            <ScrollView className="flex-1">
                {/* Header */}
                <View className="flex-row items-center justify-between px-6 py-4 border-b border-white/10">
                    <Text className="text-2xl font-bold tracking-tight text-white">Profile</Text>
                    <TouchableOpacity 
                        onPress={() => isEditing ? handleSave() : setIsEditing(true)} 
                        disabled={saving}
                        className={`px-6 py-2 rounded-full shadow-sm ${isEditing ? 'bg-[#1D9BF0]' : 'bg-white/10'}`}
                    >
                        {saving ? <ActivityIndicator size="small" color="white" /> : (
                            <Text className={`text-sm font-bold ${isEditing ? 'text-white' : 'text-[#1D9BF0]'}`}>
                                {isEditing ? 'Save' : 'Edit'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Hero Section */}
                <View className="items-center mt-8 mb-10">
                    <View className="relative">
                        <Image source={{ uri: image || 'https://images.unsplash.com/photo-1640960543409-dbe56ccc30e2?q=80&w=880&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' }} className={`w-32 h-32 rounded-full border-4 ${isEditing ? 'border-[#1D9BF0]' : 'border-black'}`} />
                        {isEditing && (
                            <TouchableOpacity onPress={pickImage} className="absolute bottom-0 right-0 p-3 bg-gray-800 border-4 border-black rounded-full">
                                <MaterialIcons name="add-a-photo" size={18} color="white" />
                            </TouchableOpacity>
                        )}
                    </View>
                    <Text className="mt-5 text-3xl font-bold tracking-tight text-white">{fullName}</Text>
                    <Text className="text-lg font-medium text-gray-500">@{username}</Text>
                </View>

                {/* Info Cards */}
                <View className="px-6 space-y-8">
                    <View>
                        <Text className="mb-2 text-xs font-bold tracking-widest text-gray-500 uppercase">Full Name</Text>
                        <View className={`flex-row items-center pb-2 ${isEditing ? 'border-b border-[#1D9BF0]' : 'border-b border-transparent'}`}>
                            <TextInput value={fullName} onChangeText={setFullName} editable={isEditing} className={`flex-1 text-xl font-medium ${isEditing ? 'text-white' : 'text-gray-300'}`} />
                            {isEditing && <Feather name="edit-2" size={18} color="#1D9BF0" />}
                        </View>
                    </View>
                    <View>
                        <Text className="mb-2 text-xs font-bold tracking-widest text-gray-500 uppercase">Business Name</Text>
                        <View className={`flex-row items-center pb-2 ${isEditing ? 'border-b border-[#1D9BF0]' : 'border-b border-transparent'}`}>
                            <TextInput value={businessName} onChangeText={setBusinessName} editable={isEditing} className={`flex-1 text-xl font-medium ${isEditing ? 'text-white' : 'text-gray-300'}`} />
                            {isEditing && <Feather name="edit-2" size={18} color="#1D9BF0" />}
                        </View>
                    </View>
                    <View>
                        <Text className="mb-2 text-xs font-bold tracking-widest text-gray-500 uppercase">Username</Text>
                        <View className="flex-row items-center pb-2 border-b border-white/5">
                            <TextInput value={username} editable={false} className="flex-1 text-xl font-medium text-gray-600" />
                            <Feather name="lock" size={16} color="#555" />
                        </View>
                    </View>
                </View>

                {/* Footer Area */}
                <View className="px-6 mt-16 mb-20">
                    <TouchableOpacity 
                        onPress={() => setLogoutModalVisible(true)} // <--- 5. Trigger Modal
                        className="flex-row items-center justify-center w-full h-12 bg-[#1D9BF0] rounded-full shadow-lg active:opacity-90"
                    >
                        <Feather name="log-out" size={20} color="white" />
                        <Text className="ml-2 text-base font-bold text-white">Sign Out</Text>
                    </TouchableOpacity>
                    
                    <View className="items-center mt-10 mb-6">
                        <Text className="text-sm font-medium text-gray-500">
                            Crafted with <Ionicons name="heart" size={14} color="#F91880" /> by <Text className="font-bold text-white">Ankush</Text>
                        </Text>
                    </View>
                </View>
            </ScrollView>
        )}
    </SafeAreaView>
  );
}