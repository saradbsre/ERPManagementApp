import React from "react";
import { useUser } from "../components/UserContext";
import ChartforTop5 from "../components/dashboard/ChartforTop5";
import SignupRequestsCard from "../components/dashboard/RequestCards";
import RenewalCards from "../components/dashboard/Renewals";
import CurrencyWidget from "../components/dashboard/Currency";
import RecentTransactions from "../components/dashboard/RecentTransactions";


export default function Dashboard() {
  const { user } = useUser();

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT COLUMN */}
        <div className="grid grid-rows-[2fr_1fr] gap-6 h-[500px]">
          
          {/* Top Expenses (Big) */}
          <div className="bg-white p-6 rounded-xl shadow flex flex-col">
            <h2 className="font-semibold mb-4">Top 5 Expenses</h2>
            
              <ChartforTop5 />
            
          </div>

          {/* Exchange Rates (Small) */}
          {/* <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="font-semibold mb-2">Exchange Rates</h2>
            <CurrencyWidget />
          </div> */}

        </div>

        {/* MIDDLE COLUMN */}
         <div className="grid grid-rows-[2fr_1fr] gap-6 h-[500px]">

           {/* Transactions (Bottom Half) */}
          <div className="bg-white p-6 rounded-xl shadow flex flex-col">
            <h2 className="font-semibold mb-4">Recent Transactions (Last 30 Days)</h2>
            <RecentTransactions />
          </div>
          {/* New Requests (Top Half) */}
          {user?.role === "ADMIN" ? (
            <div className="bg-white p-6 rounded-xl shadow">
              <SignupRequestsCard />
            </div>
          ) : (
            <div />
          )}

         
        </div>

        {/* RIGHT COLUMN */}
        <div className="grid grid-rows-[2fr_1fr] gap-6 h-[500px]">
          
          {/* Renewal Alerts (Big) */}
          <div className="bg-white p-6 rounded-xl shadow flex flex-col ">
            <h2 className="text-red-500 font-semibold mb-4">
              Renewal Alerts
            </h2>

            <RenewalCards />
          </div>

          {/* Total Assets (Small) */}
          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="font-semibold mb-2">Exchange Rates</h2>
            <CurrencyWidget />
          </div>

        </div>

      </div>
    </div>
  );
}