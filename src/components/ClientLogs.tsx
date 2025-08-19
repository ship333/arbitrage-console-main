import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ClientLog } from '@/lib/types';
import { formatTimeAgo } from '@/lib/formatters';
import { Search, Trash2, Download, AlertCircle, Info, AlertTriangle, Bug } from 'lucide-react';

export function ClientLogs() {
  const [logs, setLogs] = useState<ClientLog[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    // Load existing logs from localStorage
    const savedLogs = localStorage.getItem('client-logs');
    if (savedLogs) {
      try {
        setLogs(JSON.parse(savedLogs));
      } catch (error) {
        console.error('Failed to load logs:', error);
      }
    }

    // Set up global error handler
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const originalConsoleInfo = console.info;

    console.error = (...args) => {
      originalConsoleError(...args);
      addLog('error', args.join(' '), null, 'console');
    };

    console.warn = (...args) => {
      originalConsoleWarn(...args);
      addLog('warn', args.join(' '), null, 'console');
    };

    console.info = (...args) => {
      originalConsoleInfo(...args);
      addLog('info', args.join(' '), null, 'console');
    };

    // Listen for unhandled errors
    const handleError = (event: ErrorEvent) => {
      addLog('error', `Unhandled error: ${event.message}`, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }, 'javascript');
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      addLog('error', `Unhandled promise rejection: ${event.reason}`, {
        reason: event.reason
      }, 'promise');
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      console.info = originalConsoleInfo;
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  const addLog = (level: ClientLog['level'], message: string, data?: any, source: string = 'app') => {
    const newLog: ClientLog = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      level,
      message,
      data,
      source
    };

    setLogs(prev => {
      const updated = [newLog, ...prev].slice(0, 1000); // Keep only last 1000 logs
      localStorage.setItem('client-logs', JSON.stringify(updated));
      return updated;
    });
  };

  // Add some sample logs on first load
  useEffect(() => {
    if (logs.length === 0) {
      addLog('info', 'Client logging system initialized', null, 'system');
      addLog('debug', 'Loading application components', null, 'system');
      addLog('info', 'Connected to API endpoint', { url: 'http://127.0.0.1:8083' }, 'api');
    }
  }, [logs.length]);

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === 'all' || log.level === filter;
    const matchesSearch = search === '' || 
      log.message.toLowerCase().includes(search.toLowerCase()) ||
      log.source.toLowerCase().includes(search.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const clearLogs = () => {
    setLogs([]);
    localStorage.removeItem('client-logs');
    addLog('info', 'Log history cleared', null, 'system');
  };

  const exportLogs = () => {
    const logText = logs.map(log => 
      `[${new Date(log.timestamp).toISOString()}] [${log.level.toUpperCase()}] [${log.source}] ${log.message}${
        log.data ? '\n' + JSON.stringify(log.data, null, 2) : ''
      }`
    ).join('\n\n');

    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `client-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLogIcon = (level: ClientLog['level']) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'warn':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'info':
        return <Info className="h-4 w-4 text-primary" />;
      case 'debug':
        return <Bug className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getLogColor = (level: ClientLog['level']) => {
    switch (level) {
      case 'error':
        return 'text-destructive';
      case 'warn':
        return 'text-warning';
      case 'info':
        return 'text-primary';
      case 'debug':
        return 'text-muted-foreground';
      default:
        return 'text-foreground';
    }
  };

  // Expose addLog function globally for other components to use
  useEffect(() => {
    (window as any).clientLog = addLog;
    return () => {
      delete (window as any).clientLog;
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Client Logs</h3>
          <p className="text-sm text-muted-foreground">
            Monitor client-side events and errors ({logs.length} entries)
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={exportLogs} disabled={logs.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={clearLogs} disabled={logs.length === 0}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="error">Errors</SelectItem>
              <SelectItem value="warn">Warnings</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="debug">Debug</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="h-96 overflow-y-auto space-y-1 font-mono text-sm">
          {filteredLogs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Bug className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No logs match your filter criteria</p>
              </div>
            </div>
          ) : (
            filteredLogs.map(log => (
              <div key={log.id} className="p-2 rounded border-l-2 border-l-transparent hover:border-l-primary hover:bg-accent/50">
                <div className="flex items-start space-x-2">
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    {getLogIcon(log.level)}
                    <Badge variant="outline" className="text-xs">
                      {log.source}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(log.timestamp)}
                    </span>
                    <Badge 
                      variant={log.level === 'error' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {log.level.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                
                <div className={`mt-1 ${getLogColor(log.level)}`}>
                  {log.message}
                </div>
                
                {log.data && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                      Show details
                    </summary>
                    <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}