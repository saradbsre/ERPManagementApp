import { useEffect, useState, useRef, act } from "react";
import { useLocation, useParams } from "react-router-dom";
import { openPrintWindow } from "../utils/PrintHelper";
import TableFilters from "../components/filters/TableFilters";
import { applyFilters } from "../utils/applyFilters";
import { exportToExcel } from "../utils/export";
import { getAlignClass } from "../utils/leftAlign";
import { isNumericColumn, handleNumericInput } from "../utils/numberValidation";
import { isAmountField, isTotalField, hasAnyAmountValue } from "../utils/costHelpers";
import PermissionButton from "../components/PermissionButton";
import { formatDate } from "../utils/formatDate";
import { Currency } from "lucide-react";
import DateOnlyFilter from "../components/DateOnlyFilter";
import PaymentRequestEntryForm from "../components/paymentreqform/PaymentRequestEntryForm";
import { getPaymentRequests, deletePaymentRequest } from "../api/api";
import PaymentRequestPreview from "../components/paymentreqform/PaymentRequestPreview";
import { previewPrintContent } from "../utils/PrintHelper";
import Loader from "../components/Loader";
import { formatDateTime } from "../utils/formatDateTime";
import ConfirmModal from "../components/ConfirmationPopups";
import ValidatePopups from "../components/Validatepopups";



export default function PaymentReqForm() {
    const getCurrentMonth = () => {
      const now = new Date();

      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const format = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");

        return `${y}-${m}-${d}`;
      };

      return {
        startDate: format(start),
        endDate: format(end),
      };
    };
    const { id } = useParams();
    const location = useLocation();
    const [columns, setColumns] = useState([]);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [file, setFile] = useState(null);
    const printRef = useRef();
    const pageSize = 10;
    const [masterDataMap, setMasterDataMap] = useState({});
    const [currencies, setCurrencies] = useState([]);
    const [filters, setFilters] = useState([]);
    const [openIndex, setOpenIndex] = useState(null);
    const dropdownRefs = useRef([]);
    const activeUser = JSON.parse(localStorage.getItem("user"));
    const activeUserEmail = activeUser?.email;
    const [dateFilters, setDateFilters] = useState(getCurrentMonth());
    const [activeDateFilter, setActiveDateFilter] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [editData, setEditData] = useState(null);
    const [pendingDateFilters, setPendingDateFilters] = useState(dateFilters);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [popupMessage, setPopupMessage] = useState("");
    const [popupType, setPopupType] = useState("");
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
    const masterList = [
        ...new Set(columns.map(c => c.master).filter(Boolean))
    ];

        const sortedRows = [...rows].sort((a, b) => {
  if (!sortConfig.key) return 0;

  let aValue = a[sortConfig.key];
  let bValue = b[sortConfig.key];

  // date sorting
  if (sortConfig.key === "prf_date") {
    aValue = new Date(aValue).getTime();
    bValue = new Date(bValue).getTime();
  }

  // numeric sorting
  else if (!isNaN(aValue) && !isNaN(bValue)) {
    aValue = Number(aValue);
    bValue = Number(bValue);
  }

  // ascending
  if (sortConfig.direction === "asc") {
    return String(aValue).localeCompare(
      String(bValue),
      undefined,
      { numeric: true }
    );
  }

  // descending
  return String(bValue).localeCompare(
    String(aValue),
    undefined,
    { numeric: true }
  );
});



    const handleSort = (key) => {
  let direction = "asc";

  if (
    sortConfig.key === key &&
    sortConfig.direction === "asc"
  ) {
    direction = "desc";
  }

  setSortConfig({ key, direction });
};
    // ================= SEARCH FILTER =================
    const filteredRows = sortedRows.filter(row =>
      Object.values(row)
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase())
    );
    const finalRows = filteredRows;

    // ================= PAGINATION =================
    const totalPages = Math.ceil(finalRows.length / pageSize);

    const getPaymentRequestsData = async (startDate, endDate) => {
        setLoading(true);
        try {
            const res = await getPaymentRequests(activeUserEmail, startDate, endDate);
            setRows(res.data || []);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    useEffect(() => {
        getPaymentRequestsData(dateFilters.startDate, dateFilters.endDate);
    }, []);

   const handleDelete = async (id) => {
  setConfirmData({
    title: "Confirm Deletion",
    message: "Are you sure you want to delete this payment request? This action cannot be undone.",
    confirmText: "Delete",
    cancelText: "Cancel",
    type: "danger",
    onConfirm: async () => {
      setLoading(true); // <-- Move here
      setConfirmOpen(false);
      try {
        await deletePaymentRequest(id, activeUserEmail);
        await getPaymentRequestsData(dateFilters.startDate, dateFilters.endDate);
        setPopupMessage("Payment request deleted successfully.");
        setPopupType("success");
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
  });
  setConfirmOpen(true);
};

   const handleClear = async () => {
  const defaults = getCurrentMonth();

  setDateFilters(defaults);
  setPendingDateFilters(defaults); // <-- Add this line

  try {
    setLoading(true);
    const res = await getPaymentRequests(activeUserEmail, defaults.startDate, defaults.endDate);
    setRows(res.data || []);
  } catch (err) {
    console.error(err);
    setRows([]);
  } finally {
    setLoading(false);
  }
};

    const handleApplyDateFilter = () => {
  setDateFilters(pendingDateFilters);
  getPaymentRequestsData(pendingDateFilters.startDate, pendingDateFilters.endDate);
};
const onPendingInputChange = (e) => {
  const { name, value } = e.target;
  setPendingDateFilters(prev => ({
    ...prev,
    [name]: value,
  }));
};

const handleSaveAndPreview = (savedData) => {
  setShowForm(false);
  setEditData(null);
  setPreviewData(savedData); // savedData should have {header, details}
  setShowPreview(true);
};


  return (
  <div className="h-full flex flex-col">



    {/* ================= HEADER ================= */}
    <div className="flex justify-between items-center mb-4">
      <ValidatePopups
                    type={popupType}
                    message={popupMessage}
                    onClose={() => {
                      setPopupMessage("");
                      setPopupType("success");
                    }}
                  />
      <h1 className="text-xl font-semibold text-gray-800">
        Payment Request Form
      </h1>

      <div className="flex items-center gap-2">
      {!showPreview && (
  <PermissionButton
    user={activeUser}
    permission="add"
    onClick={() => setShowForm(prev => !prev)}
    className={`px-3 py-1.5 text-sm rounded-md text-white transition
    ${showForm ? "bg-gray-600 hover:bg-gray-700" : "bg-green-600 hover:bg-green-700"}
    `}
  >
    {showForm ? "← Back" : "+ New"}
  </PermissionButton>
)}
      </div>
    </div>
{showPreview ? (
  <>
    
   <div className="print-area" ref={printRef}>
  <PaymentRequestPreview
  data={previewData}
  onBack={() => {
    setShowPreview(false);
    getPaymentRequestsData(dateFilters.startDate, dateFilters.endDate); // <-- Add this line
  }}
  hideBackPrint
/>
</div>
  </>
) : !showForm ? (

      <>
        {/* ================= CONTROL BAR ================= */}
        <div className="bg-white p-3 rounded-xl shadow mb-4 flex flex-wrap items-center gap-3">

          {/* SEARCH */}
          <input
            type="text"
            placeholder="Search records..."
            className="border px-3 py-2 rounded-lg w-64"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

 

<div style={{ display: "flex", gap: 12, alignItems: "center" }}>
  <input
    type="date"
    name="startDate"
    value={pendingDateFilters.startDate}
    onChange={onPendingInputChange}
    style={{
      padding: "8px 12px",
      borderRadius: 6,
      border: "1px solid #ccc",
      fontSize: 14,
      minWidth: 150,
      maxWidth: 180,
      background: "#f8fafc",
      textAlign: "center",
    }}
  />

  <span style={{ fontSize: 14, color: "#666" }}>to</span>

  <input
    type="date"
    name="endDate"
    value={pendingDateFilters.endDate}
    onChange={onPendingInputChange}
    style={{
      padding: "8px 12px",
      borderRadius: 6,
      border: "1px solid #ccc",
      fontSize: 14,
      minWidth: 150,
      maxWidth: 180,
      background: "#f8fafc",
      textAlign: "center",
    }}
  />
</div>
<button
  onClick={handleApplyDateFilter}
  className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-100"
>
  Apply
</button>
<button
    onClick={handleClear}
  className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-100"
>
  Clear
</button>
 <button
  onClick={() =>
    setActiveDateFilter(
      activeDateFilter === "custom" ? null : "custom"
    )
  }
  className={`px-3 py-2 border rounded-lg text-sm hover:bg-gray-100 ${
    activeDateFilter === "custom" ? "bg-gray-100" : ""
  }`}
>
  Custom Range
</button>

          {/* PAGINATION */}
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
            Total: {finalRows.length}
          </span>

        </div>

        {/* DATE FILTER PANEL */}
        {activeDateFilter && (
          <div className="mb-4">
            <DateOnlyFilter
              onApply={(range) => {
                if (!range?.start || !range?.end) return;
                setPendingDateFilters({
                  startDate: range.start,
                  endDate: range.end,
                });
                getPaymentRequestsData(range.start, range.end);
              
                setActiveDateFilter(null);
              }}
            />
          </div>
        )}

    
       
        {/* ================= TABLE ================= */}
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
                                <th className="px-4 py-3 border-b text-left">S.No</th> 

    {[
      { label: "Paid To", key: "paid_to" },
      { label: "PRF No", key: "prf_number" },
      { label: "Date", key: "prf_date", format: formatDate },
      { label: "Division", key: "division" },
      { label: "Amount", key: "amount" },
      { label: "Currency", key: "currency" },
      { label: "Payment Mode", key: "payment_mode" },
      { label: "Paid By", key: "paid_by" },
    ].map((col) => (
      <th
        key={col.key}
        onClick={() => handleSort(col.key)}
        className={`px-4 py-3 cursor-pointer border-b select-none hover:bg-gray-200 ${
          col.key === "amount" ? "text-right" : "text-left"
        }`}
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

    <th className="px-4 py-3 text-right border-b">Actions</th>

  </tr>
</thead>

      <tbody>

        {finalRows.map((row, index) => (
          <tr key={row.id} className="border-b hover:bg-gray-50">

            <td className="px-4 py-2">{index + 1}</td>

            <td className="px-4 py-2">{row.paid_to}</td>

            <td className="px-4 py-2">{row.prf_number}</td>

            <td className="px-4 py-2">
              {formatDate(row.created_at)}
            </td>

            <td className="px-4 py-2">{row.division}</td>

            <td className="px-4 py-2 text-right font-medium">
              {Number(row.amount).toFixed(2)}
            </td>

            <td className="px-4 py-2">{row.currency}</td>

            <td className="px-4 py-2">{row.payment_mode}</td>

            <td className="px-4 py-2">{row.paid_by}</td>

            {/* ACTIONS */}
            <td className="px-4 py-2 text-right flex justify-end gap-2">

              {/* PREVIEW */}
             <button
                onClick={() => {
                  setPreviewData({
                    header: row,
                    details: Array.isArray(row.details) ? row.details : []
                  });
                  setShowPreview(true);
                }}
                className="px-3 py-1.5 text-sm rounded-md border border-green-300 bg-white 
                  hover:bg-green-100 hover:border-green-500 transition"
              >
                Preview
              </button>

              {/* EDIT */}
              <button
                 onClick={() => {
                  setEditData(row);
                  setShowForm(true);
                }}
                className="px-3 py-1.5 text-sm rounded-md border border-blue-300 bg-white 
              hover:bg-blue-100 hover:border-blue-500 transition"
              >
                Edit
              </button>

              <button
                 onClick={() => handleDelete(row.id)}
                className="px-3 py-1.5 text-sm rounded-md border border-red-300 bg-white 
              hover:bg-red-100 hover:border-red-500 transition"
              >
                Delete
              </button>

            </td>

          </tr>
        ))}

      </tbody>

    </table>
                  )}
  </div>

</div>
      </>

    ) : (

      <PaymentRequestEntryForm
  onBack={() => {
    setShowForm(false);
    setEditData(null); // clear edit data when closing form
  }}
  editData={editData}
  onRefresh={getPaymentRequestsData}
  onSaveAndPreview={handleSaveAndPreview}
/>

    )}

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