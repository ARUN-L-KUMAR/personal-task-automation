import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { CalendarScreen } from '@/screens/CalendarScreen';
import { ChatbotScreen } from '@/screens/ChatbotScreen';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { LoginScreen } from '@/screens/LoginScreen';
import { ProjectsScreen } from '@/screens/ProjectsScreen';
import { RegisterScreen } from '@/screens/RegisterScreen';
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
        tabBarActiveTintColor: '#0F766E',
        tabBarInactiveTintColor: '#64748B',
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
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Workspace', tabBarLabel: 'Home' }} />
      <Tab.Screen name="Tasks" component={TasksScreen} options={{ title: 'My Tasks', tabBarLabel: 'Tasks' }} />
      <Tab.Screen name="Projects" component={ProjectsScreen} options={{ title: 'Projects', tabBarLabel: 'Projects' }} />
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard', tabBarLabel: 'Dashboard' }} />
      <Tab.Screen name="Calendar" component={CalendarScreen} options={{ title: 'Calendar', tabBarLabel: 'Calendar' }} />
      <Tab.Screen name="Chatbot" component={ChatbotScreen} options={{ title: 'Chatbot', tabBarLabel: 'Chat' }} />
    </Tab.Navigator>
  );
}

function getTabIconName(routeName: keyof AppTabParamList, focused: boolean): React.ComponentProps<typeof Ionicons>['name'] {
  if (routeName === 'Home') {
    return focused ? 'home' : 'home-outline';
  }
  if (routeName === 'Tasks') {
    return focused ? 'checkbox' : 'checkbox-outline';
  }
  if (routeName === 'Projects') {
    return focused ? 'folder' : 'folder-outline';
  }
  if (routeName === 'Dashboard') {
    return focused ? 'grid' : 'grid-outline';
  }
  if (routeName === 'Calendar') {
    return focused ? 'calendar' : 'calendar-outline';
  }
  return focused ? 'chatbubble' : 'chatbubble-outline';
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
