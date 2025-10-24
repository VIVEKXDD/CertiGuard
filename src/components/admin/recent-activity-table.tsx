import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const activities = [
  { id: 'V-1024', status: 'Valid', timestamp: '2 mins ago' },
  { id: 'V-1023', status: 'Invalid', timestamp: '5 mins ago' },
  { id: 'V-1022', status: 'Valid', timestamp: '1 hour ago' },
  { id: 'I-512', status: 'Issued', timestamp: '3 hours ago' },
  { id: 'V-1021', status: 'Valid', timestamp: '5 hours ago' },
];

export function RecentActivityTable() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {activities.map((activity) => (
          <TableRow key={activity.id}>
            <TableCell className="font-medium">{activity.id}</TableCell>
            <TableCell>
              <Badge
                variant={activity.status === 'Valid' ? 'default' : activity.status === 'Invalid' ? 'destructive' : 'secondary'}
                className={activity.status === 'Valid' ? 'bg-green-500' : ''}
              >
                {activity.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right">{activity.timestamp}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
