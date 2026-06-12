import { useEffect, useState, useRef, act } from "react";
import { useParams, useLocation } from "react-router-dom";
import { getMasterData, createMasterData, updateMasterData, deleteMasterData, saveProviderPlans,getProviderPlans } from "../../api/api"; // 👈 create this API
import masterTableConfig from "../../utils/masterTableConfig"; // 👈 create this config
import { getAlignClass } from "../../utils/leftAlign";
import { handleNumericInput, isNumericColumn } from "../../utils/numberValidation";
import PermissionButton from "../PermissionButton";
import { formatDateTime } from "../../utils/formatDateTime";
import { formatDate } from "../../utils/formatDate";
import ValidatePopups from "../Validatepopups";
import Loader from "../Loader";
import ConfirmModal from "../ConfirmationPopups";
import PlanDropdown from "./PlanDropdown";


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
    const [loading, setLoading] = useState(false);
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
    const [showValidatePopup, setShowValidatePopup] = useState(false);
    const [validationMessage, setValidationMessage] = useState("");
    const [validationType, setValidationType] = useState("success"); // success, error, warning
    const [showPlansModal, setShowPlansModal] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState(null);
    const [allPlans, setAllPlans] = useState([]);
    const [selectedPlans, setSelectedPlans] = useState([]);
    const [newPlanName, setNewPlanName] = useState("");
    const [editingPlanId, setEditingPlanId] = useState(null);
    const [editingPlanName, setEditingPlanName] = useState("");
    const [servicesList, setServicesList] = useState([]);
    const [providersList, setProvidersList] = useState([]);
    const [vendorList, setVendorList] = useState([]);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [popupMessage, setPopupMessage] = useState("");
    const [popupType, setPopupType] = useState("");
    const [mappedPlans, setMappedPlans] = useState([]);
    const [unmappedPlans, setUnmappedPlans] = useState([]);
    const [selectedPlanToAdd, setSelectedPlanToAdd] = useState("");
    const [inventoryType, setInventoryType] = useState([]);
    const [confirmData, setConfirmData] = useState({
      title: "Are you sure?",
      message: "This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
      onConfirm: null,
    });
    const [sortConfig, setSortConfig] = useState({
      key: null,
      direction: "asc",
    });
    const formatCard = (value, columnName) => {
  if (!value) return "";

  const name = columnName.toLowerCase();

  // check if it's a card field
  if (name.includes("card_4number")) {
    const last4 = value.toString().slice(-4);
    return `**** **** **** ${last4}`;
  }

  return value;
};
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
const handleCreatePlan = async () => {
  if (!newPlanName.trim()) return;
  setLoading(true);
  try {
    const res = await createMasterData("plans", {
      plan_name: newPlanName,
     // plan_code: newPlanName.toLowerCase().replace(/\s+/g, "_")
    }, activeUserEmail);

    setAllPlans(prev => [...prev, res.data]);
    setNewPlanName("");
    setPopupMessage("Master created successfully!");
    setPopupType("success");
  } catch (err) {
    console.error("CREATE PLAN ERROR:", err);
    setPopupMessage("Error creating master!");
    setPopupType("error");
  } finally {
    setLoading(false);
  }
};
const handleUpdatePlan = async (id) => {
  try {
    setLoading(true);
    await updateMasterData("plans", id, {
      plan_name: editingPlanName
    }, activeUserEmail);

    setAllPlans(prev =>
      prev.map(p =>
        p.id === id ? { ...p, plan_name: editingPlanName } : p
      )
    );

    setEditingPlanId(null);
    setEditingPlanName("");
    setPopupMessage("Master updated successfully!");
    setPopupType("success");
  } catch (err) {
    setPopupMessage("Error updating master!");
    setPopupType("error");
    console.error("UPDATE PLAN ERROR:", err);
  }
    finally {
    setLoading(false);
  }
};

const handleSort = (columnName) => {
  let direction = "asc";

  if (
    sortConfig.key === columnName &&
    sortConfig.direction === "asc"
  ) {
    direction = "desc";
  }

  setSortConfig({
    key: columnName,
    direction,
  });
};

const openPlansModal = async (provider) => {
  try {
    if (!provider || !provider.id) {
      setValidationMessage("Please save provider first before assigning plans");
      setValidationType("warning");
      setShowValidatePopup(true);
      return;
    }

    setSelectedProvider(provider);
    setShowPlansModal(true);

    // 1. Get all plans
    const plansRes = await getMasterData("plans", activeUserEmail);
    const allPlans = plansRes.data || [];

    // 2. Get mapped plans for provider
    const mappedRes = await getProviderPlans(provider.id);
    const mappedIds = (mappedRes?.data || []).map(p => p.plan_id);

    // 3. Split mapped and unmapped plans
    setMappedPlans(allPlans.filter(plan => mappedIds.includes(plan.id)));
    setUnmappedPlans(allPlans.filter(plan => !mappedIds.includes(plan.id)));
    setSelectedPlans(mappedIds);

  } catch (err) {
    console.error("OPEN PLANS ERROR:", err);
    setValidationMessage("Failed to load plans");
    setValidationType("error");
    setShowValidatePopup(true);
  }
};
const handleSavePlans = async () => {
  setLoading(true);
  try {
    await saveProviderPlans({
      provider_id: selectedProvider.id,
      plan_ids: selectedPlans
    }, activeUserEmail);
    setLoading(false);
    setValidationMessage("Plans updated successfully!");
    setValidationType("success");
    setShowValidatePopup(true);

    setShowPlansModal(false);
  } catch (err) {
    setLoading(false);
    console.error("SAVE PLANS ERROR:", err);
    setValidationMessage("Failed to save plans");
    setValidationType("error");
    setShowValidatePopup(true);
  } finally {
    setLoading(false);
  }
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
    setLoading(true);
    const res = await getMasterData(masterName, activeUserEmail);
    const data = res.data || [];

    const withIds = data.map((row, index) => ({
      ...row,
      id: row.id || index + 1   // fallback id
    }));
    
    setRows(withIds);
    setLoading(false);
  } catch (err) {
    console.error(err);
  }
};

useEffect(() => {
  const loadVendors = async () => {
    try {
      const res = await getMasterData("vendors", activeUserEmail);
      setVendorList(res?.data || []);
    } catch (err) {
      setVendorList([]);
    }
  };
  loadVendors();
}, [activeUserEmail]);

useEffect(() => {
  const loadInventoryType = async () => {
    try {
      const res = await getMasterData("inventory_types", activeUserEmail);
      setInventoryType(res?.data || []);
    } catch (err) {
      setInventoryType([]);
    }
  };
  loadInventoryType();
}, [activeUserEmail]);



  const filteredRows = rows.filter(row => {
  if (!search) return true;

  return Object.values(row)
    .join(" ")
    .toLowerCase()
    .includes(search.toLowerCase());
});

useEffect(() => {
  const loadServices = async () => {
    try {
      const res = await getMasterData("product_types", activeUserEmail);

      setServicesList(res?.data ||  []);
      console.log("Loaded services:", res.data|| []);
    } catch (err) {
      console.error("Error loading services:", err);
    }
  };

  loadServices();
}, [activeUserEmail]);

useEffect(() => {
  const loadProviders = async () => {
    try {
      const res = await getMasterData("providers", activeUserEmail);

      setProvidersList(res?.data ||  []);
      console.log("Loaded providers:", res.data|| []);
    } catch (err) {
      console.error("Error loading providers:", err);
    }
  };

  loadProviders();
}, [activeUserEmail]);

const handleSave = async () => {
  setLoading(true);
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
    setValidationMessage("Record created successfully!");
    setValidationType("success");
    setShowValidatePopup(true);
    setIsCreating(false);
    setNewRow({});

    loadMasterData();
  } catch (err) {
    console.error("CREATE ERROR:", err);
    setValidationMessage("Error creating record!");
    setValidationType("error");
    setShowValidatePopup(true);
  }
    finally {
    setLoading(false);
  }
};

const handleCancel = () => {
  setIsCreating(false);
  setNewRow({});
};

const handleDelete = (row) => {
  setLoading(true);
  setConfirmData({
    title: "Delete Record",
    message: "Are you sure you want to delete this record?",
    confirmText: "Delete",
    cancelText: "Cancel",
    type: "danger",
    onConfirm: async () => {
      setConfirmOpen(false);
      try {
        await deleteMasterData(masterName, row.id, activeUserEmail);
        setValidationMessage("Record deleted successfully!");
        setValidationType("success");
        setPopupMessage("Record deleted successfully!");
        setPopupType("success");
        setShowValidatePopup(true);
        loadMasterData();
        setLoading(false);
      } catch (err) {
        setLoading(false);
        console.error("DELETE ERROR:", err);
        setValidationMessage("Error deleting record!");
        setValidationType("error");
        setPopupMessage("Error deleting record!");
        setPopupType("error");
        setShowValidatePopup(true);
      }
    }
  });
  setConfirmOpen(true);
};

const handleSaveEdit = async () => {
  setLoading(true);
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
    setValidationMessage("Record updated successfully!");
    setValidationType("success");
    setShowValidatePopup(true);
    setPopupMessage("Record updated successfully!");
    setPopupType("success");

    setEditRowId(null);
    setEditRow({});
    setOriginalRow({});

    loadMasterData();
  } catch (err) {
    setValidationMessage("Error updating record!");
    setValidationType("error");
    setShowValidatePopup(true);
    setPopupMessage("Error updating record!");
    setPopupType("error");
    console.error("UPDATE ERROR:", err);
    setLoading(false);
  } finally {
    setLoading(false);
  }
};

const handleCancelEdit = () => {
  setEditRowId(null);
  setEditRow({});
};

const sortedRows = [...filteredRows].sort((a, b) => {
  if (!sortConfig.key) return 0;

  let aValue = a[sortConfig.key];
  let bValue = b[sortConfig.key];

  // normalize object values
  aValue =
    typeof aValue === "object"
      ? aValue?.value ?? ""
      : aValue ?? "";

  bValue =
    typeof bValue === "object"
      ? bValue?.value ?? ""
      : bValue ?? "";

  // numeric sort
  if (!isNaN(aValue) && !isNaN(bValue)) {
    return sortConfig.direction === "asc"
      ? Number(aValue) - Number(bValue)
      : Number(bValue) - Number(aValue);
  }

  // string sort
  return sortConfig.direction === "asc"
    ? String(aValue).localeCompare(String(bValue))
    : String(bValue).localeCompare(String(aValue));
});

const paginatedRows = sortedRows.slice(startIndex, endIndex);

useEffect(() => {
  setTotalPages(Math.ceil(sortedRows.length / pageSize));
}, [sortedRows]);


const getLabel = (key, value) => {
  if (key === "is_vat") return value ? "YES" : "NO";
  if (key === "is_active") return value ? "ACTIVE" : "INACTIVE";
  return value ? "YES" : "NO";
};

    return (
        <div className="h-full flex flex-col">
           <ValidatePopups
                type={popupType}
                message={popupMessage}
                onClose={() => {
                  setPopupMessage("");
                  setPopupType("success");
                }}
              />

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

  {/* RIGHT SIDE */}
  <div className="ml-auto flex items-center gap-3">

   

    {/* PAGINATION */}
    <div className="flex items-end gap-2 text-sm">
      <button
        disabled={page === 1}
        onClick={() => setPage(1)}
        className="px-3 py-1 rounded-md border hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        title="First Page"
      >
        ⏮
      </button>

      <button
        disabled={page === 1}
        onClick={() => setPage((p) => Math.max(p - 1, 1))}
        className="px-3 py-1 rounded-md border hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        title="Previous"
      >
        ◀
      </button>

      <div className="px-3 py-1 rounded-md bg-gray-50 border text-gray-700 font-medium">
        {page} / {totalPages || 1}
      </div>

      <button
        disabled={page === totalPages}
        onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
        className="px-3 py-1 rounded-md border hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        title="Next"
      >
        ▶
      </button>

      <button
        disabled={page === totalPages}
        onClick={() => setPage(totalPages)}
        className="px-3 py-1 rounded-md border hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        title="Last Page"
      >
        ⏭
      </button>
    </div>
     {/* RECORD COUNT */}
    <span className="text-sm text-gray-500">
      Total : {filteredRows.length}
    </span>

  </div>

</div>
               
            


          

            
                  {/* TABLE */}
             <div className="bg-white rounded-xl shadow flex-1 flex flex-col overflow-hidden">
  <div className="flex-1 w-full overflow-auto">
    {loading ? (
      <div className="flex items-center justify-center h-64">
        <Loader type="orbit" />
      </div>
    ) : (
    <table className="min-w-max w-full text-sm">
      <thead className="bg-gray-100 text-gray-700 text-xs uppercase sticky top-0 z-10">
  <tr>
    <th className="px-4 py-3 text-left">S.No</th>
                                    {columns.map(col => (
                                        <th
                                            key={col.key}
                                            onClick={() => handleSort(col.key)}
                                            className={`p-2 ${getAlignClass(col.key)} cursor-pointer select-none hover:bg-gray-200`}
                                        >
                                            <div className="flex items-center gap-1">
                                                <span>{col.label}</span>
                                                {sortConfig.key === col.key ? (
                                                    sortConfig.direction === "asc" ? (
                                                        <span>▲</span>
                                                    ) : (
                                                        <span>▼</span>
                                                    )
                                                ) : (
                                                    <span className="text-gray-400">↕</span>
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                    {masterName === "products" && (
  <th className="px-4 py-3 text-center">Plans</th>
)}
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

      const isToggle =
        col.key.toLowerCase() === "is_active" ||
        col.key.toLowerCase() === "is_vat" ||
        col.key.toLowerCase() === "is_inventory";

      const isServiceMaster =
        col.key.toLowerCase() === "services";

      const isVendor =
        col.key.toLowerCase() === "vendor";

      const isInventoryType =
        col.key.toLowerCase() === "inventory_type";

      const isCodeColumn = col.key.toLowerCase().includes("_code");

      const isIcannFee = col.key.toLowerCase() === "icann_fee";

      return (

        <td
          key={col.key}
          className={`px-4 py-3 ${getAlignClass(col.key)}`}
        >

          {/* ================= VENDOR ================= */}
          {isVendor ? (

            <select
              className="border px-2 py-1 rounded w-full"
              value={newRow.vendor || ""}
              //disabled={isCodeColumn || (isIcannFee && !newRow.is_icann)}
              onChange={(e) =>
                setNewRow(prev => ({
                  ...prev,
                  vendor: e.target.value
                }))
              }
            >

              <option value="">
                Select Vendor
              </option>
              
              {vendorList.map(v => (

                <option
                  key={v.vendor_code}
                  value={v.vendor_code}
                >
                  {v.vendor_name}
                </option>

              ))}

            </select>

          ) :  isInventoryType ? (

            <select
              className="border px-2 py-1 rounded w-full"
              value={newRow.inventory_type || ""}
             // disabled={isCodeColumn || (isIcannFee && !newRow.is_icann)}
              onChange={(e) =>
                setNewRow(prev => ({
                  ...prev,
                  inventory_type: e.target.value
                }))
              }
            >

              <option value="">
                Select Inventory Type
              </option>
              
              {inventoryType.map(v => (

                <option
                  key={v.inventory_type_code}
                  value={v.inventory_type_code}
                >
                  {v.inventory_type}
                </option>

              ))}

            </select>

          ) : isToggle ? (

            /* ================= TOGGLE ================= */

            <button
              onClick={() =>
                setNewRow(prev => ({
                  ...prev,
                  [col.key]: prev[col.key] ? 0 : 1
                }))
              }
             // disabled={isCodeColumn || (isIcannFee && !newRow.is_icann)}
              className={`
                w-12 h-6 flex items-center
                rounded-full p-1
                transition-colors duration-200
                ${
                  newRow[col.key]
                    ? "bg-green-500"
                    : "bg-gray-300"
                }
              `}
            >

              <div
                className={`
                  bg-white w-4 h-4 rounded-full shadow
                  transform transition-transform duration-200
                  ${
                    newRow[col.key]
                      ? "translate-x-6"
                      : "translate-x-0"
                  }
                `}
              />

            </button>

          ) : isServiceMaster ? (

            /* ================= SERVICES ================= */

            <div className="relative">

              <select
                className="border px-2 py-1 rounded w-full"
               // disabled={isCodeColumn || (isIcannFee && !newRow.is_icann)}
                value={newRow[col.key] || ""}

                onChange={(e) =>
                  setNewRow(prev => ({
                    ...prev,
                    [col.key]: e.target.value
                  }))
                }
              >

                <option value="">
                  Select Service
                </option>

                {(servicesList || []).map((s, i) => (

                  <option
                    key={i}
                    value={s.service_code}
                  >
                    {s.service_name}
                  </option>

                ))}

              </select>

            </div>

          ) : (

            /* ================= NORMAL INPUT ================= */

            <input

              type={isDate ? "date" : "text"}
             // disabled={isCodeColumn || (isIcannFee && !newRow.is_icann)}
              className={`
                border px-2 py-1 rounded w-full
                ${getAlignClass(col.key)}
              `}

              value={
                isDate
                  ? formatForInput(newRow[col.key], "date")
                  : (formatCard(newRow[col.key], col.key) || "")
              }

              onChange={(e) => {

                let value = e.target.value;

                if (isNumericColumn(col.key)) {
                  value = handleNumericInput(value);
                }

                setNewRow(prev => ({
                  ...prev,
                  [col.key]: value
                }));

              }}

            />

          )}

        </td>

      );

    })}

    {/* ================= PLANS BUTTON ================= */}
    {masterName === "products" && (

      <td className="px-4 py-3 text-center">

        {/* Future plans button */}

      </td>

    )}

    {/* ================= ACTIONS ================= */}
    <td className="px-4 py-3 flex gap-2 justify-end">

      <button
        onClick={handleSave}
        className="
          px-3 py-1.5 text-sm rounded-md
          border border-blue-300 bg-white
          hover:bg-blue-100 hover:border-blue-500
          transition
        "
      >
        Save
      </button>

      <button
        onClick={handleCancel}
        className="
          px-3 py-1.5 text-sm rounded-md
          border border-red-300 bg-white
          hover:bg-red-100 hover:border-red-500
          transition
        "
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

    <tr
      key={rowKey}
      className="border-b hover:bg-gray-50"
    >

      {/* ================= S.NO ================= */}
      <td className="px-4 py-3">
        {(page - 1) * pageSize + i + 1}
      </td>

      {/* ================= DYNAMIC COLUMNS ================= */}
      {columns.map(col => {

        const isDate = isDateColumn(col);

        const isToggle =
          col.key.toLowerCase() === "is_active" ||
          col.key.toLowerCase() === "is_vat" ||
          col.key.toLowerCase() === "is_inventory";

        const isService =
          col.key.toLowerCase() === "services";

        const isVendor =
          col.key.toLowerCase() === "vendor";

        const inputType = "date";

        const isCodeColumn = col.key.toLowerCase().includes("_code");

        const isIcannFee = col.key.toLowerCase() === "icann_fee";
        const isInventoryType =
          col.key.toLowerCase() === "inventory_type";
        return (

          <td
            key={col.key}
            className={`px-4 py-3 ${getAlignClass(col.key)}`}
          >

            {/* ================= EDIT MODE ================= */}
            {editRowId === rowKey ? (

              isVendor ? (

                /* ================= VENDOR DROPDOWN ================= */
                <select
                  className="border px-2 py-1 rounded w-full"
                  value={editRow[col.key] || ""}
                  disabled={isCodeColumn || (isIcannFee && !editRow.is_icann)}
                  onChange={(e) =>
                    setEditRow(prev => ({
                      ...prev,
                      [col.key]: e.target.value
                    }))
                  }
                >

                  <option value="">
                    Select Vendor
                  </option>

                  {vendorList.map(v => (

                    <option
                      key={v.vendor_code}
                      value={v.vendor_code}
                    >
                      {v.vendor_name}
                    </option>

                  ))}

                </select>

              ) : isInventoryType ? (

                /* ================= INVENTORY TYPE DROPDOWN ================= */
                <select
                  className="border px-2 py-1 rounded w-full"
                  value={editRow[col.key] || ""}
                  disabled={isCodeColumn || (isIcannFee && !editRow.is_icann)}
                  onChange={(e) =>
                    setEditRow(prev => ({
                      ...prev,
                      [col.key]: e.target.value
                    }))
                  }
                >
                  <option value="">
                    Select Inventory Type
                  </option>

                  {inventoryType.map((i) => (

                    <option
                      key={i.inventory_type_code}
                      value={i.inventory_type_code}
                    >
                      {i.inventory_type}
                    </option>

                  ))}

                </select>

              ) : isService ? (

                /* ================= SERVICES DROPDOWN ================= */
                <select
                  className="border px-2 py-1 rounded w-full"
                  value={editRow[col.key] || ""}
                  disabled={isCodeColumn || (isIcannFee && !editRow.is_icann)}
                  onChange={(e) =>
                    setEditRow(prev => ({
                      ...prev,
                      [col.key]: e.target.value
                    }))
                  }
                >

                  <option value="">
                    Select Service
                  </option>

                  {servicesList.map((s) => (

                    <option
                      key={s.service_code}
                      value={s.service_code}
                    >
                      {s.service_name}
                    </option>

                  ))}

                </select>

              ) : isToggle ? (

                /* ================= TOGGLE ================= */
                <button
                  onClick={() =>
                    setEditRow(prev => ({
                      ...prev,
                      [col.key]: prev[col.key] ? 0 : 1
                    }))
                  }
                  //disabled={isCodeColumn || (isIcannFee && !editRow.is_icann)}
                  className={`
                    w-12 h-6 flex items-center rounded-full p-1 transition
                    ${editRow[col.key]
                      ? "bg-green-500"
                      : "bg-gray-300"}
                  `}
                >

                  <div
                    className={`
                      bg-white w-4 h-4 rounded-full shadow transform transition
                      ${editRow[col.key]
                        ? "translate-x-6"
                        : ""}
                    `}
                  />

                </button>

              ) : (

                /* ================= INPUT ================= */
                <input
                  type={isDate ? inputType : "text"}
                  //disabled={isCodeColumn || (isIcannFee && !editRow.is_icann)}
                  className={`
                    border px-2 py-1 rounded w-full
                    ${getAlignClass(col.key)}
                  `}
                  value={
                    isDate
                      ? formatForInput(
                          editRow[col.key],
                          inputType
                        )
                      : (
                          formatCard(
                            editRow[col.key],
                            col.key
                          ) || ""
                        )
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

              )

            ) : (

              /* ================= VIEW MODE ================= */

              isToggle ? (

                <span
                  className={`
                    px-2 py-1 text-xs rounded-full font-medium
                    ${row[col.key]
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-200 text-gray-600"}
                  `}
                >
                  {getLabel(col.key, row[col.key])}
                </span>

              ) : isDate ? (

                formatDate(row[col.key])

              ) : isVendor ? (

                vendorList.find(
                  v => v.vendor_code === row[col.key]
                )?.vendor_name || "-"

              ) : isInventoryType ? (

                inventoryType.find(
                  i => i.inventory_type_code === row[col.key]
                )?.inventory_type || "-"
              ) : isService ? (

                servicesList.find(
                  s => s.service_code === row[col.key]
                )?.service_name || "-"

              ) : (

                formatCard(
                  row[col.key],
                  col.key
                ) || "-"

              )

            )}

          </td>

        );

      })}
      

      {/* ================= SERVICE ACTION COLUMN ================= */}
      {masterName === "products" && (

        <td className="px-4 py-3 text-center">

          {editRowId === rowKey ? (

            null

          ) : (

            <>
            
             {String(row.services).trim().toUpperCase() === "S01" ? (

  <button
    onClick={() => openPlansModal(row)}
    className="
      px-2 py-1 text-xs rounded
      border border-blue-300
      hover:bg-blue-100
    "
  >
    Manage Plans
  </button>

) : (

  <span className="text-sm text-black-700">
    {providersList.find(
      p => p.provider_code === row.providers
    )?.provider_name || "-"}
  </span>

)}
            </>

          )}

        </td>

      )}

      {/* ================= ACTIONS ================= */}
      <td className="px-4 py-3 flex justify-end gap-2">

        {editRowId === rowKey ? (

          <>
            <button
              onClick={handleSaveEdit}
              className="
                px-3 py-1.5 text-sm rounded-md
                border border-blue-300
                bg-white hover:bg-blue-100
              "
            >
              Save
            </button>

            <button
              onClick={handleCancelEdit}
              className="
                px-3 py-1.5 text-sm rounded-md
                border border-red-300
                bg-white hover:bg-red-100
              "
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
              className="
                px-3 py-1.5 text-sm rounded-md
                border border-blue-300
                bg-white hover:bg-blue-100
              "
            >
              Edit
            </PermissionButton>

            <PermissionButton
              user={activeUser}
              permission="delete"
              onClick={() => handleDelete(row)}
              className="
                px-3 py-1.5 text-sm rounded-md
                border border-red-300
                bg-white hover:bg-red-100
              "
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
    )}
                       {showPlansModal && (
  <Modal
    title={`Plans - ${selectedProvider?.provider_name || "New Provider"}`}
    onClose={() => setShowPlansModal(false)}
  >
    {loading ? (
      <div className="flex items-center justify-center h-48">
        <Loader type="orbit" />
      </div>
    ) : (
      <>
    {/* ================= PLAN GRID ================= */}
    <div className="grid grid-cols-2 gap-3 max-h-72 overflow-auto pr-2">

   {mappedPlans.map(plan => (
  <div
    key={plan.id}
    className="p-3 rounded-lg border border-blue-500 bg-blue-50 flex items-center justify-between"
  >
    <div className="flex items-center gap-2">
      {editingPlanId === plan.id ? (
        <input
          value={editingPlanName}
          onChange={(e) => setEditingPlanName(e.target.value)}
          className="border px-2 py-1 rounded text-sm w-28"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="font-medium text-sm">
          {plan.plan_name}
        </span>
      )}
    </div>
    <div className="flex gap-2 items-center">
   
      {/* Remove/Unmap button */}
      <button
        onClick={() => {
          setMappedPlans(mappedPlans.filter(p => p.id !== plan.id));
          setSelectedPlans(selectedPlans.filter(id => id !== plan.id));
          setUnmappedPlans([...unmappedPlans, plan]);
        }}
        className="text-red-600 text-xs font-semibold"
        title="Unmap this plan"
      >
        Remove
      </button>
    </div>
  </div>
))}

    </div>
   
    {/* ================= ADD NEW PLAN ================= */}
    <div className="mt-4 border-t pt-4">

      

       <div className="flex gap-2">
<select
  value={selectedPlanToAdd}
  onChange={(e) => setSelectedPlanToAdd(e.target.value)}
  className="border px-3 py-2 rounded w-full focus:outline-blue-400"
>
  <option value="">Select plan</option>

  {unmappedPlans.slice(0, 5).map(plan => (
    <option key={plan.id} value={plan.plan_name}>
      {plan.plan_name}
    </option>
  ))}
</select>
  <button
    onClick={async () => {
      if (!selectedPlanToAdd.trim()) return;
      // Check if the input matches an existing unmapped plan
      const existing = unmappedPlans.find(
        p => p.plan_name.toLowerCase() === selectedPlanToAdd.trim().toLowerCase()
      );
      let planToAdd;
      if (existing) {
        planToAdd = existing;
      } else {
        // Create new plan in master
        try {
          const res = await createMasterData("plans", {
            plan_name: selectedPlanToAdd.trim()
          }, activeUserEmail);
          planToAdd = res.data;
          setAllPlans(prev => [...prev, planToAdd]);
        } catch (err) {
          setValidationMessage("Error creating plan!");
          setValidationType("error");
          setShowValidatePopup(true);
          return;
        }
      }
      setMappedPlans([...mappedPlans, planToAdd]);
      setSelectedPlans([...selectedPlans, planToAdd.id]);
      setUnmappedPlans(unmappedPlans.filter(p => p.id !== planToAdd.id));
      setSelectedPlanToAdd("");
    }}
    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
  >
    Add
  </button>
   <button
        onClick={handleSavePlans}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Save
      </button>
</div>

 

    </div> </>

  )}
  </Modal>
)}
                    </div>
                </div>
                <ConfirmModal
  open={confirmOpen}
  title={confirmData.title}
  message={confirmData.message}
  confirmText={confirmData.confirmText}
  cancelText={confirmData.cancelText}
  type={confirmData.type}
  onClose={() => setConfirmOpen(false)}
  onConfirm={confirmData.onConfirm}
/>
        </div>
    );
}