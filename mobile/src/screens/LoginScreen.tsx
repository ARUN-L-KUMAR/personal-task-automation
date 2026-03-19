import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuthStore } from '@/store/useAuthStore';

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { login, googleLogin, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const onLogin = async () => {
    clearError();
    try {
      await login({ email: email.trim(), password });
    } catch (err: any) {
      Alert.alert('Login failed', err.message || 'Please try again');
    }
  };

  const onGoogleLogin = async () => {
    clearError();
    try {
      await googleLogin();
    } catch (err: any) {
      Alert.alert('Google login failed', err.message || 'Please try again');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        placeholder="Password"
        secureTextEntry
        style={styles.input}
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.button} onPress={onLogin} disabled={isLoading}>
        <Text style={styles.buttonLabel}>{isLoading ? 'Signing in...' : 'Sign In'}</Text>
      </Pressable>
      <Pressable style={styles.googleButton} onPress={onGoogleLogin} disabled={isLoading}>
        <Text style={styles.googleButtonLabel}>Continue With Google</Text>
      </Pressable>
      <Pressable onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>Need an account? Register</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 20,
    color: '#212529',
  },
  input: {
    borderWidth: 1,
    borderColor: '#DEE2E6',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#0B7285',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  googleButton: {
    borderWidth: 1,
    borderColor: '#DEE2E6',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  googleButtonLabel: {
    color: '#343A40',
    fontWeight: '600',
  },
  link: {
    marginTop: 14,
    color: '#0B7285',
    textAlign: 'center',
  },
  error: {
    color: '#C92A2A',
    marginBottom: 8,
  },
});
