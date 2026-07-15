import { useEffect } from "react";
import Select from "react-select";
import { getMasterValues } from "../../api/api";

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
   // console.log("Master List in Drawer:", masterList1);
    console.log("filters send to main table:", filters);
  // ================= LOAD MASTER DATA =================
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
  values.map(v =>
    typeof v === "string"
      ? { key: v, value: v }
      : v
  );

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

  console.log("updated values:", filters);

  // ================= OPTIONS =================
const getOptions = (master) => {
  return (masterDataMap?.[master]?.data || []).map((x) => ({
    key: x.key,
    value: x.value,
  }));
};

  // available filters (not selected yet)
  const availableFilters = masterList1.filter(
    (item) =>
      !filters.some((f) => f.master === item.master)
  );

const cleanedFilters = filters.map(f => ({
  master: f.master,
  pk: masterDataMap?.[f.master]?.pk,
  values: f.values.map(v => v.key)
}));

const handleSearch = (overrideFilters) => {
  console.log("Filters sent to main table:", overrideFilters || cleanedFilters);  
  if (!onSearch) return;

  const sourceFilters = Array.isArray(overrideFilters)
  ? overrideFilters
  : Array.isArray(filters)
    ? filters
    : [];

  const cleanedFilters = sourceFilters.map(f => ({
    master: f.master,
    pk: masterDataMap?.[f.master]?.pk,
    values: (f.values || []).map(v =>
   typeof v === "string" ? v : v.key
  )
  }));
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

  <div className="flex gap-2">
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
  </div>
</div>

        {/* BODY */}
        <div className="p-6 space-y-4 overflow-y-auto h-[calc(100%-160px)]">

          {/* ADD FILTER DROPDOWN */}
          {availableFilters.length > 0 && (
            <Select
              placeholder="+ Add Filter"
              options={availableFilters.map((item) => ({
                value: item.master,
                label: item.display_name,
              }))}
              onChange={(selected) => {
                if (!selected) return;
                addFilter(selected.value);
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
                   value={(filter.values || []).map(v => {
  const key = typeof v === "string" ? v : v.key;

  const option = options.find(o => o.key === key);

  return {
    value: key,
    label: option?.value || (typeof v === "string" ? v : v.value),
  };
})}
                    onChange={(selected) =>
                      updateValues(
                        index,
                        selected?.map((x) => ({
                          key: x.value,
                          value: x.label,
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
          <button
            onClick={onClose}
            className="
              w-20
              h-11
              bg-orange-500
              text-white
              rounded-xl
              font-medium
            "
          >
            Close
          </button>
        </div>

      </div>
    </>
  );
}