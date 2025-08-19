// Utility functions for formatting trading data

export function formatUsd(value: number | undefined): string {
  if (value === undefined || value === null) return '—';
  
  const absValue = Math.abs(value);
  
  if (absValue >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  } else if (absValue >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`;
  } else if (absValue >= 1) {
    return `$${value.toFixed(2)}`;
  } else {
    return `$${value.toFixed(4)}`;
  }
}

export function formatBps(value: number | undefined): string {
  if (value === undefined || value === null) return '—';
  return `${value.toFixed(1)} bps`;
}

export function formatPercent(value: number | undefined): string {
  if (value === undefined || value === null) return '—';
  return `${(value * 100).toFixed(2)}%`;
}

export function formatLatency(ms: number | undefined): string {
  if (ms === undefined || ms === null) return '—';
  
  if (ms < 1000) {
    return `${ms.toFixed(0)}ms`;
  } else {
    return `${(ms / 1000).toFixed(2)}s`;
  }
}

export function formatTimestamp(timestamp: number | undefined): string {
  if (!timestamp) return '—';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  if (diffMs < 60000) { // Less than 1 minute
    return 'Just now';
  } else if (diffMs < 3600000) { // Less than 1 hour
    const minutes = Math.floor(diffMs / 60000);
    return `${minutes}m ago`;
  } else if (diffMs < 86400000) { // Less than 1 day
    const hours = Math.floor(diffMs / 3600000);
    return `${hours}h ago`;
  } else {
    return date.toLocaleDateString();
  }
}

export function formatTimeAgo(timestamp: number | undefined): string {
  if (!timestamp) return '—';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  
  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  } else if (diffSeconds < 3600) {
    const minutes = Math.floor(diffSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffSeconds < 86400) {
    const hours = Math.floor(diffSeconds / 3600);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(diffSeconds / 86400);
    return `${days}d ago`;
  }
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'healthy':
    case 'success':
    case 'active':
      return 'success';
    case 'warning':
    case 'pending':
      return 'pending';
    case 'error':
    case 'failed':
    case 'down':
      return 'failed';
    default:
      return 'muted';
  }
}

export function getProfitColor(value: number | undefined): string {
  if (value === undefined || value === null) return 'muted';
  return value >= 0 ? 'profit' : 'loss';
}