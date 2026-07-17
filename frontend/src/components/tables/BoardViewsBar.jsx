import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Pin,
  Pencil,
  Copy,
  Share2,
  Trash2,
  ChevronsUpDown,
  ChevronRight,
  MoreHorizontal,
  ChevronDown,
} from "lucide-react";

export default function BoardViewsBar({
  views = [],
  activeViewId,
  setActiveViewId,
  onMainViewClick,
  onApplyView,
  onCreateView,
  onRenameView,
  onDeleteView,
  onDuplicateView,
}) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showMoreViews, setShowMoreViews] = useState(false);
  const [barWidth, setBarWidth] = useState(0);

  const barRef = useRef(null);

  const tabWidth = 170;
  const mainViewWidth = 115;
  const moreWidth = 105;
  const addWidth = 45;
  const gapReserve = 60;

  useEffect(() => {
    if (!barRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect?.width || 0;
      setBarWidth(width);
    });

    observer.observe(barRef.current);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (barRef.current && !barRef.current.contains(event.target)) {
        setOpenMenuId(null);
        setShowMoreViews(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const visibleSlotCount = useMemo(() => {
    const available =
      barWidth - mainViewWidth - moreWidth - addWidth - gapReserve;

    const count = Math.floor(available / tabWidth);

    return Math.max(1, count);
  }, [barWidth]);

  const activeSavedView = views.find(
    (view) => String(view.id) === String(activeViewId)
  );

  let visibleViews = views.slice(0, visibleSlotCount);

  // Keep selected More view visible in the bar
  if (
    activeSavedView &&
    !visibleViews.some((view) => String(view.id) === String(activeSavedView.id))
  ) {
    visibleViews = [
      ...visibleViews.slice(0, visibleSlotCount - 1),
      activeSavedView,
    ];
  }

  const visibleViewIds = new Set(
    visibleViews.map((view) => String(view.id))
  );

  const hiddenViews = views.filter(
    (view) => !visibleViewIds.has(String(view.id))
  );

  const menuItemClass =
    "w-full flex items-center gap-3 px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 transition text-left";

  const disabledItemClass =
    "w-full flex items-center gap-3 px-5 py-3 text-sm text-gray-400 cursor-not-allowed text-left";

  const renderViewMenu = (view) => (
    <div
      className="
        absolute top-9 right-0
        w-[275px]
        bg-white
        rounded-xl
        shadow-[0_15px_45px_rgba(0,0,0,0.16)]
        border border-gray-100
        z-[99999]
        overflow-hidden
      "
    >
      <button type="button" disabled className={disabledItemClass}>
        <Pin size={18} />
        <span>Pin view</span>
      </button>

      <div className="border-t border-gray-100" />

      <button
        type="button"
        onClick={() => {
          setOpenMenuId(null);
          setShowMoreViews(false);
          onRenameView?.(view);
        }}
        className={menuItemClass}
      >
        <Pencil size={18} />
        <span>Rename view</span>
      </button>

      <button
        type="button"
        onClick={() => {
          setOpenMenuId(null);
          setShowMoreViews(false);
          onDuplicateView?.(view);
        }}
        className={menuItemClass}
      >
        <Copy size={18} />
        <span>Duplicate view</span>
      </button>

      <button type="button" disabled className={disabledItemClass}>
        <Share2 size={18} />
        <span>Share view</span>
      </button>

      <div className="border-t border-gray-100" />

      <button
        type="button"
        disabled
        className="w-full flex items-center justify-between px-5 py-3 text-sm text-gray-600 cursor-not-allowed text-left"
      >
        <span className="flex items-center gap-3">
          <ChevronsUpDown size={18} />
          Reorder
        </span>

        <ChevronRight size={18} />
      </button>

      <div className="border-t border-gray-100" />

      <button
        type="button"
        onClick={() => {
          setOpenMenuId(null);
          setShowMoreViews(false);
          onDeleteView?.(view);
        }}
        className="w-full flex items-center gap-3 px-5 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition text-left"
      >
        <Trash2 size={18} />
        <span>Delete view</span>
      </button>
    </div>
  );

  const renderViewTab = (view) => {
    const isActive = String(activeViewId) === String(view.id);

    return (
      <div
        key={view.id}
        className="
          relative
          flex items-center
          h-full
          shrink-0
          w-[170px]
          max-w-[170px]
        "
      >
        <button
          type="button"
          onClick={() => {
            setActiveViewId(view.id);
            setOpenMenuId(null);
            setShowMoreViews(false);
            onApplyView?.(view);
          }}
          className={`h-full w-full truncate px-2 pr-8 text-sm font-medium border-b-2 transition text-left ${
            isActive
              ? "border-gray-400 text-black-bold"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
          title={view.view_name}
        >
          {view.view_name}
        </button>

        {isActive && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMoreViews(false);
                setOpenMenuId(openMenuId === view.id ? null : view.id);
              }}
              className="
                absolute right-0
                h-7 w-7
                flex items-center justify-center
                rounded-md
               
                text-gray-400
                hover:bg-blue-100
                transition
              "
              title="View options"
            >
              <MoreHorizontal size={18} />
            </button>

            {openMenuId === view.id && renderViewMenu(view)}
          </>
        )}
      </div>
    );
  };

  return (
    <div
      ref={barRef}
      className="
        w-full
        max-w-full
        bg-white
        border-b border-gray-200
        px-4
        overflow-visible
      "
    >
      <div className="flex items-center h-10 gap-2 max-w-full overflow-visible">

        <button
          type="button"
          onClick={() => {
            setActiveViewId("main");
            setOpenMenuId(null);
            setShowMoreViews(false);
            onMainViewClick?.();
          }}
          className={`h-full w-[115px] shrink-0 truncate px-2 text-sm font-medium border-b-2 transition text-left ${
            activeViewId === "main"
              ? "border-gray-400 text-black-bold"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Main View
        </button>

        <div className="flex items-center h-full gap-2 shrink-0 overflow-visible">
          {visibleViews.map(renderViewTab)}
        </div>

        {hiddenViews.length > 0 && (
          <div className="relative shrink-0 h-full flex items-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuId(null);
                setShowMoreViews((prev) => !prev);
              }}
              className="
                h-9
                w-[105px]
                px-3
                flex items-center justify-center gap-1
                rounded-lg
                text-sm
                text-gray-700
                hover:bg-gray-100
                transition
              "
            >
              More
              <span className="text-xs text-gray-500">
                ({hiddenViews.length})
              </span>
              <ChevronDown size={15} />
            </button>

            {showMoreViews && (
              <div
                className="
                  absolute top-11 right-0
                  w-[320px]
                  max-h-[360px]
                  overflow-y-auto
                  bg-white
                  rounded-xl
                  shadow-[0_15px_45px_rgba(0,0,0,0.16)]
                  border border-gray-100
                  z-[99999]
                "
              >
                {hiddenViews.map((view) => (
                  <button
                    key={view.id}
                    type="button"
                    onClick={() => {
                      setActiveViewId(view.id);
                      setShowMoreViews(false);
                      setOpenMenuId(null);
                      onApplyView?.(view);
                    }}
                    className="
                      w-full
                      text-left
                      truncate
                      px-4 py-3
                      text-sm
                      text-gray-700
                      hover:bg-gray-50
                    "
                    title={view.view_name}
                  >
                    {view.view_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setOpenMenuId(null);
            setShowMoreViews(false);
            onCreateView?.();
          }}
          className="
            h-8 w-8
            flex items-center justify-center
            rounded-md
            text-xl
            text-gray-600
            hover:bg-gray-100
            hover:text-blue-600
            transition
            shrink-0
          "
          title="Create New View"
        >
          +
        </button>
      </div>
    </div>
  );
}