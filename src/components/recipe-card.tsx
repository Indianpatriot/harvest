
'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { Heart, ChevronDown } from 'lucide-react';
import { Badge } from './ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import type { SuggestRecipesOutput } from '@/ai/flows/suggest-recipes';

type Recipe = SuggestRecipesOutput[0];

interface RecipeCardProps {
  recipe: Recipe;
  isFavorite: boolean;
  onToggleFavorite: (recipe: Recipe) => void;
}

export function RecipeCard({ recipe, isFavorite, onToggleFavorite }: RecipeCardProps) {
  return (
    <div className="bg-card rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300 border border-border/60 overflow-hidden flex flex-col h-full">
      <div className="relative">
        <Image 
          src={`https://placehold.co/600x400.png`}
          alt={recipe.name}
          width={600}
          height={400}
          className="object-cover w-full h-48"
          data-ai-hint="gourmet food dish"
        />
        <Button 
          size="icon" 
          variant="ghost" 
          className="absolute top-2 right-2 bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(recipe);
          }}
        >
          <Heart className={`transition-all ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
          <span className="sr-only">Toggle Favorite</span>
        </Button>
      </div>

      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-xl font-bold font-headline mb-2 flex-grow">{recipe.name}</h3>
        
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="ingredients" className="border-b-0">
                <AccordionTrigger className="text-sm font-semibold hover:no-underline py-2">
                  <div className="flex items-center gap-2">
                    <span>View Ingredients & Instructions</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2">
                  <div className="space-y-4">
                    <div>
                        <h4 className="font-semibold text-sm mb-2">Ingredients:</h4>
                        <div className="flex flex-wrap gap-2">
                            {recipe.ingredients.map(ing => <Badge variant="secondary" key={ing}>{ing}</Badge>)}
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold text-sm mb-2">Instructions:</h4>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                            {recipe.instructions.map((step, i) => <li key={i}>{step}</li>)}
                        </ol>
                    </div>
                  </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
