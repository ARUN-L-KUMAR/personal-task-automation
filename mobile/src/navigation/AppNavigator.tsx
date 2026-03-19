import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AssistantScreen } from '@/screens/AssistantScreen';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { LoginScreen } from '@/screens/LoginScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { RegisterScreen } from '@/screens/RegisterScreen';
import { ServicesScreen } from '@/screens/ServicesScreen';
import { TasksScreen } from '@/screens/TasksScreen';
import { useAuthStore } from '@/store/useAuthStore';
import { AppTabParamList, AuthStackParamList, RootStackParamList } from '@/navigation/types';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<AppTabParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator>
      <AuthStack.Screen name="Login" component={LoginScreen} options={{ title: 'Sign In' }} />
      <AuthStack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create Account' }} />
    </AuthStack.Navigator>
  );
}

function AppTabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerTitleAlign: 'left',
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 2,
        },
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons name={getTabIconName(route.name, focused)} size={size} color={color} />
        ),
        tabBarStyle: {
          height: 64,
          paddingBottom: 6,
          paddingTop: 6,
          borderTopColor: '#E2E8F0',
          borderTopWidth: 1,
          backgroundColor: '#FFFFFF',
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={DashboardScreen} 
        options={{ title: 'Overview', tabBarLabel: 'Home' }} 
      />
      <Tab.Screen 
        name="Assistant" 
        component={AssistantScreen} 
        options={{ title: 'AI Assistant', tabBarLabel: 'Assistant' }} 
      />
      <Tab.Screen 
        name="Tasks" 
        component={TasksScreen} 
        options={{ title: 'Plan My Day', tabBarLabel: 'Tasks' }} 
      />
      <Tab.Screen 
        name="Services" 
        component={ServicesScreen} 
        options={{ title: 'Services', tabBarLabel: 'Services' }} 
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ title: 'My Profile', tabBarLabel: 'Profile' }} 
      />
    </Tab.Navigator>
  );
}

function getTabIconName(routeName: keyof AppTabParamList, focused: boolean): React.ComponentProps<typeof Ionicons>['name'] {
  if (routeName === 'Home') {
    return focused ? 'home' : 'home-outline';
  }
  if (routeName === 'Assistant') {
    return focused ? 'sparkles' : 'sparkles-outline';
  }
  if (routeName === 'Tasks') {
    return focused ? 'list' : 'list-outline';
  }
  if (routeName === 'Services') {
    return focused ? 'apps' : 'apps-outline';
  }
  if (routeName === 'Profile') {
    return focused ? 'person' : 'person-outline';
  }
  return 'help-circle-outline';
}

export function AppNavigator() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0B7285" />
      </View>
    );
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <RootStack.Screen name="App" component={AppTabsNavigator} />
      ) : (
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      )}
    </RootStack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
});
