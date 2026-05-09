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
import { getPaymentRequests } from "../api/api";
//import PaymentRequestPreview from "../components/paymentreqform/PaymentRequestPreview";




export default function PaymentReqForm() {
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
    const [dateFilters, setDateFilters] = useState({});
    const [activeDateFilter, setActiveDateFilter] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [previewData, setPreviewData] = useState(null);
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
    const finalRows = sortedRows;

    // ================= PAGINATION =================
    const totalPages = Math.ceil(finalRows.length / pageSize);

    const getPaymentRequestsData = async () => {
        setLoading(true);
        try {
            const res = await getPaymentRequests(activeUserEmail);
            setRows(res.data || []);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    useEffect(() => {
        getPaymentRequestsData();
    }, []);





  return (
  <div className="h-full flex flex-col">

    {/* ================= HEADER ================= */}
    <div className="flex justify-between items-center mb-4">

      <h1 className="text-xl font-semibold text-gray-800">
        Payment Request Form
      </h1>

      <div className="flex items-center gap-2">
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
      </div>
    </div>

    {/* ================= CONDITIONAL RENDER ================= */}
    {!showForm ? (

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

          {/* FILTER BUTTON */}
          <TableFilters
            masterList={masterList}
            filters={filters}
            setFilters={setFilters}
            currencies={currencies}
          />

          {/* DATE FILTER */}
          <button
            onClick={() =>
              setActiveDateFilter(
                activeDateFilter === "date" ? null : "date"
              )
            }
            className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-100"
          >
            <div className="flex flex-col items-start">
              Date Filters
            </div>
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

                setDateFilters(prev => ({
                  ...prev,
                  [activeDateFilter]: {
                    start: range.start,
                    end: range.end,
                    source: "picker"
                  }
                }));

                setActiveDateFilter(null);
              }}
            />
          </div>
        )}

        {/* ACTIVE FILTER CHIPS */}
        <div className="flex flex-wrap gap-2 mt-0 mb-4">

          {filters.map((f, i) => {

            const masterName = normalize(f.master);

            const options =
              masterName === "currency"
                ? currencies.map(c => c.currency_code)
                : (masterDataMap?.[masterName] || []).map(normalize);

            const selectedValues = (f.values || []).map(normalize);

            return (
              <div
                key={i}
                className="relative flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-3 py-1 shadow-sm"
              >

                {/* MASTER NAME */}
                <span className="text-sm font-medium text-gray-700">
                  {masterName}
                </span>

                {/* SELECTED VALUES */}
                <div className="flex gap-1 flex-wrap">
                  {selectedValues.map((val, idx) => (
                    <span
                      key={idx}
                      className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                    >
                      {val}

                      <button
                        onClick={() => {
                          const updated = [...filters];

                          updated[i].values =
                            updated[i].values
                              .map(normalize)
                              .filter(v => v !== val);

                          setFilters(updated);
                        }}
                        className="text-blue-500 hover:text-red-500"
                      >
                        ✕
                      </button>

                    </span>
                  ))}
                </div>

                {/* ADD BUTTON */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenIndex(openIndex === i ? null : i);
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  + Add
                </button>

                {/* DROPDOWN */}
                {openIndex === i && (
                  <div
                    ref={el => (dropdownRefs.current[i] = el)}
                    className="absolute top-8 left-0 bg-white border rounded-lg shadow-lg w-56 max-h-60 overflow-auto z-50"
                    onClick={e => e.stopPropagation()}
                  >

                    {options.map((opt, idx) => {

                      const label = normalize(opt);

                      const checked = selectedValues.includes(label);

                      return (
                        <label
                          key={idx}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer"
                        >

                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {

                              const updated = [...filters];

                              const current =
                                (updated[i].values || []).map(normalize);

                              if (checked) {
                                updated[i].values =
                                  current.filter(v => v !== label);
                              } else {
                                updated[i].values = [...current, label];
                              }

                              setFilters(updated);
                            }}
                          />

                          <span className="text-sm">{label}</span>

                        </label>
                      );
                    })}

                  </div>
                )}

                {/* REMOVE FILTER */}
                <button
                  onClick={() =>
                    setFilters(filters.filter((_, index) => index !== i))
                  }
                  className="text-gray-400 hover:text-red-500 ml-1"
                >
                  ✕
                </button>

              </div>
            );
          })}

        </div>
        {/* ================= TABLE ================= */}
<div className="bg-white rounded-xl shadow flex-1 flex flex-col overflow-hidden">

  <div className="flex-1 w-full overflow-auto">

    <table className="min-w-full text-sm">

      <thead className="bg-gray-100 text-gray-700 text-xs uppercase sticky top-0 z-10">
  <tr>

    <th className="px-4 py-3 text-left">S.No</th>

    {[
      { label: "Paid To", key: "paid_to" },
      { label: "PRF No", key: "prf_number" },
      { label: "Date", key: "prf_date" },
      { label: "Division", key: "division" },
      { label: "Amount", key: "amount" },
      { label: "Currency", key: "currency" },
      { label: "Payment Mode", key: "payment_mode" },
      { label: "Paid By", key: "paid_by" },
    ].map((col) => (
      <th
        key={col.key}
        onClick={() => handleSort(col.key)}
        className={`px-4 py-3 cursor-pointer select-none hover:bg-gray-200 ${
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

    <th className="px-4 py-3 text-right">Actions</th>

  </tr>
</thead>

      <tbody>

        {sortedRows.map((row, index) => (
          <tr key={row.id} className="border-b hover:bg-gray-50">

            <td className="px-4 py-2">{index + 1}</td>

            <td className="px-4 py-2">{row.paid_to}</td>

            <td className="px-4 py-2">{row.prf_number}</td>

            <td className="px-4 py-2">
              {new Date(row.prf_date).toLocaleDateString()}
            </td>

            <td className="px-4 py-2">{row.division}</td>

            <td className="px-4 py-2 text-right font-medium">
              {row.amount}
            </td>

            <td className="px-4 py-2">{row.currency}</td>

            <td className="px-4 py-2">{row.payment_mode}</td>

            <td className="px-4 py-2">{row.paid_by}</td>

            {/* ACTIONS */}
            <td className="px-4 py-2 text-right flex justify-end gap-2">

              {/* PREVIEW */}
              <button
                onClick={() => console.log("preview", row)}
                className="px-3 py-1.5 text-sm rounded-md border border-green-300 bg-white 
              hover:bg-green-100 hover:border-green-500 transition"
              >
                Preview
              </button>

              {/* EDIT */}
              <button
                onClick={() => console.log("edit", row)}
                className="px-3 py-1.5 text-sm rounded-md border border-blue-300 bg-white 
              hover:bg-blue-100 hover:border-blue-500 transition"
              >
                Edit
              </button>

            </td>

          </tr>
        ))}

      </tbody>

    </table>

  </div>

</div>
      </>

    ) : (

      <PaymentRequestEntryForm
        onBack={() => setShowForm(false)}
      />

    )}

  </div>
);
}