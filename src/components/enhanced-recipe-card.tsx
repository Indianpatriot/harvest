'use client';

import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { Heart, ImageOff, Clock, Leaf, Egg, Beef, Loader2, BookOpen, ChevronDown, BarChart, Database, Sparkles, Star } from 'lucide-react';
import { Badge } from './ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { useState, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { getEnhancedNutritionalAnalysis, EnhancedNutritionalAnalysisOutput } from '@/ai/flows/enhanced-nutritional-analysis';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import type { EnhancedRecipe } from '@/ai/flows/enhanced-recipe-suggestions';

interface EnhancedRecipeCardProps {
  recipe: EnhancedRecipe;
  isFavorite: boolean;
  onToggleFavorite: (recipe: EnhancedRecipe) => void;
}

const DietIndicator = ({ category, withText = false }: { category: EnhancedRecipe['dietaryCategory'], withText?: boolean}) => {
    const commonClass = "w-4 h-4 mr-1.5";
    const dietInfo = {
        'Vegetarian': { icon: <Leaf className={cn("text-green-500", commonClass)} />, color: 'text-green-500 bg-green-500/10 border-green-500/20'},
        'Eggetarian': { icon: <Egg className={cn("text-amber-500", commonClass)} />, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20'},
        'Non-Vegetarian': { icon: <Beef className={cn("text-red-500", commonClass)} />, color: 'text-red-500 bg-red-500/10 border-red-500/20'},
    }
    const info = dietInfo[category];
    if (!info) return null;

    if (withText) {
        return (
            <Badge variant="outline" className={cn("capitalize", info.color)}>
                {info.icon}
                {category}
            </Badge>
        );
    }
    return info.icon;
};

export function EnhancedRecipeCard({ recipe, isFavorite, onToggleFavorite }: EnhancedRecipeCardProps) {
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);
  const [isAnalyzing, startAnalyzing] = useTransition();
  const [analysis, setAnalysis] = useState<EnhancedNutritionalAnalysisOutput | null>(null);
  const { toast } = useToast();

  const handleGetAnalysis = async () => {
    if (analysis) {
      setAnalysis(null);
      return;
    }
    
    startAnalyzing(async () => {
      try {
        const result = await getEnhancedNutritionalAnalysis({
          recipeName: recipe.name,
          ingredients: recipe.ingredients,
          servingSize: 1,
        });
        setAnalysis(result);
      } catch (error) {
        console.error("Error getting enhanced nutritional analysis:", error);
        toast({
          variant: 'destructive',
          title: 'Analysis Failed',
          description: 'Could not fetch nutritional analysis at this time.',
        });
      }
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-300';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300';
      case 'Hard': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSourceIcon = () => {
    return recipe.sourceInfo.fromOpenFoodFacts ? (
      <Database className="w-4 h-4 text-blue-600" />
    ) : (
      <Sparkles className="w-4 h-4 text-purple-600" />
    );
  };

  const parseValue = (value: string) => parseFloat(value.replace(/[^0-9.]/g, ''));
  const getProgress = (value: string, max: number) => (parseValue(value) / max) * 100;

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
              "object-cover transition-all duration-300 group-hover:scale-105",
              imgLoading && "opacity-0"
            )}
            onLoad={() => setImgLoading(false)}
            onError={() => {
              setImgError(true);
              setImgLoading(false);
            }}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        )}
        {imgLoading && (
          <div className="absolute inset-0 bg-secondary animate-pulse" />
        )}
        
        {/* Source indicator */}
        <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 text-xs font-medium">
          {getSourceIcon()}
          <span>{recipe.sourceInfo.fromOpenFoodFacts ? 'Open Food Facts' : 'AI Generated'}</span>
        </div>

        {/* Confidence indicator */}
        {recipe.sourceInfo.fromOpenFoodFacts && (
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-blue-100/90 backdrop-blur-sm rounded-full px-2 py-1 text-xs font-medium text-blue-800">
            <Star className="w-3 h-3" />
            <span>{Math.round(recipe.sourceInfo.confidence * 100)}%</span>
          </div>
        )}

        {/* Favorite button */}
        <Button 
          size="icon" 
          variant="ghost" 
          className="absolute bottom-3 right-3 bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(recipe);
          }}
        >
          <Heart className={`transition-all ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
          <span className="sr-only">Toggle Favorite</span>
        </Button>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-bold font-headline text-foreground group-hover:text-primary transition-colors line-clamp-2 flex-1 mr-2">
            {recipe.name}
          </h3>
        </div>

        {/* Enhanced badges */}
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge variant="secondary" className="text-xs">
            <Clock className="w-3 h-3 mr-1" />
            {recipe.estimatedCookingTime}
          </Badge>
          <Badge className={cn("text-xs border", getDifficultyColor(recipe.difficulty))}>
            {recipe.difficulty}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {recipe.cuisine}
          </Badge>
          <DietIndicator category={recipe.dietaryCategory} withText />
        </div>

        {/* Nutritional highlights */}
        {recipe.nutritionalHighlights && recipe.nutritionalHighlights.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-muted-foreground mb-1">Nutritional Highlights:</p>
            <div className="flex flex-wrap gap-1">
              {recipe.nutritionalHighlights.slice(0, 3).map((highlight, index) => (
                <Badge key={index} variant="outline" className="text-xs bg-green-50 text-green-700">
                  {highlight}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Accordion type="single" collapsible className="flex-1">
          <AccordionItem value="details" className="border-0">
            <AccordionTrigger className="py-2 text-sm font-medium hover:no-underline">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Recipe Details
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-2">
              <div className="space-y-3 text-sm">
                <div>
                  <h4 className="font-medium mb-1 flex items-center gap-2">
                    Ingredients ({recipe.ingredients.length})
                    {recipe.sourceInfo.fromOpenFoodFacts && (
                      <Badge variant="outline" className="text-xs">
                        {recipe.sourceInfo.matchingIngredients} verified
                      </Badge>
                    )}
                  </h4>
                  <ul className="text-muted-foreground text-xs space-y-1 max-h-20 overflow-y-auto">
                    {recipe.ingredients.map((ingredient, index) => (
                      <li key={index} className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-accent rounded-full shrink-0"></span>
                        {ingredient}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-1">Instructions</h4>
                  <div className="text-muted-foreground text-xs space-y-2 max-h-32 overflow-y-auto">
                    {recipe.instructions.map((instruction, index) => (
                      <div key={index} className="flex gap-2">
                        <span className="text-accent font-medium shrink-0">{index + 1}.</span>
                        <span>{instruction}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="mt-auto pt-3 border-t border-border/60">
          <Button 
            onClick={handleGetAnalysis} 
            disabled={isAnalyzing} 
            variant="link" 
            className="p-0 h-auto text-primary w-full justify-start"
          >
            {isAnalyzing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
            ) : (
              <BarChart className="mr-2 h-4 w-4"/>
            )}
            {isAnalyzing ? "Analyzing..." : (analysis ? "Hide Analysis" : "Enhanced Nutritional Analysis")}
          </Button>
          
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
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm font-headline flex items-center gap-2">
                      Enhanced Nutritional Analysis
                      {analysis.dataSource.includes('Open Food Facts') && (
                        <Badge variant="outline" className="text-xs">
                          <Database className="w-3 h-3 mr-1" />
                          Real Data
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">Per {analysis.servingSize}</p>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="space-y-2 text-sm">
                      <div className="space-y-1">
                        <div className="flex justify-between font-medium">
                          <span>Calories</span> 
                          <span>{analysis.calories}</span>
                        </div>
                        <Progress value={getProgress(analysis.calories, 2000)} className="h-1.5"/>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between font-medium">
                          <span>Protein</span> 
                          <span>{analysis.protein}</span>
                        </div>
                        <Progress value={getProgress(analysis.protein, 50)} className="h-1.5"/>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between font-medium">
                          <span>Carbs</span> 
                          <span>{analysis.carbohydrates}</span>
                        </div>
                        <Progress value={getProgress(analysis.carbohydrates, 300)} className="h-1.5"/>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between font-medium">
                          <span>Fat</span> 
                          <span>{analysis.fat}</span>
                        </div>
                        <Progress value={getProgress(analysis.fat, 70)} className="h-1.5"/>
                      </div>
                    </div>
                    
                    <div className="mt-3 text-xs text-muted-foreground">
                      <p className="font-medium mb-1">Data Source:</p>
                      <p>{analysis.dataSource}</p>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                      {analysis.disclaimer}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}