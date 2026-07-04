import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { fetchSections } from "../../api/api";

export default function DynamicTablePage() {
  const { id } = useParams();
  const location = useLocation();

  const [module, setModule] = useState(location.state?.module || null);
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return alert("Please select a file");

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);

      const res = await fetch("http://localhost:5000/api/upload-subscription", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Upload failed");

      alert("Upload successful ✅");
      setFile(null);

    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadModule();
    //loadData();
  }, [id]);

  const loadModule = async () => {
    if (location.state?.module) {
      const mod = location.state.module;
      setModule(mod);
      setColumns(mod.columns.filter(c => c.is_active));
      return;
    }

    const res = await fetchSections();
    const mod = res.data.find(m => m.module_id == id);

    if (mod) {
      setModule(mod);
      setColumns(mod.columns.filter(c => c.is_active));
    }
  };

//   const loadData = async () => {
//     setLoading(true);
//     try {
//       const res = await fetchModuleData(id);
//       setRows(res.data || []);
//     } finally {
//       setLoading(false);
//     }
//   };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">

      {/* HEADER CARD */}
      <div className="mb-6 bg-white rounded-2xl shadow-sm p-5 border">
        <h1 className="text-xl font-semibold text-gray-800">
          {module?.display_name || "Loading..."}
        </h1>
      </div>

      {/* TABLE CARD */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">

        {/* TABLE HEADER */}
        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
          <h2 className="font-medium text-gray-700">Data Table</h2>
           <div className="bg-white p-6 rounded-xl shadow space-y-4">

        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={(e) => setFile(e.target.files[0])}
          className="w-full border p-2 rounded"
        />

        {file && (
          <p className="text-sm text-gray-600">
            Selected: {file.name}
          </p>
        )}

        <button
          onClick={handleUpload}
          disabled={loading}
          className={`w-full py-2 rounded text-white ${
            loading
              ? "bg-gray-400"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Uploading..." : "Upload Excel"}
        </button>

      </div>

          <span className="text-sm text-gray-500">
            {rows.length} records
          </span>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">

            <thead className="bg-gray-100 text-gray-700 text-xs uppercase">
              <tr>
                {columns.map(col => (
                  <th
                    key={col.column_id}
                    className="text-left px-4 py-3 whitespace-nowrap"
                  >
                    {col.display_name}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y">

              {loading ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="text-center py-10 text-gray-500"
                  >
                    Loading data...
                  </td>
                </tr>
              ) : rows.length > 0 ? (
                rows.map((row, i) => (
                  <tr
                    key={i}
                    className="hover:bg-gray-50 transition"
                  >
                    {columns.map(col => (
                      <td
                        key={col.column_id}
                        className="px-4 py-3 text-gray-700 whitespace-nowrap"
                      >
                        {row[col.column_name] ?? "-"}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="text-center py-10 text-gray-400"
                  >
                    No data available
                  </td>
                </tr>
              )}

            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}