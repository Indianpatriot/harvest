
'use client';

import { useState, useTransition, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { identifyIngredients, IdentifyIngredientsOutput } from '@/ai/flows/identify-ingredients';
import { suggestRecipes, SuggestRecipesOutput } from '@/ai/flows/suggest-recipes';
import { findRecipesByName } from '@/ai/flows/find-recipes-by-name';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Upload, Trash2, PlusCircle, ChefHat, Heart, Loader2, Check, X, Pencil, Sparkles, Utensils, Soup, Search } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { RecipeCard } from './recipe-card';
import { AnimatePresence, motion } from 'framer-motion';

type Recipe = SuggestRecipesOutput[0];
type IdentifiedIngredient = IdentifyIngredientsOutput['ingredients'][0];
type EditableIngredient = IdentifiedIngredient & { 
    isEditing?: boolean;
    originalName?: string;
    originalConfidence?: number;
};


const getConfidenceColor = (confidence: number) => {
  if (confidence > 0.9) return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800/60';
  if (confidence > 0.6) return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800/60';
  return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800/60';
};

export function HarvestAiChef() {
  const { toast } = useToast();
  const [isIdentifying, startIdentifying] = useTransition();
  const [isSuggesting, startSuggesting] = useTransition();
  const [isFinding, startFinding] = useTransition();


  const [activeTab, setActiveTab] = useState('upload');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<EditableIngredient[]>([]);
  const [newIngredient, setNewIngredient] = useState('');
  const [recipeQuery, setRecipeQuery] = useState('');
  const [suggestedRecipesList, setSuggestedRecipesList] = useState<Recipe[]>([]);
  const [savedRecipes, setSavedRecipes] = useLocalStorage<Recipe[]>('saved-recipes', []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeRecipeTab, setActiveRecipeTab] = useState<'suggestions' | 'favorites'>('suggestions');

  useEffect(() => {
    if (suggestedRecipesList.length > 0) {
      setActiveRecipeTab('suggestions');
    } else if (savedRecipes.length > 0) {
      setActiveRecipeTab('favorites');
    }
  }, [suggestedRecipesList, savedRecipes]);

  const handleImageUpload = (file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        setUploadedImage(dataUri);
        startIdentifying(async () => {
          try {
            const result = await identifyIngredients({ photoDataUri: dataUri });
            setIngredients(result.ingredients.map(ing => ({ ...ing })));
            setSuggestedRecipesList([]);
            setActiveTab('ingredients');
          } catch (error) {
            console.error('Error identifying ingredients:', error);
            toast({
              variant: 'destructive',
              title: 'Error Identifying Ingredients',
              description: 'Could not identify ingredients from the image. Please try another one or add them manually.',
            });
            setUploadedImage(null);
          }
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleImageUpload(event.target.files?.[0] ?? null);
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('border-primary');
    handleImageUpload(event.dataTransfer.files?.[0] ?? null);
  };
  
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.add('border-primary');
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('border-primary');
  };

  const handleAddIngredient = () => {
    if (newIngredient.trim() && !ingredients.some(i => i.name.toLowerCase() === newIngredient.trim().toLowerCase())) {
      const newIng: EditableIngredient = {
        id: `manual-${Date.now()}`,
        name: newIngredient.trim(),
        confidence: 1.0,
      };
      setIngredients([newIng, ...ingredients]);
      setNewIngredient('');
    }
  };

  const handleEditIngredient = (id: string) => {
    setIngredients(ingredients.map(ing => 
      ing.id === id ? { ...ing, isEditing: true, originalName: ing.name, originalConfidence: ing.confidence } : ing
    ));
  };

  const handleCancelEdit = (id: string) => {
    setIngredients(ingredients.map(ing => {
      if (ing.id === id) {
        return { 
          ...ing, 
          isEditing: false, 
          name: ing.originalName || ing.name, 
          confidence: ing.originalConfidence || ing.confidence 
        };
      }
      return ing;
    }));
  };

  const handleSaveIngredient = (id: string) => {
    setIngredients(ingredients.map(ing => {
        if (ing.id === id) {
          const newConfidence = Math.max(0, Math.min(1, ing.confidence));
          toast({
              title: `Updated '${ing.name}'`,
          });
          return { ...ing, isEditing: false, confidence: newConfidence };
        }
        return ing;
      }));
  };
  
  const handleIngredientNameChange = (id: string, newName: string) => {
      setIngredients(ingredients.map(ing => ing.id === id ? { ...ing, name: newName } : ing));
  };

  const handleConfidenceChange = (id: string, newConfidenceStr: string) => {
      const newConfidence = parseFloat(newConfidenceStr) / 100;
      setIngredients(ingredients.map(ing => ing.id === id ? { ...ing, confidence: isNaN(newConfidence) ? 0 : newConfidence } : ing));
  };


  const handleRemoveIngredient = (id: string) => {
    const removedIngredient = ingredients.find(i => i.id === id);
    setIngredients(ingredients.filter(i => i.id !== id));
    toast({
      title: `Removed '${removedIngredient?.name}'`,
      description: "You can re-add it manually if this was a mistake.",
    });
  };

  const handleGetRecipesByIngredients = () => {
    const acceptedIngredients = ingredients.map(i => i.name);
    if (acceptedIngredients.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Ingredients',
        description: 'Please add some ingredients first.',
      });
      return;
    }
    setActiveTab('recipes');
    startSuggesting(async () => {
      try {
        const result = await suggestRecipes({ ingredients: acceptedIngredients });
        setSuggestedRecipesList(result);
      } catch (error) {
        console.error('Error suggesting recipes:', error);
        toast({
          variant: 'destructive',
          title: 'Error Fetching Recipes',
          description: 'Could not fetch recipe suggestions. Please try again.',
        });
      }
    });
  };

  const handleFindRecipesByName = () => {
    if (recipeQuery.trim().length === 0) {
        toast({
          variant: 'destructive',
          title: 'No Recipe Name',
          description: 'Please enter a recipe name to search.',
        });
        return;
      }
      setActiveTab('recipes');
      startFinding(async () => {
        try {
          const result = await findRecipesByName({ query: recipeQuery });
          setSuggestedRecipesList(result);
          
          const allIngredients = new Set<string>();
          result.forEach(recipe => {
              recipe.ingredients.forEach(ing => allIngredients.add(ing.toLowerCase()));
          });

          const newIngredients: EditableIngredient[] = Array.from(allIngredients).map((name, index) => ({
              id: `search-${Date.now()}-${index}`,
              name: name,
              confidence: 1.0,
          }));

          setIngredients(newIngredients);

        } catch (error) {
          console.error('Error finding recipes:', error);
          toast({
            variant: 'destructive',
            title: 'Error Finding Recipes',
            description: 'Could not find recipes for your query. Please try again.',
          });
        }
      });
  }

  const toggleFavorite = useCallback((recipe: Recipe) => {
    setSavedRecipes(prev => {
      if (prev.some(r => r.name === recipe.name)) {
        return prev.filter(r => r.name !== recipe.name);
      } else {
        return [...prev, recipe];
      }
    });
  }, [setSavedRecipes]);

  const isFavorite = useCallback((recipe: Recipe) => savedRecipes.some(r => r.name === recipe.name), [savedRecipes]);
  
  const isLoading = isIdentifying || isSuggesting || isFinding;

  const renderNavButton = (tabName: string, icon: React.ReactNode, label: string) => (
    <Button
      variant={activeTab === tabName ? "default" : "ghost"}
      className="flex-1 justify-center gap-2"
      onClick={() => setActiveTab(tabName)}
      disabled={(tabName === 'ingredients' && ingredients.length === 0) || (tabName === 'recipes' && suggestedRecipesList.length === 0 && savedRecipes.length === 0) }
    >
      {icon} {label}
    </Button>
  );

  const displayedRecipes = activeRecipeTab === 'suggestions' ? suggestedRecipesList : savedRecipes;

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

      <main className="container mx-auto px-4 py-8 flex-grow">
          <AnimatePresence mode="wait">
            <motion.div
                key={activeTab}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.2 }}
            >
                {activeTab === 'upload' && (
                  <div className="max-w-2xl mx-auto flex flex-col items-center text-center gap-6">
                    <div className="w-full space-y-4">
                        <h2 className="text-2xl font-bold font-headline">Find Recipes by Name</h2>
                        <div className="flex gap-2">
                           <Input 
                               value={recipeQuery}
                               onChange={(e) => setRecipeQuery(e.target.value)}
                               placeholder="e.g., Pasta Alfredo"
                               onKeyDown={(e) => e.key === 'Enter' && handleFindRecipesByName()}
                               className="bg-background"
                           />
                           <Button onClick={handleFindRecipesByName} variant="primary" className="shrink-0" disabled={isLoading}>
                               {isFinding ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                               <span className="hidden sm:inline ml-2">Find Recipes</span>
                           </Button>
                        </div>
                    </div>
                    
                    <div className="w-full flex items-center gap-4">
                        <hr className="flex-grow border-border"/>
                        <span className="text-muted-foreground font-semibold">OR</span>
                        <hr className="flex-grow border-border"/>
                    </div>

                    <div 
                      className="w-full h-80 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center bg-secondary/20 relative transition-colors duration-300"
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      data-ai-hint="food ingredients vegetables fruits"
                    >
                      {isIdentifying ? (
                        <div className="absolute inset-0 bg-background/90 flex flex-col items-center justify-center z-10 rounded-xl">
                          <Loader2 className="h-12 w-12 animate-spin text-primary" />
                          <p className="text-lg font-semibold mt-4 text-primary">Analyzing your ingredients...</p>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-16 w-16 text-muted-foreground mb-4" />
                          <h2 className="text-2xl font-bold font-headline">Upload Your Ingredients</h2>
                          <p className="text-muted-foreground mt-2">Drag & drop an image here or click to select a file.</p>
                        </>
                      )}
                    </div>
                    <Button size="lg" onClick={() => fileInputRef.current?.click()} className="w-full sm:w-auto" variant="outline" disabled={isLoading}>
                      {isIdentifying ? "Analyzing..." : "Choose a Photo"}
                    </Button>
                    <Input id="file-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={isLoading} ref={fileInputRef}/>
                  </div>
                )}
                
                {activeTab === 'ingredients' && (
                  <div className="max-w-4xl mx-auto">
                    <div className="bg-card p-4 sm:p-6 rounded-xl shadow-sm border border-border/60">
                        <h2 className="text-2xl font-bold font-headline flex items-center gap-2 mb-4">
                           <Sparkles size={24}/> Your Ingredients
                        </h2>
                        
                        <div className="mb-6 flex gap-2">
                           <Input 
                               value={newIngredient}
                               onChange={(e) => setNewIngredient(e.target.value)}
                               placeholder="Add an ingredient manually (e.g. olive oil)"
                               onKeyDown={(e) => e.key === 'Enter' && handleAddIngredient()}
                               className="bg-background"
                           />
                           <Button onClick={handleAddIngredient} variant="outline" className="shrink-0">
                               <PlusCircle className="h-5 w-5 mr-2" />
                               Add
                           </Button>
                        </div>
                        
                        <AnimatePresence>
                         {ingredients.length > 0 ? (
                           <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                             {ingredients.map((ingredient) => (
                               <motion.li 
                                 key={ingredient.id} 
                                 layout
                                 initial={{ opacity: 0, y: 20 }}
                                 animate={{ opacity: 1, y: 0 }}
                                 exit={{ opacity: 0, x: -50 }}
                                 transition={{ duration: 0.3 }}
                                 className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30"
                               >
                                {ingredient.isEditing ? (
                                    <>
                                        <div className="flex-grow space-y-2">
                                            <Input
                                                value={ingredient.name}
                                                onChange={(e) => handleIngredientNameChange(ingredient.id, e.target.value)}
                                                className="h-8 w-full bg-background"
                                                autoFocus
                                                onKeyDown={(e) => e.key === 'Enter' && handleSaveIngredient(ingredient.id)}
                                            />
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    value={(ingredient.confidence * 100).toFixed(0)}
                                                    onChange={(e) => handleConfidenceChange(ingredient.id, e.target.value)}
                                                    className="h-8 w-16 text-center bg-background"
                                                    min="0"
                                                    max="100"
                                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveIngredient(ingredient.id)}
                                                />
                                                <span className="text-sm text-muted-foreground">% Confidence</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-600" onClick={() => handleSaveIngredient(ingredient.id)}><Check className="h-4 w-4" /></Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-600" onClick={() => handleCancelEdit(ingredient.id)}><X className="h-4 w-4" /></Button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <span className="flex-grow font-medium capitalize truncate">{ingredient.name}</span>
                                        <div className={`text-xs font-bold px-2 py-1 rounded-full border ${getConfidenceColor(ingredient.confidence)}`}>
                                            {(ingredient.confidence * 100).toFixed(0)}%
                                        </div>
                                        <div className="flex items-center gap-1 ml-auto shrink-0">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:text-blue-600" onClick={() => handleEditIngredient(ingredient.id)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-600" onClick={() => handleRemoveIngredient(ingredient.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </>
                                )}
                               </motion.li>
                             ))}
                           </ul>
                         ) : (
                           <div className="text-center py-10 text-muted-foreground border-2 border-dashed border-border/60 rounded-lg">
                             <p>Your ingredients list is empty.</p>
                             <p className="text-sm">Upload a photo or add items manually to begin.</p>
                           </div>
                         )}
                         </AnimatePresence>
                     </div>
                     <div className="mt-6 flex justify-end">
                       <Button onClick={handleGetRecipesByIngredients} size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 text-lg py-6 w-full sm:w-auto" disabled={isLoading || ingredients.length === 0}>
                           {isSuggesting ? (
                               <>
                                   <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                   Generating Recipes...
                               </>
                           ) : (
                               "🔪 Cook with These Ingredients"
                           )}
                       </Button>
                     </div>
                  </div>
                )}

                {activeTab === 'recipes' && (
                   <div>
                     <div className="flex justify-center mb-6">
                        <div className="bg-card p-1 rounded-full border shadow-sm">
                            <Button variant={activeRecipeTab === 'suggestions' ? 'secondary' : 'ghost'} onClick={() => setActiveRecipeTab('suggestions')} className="rounded-full" disabled={suggestedRecipesList.length === 0}>Suggestions</Button>
                            <Button variant={activeRecipeTab === 'favorites' ? 'secondary' : 'ghost'} onClick={() => setActiveRecipeTab('favorites')} className="rounded-full" disabled={savedRecipes.length === 0}>Favorites ({savedRecipes.length})</Button>
                        </div>
                     </div>
                     
                     {isLoading ? (
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="bg-card rounded-xl shadow-md border p-4 space-y-4">
                                  <Skeleton className="h-40 w-full rounded-lg" />
                                  <Skeleton className="h-6 w-3/4" />
                                  <div className="flex flex-wrap gap-2">
                                    <Skeleton className="h-5 w-16 rounded-full" />
                                    <Skeleton className="h-5 w-20 rounded-full" />
                                    <Skeleton className="h-5 w-12 rounded-full" />
                                  </div>
                                </div>
                            ))}
                        </div>
                     ) : (
                       (displayedRecipes.length > 0) ? (
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
                             <AnimatePresence>
                             {displayedRecipes.map((recipe) => (
                               <motion.div
                                 key={recipe.name}
                                 layout
                                 initial={{ opacity: 0, scale: 0.8 }}
                                 animate={{ opacity: 1, scale: 1 }}
                                 exit={{ opacity: 0, scale: 0.8 }}
                                 transition={{ duration: 0.4, type: "spring" }}
                               >
                                 <RecipeCard 
                                   recipe={recipe} 
                                   isFavorite={isFavorite(recipe)}
                                   onToggleFavorite={toggleFavorite}
                                 />
                               </motion.div>
                             ))}
                             </AnimatePresence>
                         </div>
                       ) : (
                         <div className="text-center py-24 text-muted-foreground flex flex-col items-center gap-4">
                             <Soup className="h-24 w-24 text-border" />
                             <h3 className="text-2xl font-bold font-headline text-foreground">Nothing to see here... yet!</h3>
                             <p className="max-w-md">Once you add ingredients and generate recipes, your culinary masterpieces will appear here.</p>
                             <Button onClick={() => setActiveTab('upload')}>Start by Uploading Ingredients</Button>
                         </div>
                       )
                     )}
                   </div>
                )}
            </motion.div>
          </AnimatePresence>
      </main>
    </div>
  );
}
