import React from "react";

const Loader = ({
  type = "dots",   // dots | pulse | wave | orbit | gradient
  size = "md"      // sm | md | lg
}) => {

  const sizeMap = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-3 h-3",
  };

  const dotSize = sizeMap[size];

  // DOTS
  if (type === "dots") {
    return (
      <div className="flex items-center justify-center gap-1 py-4">
        <span className={`${dotSize} bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]`} />
        <span className={`${dotSize} bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]`} />
        <span className={`${dotSize} bg-blue-500 rounded-full animate-bounce`} />
      </div>
    );
  }

  // PULSE
  if (type === "pulse") {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-2 border-blue-500 animate-ping opacity-70"></div>
          <div className="absolute inset-2 rounded-full bg-blue-500"></div>
        </div>
      </div>
    );
  }

  // WAVE
  if (type === "wave") {
    return (
      <div className="flex items-end justify-center gap-1 py-4 h-10">
        <span className="w-1.5 h-4 bg-blue-500 animate-bounce rounded"></span>
        <span className="w-1.5 h-6 bg-blue-500 animate-bounce [animation-delay:100ms] rounded"></span>
        <span className="w-1.5 h-8 bg-blue-500 animate-bounce [animation-delay:200ms] rounded"></span>
        <span className="w-1.5 h-6 bg-blue-500 animate-bounce [animation-delay:300ms] rounded"></span>
        <span className="w-1.5 h-4 bg-blue-500 animate-bounce [animation-delay:400ms] rounded"></span>
      </div>
    );
  }

  // ORBIT
if (type === "orbit") {
  return (
    <div className="flex flex-col items-center justify-center py-4 gap-2">

      {/* ORBIT */}
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 border-2 border-gray-200 rounded-full"></div>
        <div className="absolute inset-0 border-t-2 border-blue-500 rounded-full animate-spin"></div>
      </div>

      {/* LOADING TEXT */}
      <div className="text-sm text-gray-500 flex items-center gap-1 mt-2">
        Loading
        <span className="flex">
          <span className="animate-bounce [animation-delay:-0.3s]">.</span>
          <span className="animate-bounce [animation-delay:-0.15s]">.</span>
          <span className="animate-bounce">.</span>
        </span>
      </div>

    </div>
  );
}

  // GRADIENT DOTS
  if (type === "gradient") {
    return (
      <div className="flex items-center justify-center gap-2 py-4">
        <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 animate-bounce" />
      </div>
    );
  }

  return null;
};

export default Loader;