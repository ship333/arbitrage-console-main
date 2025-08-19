import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

type TabValue = 'dashboard' | 'paper-trading' | 'calibration' | string;

export function useActiveTab(defaultTab: TabValue = 'dashboard') {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabValue>(defaultTab);

  // Update active tab based on URL
  useEffect(() => {
    const path = location.pathname.replace(/^\//, '');
    if (path) {
      setActiveTab(path);
    } else {
      setActiveTab(defaultTab);
      navigate(`/${defaultTab}`, { replace: true });
    }
  }, [location.pathname, defaultTab, navigate]);

  // Handle tab change
  const onTabChange = (value: string) => {
    setActiveTab(value);
    navigate(`/${value}`);
  };

  return { activeTab, onTabChange };
}
