'use server';
/**
 * @fileOverview Identifies ingredients from an image.
 *
 * - identifyIngredients - A function that handles the ingredient identification process.
 * - IdentifyIngredientsInput - The input type for the identifyIngredients function.
 * - IdentifyIngredientsOutput - The return type for the identifyIngredients function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { v4 as uuidv4 } from 'uuid';

const IdentifyIngredientsInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of ingredients, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type IdentifyIngredientsInput = z.infer<typeof IdentifyIngredientsInputSchema>;


const IdentifiedIngredientSchema = z.object({
  id: z.string().describe('A unique identifier for the ingredient. Use a UUID.'),
  name: z.string().describe('The name of the identified ingredient.'),
  confidence: z.number().min(0).max(1).describe('A confidence score between 0 and 1 on the accuracy of the identification.'),
});

const IdentifyIngredientsOutputSchema = z.object({
  ingredients: z.array(IdentifiedIngredientSchema).describe('A list of identified ingredients with their confidence scores.'),
});
export type IdentifyIngredientsOutput = z.infer<typeof IdentifyIngredientsOutputSchema>;

export async function identifyIngredients(input: IdentifyIngredientsInput): Promise<IdentifyIngredientsOutput> {
  return identifyIngredientsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'identifyIngredientsPrompt',
  input: {schema: IdentifyIngredientsInputSchema},
  output: {schema: IdentifyIngredientsOutputSchema},
  prompt: `You are an expert food identifier. You will identify the food ingredients in a photo.

  Your task is to:
  1.  Identify all distinct food items in the image.
  2.  Consolidate variations of the same ingredient. For example, if you see "tomato" and "tomatoes", list it only once as "tomato". Use singular forms for all ingredients.
  3.  Filter out any items that are not edible food ingredients.
  4.  For each valid ingredient, provide its name, a unique UUID for its ID, and a confidence score from 0.0 to 1.0 representing how certain you are about the identification.

  Return a clean, de-duplicated list of validated food ingredients.

  Photo: {{media url=photoDataUri}}
  `,
});

const identifyIngredientsFlow = ai.defineFlow(
  {
    name: 'identifyIngredientsFlow',
    inputSchema: IdentifyIngredientsInputSchema,
    outputSchema: IdentifyIngredientsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    
    if (!output) {
      return { ingredients: [] };
    }

    // Post-processing to ensure uniqueness, even if the model provides duplicates.
    const seen = new Set<string>();
    const uniqueIngredients = output.ingredients.filter(ingredient => {
        const lowerCaseName = ingredient.name.toLowerCase();
        if (seen.has(lowerCaseName)) {
            return false;
        } else {
            seen.add(lowerCaseName);
            return true;
        }
    });

    // Ensure every ingredient has a unique ID.
    const finalIngredients = uniqueIngredients.map(ing => ({...ing, id: ing.id || uuidv4()}));

    return { ingredients: finalIngredients };
  }
);
