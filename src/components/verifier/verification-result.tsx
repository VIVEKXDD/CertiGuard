
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle, XCircle, AlertTriangle, Database, Fingerprint, Lock, School, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface VerificationResultData {
  status: 'Valid' | 'Partially Valid' | 'Invalid';
  reason: string;
  details: {
    dbCheck: string;
    signatureCheck: string;
    watermarkCheck: string;
    institutionCheck: string;
    courseCheck: string;
  };
}

const statusConfig = {
    'Valid': {
        icon: CheckCircle,
        color: 'green',
        title: 'Certificate is Valid',
    },
    'Partially Valid': {
        icon: AlertTriangle,
        color: 'yellow',
        title: 'Certificate is Partially Valid',
    },
    'Invalid': {
        icon: XCircle,
        color: 'red',
        title: 'Certificate is Invalid',
    }
}

export function VerificationResult({ status, reason, details }: VerificationResultData) {
  
  const config = statusConfig[status];

  const renderDetail = (text: string, Icon: React.ElementType) => {
    if (!text) return null;
    const isSuccess = text.startsWith('Passed');
    const isNotPerformed = text.startsWith('Not Performed');
    const isFailed = text.startsWith('Failed');

    const iconColor = isSuccess ? 'text-green-600'
                    : isFailed ? 'text-red-600'
                    : 'text-muted-foreground';

    return (
      <div className="flex items-start gap-3">
        <Icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", iconColor)} />
        <p className="text-sm">{text}</p>
      </div>
    );
  }

  return (
    <Card className={cn(
      "border-2 transition-all",
      `border-${config.color}-500 bg-${config.color}-50`
    )}>
      <CardHeader>
        <div className="flex items-center gap-4">
          <config.icon className={cn("h-10 w-10", `text-${config.color}-600`)} />
          <div>
            <CardTitle className={cn(
              "text-2xl font-bold font-headline",
              `text-${config.color}-700`
            )}>
              {config.title}
            </CardTitle>
            <CardDescription className={cn(
              "font-medium",
              `text-${config.color}-600`
            )}>
              {reason}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border-t pt-4">
          <h4 className="font-semibold mb-3">Verification Breakdown:</h4>
          <div className="space-y-2">
            {renderDetail(details.dbCheck, Database)}
            {renderDetail(details.signatureCheck, Fingerprint)}
            {renderDetail(details.watermarkCheck, Lock)}
            {renderDetail(details.institutionCheck, School)}
            {renderDetail(details.courseCheck, BookOpen)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
