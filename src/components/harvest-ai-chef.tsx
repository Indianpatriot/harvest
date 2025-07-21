'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { identifyIngredients } from '@/ai/flows/identify-ingredients';
import { suggestRecipes, SuggestRecipesOutput } from '@/ai/flows/suggest-recipes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Upload, Trash2, PlusCircle, ChefHat, Heart, Loader2 } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

type Recipe = SuggestRecipesOutput[0];

export function HarvestAiChef() {
  const { toast } = useToast();
  const [isIdentifying, startIdentifying] = useTransition();
  const [isSuggesting, startSuggesting] = useTransition();

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [newIngredient, setNewIngredient] = useState('');
  const [suggestedRecipesList, setSuggestedRecipesList] = useState<Recipe[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        setUploadedImage(dataUri);
        startIdentifying(async () => {
          try {
            const result = await identifyIngredients({ photoDataUri: dataUri });
            setIngredients(result.ingredients);
            setSuggestedRecipesList([]); // Clear previous suggestions
          } catch (error) {
            console.error('Error identifying ingredients:', error);
            toast({
              variant: 'destructive',
              title: 'Error',
              description: 'Could not identify ingredients from the image. Please try another one.',
            });
          }
        });
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleAddIngredient = () => {
    if (newIngredient && !ingredients.includes(newIngredient.trim())) {
      setIngredients([...ingredients, newIngredient.trim()]);
      setNewIngredient('');
    }
  };

  const handleRemoveIngredient = (ingredientToRemove: string) => {
    setIngredients(ingredients.filter(i => i !== ingredientToRemove));
  };

  const handleGetRecipes = () => {
    if (ingredients.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Ingredients',
        description: 'Please add some ingredients first.',
      });
      return;
    }
    startSuggesting(async () => {
      try {
        const result = await suggestRecipes({ ingredients });
        setSuggestedRecipesList(result);
      } catch (error) {
        console.error('Error suggesting recipes:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not fetch recipe suggestions. Please try again.',
        });
      }
    });
  };

  const toggleFavorite = (recipe: Recipe) => {
    if (savedRecipes.some(r => r.name === recipe.name)) {
      setSavedRecipes(savedRecipes.filter(r => r.name !== recipe.name));
    } else {
      setSavedRecipes([...savedRecipes, recipe]);
    }
  };

  const isFavorite = (recipe: Recipe) => savedRecipes.some(r => r.name === recipe.name);
  
  const renderRecipeContent = (recipe: Recipe) => (
    <>
      <div className="flex items-center justify-between w-full">
        <p className="font-semibold text-lg">{recipe.name}</p>
        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); toggleFavorite(recipe); }}>
          <Heart className={isFavorite(recipe) ? 'fill-destructive text-destructive' : ''} />
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="py-8 px-4 md:px-8 text-center">
        <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary flex items-center justify-center gap-3">
            <ChefHat size={48} />
            Harvest AI Chef
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">Upload a photo of your ingredients and get instant recipe ideas!</p>
      </header>

      <main className="container mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="flex flex-col gap-8">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl font-headline">
                  <Upload />1. Upload Your Ingredients
                </CardTitle>
                <CardDescription>Take a picture of what you have in your fridge or pantry.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center gap-4">
                  <div className="w-full h-64 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-secondary/50 relative" data-ai-hint="food ingredients">
                    {isIdentifying && (
                      <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                      </div>
                    )}
                    {uploadedImage ? (
                      <Image src={uploadedImage} alt="Uploaded ingredients" fill className="object-contain rounded-lg p-1" />
                    ) : (
                      <p className="text-muted-foreground">Image preview will appear here</p>
                    )}
                  </div>
                  <label htmlFor="file-upload" className="w-full cursor-pointer">
                    <Button asChild className="w-full" variant="outline">
                      <span>Choose a Photo</span>
                    </Button>
                    <Input id="file-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isIdentifying} />
                  </label>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl font-headline">
                        <span className="font-bold">2.</span> Your Ingredients
                    </CardTitle>
                    <CardDescription>Review and edit the ingredients identified from your photo.</CardDescription>
                </CardHeader>
                <CardContent>
                    {ingredients.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {ingredients.map(ingredient => (
                                <Badge key={ingredient} variant="secondary" className="text-base py-1 px-3">
                                    {ingredient}
                                    <button onClick={() => handleRemoveIngredient(ingredient)} className="ml-2 p-0.5 rounded-full hover:bg-destructive/20">
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground">No ingredients identified yet.</p>
                    )}
                    <div className="mt-4 flex gap-2">
                        <Input 
                            value={newIngredient}
                            onChange={(e) => setNewIngredient(e.target.value)}
                            placeholder="Add an ingredient manually"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddIngredient()}
                        />
                        <Button onClick={handleAddIngredient} size="icon" variant="outline">
                            <PlusCircle className="h-5 w-5" />
                        </Button>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleGetRecipes} className="w-full bg-accent text-accent-foreground hover:bg-accent/90 text-lg py-6" disabled={isSuggesting || ingredients.length === 0}>
                        {isSuggesting ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            "Get Recipe Suggestions"
                        )}
                    </Button>
                </CardFooter>
            </Card>
          </div>

          <div className="sticky top-8">
            <Tabs defaultValue="suggestions" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
                <TabsTrigger value="favorites">Favorites ({savedRecipes.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="suggestions">
                <Card className="shadow-lg min-h-[30rem]">
                  <CardHeader>
                    <CardTitle className="text-2xl font-headline">Recipe Ideas</CardTitle>
                    <CardDescription>Based on your ingredients, here are some tasty ideas.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isSuggesting ? (
                      <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                           <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                             <div className="space-y-2 flex-1">
                               <Skeleton className="h-5 w-3/4" />
                               <Skeleton className="h-4 w-1/2" />
                             </div>
                           </div>
                        ))}
                      </div>
                    ) : suggestedRecipesList.length > 0 ? (
                      <Accordion type="single" collapsible className="w-full">
                        {suggestedRecipesList.map(recipe => (
                          <AccordionItem value={recipe.name} key={recipe.name}>
                            <AccordionTrigger className="hover:no-underline">
                              {renderRecipeContent(recipe)}
                            </AccordionTrigger>
                            <AccordionContent className="p-4 pt-0">
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-semibold mb-2">Ingredients:</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {recipe.ingredients.map(ing => <Badge variant="secondary" key={ing}>{ing}</Badge>)}
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2">Instructions:</h4>
                                  <ol className="list-decimal list-inside space-y-2">
                                    {recipe.instructions.map((step, i) => <li key={`${recipe.name}-step-${i}`}>{step}</li>)}
                                  </ol>
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    ) : (
                      <div className="text-center py-16 text-muted-foreground flex flex-col items-center gap-4">
                        <ChefHat className="h-16 w-16" />
                        <p className="text-lg">Your recipe suggestions will appear here.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="favorites">
                <Card className="shadow-lg min-h-[30rem]">
                  <CardHeader>
                    <CardTitle className="text-2xl font-headline">Saved Recipes</CardTitle>
                    <CardDescription>Your collection of favorite meals.</CardDescription>
                  </CardHeader>
                  <CardContent>
                     {savedRecipes.length > 0 ? (
                      <Accordion type="single" collapsible className="w-full">
                        {savedRecipes.map(recipe => (
                           <AccordionItem value={recipe.name} key={recipe.name}>
                            <AccordionTrigger className="hover:no-underline">
                              {renderRecipeContent(recipe)}
                            </AccordionTrigger>
                            <AccordionContent className="p-4 pt-0">
                               <div className="space-y-4">
                                <div>
                                  <h4 className="font-semibold mb-2">Ingredients:</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {recipe.ingredients.map(ing => <Badge variant="secondary" key={ing}>{ing}</Badge>)}
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2">Instructions:</h4>
                                  <ol className="list-decimal list-inside space-y-2">
                                    {recipe.instructions.map((step, i) => <li key={`${recipe.name}-step-${i}`}>{step}</li>)}
                                  </ol>
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    ) : (
                       <div className="text-center py-16 text-muted-foreground flex flex-col items-center gap-4">
                         <Heart className="h-16 w-16" />
                         <p className="text-lg">You haven't saved any recipes yet.</p>
                       </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
