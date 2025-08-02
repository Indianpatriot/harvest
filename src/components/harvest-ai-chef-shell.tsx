
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChefHat, Upload, Sparkles, Utensils } from 'lucide-react';
import { HarvestAiChef } from './harvest-ai-chef';


export function HarvestAiChefShell() {
  const [activeTab, setActiveTab] = useState('upload');
  
  const renderNavButton = (tabName: string, icon: React.ReactNode, label: string) => (
    <Button
      variant={activeTab === tabName ? "default" : "ghost"}
      className="flex-1 justify-center gap-2"
      onClick={() => setActiveTab(tabName)}
      // Simple logic for now, client component will handle complex disabling
      disabled={tabName !== 'upload' && activeTab === 'upload'} 
    >
      {icon} {label}
    </Button>
  );

  return (
    <div className="min-h-screen bg-background text-foreground font-body flex flex-col">
      <header className="py-6 px-4 text-center border-b border-border/60 sticky top-0 bg-background/80 backdrop-blur-sm z-20">
        <h1 className="text-3xl md:text-4xl font-bold font-headline text-primary flex items-center justify-center gap-3">
            <ChefHat size={36} />
            Harvest AI Chef
        </h1>
        <p className="mt-1 text-md text-muted-foreground">Your smart kitchen assistant for instant recipe ideas!</p>
      </header>
      
      <div className="border-b border-border/60 shadow-sm sticky top-[105px] md:top-[113px] bg-background/80 backdrop-blur-sm z-20">
        <nav className="container mx-auto px-4 flex justify-center items-center gap-2 py-2">
            {renderNavButton('upload', <Upload size={18}/>, 'Upload')}
            {renderNavButton('ingredients', <Sparkles size={18}/>, 'Ingredients')}
            {renderNavButton('recipes', <Utensils size={18}/>, 'Recipes')}
        </nav>
      </div>

      <HarvestAiChef activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
