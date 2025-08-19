import { Button } from '@/components/ui/button';
import { Paintbrush, Palette, Sparkles } from 'lucide-react';
import { useAppTheme } from '@/contexts/AppTheme';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function SkinToggle() {
  const { skin, setSkin, isDark } = useAppTheme();
  
  const toggleSkin = () => {
    setSkin(skin === 'classic' ? 'lovable' : 'classic');
  };
  
  const getSkinLabel = () => {
    return skin === 'classic' ? 'Switch to Lovable UI' : 'Switch to Classic UI';
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSkin}
            className="relative"
            aria-label={getSkinLabel()}
          >
            {skin === 'lovable' ? (
              <Sparkles className="h-5 w-5" />
            ) : (
              <Paintbrush className="h-5 w-5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getSkinLabel()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
