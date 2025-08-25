import { NextRequest, NextResponse } from 'next/server';
import { OpenFoodFactsService } from '@/lib/open-food-facts';

export async function POST(request: NextRequest) {
  try {
    const { ingredient } = await request.json();

    if (!ingredient) {
      return NextResponse.json(
        { error: 'Ingredient name is required' },
        { status: 400 }
      );
    }

    const nutritionalInfo = await OpenFoodFactsService.getNutritionalInfo(ingredient);
    
    return NextResponse.json({
      success: true,
      ingredient,
      nutritionalInfo,
      hasData: nutritionalInfo !== null
    });
  } catch (error) {
    console.error('Error getting nutritional info:', error);
    return NextResponse.json(
      { error: 'Failed to get nutritional information' },
      { status: 500 }
    );
  }
}