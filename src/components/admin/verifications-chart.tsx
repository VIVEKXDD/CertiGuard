'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { Card } from '../ui/card';

const data = [
  { name: 'Mon', valid: 50, invalid: 5 },
  { name: 'Tue', valid: 75, invalid: 8 },
  { name: 'Wed', valid: 60, invalid: 12 },
  { name: 'Thu', valid: 90, invalid: 7 },
  { name: 'Fri', valid: 110, invalid: 15 },
  { name: 'Sat', valid: 40, invalid: 3 },
  { name: 'Sun', valid: 35, invalid: 2 },
];

export function VerificationsChart() {
  return (
    <div className="h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 'var(--radius)',
            }}
          />
          <Legend wrapperStyle={{fontSize: "14px"}}/>
          <Bar dataKey="valid" fill="hsl(var(--primary))" name="Valid" radius={[4, 4, 0, 0]} />
          <Bar dataKey="invalid" fill="hsl(var(--destructive))" name="Invalid" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
