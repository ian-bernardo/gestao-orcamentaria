'use client';

import { Check, UserRound } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../../shared/ui/popover';
import { useState } from 'react';

type UserType = 'gestor' | 'financeiro';

interface UserSwitcherProps {
  userType: UserType;
  onChange: (userType: UserType) => void;
  onFillPropostaOrcamento?: () => void;
  onResetPropostaOrcamento?: () => void;
}

const options: Array<{ value: UserType; label: string }> = [
  { value: 'gestor', label: 'Gestor' },
  { value: 'financeiro', label: 'Financeiro' },
];

export function UserSwitcher({
  userType,
  onChange,
  onFillPropostaOrcamento,
  onResetPropostaOrcamento,
}: UserSwitcherProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-6 left-6 z-[9999]">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Selecionar tipo de usuario"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <UserRound className="h-4 w-4" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          side="top"
          align="center"
          sideOffset={8}
          className="w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
        >
          <div className="px-2 pb-2 pt-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Tipo de usuario
            </div>
          </div>

          <div className="space-y-1">
            {options.map((option) => {
              const isActive = option.value === userType;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false); // 🔥 fecha ao selecionar
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-sky-50 text-sky-700'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-medium">{option.label}</span>
                  {isActive ? <Check className="h-4 w-4" /> : null}
                </button>
              );
            })}
          </div>

          {userType === 'financeiro' ? (
            <>
              <div className="mx-2 my-2 h-px bg-slate-200" />

              <div className="px-2 pb-2 pt-1">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Ações
                </div>
              </div>

              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    onResetPropostaOrcamento?.();
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-amber-800 transition-colors hover:bg-amber-50"
                >
                  <span className="font-medium">
                    Zerar Proposta e Orçamento
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onFillPropostaOrcamento?.();
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-emerald-800 transition-colors hover:bg-emerald-50"
                >
                  <span className="font-medium">
                    Preencher Proposta e Orçamento
                  </span>
                </button>
              </div>
            </>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
}
