import { useState, useRef, useEffect } from 'react';

interface EditableCellProps {
  value: string | number;
  type?: 'text' | 'date' | 'number';
  className?: string;
  onSave: (newValue: string | number) => Promise<void>;
  readOnly?: boolean;
}

export default function EditableCell({
  value,
  type = 'text',
  className = '',
  onSave,
  readOnly = false
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    if (!readOnly) {
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      alert('Erreur lors de la sauvegarde');
      setEditValue(value); // Restaurer la valeur d'origine
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  const handleBlur = () => {
    handleSave();
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={editValue}
        onChange={(e) => setEditValue(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={`w-full px-2 py-1 border-2 border-blue-500 rounded focus:outline-none ${className}`}
        disabled={isSaving}
        step={type === 'number' ? '0.01' : undefined}
      />
    );
  }

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className={`cursor-pointer hover:bg-blue-50 px-2 py-1 rounded ${className} ${readOnly ? 'cursor-default' : ''}`}
      title={readOnly ? '' : 'Double-cliquer pour modifier'}
    >
      {type === 'number' && typeof value === 'number'
        ? value.toFixed(2)
        : value || '-'}
    </div>
  );
}
