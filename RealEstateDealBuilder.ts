export interface RealEstateDeal {
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

/**
 * The `RealEstateDealBuilder` class allows for easy construction of real estate deal
 * objects with customizable parameters.
 */
export class RealEstateDealBuilder {
  private deal: RealEstateDeal;

  constructor() {
    this.deal = {
      salePrice: 0,
      downpaymentPercentage: 20,
      annualMortgageInterestRate: 0,
      mortgageAmortization: 25,
      propertyTaxRate: 1,
      monthlyHoaDues: 0,
      vacancyRate: 2.5,
      monthlyRent: 0,
      landlordPaidUtilities: false,
      needsPropertyManagement: false,
      unitCount: 1,
      newConstruction: false,
    };
  }

  setDeal(partialDeal: Partial<RealEstateDeal>) {
    this.deal = {
      ...this.deal,
      ...partialDeal
    };
    return this;
  }

  setSalePrice(price: number): RealEstateDealBuilder {
    this.deal.salePrice = price;
    return this;
  }

  setDownpaymentPercentage(percentage: number): RealEstateDealBuilder {
    this.deal.downpaymentPercentage = percentage;
    return this;
  }

  setAnnualMortgageInterestRate(rate: number): RealEstateDealBuilder {
    this.deal.annualMortgageInterestRate = rate;
    return this;
  }

  setMortgageAmortization(years: number): RealEstateDealBuilder {
    this.deal.mortgageAmortization = years;
    return this;
  }

  setPropertyTaxRate(rate: number): RealEstateDealBuilder {
    this.deal.propertyTaxRate = rate;
    return this;
  }

  setMonthlyHoaDues(dues: number): RealEstateDealBuilder {
    this.deal.monthlyHoaDues = dues;
    return this;
  }

  setVacancyRate(rate: number): RealEstateDealBuilder {
    this.deal.vacancyRate = rate;
    return this;
  }

  setMonthlyRent(rent: number): RealEstateDealBuilder {
    this.deal.monthlyRent = rent;
    return this;
  }

  setLandlordPaidUtilities(paid: boolean): RealEstateDealBuilder {
    this.deal.landlordPaidUtilities = paid;
    return this;
  }

  setNeedsPropertyManagement(needs: boolean): RealEstateDealBuilder {
    this.deal.needsPropertyManagement = needs;
    return this;
  }

  setUnitCount(count: number): RealEstateDealBuilder {
    this.deal.unitCount = count;
    return this;
  }

  setNewConstruction(isNew: boolean): RealEstateDealBuilder {
    this.deal.newConstruction = isNew;
    return this;
  }

  setClosingEquity(equity: number): RealEstateDealBuilder {
    this.deal.closingEquity = equity;
    return this;
  }

  build(): RealEstateDeal {
    return this.deal;
  }
}
