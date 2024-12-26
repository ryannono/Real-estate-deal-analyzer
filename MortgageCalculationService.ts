import { RealestateAnalysisInput, FINANCIAL_CONSTANTS } from "./RealEstateDealAnalyser";

class MortgageCalculationService {
  constructor(
    private input: RealestateAnalysisInput,
    private purchasePrice: number
  ) {}

  /**
   * Calculates the down payment amount based on the purchase price and down payment percentage
   * @returns Down payment amount in dollars
   */
  getDownPayment = (): number => {
    return this.purchasePrice * (this.input.downpaymentPercentage / 100);
  };

  /**
   * Calculates the loan amount after down payment and any closing equity
   * @returns Loan amount in dollars
   */
  getLoanAmount = (): number => {
    const closingEquity = this.input.closingEquity || 0;
    return this.purchasePrice - this.getDownPayment() - closingEquity;
  };

  /**
   * Calculates monthly mortgage payment including PMI if applicable
   * PMI is charged when down payment is less than 20%
   * @returns Monthly mortgage payment in dollars
   */
  getMonthlyMortgagePayment = (): number => {
    const n = this.input.mortgageAmortization * 12;
    const monthlyMortgageInterestRate =
      this.input.annualMortgageInterestRate / 100 / 12;
    const PMI =
      this.input.downpaymentPercentage >= 20
        ? 0
        : (this.purchasePrice * FINANCIAL_CONSTANTS.PMI_RATE) / 12;

    return (
      PMI +
      (this.getLoanAmount() * monthlyMortgageInterestRate) /
        (1 - (1 + monthlyMortgageInterestRate) ** -n)
    );
  };
}

export default MortgageCalculationService;
