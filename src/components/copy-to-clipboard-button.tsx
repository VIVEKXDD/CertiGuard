'use client';

import * as React from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CopyToClipboardButtonProps extends ButtonProps {
  textToCopy: string;
  successMessage?: string;
}

export function CopyToClipboardButton({
  textToCopy,
  successMessage = 'Copied to clipboard!',
  className,
  ...props
}: CopyToClipboardButtonProps) {
  const [hasCopied, setHasCopied] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    if (hasCopied) {
      timeoutId = setTimeout(() => {
        setHasCopied(false);
      }, 2000);
    }
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [hasCopied]);

  const handleCopy = async () => {
    // Check if the Clipboard API is available
    if (typeof window === 'undefined' || !navigator.clipboard) {
      console.error('Clipboard API is not available in this environment.');
      toast({
        title: 'Error',
        description: 'Could not copy text. Clipboard API not supported.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      setHasCopied(true);
      toast({
        title: 'Success',
        description: successMessage,
      });
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast({
        title: 'Error',
        description: 'Failed to copy text to clipboard.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Button
      variant="outline"
      size="icon"
      className={cn('relative', className)}
      onClick={handleCopy}
      {...props}
    >
      <span className="sr-only">Copy</span>
      {hasCopied ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );
}
