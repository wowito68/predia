import React, { useState, useEffect } from 'react';
import CreatableSelect from 'react-select/creatable';
import { useTheme } from 'next-themes';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Option {
  label: string;
  value: string;
}

interface CreatableSelectAPIProps {
  endpoint: string; // Ej: '/api/catalogos/alergias'
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  idKey?: string; // Ej: 'id_alergia'
  nameKey?: string; // Ej: 'alergeno' o 'nombre'
}

export function CreatableSelectAPI({ endpoint, value, onChange, placeholder = "Buscar o crear...", idKey = "id", nameKey = "nombre" }: CreatableSelectAPIProps) {
  const { theme } = useTheme();
  const [options, setOptions] = useState<Option[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);

  useEffect(() => {
    fetchOptions();
  }, [endpoint]);

  useEffect(() => {
    // Sync state from outside
    if (value && options.length > 0) {
      const match = options.find(o => o.value === value || o.label.toLowerCase() === value.toLowerCase());
      if (match) setSelectedOption(match);
      else setSelectedOption({ label: value, value: value });
    } else if (!value) {
      setSelectedOption(null);
    }
  }, [value, options]);

  const fetchOptions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(endpoint);
      const data = await res.json();
      if (data.success) {
        const mapped = data.data.map((item: any) => ({
          label: item[nameKey],
          value: String(item[idKey] || item[nameKey]) // Fallback to name if ID is missing or if we just want to save the name
        }));
        setOptions(mapped);
      }
    } catch (e) {
      console.error("Error fetching options", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (inputValue: string) => {
    setIsCreating(true);
    try {
      // Validate empty
      if (!inputValue.trim()) return;

      const normalized = inputValue.trim();

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [nameKey]: normalized })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success("Elemento agregado correctamente");
        const newOption = {
          label: data.data[nameKey],
          value: String(data.data[idKey] || data.data[nameKey])
        };
        setOptions(prev => [...prev, newOption]);
        setSelectedOption(newOption);
        onChange(newOption.value);
      } else {
        toast.error(data.error || "Error al crear elemento");
      }
    } catch (e) {
      toast.error("Error de conexión al crear");
    } finally {
      setIsCreating(false);
    }
  };

  const handleChange = (newValue: any) => {
    setSelectedOption(newValue);
    onChange(newValue ? newValue.value : '');
  };

  // Custom styles to match Shadcn UI
  const isDark = theme === 'dark' || (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
  const customStyles = {
    control: (base: any, state: any) => ({
        ...base,
        backgroundColor: 'transparent',
        borderColor: isDark ? 'hsl(var(--input))' : 'hsl(var(--input))',
        borderRadius: 'calc(var(--radius) - 2px)',
        minHeight: '36px',
        boxShadow: state.isFocused ? '0 0 0 2px hsl(var(--ring) / 0.4)' : 'none',
        '&:hover': {
            borderColor: 'hsl(var(--ring) / 0.5)'
        }
    }),
    input: (base: any) => ({
        ...base,
        color: 'hsl(var(--foreground))'
    }),
    singleValue: (base: any) => ({
        ...base,
        color: 'hsl(var(--foreground))'
    }),
    menu: (base: any) => ({
        ...base,
        backgroundColor: 'hsl(var(--popover))',
        border: '1px solid hsl(var(--border))',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        zIndex: 50
    }),
    option: (base: any, state: any) => ({
        ...base,
        backgroundColor: state.isFocused ? 'hsl(var(--accent))' : 'transparent',
        color: state.isFocused ? 'hsl(var(--accent-foreground))' : 'hsl(var(--foreground))',
        cursor: 'pointer',
        '&:active': {
            backgroundColor: 'hsl(var(--accent))'
        }
    }),
    placeholder: (base: any) => ({
        ...base,
        color: 'hsl(var(--muted-foreground))'
    })
  };

  return (
    <div className="relative w-full">
      <CreatableSelect
        isClearable
        isDisabled={isLoading || isCreating}
        isLoading={isLoading || isCreating}
        onChange={handleChange}
        onCreateOption={handleCreate}
        options={options}
        value={selectedOption}
        styles={customStyles}
        placeholder={placeholder}
        formatCreateLabel={(inputValue) => `➕ Crear "${inputValue}"`}
        noOptionsMessage={() => "No se encontraron resultados"}
      />
    </div>
  );
}
