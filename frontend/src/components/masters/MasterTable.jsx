import { useEffect, useState, useRef, act } from "react";
import { useParams, useLocation } from "react-router-dom";
import { getMasterData, createMasterData, updateMasterData, deleteMasterData } from "../../api/api"; // 👈 create this API
import masterTableConfig from "../../utils/masterTableConfig"; // 👈 create this config
import { getAlignClass } from "../../utils/leftAlign";
import { handleNumericInput, isNumericColumn } from "../../utils/numberValidation";
import PermissionButton from "../PermissionButton";
import { formatDateTime } from "../../utils/formatDateTime";

const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
    <div className="bg-white p-5 rounded w-[400px] shadow">

      <h2 className="font-semibold mb-3">{title}</h2>

      {children}

      <div className="text-right mt-4">
        <button onClick={onClose} className="btn btn-gray">Close</button>
      </div>

    </div>
  </div>
);

export default function MasterTablePage() {
    const { masterName } = useParams();
    const location = useLocation();
    const [isCreating, setIsCreating] = useState(false);
    const [newRow, setNewRow] = useState({});
    const [editRowId, setEditRowId] = useState(null);
    const [editRow, setEditRow] = useState({});
    const [originalRow, setOriginalRow] = useState({});
    //const [columns, setColumns] = useState([]);
    const [rows, setRows] = useState([]);
    const [search, setSearch] = useState("");
    const [showImportModal, setShowImportModal] = useState(false);
    const master = location.state?.master;
    const config = masterTableConfig[masterName] || {};
    const columns = config.columns || [];
    const [page, setPage] = useState(1);
    const pageSize = 10;
    const [totalPages, setTotalPages] = useState(1);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const activeUser = JSON.parse(localStorage.getItem("user"));
    const activeUserEmail = activeUser?.email;
    const isDateColumn = (col) => {
      const type = (col?.data_type || "").toLowerCase();

      return (
        type.includes("date") ||
        type.includes("datetime") ||
        type.includes("timestamp")
      );
    };
    const formatForInput = (value, type) => {
  if (!value) return "";

  const date = new Date(value);

  if (isNaN(date.getTime())) return "";

  if (type === "datetime-local") {
    return date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
  }

  if (type === "date") {
    return date.toISOString().split("T")[0]; // YYYY-MM-DD
  }

  return value;
};

      const handleCreate = () => {
  setIsCreating(true);

  const empty = {};
  columns.forEach(col => {
    empty[col.column_name] = "";
  });

  setNewRow(empty);
};
    useEffect(() => {
        loadMasterData();
    }, [masterName]);

  const loadMasterData = async () => {
  try {
    const res = await getMasterData(masterName, activeUserEmail);
    const data = res.data || [];

    const withIds = data.map((row, index) => ({
      ...row,
      id: row.id || index + 1   // fallback id
    }));

    setRows(withIds);
  } catch (err) {
    console.error(err);
  }
};
  const filteredRows = rows.filter(row => {
  if (!search) return true;

  return Object.values(row)
    .join(" ")
    .toLowerCase()
    .includes(search.toLowerCase());
});

const handleSave = async () => {
  try {
    // 🔥 REMOVE INVALID KEYS BEFORE SENDING
    const cleanedRow = Object.fromEntries(
      Object.entries(newRow).filter(
        ([key, value]) =>
          key &&
          key !== "undefined" &&
          value !== undefined &&
          value !== null &&
          value !== ""
      )
    );

    //console.log("CLEANED ROW:", cleanedRow);

    await createMasterData(masterName, cleanedRow, activeUserEmail);

    setIsCreating(false);
    setNewRow({});

    loadMasterData();
  } catch (err) {
    console.error("CREATE ERROR:", err);
  }
};

const handleCancel = () => {
  setIsCreating(false);
  setNewRow({});
};

const handleDelete = async (row) => {
    try{
        await deleteMasterData(masterName, row.id, activeUserEmail);
        loadMasterData();
    }
    catch(err){
        console.error("DELETE ERROR:", err);
    }
};

const handleSaveEdit = async () => {
  try {
    const changedData = {};

    Object.keys(editRow).forEach((key) => {
      if (editRow[key] !== originalRow[key]) {
        changedData[key] = editRow[key];
      }
    });

    if (Object.keys(changedData).length === 0) {
      setEditRowId(null);
      return;
    }

    await updateMasterData(masterName, editRowId, changedData, activeUserEmail);

    setEditRowId(null);
    setEditRow({});
    setOriginalRow({});

    loadMasterData();
  } catch (err) {
    console.error("UPDATE ERROR:", err);
  }
};

const handleCancelEdit = () => {
  setEditRowId(null);
  setEditRow({});
};

const paginatedRows = filteredRows.slice(startIndex, endIndex);

useEffect(() => {
  setTotalPages(Math.ceil(filteredRows.length / pageSize));
}, [filteredRows]);

    return (
        <div className="h-full flex flex-col">

            <div className="flex justify-between items-center mb-4">

                <h1 className="text-xl font-semibold mb-4">
                    {master?.display_name || masterName}
                </h1>

                {/* SEARCH */}
                  <div className="flex items-center gap-3">

  {/* NEW */}
  <PermissionButton
    user={activeUser}
    permission="add"
    onClick={handleCreate}
    className="px-3 py-1.5 text-sm rounded-md bg-green-600 text-white 
               hover:bg-green-700 hover:shadow-md transition"
  >
   + New
  </PermissionButton>

  {/* ICON BUTTONS */}
  {/* <div className="flex items-center gap-3 text-2xl">

    <button
      //onClick={() => setShowImportModal(true)}
      title="Import"
      className="hover:text-green-600 transition"
    >
      ⬆️
    </button>

    <button
     // onClick={() => setShowPrintModal(true)}
      title="Print"
      className="hover:text-gray-700 transition"
    >
      🖨️
    </button>

    <button
      //onClick={() => setShowExcelModal(true)}
      title="Excel"
      className="hover:text-emerald-600 transition"
    >
      📊
    </button>

    <button
     // onClick={() => setShowPdfModal(true)}
      title="PDF"
      className="hover:text-red-500 transition"
    >
      📄
    </button>

  </div> */}

</div>

            </div>

            {/* ================= HEADER ================= */}


                   {/* ================= CONTROL BAR (LEFT ALIGNED) ================= */}
                   <div className="bg-white p-3 rounded-xl shadow mb-4 flex flex-wrap items-center gap-3">
               
                     {/* SEARCH */}
                     <input
                       type="text"
                       placeholder="Search records..."
                       className="border px-3 py-2 rounded-lg w-64"
                       value={search}
                       onChange={(e) => setSearch(e.target.value)}
                     />
                   
               
              
               {/* {console.log("masterTypes", columns.reduce((acc, col) => {
                   if (col.master) {
                     acc[col.master] = col.data_type;
                   }
                   return acc;
                 }, {}))} */}
               
                     {/* PAGINATION (LEFT SIDE LIKE YOU WANTED) */}
                     <div className="flex items-center gap-2 text-sm ml-4">
               
                       <button
                         disabled={page === 1}
                         onClick={() => setPage(p => p - 1)}
                         className="px-3 py-1 border rounded disabled:opacity-40"
                       >
                         Prev
                       </button>
               
                       <span className="text-gray-600">
                         {page} / {totalPages || 1}
                       </span>
               
                       <button
                         disabled={page === totalPages}
                         onClick={() => setPage(p => p + 1)}
                         className="px-3 py-1 border rounded disabled:opacity-40"
                       >
                         Next
                       </button>
               
                     </div>
               
                     {/* RECORD COUNT */}
                     <span className="text-sm text-gray-500 ml-auto">
                         Total : {filteredRows.length} 
                     </span>
                     
               
                   </div>
               
            


          

            
                  {/* TABLE */}
             <div className="bg-white rounded-xl shadow flex-1 flex flex-col overflow-hidden">
  <div className="flex-1 w-full overflow-auto">
    <table className="min-w-max w-full text-sm">
      <thead className="bg-gray-100 text-gray-700 text-xs uppercase sticky top-0 z-10">
  <tr>
    <th className="px-4 py-3 text-left">S.No</th>
                                    {columns.map(col => (
                                        <th key={col.key} className={`p-2 ${getAlignClass(col.key)}`}>
                                            {col.label}
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>

<tbody className="divide-y">

{/* ================= CREATE ROW ================= */}
{isCreating && (
  <tr className="bg-blue-50">

    <td className="px-4 py-3">#</td>

    {columns.map(col => {
      const isDate = isDateColumn(col);

      const inputType =
        col.data_type?.toLowerCase().includes("datetime")
          ? "datetime-local"
          : "date";

      return (
        <td key={col.key} className={`px-4 py-3 ${getAlignClass(col.key)}`}>

          <input
            type={isDate ? inputType : "text"}
            className={`border px-2 py-1 rounded w-full ${getAlignClass(col.key)}`}
            value={
              isDate
                ? formatForInput(newRow[col.key], inputType)
                : (newRow[col.key] || "")
            }
            onChange={(e) => {
              let value = e.target.value;

              if (isNumericColumn(col.key)) {
                value = handleNumericInput(value);
              }

              setNewRow({
                ...newRow,
                [col.key]: value
              });
            }}
          />

        </td>
      );
    })}

    {/* ACTIONS */}
    <td className="px-4 py-3 flex gap-2 justify-end">
      <button
        onClick={handleSave}
        className="px-3 py-1.5 text-sm rounded-md border border-blue-300 bg-white 
        hover:bg-blue-100 hover:border-blue-500 transition"
      >
        Save
      </button>

      <button
        onClick={handleCancel}
        className="px-3 py-1.5 text-sm rounded-md border border-red-300 bg-white 
        hover:bg-red-100 hover:border-red-500 transition"
      >
        Cancel
      </button>
    </td>

  </tr>
)}

{/* ================= DATA ROWS ================= */}
{paginatedRows.map((row, i) => {
  const rowKey = row.id ?? i;

  return (
    <tr key={rowKey} className="border-b hover:bg-gray-50">

      <td className="px-4 py-3">
        {(page - 1) * pageSize + i + 1}
      </td>

      {columns.map(col => {
        const isDate = isDateColumn(col);

        const inputType =
          col.data_type?.toLowerCase().includes("datetime")
            ? "datetime-local"
            : "date";

        return (
          <td key={col.key} className={`px-4 py-3 ${getAlignClass(col.key)}`}>

            {/* ================= EDIT MODE ================= */}
            {editRowId === rowKey ? (
              <input
                type={isDate ? inputType : "text"}
                className={`border px-2 py-1 rounded w-full ${getAlignClass(col.key)}`}
                value={
                  isDate
                    ? formatForInput(editRow[col.key], inputType)
                    : (editRow[col.key] || "")
                }
                onChange={(e) => {
                  let value = e.target.value;

                  if (isNumericColumn(col.key)) {
                    value = handleNumericInput(value);
                  }

                  setEditRow({
                    ...editRow,
                    [col.key]: value
                  });
                }}
              />
            ) : (
              /* ================= VIEW MODE ================= */
              isDate
                ? formatDateTime(row[col.key])
                : (row[col.key] ?? "-")
            )}

          </td>
        );
      })}

      {/* ================= ACTIONS ================= */}
      <td className="px-4 py-3 flex justify-end gap-2">

        {editRowId === rowKey ? (
          <>
            <button
              onClick={handleSaveEdit}
              className="px-3 py-1.5 text-sm rounded-md border border-blue-300 bg-white 
              hover:bg-blue-100 hover:border-blue-500 transition"
            >
              Save
            </button>

            <button
              onClick={handleCancelEdit}
              className="px-3 py-1.5 text-sm rounded-md border border-red-300 bg-white 
              hover:bg-red-100 hover:border-red-500 transition"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <PermissionButton
              user={activeUser}
              permission="modify"
              onClick={() => {
                setEditRowId(rowKey);
                setEditRow(row);
                setOriginalRow(row);
              }}
              className="px-3 py-1.5 text-sm rounded-md border border-blue-300 bg-white 
              hover:bg-blue-100 hover:border-blue-500 transition"
            >
              Edit
            </PermissionButton>

            <PermissionButton
              user={activeUser}
              permission="delete"
              onClick={() => handleDelete(row)}
              className="px-3 py-1.5 text-sm rounded-md border border-red-300 bg-white 
              hover:bg-red-100 hover:border-red-500 transition"
            >
              Delete
            </PermissionButton>
          </>
        )}

      </td>

    </tr>
  );
})}

</tbody>

                        </table>
                    </div>
                </div>
        </div>
    );
}