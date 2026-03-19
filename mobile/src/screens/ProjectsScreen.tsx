import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

import { cacheService } from '@/services/cache.service';
import { projectsService } from '@/services/projects.service';
import { ProjectItem } from '@/types/projects';

const PROJECTS_CACHE_KEY = 'cache_projects_list';
const PROJECTS_CACHE_AGE_MS = 5 * 60 * 1000;

export function ProjectsScreen() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      const data = await projectsService.list();
      setProjects(data);
      setError(null);
      await cacheService.set(PROJECTS_CACHE_KEY, data);
    } catch (err: any) {
      const cached = await cacheService.get<ProjectItem[]>(PROJECTS_CACHE_KEY, PROJECTS_CACHE_AGE_MS);
      if (cached.data) {
        setProjects(cached.data);
        setError('Network unavailable. Showing cached projects.');
      } else {
        setError(err.message || 'Unable to load projects');
      }
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadProjects();
    setIsRefreshing(false);
  }, [loadProjects]);

  const onCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Validation', 'Project title is required');
      return;
    }
    setIsSaving(true);
    try {
      await projectsService.create({
        title: title.trim(),
        description: description.trim() || null,
        status: 'ACTIVE',
      });
      setTitle('');
      setDescription('');
      await loadProjects();
    } catch (err: any) {
      Alert.alert('Create failed', err.message || 'Try again');
    } finally {
      setIsSaving(false);
    }
  };

  const onDelete = async (projectId: string) => {
    try {
      await projectsService.remove(projectId);
      await loadProjects();
    } catch (err: any) {
      Alert.alert('Delete failed', err.message || 'Try again');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Projects</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Create Project</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder="Project title" style={styles.input} />
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Description (optional)"
          style={[styles.input, styles.textArea]}
          multiline
        />
        <Pressable style={styles.primaryButton} onPress={onCreate} disabled={isSaving}>
          <Text style={styles.primaryLabel}>{isSaving ? 'Saving...' : 'Create Project'}</Text>
        </Pressable>
      </View>

      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            {item.description ? <Text style={styles.meta}>{item.description}</Text> : null}
            <Text style={styles.meta}>Status: {item.status}</Text>
            <Pressable style={styles.dangerButton} onPress={() => void onDelete(item.id)}>
              <Text style={styles.dangerLabel}>Delete</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No projects yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F8F9FA',
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 8,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    padding: 12,
    marginBottom: 12,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DEE2E6',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  primaryButton: {
    marginTop: 2,
    backgroundColor: '#0B7285',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212529',
  },
  meta: {
    color: '#495057',
    marginTop: 3,
  },
  dangerButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E03131',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  dangerLabel: {
    color: '#E03131',
    fontWeight: '600',
  },
  empty: {
    textAlign: 'center',
    color: '#6C757D',
    marginTop: 20,
  },
  error: {
    color: '#C92A2A',
    marginBottom: 8,
  },
});
