interface OpenFoodFactsProduct {
  code: string;
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  categories?: string;
  ingredients_text?: string;
  ingredients_text_en?: string;
  nutriments?: {
    energy_100g?: number;
    'energy-kcal_100g'?: number;
    fat_100g?: number;
    'saturated-fat_100g'?: number;
    carbohydrates_100g?: number;
    sugars_100g?: number;
    fiber_100g?: number;
    proteins_100g?: number;
    salt_100g?: number;
    sodium_100g?: number;
  };
  image_url?: string;
  image_front_url?: string;
  image_nutrition_url?: string;
}

interface OpenFoodFactsResponse {
  status: number;
  status_verbose: string;
  product?: OpenFoodFactsProduct;
}

interface SearchResponse {
  count: number;
  page: number;
  page_size: number;
  products: OpenFoodFactsProduct[];
}

export class OpenFoodFactsService {
  private static readonly BASE_URL = 'https://world.openfoodfacts.org';
  private static readonly USER_AGENT = 'Harvest-AI-Chef/1.0 (contact@harvest-ai-chef.app)';

  /**
   * Search for products by name or ingredients
   */
  static async searchProducts(query: string, limit: number = 20): Promise<OpenFoodFactsProduct[]> {
    try {
      const searchParams = new URLSearchParams({
        search_terms: query,
        search_simple: '1',
        action: 'process',
        json: '1',
        page_size: limit.toString(),
        fields: 'code,product_name,product_name_en,brands,categories,ingredients_text,ingredients_text_en,nutriments,image_url,image_front_url'
      });

      const response = await fetch(`${this.BASE_URL}/cgi/search.pl?${searchParams}`, {
        headers: {
          'User-Agent': this.USER_AGENT,
        },
      });

      if (!response.ok) {
        throw new Error(`Open Food Facts API error: ${response.status}`);
      }

      const data: SearchResponse = await response.json();
      return data.products || [];
    } catch (error) {
      console.error('Error searching Open Food Facts:', error);
      return [];
    }
  }

  /**
   * Get product details by barcode
   */
  static async getProduct(barcode: string): Promise<OpenFoodFactsProduct | null> {
    try {
      const response = await fetch(`${this.BASE_URL}/api/v0/product/${barcode}.json`, {
        headers: {
          'User-Agent': this.USER_AGENT,
        },
      });

      if (!response.ok) {
        throw new Error(`Open Food Facts API error: ${response.status}`);
      }

      const data: OpenFoodFactsResponse = await response.json();
      return data.status === 1 ? data.product || null : null;
    } catch (error) {
      console.error('Error fetching product from Open Food Facts:', error);
      return null;
    }
  }

  /**
   * Get nutritional information for an ingredient
   */
  static async getNutritionalInfo(ingredientName: string): Promise<{
    calories: number;
    protein: number;
    fat: number;
    carbohydrates: number;
    fiber: number;
    sugar: number;
  } | null> {
    try {
      const products = await this.searchProducts(ingredientName, 5);
      
      // Find the best match (first product with complete nutritional data)
      const bestMatch = products.find(product => 
        product.nutriments?.['energy-kcal_100g'] !== undefined &&
        product.nutriments?.proteins_100g !== undefined &&
        product.nutriments?.fat_100g !== undefined &&
        product.nutriments?.carbohydrates_100g !== undefined
      );

      if (!bestMatch || !bestMatch.nutriments) {
        return null;
      }

      const nutriments = bestMatch.nutriments;
      return {
        calories: nutriments['energy-kcal_100g'] || 0,
        protein: nutriments.proteins_100g || 0,
        fat: nutriments.fat_100g || 0,
        carbohydrates: nutriments.carbohydrates_100g || 0,
        fiber: nutriments.fiber_100g || 0,
        sugar: nutriments.sugars_100g || 0,
      };
    } catch (error) {
      console.error('Error getting nutritional info:', error);
      return null;
    }
  }

  /**
   * Get recipe suggestions based on available ingredients
   */
  static async findRecipesByIngredients(ingredients: string[]): Promise<{
    recipeName: string;
    matchingIngredients: string[];
    additionalIngredients?: string[];
    confidence: number;
  }[]> {
    try {
      const suggestions: Array<{
        recipeName: string;
        matchingIngredients: string[];
        additionalIngredients?: string[];
        confidence: number;
      }> = [];

      // Search for recipe-related products
      for (const ingredient of ingredients) {
        const products = await this.searchProducts(`recipe ${ingredient}`, 10);
        
        products.forEach(product => {
          const name = product.product_name || product.product_name_en;
          if (name && product.ingredients_text) {
            const confidence = this.calculateIngredientMatch(ingredients, product.ingredients_text);
            if (confidence > 0.3) {
              suggestions.push({
                recipeName: name,
                matchingIngredients: ingredients.filter(ing => 
                  product.ingredients_text?.toLowerCase().includes(ing.toLowerCase())
                ),
                confidence
              });
            }
          }
        });
      }

      // Sort by confidence and return top suggestions
      return suggestions
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 10);
    } catch (error) {
      console.error('Error finding recipes by ingredients:', error);
      return [];
    }
  }

  /**
   * Calculate how well ingredients match a product's ingredient list
   */
  private static calculateIngredientMatch(userIngredients: string[], productIngredients: string): number {
    const normalizedProductIngredients = productIngredients.toLowerCase();
    let matchCount = 0;

    userIngredients.forEach(ingredient => {
      if (normalizedProductIngredients.includes(ingredient.toLowerCase())) {
        matchCount++;
      }
    });

    return matchCount / userIngredients.length;
  }

  /**
   * Get ingredient alternatives and substitutions
   */
  static async getIngredientAlternatives(ingredient: string): Promise<string[]> {
    try {
      const products = await this.searchProducts(ingredient, 20);
      const alternatives = new Set<string>();

      products.forEach(product => {
        if (product.categories) {
          // Extract category-based alternatives
          const categories = product.categories.split(',').map(cat => cat.trim());
          categories.forEach(category => {
            if (category.includes(ingredient.toLowerCase()) || 
                ingredient.toLowerCase().includes(category.toLowerCase())) {
              alternatives.add(category);
            }
          });
        }
      });

      return Array.from(alternatives).slice(0, 5);
    } catch (error) {
      console.error('Error getting ingredient alternatives:', error);
      return [];
    }
  }
}