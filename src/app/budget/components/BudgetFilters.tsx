import { ChevronDown } from 'lucide-react';
import { Button } from '../../shared/ui/button';
import { Checkbox } from '../../shared/ui/checkbox';
import { Label } from '../../shared/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../shared/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../shared/ui/select';

interface BudgetFiltersProps {
  filters: {
    businessGroup: string;
    businessUnits: string[];
    startMonth: number;
    endMonth: number;
  };
  availableUnits: readonly string[];
  allGroups: readonly string[];
  isReadOnly?: boolean;
  viewMode: 'consolidado' | 'por_unidade';
  onViewModeChange: (mode: 'consolidado' | 'por_unidade') => void;
  onFilterChange: (key: string, value: string | number | string[]) => void;
  onClear: () => void;
  onSave: () => void;
  onSearch: () => void;
}

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

function getUnitsLabel(selectedUnits: string[]) {
  if (!selectedUnits || selectedUnits.length === 0) {
    return 'Todas as unidades';
  }

  if (selectedUnits.length === 1) {
    return selectedUnits[0];
  }

  return `${selectedUnits.length} unidades selecionadas`;
}

export function BudgetFilters({
  filters,
  availableUnits,
  allGroups,
  isReadOnly = false,
  viewMode,
  onViewModeChange,
  onFilterChange,
  onClear,
  onSave,
  onSearch,
}: BudgetFiltersProps) {
  const selectedUnitsLabel = getUnitsLabel(filters.businessUnits);

  const toggleUnit = (unit: string) => {
    const nextUnits = filters.businessUnits.includes(unit)
      ? filters.businessUnits.filter((currentUnit) => currentUnit !== unit)
      : [...filters.businessUnits, unit];

    onFilterChange('businessUnits', nextUnits);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="grid grid-cols-4 gap-6 mb-6">
        <div className="space-y-2">
          <Label htmlFor="businessGroup" className="text-sm font-medium text-gray-700">
            Grupo de Negócio
          </Label>
          <Select
            value={filters.businessGroup || '__all__'}
            onValueChange={(value) =>
              onFilterChange('businessGroup', value === '__all__' ? '' : value)
            }
            disabled={isReadOnly}
          >
            <SelectTrigger id="businessGroup" className="w-full">
              <SelectValue placeholder="Todos os grupos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos os grupos</SelectItem>
              {allGroups.map((group) => (
                <SelectItem key={group} value={group}>
                  {group}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">
            Unidades de Negócio
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={isReadOnly}
                className="border-input data-[placeholder]:text-muted-foreground flex w-full items-center justify-between gap-2 rounded-md border bg-input-background px-3 py-2 text-sm whitespace-nowrap ring-offset-background transition-[color,box-shadow] outline-none hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 h-9"
              >
                <span className="min-w-0 flex-1 truncate text-left">
                  {selectedUnitsLabel}
                </span>
                <ChevronDown className="size-4 shrink-0 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-[var(--radix-popover-trigger-width)] p-0"
            >
              <div className="border-b border-slate-100 px-3 py-2">
                <div className="text-sm font-medium text-slate-900">
                  Selecione as unidades
                </div>
                <div className="text-xs text-slate-500">
                  Nenhuma selecionada = todas as unidades
                </div>
              </div>
              <div className="max-h-64 space-y-2 overflow-y-auto px-3 py-3">
                {availableUnits.length === 0 ? (
                  <div className="text-sm text-slate-400">Nenhuma unidade disponível</div>
                ) : (
                  availableUnits.map((unit) => (
                    <label
                      key={unit}
                      className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Checkbox
                        checked={filters.businessUnits.includes(unit)}
                        onCheckedChange={() => toggleUnit(unit)}
                        disabled={isReadOnly}
                      />
                      <span className="truncate">{unit}</span>
                    </label>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="startMonth" className="text-sm font-medium text-gray-700">
            Mês Inicial
          </Label>
          <Select
            value={filters.startMonth.toString()}
            onValueChange={(value) => onFilterChange('startMonth', parseInt(value))}
            disabled={isReadOnly}
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
            disabled={isReadOnly}
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
        {!isReadOnly ? (
          <Button
            onClick={() =>
              onViewModeChange(
                viewMode === 'consolidado' ? 'por_unidade' : 'consolidado',
              )
            }
            variant="outline"
            className="px-8 border-gray-300 hover:bg-gray-50"
          >
            {viewMode === 'consolidado'
              ? 'Visualizar por unidade'
              : 'Visualizar consolidado'}
          </Button>
        ) : null}
        <Button
          onClick={onSave}
          variant="outline"
          className="px-8 border-gray-300 hover:bg-gray-50"
        >
          Salvar
        </Button>
        {!isReadOnly ? (
          <Button
            onClick={onClear}
            variant="outline"
            className="px-8 border-gray-300 hover:bg-gray-50"
          >
            Limpar
          </Button>
        ) : null}
        {!isReadOnly ? (
          <Button
            onClick={onSearch}
            className="px-8 bg-[#0066A1] hover:bg-[#005080] text-white"
          >
            Buscar
          </Button>
        ) : null}
      </div>
    </div>
  );
}
