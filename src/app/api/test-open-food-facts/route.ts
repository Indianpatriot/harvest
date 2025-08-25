import { NextRequest, NextResponse } from 'next/server';
import { OpenFoodFactsService } from '@/lib/open-food-facts';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const limit = parseInt(searchParams.get('limit') || '5');

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required' },
      { status: 400 }
    );
  }

  try {
    const products = await OpenFoodFactsService.searchProducts(query, limit);
    return NextResponse.json({
      success: true,
      query,
      count: products.length,
      products: products.map(product => ({
        code: product.code,
        name: product.product_name || product.product_name_en,
        brands: product.brands,
        categories: product.categories,
        image_url: product.image_front_url || product.image_url,
        has_nutrition: !!product.nutriments
      }))
    });
  } catch (error) {
    console.error('Error searching Open Food Facts:', error);
    return NextResponse.json(
      { error: 'Failed to search Open Food Facts database' },
      { status: 500 }
    );
  }
}