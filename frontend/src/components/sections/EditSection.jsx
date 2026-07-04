import { useState } from "react";

export default function EditModal({ data, onClose, onSaved }) {
  const [section, setSection] = useState(data);
  const [columns, setColumns] = useState(data.columns || []);

  /* ================= UPDATE COLUMN ================= */
  const updateColumn = (index, key, value) => {
    const updated = [...columns];
    updated[index][key] = value;
    setColumns(updated);
  };

  /* ================= SAVE ================= */
  const handleSave = async () => {
    try {
      // SECTION UPDATE
      await upsertModule({
        id: section.module_id,
        display_name: section.display_name,
        description: section.description,
        is_active: section.is_active,
        can_edit: section.can_edit,
      });

      // COLUMNS UPDATE
      for (const col of columns) {
        await upsertModuleColumn({
          id: col.column_id,
          module_id: section.module_id,
          column_name: col.column_name,
          display_name: col.display_name,
          description: col.description,
          data_type: col.data_type,
          length: col.length,
          is_active: col.is_active,
          can_edit: col.can_edit,
        });
      }

      alert("Updated successfully");
      onSaved();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">

      <div className="bg-white w-[900px] rounded-xl p-6 max-h-[90vh] overflow-auto">

        {/* HEADER */}
        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-bold">Edit Section</h2>

          <button onClick={onClose} className="px-3 py-1 border rounded">
            ✕
          </button>
        </div>

        {/* SECTION EDIT */}
        <div className="grid grid-cols-2 gap-3 mb-5">

          <input
            value={section.display_name}
            onChange={(e) =>
              setSection({ ...section, display_name: e.target.value })
            }
            className="border p-2 rounded"
            placeholder="Display Name"
          />

          <input
            value={section.description}
            onChange={(e) =>
              setSection({ ...section, description: e.target.value })
            }
            className="border p-2 rounded"
            placeholder="Description"
          />

        </div>

        {/* COLUMN EDIT */}
        <div className="space-y-3">

          <h3 className="font-semibold">Columns</h3>

          {columns.map((col, i) => (
            <div key={i} className="grid grid-cols-5 gap-2 border p-2 rounded">

              <input
                value={col.display_name}
                onChange={(e) =>
                  updateColumn(i, "display_name", e.target.value)
                }
                className="border p-1 rounded"
                placeholder="Display"
              />

              <input
                value={col.description}
                onChange={(e) =>
                  updateColumn(i, "description", e.target.value)
                }
                className="border p-1 rounded"
                placeholder="Desc"
              />

              <select
                value={col.data_type}
                onChange={(e) =>
                  updateColumn(i, "data_type", e.target.value)
                }
                className="border p-1 rounded"
              >
                <option value="text">text</option>
                <option value="number">number</option>
                <option value="date">date</option>
                <option value="bit">bit</option>
              </select>

              <input
                value={col.length || ""}
                onChange={(e) =>
                  updateColumn(i, "length", e.target.value)
                }
                className="border p-1 rounded"
                placeholder="Length"
              />

              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={col.can_edit}
                  onChange={(e) =>
                    updateColumn(i, "can_edit", e.target.checked)
                  }
                />
                Edit
              </label>

            </div>
          ))}

        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-3 mt-6">

          <button
            onClick={onClose}
            className="px-4 py-2 border rounded"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            Save Changes
          </button>

        </div>

      </div>
    </div>
  );
}