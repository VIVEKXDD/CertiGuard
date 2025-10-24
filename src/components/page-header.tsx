import React from 'react';

interface PageHeaderProps {
  title: string;
  description: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="font-headline text-3xl font-bold tracking-tight text-primary">{title}</h1>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
