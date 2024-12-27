# Real Estate Deal Analyzer

## Overview
The **Real Estate Deal Analyzer** is a TypeScript-based tool designed to evaluate real estate investment opportunities. It provides comprehensive calculations, including expenses, returns, and appreciation metrics, helping investors make data-driven decisions.

## Features
- **Expense Analysis**: Calculates operational costs associated with the property.
- **Return Calculation**: Computes metrics such as ROI and cash flow.
- **Mortgage and Loan Analysis**: Evaluates mortgage payments and financial feasibility.
- **Formatting Tools**: Ensures output data is clean and user-friendly.

## File Structure

### 1. RealEstateDealAnalyser.ts
- **Purpose**: Serves as the core analyzer that integrates other services.
- **Dependencies**:
  - `ExpenseCalculationService`: Handles expense computations.
  - `FormattingService`: Formats outputs.
  - `MortgageCalculationService`: Evaluates mortgage-related metrics.
  - `ReturnCalculationService`: Calculates returns and appreciation.
- **Key Class**: `RealEstateDealAnalyser`

### 2. ReturnCalculationService.ts
- **Purpose**: Focuses on return metrics like appreciation and ROI.
- **Key Methods**:
  - `getInitialMetrics`: Initializes financial calculations.
  - `calculateAppreciation`: Handles appreciation projections.
- **Key Class**: `ReturnCalculationService`

### 3. ExpenseCalculationService.ts
- **Purpose**: Calculates operating expenses based on property data.
- **Key Class**: `ExpenseCalculationService`

### 4. FormattingService.ts
- **Purpose**: Provides formatting utilities for output.
- **Key Classes**:
  - `FormattingError`: Handles errors related to formatting.
  - `FormattingService`: Formats output data.

## Installation
1. Clone this repository:
   ```bash
   git clone https://github.com/ryannono/Real-estate-deal-analyzer.git
   ```
2. Run TypeScript files:
   ```bash
   npx ts-node ./RealEstateDealAnalyser.ts
   ```

## Usage
```typescript
import RealEstateDealAnalyser from './RealEstateDealAnalyser';

let inputs: RealestateAnalysisInput = {
  salePrice: 372000,
  downpaymentPercentage: 20,
  annualMortgageInterestRate: 4.92,
  mortgageAmortization: 25,
  propertyTaxRate: 1,
  monthlyHoaDues: 0,
  vacancyRate: 2.6,
  monthlyRent: 4400,
  landlordPaidUtilities: true,
  needsPropertyManagement: false,
  unitCount: 2,
  newConstruction: false,
};

const analyser = new RealEstateDealAnalyser(inputs).adjustToMaxPurchasePrice();

console.log(analyser.getFullResultsMarkdown());
```

## Dependencies
- TypeScript
- Node.js
