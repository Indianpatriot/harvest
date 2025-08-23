
'use client';

import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { Heart, ImageOff, Clock, Leaf, Egg, Beef, Loader2, BookOpen, ChevronDown } from 'lucide-react';
import { Badge } from './ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import type { SuggestRecipesOutput } from '@/ai/flows/suggest-recipes';
import { useState, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { getNutritionalAnalysis, GetNutritionalAnalysisOutput } from '@/ai/flows/get-nutritional-analysis';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

type Recipe = SuggestRecipesOutput[0];

interface RecipeCardProps {
  recipe: Recipe;
  isFavorite: boolean;
  onToggleFavorite: (recipe: Recipe) => void;
}

const DietIndicator = ({ category }: { category: Recipe['dietaryCategory']}) => {
    const commonClass = "w-4 h-4 mr-1.5";
    switch (category) {
        case 'Vegetarian':
            return <Leaf className={cn("text-green-600", commonClass)} />;
        case 'Eggetarian':
            return <Egg className={cn("text-amber-600", commonClass)} />;
        case 'Non-Vegetarian':
            return <Beef className={cn("text-red-600", commonClass)} />;
        default:
            return null;
    }
};

export function RecipeCard({ recipe, isFavorite, onToggleFavorite }: RecipeCardProps) {
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);
  const [isAnalyzing, startAnalyzing] = useTransition();
  const [analysis, setAnalysis] = useState<GetNutritionalAnalysisOutput | null>(null);
  const { toast } = useToast();

  const handleGetAnalysis = async () => {
    if (analysis) {
        setAnalysis(null);
        return;
    }
    startAnalyzing(async () => {
        try {
            const result = await getNutritionalAnalysis({
                recipeName: recipe.name,
                ingredients: recipe.ingredients,
            });
            setAnalysis(result);
        } catch (error) {
            console.error("Error getting nutritional analysis:", error);
            toast({
                variant: 'destructive',
                title: 'Analysis Failed',
                description: 'Could not fetch nutritional analysis at this time.',
            });
        }
    });
  }


  return (
    <div className="bg-card rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300 border border-border/60 overflow-hidden flex flex-col h-full group">
      <div className="relative h-48 overflow-hidden rounded-t-xl">
        {imgError ? (
            <div className="w-full h-full bg-secondary flex flex-col items-center justify-center text-muted-foreground">
                <ImageOff className="w-12 h-12" />
                <p className="mt-2 text-sm font-semibold">No Image Available</p>
            </div>
        ) : (
            <Image 
                src={recipe.imageUrl}
                alt={recipe.name}
                fill
                className={cn(
                    "object-cover w-full h-full transition-all duration-300 ease-in-out group-hover:scale-105",
                    imgLoading ? "opacity-0" : "opacity-100"
                )}
                onError={() => setImgError(true)}
                onLoad={() => setImgLoading(false)}
            />
        )}
        {imgLoading && !imgError && (
             <div className="absolute inset-0 bg-secondary animate-pulse"></div>
        )}
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
        <h3 className="text-xl font-bold font-headline mb-2">{recipe.name}</h3>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
            <div className="flex items-center">
                <Clock className="w-4 h-4 mr-1.5" />
                <span>{recipe.estimatedCookingTime}</span>
            </div>
             <div className="flex items-center">
                <DietIndicator category={recipe.dietaryCategory} />
                <span>{recipe.dietaryCategory}</span>
            </div>
        </div>

        <Accordion type="single" collapsible className="w-full flex-grow">
            <AccordionItem value="details" className="border-b-0">
                <AccordionTrigger className="text-sm font-semibold hover:no-underline py-2 [&[data-state=open]>svg]:rotate-180">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4"/>
                    <span>View Recipe Details</span>
                  </div>
                  <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
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
                    <div className="pt-2 border-t border-border">
                        <Button onClick={handleGetAnalysis} disabled={isAnalyzing} variant="link" className="p-0 h-auto text-primary">
                            {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            {isAnalyzing ? "Analyzing..." : (analysis ? "Hide Nutritional Analysis" : "View Nutritional Analysis")}
                        </Button>
                    </div>
                    <AnimatePresence>
                    {analysis && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                          <Card className="mt-2 border-accent/50 bg-secondary/30">
                            <CardHeader className="p-4">
                              <CardTitle className="text-md font-headline">Nutritional Analysis</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                              <ul className="space-y-1 text-sm">
                                  <li className="flex justify-between"><strong>Serving Size:</strong> <span>{analysis.servingSize}</span></li>
                                  <li className="flex justify-between"><strong>Calories:</strong> <span>{analysis.calories}</span></li>
                                  <li className="flex justify-between"><strong>Protein:</strong> <span>{analysis.protein}</span></li>
                                  <li className="flex justify-between"><strong>Fat:</strong> <span>{analysis.fat}</span></li>
                                  <li className="flex justify-between"><strong>Carbs:</strong> <span>{analysis.carbohydrates}</span></li>
                                  <li className="flex justify-between"><strong>Fiber:</strong> <span>{analysis.fiber}</span></li>
                                  <li className="flex justify-between"><strong>Sugar:</strong> <span>{analysis.sugar}</span></li>
                              </ul>
                              <p className="text-xs text-muted-foreground mt-3 italic">{analysis.disclaimer}</p>
                            </CardContent>
                          </Card>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>

      </div>
    </div>
  );
}
