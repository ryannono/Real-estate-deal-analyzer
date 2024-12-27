import { FINANCIAL_CONSTANTS } from "./RealEstateDealAnalyser";
import { RealEstateDeal } from "./RealEstateDealBuilder";

class MortgageCalculationService {
  constructor(
    private deal: RealEstateDeal,
    private purchasePrice: number
  ) {}

  /**
   * Calculates the down payment amount based on the purchase price and down payment percentage
   * @returns Down payment amount in dollars
   */
  getDownPayment = (): number => {
    return this.purchasePrice * (this.deal.downpaymentPercentage / 100);
  };

  /**
   * Calculates the loan amount after down payment and any closing equity
   * @returns Loan amount in dollars
   */
  getLoanAmount = (): number => {
    const closingEquity = this.deal.closingEquity || 0;
    return this.purchasePrice - this.getDownPayment() - closingEquity;
  };

  /**
   * Calculates monthly mortgage payment including PMI if applicable
   * PMI is charged when down payment is less than 20%
   * @returns Monthly mortgage payment in dollars
   */
  getMonthlyMortgagePayment = (): number => {
    const n = this.deal.mortgageAmortization * 12;
    const monthlyMortgageInterestRate =
      this.deal.annualMortgageInterestRate / 100 / 12;
    const PMI =
      this.deal.downpaymentPercentage >= 20
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
