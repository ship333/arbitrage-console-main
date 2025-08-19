import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatTimeAgo } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { 
  FileText, 
  Search, 
  Filter, 
  Trash2, 
  Download,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle
} from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  details?: any;
  source: string;
}

const levelConfig = {
  info: {
    icon: Info,
    className: 'text-info bg-info/10 border-info/20',
  },
  warning: {
    icon: AlertTriangle,
    className: 'text-pending bg-pending/10 border-pending/20',
  },
  error: {
    icon: AlertCircle,
    className: 'text-failed bg-failed/10 border-failed/20',
  },
  success: {
    icon: CheckCircle,
    className: 'text-success bg-success/10 border-success/20',
  },
};

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  // Simulate some initial logs
  useEffect(() => {
    const initialLogs: LogEntry[] = [
      {
        id: '1',
        timestamp: Date.now() - 30000,
        level: 'info',
        message: 'Bot monitoring started',
        source: 'System',
      },
      {
        id: '2',
        timestamp: Date.now() - 25000,
        level: 'success',
        message: 'Connected to API endpoint',
        details: { endpoint: 'http://127.0.0.1:8083' },
        source: 'API',
      },
      {
        id: '3',
        timestamp: Date.now() - 20000,
        level: 'info',
        message: 'Fetched 23 recent opportunities',
        source: 'Data',
      },
      {
        id: '4',
        timestamp: Date.now() - 15000,
        level: 'warning',
        message: 'High API latency detected (>200ms)',
        details: { latency: 247 },
        source: 'Health',
      },
      {
        id: '5',
        timestamp: Date.now() - 10000,
        level: 'info',
        message: 'Active signals updated (5 signals)',
        source: 'Signals',
      },
    ];
    setLogs(initialLogs);

    // Add new logs periodically to simulate activity
    const interval = setInterval(() => {
      const newLog: LogEntry = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        level: Math.random() > 0.8 ? 'warning' : Math.random() > 0.9 ? 'error' : 'info',
        message: [
          'API health check completed',
          'Opportunities data refreshed',
          'Signal evaluation completed',
          'Cache invalidated',
          'Performance metrics updated',
        ][Math.floor(Math.random() * 5)],
        source: ['API', 'Data', 'Cache', 'Health', 'Signals'][Math.floor(Math.random() * 5)],
      };
      
      setLogs(prev => [newLog, ...prev].slice(0, 100)); // Keep last 100 logs
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const filteredLogs = logs
    .filter(log => filter === 'all' || log.level === filter)
    .filter(log => 
      search === '' || 
      log.message.toLowerCase().includes(search.toLowerCase()) ||
      log.source.toLowerCase().includes(search.toLowerCase())
    );

  const clearLogs = () => {
    setLogs([]);
  };

  const exportLogs = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `bot-logs-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Logs</h1>
          <p className="text-muted-foreground">Monitor system events and activities</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            Client-side only
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {filteredLogs.length} entries
          </Badge>
        </div>
      </div>

      {/* Controls */}
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-32">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="success">Success</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" onClick={exportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Button variant="outline" size="sm" onClick={clearLogs}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
      </Card>

      {/* Logs Display */}
      <Card className="overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No logs found</p>
              <p className="text-sm">Logs will appear here as events occur</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredLogs.map((log) => {
                const config = levelConfig[log.level];
                const IconComponent = config.icon;
                
                return (
                  <div key={log.id} className="p-4 hover:bg-accent/50 transition-colors">
                    <div className="flex items-start space-x-3">
                      <div className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full border text-xs',
                        config.className
                      )}>
                        <IconComponent className="h-3 w-3" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{log.message}</p>
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {log.source}
                            </Badge>
                            <span>{formatTimeAgo(log.timestamp)}</span>
                          </div>
                        </div>
                        
                        {log.details && (
                          <pre className="mt-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Footer */}
      <Card className="p-4">
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Client-side event logging only</p>
          <p>• Server-side logs integration coming soon</p>
          <p>• Maximum 100 recent entries displayed</p>
          <p>• Logs are cleared on page refresh</p>
        </div>
      </Card>
    </div>
  );
}