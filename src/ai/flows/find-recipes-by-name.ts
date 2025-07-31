'use server';

/**
 * @fileOverview Recipe suggestion AI agent based on a text query.
 *
 * - findRecipesByName - A function that handles the recipe suggestion process.
 * - FindRecipesByNameInput - The input type for the findRecipesByName function.
 * - FindRecipesByNameOutput - The return type for the findRecipesByName function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FindRecipesByNameInputSchema = z.object({
  query: z.string().describe('A recipe name or description.'),
});
export type FindRecipesByNameInput = z.infer<typeof FindRecipesByNameInputSchema>;

const RecipeSchema = z.object({
  name: z.string().describe('The name of the recipe.'),
  ingredients: z.array(z.string()).describe('A list of ingredients required for this recipe.'),
  instructions: z.array(z.string()).describe('The step-by-step instructions to prepare the recipe.'),
  imageUrl: z.string().describe("A URL for an image of the recipe. Should be a placeholder from 'https://placehold.co/600x400.png' with a data-ai-hint attribute describing the dish."),
});

const FindRecipesByNameOutputSchema = z.array(RecipeSchema).describe('A list of recipe suggestions based on the user query.');
export type FindRecipesByNameOutput = z.infer<typeof FindRecipesByNameOutputSchema>;

export async function findRecipesByName(input: FindRecipesByNameInput): Promise<FindRecipesByNameOutput> {
  return findRecipesByNameFlow(input);
}

const prompt = ai.definePrompt({
  name: 'findRecipesByNamePrompt',
  input: {schema: FindRecipesByNameInputSchema},
  output: {schema: FindRecipesByNameOutputSchema},
  prompt: `You are a creative chef. A user wants to find recipes based on a search query.

  Suggest 3 recipes based on the user's query. For each recipe, provide the name, a complete list of ingredients, and the step-by-step instructions. Also, provide a placeholder image URL from 'https://placehold.co/600x400.png' for each recipe.

  User Query: {{{query}}}

  Suggest 3 recipes:
  `,
  config: {
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

const findRecipesByNameFlow = ai.defineFlow(
  {
    name: 'findRecipesByNameFlow',
    inputSchema: FindRecipesByNameInputSchema,
    outputSchema: FindRecipesByNameOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
