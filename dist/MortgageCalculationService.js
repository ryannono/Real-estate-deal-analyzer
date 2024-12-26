"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const RealEstateDealAnalyser_1 = require("./RealEstateDealAnalyser");
class MortgageCalculationService {
    constructor(input, purchasePrice) {
        this.input = input;
        this.purchasePrice = purchasePrice;
        /**
         * Calculates the down payment amount based on the purchase price and down payment percentage
         * @returns Down payment amount in dollars
         */
        this.getDownPayment = () => {
            return this.purchasePrice * (this.input.downpaymentPercentage / 100);
        };
        /**
         * Calculates the loan amount after down payment and any closing equity
         * @returns Loan amount in dollars
         */
        this.getLoanAmount = () => {
            const closingEquity = this.input.closingEquity || 0;
            return this.purchasePrice - this.getDownPayment() - closingEquity;
        };
        /**
         * Calculates monthly mortgage payment including PMI if applicable
         * PMI is charged when down payment is less than 20%
         * @returns Monthly mortgage payment in dollars
         */
        this.getMonthlyMortgagePayment = () => {
            const n = this.input.mortgageAmortization * 12;
            const monthlyMortgageInterestRate = this.input.annualMortgageInterestRate / 100 / 12;
            const PMI = this.input.downpaymentPercentage >= 20
                ? 0
                : (this.purchasePrice * RealEstateDealAnalyser_1.FINANCIAL_CONSTANTS.PMI_RATE) / 12;
            return (PMI +
                (this.getLoanAmount() * monthlyMortgageInterestRate) /
                    (1 - (1 + monthlyMortgageInterestRate) ** -n));
        };
    }
}
exports.default = MortgageCalculationService;
