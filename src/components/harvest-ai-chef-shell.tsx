
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChefHat, Upload, Sparkles, Utensils } from 'lucide-react';
import { EnhancedHarvestAiChef } from './enhanced-harvest-ai-chef';
import { ThemeToggle } from './theme-toggle';
import { cn } from '@/lib/utils';


export function HarvestAiChefShell() {
  const [activeTab, setActiveTab] = useState('upload');
  
  const renderNavButton = (tabName: string, icon: React.ReactNode, label: string) => (
    <div className="relative">
      <Button
        variant="ghost"
        className={cn(
          "flex-1 justify-center gap-2 rounded-full px-6 py-2 transition-all duration-300",
          {
            "text-accent-foreground bg-accent/20": activeTab === tabName,
            "text-muted-foreground hover:text-foreground": activeTab !== tabName,
          }
        )}
        onClick={() => setActiveTab(tabName)}
        // Simple logic for now, client component will handle complex disabling
        disabled={tabName !== 'upload' && activeTab === 'upload'} 
      >
        {icon} {label}
      </Button>
      {activeTab === tabName && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground font-body flex flex-col">
      <header className="py-6 px-4 text-center border-b border-border/60 bg-background/80 backdrop-blur-sm z-20">
        <div className="container mx-auto flex items-center justify-between">
            <div className="flex-1"></div>
            <div className="flex-1 flex flex-col items-center">
                <h1 className="text-3xl md:text-4xl font-bold font-headline text-primary flex items-center justify-center gap-3">
                    <ChefHat size={36} className="text-accent"/>
                    Harvest AI Chef
                </h1>
                <p className="mt-1 text-md text-muted-foreground">Your smart kitchen assistant for instant recipe ideas!</p>
            </div>
            <div className="flex-1 flex justify-end">
                <ThemeToggle />
            </div>
        </div>
      </header>
      
      <div className="border-b border-border/60 shadow-sm bg-background/80 backdrop-blur-sm z-20">
        <nav className="container mx-auto px-4 flex justify-center items-center gap-4 py-2">
            {renderNavButton('upload', <Upload size={18}/>, 'Upload')}
            {renderNavButton('ingredients', <Sparkles size={18}/>, 'Ingredients')}
            {renderNavButton('recipes', <Utensils size={18}/>, 'Recipes')}
        </nav>
      </div>

      <EnhancedHarvestAiChef activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
