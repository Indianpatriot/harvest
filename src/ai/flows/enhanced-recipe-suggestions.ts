'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { OpenFoodFactsService } from '@/lib/open-food-facts';

const EnhancedRecipeSuggestionsInputSchema = z.object({
  ingredients: z.array(z.string()).describe('Available ingredients'),
  useOpenFoodFacts: z.boolean().default(true).describe('Whether to use Open Food Facts data'),
  preferredCuisine: z.string().optional().describe('Preferred cuisine type'),
  dietaryRestrictions: z.array(z.string()).optional().describe('Dietary restrictions'),
});

export type EnhancedRecipeSuggestionsInput = z.infer<typeof EnhancedRecipeSuggestionsInputSchema>;

const EnhancedRecipeSchema = z.object({
  name: z.string().describe('Recipe name'),
  ingredients: z.array(z.string()).describe('Required ingredients'),
  instructions: z.array(z.string()).describe('Cooking instructions'),
  estimatedCookingTime: z.string().describe('Estimated cooking time'),
  dietaryCategory: z.enum(['Vegetarian', 'Eggetarian', 'Non-Vegetarian']).describe('Dietary category'),
  imageUrl: z.string().describe('Recipe image URL'),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).describe('Cooking difficulty'),
  cuisine: z.string().describe('Cuisine type'),
  nutritionalHighlights: z.array(z.string()).describe('Key nutritional benefits'),
  sourceInfo: z.object({
    fromOpenFoodFacts: z.boolean(),
    confidence: z.number(),
    matchingIngredients: z.number(),
  }).describe('Information about data sources'),
});

export type EnhancedRecipe = z.infer<typeof EnhancedRecipeSchema>;

export async function getEnhancedRecipeSuggestions(
  input: EnhancedRecipeSuggestionsInput
): Promise<EnhancedRecipe[]> {
  const { ingredients, useOpenFoodFacts = true, preferredCuisine, dietaryRestrictions } = input;
  
  let openFoodFactsSuggestions: any[] = [];
  let aiRecipes: EnhancedRecipe[] = [];

  // Get suggestions from Open Food Facts if enabled
  if (useOpenFoodFacts) {
    try {
      openFoodFactsSuggestions = await OpenFoodFactsService.findRecipesByIngredients(ingredients);
    } catch (error) {
      console.error('Error getting Open Food Facts suggestions:', error);
    }
  }

  // Generate AI recipes
  aiRecipes = await generateAIRecipes(ingredients, preferredCuisine, dietaryRestrictions);

  // Combine and enhance recipes
  const combinedRecipes: EnhancedRecipe[] = [
    // Convert Open Food Facts suggestions to recipe format
    ...openFoodFactsSuggestions.slice(0, 2).map(suggestion => ({
      name: suggestion.recipeName,
      ingredients: [...suggestion.matchingIngredients, ...(suggestion.additionalIngredients || [])],
      instructions: [`Based on ${suggestion.recipeName} - cooking instructions to be generated.`],
      estimatedCookingTime: '30-45 minutes',
      dietaryCategory: 'Vegetarian' as const,
      imageUrl: 'https://placehold.co/600x400.png',
      difficulty: 'Medium' as const,
      cuisine: preferredCuisine || 'International',
      nutritionalHighlights: ['Real food data', 'Verified ingredients'],
      sourceInfo: {
        fromOpenFoodFacts: true,
        confidence: suggestion.confidence,
        matchingIngredients: suggestion.matchingIngredients.length,
      },
    })),
    // Add AI-generated recipes
    ...aiRecipes.slice(0, 3).map(recipe => ({
      ...recipe,
      sourceInfo: {
        fromOpenFoodFacts: false,
        confidence: 0.8,
        matchingIngredients: recipe.ingredients.length,
      },
    })),
  ];

  // Generate images for recipes in parallel
  const recipesWithImages = await Promise.all(
    combinedRecipes.map(async (recipe) => {
      try {
        const { media } = await ai.generate({
          model: 'googleai/gemini-2.0-flash-preview-image-generation',
          prompt: `A photorealistic, appetizing image of ${recipe.name}, beautifully plated and ready to serve. Professional food photography style.`,
          config: {
            responseModalities: ['TEXT', 'IMAGE'],
          },
        });
        
        return {
          ...recipe,
          imageUrl: media?.url ?? recipe.imageUrl,
        };
      } catch (error) {
        console.error(`Error generating image for ${recipe.name}:`, error);
        return recipe;
      }
    })
  );

  return recipesWithImages.slice(0, 5); // Return top 5 recipes
}

async function generateAIRecipes(
  ingredients: string[],
  preferredCuisine?: string,
  dietaryRestrictions?: string[]
): Promise<EnhancedRecipe[]> {
  const prompt = ai.definePrompt({
    name: 'enhancedRecipePrompt',
    input: {
      schema: z.object({
        ingredients: z.array(z.string()),
        cuisine: z.string().optional(),
        restrictions: z.array(z.string()).optional(),
      })
    },
    output: {
      schema: z.array(EnhancedRecipeSchema.omit({ sourceInfo: true }))
    },
    prompt: `Create 3 detailed recipes using these ingredients: {{{ingredients}}}
    ${preferredCuisine ? `Preferred cuisine: ${preferredCuisine}` : ''}
    ${dietaryRestrictions?.length ? `Dietary restrictions: ${dietaryRestrictions.join(', ')}` : ''}
    
    For each recipe provide complete details including difficulty level, cuisine type, and nutritional highlights.`,
  });

  const { output } = await prompt({
    ingredients,
    cuisine: preferredCuisine,
    restrictions: dietaryRestrictions,
  });

  return output || [];
}