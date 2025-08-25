'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { OpenFoodFactsService } from '@/lib/open-food-facts';

const EnhancedNutritionalAnalysisInputSchema = z.object({
  recipeName: z.string().describe('The name of the recipe.'),
  ingredients: z.array(z.string()).describe('A list of ingredients for the recipe.'),
  servingSize: z.number().optional().describe('Number of servings (default: 1)'),
});

export type EnhancedNutritionalAnalysisInput = z.infer<typeof EnhancedNutritionalAnalysisInputSchema>;

const EnhancedNutritionalAnalysisOutputSchema = z.object({
  calories: z.string().describe('Total estimated calories per serving.'),
  protein: z.string().describe('Estimated grams of protein per serving.'),
  fat: z.string().describe('Estimated grams of fat per serving.'),
  carbohydrates: z.string().describe('Estimated grams of carbohydrates per serving.'),
  fiber: z.string().describe('Estimated grams of fiber per serving.'),
  sugar: z.string().describe('Estimated grams of sugar per serving.'),
  servingSize: z.string().describe('The serving size for this analysis.'),
  dataSource: z.string().describe('Source of nutritional data (Open Food Facts + AI estimation).'),
  ingredientBreakdown: z.array(z.object({
    ingredient: z.string(),
    calories: z.number(),
    protein: z.number(),
    fat: z.number(),
    carbohydrates: z.number(),
    dataAvailable: z.boolean(),
  })).describe('Per-ingredient nutritional breakdown.'),
  disclaimer: z.string().describe('Disclaimer about the accuracy of the data.'),
});

export type EnhancedNutritionalAnalysisOutput = z.infer<typeof EnhancedNutritionalAnalysisOutputSchema>;

export async function getEnhancedNutritionalAnalysis(
  input: EnhancedNutritionalAnalysisInput
): Promise<EnhancedNutritionalAnalysisOutput> {
  const { recipeName, ingredients, servingSize = 1 } = input;
  
  // Get real nutritional data from Open Food Facts
  const ingredientNutrition = await Promise.all(
    ingredients.map(async (ingredient) => {
      const nutrition = await OpenFoodFactsService.getNutritionalInfo(ingredient);
      return {
        ingredient,
        nutrition,
        dataAvailable: nutrition !== null,
      };
    })
  );

  // Calculate totals from available data
  let totalCalories = 0;
  let totalProtein = 0;
  let totalFat = 0;
  let totalCarbohydrates = 0;
  let totalFiber = 0;
  let totalSugar = 0;
  let dataSourcesCount = 0;

  const ingredientBreakdown = ingredientNutrition.map(({ ingredient, nutrition, dataAvailable }) => {
    if (nutrition) {
      // Assuming 100g portions for calculation (can be adjusted)
      const portionFactor = 0.5; // Rough estimate for recipe portions
      totalCalories += nutrition.calories * portionFactor;
      totalProtein += nutrition.protein * portionFactor;
      totalFat += nutrition.fat * portionFactor;
      totalCarbohydrates += nutrition.carbohydrates * portionFactor;
      totalFiber += nutrition.fiber * portionFactor;
      totalSugar += nutrition.sugar * portionFactor;
      dataSourcesCount++;
      
      return {
        ingredient,
        calories: Math.round(nutrition.calories * portionFactor),
        protein: Math.round(nutrition.protein * portionFactor * 10) / 10,
        fat: Math.round(nutrition.fat * portionFactor * 10) / 10,
        carbohydrates: Math.round(nutrition.carbohydrates * portionFactor * 10) / 10,
        dataAvailable: true,
      };
    }
    
    return {
      ingredient,
      calories: 0,
      protein: 0,
      fat: 0,
      carbohydrates: 0,
      dataAvailable: false,
    };
  });

  // If we have some real data, use it as base and estimate missing ingredients with AI
  const hasRealData = dataSourcesCount > 0;
  let finalNutrition: EnhancedNutritionalAnalysisOutput;

  if (hasRealData) {
    // Use hybrid approach: real data + AI estimation for missing ingredients
    const missingIngredients = ingredientNutrition
      .filter(item => !item.dataAvailable)
      .map(item => item.ingredient);

    if (missingIngredients.length > 0) {
      // Get AI estimation for missing ingredients
      const aiEstimation = await getAIEstimationForIngredients(missingIngredients, recipeName);
      
      // Combine real data with AI estimation
      totalCalories += aiEstimation.calories;
      totalProtein += aiEstimation.protein;
      totalFat += aiEstimation.fat;
      totalCarbohydrates += aiEstimation.carbohydrates;
      totalFiber += aiEstimation.fiber;
      totalSugar += aiEstimation.sugar;
    }

    finalNutrition = {
      calories: `${Math.round(totalCalories / servingSize)} kcal`,
      protein: `${Math.round(totalProtein / servingSize * 10) / 10}g`,
      fat: `${Math.round(totalFat / servingSize * 10) / 10}g`,
      carbohydrates: `${Math.round(totalCarbohydrates / servingSize * 10) / 10}g`,
      fiber: `${Math.round(totalFiber / servingSize * 10) / 10}g`,
      sugar: `${Math.round(totalSugar / servingSize * 10) / 10}g`,
      servingSize: servingSize === 1 ? '1 serving' : `${servingSize} servings`,
      dataSource: `Open Food Facts database (${dataSourcesCount}/${ingredients.length} ingredients) + AI estimation`,
      ingredientBreakdown,
      disclaimer: `Nutritional information is based on ${dataSourcesCount} ingredients from the Open Food Facts database and AI estimation for the remaining ingredients. Values are approximate and may vary based on preparation methods, portion sizes, and specific product brands. This information is not intended as a substitute for professional dietary advice.`,
    };
  } else {
    // Fallback to pure AI estimation
    const aiNutrition = await getAINutritionalAnalysis(recipeName, ingredients, servingSize);
    finalNutrition = {
      ...aiNutrition,
      dataSource: 'AI estimation (no Open Food Facts data available)',
      ingredientBreakdown,
    };
  }

  return finalNutrition;
}

// Helper function for AI estimation of missing ingredients
async function getAIEstimationForIngredients(
  ingredients: string[], 
  recipeName: string
): Promise<{
  calories: number;
  protein: number;
  fat: number;
  carbohydrates: number;
  fiber: number;
  sugar: number;
}> {
  const prompt = ai.definePrompt({
    name: 'estimateNutritionPrompt',
    input: { 
      schema: z.object({
        ingredients: z.array(z.string()),
        recipeName: z.string(),
      })
    },
    output: { 
      schema: z.object({
        calories: z.number(),
        protein: z.number(),
        fat: z.number(),
        carbohydrates: z.number(),
        fiber: z.number(),
        sugar: z.number(),
      })
    },
    prompt: `Estimate the nutritional content for these ingredients in the context of the recipe "${recipeName}":
    Ingredients: {{{ingredients}}}
    
    Provide estimated totals assuming reasonable portion sizes for a typical recipe serving.`,
  });

  const { output } = await prompt({ ingredients, recipeName });
  return output || { calories: 0, protein: 0, fat: 0, carbohydrates: 0, fiber: 0, sugar: 0 };
}

// Fallback AI analysis
async function getAINutritionalAnalysis(
  recipeName: string, 
  ingredients: string[], 
  servingSize: number
): Promise<Omit<EnhancedNutritionalAnalysisOutput, 'dataSource' | 'ingredientBreakdown'>> {
  // Use your existing AI analysis as fallback
  const { getNutritionalAnalysis } = await import('./get-nutritional-analysis');
  const result = await getNutritionalAnalysis({ recipeName, ingredients });
  
  return {
    calories: result.calories,
    protein: result.protein,
    fat: result.fat,
    carbohydrates: result.carbohydrates,
    fiber: result.fiber,
    sugar: result.sugar,
    servingSize: result.servingSize,
    disclaimer: result.disclaimer,
  };
}