import { useState } from 'react';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppLogoProps {
  titleClassName?: string;
  iconWrapClassName?: string;
  className?: string;
}

export function AppLogo({ titleClassName, iconWrapClassName, className }: AppLogoProps) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className={cn('w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center', iconWrapClassName)}>
        {!imageFailed ? (
          <img
            src="/mechanical_symbol_logo_cropped.png"
            alt="MechCount logo"
            className="w-full h-full object-contain"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-primary flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
        )}
      </div>
      <h1 className={cn('font-bold text-gray-700', titleClassName)}>MechCount</h1>
    </div>
  );
}
