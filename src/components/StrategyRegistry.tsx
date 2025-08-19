import { useState, useEffect } from 'react';
import { DataTable } from '@/components/DataTable';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { useToast } from '@/hooks/use-toast';
import { StrategyPreset } from '@/lib/types';
import { Plus, Settings, Trash2, Copy } from 'lucide-react';

const defaultPresets: StrategyPreset[] = [
  {
    id: 'triangular-conservative',
    name: 'Triangular Conservative',
    description: 'Low-risk triangular arbitrage with strict parameters',
    enabled: true,
    priority: 1,
    tags: ['triangular', 'conservative', 'multi-hop'],
    parameters: {
      EDGE_DECAY_BPS_PER_SEC: 5,
      BASE_FILL_PROB: 0.85,
      FILL_THETA: 2.0,
      SLIP_ALPHA: 1.2,
      SLIP_K: 0.08,
      FLASH_FEE_BPS: 5,
      REFERRAL_BPS: 2,
      FLASH_FIXED_USD: 1,
      EXECUTOR_FEE_USD: 5,
      RISK_AVERSION_LAMBDA: 0.2,
      GAS_USD_MEAN: 15,
      GAS_USD_STD: 5,
      ADVERSE_USD_MEAN: 20,
      ADVERSE_USD_STD: 10,
      MEV_PENALTY_USD: 50,
      MAX_NOTIONAL_USD: 10000
    },
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000
  },
  {
    id: 'cross-venue-moderate',
    name: 'Cross-Venue Moderate',
    description: 'Balanced cross-venue arbitrage strategy',
    enabled: true,
    priority: 2,
    tags: ['cross-venue', 'moderate', 'cex-dex'],
    parameters: {
      EDGE_DECAY_BPS_PER_SEC: 8,
      BASE_FILL_PROB: 0.75,
      FILL_THETA: 1.8,
      SLIP_ALPHA: 1.5,
      SLIP_K: 0.12,
      FLASH_FEE_BPS: 8,
      REFERRAL_BPS: 3,
      FLASH_FIXED_USD: 2,
      EXECUTOR_FEE_USD: 8,
      RISK_AVERSION_LAMBDA: 0.15,
      GAS_USD_MEAN: 20,
      GAS_USD_STD: 8,
      ADVERSE_USD_MEAN: 30,
      ADVERSE_USD_STD: 15,
      MEV_PENALTY_USD: 75,
      MAX_NOTIONAL_USD: 25000
    },
    createdAt: Date.now() - 172800000,
    updatedAt: Date.now() - 3600000
  },
  {
    id: 'direct-aggressive',
    name: 'Direct Aggressive',
    description: 'High-yield direct arbitrage with increased risk tolerance',
    enabled: false,
    priority: 3,
    tags: ['direct', 'aggressive', 'high-yield'],
    parameters: {
      EDGE_DECAY_BPS_PER_SEC: 12,
      BASE_FILL_PROB: 0.65,
      FILL_THETA: 1.5,
      SLIP_ALPHA: 2.0,
      SLIP_K: 0.18,
      FLASH_FEE_BPS: 10,
      REFERRAL_BPS: 5,
      FLASH_FIXED_USD: 5,
      EXECUTOR_FEE_USD: 12,
      RISK_AVERSION_LAMBDA: 0.08,
      GAS_USD_MEAN: 35,
      GAS_USD_STD: 15,
      ADVERSE_USD_MEAN: 50,
      ADVERSE_USD_STD: 25,
      MEV_PENALTY_USD: 100,
      MAX_NOTIONAL_USD: 50000
    },
    createdAt: Date.now() - 259200000,
    updatedAt: Date.now() - 7200000
  },
  {
    id: 'multivenue-crossdex',
    name: 'Multi-Venue Cross-DEX',
    description: 'Compare mid prices across PRJX, HyperSwap, etc., trigger on spread > threshold with costs',
    enabled: true,
    priority: 4,
    tags: ['arbitrage', 'cross-dex', 'multivenue'],
    parameters: {
      EDGE_DECAY_BPS_PER_SEC: 6,
      BASE_FILL_PROB: 0.8,
      FILL_THETA: 1.6,
      SLIP_ALPHA: 1.3,
      SLIP_K: 0.1,
      FLASH_FEE_BPS: 6,
      REFERRAL_BPS: 2,
      FLASH_FIXED_USD: 1.5,
      EXECUTOR_FEE_USD: 6,
      RISK_AVERSION_LAMBDA: 0.15,
      GAS_USD_MEAN: 18,
      GAS_USD_STD: 6,
      ADVERSE_USD_MEAN: 25,
      ADVERSE_USD_STD: 12,
      MEV_PENALTY_USD: 60,
      MAX_NOTIONAL_USD: 20000
    },
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now() - 3600000
  },
  {
    id: 'crosschain-ob',
    name: 'Cross-Chain + OB',
    description: 'Cross-EVM leg with order-book vs implied DEX price; includes bridge/gas costs',
    enabled: false,
    priority: 5,
    tags: ['arbitrage', 'cross-chain', 'orderbook'],
    parameters: {
      EDGE_DECAY_BPS_PER_SEC: 7,
      BASE_FILL_PROB: 0.7,
      FILL_THETA: 1.9,
      SLIP_ALPHA: 1.6,
      SLIP_K: 0.14,
      FLASH_FEE_BPS: 9,
      REFERRAL_BPS: 3,
      FLASH_FIXED_USD: 3,
      EXECUTOR_FEE_USD: 10,
      RISK_AVERSION_LAMBDA: 0.12,
      GAS_USD_MEAN: 28,
      GAS_USD_STD: 10,
      ADVERSE_USD_MEAN: 45,
      ADVERSE_USD_STD: 20,
      MEV_PENALTY_USD: 90,
      MAX_NOTIONAL_USD: 30000
    },
    createdAt: Date.now() - 1800000,
    updatedAt: Date.now() - 1800000
  }
];

export function StrategyRegistry() {
  const [strategies, setStrategies] = useState<StrategyPreset[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyPreset | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<StrategyPreset | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const saved = localStorage.getItem('strategy-presets');
    if (saved) {
      try {
        setStrategies(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load strategies:', error);
        setStrategies(defaultPresets);
      }
    } else {
      setStrategies(defaultPresets);
    }
  }, []);

  const saveStrategies = (newStrategies: StrategyPreset[]) => {
    setStrategies(newStrategies);
    localStorage.setItem('strategy-presets', JSON.stringify(newStrategies));
  };

  const toggleStrategy = (id: string) => {
    const updated = strategies.map(s => 
      s.id === id ? { ...s, enabled: !s.enabled, updatedAt: Date.now() } : s
    );
    saveStrategies(updated);
    toast({
      title: "Strategy updated",
      description: `Strategy ${strategies.find(s => s.id === id)?.name} ${
        !strategies.find(s => s.id === id)?.enabled ? 'enabled' : 'disabled'
      }`,
    });
  };

  const deleteStrategy = (id: string) => {
    const updated = strategies.filter(s => s.id !== id);
    saveStrategies(updated);
    toast({
      title: "Strategy deleted",
      description: "Strategy has been removed from registry",
    });
  };

  const duplicateStrategy = (strategy: StrategyPreset) => {
    const newStrategy: StrategyPreset = {
      ...strategy,
      id: `${strategy.id}-copy-${Date.now()}`,
      name: `${strategy.name} (Copy)`,
      enabled: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    saveStrategies([...strategies, newStrategy]);
    toast({
      title: "Strategy duplicated",
      description: `Created copy of ${strategy.name}`,
    });
  };

  const openEditDialog = (strategy?: StrategyPreset) => {
    if (strategy) {
      setEditForm({ ...strategy });
    } else {
      // Create new strategy
      setEditForm({
        id: `new-${Date.now()}`,
        name: 'New Strategy',
        description: '',
        enabled: false,
        priority: strategies.length + 1,
        tags: [],
        parameters: defaultPresets[0].parameters,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }
    setIsEditing(true);
  };

  const saveStrategy = () => {
    if (!editForm) return;

    const isNew = !strategies.find(s => s.id === editForm.id);
    let updated: StrategyPreset[];

    if (isNew) {
      updated = [...strategies, { ...editForm, createdAt: Date.now(), updatedAt: Date.now() }];
    } else {
      updated = strategies.map(s => 
        s.id === editForm.id ? { ...editForm, updatedAt: Date.now() } : s
      );
    }

    saveStrategies(updated);
    setIsEditing(false);
    setEditForm(null);
    
    toast({
      title: isNew ? "Strategy created" : "Strategy updated",
      description: `${editForm.name} has been saved`,
    });
  };

  const columns = [
    {
      key: 'name',
      title: 'Name',
      render: (value: string, strategy: StrategyPreset) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-xs text-muted-foreground">{strategy.description}</div>
        </div>
      ),
    },
    {
      key: 'enabled',
      title: 'Status',
      render: (value: boolean, strategy: StrategyPreset) => (
        <div className="flex items-center space-x-2">
          <Switch
            checked={value}
            onCheckedChange={() => toggleStrategy(strategy.id)}
          />
          <Badge variant={value ? 'default' : 'secondary'}>
            {value ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      ),
    },
    {
      key: 'tags',
      title: 'Tags',
      render: (value: string[]) => (
        <div className="flex flex-wrap gap-1">
          {value.map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'priority',
      title: 'Priority',
      render: (value: number) => (
        <Badge variant="secondary">{value}</Badge>
      ),
    },
    {
      key: 'parameters.MAX_NOTIONAL_USD',
      title: 'Max Size',
      render: (value: number) => (
        <span className="font-mono">${value.toLocaleString()}</span>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, strategy: StrategyPreset) => (
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              openEditDialog(strategy);
            }}
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              duplicateStrategy(strategy);
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              deleteStrategy(strategy.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Strategy Registry</h3>
          <p className="text-sm text-muted-foreground">
            Manage strategy presets and parameters (client-side only)
          </p>
        </div>
        <Button onClick={() => openEditDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          New Strategy
        </Button>
      </div>

      <DataTable
        data={strategies}
        columns={columns}
        onRowClick={setSelectedStrategy}
        rowKey={(s) => s.id}
      />

      {/* Edit Strategy Drawer */}
      <Drawer open={isEditing} onOpenChange={setIsEditing}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>
              {editForm && strategies.find(s => s.id === editForm.id) 
                ? 'Edit Strategy' 
                : 'New Strategy'
              }
            </DrawerTitle>
          </DrawerHeader>
          
          {editForm && (
            <div className="p-6 overflow-y-auto">
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h4 className="font-medium">Basic Information</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={editForm.name}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          name: e.target.value
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Input
                        id="priority"
                        type="number"
                        value={editForm.priority}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          priority: Number(e.target.value)
                        })}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={editForm.description}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        description: e.target.value
                      })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input
                      id="tags"
                      value={editForm.tags.join(', ')}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                      })}
                    />
                  </div>
                </div>

                {/* Parameters */}
                <div className="space-y-4">
                  <h4 className="font-medium">Strategy Parameters</h4>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    {Object.entries(editForm.parameters).map(([key, value]) => (
                      <div key={key} className="space-y-2">
                        <Label htmlFor={key}>
                          {key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                        </Label>
                        <Input
                          id={key}
                          type="number"
                          step="0.01"
                          value={value}
                          onChange={(e) => setEditForm({
                            ...editForm,
                            parameters: {
                              ...editForm.parameters,
                              [key]: Number(e.target.value)
                            }
                          })}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button onClick={saveStrategy}>
                    Save Strategy
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}