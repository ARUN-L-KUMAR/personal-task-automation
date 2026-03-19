import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { cacheService } from '@/services/cache.service';
import { calendarService } from '@/services/calendar.service';
import { CalendarEvent } from '@/types/calendar';

const CALENDAR_CACHE_KEY = 'cache_calendar_today';
const CALENDAR_CACHE_AGE_MS = 5 * 60 * 1000;

export function CalendarScreen() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingCache, setUsingCache] = useState(false);

  const loadEvents = useCallback(async () => {
    try {
      const result = await calendarService.getTodayEvents();
      setEvents(result.events || []);
      setUsingCache(false);
      setError(null);
      await cacheService.set(CALENDAR_CACHE_KEY, result.events || []);
    } catch (err: any) {
      const cached = await cacheService.get<CalendarEvent[]>(CALENDAR_CACHE_KEY, CALENDAR_CACHE_AGE_MS);
      if (cached.data) {
        setEvents(cached.data);
        setUsingCache(true);
        setError('Using offline cache');
      } else {
        setError(err.message || 'Unable to load events');
      }
    }
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadEvents();
    setIsRefreshing(false);
  }, [loadEvents]);

  const todayDate = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  return (
    <View style={styles.container}>
      {/* ═══ Top Header ═══ */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>{todayDate}</Text>
          <Text style={styles.headerTitle}>My Schedule</Text>
        </View>
        <View style={styles.headerIconContainer}>
          <View style={styles.calendarIcon} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={onRefresh} 
            tintColor="#4F46E5"
            colors={["#4F46E5"]} 
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* ═══ Summary Banner ═══ */}
        <View style={styles.summaryBanner}>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryTitle}>
              {events.length === 0 ? 'No events today' : `${events.length} Upcoming Events`}
            </Text>
            <Text style={styles.summarySubtitle}>
              {events.length === 0 ? 'Enjoy your free time!' : 'Your schedule is synced with Google'}
            </Text>
          </View>
          <View style={styles.summaryBadge}>
            <Text style={styles.summaryBadgeText}>{events.length}</Text>
          </View>
        </View>

        {/* ═══ Status Indicators ═══ */}
        {error && (
          <View style={[styles.statusBox, error.includes('offline') ? styles.cacheBox : styles.errorBox]}>
            <Text style={[styles.statusText, error.includes('offline') ? styles.cacheText : styles.errorText]}>
              {error}
            </Text>
          </View>
        )}

        {/* ═══ Event Timeline ═══ */}
        <View style={styles.timelineContainer}>
          {events.length > 0 ? (
            events.map((event, idx) => {
              const start = event.start || 'All Day';
              const end = event.end || '';
              const title = event.title || event.summary || 'Untitled Event';
              
              return (
                <View key={`event_${idx}`} style={styles.timelineItem}>
                  {/* Left Time Column */}
                  <View style={styles.timeColumn}>
                    <Text style={styles.startTime}>{start}</Text>
                    {end ? <Text style={styles.endTime}>{end}</Text> : null}
                  </View>

                  {/* Right Content Card */}
                  <View style={styles.eventCard}>
                    <View style={styles.accentBar} />
                    <View style={styles.cardContent}>
                      <Text style={styles.eventTitle} numberOfLines={2}>{title}</Text>
                      {event.location ? (
                        <View style={styles.locationContainer}>
                          <View style={styles.locationIcon} />
                          <Text style={styles.eventLocation} numberOfLines={1}>{event.location}</Text>
                        </View>
                      ) : null}
                      {event.description ? (
                        <Text style={styles.eventDescription} numberOfLines={1}>
                          {event.description}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyGraphic}>
                <View style={styles.emptyCircle} />
              </View>
              <Text style={styles.emptyTitle}>Nothing scheduled yet</Text>
              <Text style={styles.emptySubtitle}>
                New events added to your Google Calendar will appear here automatically.
              </Text>
            </View>
          )}
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
    paddingBottom: 24,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarIcon: {
    width: 20,
    height: 20,
    backgroundColor: '#4F46E5',
    borderRadius: 4,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  summaryBanner: {
    margin: 20,
    padding: 20,
    backgroundColor: '#4F46E5',
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  summarySubtitle: {
    color: '#C7D2FE',
    fontSize: 13,
    marginTop: 4,
  },
  summaryBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  statusBox: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  errorBox: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECACA',
  },
  cacheBox: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorText: {
    color: '#E11D48',
  },
  cacheText: {
    color: '#166534',
  },
  timelineContainer: {
    paddingHorizontal: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timeColumn: {
    width: 65,
    paddingTop: 12,
    alignItems: 'flex-start',
  },
  startTime: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  endTime: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 2,
  },
  eventCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  accentBar: {
    width: 4,
    backgroundColor: '#4F46E5',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 20,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  locationIcon: {
    width: 10,
    height: 10,
    backgroundColor: '#94A3B8',
    borderRadius: 5,
    marginRight: 6,
  },
  eventLocation: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
  },
  eventDescription: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 8,
    fontStyle: 'italic',
  },
  emptyState: {
    marginTop: 40,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyGraphic: {
    width: 80,
    height: 80,
    borderRadius: 30,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
