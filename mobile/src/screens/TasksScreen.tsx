import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppStackParamList } from '@/navigation/types';
import { cacheService } from '@/services/cache.service';
import { dbTasksService } from '@/services/dbTasks.service';
import { projectsService } from '@/services/projects.service';
import { useAuthStore } from '@/store/useAuthStore';
import { ProjectItem } from '@/types/projects';
import { TaskItem } from '@/types/tasks';

type Props = NativeStackScreenProps<AppStackParamList, 'Tasks'>;

type TaskFormState = {
  title: string;
  description: string;
  priority: string;
  dueDate: string;
  projectId: string;
};

const emptyForm: TaskFormState = {
  title: '',
  description: '',
  priority: 'MEDIUM',
  dueDate: '',
  projectId: '',
};

const TASKS_CACHE_KEY = 'cache_tasks_list';
const TASKS_CACHE_AGE_MS = 2 * 60 * 1000;

export function TasksScreen({ navigation }: Props) {
  const { user, logout } = useAuthStore();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [form, setForm] = useState<TaskFormState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const loadTasks = useCallback(async () => {
    try {
      const data = await dbTasksService.list({ limit: 50, offset: 0 });
      setTasks(data);
      setError(null);
      await cacheService.set(TASKS_CACHE_KEY, data);
    } catch (err: any) {
      const cached = await cacheService.get<TaskItem[]>(TASKS_CACHE_KEY, TASKS_CACHE_AGE_MS);
      if (cached.data) {
        setTasks(cached.data);
        setError('Network unavailable. Showing cached tasks.');
      } else {
        setError(err.message || 'Unable to load tasks');
      }
    }
  }, []);

  const loadProjects = useCallback(async () => {
    try {
      const data = await projectsService.list();
      setProjects(data);
    } catch {
      setProjects([]);
    }
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      setIsLoading(true);
      await Promise.all([loadTasks(), loadProjects()]);
      setIsLoading(false);
    };

    void bootstrap();
  }, [loadProjects, loadTasks]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([loadTasks(), loadProjects()]);
    setIsRefreshing(false);
  }, [loadProjects, loadTasks]);

  const completeTask = useCallback(
    async (task: TaskItem) => {
      try {
        await dbTasksService.update(task.id, { status: 'DONE' });
        await loadTasks();
      } catch (err: any) {
        setError(err.message || 'Unable to complete task');
      }
    },
    [loadTasks]
  );

  const openCreate = () => {
    const defaultProject = projects[0]?.id || '';
    setEditingTask(null);
    setForm({ ...emptyForm, projectId: defaultProject });
    setIsModalOpen(true);
  };

  const openEdit = (task: TaskItem) => {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority || 'MEDIUM',
      dueDate: task.due_date || '',
      projectId: task.project_id,
    });
    setIsModalOpen(true);
  };

  const saveTask = async () => {
    if (!form.title.trim()) {
      setError('Task title is required.');
      return;
    }
    if (!editingTask && !form.projectId) {
      setError('Select a project first.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingTask) {
        await dbTasksService.update(editingTask.id, {
          title: form.title.trim(),
          description: form.description.trim() || null,
          priority: form.priority,
          due_date: form.dueDate || null,
        });
      } else {
        await dbTasksService.create({
          title: form.title.trim(),
          description: form.description.trim() || null,
          priority: form.priority,
          status: 'TODO',
          project_id: form.projectId,
          due_date: form.dueDate || null,
        });
      }

      setIsModalOpen(false);
      setForm(emptyForm);
      setEditingTask(null);
      await loadTasks();
    } catch (err: any) {
      setError(err.message || 'Unable to save task');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await dbTasksService.remove(taskId);
      await loadTasks();
    } catch (err: any) {
      setError(err.message || 'Unable to delete task');
    }
  };

  const header = useMemo(() => {
    return (
      <>
        <View style={styles.header}>
          <View>
            <Text style={styles.welcome}>Hi, {user?.name || 'User'}</Text>
            <Text style={styles.subtitle}>Manage tasks and project-linked workflow.</Text>
          </View>
          <Pressable style={styles.logoutButton} onPress={() => void logout()}>
            <Text style={styles.logoutLabel}>Logout</Text>
          </Pressable>
        </View>

        <View style={styles.navRow}>
          <Pressable style={styles.navChip} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.navChipLabel}>Home</Text>
          </Pressable>
          <Pressable style={styles.navChip} onPress={() => navigation.navigate('Projects')}>
            <Text style={styles.navChipLabel}>Projects</Text>
          </Pressable>
          <Pressable style={styles.navChip} onPress={() => navigation.navigate('Dashboard')}>
            <Text style={styles.navChipLabel}>Dashboard</Text>
          </Pressable>
          <Pressable style={styles.navChip} onPress={() => navigation.navigate('Calendar')}>
            <Text style={styles.navChipLabel}>Calendar</Text>
          </Pressable>
          <Pressable style={styles.navChip} onPress={() => navigation.navigate('Chatbot')}>
            <Text style={styles.navChipLabel}>Chat</Text>
          </Pressable>
        </View>

        <Pressable style={styles.createButton} onPress={openCreate}>
          <Text style={styles.createLabel}>Create Task</Text>
        </Pressable>
      </>
    );
  }, [logout, navigation, user?.name, openCreate]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0B7285" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {header}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        contentContainerStyle={tasks.length === 0 ? styles.emptyList : undefined}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Pressable onPress={() => openEdit(item)}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.meta}>Priority: {item.priority} | Status: {item.status}</Text>
              {item.due_date ? <Text style={styles.meta}>Due: {new Date(item.due_date).toLocaleString()}</Text> : null}
            </Pressable>

            <View style={styles.actionRow}>
              {item.status !== 'DONE' ? (
                <Pressable style={styles.actionButton} onPress={() => void completeTask(item)}>
                  <Text style={styles.actionLabel}>Complete</Text>
                </Pressable>
              ) : null}
              <Pressable style={styles.deleteButton} onPress={() => void deleteTask(item.id)}>
                <Text style={styles.deleteLabel}>Delete</Text>
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No tasks found for this user.</Text>}
      />

      <Modal transparent visible={isModalOpen} animationType="slide" onRequestClose={() => setIsModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingTask ? 'Edit Task' : 'Create Task'}</Text>

            <TextInput
              style={styles.input}
              placeholder="Task title"
              value={form.title}
              onChangeText={(value) => setForm((prev) => ({ ...prev, title: value }))}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description"
              multiline
              value={form.description}
              onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))}
            />

            <Text style={styles.fieldLabel}>Priority</Text>
            <View style={styles.priorityRow}>
              {['LOW', 'MEDIUM', 'HIGH'].map((priority) => (
                <Pressable
                  key={priority}
                  style={[styles.priorityChip, form.priority === priority ? styles.priorityChipActive : null]}
                  onPress={() => setForm((prev) => ({ ...prev, priority }))}
                >
                  <Text style={[styles.priorityChipLabel, form.priority === priority ? styles.priorityChipLabelActive : null]}>
                    {priority}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Due date (YYYY-MM-DD)"
              value={form.dueDate}
              onChangeText={(value) => setForm((prev) => ({ ...prev, dueDate: value }))}
            />

            {!editingTask ? (
              <>
                <Text style={styles.fieldLabel}>Select Project</Text>
                <View style={styles.projectRow}>
                  {projects.map((project) => (
                    <Pressable
                      key={project.id}
                      style={[styles.projectChip, form.projectId === project.id ? styles.projectChipActive : null]}
                      onPress={() => setForm((prev) => ({ ...prev, projectId: project.id }))}
                    >
                      <Text style={[styles.projectChipLabel, form.projectId === project.id ? styles.projectChipLabelActive : null]}>
                        {project.title}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable style={styles.secondaryButton} onPress={() => setIsModalOpen(false)}>
                <Text style={styles.secondaryLabel}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={() => void saveTask()} disabled={isSaving}>
                <Text style={styles.primaryLabel}>{isSaving ? 'Saving...' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  header: {
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcome: {
    fontSize: 22,
    fontWeight: '700',
    color: '#212529',
  },
  subtitle: {
    color: '#495057',
    marginTop: 2,
  },
  navRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  navChip: {
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  navChipLabel: {
    color: '#343A40',
    fontSize: 12,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#0B7285',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  createLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: '#ADB5BD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logoutLabel: {
    color: '#343A40',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 4,
  },
  meta: {
    color: '#495057',
    marginTop: 2,
  },
  actionButton: {
    backgroundColor: '#0B7285',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    alignItems: 'center',
    marginRight: 8,
  },
  actionLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: '#E03131',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    alignItems: 'center',
  },
  deleteLabel: {
    color: '#E03131',
    fontWeight: '600',
  },
  error: {
    color: '#C92A2A',
    marginBottom: 8,
  },
  emptyText: {
    color: '#495057',
    textAlign: 'center',
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 14,
    maxHeight: '88%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 10,
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
  fieldLabel: {
    color: '#343A40',
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 4,
  },
  priorityRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  priorityChip: {
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  priorityChipActive: {
    borderColor: '#0B7285',
    backgroundColor: '#E6F4F7',
  },
  priorityChipLabel: {
    color: '#495057',
    fontWeight: '600',
  },
  priorityChipLabelActive: {
    color: '#0B7285',
  },
  projectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  projectChip: {
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  projectChipActive: {
    borderColor: '#0B7285',
    backgroundColor: '#E6F4F7',
  },
  projectChipLabel: {
    color: '#495057',
    fontWeight: '600',
  },
  projectChipLabelActive: {
    color: '#0B7285',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 8,
  },
  secondaryLabel: {
    color: '#495057',
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#0B7285',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
