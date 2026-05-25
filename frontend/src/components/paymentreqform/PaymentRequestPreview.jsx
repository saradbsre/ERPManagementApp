import React from "react";
import { previewPrintContent } from "../../utils/PrintHelper";
import { formatDateTime } from "../../utils/formatDateTime";
import { formatDate } from "../../utils/formatDate";
import { useEffect, useState, useRef } from "react";
import JsBarcode from "jsbarcode";
import { getMasterData, createPaymentRequest, incrementPRFExportCount  } from "../../api/api";
export default function PaymentRequestPreview({ data, onBack }) {
 // console.log("PaymentRequestPreview data:", data);
  if (!data) {
    return (
      <div className="p-10 text-center text-gray-500">
        No preview data found
      </div>
    );
  }
const remarksList = Array.isArray(data?.header)
  ? data.header.map(h => h.remarks).filter(Boolean)
  : [data?.header?.remarks].filter(Boolean);

const remarks = remarksList.join(", ");

const header = data?.header?.[0] || data?.header || {};
const details = data?.details || [];
const paid_by = data?.paid_by || "SABAH";

// console.log("Header:", header);
//   console.log("Details:", details);
  const [creditCards, setCreditCards] = useState([]);
  const [company, setCompany] = useState([]);
  const [vendor, setVendor] = useState(null);
  const barcodeRef = useRef(null);
  const activeUser = JSON.parse(localStorage.getItem("user"));
  const activeUserEmail = activeUser?.email;
  const activeUserName = activeUser?.name;

   useEffect(() => {
  if (details?.[0]?.prf_num && barcodeRef.current) {
    const svg = barcodeRef.current;
   // console.log("Generating barcode for PRF Number:", details[0].prf_num);
    // 🔥 IMPORTANT: clear old barcode
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    JsBarcode(svg, details[0].prf_num, {
      format: "CODE128",
      height: 40,
      width: 1,
      fontSize: 9,
      margin: 2,
      displayValue: true
    });
  }
}, [details?.[0]?.prf_num]);
function numberToWords(num) {
  if (num == null || isNaN(num)) return "ZERO";

  const belowTwenty = [
    "", "ONE", "TWO", "THREE", "FOUR", "FIVE",
    "SIX", "SEVEN", "EIGHT", "NINE", "TEN",
    "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN",
    "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"
  ];

  const tens = [
    "", "", "TWENTY", "THIRTY", "FORTY",
    "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"
  ];

  function helper(n) {
    n = Math.floor(n);

    if (n < 20) return belowTwenty[n];

    if (n < 100) {
      return (
        tens[Math.floor(n / 10)] +
        (n % 10 ? " " + belowTwenty[n % 10] : "")
      );
    }

    if (n < 1000) {
      return (
        belowTwenty[Math.floor(n / 100)] +
        " HUNDRED" +
        (n % 100 ? " " + helper(n % 100) : "")
      );
    }

    if (n < 1000000) {
      return (
        helper(Math.floor(n / 1000)) +
        " THOUSAND" +
        (n % 1000 ? " " + helper(n % 1000) : "")
      );
    }

    return "";
  }

  const whole = Math.floor(num);
  const decimal = Math.round((num - whole) * 100);

  let result = helper(whole);

  if (decimal > 0) {
    result += " AND " + helper(decimal) + " FILS";
  }

  return result.trim();
}

function formatDecimal(num) {
  if (isNaN(num) || num === null) return "0.00";
  return Number(num).toFixed(2);
}

const handleExportPrf = async (prfNum) => {
  try {
    await incrementPRFExportCount(encodeURIComponent(prfNum), activeUserEmail); // pass the email!
    setPopupMessage("Export count incremented successfully.");
    setPopupType("success");
  } catch (err) {
    setPopupMessage("Failed to increment export count.");
    setPopupType("error");
  }
};

useEffect(() => {
   getMasterData("credit_card", activeUser.email).then(res => {
    const result = Array.isArray(res?.data) ? res.data : [];
    setCreditCards(result);
  //  console.log("Credit Cards:", result);
  });
   getMasterData("company", activeUser.email).then(res => {
    const result = Array.isArray(res?.data) ? res.data : [];
    setCompany(result);
  //  console.log("Company:", result);
  });
  getMasterData("vendors", activeUser.email).then(res => {
    const result = Array.isArray(res?.data) ? res.data : [];
    setVendor(result);
  //  console.log("Vendor:", result);
  });

}, []);

const selectedVendor =
  Array.isArray(vendor) && header.vendors
    ? vendor.find(
        (v) =>
          (v.vendor_name || "").toString().trim().toUpperCase() ===
          header.vendors.toString().trim().toUpperCase()
      )
    : null;
const isVatApplicable = selectedVendor ? selectedVendor.is_vat : false;
//console.log("Selected Vendor:", selectedVendor, "VAT Applicable:", isVatApplicable);
//console.log("Selected header:", header);
const selectedCompany =
  Array.isArray(company) && header.company
    ? company.find(
        (c) =>
          (c.trade_name || "").toString().trim().toUpperCase() ===
          header.company.toString().trim().toUpperCase()
      )
    : null;

function handlePrint() {
  const content = document.getElementById("print-area").innerHTML;

  const printWindow = window.open("", "", "width=1200,height=900");

  printWindow.document.write(`
    <html>
      <head>
        <title>Payment Request</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @page { size: A4; margin: 10mm; }
          html, body { background: white; margin: 0; padding: 0; font-family: "Times New Roman", serif; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { padding: 10px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border-collapse: collapse; }
          .print-area { width: 100%; }
        </style>
      </head>
      <body>
        <div class="print-area">${content}</div>
         <script>
        (function () {
          const style = document.createElement('style');
          style.textContent = \`
            @media print {
              @page {
                
                @bottom-left {
                  content: "User:${activeUser.name}  | Printed: ${new Date().toLocaleString()}";
                  font-size: 10px;
                  margin-bottom: 20mm;
                  font-family: "Times New Roman", serif;
                }
                @bottom-right {
                  content: "Page " counter(page) " of " counter(pages);
                  font-size: 10px;
                  margin-bottom: 20mm;
                  font-family: "Times New Roman", serif;
                }
              }
            }\`;
          document.head.appendChild(style);
        })();

        window.onload = function() {
          window.focus();
          window.print();
        }
      </script>
      </body>
    </html>
  `);

  printWindow.document.close();

  // Wait for the new window to finish loading
  printWindow.onload = function () {
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };
}
const grandTotal = Array.isArray(details)
  ? details.reduce((sum, item) => sum + Number(item?.total_amount || 0), 0)
  : 0;

const Total = Array.isArray(details)  ? details.reduce((sum, item) => sum + Number(item?.amount || 0), 0)
  : 0;

const TotalVAT = Array.isArray(details)  ? details.reduce((sum, item) => sum + Number(item?.vat_amount || 0), 0)
  : 0;

const expiryDate = header?.expiry_date ? formatDate(header.expiry_date) : "N/A";
  return (
    <div className="bg-gray-200 min-h-screen py-10 px-4 overflow-auto">

      {/* PAPER */}
      <div
  id="print-area"
  className="
    bg-white
    w-full
    max-w-[210mm]
    min-h-[297mm]
    mx-auto
    shadow-2xl
    border
    border-gray-300
    p-8
    text-[13px]
    text-black
    print-area
  "
>

      <div className="flex justify-between items-start w-full ">
  {/* Left: Company & Vendor Details */}
  <div className="leading-4">
    <h1 className="font-bold text-[15px] uppercase">
      {header.company || "Company Name"}
    </h1>
    <p className="text-[11px] text-gray-700">
      {selectedCompany?.address || "Company Address"}
    </p>
    <p className="text-[11px] text-gray-700">
      {selectedCompany?.area || ""}, {selectedCompany?.emirate || ""}, {selectedCompany?.country || "UAE"}
      {selectedCompany?.phn_number ? ` Tel ${selectedCompany?.phn_number}` : ""}
      {selectedCompany?.email ? `, Email: ${selectedCompany?.email}` : ""}
    </p>
    <p className="text-[11px] text-gray-700 mb-2">
      TRN : {selectedCompany?.trn || ""}
    </p>
   
  </div>
  {/* Right: Barcode */}
 
  <div className="pl-8 flex items-start">
    <svg ref={barcodeRef}></svg>
  </div>
</div>
<div className="w-full border-t border-gray-500 mb-3"></div>

<div className=" items-center w-full mb-5">

  {/* TITLE SECTION */}
  <div className="text-center leading-tight">

    <h2 className="font-bold text-[20px] text-center">
      PAYMENT REQUEST FORM
    </h2>

  </div>

</div>

  {/* COMPANY DETAILS */}
<div className="grid grid-cols-2 border border-gray-400 mb-4">

  {/* LEFT COLUMN */}
  <div className="p-3 leading-4 border-r border-gray-300">

    <h2 className="font-bold text-[12px] uppercase mb-1">
      PAYEE / SUPPLIER
    </h2>

    <h1 className="font-bold text-[13px]">
      {selectedVendor?.vendor_name || "Vendor Name"}
      {isVatApplicable ? " (VAT Included)" : ""}
    </h1>

    <p className="text-[12px] text-gray-700">
      {selectedVendor?.address || "Vendor Address"}
    </p>

    <p className="text-[12px] text-gray-700">
      Email: {selectedVendor?.email || "-"}{" "}
      {selectedVendor?.website
        ? `| Website: ${selectedVendor.website}`
        : ""}
    </p>

  </div>

  {/* RIGHT COLUMN */}
  <div className="p-3 leading-4">

    <h2 className="font-bold text-[12px] uppercase mb-1">
      REQUEST SUMMARY
    </h2>

    <h1 className="font-bold text-[13px]">
      {header.term} Subscription Fees
    </h1>

    <p className="text-[12px] text-gray-700">
      Subscription expiry on {expiryDate}
    </p>

    <p className="text-[12px] text-gray-700">
      Paid by {paid_by} using credit card ending with ****
      {(() => {
        let paidBy = (paid_by || "")
          .toString()
          .trim()
          .toUpperCase();

        const card = creditCards.find(
          c =>
            (c.card_holder_name || "")
              .toString()
              .trim()
              .toUpperCase() === paidBy
        );

        return card?.card_number || card?.card_4number || "";
      })()}
    </p>

  </div>

</div>




        <div className="mb-3">



  {/* TITLE */}


</div>

        {/* ================= TOP INFO TABLE ================= */}
{/* ================= REQUEST DETAILS ================= */}

<table className="w-full border border-black border-collapse mb-5 text-[10px]">

  {/* HEADER */}
  <thead>
    <tr className="bg-gray-200 text-black">
      <th
        colSpan={4}
        className="text-left px-2 py-1 border border-black text-[14px] font-bold"
      >
        REQUEST DETAILS
      </th>
    </tr>
  </thead>

  <tbody>

    {/* ROW 1 */}
    <tr className="bg-[#f8fafc]">

      {/* DATE */}
      <td className="border border-gray-800 px-2 py-1 w-[18%] font-bold">
        DATE
      </td>

      <td className="border border-gray-800 px-2 py-1 w-[32%] font-semibold">
        {header.created_at ? formatDate(header.date) : ""}
      </td>

      {/* CURRENCY */}
      <td className="border border-gray-800 px-2 py-1 w-[18%] font-bold">
        CURRENCY
      </td>

      <td className="border border-gray-800 px-2 py-1 font-semibold">
        {header.currency}
      </td>

    </tr>

    {/* ROW 2 */}
    <tr className="bg-[#f8fafc]">

      {/* PRF */}
      <td className="border border-gray-800 px-2 py-1 font-bold">
        PRF NUMBER
      </td>

      <td className="border border-gray-800 px-2 py-1 font-semibold">
        {details?.[0]?.prf_num}
      </td>

      {/* PAYMENT TYPE */}
      <td className="border border-gray-800 px-2 py-1 font-bold">
        PAYMENT TYPE
      </td>

      <td className="border border-gray-800 px-2 py-1 font-semibold">
        {header.mode || "ONLINE"}
      </td>

    </tr>

    {/* ROW 3 */}
    <tr className="bg-[#f8fafc]">

      {/* DEPARTMENT */}
      <td className="border border-gray-800 px-2 py-1 font-bold">
        DEPARTMENT
      </td>

      <td className="border border-gray-800 px-2 py-1 font-semibold">
        {header.department}
      </td>

      {/* PAYMENT METHOD */}
      <td className="border border-gray-800 px-2 py-1 font-bold">
        PAYMENT METHOD
      </td>

      <td className="border border-gray-800 px-2 py-1 font-semibold">
        {header.payment_mode || "CREDIT CARD"}
      </td>

    </tr>

    {/* ROW 4 */}
    <tr className="bg-[#f8fafc]">

      {/* COST CENTER */}
      <td className="border border-gray-800 px-2 py-1 font-bold">
        COST CENTER
      </td>

      <td
        colSpan={3}
        className="border border-gray-800 px-2 py-1 font-semibold"
      >
        {header.cost_center || "____________________________"}
      </td>

    </tr>

  </tbody>

</table>


{/* ================= DESCRIPTION ================= */}

<table className="w-full border border-black border-collapse mb-5 text-[10px]">

  <tbody>

    <tr>

      <td className="border border-gray-800 p-2 bg-gray-200 font-bold w-[18%]">
        DESCRIPTION
      </td>

      <td className="border border-gray-800 p-2 bg-gray-100 font-semibold">
        {header.term} Subscription fees
        ( expiry on {expiryDate} )
      </td>

    </tr>

  </tbody>

</table>


{/* ================= DETAILS TABLE ================= */}

<table className="w-full border border-black-800 border-collapse mb-2 text-[10px]">

  {/* TABLE HEADER */}
  <thead>

    {/* TITLE */}
    <tr className="bg-gray-200 text-black">
      <th
        colSpan={7}
        className="text-left px-2 py-1 border border-gray-800 text-[14px] font-bold"
      >
        INVOICE / PAYMENT PARTICULARS
      </th>
    </tr>

    {/* COLUMN HEADERS */}
    <tr className="bg-gray-200 text-black">

      <th className="border border-gray-800 px-2 py-1 w-[5%]">
        S/N
      </th>

      <th className="border border-gray-800 px-2 py-1 w-[15%]">
        INVOICE / PO DOC DATE
      </th>

      <th className="border border-gray-800 px-2 py-1 w-[18%]">
        INVOICE / PO DOC NO
      </th>

      <th className="border border-gray-800 px-2 py-1">
        PRODUCT DESCRIPTION
      </th>

      <th className="border border-gray-800 px-2 py-1 w-[12%] text-right">
        AMOUNT
      </th>

      <th className="border border-gray-800 px-2 py-1 w-[12%] text-right">
        VAT AMOUNT
      </th>

      <th className="border border-gray-800 px-2 py-1 w-[14%] text-right">
        TOTAL AMOUNT
      </th>

    </tr>

  </thead>

  <tbody>

    {/* DATA ROW */}
    <tr className="text-center align-top h-[120px] bg-[#f8fafc] border border-black-800">

      {/* S/N */}
      <td className="border border-gray-800 p-2 align-top">
        {details?.map((_, i) => (
          <div key={i} className="py-1">
            {i + 1}.
          </div>
        ))}
      </td>

      {/* DATE */}
      <td className="border border-gray-800 p-2 align-top">
        {details?.map((item, i) => (
          <div key={i} className="py-1">
            {item.doc_date
              ? formatDate(item.doc_date)
              : ""}
          </div>
        ))}
      </td>

      {/* DOC NO */}
      <td className="border border-gray-800 p-2 align-top">
        {details?.map((item, i) => (
          <div key={i} className="py-1">
            {item.doc_no}
          </div>
        ))}
      </td>

      {/* PRODUCT */}
      <td className="border border-gray-800 p-2 align-top text-center">
        {details?.map((item, i) => (
          <div key={i} className="py-1">
            {item.product}
          </div>
        ))}
      </td>

      {/* AMOUNT */}
      <td className="border border-gray-800 p-2 align-top text-right">
        {details?.map((item, i) => (
          <div key={i} className="py-1">
            {header.currency}{" "}
            {formatDecimal(item.amount ?? 0)}
          </div>
        ))}
      </td>

      {/* VAT */}
      <td className="border border-gray-800 p-2 align-top text-right">
        {details?.map((item, i) => (
          <div key={i} className="py-1">
            {header.currency}{" "}
            {formatDecimal(item.vat_amount ?? 0)}
          </div>
        ))}
      </td>

      {/* TOTAL */}
      <td className="border border-gray-800 p-2 align-top text-right">
        {details?.map((item, i) => (
          <div key={i} className="py-1">
            {header.currency}{" "}
            {formatDecimal(item.total_amount ?? 0)}
          </div>
        ))}
      </td>

    </tr>

    {/* TOTAL ROW */}
    <tr className="bg-[#e5e7eb]">

      <td
        colSpan={4}
        className="border border-gray-800 p-2 font-bold text-center"
      >
        TOTAL
      </td>

      <td className="border border-gray-800 p-2 text-right font-bold">
        {header.currency} {formatDecimal(Total)}
      </td>

      <td className="border border-gray-800 p-2 text-right font-bold">
        {header.currency} {formatDecimal(TotalVAT)}
      </td>

      <td className="border border-gray-800 p-2 text-right font-bold text-[12px]">
        {header.currency} {formatDecimal(grandTotal)}
      </td>

    </tr>

    {/* AMOUNT IN WORDS */}
    <tr className="bg-[#f1f5f9]">

      <td
        colSpan={3}
        className="border border-gray-800 p-2 font-bold"
      >
        TOTAL AMOUNT IN WORDS
      </td>

      <td
        colSpan={4}
        className="border border-gray-800 p-2 font-bold"
      >
        {numberToWords(grandTotal)} ONLY
      </td>

    </tr>


  </tbody>

</table>

   

{/* ================= ADDITIONAL DETAILS ================= */}

<table className="w-full border border-gray-800 border-collapse mb-5 text-[10px]">

  {/* HEADER */}
  <thead>

    <tr className="bg-gray-200 text-black">

      <th
        colSpan={2}
        className="text-left px-2 py-1 border border-gray-800 text-[14px] font-bold"
      >
        ADDITIONAL DETAILS
      </th>

    </tr>

  </thead>

  <tbody>

    <tr className="bg-[#f8fafc]">

      <td className="border border-gray-800 px-2 py-1 font-bold w-[18%]">
        REMARKS
      </td>

      <td className="border border-gray-800 px-2 py-1 font-semibold">
        {remarks || " - "}
      </td>

    </tr>

  </tbody>

</table>


{/* ================= APPROVALS ================= */}

<table className="w-full table-fixed border border-gray-800 border-collapse text-center text-[10px]">

  {/* HEADER */}
  <thead>

    {/* TITLE */}
    <tr className="bg-gray-200 text-black">

      <th
        colSpan={6}
        className="text-left px-2 py-1 border border-gray-800 text-[14px] font-bold"
      >
        APPROVALS
      </th>

    </tr>

    {/* COLUMN HEADERS */}
    <tr className="bg-gray-200 text-black text-[10px]">

      <th className="border border-gray-800 px-2 py-1">
        PREPARED BY
      </th>

      <th className="w-1/6 border border-gray-800 px-2 py-1">
        CHECKED BY
      </th>

      <th className="w-1/6 border border-gray-800 px-2 py-1">
        VERIFIED BY
      </th>

      <th className="w-1/6 border border-gray-800 px-2 py-1">
        VERIFIED BY
      </th>

      <th className="w-1/6 border border-gray-800 px-2 py-1">
        SIGNED BY
      </th>

      <th className="w-1/6 border border-gray-800 px-2 py-1">
        APPROVED BY
      </th>

    </tr>

  </thead>

  <tbody>

    <tr className="h-[130px] align-bottom bg-[#f8fafc]">

      {/* PREPARED */}
      <td className="border border-gray-800 px-2 py-1 font-semibold">

        <div>
          {details?.[0]?.prepared_by}
        </div>

        <div className="mt-2 text-[9px] text-gray-600">
          IT DEPARTMENT
        </div>

      </td>

      {/* CHECKED */}
      <td className="border border-gray-800 px-2 py-1 font-semibold">

        <div>
          {details?.[0]?.checked_by}
        </div>

        <div className="mt-2 text-[9px] text-gray-600">
          OPERATIONS
        </div>

      </td>

      {/* VERIFIED */}
      <td className="border border-gray-800 px-2 py-1 font-semibold">

        <div>
          {details?.[0]?.verified_by_it}
        </div>

        <div className="mt-2 text-[9px] text-gray-600">
          IT DEPARTMENT
        </div>

      </td>

      {/* VERIFIED */}
      <td className="border border-gray-800 px-2 py-1 font-semibold">

        <div>
          {details?.[0]?.verified_by}
        </div>

        <div className="mt-2 text-[9px] text-gray-600">
          ACCOUNTS
        </div>

      </td>

      {/* SIGNED */}
      <td className="border border-gray-800 px-2 py-1 font-semibold">

        <div>
          {details?.[0]?.signed_by}
        </div>

        <div className="mt-2 text-[9px] text-gray-600">
          FINANCE MANAGER
        </div>

      </td>

      {/* APPROVED */}
      <td className="w-1/6 border border-gray-800 px-2 py-1 font-semibold">

        <div>
          {details?.[0]?.approved_by}
        </div>

        <div className="mt-2 text-[9px] text-gray-600">
          FOUNDER & CEO
        </div>

      </td>

    </tr>

  </tbody>

</table>

        {/* <table
  className="w-full mt-8"
  style={{
    borderCollapse: "collapse",
    border: "none",
    fontSize: "11px"
  }}
>
  <tbody>
    <tr>
      <td style={{ border: "none", padding: "4px 0" }}>
         User: {activeUser?.name || "User"} | Printed: {formatDateTime(new Date())}
      </td>
      <td style={{ border: "none", padding: "4px 0", textAlign: "right" }}>
         Page <span>1</span> of <span>1</span>
      </td>
    </tr>
  </tbody>
</table> */}

        {/* ================= ACTION BUTTONS ================= */}
        <div className="flex justify-end gap-3 mt-8 print:hidden">

          <button
            onClick={onBack}
            className="
              px-5 py-2
              border
              border-gray-400
              rounded
              hover:bg-gray-100
            "
          >
            Back
          </button>

          <button
           onClick={() => {
  handlePrint();
  handleExportPrf(details?.[0]?.prf_num);
}}
            className="
              px-5 py-2
              bg-blue-600
              text-white
              rounded
              hover:bg-blue-700
            "
          >
            Print
          </button>

        </div>
      

      </div>

    </div>


  );

}