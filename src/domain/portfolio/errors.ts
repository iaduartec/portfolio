export class PortfolioCalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PortfolioCalculationError";
  }
}
