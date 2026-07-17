import { useEffect, useState } from "react";
import Select from "react-select";
import { getMasterValues } from "../../api/api";
import { X } from "lucide-react";

export default function TableFiltersDrawer({
  open,
  onClose,
  onSearch,
  masterList = [],
  filters,
  setFilters,
  currencies = [],
  masterDataMap,
  setMasterDataMap,
  saveFilterName,
  setSaveFilterName,
  handleSaveFilter,
}) {
  const masterList1 = [...(masterList || [])];
  const [selectedFilter, setSelectedFilter] = useState(null);
  useEffect(() => {
    if (!open) return;

    const loadMasters = async () => {
      for (const item of masterList1) {
        const master = item.master;

        if (masterDataMap?.[master]) continue;

        try {
          const res = await getMasterValues(master);
          // console.log(`Master Data for ${master}:`, res);
          const pk = res?.data?.pk || "key";
          // console.log(`Primary Key for ${master}:`, pk);
          setMasterDataMap((prev) => ({
          ...prev,
          [master]: {
            pk: res?.data?.pk,
            data: res?.data?.data || [],
          },
        }));
        } catch (err) {
           console.error(err);
        }
      }
    };
  
    loadMasters();
  }, [open]);
 
  // // console.log("Master Data Map in Drawer:", masterDataMap);
  // ================= ADD FILTER =================
  const addFilter = (master) => {
    if (!master) return;

    if (filters.some((f) => f.master === master)) return;

    setFilters((prev) => [
      ...prev,
      {
        master,
        values: [],
      },
    ]);
  };

  // ================= REMOVE FILTER =================
  const removeFilter = (index) => {
    setFilters((prev) => prev.filter((_, i) => i !== index));
  };

  // ================= UPDATE VALUES =================


const normalizeValues = (values = []) =>
  (values || []).map((v) => {
    if (v === null || v === undefined) {
      return { key: "", value: "" };
    }

    if (typeof v === "object") {
      return {
        key: String(v.key ?? v.id ?? v.value ?? ""),
        value: String(v.value ?? v.label ?? v.key ?? v.id ?? ""),
      };
    }

    return {
      key: String(v),
      value: String(v),
    };
  });

const updateValues = (index, values) => {
  setFilters((prev) =>
    prev.map((f, i) =>
      i === index
        ? { ...f, values: normalizeValues(values) }
        : f
    )
  );
};

  // const updateValues = (index, values) => {
  //   setFilters((prev) =>
  //     prev.map((f, i) =>
  //       i === index
  //         ? { ...f, values }
  //         : f
  //     )
  //   );
  // };

 // console.log("updated values:", filters);

  // ================= OPTIONS =================
const getOptions = (master) => {
  const pk = masterDataMap?.[master]?.pk || "key";

  return (masterDataMap?.[master]?.data || []).map((x) => ({
    key: String(
      x?.[pk] ??
      x?.key ??
      x?.id ??
      x?.value ??
      ""
    ),
    value: String(
      x?.value ??
      x?.name ??
      x?.label ??
      x?.[pk] ??
      ""
    ),
  }));
};

  // available filters (not selected yet)
  const availableFilters = masterList1.filter(
    (item) =>
      !filters.some((f) => f.master === item.master)
  );

// const cleanedFilters = (filters || [])
//   .map((f) => ({
//     master: f.master,
//     pk: f.pk || masterDataMap?.[f.master]?.pk || f.master,
//     values: (f.values || [])
//       .map((v) => {
//         if (v === null || v === undefined) return "";

//         if (typeof v === "object") {
//           return String(
//             v.key ??
//             v.id ??
//             v.value ??
//             ""
//           );
//         }

//         return String(v);
//       })
//       .filter(Boolean),
//   }))
//   .filter((f) => f.master && f.values.length > 0);

const handleSearch = (overrideFilters) => {
  if (!onSearch) return;

  const sourceFilters = Array.isArray(overrideFilters)
    ? overrideFilters
    : Array.isArray(filters)
      ? filters
      : [];

  const cleanedFilters = sourceFilters
    .map((f) => ({
      master: f.master,
      pk: f.pk || masterDataMap?.[f.master]?.pk || f.master,
      values: (f.values || [])
        .map((v) => {
          if (v === null || v === undefined) return "";

          if (typeof v === "object") {
            return String(
              v.key ??
              v.id ??
              v.value ??
              ""
            );
          }

          return String(v);
        })
        .filter(Boolean),
    }))
    .filter((f) => f.master && f.values.length > 0);

  console.log("Filters sent to main table:", cleanedFilters);

  onSearch(cleanedFilters);
  onClose?.();
};

  return (
    <>
      {/* BACKDROP */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={onClose}
        />
      )}

      {/* DRAWER */}
      <div
        className={`
          fixed top-0 right-0 h-full w-[520px]
          bg-white z-50 shadow-2xl
          transition-transform duration-300
          ${open ? "translate-x-0" : "translate-x-full"}
        `}
      >

        {/* HEADER */}
<div className="px-6 py-5 border-b flex justify-between items-center">
  <div>
    <h2 className="text-lg font-semibold">Filters</h2>
  </div>

  {/* <div className="flex gap-2">
   <button
  onClick={() => {
    const clearedFilters = [];
    setFilters(clearedFilters);
    handleSearch(clearedFilters);
  }}
  className="text-sm px-3 py-1 border rounded-lg hover:bg-gray-50"
>
  Clear
</button>

    <button
      onClick={handleSearch}
      className="text-sm px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
    >
      Search
    </button>
  </div> */}
  <button
  onClick={onClose}
  title="Close"
  className="
    h-10 w-10
    flex items-center justify-center
    bg-white
    text-gray-600 "
  >
  <X size={23} />
</button>
</div>

        {/* BODY */}
        <div className="p-6 space-y-4 overflow-y-auto h-[calc(100%-160px)]">

          {/* ADD FILTER DROPDOWN */}
          {availableFilters.length > 0 && (
           <Select
  placeholder="+ Add Filter"
  value={selectedFilter}
  options={availableFilters.map((item) => ({
    value: item.master,
    label: item.display_name,
  }))}
  onChange={(selected) => {
    if (!selected) return;

    addFilter(selected.value);

    // Reset back to "+ Add Filter"
    setSelectedFilter(null);
  }}
  styles={{
    control: (base) => ({
      ...base,
      borderRadius: 10,
      minHeight: 42,
    }),
  }}
/>
          )}

          {/* FILTER LIST */}
          {filters.map((filter, index) => {
            const meta = masterList1.find(
              (m) => m.master === filter.master
            );

            const options = getOptions(filter.master);

            return (
              <div
                key={index}
                className="
                  flex
                  items-center
                  gap-3
                  bg-gray-50
                  p-1
                "
              >

                {/* LABEL */}
                <div className="w-32 text-sm font-medium text-gray-700">
                  {meta?.display_name}
                </div>

                {/* MULTI SELECT */}
                <div className="flex-1">
                  <Select
                    isMulti
                    closeMenuOnSelect={false}
                    placeholder="Select..."
                    options={options.map((opt) => ({
                       value: opt.key,     // backend key
                       label: opt.value,   // UI label
                    }))}
  value={(filter.values || []).map((v) => {
  const key =
    typeof v === "object"
      ? String(v.key ?? v.id ?? v.value ?? "")
      : String(v ?? "");

  const option = options.find(
    (o) => String(o.key) === key
  );

  return {
    value: key,
    label:
      option?.value ||
      (typeof v === "object"
        ? String(v.value ?? v.label ?? key)
        : key),
  };
})}
                 onChange={(selected) =>
  updateValues(
    index,
    selected?.map((x) => ({
      key: String(x.value),
      value: String(x.label),
    })) || []
  )
}
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderRadius: 10,
                        minHeight: 40,
                      }),
                    }}
                  />
                </div>

                {/* REMOVE */}
                <button
                  onClick={() => removeFilter(index)}
                  className="
                    w-8 h-8
                    rounded-lg
                    hover:bg-red-50
                    text-gray-400
                    hover:text-red-500
                  "
                >
                  ✕
                </button>

              </div>
            );
          })}

          {/* SAVE VIEW */}
          {/* <div className="mt-8 border-t pt-6">

            <div className="text-sm font-semibold mb-2">
              Save View
            </div>

            <input
              value={saveFilterName}
              onChange={(e) =>
                setSaveFilterName(e.target.value)
              }
              placeholder="e.g. Monthly Report"
              className="
                w-full
                h-10
                border
                rounded-lg
                px-3
              "
            />

            <button
              onClick={handleSaveFilter}
              className="
                mt-3
                w-30
                h-10
                bg-emerald-600
                text-white
                rounded-lg
                font-medium
              "
            >
              Save View
            </button>

          </div> */}

        </div>

        {/* FOOTER */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
         <div className="flex justify-between items-center">
 

  <div className="flex gap-2">
     <button
      onClick={handleSearch}
      className="text-sm px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
    >
      Search
    </button>
   <button
  onClick={() => {
    const clearedFilters = [];
    setFilters(clearedFilters);
    handleSearch(clearedFilters);
  }}
  className="text-sm px-3 py-1 border rounded-lg hover:bg-gray-50"
>
  Clear
</button>

   
  </div>
</div>
          
        </div>

      </div>
    </>
  );
}