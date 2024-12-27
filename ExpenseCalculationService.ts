import MortgageCalculationService from "./MortgageCalculationService";
import { FINANCIAL_CONSTANTS } from "./RealEstateDealAnalyser";
import { RealEstateDeal } from "./RealEstateDealBuilder";

class ExpenseCalculationService {
  constructor(
    private deal: RealEstateDeal,
    private purchasePrice: number,
    private mortgageService: MortgageCalculationService
  ) {}

  /**
   * Calculates the closing costs for the real estate purchase.
   * @remarks
   * The closing costs are calculated based on the purchase price and a predefined closing cost rate.
   * @returns The closing costs in dollars.
   */
  getClosingCosts = (): number => {
    return FINANCIAL_CONSTANTS.CLOSING_COST_RATE * this.purchasePrice;
  };

  /**
   * Calculates annual capital expenditure reserve
   * No CapEx needed for properties with HOA dues as major repairs are covered
   * @returns Annual CapEx amount in dollars
   */
  getAnnualCapEx = (): number => {
    return this.deal.monthlyHoaDues > 0
      ? 0
      : this.purchasePrice * FINANCIAL_CONSTANTS.CAPEX_RATE;
  };

  /**
   * Calculates annual maintenance costs
   * Rate varies between new and existing construction
   * @returns Annual maintenance costs in dollars
   */
  getAnnualMaintenance = (): number => {
    const rate = this.deal.newConstruction
      ? FINANCIAL_CONSTANTS.MAINTENANCE_RATES.NEW_CONSTRUCTION
      : FINANCIAL_CONSTANTS.MAINTENANCE_RATES.EXISTING_CONSTRUCTION;
    return this.purchasePrice * rate;
  };

  /**
   * Calculates annual property insurance cost
   * Condos (with HOA) have fixed rate, others based on purchase price
   * @returns Annual insurance cost in dollars
   */
  getAnnualInsurance = (): number => {
    return this.deal.monthlyHoaDues
      ? FINANCIAL_CONSTANTS.CONDO_INSURANCE_RATE
      : this.purchasePrice * FINANCIAL_CONSTANTS.BASE_INSURANCE_RATE;
  };

  /**
   * Calculates annual property management cost
   * Rate varies depending on number of units
   * @returns Annual property management cost in dollars
   */
  getAnnualManagement = (): number => {
    if (!this.deal.needsPropertyManagement) return 0;

    const { SINGLE_FAMILY, MULTI_FAMILY } =
      FINANCIAL_CONSTANTS.MANAGEMENT_RATES;
    return (
      this.deal.monthlyRent *
      12 *
      (this.deal.unitCount > 4 ? MULTI_FAMILY : SINGLE_FAMILY)
    );
  };

  /**
   * Calculates annual utility cost
   * @returns Annual utility cost in dollars
   */
  getAnnualUtilities = (): number => {
    if (!this.deal.landlordPaidUtilities) return 0;
    return this.deal.unitCount * FINANCIAL_CONSTANTS.UNIT_UTILITY_COST * 12;
  };

  /**
   * Calculates total annual expenses including all operating costs
   * @returns Object containing itemized expenses and total
   */
  getAnnualExpenses = (): { [key: string]: number } => {
    const annualExpenses = {
      annualMortgagePayment:
        this.mortgageService.getMonthlyMortgagePayment() * 12,
      annualHoaDues: this.deal.monthlyHoaDues * 12,
      annualUtilities: this.getAnnualUtilities(),
      annualPropertyManagement: this.getAnnualManagement(),
      annualCapEx: this.getAnnualCapEx(),
      annualMaintenanceCosts: this.getAnnualMaintenance(),
      annualPropertyTax:
        this.purchasePrice * (this.deal.propertyTaxRate / 100),
      annualPropertyInsurance: this.getAnnualInsurance(),
      annualVacancyCosts:
        this.deal.monthlyRent * 12 * (this.deal.vacancyRate / 100),
    };

    return {
      ...annualExpenses,
      totalAnnualExpenses: Object.values(annualExpenses).reduce(
        (acc, v) => acc + v,
        0
      ),
    };
  };
}

export default ExpenseCalculationService;
