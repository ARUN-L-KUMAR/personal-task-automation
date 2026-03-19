import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { cacheService } from '@/services/cache.service';
import { dashboardService } from '@/services/dashboard.service';
import { DashboardSummaryResponse } from '@/types/dashboard';

const DASHBOARD_CACHE_KEY = 'cache_dashboard_summary';
const DASHBOARD_CACHE_AGE_MS = 5 * 60 * 1000;

export function DashboardScreen() {
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingCache, setUsingCache] = useState(false);

  const loadSummary = useCallback(async () => {
    try {
      const live = await dashboardService.getSummary();
      setSummary(live);
      setUsingCache(false);
      setError(null);
      await cacheService.set(DASHBOARD_CACHE_KEY, live);
    } catch (err: any) {
      const cached = await cacheService.get<DashboardSummaryResponse>(DASHBOARD_CACHE_KEY, DASHBOARD_CACHE_AGE_MS);
      if (cached.data) {
        setSummary(cached.data);
        setUsingCache(true);
        setError('Network unavailable. Showing cached dashboard data.');
      } else {
        setError(err.message || 'Unable to load dashboard');
      }
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadSummary();
    setIsRefreshing(false);
  }, [loadSummary]);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.heading}>Dashboard</Text>
      {error ? <Text style={styles.warning}>{error}</Text> : null}
      {usingCache ? <Text style={styles.cache}>Offline cache mode</Text> : null}

      {summary ? (
        <>
          <View style={styles.grid}>
            <StatCard label="Meetings" value={summary.stats.meetings} />
            <StatCard label="Active Tasks" value={summary.stats.active_tasks} />
            <StatCard label="Overdue" value={summary.stats.overdue_tasks} />
            <StatCard label="Urgent" value={summary.stats.urgent_tasks} />
            <StatCard label="Conflicts" value={summary.stats.conflicts} />
            <StatCard label="Score" value={summary.stats.productivity_score} />
          </View>

          <Section title="Insights">
            {summary.insights?.length ? (
              summary.insights.map((insight, idx) => (
                <Text key={`${insight.label}_${idx}`} style={styles.itemText}>
                  {insight.label}: {insight.value}
                </Text>
              ))
            ) : (
              <Text style={styles.itemText}>No insights available.</Text>
            )}
          </Section>

          <Section title="Upcoming Events">
            {summary.events?.length ? (
              summary.events.map((event, idx) => (
                <Text key={`event_${idx}`} style={styles.itemText}>
                  {event.title || event.summary || 'Untitled'}
                </Text>
              ))
            ) : (
              <Text style={styles.itemText}>No events found.</Text>
            )}
          </Section>

          <Section title="Pending Tasks">
            {summary.tasks?.length ? (
              summary.tasks.map((task, idx) => (
                <Text key={`task_${idx}`} style={styles.itemText}>
                  {task.title || 'Untitled task'}
                </Text>
              ))
            ) : (
              <Text style={styles.itemText}>No tasks found.</Text>
            )}
          </Section>
        </>
      ) : null}
    </ScrollView>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    padding: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#212529',
  },
  warning: {
    color: '#C92A2A',
    marginTop: 8,
  },
  cache: {
    color: '#0B7285',
    marginTop: 4,
  },
  grid: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderColor: '#E9ECEF',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
  },
  statLabel: {
    color: '#495057',
    marginTop: 2,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E9ECEF',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 8,
  },
  itemText: {
    color: '#495057',
    marginBottom: 6,
  },
});
