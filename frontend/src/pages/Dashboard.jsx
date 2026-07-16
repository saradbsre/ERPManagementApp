import React, { useState, useEffect } from "react";
import { useUser } from "../components/UserContext";
import ChartforTop5 from "../components/dashboard/ChartforTop5";
import SignupRequestsCard from "../components/dashboard/RequestCards";
import RenewalCards from "../components/dashboard/Renewals";
import CurrencyWidget from "../components/dashboard/Currency";
import RecentTransactions from "../components/dashboard/RecentTransactions";
import Loader from "../components/Loader";


export default function Dashboard() {
  const { user } = useUser();
  const [loading, setLoading] = React.useState(true);
  const isMobile = window.innerWidth < 768; // Example breakpoint for mobile
  //console.log("isMobile:", isMobile);

  
  useEffect(() => {
    // Simulate loading, replace with your real data loading logic
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader type="orbit" />
      </div>
    );
  }

  return (
    <div className="px-3 pb-3 md:px-1 md:pb-1 lg:px-2 lg:pb-2 pt-0 bg-gray-100 min-h-screen">
     <h1 className="text-2xl lg:text-3xl font-bold mt-2 mb-2 text-center lg:text-left">Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT COLUMN */}
        <div className="
    grid
    grid-cols-1
    md:grid-cols-2
    lg:grid-cols-1
    lg:grid-rows-[2fr_1fr]
    gap-6
    h-auto
    lg:h-[500px]
">
          
          {/* Top Expenses (Big) */}
          <div className="bg-white p-6 rounded-xl shadow flex flex-col">
            <h2 className="font-semibold mb-4">Top 5 Expenses</h2>
            
              <ChartforTop5 />
            
          </div>

          {/* Exchange Rates (Small) */}
          <div className="bg-white p-6 rounded-xl shadow">
             {user?.role === "ADMIN" ? (
            <div className="bg-white p-6 rounded-xl shadow">
              <SignupRequestsCard />
            </div>
          ) : (
            <div />
          )}
          </div>

        </div>

        {/* MIDDLE COLUMN */}
         <div className="
    grid
    gap-6
    h-auto
    lg:grid-rows-[2fr_1fr]
    lg:h-[900px]
">

           {/* Transactions (Bottom Half) */}
          <div className="bg-white p-6 rounded-xl shadow flex flex-col min-w-0 min-h-0">
  <h2 className="font-semibold mb-4">
    Recent Transactions (Last 30 Days)
  </h2>

  <div className="flex-1 min-h-0">
    <RecentTransactions />
  </div>
</div>
         
          {/* {user?.role === "ADMIN" ? (
            <div className="bg-white p-6 rounded-xl shadow">
              <SignupRequestsCard />
            </div>
          ) : (
            <div />
          )} */}

         
        </div>

        {/* RIGHT COLUMN */}
        <div className="
    grid
    grid-cols-1
    md:grid-cols-2
    lg:grid-cols-1
    lg:grid-rows-[2fr_1fr]
    gap-6
    h-auto
    lg:h-[500px]
">
          
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