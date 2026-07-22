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
<div className="flex flex-col gap-6">
  <div className="bg-white rounded-xl shadow p-2 flex-1">
    <ChartforTop5 />
  </div>

  <div className="bg-white rounded-xl shadow p-2 flex-1">
    {user?.role === "ADMIN" && <SignupRequestsCard />}
  </div>
</div>

  {/* MIDDLE COLUMN */}
  <div className="bg-white rounded-xl shadow p-6 h-[850px] flex flex-col">
   

    <div className="flex-1 overflow-hidden">
      <RecentTransactions />
    </div>
  </div>

  {/* RIGHT COLUMN */}
  <div className="grid grid-rows-2 gap-6 h-[850px]">

    <div className="bg-white rounded-xl shadow p-2">
     
      <RenewalCards />
    </div>

    <div className="bg-white rounded-xl shadow p-2">
      
      <CurrencyWidget />
    </div>

  </div>

</div>
    </div>
  );
}