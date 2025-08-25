# Open Food Facts Integration

This document explains how the Open Food Facts database has been integrated into the Harvest AI Chef application.

## Overview

Open Food Facts is a collaborative, free and open database of food products from around the world. This integration enhances the Harvest AI Chef application with:

- **Real nutritional data** instead of AI estimations alone
- **Product verification** for ingredients
- **Enhanced recipe suggestions** based on actual food products
- **Transparency** about data sources

## New Features

### 1. Enhanced Nutritional Analysis

The `getEnhancedNutritionalAnalysis` function now:
- Searches Open Food Facts for each ingredient
- Uses real nutritional data when available
- Falls back to AI estimation for missing ingredients
- Provides clear source attribution

### 2. Enhanced Recipe Suggestions

The `getEnhancedRecipeSuggestions` function now:
- Includes recipes based on Open Food Facts product data
- Shows confidence scores for ingredient matching
- Combines Open Food Facts data with AI-generated recipes

### 3. Open Food Facts Service

A new service (`OpenFoodFactsService`) provides:
- Product search functionality
- Nutritional information retrieval
- Recipe suggestion based on ingredients
- Ingredient alternatives and substitutions

## API Endpoints

### Test Open Food Facts Search
```
GET /api/test-open-food-facts?q=apple&limit=3
```

### Test Nutritional Information
```
POST /api/test-nutrition
Body: { "ingredient": "banana" }
```

## New Components

### 1. Enhanced Recipe Card
- Shows data source (Open Food Facts vs AI)
- Displays confidence scores
- Enhanced nutritional analysis with real data attribution

### 2. Enhanced Harvest AI Chef
- Settings panel for Open Food Facts preferences
- Visual indicators for data sources
- Improved user experience with real data integration

## Configuration

Users can toggle Open Food Facts integration on/off through the settings panel:
- **Enabled**: Uses real food data when available, falls back to AI
- **Disabled**: Uses AI estimation only

## Data Flow

1. **Ingredient Identification**: AI identifies ingredients from photos
2. **Data Enrichment**: Open Food Facts provides nutritional data
3. **Recipe Generation**: Combines real data with AI creativity
4. **Transparency**: Clear indication of data sources

## Benefits

### For Users
- More accurate nutritional information
- Better ingredient verification
- Transparency about data reliability
- Enhanced recipe suggestions

### For Developers
- Hybrid approach combining AI and real data
- Fallback mechanisms for reliability
- Clear separation of concerns
- Extensible architecture

## Technical Details

### Open Food Facts API
- Base URL: `https://world.openfoodfacts.org`
- Search endpoint: `/cgi/search.pl`
- Product endpoint: `/api/v0/product/{barcode}.json`
- User-Agent: `Harvest-AI-Chef/1.0`

### Data Processing
- Normalizes Open Food Facts responses
- Handles missing or incomplete data
- Combines multiple data sources
- Provides confidence scoring

### Error Handling
- Graceful fallback to AI when API is unavailable
- User-friendly error messages
- Logging for debugging

## Testing

### API Testing
Visit these endpoints to test the integration:
- Product search: `http://localhost:9002/api/test-open-food-facts?q=apple`
- Nutrition test: `http://localhost:9002/api/test-nutrition` (POST)

### Frontend Testing
1. Upload an ingredient photo
2. Check if Open Food Facts data is used
3. Generate recipes and verify data sources
4. Toggle Open Food Facts on/off in settings

## Future Enhancements

1. **Barcode Scanning**: Direct product lookup via barcode
2. **Allergen Information**: Enhanced safety features
3. **Regional Products**: Location-based product suggestions
4. **Offline Caching**: Store frequently used data locally
5. **Product Ratings**: Community-based quality scores

## Contributing to Open Food Facts

Users can contribute to Open Food Facts by:
- Adding missing products
- Completing nutritional information
- Uploading product photos
- Verifying existing data

Visit [https://world.openfoodfacts.org](https://world.openfoodfacts.org) to learn more.

## Compliance

This integration respects Open Food Facts guidelines:
- Proper attribution of data sources
- Reasonable API usage patterns
- User-Agent identification
- Non-commercial usage terms