import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';

import { AppStackParamList } from '@/navigation/types';
import { dashboardService } from '@/services/dashboard.service';
import { dbTasksService } from '@/services/dbTasks.service';
import { projectsService } from '@/services/projects.service';
import { useAuthStore } from '@/store/useAuthStore';
import { DashboardSummaryResponse } from '@/types/dashboard';
import { ProjectItem } from '@/types/projects';
import { TaskItem } from '@/types/tasks';

type Props = NativeStackScreenProps<AppStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { user, logout } = useAuthStore();

  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHomeData = useCallback(async () => {
    setError(null);

    const [summaryResult, tasksResult, projectsResult] = await Promise.allSettled([
      dashboardService.getSummary(),
      dbTasksService.list({ limit: 8 }),
      projectsService.list(8, 0),
    ]);

    const failures: string[] = [];

    if (summaryResult.status === 'fulfilled') {
      setSummary(summaryResult.value);
    } else {
      failures.push('dashboard');
    }

    if (tasksResult.status === 'fulfilled') {
      setTasks(tasksResult.value);
    } else {
      failures.push('tasks');
    }

    if (projectsResult.status === 'fulfilled') {
      setProjects(projectsResult.value);
    } else {
      failures.push('projects');
    }

    if (failures.length === 3) {
      setError('Could not load home data right now. Pull to refresh to try again.');
    } else if (failures.length > 0) {
      setError(`Some sections failed to load (${failures.join(', ')}).`);
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      setIsLoading(true);
      await loadHomeData();
      setIsLoading(false);
    };

    void run();
  }, [loadHomeData]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadHomeData();
    setIsRefreshing(false);
  }, [loadHomeData]);

  const firstName = useMemo(() => {
    if (!user?.name) {
      return 'there';
    }
    return user.name.split(' ')[0] || 'there';
  }, [user?.name]);

  const todayLabel = useMemo(() => {
    return new Date().toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const completedCount = useMemo(() => {
    return tasks.filter((task) => String(task.status).toUpperCase() === 'DONE').length;
  }, [tasks]);

  const inProgressCount = useMemo(() => {
    return tasks.filter((task) => String(task.status).toUpperCase() === 'IN_PROGRESS').length;
  }, [tasks]);

  const topTasks = useMemo(() => {
    return tasks.slice(0, 4);
  }, [tasks]);

  const focusItems = useMemo(() => {
    if (!summary?.events?.length) {
      return [];
    }
    return summary.events.slice(0, 3);
  }, [summary?.events]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.backgroundCircleOne} />
      <View style={styles.backgroundCircleTwo} />

      <View style={styles.heroCard}>
        <Text style={styles.dateLabel}>{todayLabel}</Text>
        <Text style={styles.welcome}>Hello, {firstName}</Text>
        <Text style={styles.subtitle}>Your personal command center for tasks, projects, meetings, and AI planning.</Text>

        <View style={styles.kpiRow}>
          <KpiBadge label="Active" value={summary?.stats.active_tasks ?? tasks.length} />
          <KpiBadge label="Urgent" value={summary?.stats.urgent_tasks ?? 0} />
          <KpiBadge label="Score" value={summary?.stats.productivity_score ?? '--'} />
        </View>
      </View>

      {error ? <Text style={styles.warning}>{error}</Text> : null}

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Quick actions</Text>
        <Text style={styles.sectionSubtle}>{isLoading ? 'Loading...' : 'Ready'}</Text>
      </View>

      <View style={styles.quickGrid}>
        <QuickActionCard
          title="Tasks"
          subtitle={`${tasks.length} items`}
          accent="#0B7285"
          onPress={() => navigation.navigate('Tasks')}
        />
        <QuickActionCard
          title="Projects"
          subtitle={`${projects.length} workspaces`}
          accent="#1D4ED8"
          onPress={() => navigation.navigate('Projects')}
        />
        <QuickActionCard
          title="Calendar"
          subtitle={`${summary?.stats.meetings ?? focusItems.length} meetings`}
          accent="#C2410C"
          onPress={() => navigation.navigate('Calendar')}
        />
        <QuickActionCard
          title="Chatbot"
          subtitle="Ask your assistant"
          accent="#047857"
          onPress={() => navigation.navigate('Chatbot')}
        />
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Today focus</Text>
      </View>

      <View style={styles.focusCard}>
        <View style={styles.metricRow}>
          <MetricTile label="In progress" value={inProgressCount} />
          <MetricTile label="Completed" value={completedCount} />
          <MetricTile label="Overdue" value={summary?.stats.overdue_tasks ?? 0} />
        </View>

        {focusItems.length ? (
          <View style={styles.inlineList}>
            {focusItems.map((event, idx) => (
              <Text key={`${event.title || event.summary || 'event'}_${idx}`} style={styles.listText}>
                  {`- ${event.title || event.summary || 'Upcoming event'}`}
              </Text>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No upcoming events synced yet.</Text>
        )}
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Recent tasks</Text>
        <Pressable onPress={() => navigation.navigate('Tasks')}>
          <Text style={styles.linkLabel}>View all</Text>
        </Pressable>
      </View>

      <View style={styles.listCard}>
        {topTasks.length ? (
          topTasks.map((task) => (
            <View key={task.id} style={styles.taskRow}>
              <View style={styles.taskTitleWrap}>
                <Text numberOfLines={1} style={styles.taskTitle}>
                  {task.title}
                </Text>
                <Text style={styles.taskMeta}>{formatTaskMeta(task)}</Text>
              </View>
              <StatusPill value={task.status} />
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No tasks yet. Start by creating your first one.</Text>
        )}
      </View>

      <Pressable style={styles.dashboardButton} onPress={() => navigation.navigate('Dashboard')}>
        <Text style={styles.dashboardButtonText}>Open full dashboard</Text>
      </Pressable>

      <Pressable style={styles.logoutButton} onPress={() => void logout()}>
        <Text style={styles.logoutLabel}>Logout</Text>
      </Pressable>
    </ScrollView>
  );
}

function KpiBadge({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={styles.kpiBadge}>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function QuickActionCard({
  title,
  subtitle,
  accent,
  onPress,
}: {
  title: string;
  subtitle: string;
  accent: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.quickCard} onPress={onPress}>
      <View style={[styles.quickAccent, { backgroundColor: accent }]} />
      <Text style={styles.quickTitle}>{title}</Text>
      <Text style={styles.quickSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

function MetricTile({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={styles.metricTile}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function StatusPill({ value }: { value: string }) {
  const upper = value.toUpperCase();
  const isDone = upper === 'DONE';
  const isProgress = upper === 'IN_PROGRESS';

  return (
    <View style={[styles.statusPill, isDone ? styles.statusDone : isProgress ? styles.statusProgress : styles.statusTodo]}>
      <Text style={styles.statusText}>{upper.replace('_', ' ')}</Text>
    </View>
  );
}

function formatTaskMeta(task: TaskItem): string {
  const due = task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date';
  const priority = String(task.priority || 'MEDIUM').toUpperCase();
  return `${priority} | ${due}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  content: {
    padding: 16,
    paddingBottom: 26,
  },
  backgroundCircleOne: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#CFE8FF',
    top: -70,
    right: -70,
  },
  backgroundCircleTwo: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#DBF7EC',
    top: 180,
    left: -55,
  },
  heroCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  dateLabel: {
    color: '#A5B4FC',
    fontSize: 12,
    fontWeight: '600',
  },
  welcome: {
    fontSize: 27,
    fontWeight: '700',
    color: '#E2E8F0',
    marginTop: 6,
  },
  subtitle: {
    color: '#CBD5E1',
    marginTop: 8,
    lineHeight: 20,
  },
  kpiRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  kpiBadge: {
    width: '31.5%',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  kpiValue: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  kpiLabel: {
    color: '#93C5FD',
    fontSize: 11,
    marginTop: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  warning: {
    color: '#991B1B',
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  sectionHeaderRow: {
    marginTop: 18,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionSubtle: {
    color: '#64748B',
    fontWeight: '500',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 10,
  },
  quickAccent: {
    width: 26,
    height: 4,
    borderRadius: 999,
  },
  quickTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  quickSubtitle: {
    marginTop: 5,
    color: '#475569',
    fontSize: 12,
  },
  focusCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricTile: {
    width: '31.5%',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    alignItems: 'center',
  },
  metricValue: {
    color: '#0F172A',
    fontSize: 19,
    fontWeight: '800',
  },
  metricLabel: {
    marginTop: 3,
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  inlineList: {
    marginTop: 12,
  },
  listText: {
    color: '#1E293B',
    marginBottom: 8,
  },
  linkLabel: {
    color: '#0B7285',
    fontWeight: '600',
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  taskTitleWrap: {
    flex: 1,
    marginRight: 8,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  taskMeta: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 12,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusDone: {
    backgroundColor: '#DCFCE7',
  },
  statusProgress: {
    backgroundColor: '#DBEAFE',
  },
  statusTodo: {
    backgroundColor: '#E2E8F0',
  },
  statusText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyText: {
    color: '#64748B',
    marginTop: 10,
    marginBottom: 2,
  },
  dashboardButton: {
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: '#0B7285',
    paddingVertical: 12,
    alignItems: 'center',
  },
  dashboardButtonText: {
    color: '#ECFEFF',
    fontWeight: '700',
  },
  logoutButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  logoutLabel: {
    color: '#334155',
    fontWeight: '600',
  },
});
