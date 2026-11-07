import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  SlidersHorizontal,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  X,
  Sparkles,
} from 'lucide-react';

interface CustomField {
  id: number;
  entityType: string;
  fieldName: string;
  fieldLabel: string;
  fieldType: 'text' | 'number' | 'date' | 'boolean' | 'dropdown';
  isRequired: boolean;
  optionsJson?: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
}

export const CustomFieldsView: React.FC = () => {
  const { apiFetch, activeRole } = useAuth();
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New Field Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldType, setFieldType] = useState<'text' | 'number' | 'date' | 'boolean' | 'dropdown'>('text');
  const [isRequired, setIsRequired] = useState(false);
  const [displayOrder, setDisplayOrder] = useState(1);
  const [optionsList, setOptionsList] = useState<string[]>(['Option 1', 'Option 2']);
  const [newOptionInput, setNewOptionInput] = useState('');

  const fetchFields = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch('/api/custom-fields');
      setFields(data);
    } catch (err: any) {
      console.error('Error fetching custom fields:', err);
      setError(err.message || 'Failed to load custom fields');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFields();
  }, [activeRole]);

  const handleAddOption = () => {
    if (newOptionInput.trim() && !optionsList.includes(newOptionInput.trim())) {
      setOptionsList([...optionsList, newOptionInput.trim()]);
      setNewOptionInput('');
    }
  };

  const handleRemoveOption = (indexToRemove: number) => {
    setOptionsList(optionsList.filter((_, idx) => idx !== indexToRemove));
  };

  const handleCreateField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldLabel.trim()) return;

    try {
      setError(null);
      await apiFetch('/api/custom-fields', {
        method: 'POST',
        body: JSON.stringify({
          fieldLabel: fieldLabel.trim(),
          fieldType,
          isRequired,
          displayOrder: Number(displayOrder) || 1,
          optionsJson: fieldType === 'dropdown' ? JSON.stringify(optionsList) : null,
        }),
      });

      setSuccessMsg(`Custom field "${fieldLabel}" created successfully! It is now available in student forms and tables.`);
      setIsModalOpen(false);
      setFieldLabel('');
      setFieldType('text');
      setIsRequired(false);
      setOptionsList(['Option 1', 'Option 2']);
      fetchFields();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to create custom field');
    }
  };

  const handleDeleteField = async (id: number, label: string) => {
    if (!confirm(`Are you sure you want to deactivate column "${label}"?`)) return;

    try {
      await apiFetch(`/api/custom-fields/${id}`, { method: 'DELETE' });
      setSuccessMsg(`Column "${label}" has been deactivated.`);
      fetchFields();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate field');
    }
  };

  const applyPreset = (preset: { label: string; type: any; options?: string[]; req: boolean }) => {
    setFieldLabel(preset.label);
    setFieldType(preset.type);
    setIsRequired(preset.req);
    if (preset.options) {
      setOptionsList(preset.options);
    }
  };

  const parseOptions = (jsonStr?: string | null): string[] => {
    if (!jsonStr) return [];
    try {
      return JSON.parse(jsonStr);
    } catch {
      return [];
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-950/50 border border-emerald-800 text-emerald-200 rounded-xl flex items-center justify-between text-sm shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-950/50 border border-rose-800 text-rose-200 rounded-xl flex items-center justify-between text-sm shadow-md">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900 p-5 rounded-xl border border-zinc-800 shadow-xl">
        <div>
          <h1 className="text-xl font-serif font-bold text-white flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-amber-400" />
            <span>Dynamic Custom Columns & Attributes</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Create and configure custom data attributes for student records seamlessly.
          </p>
        </div>

        {['admin', 'warden'].includes(activeRole) && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Custom Column</span>
          </button>
        )}
      </div>

      {/* Existing Custom Columns Table */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
          <div>
            <h2 className="text-sm font-serif font-bold text-white">Configured Columns</h2>
            <p className="text-xs text-zinc-400">
              Active attributes displayed in the student directory and records.
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 bg-amber-500/10 text-amber-300 rounded-full border border-amber-500/30">
            {fields.length} Columns Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Order</th>
                <th className="py-3 px-4">Column Label</th>
                <th className="py-3 px-4">Internal Key</th>
                <th className="py-3 px-4">Data Type</th>
                <th className="py-3 px-4">Mandatory?</th>
                <th className="py-3 px-4">Options / Values</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500"></div>
                  </td>
                </tr>
              ) : fields.length > 0 ? (
                fields.map((field) => {
                  const opts = parseOptions(field.optionsJson);
                  return (
                    <tr key={field.id} className="hover:bg-zinc-800/40 transition">
                      <td className="py-3 px-4 font-mono text-zinc-500">#{field.displayOrder}</td>
                      <td className="py-3 px-4 font-bold text-white">{field.fieldLabel}</td>
                      <td className="py-3 px-4 font-mono text-zinc-400 text-[11px]">
                        {field.fieldName}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-800 text-amber-300 border border-zinc-700 uppercase">
                          {field.fieldType}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {field.isRequired ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                            Required
                          </span>
                        ) : (
                          <span className="text-zinc-500">Optional</span>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        {field.fieldType === 'dropdown' ? (
                          <div className="flex flex-wrap gap-1">
                            {opts.map((opt, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 bg-zinc-950 text-zinc-300 rounded text-[10px] border border-zinc-800"
                              >
                                {opt}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-zinc-500 italic">User input</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {activeRole === 'admin' && (
                          <button
                            onClick={() => handleDeleteField(field.id, field.fieldLabel)}
                            className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 rounded transition"
                            title="Deactivate this custom column"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-500">
                    No custom columns created yet. Click "Add New Custom Column" above to define one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Custom Column Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-zinc-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-zinc-800 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <h2 className="text-lg font-serif font-bold text-white">Create Custom Column</h2>
                <p className="text-xs text-zinc-400">Expands student records with typed, validated properties.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="mt-4 p-3 bg-zinc-950 rounded-xl border border-zinc-800">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1 mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                Quick Suggestions
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Guardian Occupation', type: 'text' as const, req: false },
                  {
                    label: 'Diet Preference',
                    type: 'dropdown' as const,
                    options: ['Standard Mess', 'Vegetarian', 'Self-Catering'],
                    req: true,
                  },
                  { label: 'Scholarship Category', type: 'text' as const, req: false },
                  { label: 'National ID / Citizen No', type: 'text' as const, req: true },
                ].map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="px-2.5 py-1 text-[11px] bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-200 rounded-md font-medium transition"
                  >
                    + {p.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateField} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Column Display Label *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Guardian Occupation, Vehicle No"
                  value={fieldLabel}
                  onChange={(e) => setFieldLabel(e.target.value)}
                  className="w-full text-xs p-2.5 bg-zinc-950 border border-zinc-700 text-white rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Field Type *</label>
                  <select
                    value={fieldType}
                    onChange={(e: any) => setFieldType(e.target.value)}
                    className="w-full text-xs p-2.5 bg-zinc-950 border border-zinc-700 text-white rounded-lg focus:outline-none focus:border-amber-500"
                  >
                    <option value="text">Text (Single Line)</option>
                    <option value="number">Numeric (Integers/Decimals)</option>
                    <option value="date">Date (Calendar Picker)</option>
                    <option value="boolean">Boolean (Yes / No checkbox)</option>
                    <option value="dropdown">Dropdown (Predefined Choices)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Display Order</label>
                  <input
                    type="number"
                    min="1"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 1)}
                    className="w-full text-xs p-2.5 bg-zinc-950 border border-zinc-700 text-white rounded-lg focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Dropdown Options Builder */}
              {fieldType === 'dropdown' && (
                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
                  <label className="block text-xs font-semibold text-zinc-300">
                    Dropdown Choices *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add an option..."
                      value={newOptionInput}
                      onChange={(e) => setNewOptionInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddOption();
                        }
                      }}
                      className="flex-1 text-xs p-2 bg-zinc-900 border border-zinc-750 text-white rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-lg"
                    >
                      Add
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {optionsList.map((opt, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-900 border border-zinc-750 text-zinc-200 text-xs rounded-md"
                      >
                        <span>{opt}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(idx)}
                          className="text-zinc-500 hover:text-rose-400"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isRequiredField"
                  checked={isRequired}
                  onChange={(e) => setIsRequired(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 bg-zinc-950 border-zinc-700"
                />
                <label htmlFor="isRequiredField" className="text-xs font-semibold text-zinc-300">
                  Make this column mandatory when registering students
                </label>
              </div>

              {/* Live Preview Card */}
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  Live Preview
                </span>
                <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                  <label className="block text-xs font-bold text-white mb-1">
                    {fieldLabel || 'Sample Column Name'} {isRequired && <span className="text-rose-400">*</span>}
                  </label>
                  {fieldType === 'dropdown' ? (
                    <select className="w-full text-xs p-2 border border-zinc-700 rounded-md bg-zinc-950 text-zinc-400" disabled>
                      <option>-- Select choice --</option>
                      {optionsList.map((o, i) => (
                        <option key={i}>{o}</option>
                      ))}
                    </select>
                  ) : fieldType === 'boolean' ? (
                    <div className="flex items-center gap-2 text-xs text-zinc-300">
                      <input type="checkbox" disabled checked className="bg-zinc-950" />
                      <span>Yes / Confirmed</span>
                    </div>
                  ) : (
                    <input
                      type={fieldType === 'number' ? 'number' : fieldType === 'date' ? 'date' : 'text'}
                      disabled
                      placeholder={`Enter ${fieldLabel.toLowerCase() || 'value'}`}
                      className="w-full text-xs p-2 border border-zinc-700 rounded-md bg-zinc-950 text-zinc-500"
                    />
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-zinc-700 rounded-lg text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow-md transition"
                >
                  Save Column Definition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
