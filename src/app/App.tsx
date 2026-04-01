'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { BudgetHeader } from './components/BudgetHeader';
import { BudgetFilters } from './components/BudgetFilters';
import { BudgetTable } from './components/BudgetTable';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './components/ui/dialog';
import { Button } from './components/ui/button';
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

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenSaveModal = () => setIsSaveModalOpen(true);
  const handleCloseSaveModal = () => setIsSaveModalOpen(false);

  const handleConfirmSave = () => {
    setIsSaving(true);

    try {
      console.log('Salvando dados...', budgetData);
      toast.success('Dados salvos com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
      toast.error('Nao foi possivel salvar os dados.');
    } finally {
      setIsSaving(false);
      setIsSaveModalOpen(false);
    }
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
          onSave={handleOpenSaveModal}
          onSearch={handleSearch}
        />

        <Dialog open={isSaveModalOpen} onOpenChange={setIsSaveModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar salvamento</DialogTitle>
              <DialogDescription>
                Deseja salvar as alterações realizadas?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleCloseSaveModal}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button onClick={handleConfirmSave} disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Confirmar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
              filters={filters}
            />
          )}
        </div>
      </div>
    </div>
  );
}
