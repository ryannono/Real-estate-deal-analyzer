import ExpenseCalculationService from "./ExpenseCalculationService";
import FormattingService from "./FormattingService";
import MortgageCalculationService from "./MortgageCalculationService";
import ReturnCalculationService from "./ReturnCalculationService";

export interface RealestateAnalysisInput {
  salePrice: number;
  downpaymentPercentage: number;
  annualMortgageInterestRate: number;
  mortgageAmortization: number;
  propertyTaxRate: number;
  monthlyHoaDues: number;
  vacancyRate: number;
  monthlyRent: number;
  landlordPaidUtilities: boolean;
  needsPropertyManagement: boolean;
  unitCount: number;
  newConstruction: boolean;
  closingEquity?: number;
}

export const FINANCIAL_CONSTANTS = {
  /** % of purchase price */
  CLOSING_COST_RATE: 0.032,

  /** annual PMI rate */
  PMI_RATE: 0.0098,

  INVESTMENT_YEAR_TIME_HORIZON: 5,

  APPRECIATION_RATES: {
    /** Home historical appreciation */
    SFH: 0.04,

    /** Rent historical appreciation */
    RENT: 0.025,
  },

  MAINTENANCE_RATES: {
    NEW_CONSTRUCTION: 0.0015, // 0.15% of purchase price
    EXISTING_CONSTRUCTION: 0.0054, // 0.54% of purchase price
  },

  MANAGEMENT_RATES: {
    SINGLE_FAMILY: 0.1, // 10% of annual rent
    MULTI_FAMILY: 0.08, // 0.54% of annual rent
  },

  UNIT_UTILITY_COST: 355,

  /** % of purchase price */
  CAPEX_RATE: 0.01,

  /** % of purchase price */
  BASE_INSURANCE_RATE: 0.0044,

  /** % of purchase price */
  CONDO_INSURANCE_RATE: 450,

  MINIMUM_MONTHLY_CASHFLOW_PER_DOOR: 100,
  MINIMUM_ROI: 0.25, // Double in ~3 years
  MINIMUM_COC_ROI: 0.05,
};

export class RealEstateDealAnalyser {
  private mortgageService!: MortgageCalculationService;

  private expenseService!: ExpenseCalculationService;

  private returnService!: ReturnCalculationService;

  private formattingService!: FormattingService;

  private purchasePrice: number;

  constructor(private readonly input: RealestateAnalysisInput) {
    this.purchasePrice = input.salePrice;
    this.initializeServices();
  }

  /**
   * Initializes the required services for the real estate deal analysis.
   *
   * @remarks
   * This method creates instances of the following services:
   * - MortgageCalculationService
   * - ExpenseCalculationService
   * - ReturnCalculationService
   * - FormattingService
   *
   * The services are used to perform calculations related to mortgage, expenses, returns, and formatting.
   *
   * @returns {void}
   */
  private initializeServices(): void {
    this.mortgageService = new MortgageCalculationService(
      this.input,
      this.purchasePrice
    );
    this.expenseService = new ExpenseCalculationService(
      this.input,
      this.purchasePrice,
      this.mortgageService
    );
    this.returnService = new ReturnCalculationService(
      this.input,
      this.purchasePrice,
      this.mortgageService,
      this.expenseService
    );
    this.formattingService = new FormattingService();
  }

  /**
   * Checks the deal criteria based on average yield, average cashflow, and average COC ROI.
   * Returns 'max' if all criteria are met and the average cashflow equals the minimum cashflow,
   * 'good' if all criteria are met but the average cashflow is higher than the minimum cashflow,
   * and 'bad' if any of the criteria are not met.
   *
   * @returns {'max' | 'good' | 'bad'} - The result of the deal criteria check.
   */
  private checkDealCriteria(): 'max' | 'good' | 'bad' {
    const { avgYield } = this.returnService.getReturns();
    const { avgCashflow } = this.returnService.getCashflows();
    const avgCOCROI = this.returnService.getAvgCOCROI();

    const minimumROI = FINANCIAL_CONSTANTS.MINIMUM_ROI;
    const minimumCashflow =
      FINANCIAL_CONSTANTS.MINIMUM_MONTHLY_CASHFLOW_PER_DOOR *
      this.input.unitCount *
      12;
    const minimumCOCROI = FINANCIAL_CONSTANTS.MINIMUM_COC_ROI;

    if (
      avgYield >= minimumROI &&
      avgCashflow >= minimumCashflow &&
      avgCOCROI >= minimumCOCROI
    ) {
      return Math.floor(avgCashflow) === minimumCashflow ? 'max' : 'good';
    }

    return 'bad';
  }

  /**
   * Adjusts the purchase price to the maximum value that still meets the deal criteria.
   * The method uses a binary search algorithm to find the maximum purchase price.
   *
   * @remarks
   * The method initializes the purchase price to 1 and repeatedly doubles it until the deal criteria are not met.
   * Then, it performs a binary search to find the maximum purchase price that still meets the criteria.
   *
   * @returns {this} - Returns the instance of the RealEstateDealAnalyser for method chaining.
   */
  adjustToMaxPurchasePrice(): this {
    this.purchasePrice = 1;
    this.initializeServices();
    while (this.checkDealCriteria() !== 'bad') {
      this.purchasePrice *= 2;
      this.initializeServices();
    }

    let left = 0;
    let right = this.purchasePrice;

    while (left <= right) {
      const middle = Math.floor((left + right) / 2);
      this.purchasePrice = middle;
      this.initializeServices();

      const dealAnalysisResult = this.checkDealCriteria();

      if (dealAnalysisResult === 'bad') {
        right = middle - 1;
      } else {
        left = middle + 1;
        if (dealAnalysisResult === 'max') break;
      }
    }

    this.purchasePrice = right;
    this.initializeServices();
    return this;
  }

  /**
   * Resets the purchase price adjustment to the original sale price.
   * This method sets the purchase price back to the initial sale price and recalculates the services.
   *
   * @remarks
   * This function is used to reset the purchase price adjustment made by the `adjustToMaxPurchasePrice` method.
   * It ensures that the analysis is performed using the original sale price and not the adjusted purchase price.
   *
   * @returns {void} - The function does not return any value.
   */
  resetPurchasePriceAdjustment = (): void => {
    this.purchasePrice = this.input.salePrice;
    this.initializeServices();
  };

  /**
   * Generates a markdown report containing various financial analysis results.
   *
   * @returns {string} - The markdown report as a string.
   */
  getFullResultsMarkdown = (): string => {
    const timeHorizon = FINANCIAL_CONSTANTS.INVESTMENT_YEAR_TIME_HORIZON;
    const { formatCurrency, formatPercentage, generateMarkdownReport } =
      this.formattingService;
    const isPurchasePriceAdjusted = this.purchasePrice !== this.input.salePrice;

    // expense
    const { totalAnnualExpenses, ...annualExpenseItems } =
      this.expenseService.getAnnualExpenses();

    // cashflow
    const { avgCashflow, cashflows } = this.returnService.getCashflows();

    // appreciation
    const { avgAppreciation } = this.returnService.getAppreciations();

    // principal reductions
    const { avgPrincipalReduction } =
      this.returnService.getPrincipalReductions();

    // return
    const { amounts, yields, avgYield, avgAmount } =
      this.returnService.getReturns();

    return generateMarkdownReport({
      title: isPurchasePriceAdjusted
        ? `Maximum Purchase Price Analysis @ ${formatCurrency(
            this.purchasePrice
          )}`
        : `Sale Price Analysis @ ${formatCurrency(this.input.salePrice)}`,

      sections: [
        {
          title: `Initial investment: ${formatCurrency(
            this.returnService.getInitialInvestment()
          )}`,
          data: {
            downPayment: this.mortgageService.getDownPayment(),
            closingCosts: this.expenseService.getClosingCosts(),
          },
          defaultFormatter: 'currency',
        },
        {
          title: `Annual Expenses: ${formatCurrency(totalAnnualExpenses)}`,
          data: annualExpenseItems,
          defaultFormatter: 'currency',
        },
        {
          title: `Avg Cashflow: ${formatCurrency(avgCashflow)}`,
          data: {
            annualRent: {
              value: this.input.monthlyRent * 12,
              note: `from ${this.input.unitCount} unit(s)`,
            },
            annualExpenses: {
              value:
                this.expenseService.getAnnualExpenses().totalAnnualExpenses,
            },
          },
          defaultFormatter: 'currency',
        },
        {
          title: `Avg CoC ROI: ${formatPercentage(
            this.returnService.getAvgCOCROI()
          )}`,
          data: {
            cashflow: {
              value: avgCashflow,
            },
            downPayment: {
              value: this.mortgageService.getDownPayment(),
            },
            closingCosts: {
              value: this.purchasePrice * FINANCIAL_CONSTANTS.CLOSING_COST_RATE,
            },
          },
          defaultFormatter: 'currency',
        },
        {
          title: `Avg Annual Return: ${formatCurrency(avgAmount)}`,
          data: {
            avgCashflow: {
              value: avgCashflow,
            },
            avgPrincipalReduction: {
              value: avgPrincipalReduction,
            },
            avgAppreciation: {
              value: avgAppreciation,
            },
          },
          defaultFormatter: 'currency',
        },
        {
          title: `${timeHorizon} year Average (YoY) ROI: ${formatPercentage(
            avgYield
          )}, ${timeHorizon} year IRR: ${formatPercentage(
            this.returnService.getIRR()
          )}`,
          data: {
            annualROIs: {
              value: yields.map((v) => formatPercentage(v)).join(', '),
            },
            annualReturns: {
              value: amounts.map((v) => formatCurrency(v)).join(', '),
            },
            annualCashflows: {
              value: cashflows.map((v) => formatCurrency(v)).join(', '),
            },
          },
          defaultFormatter: 'currency',
        },
      ],
    });
  };
}

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
