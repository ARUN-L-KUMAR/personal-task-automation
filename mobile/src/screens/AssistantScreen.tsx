import React from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

export function AssistantScreen() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.tag}>AI Companion</Text>
        <Text style={styles.title}>Assistant</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Pressable 
          style={styles.card} 
          onPress={() => navigation.navigate('Chatbot')}
        >
          <View style={[styles.iconBox, { backgroundColor: '#EEF2FF' }]}>
            <Ionicons name="chatbubbles" size={24} color="#4F46E5" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>Chat with G-ONE</Text>
            <Text style={styles.cardSub}>Ask questions and get help</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
        </Pressable>

        <Pressable 
          style={styles.card}
          onPress={() => {/* TODO: Navigate to Voice Assistant */}}
        >
          <View style={[styles.iconBox, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="mic" size={24} color="#10B981" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>Voice Assistant</Text>
            <Text style={styles.cardSub}>Talk naturally with your AI</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  tag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4F46E5',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
  },
  content: {
    paddingHorizontal: 20,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  cardSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
});
