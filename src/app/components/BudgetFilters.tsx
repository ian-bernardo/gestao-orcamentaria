import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface BudgetFiltersProps {
  filters: {
    businessGroup: string;
    businessUnit: string;
    startMonth: number;
    endMonth: number;
  };
  onFilterChange: (key: string, value: any) => void;
  onClear: () => void;
  onSave: () => void;
  onSearch: () => void;
}

const businessGroups = [
  'Grupo Norte',
  'Grupo Sul',
  'Grupo Leste',
  'Grupo Oeste',
  'Grupo Central',
];

const businessUnits = [
  'Unit 1000 - Divisão Norte',
  'Unit 2000 - Divisão Sul',
  'Unit 3000 - Divisão Leste',
  'Unit 4000 - Divisão Oeste',
];

const months = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

export function BudgetFilters({
  filters,
  onFilterChange,
  onClear,
  onSave,
  onSearch,
}: BudgetFiltersProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="grid grid-cols-4 gap-6 mb-6">
        <div className="space-y-2">
          <Label htmlFor="businessGroup" className="text-sm font-medium text-gray-700">
            Grupo de Negócio
          </Label>
          <Select
            value={filters.businessGroup}
            onValueChange={(value) => onFilterChange('businessGroup', value)}
          >
            <SelectTrigger id="businessGroup" className="w-full">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {businessGroups.map((group) => (
                <SelectItem key={group} value={group}>
                  {group}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="businessUnit" className="text-sm font-medium text-gray-700">
            Unidade de Negócio
          </Label>
          <Select
            value={filters.businessUnit}
            onValueChange={(value) => onFilterChange('businessUnit', value)}
          >
            <SelectTrigger id="businessUnit" className="w-full">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {businessUnits.map((unit) => (
                <SelectItem key={unit} value={unit}>
                  {unit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="startMonth" className="text-sm font-medium text-gray-700">
            Mês Inicial
          </Label>
          <Select
            value={filters.startMonth.toString()}
            onValueChange={(value) => onFilterChange('startMonth', parseInt(value))}
          >
            <SelectTrigger id="startMonth" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value.toString()}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="endMonth" className="text-sm font-medium text-gray-700">
            Mês Final
          </Label>
          <Select
            value={filters.endMonth.toString()}
            onValueChange={(value) => onFilterChange('endMonth', parseInt(value))}
          >
            <SelectTrigger id="endMonth" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value.toString()}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          onClick={onSave}
          variant="outline"
          className="px-8 border-gray-300 hover:bg-gray-50"
        >
          Salvar
        </Button>
        <Button
          onClick={onClear}
          variant="outline"
          className="px-8 border-gray-300 hover:bg-gray-50"
        >
          Limpar
        </Button>
        <Button
          onClick={onSearch}
          className="px-8 bg-[#0066A1] hover:bg-[#005080] text-white"
        >
          Buscar
        </Button>
      </div>
    </div>
  );
}
