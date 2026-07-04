import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export default function SortableColumnItem({
  col,
  checked,
  toggleTempColumn,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: col.column_name });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center justify-between p-2 rounded border cursor-pointer select-none
        transition
        ${checked
          ? "bg-blue-50 border-blue-500 border-l-4"
          : "bg-white hover:bg-gray-50 opacity-80 hover:opacity-100"
        }
      `}
    >
      {/* LEFT SIDE */}
      <div
        className="flex items-center gap-2 flex-1"
        onClick={() => toggleTempColumn(col.column_name)}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={() => toggleTempColumn(col.column_name)}
        />

        <span
          className={`text-sm ${
            checked ? "font-semibold text-blue-700" : ""
          }`}
        >
          {col.display_name}
        </span>
      </div>

      {/* DRAG HANDLE */}
      <div
        {...attributes}
        {...listeners}
        className="text-gray-400 cursor-grab px-2"
      >
        ⋮⋮
      </div>
    </div>
  );
}