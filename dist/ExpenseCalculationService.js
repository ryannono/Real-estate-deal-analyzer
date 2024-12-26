"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const RealEstateDealAnalyser_1 = require("./RealEstateDealAnalyser");
class ExpenseCalculationService {
    constructor(input, purchasePrice, mortgageService) {
        this.input = input;
        this.purchasePrice = purchasePrice;
        this.mortgageService = mortgageService;
        /**
         * Calculates the closing costs for the real estate purchase.
         * @remarks
         * The closing costs are calculated based on the purchase price and a predefined closing cost rate.
         * @returns The closing costs in dollars.
         */
        this.getClosingCosts = () => {
            return RealEstateDealAnalyser_1.FINANCIAL_CONSTANTS.CLOSING_COST_RATE * this.purchasePrice;
        };
        /**
         * Calculates annual capital expenditure reserve
         * No CapEx needed for properties with HOA dues as major repairs are covered
         * @returns Annual CapEx amount in dollars
         */
        this.getAnnualCapEx = () => {
            return this.input.monthlyHoaDues > 0
                ? 0
                : this.purchasePrice * RealEstateDealAnalyser_1.FINANCIAL_CONSTANTS.CAPEX_RATE;
        };
        /**
         * Calculates annual maintenance costs
         * Rate varies between new and existing construction
         * @returns Annual maintenance costs in dollars
         */
        this.getAnnualMaintenance = () => {
            const rate = this.input.newConstruction
                ? RealEstateDealAnalyser_1.FINANCIAL_CONSTANTS.MAINTENANCE_RATES.NEW_CONSTRUCTION
                : RealEstateDealAnalyser_1.FINANCIAL_CONSTANTS.MAINTENANCE_RATES.EXISTING_CONSTRUCTION;
            return this.purchasePrice * rate;
        };
        /**
         * Calculates annual property insurance cost
         * Condos (with HOA) have fixed rate, others based on purchase price
         * @returns Annual insurance cost in dollars
         */
        this.getAnnualInsurance = () => {
            return this.input.monthlyHoaDues
                ? RealEstateDealAnalyser_1.FINANCIAL_CONSTANTS.CONDO_INSURANCE_RATE
                : this.purchasePrice * RealEstateDealAnalyser_1.FINANCIAL_CONSTANTS.BASE_INSURANCE_RATE;
        };
        /**
         * Calculates annual property management cost
         * Rate varies depending on number of units
         * @returns Annual property management cost in dollars
         */
        this.getAnnualManagement = () => {
            if (!this.input.needsPropertyManagement)
                return 0;
            const { SINGLE_FAMILY, MULTI_FAMILY } = RealEstateDealAnalyser_1.FINANCIAL_CONSTANTS.MANAGEMENT_RATES;
            return (this.input.monthlyRent *
                12 *
                (this.input.unitCount > 4 ? MULTI_FAMILY : SINGLE_FAMILY));
        };
        /**
         * Calculates annual utility cost
         * @returns Annual utility cost in dollars
         */
        this.getAnnualUtilities = () => {
            if (!this.input.landlordPaidUtilities)
                return 0;
            return this.input.unitCount * RealEstateDealAnalyser_1.FINANCIAL_CONSTANTS.UNIT_UTILITY_COST * 12;
        };
        /**
         * Calculates total annual expenses including all operating costs
         * @returns Object containing itemized expenses and total
         */
        this.getAnnualExpenses = () => {
            const annualExpenses = {
                annualMortgagePayment: this.mortgageService.getMonthlyMortgagePayment() * 12,
                annualHoaDues: this.input.monthlyHoaDues * 12,
                annualUtilities: this.getAnnualUtilities(),
                annualPropertyManagement: this.getAnnualManagement(),
                annualCapEx: this.getAnnualCapEx(),
                annualMaintenanceCosts: this.getAnnualMaintenance(),
                annualPropertyTax: this.purchasePrice * (this.input.propertyTaxRate / 100),
                annualPropertyInsurance: this.getAnnualInsurance(),
                annualVacancyCosts: this.input.monthlyRent * 12 * (this.input.vacancyRate / 100),
            };
            return Object.assign(Object.assign({}, annualExpenses), { totalAnnualExpenses: Object.values(annualExpenses).reduce((acc, v) => acc + v, 0) });
        };
    }
}
exports.default = ExpenseCalculationService;
