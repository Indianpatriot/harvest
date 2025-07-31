import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-recipes.ts';
import '@/ai/flows/identify-ingredients.ts';
import '@/ai/flows/find-recipes-by-name.ts';
