import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

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
        setError('Using offline cache');
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

  const greeting = useMemo(() => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good Morning';
    if (hours < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  if (!summary && !error) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading your day...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl 
          refreshing={isRefreshing} 
          onRefresh={onRefresh} 
          tintColor="#4F46E5"
          colors={["#4F46E5"]}
        />
      }
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ═══ Header Section ═══ */}
      <View style={styles.header}>
        <Text style={styles.greeting}>{greeting}, User</Text>
        <Text style={styles.headerTitle}>Overview</Text>
      </View>

      {summary && (
        <>
          {/* ═══ Productivity Score Card ═══ */}
          <View style={styles.scoreCard}>
            <View style={styles.scoreInfo}>
              <Text style={styles.scoreLabel}>Productivity Score</Text>
              <Text style={styles.scoreValue}>{summary.stats.productivity_score}</Text>
              <Text style={styles.scoreRating}>Excellent Pace</Text>
            </View>
            <View style={styles.scoreGraphic}>
              <View style={[styles.scoreProgress, { height: `${summary.stats.productivity_score}%` }]} />
            </View>
          </View>

          {/* ═══ Stats Grid ═══ */}
          <View style={styles.grid}>
            <StatCard 
              label="Meetings" 
              value={summary.stats.meetings} 
              iconColor="#4F46E5" 
              bgColor="#EEF2FF"
            />
            <StatCard 
              label="Active Tasks" 
              value={summary.stats.active_tasks} 
              iconColor="#0EA5E9" 
              bgColor="#F0F9FF"
            />
            <StatCard 
              label="Overdue" 
              value={summary.stats.overdue_tasks} 
              iconColor="#E11D48" 
              bgColor="#FFF1F2"
            />
            <StatCard 
              label="Urgent" 
              value={summary.stats.urgent_tasks} 
              iconColor="#F59E0B" 
              bgColor="#FFFBEB"
            />
            <StatCard 
              label="Conflicts" 
              value={summary.stats.conflicts} 
              iconColor="#7C3AED" 
              bgColor="#F5F3FF"
            />
            <StatCard 
              label="Emails" 
              value={summary.stats.emails || 0} 
              iconColor="#10B981" 
              bgColor="#ECFDF5"
            />
          </View>

          {/* ═══ Insights Section ═══ */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Daily Insights</Text>
          </View>
          <View style={styles.insightsContainer}>
            {summary.insights?.length ? (
              summary.insights.map((insight, idx) => (
                <View key={`${insight.label}_${idx}`} style={styles.insightCard}>
                  <View style={[styles.insightIcon, { backgroundColor: getToneColor(insight.tone || 'info') }]} />
                  <View style={styles.insightContent}>
                    <Text style={styles.insightLabel}>{insight.label}</Text>
                    <Text style={styles.insightValue}>{insight.value}</Text>
                  </View>
                  <View style={[styles.toneBadge, { backgroundColor: getToneBadgeBg(insight.tone || 'info') }]}>
                    <Text style={[styles.toneBadgeText, { color: getToneColor(insight.tone || 'info') }]}>
                      {insight.tone?.toUpperCase() || 'INFO'}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No AI insights for now.</Text>
            )}
          </View>

          {/* ═══ Agenda Preview ═══ */}
          <View style={styles.dualSection}>
            <View style={styles.agendaHalf}>
              <Text style={styles.miniSectionTitle}>Events</Text>
              {summary.events?.slice(0, 3).map((event, idx) => (
                <View key={idx} style={styles.miniCard}>
                  <Text style={styles.miniCardText} numberOfLines={1}>{event.title || event.summary || 'Untitled'}</Text>
                </View>
              )) || <Text style={styles.emptyText}>None</Text>}
            </View>
            <View style={styles.agendaHalf}>
              <Text style={styles.miniSectionTitle}>Tasks</Text>
              {summary.tasks?.slice(0, 3).map((task, idx) => (
                <View key={idx} style={styles.miniCard}>
                  <Text style={styles.miniCardText} numberOfLines={1}>{task.title || 'Untitled'}</Text>
                </View>
              )) || <Text style={styles.emptyText}>None</Text>}
            </View>
          </View>

          {error && (
            <View style={[styles.statusBanner, error.includes('cache') ? styles.cacheBanner : styles.errorBanner]}>
              <Text style={styles.statusBannerText}>{error}</Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

function StatCard({ label, value, iconColor, bgColor }: { label: string; value: number | string; iconColor: string; bgColor: string }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconWrapper, { backgroundColor: bgColor }]}>
        <View style={[styles.statIcon, { backgroundColor: iconColor }]} />
      </View>
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

function getToneColor(tone: string) {
  switch (tone) {
    case 'danger': return '#E11D48';
    case 'warning': return '#F59E0B';
    case 'success': return '#10B981';
    default: return '#4F46E5';
  }
}

function getToneBadgeBg(tone: string) {
  switch (tone) {
    case 'danger': return '#FFF1F2';
    case 'warning': return '#FFFBEB';
    case 'success': return '#ECFDF5';
    default: return '#EEF2FF';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -1,
  },
  scoreCard: {
    marginHorizontal: 20,
    padding: 24,
    backgroundColor: '#0F172A',
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  scoreInfo: {
    flex: 1,
  },
  scoreLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scoreValue: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '800',
    marginVertical: 4,
  },
  scoreRating: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '700',
  },
  scoreGraphic: {
    width: 60,
    height: 100,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 30,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  scoreProgress: {
    width: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 30,
  },
  grid: {
    marginTop: 24,
    paddingHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  statIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIcon: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  sectionHeader: {
    marginTop: 32,
    marginHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  insightsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  insightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  insightIcon: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 16,
  },
  insightContent: {
    flex: 1,
  },
  insightLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  insightValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 2,
  },
  toneBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  toneBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  dualSection: {
    marginTop: 32,
    paddingHorizontal: 20,
    flexDirection: 'row',
    gap: 16,
  },
  agendaHalf: {
    flex: 1,
  },
  miniSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  miniCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  miniCardText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  statusBanner: {
    margin: 20,
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  errorBanner: {
    backgroundColor: '#FFF1F2',
  },
  cacheBanner: {
    backgroundColor: '#F0FDF4',
  },
  statusBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
});
