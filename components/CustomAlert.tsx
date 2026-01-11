import { Modal, View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import React, { useEffect, useRef } from 'react';

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  cancelText?: string;
  confirmText?: string;
  isDestructive?: boolean;
}

export default function CustomAlert({ 
  visible, 
  title, 
  message, 
  onCancel, 
  onConfirm, 
  cancelText = "Cancel", 
  confirmText = "Confirm",
  isDestructive = false
}: CustomAlertProps) {
  
  const scaleValue = useRef(new Animated.Value(0.9)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleValue, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 200 }),
        Animated.timing(opacityValue, { toValue: 1, duration: 150, useNativeDriver: true })
      ]).start();
    } else {
      scaleValue.setValue(0.9);
      opacityValue.setValue(0);
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent>
      {/* FIX: The overlay uses a strict RGBA style to guarantee 
         the transparent dimming effect works on all devices. 
      */}
      <View style={styles.overlay}>
        
        {/* Modal Card - Twitter "Lights Out" Style */}
        <Animated.View 
          style={[{ transform: [{ scale: scaleValue }], opacity: opacityValue }]}
          className="w-[85%] max-w-[320px] p-6 bg-black border rounded-3xl border-white/20 shadow-2xl"
        >
          {/* Title */}
          <Text className="mb-2 text-xl font-bold text-center text-white">
            {title}
          </Text>
          
          {/* Message */}
          <Text className="mb-8 text-sm leading-5 text-center text-gray-400">
            {message}
          </Text>

          {/* Buttons (Side by Side) */}
          <View className="flex-row gap-3">
            
            {/* Cancel Button (Ghost Style) */}
            <TouchableOpacity 
              onPress={onCancel}
              className="items-center justify-center flex-1 py-3 bg-transparent border rounded-full border-white/20 active:bg-white/10"
            >
              <Text className="text-base font-bold text-white">
                {cancelText}
              </Text>
            </TouchableOpacity>

            {/* Confirm Button (Solid Twitter Blue or Red) */}
            <TouchableOpacity 
              onPress={onConfirm}
              // Uses exact Twitter Hex Codes
              className={`flex-1 items-center justify-center py-3 rounded-full ${isDestructive ? 'bg-[#F4212E]' : 'bg-[#1D9BF0]'}`}
            >
              <Text className="text-base font-bold text-white">
                {confirmText}
              </Text>
            </TouchableOpacity>

          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// Styles ensures the overlay covers the whole screen comfortably
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)', // Darker dim for focus
    alignItems: 'center',
    justifyContent: 'center',
  }
});