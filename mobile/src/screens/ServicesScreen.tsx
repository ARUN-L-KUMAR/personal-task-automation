import React from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

export function ServicesScreen() {
  const navigation = useNavigation<any>();

  const services = [
    { id: 'calendar', title: 'Calendar', icon: 'calendar', color: '#3B82F6', bg: '#EFF6FF', screen: 'Calendar' },
    { id: 'projects', title: 'Projects', icon: 'folder', color: '#8B5CF6', bg: '#F5F3FF', screen: 'Projects' },
    { id: 'email', title: 'Email', icon: 'mail', color: '#EF4444', bg: '#FEF2F2', screen: 'Email' },
    { id: 'maps', title: 'Maps', icon: 'map', color: '#F59E0B', bg: '#FFFBEB', screen: 'Maps' },
    { id: 'notes', title: 'Notes', icon: 'document-text', color: '#10B981', bg: '#ECFDF5', screen: 'Notes' },
    { id: 'history', title: 'History', icon: 'time', color: '#64748B', bg: '#F8FAFC', screen: 'History' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.tag}>Ecosystem</Text>
        <Text style={styles.title}>Services</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.grid}>
          {services.map((service) => (
            <Pressable 
              key={service.id}
              style={styles.serviceCard}
              onPress={() => navigation.navigate(service.screen)}
            >
              <View style={[styles.iconBox, { backgroundColor: service.bg }]}>
                <Ionicons name={service.icon as any} size={24} color={service.color} />
              </View>
              <Text style={styles.serviceTitle}>{service.title}</Text>
            </Pressable>
          ))}
        </View>
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
    color: '#6366F1',
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
    paddingBottom: 40,
  },
  grid: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  serviceCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  serviceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
});
