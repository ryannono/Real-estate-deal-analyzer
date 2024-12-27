import ExpenseCalculationService from "./ExpenseCalculationService";
import FormattingService from "./FormattingService";
import MortgageCalculationService from "./MortgageCalculationService";
import ReturnCalculationService from "./ReturnCalculationService";
import { RealEstateDeal, RealEstateDealBuilder } from './RealEstateDealBuilder';

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
  private readonly formattingService = new FormattingService();

  private mortgageService!: MortgageCalculationService;

  private expenseService!: ExpenseCalculationService;

  private returnService!: ReturnCalculationService;

  private purchasePrice: number;

  constructor(private readonly deal: RealEstateDeal) {
    this.purchasePrice = deal.salePrice;
    this.analyzeDeal();
  }

  /**
   * Analyzes the real estate deal by initializing and calculating the required services.
   *
   * @remarks
   * This function initializes the mortgage, expense, and return calculation services using the provided
   * real estate deal and purchase price. It then returns the instance of the RealEstateDealAnalyser class.
   *
   * @returns {this} - Returns the instance of the RealEstateDealAnalyser class with initialized services.
   */
  private analyzeDeal(): this {
    this.mortgageService = new MortgageCalculationService(
      this.deal,
      this.purchasePrice
    );
    this.expenseService = new ExpenseCalculationService(
      this.deal,
      this.purchasePrice,
      this.mortgageService
    );
    this.returnService = new ReturnCalculationService(
      this.deal,
      this.purchasePrice,
      this.mortgageService,
      this.expenseService
    );

    return this;
  }

  /**
   * Checks the deal criteria based on average yield, average cashflow, and average COC ROI.
   *
   * @remarks
   * This function calculates the average yield, average cashflow, and average COC ROI using the
   * services provided. It compares these values with the minimum criteria defined in the
   * `FINANCIAL_CONSTANTS` object.
   *
   * @returns {'max' | 'low' | 'high'} - Returns 'max' if purchase price is at
   * the highest allowable value, 'low' if purchase price is lower than the
   * highest allowable value, and high if the purchase price is past the highest
   * allowable value; where allowable value is a purchase price where all minimu
   * deal criterion are met.
   */
  private checkDealCriteria(): 'max' | 'low' | 'high' {
    this.analyzeDeal();

    const { avgYield } = this.returnService.getReturns();
    const { avgCashflow } = this.returnService.getCashflows();
    const avgCOCROI = this.returnService.getAvgCOCROI();

    const minimumROI = FINANCIAL_CONSTANTS.MINIMUM_ROI;
    const minimumCashflow =
      FINANCIAL_CONSTANTS.MINIMUM_MONTHLY_CASHFLOW_PER_DOOR *
      this.deal.unitCount *
      12;
    const minimumCOCROI = FINANCIAL_CONSTANTS.MINIMUM_COC_ROI;

    if (
      avgYield >= minimumROI &&
      avgCashflow >= minimumCashflow &&
      avgCOCROI >= minimumCOCROI
    ) {
      return Math.floor(avgCashflow) === minimumCashflow ? 'max' : 'low';
    }

    return 'high';
  }

  /**
   * Adjusts the purchase price to the maximum allowable value while maintaining the minimum deal criteria.
   *
   * This function uses a binary search algorithm to find the maximum purchase price that satisfies the minimum
   * average yield, average cashflow, and average COC ROI criteria. It starts with a purchase price of 1 and doubles
   * the price until the deal criteria are no longer met to find the upper
   * bound. Then, it performs a binary search to find the exact maximum price
   * between 0 and the upper bound.
   *
   * @returns {this} - Returns the instance of the RealEstateDealAnalyser class with the adjusted purchase price.
   */
  adjustToMaxPurchasePrice(): this {
    this.purchasePrice = 1;

    while (this.checkDealCriteria() !== 'high') {
      this.purchasePrice *= 2;
    }

    let left = 0;
    let right = this.purchasePrice;

    while (left <= right) {
      const middle = Math.floor((left + right) / 2);
      this.purchasePrice = middle;

      const dealAnalysisResult = this.checkDealCriteria();

      if (dealAnalysisResult === 'max') {
        break;
      } else if (dealAnalysisResult === 'high') {
        right = middle - 1;
      } else{
        left = middle + 1;
      }
    }

    this.purchasePrice = right;

    return this.analyzeDeal();
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
    this.purchasePrice = this.deal.salePrice;
    this.analyzeDeal();
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
    const isPurchasePriceAdjusted = this.purchasePrice !== this.deal.salePrice;

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
        : `Sale Price Analysis @ ${formatCurrency(this.deal.salePrice)}`,

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
              value: this.deal.monthlyRent * 12,
              note: `from ${this.deal.unitCount} unit(s)`,
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

let deal = new RealEstateDealBuilder()
  .setSalePrice(372000)
  .setDownpaymentPercentage(20)
  .setAnnualMortgageInterestRate(4.39)
  .setMortgageAmortization(25)
  .setPropertyTaxRate(1)
  .setMonthlyHoaDues(0)
  .setVacancyRate(2.3)
  .setMonthlyRent(4400)
  .setLandlordPaidUtilities(true)
  .setNeedsPropertyManagement(false)
  .setUnitCount(2)
  .setNewConstruction(false)
  .build();

const analyser = new RealEstateDealAnalyser(deal).adjustToMaxPurchasePrice();

console.log(analyser.getFullResultsMarkdown());
