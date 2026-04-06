import { BudgetRow } from '../budget/types/budget';
import { parseCSVData } from '../budget/utils/csvParser';

export async function generateMockData(): Promise<BudgetRow[]> {
  return parseCSVData();
}
