import React, { useEffect, useMemo, useState } from "react";
import { currencises } from "../../api/api";

export default function CurrencyWidget() {
  const [currencies, setCurrencies] = useState([]);
  const [amount, setAmount] = useState(1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [animate, setAnimate] = useState(false);

  // -----------------------------
  // FETCH
  // -----------------------------
  useEffect(() => {
    const fetchData = async () => {
      const res = await currencises();
      const data = res?.data || [];

      setCurrencies(data);

      const base = data.find(c => c.is_base_currency);

      if (base) {
        setFrom(base.currency_code);
        setTo(data.find(c => c.currency_code !== base.currency_code)?.currency_code);
      }
    };

    fetchData();
  }, []);

  // -----------------------------
  // CONVERT
  // -----------------------------
  const converted = useMemo(() => {
    const fromC = currencies.find(c => c.currency_code === from);
    const toC = currencies.find(c => c.currency_code === to);

    if (!fromC || !toC) return 0;

    const result =
      (amount / fromC.exchange_rate) * toC.exchange_rate;

    return result.toFixed(toC.decimal_places || 2);
  }, [amount, from, to, currencies]);

  // -----------------------------
  // RATE TEXT
  // -----------------------------
  const exchangeLabel = useMemo(() => {
    const fromC = currencies.find(c => c.currency_code === from);
    const toC = currencies.find(c => c.currency_code === to);

    if (!fromC || !toC) return "";

    const rate =
      (1 / fromC.exchange_rate) * toC.exchange_rate;

    return `1 ${from} = ${rate.toFixed(3)} ${to}`;
  }, [from, to, currencies]);

  // -----------------------------
  // SWAP WITH ANIMATION
  // -----------------------------
  const handleSwap = () => {
    setAnimate(true);

    setTimeout(() => {
      setFrom(to);
      setTo(from);
      setAnimate(false);
    }, 200);
  };

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 p-5 rounded-2xl shadow-lg w-full max-w-md transition-all duration-300 hover:shadow-xl">

      {/* HEADER */}
      <h2 className="text-lg font-semibold mb-4">
        Currency Exchange
      </h2>

      {/* RATE */}
      <div className="text-sm text-gray-500 mb-4 transition-all duration-300">
        {exchangeLabel}
      </div>

      {/* SELECTORS */}
      <div className={`flex items-center gap-2 mb-4 transition-all duration-300 ${animate ? "scale-95 opacity-70" : ""}`}>

        <select
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="flex-1 border rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-indigo-300 transition"
        >
          {currencies.map(c => (
            <option key={c.id} value={c.currency_code}>
              {c.currency_code}
            </option>
          ))}
        </select>

        {/* SWAP */}
        <button
          onClick={handleSwap}
          className="px-3 py-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:scale-90 transition-all duration-200"
        >
          ⇄
        </button>

        <select
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="flex-1 border rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-indigo-300 transition"
        >
          {currencies.map(c => (
            <option key={c.id} value={c.currency_code}>
              {c.currency_code}
            </option>
          ))}
        </select>
      </div>

      {/* AMOUNT */}
      <div className="mb-3">
        <label className="text-xs text-gray-400">
          Amount
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-300 transition"
        />
      </div>

      {/* RESULT */}
      <div className="relative">
        <label className="text-xs text-gray-400">
          Converted
        </label>

        <input
          type="text"
          value={converted}
          readOnly
          className="w-full border rounded-lg p-2 text-sm bg-gray-100 font-semibold transition-all duration-300 focus:ring-2 focus:ring-green-300"
        />

       
      </div>

    </div>
  );
}