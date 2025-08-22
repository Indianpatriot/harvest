
'use server';

/**
 * @fileOverview Recipe suggestion AI agent.
 *
 * - suggestRecipes - A function that handles the recipe suggestion process.
 * - SuggestRecipesInput - The input type for the suggestRecipes function.
 * - SuggestRecipesOutput - The return type for the suggestRecipes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestRecipesInputSchema = z.object({
  ingredients: z.array(z.string()).describe('A list of ingredients identified from the user uploaded photo, and any manually added items.'),
});
export type SuggestRecipesInput = z.infer<typeof SuggestRecipesInputSchema>;

const RecipeSchema = z.object({
  name: z.string().describe('The name of the recipe.'),
  ingredients: z.array(z.string()).describe('A list of ingredients required for this recipe, taken from the provided list.'),
  instructions: z.array(z.string()).describe('The step-by-step instructions to prepare the recipe.'),
  imageUrl: z.string().url().describe("A URL for an image of the recipe. This will be a data URI representing a generated image."),
  estimatedCookingTime: z.string().describe('The estimated time to prepare and cook the recipe (e.g., "30-45 minutes").'),
  dietaryCategory: z.enum(['Vegetarian', 'Eggetarian', 'Non-Vegetarian']).describe('The dietary category of the recipe.'),
});

const SuggestRecipesOutputSchema = z.array(RecipeSchema).describe('A list of recipe suggestions based on the identified ingredients.');
export type SuggestRecipesOutput = z.infer<typeof SuggestRecipesOutputSchema>;

export async function suggestRecipes(input: SuggestRecipesInput): Promise<SuggestRecipesOutput> {
  return suggestRecipesFlow(input);
}

const recipeSuggestionPrompt = ai.definePrompt({
    name: 'recipeSuggestionPrompt',
    input: {schema: SuggestRecipesInputSchema},
    output: {schema: z.array(
        z.object({
            name: z.string().describe('The name of the recipe.'),
            ingredients: z.array(z.string()).describe('A list of ingredients required for this recipe, taken from the provided list.'),
            instructions: z.array(z.string()).describe('The step-by-step instructions to prepare the recipe.'),
            estimatedCookingTime: z.string().describe('The estimated time to prepare and cook the recipe (e.g., "30-45 minutes").'),
            dietaryCategory: z.enum(['Vegetarian', 'Eggetarian', 'Non-Vegetarian']).describe('The dietary category of the recipe. Determine this based on the ingredients.'),
            imagePrompt: z.string().describe("A descriptive prompt for an image generation model to create a photorealistic, appetizing picture of the finished dish. For example: 'A close-up shot of a steaming bowl of homemade chicken noodle soup, with fresh parsley sprinkled on top, on a rustic wooden table.'"),
        })
    )},
    prompt: `You are a sous chef specializing in creating recipes based on a limited set of ingredients.

You will use this information to create a list of recipe suggestions that the user can make. You will only suggest recipes that can be made with the ingredients provided. For each recipe, provide the name, the list of ingredients from the input that are used, the step-by-step instructions, the estimated cooking time, the dietary category ('Vegetarian', 'Eggetarian', 'Non-Vegetarian'), and a detailed, descriptive prompt to generate an image for the recipe.

Ingredients: {{{ingredients}}}

Suggest 3 recipes:
`,config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  },
});

const suggestRecipesFlow = ai.defineFlow(
  {
    name: 'suggestRecipesFlow',
    inputSchema: SuggestRecipesInputSchema,
    outputSchema: SuggestRecipesOutputSchema,
  },
  async input => {
    let recipeIdeas;
    try {
        const {output} = await recipeSuggestionPrompt(input);
        recipeIdeas = output;
    } catch (error) {
        console.error("Error suggesting recipe ideas:", error);
        // Instead of throwing an error, return an empty array to gracefully handle the failure.
        return [];
    }

    if (!recipeIdeas) {
        return [];
    }
    
    // Generate an image for each recipe in parallel.
    const recipesWithImages = await Promise.all(
        recipeIdeas.map(async (idea) => {
            try {
                const {media} = await ai.generate({
                    model: 'googleai/gemini-2.0-flash-preview-image-generation',
                    prompt: idea.imagePrompt,
                    config: {
                        responseModalities: ['TEXT', 'IMAGE'],
                    },
                });
                return {
                    name: idea.name,
                    ingredients: idea.ingredients,
                    instructions: idea.instructions,
                    estimatedCookingTime: idea.estimatedCookingTime,
                    dietaryCategory: idea.dietaryCategory,
                    imageUrl: media?.url ?? `https://placehold.co/600x400.png`
                }
            } catch (error) {
                console.error(`Error generating image for recipe "${idea.name}":`, error);
                // Fallback to a placeholder if image generation fails
                return {
                    name: idea.name,
                    ingredients: idea.ingredients,
                    instructions: idea.instructions,
                    estimatedCookingTime: idea.estimatedCookingTime,
                    dietaryCategory: idea.dietaryCategory,
                    imageUrl: `https://placehold.co/600x400.png`
                }
            }
        })
    );

    return recipesWithImages;
  }
);
