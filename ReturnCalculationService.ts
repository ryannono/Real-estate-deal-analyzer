import {
  FINANCIAL_CONSTANTS,
} from './RealEstateDealAnalyser';
import ExpenseCalculationService from './ExpenseCalculationService';
import MortgageCalculationService from './MortgageCalculationService';
import { RealEstateDeal } from './RealEstateDealBuilder';

class ReturnCalculationService {
  constructor(
    private deal: RealEstateDeal,
    private purchasePrice: number,
    private mortgageService: MortgageCalculationService,
    private expenseService: ExpenseCalculationService
  ) {}

  /**
   * Calculates the average value of a numeric array.
   *
   * @remarks
   * This function takes an array of numbers as deal and returns their average value.
   * If the deal array is empty, the function returns 0.
   *
   * @param arr - The deal array of numbers.
   *
   * @returns The average value of the deal array.
   */
  private static getArrAvg = (arr: number[]): number => {
    return arr.reduce((acc, v) => acc + v, 0) / arr.length;
  };

  /**
   * Calculates the Internal Rate of Return (IRR) for a given set of cash flows.
   * The IRR is the discount rate that makes the net present value (NPV) of all cash flows equal to zero.
   *
   * @remarks
   * This function uses the Newton-Raphson method to iteratively find the IRR.
   * The method starts with an initial guess of 0% (low) and 100% (high) and repeatedly calculates the NPV
   * at the midpoint of the range until the NPV is within a specified tolerance.
   *
   * @param cashflows - An array of cash flows, where each element represents the cash flow at a specific time period.
   * The first element is the initial cash outflow, and subsequent elements represent the cash inflows.
   *
   * @throws Will throw an error if the IRR calculation does not converge within the specified maximum number of iterations.
   *
   * @returns The Internal Rate of Return (IRR) as a decimal value.
   */
  private static calculateIRR = (cashflows: number[]): number => {
    const maxIterations = 1000;
    const tolerance = 1e-6;

    let low = 0;
    let high = 1;

    for (let i = 0; i < maxIterations; i++) {
      const mid = (low + high) / 2;
      const npv = cashflows.reduce(
        (acc, cashflow, index) => acc + cashflow / (1 + mid) ** index,
        0
      );

      if (Math.abs(npv) < tolerance) {
        return mid;
      }
      if (npv < 0) {
        high = mid;
      } else {
        low = mid;
      }
    }

    throw new Error('IRR calculation did not converge');
  };

  /**
   * Calculates the initial metrics for the real estate deal, including annual rent, cash flow, principal paid, appreciation,
   * remaining balance, total principal paid, and total appreciation.
   *
   * @returns An object containing the initial metrics:
   * - annualRent: The initial annual rent in dollars.
   * - cashFlow: The initial cash flow, which is set to 0.
   * - principalPaid: The initial principal paid, which is set to 0.
   * - appreciation: The initial appreciation, which is set to 0.
   * - remainingBalance: The initial remaining mortgage balance.
   * - totalPrincipalPaid: The initial total principal paid, which is set to 0.
   * - totalAppreciation: The initial total appreciation, which is set to 0.
   */
  private getInitialMetrics() {
    return {
      annualRent: this.deal.monthlyRent * 12,
      cashFlow: 0,
      principalPaid: 0,
      appreciation: 0,
      remainingBalance: this.mortgageService.getLoanAmount(),
      totalPrincipalPaid: 0,
      totalAppreciation: 0,
    };
  }

  /**
   * Calculates the annual principal reduction through mortgage payments.
   *
   * @param remainingLoanBalance - The remaining loan balance at the start of the year.
   * If not provided, the current loan amount is used.
   *
   * @returns The annual principal reduction in dollars.
   */
  private calculatePrincipalReduction = (
    remainingLoanBalance = this.mortgageService.getLoanAmount()
  ): number => {
    const annualInterestPayment =
      remainingLoanBalance * (this.deal.annualMortgageInterestRate / 100);

    return (
      this.mortgageService.getMonthlyMortgagePayment() * 12 -
      annualInterestPayment
    );
  };

  /**
   * Calculates the annual appreciation for the real estate deal based on the provided appreciation year.
   *
   * @remarks
   * This function calculates the appreciation for a single-family home (SFH) or a multi-family property (MFH) based on the
   * provided appreciation year. For SFHs, the appreciation is calculated using a fixed rent increase rate. For MFHs,
   * the appreciation is calculated using a gross rent multiplier.
   *
   * @param appreciationYear - The year (relative to the investment period) for which the appreciation is calculated.
   * If not provided, the appreciation for the first year is calculated.
   *
   * @returns The annual appreciation for the real estate deal in dollars. If the appreciation year is less than 1,
   * the function returns 0.
   */
  private calculateAppreciation(appreciationYear = 1) {
    if (appreciationYear < 1) return 0;

    if (this.deal.unitCount > 1) {
      let newRent = this.deal.monthlyRent;
      const rentIncreaseRate = 1 + FINANCIAL_CONSTANTS.APPRECIATION_RATES.RENT;

      for (let year = 1; year <= appreciationYear; year++) {
        newRent *= rentIncreaseRate;
      }

      const prevRent = newRent / rentIncreaseRate;
      const prevValue =
        (prevRent * this.purchasePrice) / this.deal.monthlyRent;
      return (newRent * prevValue) / prevRent - prevValue;
    }

    let prevValue = this.purchasePrice;
    let currValue = prevValue;
    for (let year = 1; year <= appreciationYear; year++) {
      prevValue = currValue;
      currValue *= 1 + FINANCIAL_CONSTANTS.APPRECIATION_RATES.SFH;
    }

    return currValue - prevValue;
  }

  /**
   * Calculates the yearly metrics for the real estate deal, including annual rent, cash flow, principal paid, appreciation,
   * remaining balance, total principal paid, and total appreciation.
   *
   * @param year - The year (relative to the investment period) for which the metrics are calculated.
   * @param prevMetrics - The previous year's metrics. If not provided, the initial metrics are used.
   *
   * @returns An object containing the calculated yearly metrics:
   * - annualRent: The annual rent in dollars.
   * - cashFlow: The cash flow for the year.
   * - principalPaid: The principal paid for the year.
   * - appreciation: The appreciation for the year.
   * - remainingBalance: The remaining mortgage balance at the end of the year.
   * - totalPrincipalPaid: The total principal paid over the investment period.
   * - totalAppreciation: The total appreciation over the investment period.
   */
  private calculateYearlyMetrics = (
    year: number,
    prevMetrics = this.getInitialMetrics()
  ) => {
    const modifiedDeal = { ...this.deal, monthlyRent: prevMetrics.annualRent / 12 };
    const expenseService = new ExpenseCalculationService(
      modifiedDeal,
      this.purchasePrice,
      this.mortgageService
    );

    const cashFlow =
      prevMetrics.annualRent -
      expenseService.getAnnualExpenses().totalAnnualExpenses;
    const annualRent =
      prevMetrics.annualRent *
      (1 + FINANCIAL_CONSTANTS.APPRECIATION_RATES.RENT);
    const principalPaid = this.calculatePrincipalReduction(
      prevMetrics.remainingBalance
    );
    const appreciation = this.calculateAppreciation(year);

    return {
      annualRent,
      cashFlow,
      principalPaid,
      appreciation,
      remainingBalance: prevMetrics.remainingBalance - principalPaid,
      totalPrincipalPaid: prevMetrics.totalPrincipalPaid + principalPaid,
      totalAppreciation: prevMetrics.totalAppreciation + appreciation,
    };
  };

  /**
   * Calculates the initial investment required for the real estate deal.
   * The initial investment is the sum of closing costs and down payment.
   *
   * @returns The initial investment amount in dollars.
   */
  getInitialInvestment = () => {
    return (
      this.expenseService.getClosingCosts() +
      this.mortgageService.getDownPayment()
    );
  };

  /**
   * Calculates the cash flows for each year of the investment period, including the initial investment, annual cash flows,
   * and gained equity at the end of the investment period.
   *
   * @remarks
   * The cash flows are calculated based on the initial investment, annual rent, expenses, principal paid, and appreciation.
   * The function iterates over the investment period, calculating the yearly metrics and updating the cash flows array.
   * The gained equity is added to the last year of the investment period.
   *
   * @returns An object containing the following properties:
   * - cashflows: An array of cash flows for each year, including the initial
   *   investment, and the gained equity at the end of the period.
   * - trueCashflows: An array of annual cash flows, excluding the initial
   *   investment, and the gained equity.
   * - avgCashflow: The average ~true~ annual cash flow over the investment period.
   */
  getCashflows() {
    const years = FINANCIAL_CONSTANTS.INVESTMENT_YEAR_TIME_HORIZON;
    const cashflows = [-this.getInitialInvestment()];

    let metrics = this.getInitialMetrics();
    let gainedEquity = 0;

    for (let year = 1; year <= years; year++) {
      metrics = this.calculateYearlyMetrics(year, metrics);
      cashflows.push(metrics.cashFlow);
      gainedEquity = metrics.totalPrincipalPaid + metrics.totalAppreciation;
    }

    const trueCashflows = cashflows.slice(1);

    // Add gained equity to the last year of the investment period.
    cashflows[years] += gainedEquity;

    return {
      cashflows,
      trueCashflows,
      avgCashflow: ReturnCalculationService.getArrAvg(trueCashflows),
    };
  }

  /**
   * Calculates the returns for each year of the investment period, including yield, amount, average yield, and average amount.
   *
   * @returns An object containing the following properties:
   * - yields: An array of annual yields as decimal values.
   * - avgYield: The average yield over the investment period.
   * - amounts: An array of annual amounts in dollars.
   * - avgAmount: The average amount over the investment period.
   */
  getReturns = () => {
    const years = FINANCIAL_CONSTANTS.INVESTMENT_YEAR_TIME_HORIZON;
    const initialInvestment = this.getInitialInvestment();
    const returns: { yields: number[]; amounts: number[] } = { yields: [], amounts: [] };

    let metrics = this.getInitialMetrics();

    for (let year = 1; year <= years; year++) {
      metrics = this.calculateYearlyMetrics(year, metrics);

      const annualReturn =
        metrics.cashFlow + metrics.principalPaid + metrics.appreciation;

      returns.amounts.push(annualReturn);
      returns.yields.push(annualReturn / initialInvestment);
    }

    return {
      ...returns,
      avgYield: ReturnCalculationService.getArrAvg(returns.yields),
      avgAmount: ReturnCalculationService.getArrAvg(returns.amounts),
    };
  };

  /**
   * Calculates the annual principal reductions through mortgage payments over the investment period.
   *
   * @returns An object containing the following properties:
   * - principalReductions: An array of annual principal reductions in dollars.
   * - avgPrincipalReduction: The average annual principal reduction over the investment period.
   * - totalPrincipalPaid: The total principal paid over the investment period.
   */
  getPrincipalReductions = () => {
    const years = FINANCIAL_CONSTANTS.INVESTMENT_YEAR_TIME_HORIZON;
    const principalReductions = [];

    let metrics = this.getInitialMetrics();

    for (let year = 1; year <= years; year++) {
      metrics = this.calculateYearlyMetrics(year, metrics);
      principalReductions.push(metrics.principalPaid);
    }

    return {
      principalReductions,
      avgPrincipalReduction:
        ReturnCalculationService.getArrAvg(principalReductions),
      totalPrincipalPaid: metrics.totalPrincipalPaid,
    };
  };

  /**
   * Calculates the appreciation for each year of the investment period.
   *
   * @remarks
   * This function iterates over the investment period, calculating the yearly appreciation
   * by calling the `calculateYearlyMetrics` method and accumulating the appreciation values.
   *
   * @returns An object containing the following properties:
   * - appreciations: An array of annual appreciation values in dollars.
   * - avgAppreciation: The average annual appreciation over the investment period.
   * - totalPrincipalPaid: The total principal paid over the investment period.
   */
  getAppreciations = () => {
    const years = FINANCIAL_CONSTANTS.INVESTMENT_YEAR_TIME_HORIZON;
    const appreciations = [];

    let metrics = this.getInitialMetrics();

    for (let year = 1; year <= years; year++) {
      metrics = this.calculateYearlyMetrics(year, metrics);
      appreciations.push(metrics.appreciation);
    }

    return {
      appreciations,
      avgAppreciation: ReturnCalculationService.getArrAvg(appreciations),
      totalPrincipalPaid: metrics.totalPrincipalPaid,
    };
  };

  /**
   * Calculates the average Cash on Cash Return on Investment (COCROI) for the real estate deal.
   * COCROI is a measure of the return on investment, taking into account both
   * cash flows and the initial investment.
   *
   * @returns The average COCROI as a decimal value.
   */
  getAvgCOCROI = (): number => {
    return this.getCashflows().avgCashflow / this.getInitialInvestment();
  };

  /**
   * Calculates the Internal Rate of Return (IRR) for the real estate deal.
   * The IRR is the discount rate that makes the net present value (NPV) of all cash flows equal to zero.
   *
   * @throws Will throw an error if the IRR calculation does not converge within the specified maximum number of iterations.
   *
   * @returns The Internal Rate of Return (IRR) as a decimal value.
   */
  getIRR(): number {
    try {
      const irr = ReturnCalculationService.calculateIRR(
        this.getCashflows().cashflows
      );
      if (irr === undefined || Number.isNaN(irr)) {
        throw new Error('IRR calculation did not produce a valid result');
      }
      return irr;
    } catch (error) {
      return 0;
    }
  }
}

export default ReturnCalculationService;
