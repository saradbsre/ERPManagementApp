import { useState, useEffect } from "react";
import { upsertModule, upsertModuleColumn } from "../../api/api";

export default function CreateMaster({ onClose, editData }) {
  const [editIndex, setEditIndex] = useState(null);
  const [originalColumns, setOriginalColumns] = useState([]);
  const [section, setSection] = useState({
    name: "",
    displayName: "",
    description: "",
    canEdit: true,
    isActive: true,
  });
  

  const [column, setColumn] = useState({
    name: "",
    displayName: "",
    description: "",
    type: "",
    length: "",
    canEdit: true,
    isActive: true,
  });

  const [columns, setColumns] = useState([]);

  const dataTypes = [
    { label: "Text", value: "text" },
    { label: "Number", value: "number" },
    { label: "Date", value: "date" },
    { label: "Date & Time", value: "datetime" },
    { label: "Boolean", value: "bit" },
  ];
  
   useEffect(() => {
  if (editData) {
    setSection({
      name: editData.module_name,
      displayName: editData.display_name,
      description: editData.description,
      canEdit: editData.can_edit,
        isActive: editData.is_active,
    });

    // Normalize columns
setColumns(
  (editData.columns || []).map(col => ({
    id: col.id || col.column_id || "",
    name: col.column_name || col.name || "",
    displayName: col.display_name || col.displayName || "",
    description: col.description || "",
    type: col.data_type || col.type || "",
    length: col.length || "",
    canEdit: col.can_edit !== undefined ? col.can_edit : (col.canEdit !== undefined ? col.canEdit : true),
    isActive: col.is_active !== undefined ? col.is_active : (col.isActive !== undefined ? col.isActive : true),
    isExisting: true,
  }))
);
  }
}, [editData]);

useEffect(() => {
  if (editData) {
    const normalized = (editData.columns || []).map(col => ({
      id: col.id || col.column_id,
      name: col.column_name,
      displayName: col.display_name,
      description: col.description,
      type: col.data_type,
      length: col.length,
      canEdit: col.can_edit,
      isActive: col.is_active,
      isExisting: true,
    }));

    setColumns(normalized);
    setOriginalColumns(normalized); // 👈 store original
  }
}, [editData]);

const getChangedColumns = () => {
  return columns.filter(col => {
    if (!col.id) return true; // new column

    const original = originalColumns.find(o => o.id === col.id);
    if (!original) return true;

    return (
      col.displayName !== original.displayName ||
      col.description !== original.description ||
      col.canEdit !== original.canEdit ||
      col.isActive !== original.isActive ||
      col.length !== original.length
    );
  });
};

  const isLengthDisabled = ["date", "datetime", "bit"].includes(column.type);

  /* ================= VALIDATIONS ================= */

  const validateSection = () => {
    if (!section.name.trim()) return "Section name is required";
    if (section.name.length > 50) return "Section name max 50 characters";
    if (!section.description.trim()) return "Section description is required";
    return null;
  };

  const validateColumn = () => {
    if (!column.name.trim()) return "Column name is required";
    if (column.name.length > 50) return "Column name max 50 characters";
    if (!column.description.trim()) return "Column description is required";
    if (!column.type) return "Column type is required";
    return null;
  };

  const formatName = (value, isTable = false) => {
  if (!value) return "";

    return (
        (isTable ? "tbl_" : "") +
        value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s]/g, "")   // remove special chars
        .replace(/\s+/g, "_")          // spaces → underscore
    );
    };

    const handleEditRow = (col, index) => {
  setColumn(col);
  setEditIndex(index);
};

  /* ================= ADD COLUMN ================= */

 const handleAddColumn = () => {
  const sectionError = validateSection();
  if (sectionError) return alert(sectionError);

  const columnError = validateColumn();
  if (columnError) return alert(columnError);

  // UPDATE MODE
  if (editIndex !== null) {
    const updated = [...columns];
    updated[editIndex] = column;
    setColumns(updated);
    setEditIndex(null);
  } else {
    // ADD MODE
    const exists = columns.some(
      (c) => c.name.toLowerCase() === column.name.toLowerCase()
    );
    if (exists) return alert("Column name already exists");

    setColumns([...columns, column]);
  }

  // RESET FORM
  setColumn({
    name: "",
    displayName: "",
    description: "",
    type: "",
    length: "",
    canEdit: true,
    isActive: true,
  });
};

  /* ================= SAVE ================= */

const handleSaveSection = async () => {
  try {
    if (!section.name.trim()) return alert("Section name required");
    if (!section.description.trim()) return alert("Section description required");

    // 1. Upsert module (create or update)
    const moduleRes = await upsertModule({
      id: editData?.module_id, // use id if editing, undefined if creating
      module_name: editData ? editData.module_name : formatName(section.name, true),
      display_name: section.displayName,
      description: section.description,
      can_edit: section.canEdit,
      is_active: section.isActive,
      userid: "admin",
    });

    // 2. Get the module id (from backend response or editData)
    const moduleId = moduleRes?.data?.id || editData?.module_id;
    if (!moduleId) {
      return alert("Module ID not returned from API");
    }

    // 3. Get changed columns (for edit) or all columns (for create)
    const changedColumns = editData ? getChangedColumns() : columns;

    // 4. Upsert columns
    for (const col of changedColumns) {
      await upsertModuleColumn({
        id: col.id, // undefined for new columns
        module_id: moduleId,
        column_name: formatName(col.name),
        display_name: col.displayName,
        description: col.description,
        data_type: col.type,
        length: col.length ? Number(col.length) : null,
        can_edit: col.canEdit,
        is_active: col.isActive,
        userid: "admin",
      });
    }

    alert(editData ? "Updated successfully ✅" : "Section & Columns saved successfully ✅");

    // Optionally reset form if creating new
    if (!editData) {
      setSection({
        name: "",
        displayName: "",
        description: "",
        canEdit: true,
        isActive: true,
      });
      setColumns([]);
    }

  } catch (err) {
    console.error(err);
    alert("Update failed");
  }
};

  return (
    <div className="p-6 bg-gray-100 min-h-screen space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Create Master</h2>

        <button
          onClick={onClose}
          className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-100"
        >
          ← Back
        </button>
      </div>

      {/* TOP SPLIT */}
      <div className="grid grid-cols-2 gap-6">

        {/* MASTER DETAILS */}
        <div className="bg-white rounded-2xl shadow p-6 space-y-4">
          <h3 className="text-lg font-semibold">Master Details</h3>

          <input
            maxLength={50}
            placeholder="Master Name"
            className="input"
            value={section.name}
            onChange={(e) =>
              setSection({ ...section, name: e.target.value })
            }
            disabled={!!editData} // disable name edit in edit mode
          />

          <input
            placeholder="Display Name"
            className="input"
            value={section.displayName}
            onChange={(e) =>
              setSection({ ...section, displayName: e.target.value })
            }
          />

          <textarea
            placeholder="Description"
            rows={4}
            className="input resize-none"
            value={section.description}
            onChange={(e) =>
              setSection({ ...section, description: e.target.value })
            }
          />

         <div className="flex items-center gap-6">

  {/* CAN EDIT */}
  <label className="flex items-center gap-2 text-sm">
    <input
      type="checkbox"
      checked={section.canEdit}
      onChange={() =>
        setSection({ ...section, canEdit: !section.canEdit })
      }
    />
    Can Edit
  </label>

  {/* IS ACTIVE */}
  <label className="flex items-center gap-2 text-sm">
    <input
      type="checkbox"
      checked={section.isActive}
      onChange={() =>
        setSection({ ...section, isActive: !section.isActive })
      }
    />
    Is Active
  </label>

</div>
        </div>

        {/* COLUMN BUILDER */}
        <div className="bg-white rounded-2xl shadow p-6 space-y-4">
          <h3 className="text-lg font-semibold">Add Column</h3>

          <input
            maxLength={50}
            placeholder="Column Name"
            className="input"
            value={column.name}
            onChange={(e) =>
              setColumn({ ...column, name: e.target.value })
            }
            disabled={editIndex !== null} // disable name edit in update mode
          />

          <input
            placeholder="Display Name"
            className="input"
            value={column.displayName}
            onChange={(e) =>
              setColumn({ ...column, displayName: e.target.value })
            }
          />

          <textarea
            placeholder="Column Description"
            rows={3}
            className="input resize-none"
            value={column.description}
            onChange={(e) =>
              setColumn({ ...column, description: e.target.value })
            }
          />

          <div className="grid grid-cols-2 gap-3">
            <select
              className="input"
              value={column.type}
              onChange={(e) =>
                setColumn({ ...column, type: e.target.value })
              }
              disabled={editIndex !== null} // disable type change in update mode
            >
              <option value="">Data Type</option>
              {dataTypes.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>

            <input
              placeholder="Length"
              className="input"
              value={column.length}
              disabled={isLengthDisabled || editIndex !== null} // disable length if type doesn't support or in update mode
              onChange={(e) =>
                setColumn({ ...column, length: e.target.value })
              }
            />
          </div>

          <div className="flex justify-between items-center">
          <div className="flex items-center gap-6">

  {/* CAN EDIT */}
  <label className="flex items-center gap-2 text-sm">
    <input
      type="checkbox"
      checked={column.canEdit}
      onChange={() =>
        setColumn({ ...column, canEdit: !column.canEdit })
      }
    />
    Can Edit
  </label>

  {/* IS ACTIVE */}
  <label className="flex items-center gap-2 text-sm">
    <input
      type="checkbox"
      checked={column.isActive}
      onChange={() =>
        setColumn({ ...column, isActive: !column.isActive })
      }
    />
    Is Active
  </label>

</div>

            <button
              onClick={handleAddColumn}
              disabled={!!validateSection()}
              className={`px-5 py-2 rounded-lg text-white
                ${
                  validateSection()
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
            >
              {editIndex !== null ? "Update Column" : "+ Add Column"}
            </button>
          </div>
        </div>
      </div>

      {/* TABLE PREVIEW */}
      {columns.length > 0 && (
        
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          {/* ================= SECTION SUMMARY ================= */}
<div className="bg-white rounded-2xl shadow p-5 mb-4">

  <h3 className="font-semibold text-lg mb-2">
    Master Summary
  </h3>

  <div className="grid grid-cols-2 gap-4 text-sm">

    <div>
      <span className="text-gray-500">Section Name:</span>
      <div className="font-semibold">{section.name || "-"}</div>
    </div>

    <div>
      <span className="text-gray-500">Display Name:</span>
      <div className="font-semibold">{section.displayName || "-"}</div>
    </div>

  </div>
</div>
          <div className="p-4 border-b flex justify-between items-center">
            <span className="font-semibold">Column Preview</span>

             <button
                onClick={handleSaveSection}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
            >
                Save Section
            </button>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="p-3 text-left">Column</th>
                <th className="text-left">Display</th>
                <th className="text-left">Description</th>
                <th className="text-left">Type</th>
                <th className="text-left">Length</th>
                <th className="text-left">Editable</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              {columns.map((col, i) => (
                <tr
                    key={i}
                    className="border-t hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleEditRow(col, i)}
                    >

                  <td className="p-3 font-medium">{col.name}</td>
                  <td>{col.displayName}</td>
                  <td>{col.description}</td>

                  <td>
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-600">
                      {col.type}
                    </span>
                  </td>

                  <td>{col.length || "-"}</td>

                  <td>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        col.canEdit
                          ? "bg-green-50 text-green-600"
                          : "bg-red-50 text-red-500"
                      }`}
                    >
                      {col.canEdit ? "Yes" : "No"}
                    </span>
                  </td>

                  <td className="p-3 text-right">
                    <button
                        disabled={col.isExisting} // 🔥 disable if from DB
                        onClick={(e) => {
                            e.stopPropagation(); // prevent row click
                            setColumns(columns.filter((_, idx) => idx !== i));
                        }}
                        className={`p-2 rounded ${
                            col.isExisting
                            ? "opacity-40 cursor-not-allowed"
                            : "hover:bg-red-50"
                        }`}
                        >
                        ❌
                        </button>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

`<style>
.input {
  @apply border rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 outline-none;
}
</style>`