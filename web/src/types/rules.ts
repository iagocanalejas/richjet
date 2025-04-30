import type { PortfolioItem } from "./stock";

// TODO: move repated logic here

export function isTradePortfolioItem(item: PortfolioItem): boolean {
	return item.quantity === 0
}

export function isPortfolioItemWithManualPrice(item: PortfolioItem): boolean {
	return item.manualInputedPrice || item.currentPrice === 0
}
