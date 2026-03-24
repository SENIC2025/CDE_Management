import { useState } from 'react';
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Copy,
  AlertCircle,
  Package
} from 'lucide-react';
import { TEMPLATE_FIELDS } from '../../lib/knowledgeData';
import type { TemplateFieldDef } from '../../lib/knowledgeData';
import { ConfirmDialog } from '../ui';
import useConfirm from '../../hooks/useConfirm';

interface TemplateBuilderProps {
  category: string;
  items: Record<string, any>[];
  onChange: (items: Record<string, any>[]) => void;
}

export default function TemplateBuilder({ category, items, onChange }: TemplateBuilderProps) {
  const [collapsedItems, setCollapsedItems] = useState<Set<number>>(new Set());
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [confirmProps, confirmDialog] = useConfirm();

  const fields: TemplateFieldDef[] = TEMPLATE_FIELDS[category] || [];

  if (fields.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No structured fields defined for the "{category}" category.</p>
        <p className="text-xs mt-1">Use the raw JSON editor below to define template content.</p>
      </div>
    );
  }

  function addItem() {
    const newItem: Record<string, any> = {};
    fields.forEach(f => {
      if (f.type === 'number') newItem[f.key] = '';
      else if (f.type === 'select' && f.options && f.options.length > 0) newItem[f.key] = f.options[0].value;
      else newItem[f.key] = '';
    });
    onChange([...items, newItem]);
  }

  function duplicateItem(index: number) {
    const clone = { ...items[index] };
    const updated = [...items];
    updated.splice(index + 1, 0, clone);
    onChange(updated);
  }

  function updateItem(index: number, key: string, value: any) {
    const updated = [...items];
    updated[index] = { ...updated[index], [key]: value };
    onChange(updated);
  }

  async function removeItem(index: number) {
    if (items.length === 1) {
      const ok = await confirmDialog({ title: 'Remove last item?', message: 'The template will be empty after this.', variant: 'warning' });
      if (!ok) return;
    }
    onChange(items.filter((_, i) => i !== index));
  }

  function moveItem(index: number, direction: 'up' | 'down') {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;
    const updated = [...items];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    onChange(updated);
  }

  function toggleCollapse(index: number) {
    const next = new Set(collapsedItems);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setCollapsedItems(next);
  }

  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const updated = [...items];
    const [dragged] = updated.splice(draggedIndex, 1);
    updated.splice(index, 0, dragged);
    onChange(updated);
    setDraggedIndex(index);
  }

  function handleDragEnd() {
    setDraggedIndex(null);
  }

  // Get a label for collapsed items
  function getItemLabel(item: Record<string, any>, index: number): string {
    const titleField = fields.find(f => f.key === 'title' || f.key === 'name');
    if (titleField && item[titleField.key]) return item[titleField.key];
    return `Item ${index + 1}`;
  }

  function renderField(field: TemplateFieldDef, item: Record<string, any>, itemIndex: number) {
    const value = item[field.key] ?? '';

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value}
            onChange={e => updateItem(itemIndex, field.key, e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none"
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={e => updateItem(itemIndex, field.key, e.target.value)}
            placeholder={field.placeholder}
            rows={2}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-y focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none"
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={e => updateItem(itemIndex, field.key, e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none"
          >
            {field.options?.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={e => updateItem(itemIndex, field.key, e.target.value ? Number(e.target.value) : '')}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none"
          />
        );
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5" />
          {items.length} {items.length === 1 ? 'item' : 'items'} in this template
        </span>
        <span>Drag to reorder</span>
      </div>

      {items.map((item, index) => {
        const isCollapsed = collapsedItems.has(index);
        const label = getItemLabel(item, index);
        const hasRequired = fields.some(f => f.required && !item[f.key]);

        return (
          <div
            key={index}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={e => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`border rounded-lg transition-all ${
              draggedIndex === index ? 'opacity-50 border-blue-300' : 'border-slate-200'
            } ${hasRequired ? 'border-l-4 border-l-amber-400' : ''}`}
          >
            {/* Item Header */}
            <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 rounded-t-lg">
              <div className="cursor-grab text-slate-400 hover:text-slate-600">
                <GripVertical className="h-4 w-4" />
              </div>
              <span className="text-xs text-slate-400 font-mono w-5 text-right">{index + 1}.</span>
              <span className="text-sm font-medium text-slate-700 flex-1 truncate">{label}</span>

              {hasRequired && (
                <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
              )}

              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => duplicateItem(index)}
                  className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                  title="Duplicate"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(index, 'up')}
                  disabled={index === 0}
                  className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-colors"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(index, 'down')}
                  disabled={index === items.length - 1}
                  className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-colors"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleCollapse(index)}
                  className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Item Fields */}
            {!isCollapsed && (
              <div className="p-3 space-y-3">
                <div className={`grid gap-3 ${fields.length <= 2 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                  {fields.map(field => {
                    const isFullWidth = field.type === 'textarea' || (field.type === 'text' && field.key === 'title') || (field.type === 'text' && field.key === 'name');
                    return (
                      <div key={field.key} className={isFullWidth ? 'sm:col-span-2' : ''}>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          {field.label}
                          {field.required && <span className="text-red-400 ml-0.5">*</span>}
                        </label>
                        {renderField(field, item, index)}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Add Item Button */}
      <button
        type="button"
        onClick={addItem}
        className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all text-sm"
      >
        <Plus className="h-4 w-4" />
        Add {category.charAt(0).toUpperCase() + category.slice(1)}
      </button>
      <ConfirmDialog {...confirmProps} />
    </div>
  );
}
