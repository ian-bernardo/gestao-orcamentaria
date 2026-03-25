import { BudgetRow } from '../types/budget';
import { parseCSVData } from '../utils/csvParser';

export async function generateMockData(): Promise<BudgetRow[]> {
  return parseCSVData();
}
