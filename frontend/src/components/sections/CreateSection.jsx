import { useState, useEffect, use } from "react";
import { upsertModule, upsertModuleColumn, fetchMasters, dataTypes, currencises, billingCycle } from "../../api/api";

export default function CreateSection({ onClose, editData }) {
  const [editIndex, setEditIndex] = useState(null);
  const [originalColumns, setOriginalColumns] = useState([]);
  const [masters, setMasters] = useState([]);
  const [dataTypesList, setDataTypesList] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [billingCycles, setBillingCycles] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isDateColumn, setIsDateColumn] = useState(false);
  const activeUser = JSON.parse(localStorage.getItem("user"));
  const activeUserEmail = activeUser?.email;
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
    masterName: "",        // ✅ selected master
    noMaster: false 
  });

  const [columns, setColumns] = useState([]);
const selectedType = dataTypesList.find(dt => dt.type_key === column.type);
  
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


  useEffect(() => {
    const loadDataTypes = async () => {
      try {
        const res = await dataTypes();
        setDataTypesList(res.data || []);
      } catch (err) {
        setDataTypesList([]);
      }
    };

    loadDataTypes();
  }, []);

    useEffect(() => {
    const loadCurrencies = async () => {
      try {
        const res = await currencises();
        setCurrencies(res.data || []);
      } catch (err) {        setCurrencies([]);
      }
    };
    loadCurrencies();
  }, []);

    useEffect(() => {
    const loadBillingCycles = async () => {
      try {
        const res = await billingCycle();
        setBillingCycles(res.data || []);
      } catch (err) {        setBillingCycles([]);
      }
    };
    loadBillingCycles();
  }, []);


  /* ================= VALIDATIONS ================= */

  const validateSection = () => {
    if (!section.displayName.trim()) return "Section name is required";
    if (section.displayName.length > 50) return "Section name max 50 characters";
    if (!section.description.trim()) return "Section description is required";
    return null;
  };

  const validateColumn = () => {
    if (!column.displayName.trim()) return "Column name is required";
    if (column.displayName.length > 50) return "Column name max 50 characters";
    if (!column.description.trim()) return "Column description is required";
    if (!column.type) return "Column type is required";
    if (!column.noMaster && !column.masterName) return "Select master or check 'No Master Needed'";
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

const normalizeKey = (val = "") =>
  val.toLowerCase().trim().replace(/\s+/g, "_");

const handleAddColumn = () => {
  const sectionError = validateSection();
  if (sectionError) return alert(sectionError);

  const columnError = validateColumn();
  if (columnError) return alert(columnError);

  // ================= EDIT MODE =================
  if (editIndex !== null) {
    const updated = [...columns];

    updated[editIndex] = {
      ...column,
      name: formatName(column.displayName)
    };

    setColumns(updated);
    setEditIndex(null);
  }

  // ================= CURRENCY LOGIC =================
  else if (column.masterName === "currency") {

    const selectedCurrencies = column.currency || [];
    const selectedBilling = column.billingCycle || [];

    if (!selectedCurrencies.length) {
      return alert("Please select at least one currency");
    }

    // -------- 1️⃣ AMOUNT COLUMNS --------
    const newCurrencyCols = selectedCurrencies
      .map(currencyCode => {

        const key = normalizeKey(currencyCode); // ✅ normalize
        const colName = `amount_${key}`;

        const exists = columns.some(
          c => c.name.toLowerCase() === colName.toLowerCase()
        );

        if (exists) return null;

        return {
          ...column,
          name: colName,
          displayName: `Amount (${currencyCode})`,
          masterName: "currency"
        };
      })
      .filter(Boolean);


    // -------- 2️⃣ TOTAL COLUMNS --------
    const extraCols = [];

    selectedBilling.forEach(billing => {

      const key = normalizeKey(billing); // ✅ IMPORTANT FIX
      const colName = `total_cost_${key}_aed`;

      const exists = columns.some(c => c.name === colName);

      if (!exists) {
        extraCols.push({
          ...column,
          name: colName,
          displayName: `Total Cost ${billing} (AED)`,
          masterName: null
        });
      }
    });


    // -------- 3️⃣ SAVE --------
    setColumns(prev => [...prev, ...newCurrencyCols, ...extraCols]);
  }

  // ================= NORMAL COLUMN =================
  else {
    const generatedName = formatName(column.displayName);

    const exists = columns.some(
      c => c.name.toLowerCase() === generatedName.toLowerCase()
    );

    if (exists) return alert("Column name already exists");

    setColumns([...columns, { ...column, name: generatedName }]);
  }

  // ================= RESET =================
  setColumn({
    name: "",
    displayName: "",
    description: "",
    type: "",
    length: "",
    canEdit: true,
    isActive: true,
    masterName: "",
    noMaster: false,
    currency: [],
    billingCycle: []
  });
};

  /* ================= SAVE ================= */

const handleSaveSection = async () => {
  try {
    if (!section.displayName.trim()) {
      return alert("Section name required");
    }

    if (!section.description.trim()) {
      return alert("Section description required");
    }

    // ✅ 1. UPSERT MODULE
    const moduleRes = await upsertModule({
      id: editData?.module_id,
      module_name: editData
        ? editData.module_name
        : formatName(section.displayName, true),
      display_name: section.displayName,
      description: section.description,
      can_edit: section.canEdit,
      is_active: section.isActive,
      userid: activeUserEmail,
    });

    const moduleId = moduleRes?.data?.id || editData?.module_id;

    if (!moduleId) {
      return alert("Module ID not returned from API");
    }

    // ✅ 2. GET COLUMNS
    const changedColumns = editData ? getChangedColumns() : columns;

    // ✅ 3. REMOVE DUPLICATES (VERY IMPORTANT)
    const uniqueCols = [];
    const seen = new Set();

    for (const col of changedColumns) {
      const name = formatName(col.displayName).toLowerCase();

      if (!seen.has(name)) {
        seen.add(name);
        uniqueCols.push(col);
      }
    }

    // ✅ 4. PREPARE BULK PAYLOAD
    const payload = uniqueCols.map(col => {
      const existingColumn = editData?.columns?.find(
        (c) => c.column_id === col.id
      );

      return {
        id: col.id || null,
        module_id: moduleId,
        column_name: existingColumn
          ? existingColumn.column_name
          : formatName(col.displayName),
        display_name: col.displayName,
        description: col.description,
        data_type: col.type,
        length: col.length ? Number(col.length) : null,
        can_edit: col.canEdit,
        is_active: col.isActive,
        userid: activeUserEmail,
        master: col.noMaster ? null : col.masterName
      };
    });

    // ✅ 5. CALL BULK API (ONLY ONCE)
    await upsertModuleColumn({
      columns: payload,
      userid: activeUserEmail
    });

    alert(
      editData
        ? "Updated successfully ✅"
        : "Section & Columns saved successfully ✅"
    );

    // ✅ 6. RESET (ONLY FOR CREATE)
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

useEffect(() => {
  fetchMasters().then(res => setMasters(res.data || []));
}, []);
const selectedMaster = masters.find(m => m.master_name === column.masterName);
//console.log("selected master:", selectedMaster);

  return (
    <div className="p-6 bg-gray-100 min-h-screen space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Create Section</h2>

        <button
          onClick={onClose}
          className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-100"
        >
          ← Back
        </button>
      </div>

      {/* TOP SPLIT */}
      <div className="grid grid-cols-2 gap-6">

        {/* SECTION DETAILS */}
        <div className="bg-white rounded-2xl shadow p-6 space-y-4">
          <h3 className="text-lg font-semibold">Section Details</h3>

          {/* <input
            maxLength={50}
            placeholder="Section Name"
            className="input"
            value={section.name}
            onChange={(e) =>
              setSection({ ...section, name: e.target.value })
            }
            disabled={!!editData} // disable name edit in edit mode
          /> */}

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
          <div className="flex justify-between items-center">
  <h3 className="text-lg font-semibold">Add Column</h3>

  {/* 🔥 DATE COLUMN TOGGLE */}
  <label className="flex items-center gap-2 text-sm">
    <input
      type="checkbox"
      checked={isDateColumn}
      onChange={(e) => {
        const checked = e.target.checked;
        setIsDateColumn(checked);

        if (checked) {
          setColumn((prev) => ({
            ...prev,
            type: "datetime", // auto datatype
          }));
        }
      }}
    />
    Is Date Column
  </label>
</div>

          {/* <input
            maxLength={50}
            placeholder="Column Name"
            className="input"
            value={column.name}
            onChange={(e) =>
              setColumn({ ...column, name: e.target.value })
            }
            disabled={editIndex !== null} // disable name edit in update mode
          /> */}

         <div className="grid grid-cols-2 gap-3">

  {/* DISPLAY NAME */}
  <input
    placeholder="Display Name"
    className="input"
    value={column.displayName}
    onChange={(e) =>
      setColumn({ ...column, displayName: e.target.value })
    }
  />
  

  {/* MASTER DROPDOWN */}
  <select
    className="input"
    value={column.masterName}
    disabled={column.noMaster}   // 🔥 disable if checkbox checked
   onChange={(e) => {
  const selectedMaster = masters.find(
    (m) => m.master_name === e.target.value
  );

  if (!selectedMaster) return;

  // find datatype config
  const selectedType = dataTypesList.find(
    (d) => d.type_key === selectedMaster.data_type
  );

  setColumn({
    ...column,
    masterName: selectedMaster.master_name,

    // 🔥 auto fill
    displayName: selectedMaster.display_name,
    //description: selectedMaster.description || "",
    type: selectedMaster.data_type,

    // 🔥 set default length if applicable
    length: selectedType?.has_length
      ? selectedType.default_length || ""
      : ""
  });
}}
  >
    <option value="">Select Master</option>

    {masters.map((m) => (
      <option key={m.id} value={m.master_name}>
        {m.display_name}
      </option>
    ))}

  </select>

</div>
{isDateColumn && (
  <div className="flex flex-wrap gap-2 mt-1">
    {[
      "Created Date",
      "Updated Date",
      "Purchase Date",
      "Expiry Date",
      "Renewal Date"
    ].map((name) => (
      <button
        key={name}
        type="button"
        onClick={() =>
          setColumn({ ...column, displayName: name })
        }
        className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition"
      >
        {name}
      </button>
    ))}
  </div>
)}
{ selectedMaster?.master_name === "currency" && (
 <div className="grid grid-cols-2 gap-3">

  {/* CURRENCY DROPDOWN */}
<div className="relative">

  {/* INPUT BOX */}
  <div
    className="input cursor-pointer"
    onClick={() =>
      setOpenDropdown(openDropdown === "currency" ? null : "currency")
    }
  >
    {(column.currency || []).length > 0
      ? column.currency.join(", ")
      : "Select Currency"}
  </div>

  {/* DROPDOWN */}
  {openDropdown === "currency" && (
    <div className="absolute z-50 bg-white border w-full max-h-48 overflow-auto shadow-lg rounded mt-1">

      {currencies.map((c) => {
        const checked = (column.currency || []).includes(c.currency_code);

        return (
          <label
            key={c.id}
            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => {
                let updated = column.currency || [];

                if (checked) {
                  updated = updated.filter(v => v !== c.currency_code);
                } else {
                  updated = [...updated, c.currency_code];
                }

                setColumn({ ...column, currency: updated });
              }}
            />

            <span>{c.currency_name}</span>
          </label>
        );
      })}

    </div>
  )}

</div>
<div className="relative">

  <div
    className="input cursor-pointer"
    onClick={() =>
      setOpenDropdown(openDropdown === "billing" ? null : "billing")
    }
  >
    {(column.billingCycle || []).length > 0
      ? column.billingCycle.join(", ")
      : "Select Billing Cycle"}
  </div>

  {openDropdown === "billing" && (
    <div className="absolute z-50 bg-white border w-full max-h-48 overflow-auto shadow-lg rounded mt-1">

      {billingCycles.map((b) => {
        const checked = (column.billingCycle || []).includes(b.value);

        return (
          <label
            key={b.id}
            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => {
                let updated = column.billingCycle || [];

                if (checked) {
                  updated = updated.filter(v => v !== b.value);
                } else {
                  updated = [...updated, b.value];
                }

                setColumn({ ...column, billingCycle: updated });
              }}
            />

            <span>{b.value}</span>
          </label>
        );
      })}

    </div>
  )}

</div>

</div>
) }

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
  onChange={(e) => {
    const typeKey = e.target.value;

    const selected = dataTypesList.find(
      (d) => d.type_key === typeKey
    );

    setColumn({
      ...column,
      type: typeKey,
      length: selected?.has_length
        ? selected.default_length || ""
        : "" // reset if no length
    });
  }}
  disabled={editIndex !== null}
>
  <option value="">Data Type</option>
  {dataTypesList.map((d) => (
    <option key={d.id} value={d.type_key}>
      {d.label}
    </option>
  ))}
</select>

           <input
  placeholder="Length"
  className="input"
  value={column.length || ""}
  disabled={!selectedType?.has_length || editIndex !== null}
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

  {/* 🔥 NO MASTER */}
  <label className="flex items-center gap-2 text-sm">
    <input
      type="checkbox"
      checked={column.noMaster}
      onChange={() =>
        setColumn({
          ...column,
          noMaster: !column.noMaster,
          masterName: ""   // reset dropdown when checked
        })
      }
    />
    No Master Needed
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
    Section Summary
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