import React, { useEffect, useMemo, useRef, useState } from "react";
import { DndContext, DragOverlay, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";

function SortableItem({
  column,
  tempHideColumns,
  setTempHideColumns,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.column_name,
  });

 const style = {
  transform: CSS.Transform.toString(transform),
  transition,
  opacity: isDragging ? 0 : 1,
};


  return (
   <div
  ref={setNodeRef}
  style={style}
  className={`flex items-center justify-between rounded-xl border p-1.5 mb-1 bg-white
    ${
      isDragging
        ? "shadow-2xl border-blue-500 opacity-90 scale-105 z-50"
        : "border-slate-200"
    }`}
>
  <div className="flex items-center gap-3">

    <input
      type="checkbox"
      checked={tempHideColumns.includes(column.column_name)}
      onPointerDown={(e)=>e.stopPropagation()}
      onClick={(e)=>e.stopPropagation()}
      onChange={(e) => {
        e.stopPropagation();

        if (e.target.checked) {
          setTempHideColumns((prev) => [...prev, column.column_name]);
        } else {
          setTempHideColumns((prev) =>
            prev.filter((x) => x !== column.column_name)
          );
        }
      }}
    />

    <span>{column.display_name}</span>

  </div>

  <button
    type="button"
    {...attributes}
    {...listeners}
    className="cursor-grab active:cursor-grabbing rounded-lg p-1 text-slate-400 hover:bg-slate-100"
  >
    ⋮⋮
  </button>
</div>
  );
}

export default function ShowHideColumnsPopup({
  columns,
  tempHideColumns,
  setTempHideColumns,
  onSave,
  onCancel,
  anchorPosition,
}) {
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState(null);
  const panelRef = useRef(null);
  const allColumnNames = columns.map((c) => c.column_name);
 // console.log("ShowHideColumnsPopup rendered with columns:", columns, "and tempHideColumns:", tempHideColumns);
  // const [orderedColumns, setOrderedColumns] = useState(columns);
  // //console.log("ShowHideColumnsPopup rendered with columns:", orderedColumns, "and tempHideColumns:", tempHideColumns);
  // useEffect(() => {
  //   setOrderedColumns(columns);
  // }, [columns]);

  const filteredColumns = useMemo(() => {
  const selected = tempHideColumns
    .map((colName) =>
      columns.find((c) => c.column_name === colName)
    )
    .filter(Boolean);

  const unselected = columns.filter(
    (c) => !tempHideColumns.includes(c.column_name)
  );

  const allOrdered = [...selected, ...unselected];

  const q = search.toLowerCase();

  if (!q) return allOrdered;

  return allOrdered.filter((c) =>
    (c.display_name || '')
      .toLowerCase()
      .includes(q)
  );
}, [columns, tempHideColumns, search]);

const activeColumn = columns.find(
  (c) => c.column_name === activeId
);


  const panelWidth = 340;
  const gutter = 12;
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1440;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 900;

  const preferredLeft = (anchorPosition?.left ?? 0) + 236;
  const maxLeft = viewportWidth - panelWidth - gutter;
  const panelLeft = Math.max(gutter, Math.min(preferredLeft, maxLeft));
  const panelTop = Math.max(gutter, Math.min((anchorPosition?.top ?? 120) - 6, viewportHeight - 520));

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onCancel();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [onCancel]);

 const handleDragEnd = (event) => {
  const { active, over } = event;

  if (!over || active.id === over.id) return;

  setTempHideColumns((prev) => {
    const oldIndex = prev.indexOf(active.id);
    const newIndex = prev.indexOf(over.id);

    // Reorder only selected columns
    if (oldIndex !== -1 && newIndex !== -1) {
      return arrayMove(prev, oldIndex, newIndex);
    }

    return prev;
  });
};

  return (
    <div
      ref={panelRef}
      className="fixed z-[10000] w-[340px] rounded-2xl border border-slate-200 bg-white shadow-2xl"
      style={{ top: panelTop, left: panelLeft }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="border-b border-slate-100 px-4 py-3 bg-gradient-to-r from-slate-50 to-blue-50 rounded-t-2xl">
        <div className="flex items-center justify-between gap-2">
          <div className="font-semibold text-slate-800">
            Show / Hide Columns
          </div>
          <button
            className="h-7 w-7 rounded-lg text-slate-500 hover:bg-slate-200"
            onClick={onCancel}
          >
            ✕
          </button>
        </div>
        <div className="text-xs text-slate-500 mt-1">
          {tempHideColumns.length} / {allColumnNames.length} selected
        </div>
      </div>

      <div className="p-4 space-y-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search columns..."
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />

        <div className="flex items-center justify-between text-sm">
          <button
            className="rounded-lg bg-blue-50 px-2.5 py-1 text-blue-700 hover:bg-blue-100"
            onClick={() => setTempHideColumns(allColumnNames)}
          >
            Select All
          </button>
          <button
            className="rounded-lg bg-rose-50 px-2.5 py-1 text-rose-700 hover:bg-rose-100"
            onClick={() => setTempHideColumns([])}
          >
            Clear All
          </button>
        </div>

       <DndContext
  collisionDetection={closestCenter}
  modifiers={[
    restrictToVerticalAxis,
    restrictToParentElement,
  ]}
  onDragStart={({ active }) => {
    setActiveId(active.id);
  }}
  onDragEnd={(event) => {
    handleDragEnd(event);
    setActiveId(null);
  }}
  onDragCancel={() => {
    setActiveId(null);
  }}
>

  <SortableContext
    items={filteredColumns.map(c => c.column_name)}
    strategy={verticalListSortingStrategy}
  >
    <div className="max-h-72 overflow-y-auto overflow-x-hidden rounded-xl border border-slate-100 p-2">
      {filteredColumns.map((c) => (
        <SortableItem
          key={c.column_name}
          column={c}
          tempHideColumns={tempHideColumns}
          setTempHideColumns={setTempHideColumns}
        />
      ))}
    </div>
  </SortableContext>
  <DragOverlay>
  {activeColumn ? (
    <div
      className="flex items-center justify-between rounded-xl border border-blue-500 bg-white p-2 shadow-2xl"
      style={{ width: 280 }}
    >
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={tempHideColumns.includes(activeColumn.column_name)}
          readOnly
        />
        <span>{activeColumn.display_name}</span>
      </div>

      <span className="text-slate-400">⋮⋮</span>
    </div>
  ) : null}
</DragOverlay>

</DndContext>

        <div className="flex justify-end gap-2 pt-1">
          <button
            className="px-3 py-1.5 text-slate-600 rounded-lg hover:bg-slate-100"
            onClick={onCancel}
          >
            Cancel
          </button>

          <button
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
           onClick={() => onSave(tempHideColumns)}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}