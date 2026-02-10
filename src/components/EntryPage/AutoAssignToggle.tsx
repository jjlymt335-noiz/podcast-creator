import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

interface AutoAssignToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export function AutoAssignToggle({ enabled, onToggle }: AutoAssignToggleProps) {
  return (
    <Card className="rounded-xl bg-gradient-to-r from-orange-50/80 to-amber-50/60 border-orange-200/60 shadow-sm">
      <CardContent className="flex items-center justify-between p-5">
        <div className="flex items-center gap-3.5">
          <div className="rounded-xl bg-orange-100/80 p-2.5">
            <Sparkles className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-semibold text-gray-900">Auto-assign voices</h4>
              <span className="text-[11px] font-semibold bg-orange-200/60 text-orange-700 px-2 py-0.5 rounded-full uppercase tracking-wide">
                Alpha
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Automatically identify speakers and match voices using AI
            </p>
          </div>
        </div>

        <Switch checked={enabled} onCheckedChange={onToggle} />
      </CardContent>
    </Card>
  );
}
