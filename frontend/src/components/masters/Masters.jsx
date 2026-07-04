import { useState } from "react";
import CreateMaster from "./CreateMaster";
import { fetchSections } from "../../api/api";

export default function Masters() {
  const [sections, setSections] = useState([]);
  const [view, setView] = useState("list"); // "list" | "create"
  const [editData, setEditData] = useState(null); // For edit mode

   const handleEdit = (section) => {
    setEditData(section);
    setView("create");
  };
  const loadSections = async () => {
    const res = await fetchSections();
    setSections(res.data);
  };

  // Load sections on component mount
  useState(() => {
    loadSections();
  }, []);

  const renderStatus = (status) => (
    <span
      className={`px-2 py-1 rounded text-xs font-medium ${
        status ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"
      }`}
    >
      {status ? "Active" : "Inactive"}
    </span>
  );

  return (
    <div className="p-6 bg-gray-100 min-h-screen">

      {/* ================= LIST VIEW ================= */}
      {view === "list" && (
        <>
          {/* HEADER */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Masters Management</h1>

            <button
              onClick={() => setView("create")}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + Create Master
            </button>
          </div>

          {/* TABLE */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="p-4 text-left">MASTER NAME</th>
                  <th className="text-left">DESCRIPTION</th>
                  <th className="text-left">STATUS</th>
                  <th className="text-left">CREATED AT</th>
                  <th className="text-left">LAST UPDATED</th>
                  <th className="text-left">CREATED BY</th>
                  <th className="text-right p-4">ACTION</th>
                </tr>
              </thead>

              <tbody>
                {sections.map((s) => (
                  <tr key={s.id} className="border-t hover:bg-gray-50">
                    <td className="p-4 font-medium">{s.display_name}</td>
                    <td>{s.description}</td>
                    <td>{renderStatus(s.is_active)}</td>
                    <td>{s.created_at}</td>
                    <td>{s.updated_at}</td>
                    <td>{s.created_by}</td>

                    <td className="text-right p-4">
                      <button
                        onClick={() => handleEdit(s)}
                        className="px-3 py-1 border rounded hover:bg-gray-100"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ================= CREATE VIEW ================= */}
      {view === "create" && (
        <div>



          {/* CREATE COMPONENT */}
            {console.log("Edit Data in MastersPage:", editData)}
          <CreateMaster
            onClose={() => setView("list")}
            onSave={(newSection) => {
              setSections((prev) => [...prev, newSection]);
              setView("list");
            }}
             editData={editData}
           
          />
        </div>
      )}

    </div>
  );
}