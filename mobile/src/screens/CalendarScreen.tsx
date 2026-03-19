import React, { useCallback, useEffect, useState } from 'react';
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
        setError('Network unavailable. Showing cached calendar events.');
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

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.heading}>Calendar</Text>
      {error ? <Text style={styles.warning}>{error}</Text> : null}
      {usingCache ? <Text style={styles.cache}>Offline cache mode</Text> : null}

      {events.length ? (
        events.map((event, idx) => {
          const start = event.start || '';
          const end = event.end || '';
          const title = event.title || event.summary || 'Untitled';
          return (
            <View key={`event_${idx}`} style={styles.card}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.meta}>Start: {start || '-'}</Text>
              <Text style={styles.meta}>End: {end || '-'}</Text>
              {event.location ? <Text style={styles.meta}>Location: {event.location}</Text> : null}
            </View>
          );
        })
      ) : (
        <Text style={styles.empty}>No events found for today.</Text>
      )}
    </ScrollView>
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
    marginBottom: 8,
  },
  warning: {
    color: '#C92A2A',
    marginBottom: 4,
  },
  cache: {
    color: '#0B7285',
    marginBottom: 6,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E9ECEF',
    borderWidth: 1,
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
    marginTop: 3,
    color: '#495057',
  },
  empty: {
    marginTop: 16,
    textAlign: 'center',
    color: '#6C757D',
  },
});
