import { useEffect, useState } from 'react';
import { BudgetHeader } from './components/BudgetHeader';
import { BudgetFilters } from './components/BudgetFilters';
import { BudgetTable } from './components/BudgetTable';
import { generateMockData } from './data/mockData';
import { BudgetRow } from './types/budget';

export default function App() {
  const [filters, setFilters] = useState({
    businessGroup: '',
    businessUnit: '',
    startMonth: 1,
    endMonth: 12,
  });
  const [budgetData, setBudgetData] = useState<BudgetRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        setLoadError('');
        setBudgetData(await generateMockData());
      } catch (error) {
        console.error('Erro ao carregar dados do orcamento:', error);
        setLoadError('Nao foi possivel carregar os dados iniciais.');
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();
  }, []);

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClear = () => {
    setFilters({
      businessGroup: '',
      businessUnit: '',
      startMonth: 1,
      endMonth: 12,
    });
  };

  const handleSave = () => {
    console.log('Salvando dados...', budgetData);
    alert('Dados salvos com sucesso!');
  };

  const handleSearch = () => {
    console.log('Buscando com filtros:', filters);

    void generateMockData()
      .then((data) => {
        setLoadError('');
        setBudgetData(data);
      })
      .catch((error) => {
        console.error('Erro ao buscar dados filtrados:', error);
        setLoadError('Nao foi possivel atualizar os dados.');
      });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <BudgetHeader />

      <div className="px-6 py-4">
        <BudgetFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onClear={handleClear}
          onSave={handleSave}
          onSearch={handleSearch}
        />

        <div className="mt-6">
          {loadError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {loadError}
            </div>
          ) : isLoading ? (
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-sm text-gray-500">
              Carregando dados do orcamento...
            </div>
          ) : (
            <BudgetTable
              data={budgetData}
              onDataChange={setBudgetData}
              startMonth={filters.startMonth}
              endMonth={filters.endMonth}
            />
          )}
        </div>
      </div>
    </div>
  );
}
