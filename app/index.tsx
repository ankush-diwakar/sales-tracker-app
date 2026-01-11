import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router'; // Switched to useRouter hook for safety
import { MaterialIcons } from '@expo/vector-icons';
import Fontisto from '@expo/vector-icons/Fontisto';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { registerUser, loginUser, checkSession } from './services/db'; 
import CustomAlert from '../components/CustomAlert'; // <--- Import Custom Modal

export default function AuthScreen() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // --- CUSTOM ALERT STATE ---
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    isError: false,
    onConfirm: null as (() => void) | null,
  });

  // Helper to show the modal
  const showAlert = (title: string, message: string, isError = true, onConfirm: (() => void) | null = null) => {
    setAlertConfig({ visible: true, title, message, isError, onConfirm });
  };

  // Helper to close the modal
  const closeAlert = () => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
  };

  // Helper to handle the "OK/Confirm" button click
  const handleAlertConfirm = () => {
    closeAlert();
    if (alertConfig.onConfirm) {
      alertConfig.onConfirm();
    }
  };

  // --- 1. Check Session on App Start ---
  useEffect(() => {
    const verifyLogin = async () => {
      const isValid = await checkSession();
      if (isValid) {
        router.replace('/(tabs)/home');
      } else {
        setCheckingSession(false);
      }
    };
    verifyLogin();
  }, []);

  const handleAuth = async () => {
    if (!username || !password) {
      showAlert('Missing Info', 'Please fill in all fields.');
      return;
    }

    if (!isLogin && (!fullName || !businessName)) {
      showAlert('Missing Info', 'Please fill in your Name and Business Name.');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const result = await loginUser(username, password);
        if (result.success) {
          router.replace('/(tabs)/home');
        } else {
          showAlert('Login Failed', result.error || 'Invalid credentials');
        }
      } else {
        const result = await registerUser(fullName, businessName, username, password);
        if (result.success) {
          // Success Alert: When clicked "OK", switch to Login mode
          showAlert(
            'Welcome!', 
            `Shop "${businessName}" created successfully! Please log in.`, 
            false, // Not an error (Blue button)
            () => {
               setIsLogin(true);
               setPassword('');
            }
          );
        } else {
          showAlert('Signup Failed', result.error || 'Could not create account');
        }
      }
    } catch (error) {
      console.error(error);
      showAlert('Connection Error', 'Something went wrong. Please check your internet.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#1D9BF0" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* --- CUSTOM ALERT COMPONENT --- */}
      <CustomAlert 
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        onCancel={closeAlert}
        onConfirm={handleAlertConfirm}
        cancelText="Close"
        confirmText="OK"
        isDestructive={false} // Always use Blue Theme for Auth
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.logoContainer}>
          <Fontisto name="shopping-bag-1" size={50} color="white" />
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.title}>
            {isLogin ? 'Sign in to Vidyarthi Inc.' : 'Create your account'}
          </Text>

          <View style={styles.inputContainer}>
            {!isLogin && (
              <>
                <TextInput
                  placeholder="Full Name"
                  placeholderTextColor="#71767B"
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                />
                <TextInput
                  placeholder="Business / Shop Name"
                  placeholderTextColor="#71767B"
                  style={styles.input}
                  value={businessName}
                  onChangeText={setBusinessName}
                />
              </>
            )}

            <TextInput
              placeholder="Phone, email, or username"
              placeholderTextColor="#71767B"
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            
            <View style={styles.passwordContainer}>
              <TextInput
                placeholder="Password"
                secureTextEntry={!showPassword}
                placeholderTextColor="#71767B"
                style={[styles.input, { paddingRight: 50 }]}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity 
                style={styles.eyeIcon} 
                onPress={() => setShowPassword(!showPassword)}
              >
                <MaterialIcons 
                    name={showPassword ? "visibility" : "visibility-off"} 
                    size={24} 
                    color="#71767B" 
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, loading && { opacity: 0.7 }]}
              onPress={handleAuth}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {isLogin ? 'Log In' : 'Sign Up'}
                </Text>
              )}
            </TouchableOpacity>

            {isLogin && (
              <TouchableOpacity style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Forgot password?</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
        </Text>
        <TouchableOpacity onPress={() => {
            setIsLogin(!isLogin);
            setLoading(false);
        }}>
          <Text style={styles.footerLink}>
            {isLogin ? 'Sign up' : 'Log in'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  formContainer: {
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 32,
  },
  inputContainer: {
    gap: 16,
  },
  input: {
    width: '100%',
    height: 56,
    paddingHorizontal: 16,
    fontSize: 18,
    borderWidth: 1,
    borderColor: '#2F3336',
    borderRadius: 28,
    backgroundColor: '#000000',
    color: '#FFFFFF',
  },
  passwordContainer: {
    justifyContent: 'center',
    position: 'relative',
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    height: '100%',
    justifyContent: 'center',
  },
  primaryButton: {
    width: '100%',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1D9BF0', // Changed to Twitter Blue to match Theme
    borderRadius: 24,
    marginTop: 16,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  secondaryButton: {
    width: '100%',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2F3336',
    borderRadius: 24,
    marginTop: 8,
  },
  secondaryButtonText: {
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    color: '#71767B',
  },
  footerLink: {
    fontWeight: 'bold',
    color: '#1D9BF0',
  },
});