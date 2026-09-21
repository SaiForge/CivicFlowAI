/**
 * CivicFlowAI — Reusable React hooks for all API data.
 * Backed by Redis caching, Server-Sent Events (SSE) real-time stream,
 * and resilient background polling for 100% live synchronization across portals.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  complaintsApi, incidentsApi, statsApi, notificationsApi,
} from '../services/api';
import { useApp } from '../context/AppContext';

// ── Generic hook factory with Real-Time SSE Sync & Polling ────────────────────

function useApiCall(fetchFn, deps = [], pollInterval = 4000) {
  const appContext = useApp();
  const refreshTrigger = appContext?.refreshTrigger ?? 0;

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const isFirstMount = useRef(true);

  const fetch_ = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err.message || 'Request failed');
    } finally {
      if (isInitial) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // 1. Initial fetch & live update on deps or realtime event
  useEffect(() => {
    const isFirst = isFirstMount.current;
    if (isFirst) {
      isFirstMount.current = false;
      fetch_(true);
    } else {
      // Seamless silent update on live event
      fetch_(false);
    }
  }, [fetch_, refreshTrigger]);

  // 2. Resilient background polling fallback
  useEffect(() => {
    if (!pollInterval || pollInterval <= 0) return;
    const timer = setInterval(() => {
      fetch_(false);
    }, pollInterval);
    return () => clearInterval(timer);
  }, [fetch_, pollInterval]);

  return { data, loading, error, refetch: () => fetch_(true) };
}

// ── Complaints ────────────────────────────────────────────────────────────────

export function useComplaints(params = {}, pollInterval = 4000) {
  const key = JSON.stringify(params);
  return useApiCall(() => complaintsApi.list(params), [key], pollInterval);
}

export function useComplaint(id) {
  return useApiCall(() => (id ? complaintsApi.get(id) : Promise.resolve(null)), [id], id ? 3000 : 0);
}

export function useComplaintTrace(id) {
  return useApiCall(() => (id ? complaintsApi.getTrace(id) : Promise.resolve(null)), [id], 0);
}

// ── Incidents ─────────────────────────────────────────────────────────────────

export function useIncidents(pollInterval = 4000) {
  return useApiCall(() => incidentsApi.list(), [], pollInterval);
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export function useAdminStats(pollInterval = 4000) {
  return useApiCall(() => statsApi.admin(), [], pollInterval);
}

export function useCategoryBreakdown(pollInterval = 4000) {
  return useApiCall(() => statsApi.categoryBreakdown(), [], pollInterval);
}

export function useStatusBreakdown(pollInterval = 4000) {
  return useApiCall(() => statsApi.statusBreakdown(), [], pollInterval);
}

export function useDeptPerformance(pollInterval = 4000) {
  return useApiCall(() => statsApi.deptPerformance(), [], pollInterval);
}

export function useActivityFeed(limit = 20, pollInterval = 3000) {
  return useApiCall(() => statsApi.activityFeed(limit), [limit], pollInterval);
}

export function useMapMarkers(pollInterval = 4000) {
  return useApiCall(() => statsApi.mapMarkers(), [], pollInterval);
}

export function useAreaStats(pollInterval = 5000) {
  return useApiCall(() => statsApi.area(), [], pollInterval);
}

// ── Notifications ─────────────────────────────────────────────────────────────

export function useNotifications(pollInterval = 6000) {
  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('civicflow_token');
  return useApiCall(
    () => (hasToken ? notificationsApi.list() : Promise.resolve([])),
    [hasToken],
    hasToken ? pollInterval : 0
  );
}
