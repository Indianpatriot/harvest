
'use server';

/**
 * @fileOverview Nutritional analysis AI agent.
 *
 * - getNutritionalAnalysis - A function that handles the nutritional analysis process.
 * - GetNutritionalAnalysisInput - The input type for the function.
 * - GetNutritionalAnalysisOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetNutritionalAnalysisInputSchema = z.object({
  recipeName: z.string().describe('The name of the recipe.'),
  ingredients: z.array(z.string()).describe('A list of ingredients for the recipe.'),
});
export type GetNutritionalAnalysisInput = z.infer<typeof GetNutritionalAnalysisInputSchema>;


const GetNutritionalAnalysisOutputSchema = z.object({
    calories: z.string().describe('Estimated total calories for one serving.'),
    protein: z.string().describe('Estimated grams of protein.'),
    fat: z.string().describe('Estimated grams of fat.'),
    carbohydrates: z.string().describe('Estimated grams of carbohydrates.'),
    fiber: z.string().describe('Estimated grams of fiber.'),
    sugar: z.string().describe('Estimated grams of sugar.'),
    servingSize: z.string().describe('The recommended serving size for this analysis.'),
    disclaimer: z.string().describe("A brief disclaimer that this is an AI-generated estimate and not a substitute for professional nutritional advice."),
});
export type GetNutritionalAnalysisOutput = z.infer<typeof GetNutritionalAnalysisOutputSchema>;


export async function getNutritionalAnalysis(input: GetNutritionalAnalysisInput): Promise<GetNutritionalAnalysisOutput> {
  return getNutritionalAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getNutritionalAnalysisPrompt',
  input: {schema: GetNutritionalAnalysisInputSchema},
  output: {schema: GetNutritionalAnalysisOutputSchema},
  prompt: `You are an expert nutritionist. Analyze the provided recipe and its ingredients to estimate the nutritional information per serving.

  Recipe Name: {{{recipeName}}}
  Ingredients: {{{ingredients}}}

  Provide the estimated calories, protein, fat, carbohydrates, fiber, and sugar content. Also specify the serving size you are using for the calculation and include a brief disclaimer about the information being an AI estimate.
  `,
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
    ],
  },
});

const getNutritionalAnalysisFlow = ai.defineFlow(
  {
    name: 'getNutritionalAnalysisFlow',
    inputSchema: GetNutritionalAnalysisInputSchema,
    outputSchema: GetNutritionalAnalysisOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('Failed to get nutritional analysis from the AI service.');
    }
    return output;
  }
);
