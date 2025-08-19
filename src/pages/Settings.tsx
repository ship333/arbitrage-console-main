import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Settings as SettingsIcon, Save, RotateCcw } from 'lucide-react';

interface SettingsState {
  apiBaseUrl: string;
  pollInterval: number;
  theme: 'dark' | 'light' | 'system';
  profitThreshold: number;
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
  maxNotional: number;
  gasCap: number;
  enableNotifications: boolean;
  enableAutoRefresh: boolean;
}

const defaultSettings: SettingsState = {
  apiBaseUrl: 'http://127.0.0.1:8083',
  pollInterval: 3000,
  theme: 'dark',
  profitThreshold: 10,
  riskLevel: 'conservative',
  maxNotional: 10000,
  gasCap: 50,
  enableNotifications: true,
  enableAutoRefresh: true,
};

export default function Settings() {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load settings from localStorage
    const saved = localStorage.getItem('bot-settings');
    if (saved) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(saved) });
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }
  }, []);

  const updateSetting = <K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const saveSettings = () => {
    localStorage.setItem('bot-settings', JSON.stringify(settings));
    setHasChanges(false);
    toast({
      title: "Settings saved",
      description: "Your configuration has been saved locally.",
    });
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    setHasChanges(true);
    toast({
      title: "Settings reset",
      description: "Configuration has been reset to defaults.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Configure bot behavior and preferences</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            Local Storage Only
          </Badge>
          {hasChanges && (
            <Badge variant="secondary" className="text-xs">
              Unsaved Changes
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* API Configuration */}
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <SettingsIcon className="h-5 w-5" />
            <h2 className="text-xl font-semibold">API Configuration</h2>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiUrl">API Base URL</Label>
              <Input
                id="apiUrl"
                value={settings.apiBaseUrl}
                onChange={(e) => updateSetting('apiBaseUrl', e.target.value)}
                placeholder="http://127.0.0.1:8083"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pollInterval">
                Polling Interval: {settings.pollInterval}ms
              </Label>
              <Slider
                id="pollInterval"
                min={1000}
                max={10000}
                step={500}
                value={[settings.pollInterval]}
                onValueChange={([value]) => updateSetting('pollInterval', value)}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1s</span>
                <span>10s</span>
              </div>
            </div>
          </div>
        </Card>

        {/* UI Preferences */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">UI Preferences</h2>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Select
                value={settings.theme}
                onValueChange={(value: 'dark' | 'light' | 'system') => 
                  updateSetting('theme', value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="notifications">Enable Notifications</Label>
              <Switch
                id="notifications"
                checked={settings.enableNotifications}
                onCheckedChange={(checked) => updateSetting('enableNotifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="autoRefresh">Auto Refresh Data</Label>
              <Switch
                id="autoRefresh"
                checked={settings.enableAutoRefresh}
                onCheckedChange={(checked) => updateSetting('enableAutoRefresh', checked)}
              />
            </div>
          </div>
        </Card>

        {/* Trading Configuration */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Trading Configuration</h2>
          <Badge variant="outline" className="mb-4 text-xs">
            UI Only - Backend Integration Pending
          </Badge>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profitThreshold">
                Profit Threshold: ${settings.profitThreshold}
              </Label>
              <Slider
                id="profitThreshold"
                min={1}
                max={100}
                step={1}
                value={[settings.profitThreshold]}
                onValueChange={([value]) => updateSetting('profitThreshold', value)}
                className="py-4"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="riskLevel">Risk Level</Label>
              <Select
                value={settings.riskLevel}
                onValueChange={(value: 'conservative' | 'moderate' | 'aggressive') => 
                  updateSetting('riskLevel', value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">Conservative</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="aggressive">Aggressive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxNotional">Max Notional ($)</Label>
              <Input
                id="maxNotional"
                type="number"
                value={settings.maxNotional}
                onChange={(e) => updateSetting('maxNotional', Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gasCap">Gas Cap (gwei)</Label>
              <Input
                id="gasCap"
                type="number"
                value={settings.gasCap}
                onChange={(e) => updateSetting('gasCap', Number(e.target.value))}
              />
            </div>
          </div>
        </Card>

        {/* Advanced Settings */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Advanced Settings</h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-md">
              <h3 className="font-medium mb-2">Feature Toggles</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• WebSocket support: Coming soon</p>
                <p>• Real-time logs: Coming soon</p>
                <p>• Bot control endpoints: Coming soon</p>
                <p>• Historical data export: Coming soon</p>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between pt-4">
              <Button variant="outline" onClick={resetSettings}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Defaults
              </Button>
              
              <Button onClick={saveSettings} disabled={!hasChanges}>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}