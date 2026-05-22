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

  const { header, details } = data;
   console.log("Header:", header);
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

    // 🔥 IMPORTANT: clear old barcode
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    JsBarcode(svg, details[0].prf_num, {
      format: "CODE128",
      height: 20,
      width: 1,
      fontSize: 9,
      margin: 2,
      displayValue: false
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
const selectedCompany =
  Array.isArray(company) && header.company
    ? company.find(
        (c) =>
          (c.trade_name || "").toString().trim().toUpperCase() ===
          header.company.toString().trim().toUpperCase()
      )
    : null;

function handlePrint() {
  // Get the HTML of the main paper div
  const content = document.getElementById("print-area").innerHTML;
  previewPrintContent({
    content,
    userName: header.signed_by || "User", // or any user info you want
    title: "Payment Request"
  });
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
          max-w-[900px]
          mx-auto
          shadow-2xl
          border
          border-gray-300
          p-10
          text-[13px]
          text-black
          print-area
        "
      >

        {/* ================= HEADER ================= */}
        <div className="mb-3">

  {/* COMPANY DETAILS */}
  <div className="leading-5 mb-4">

    <h1 className="font-bold text-[15px] uppercase">
      {header.company || "Company Name"}
    </h1>

    <p className="text-[11px] text-gray-700">
        {selectedCompany?.address || "Company Address"}
    </p>

    <p className="text-[11px] text-gray-700">
      {selectedCompany?.area || ""}, {selectedCompany?.emirate || ""}, {selectedCompany?.country || "UAE"}, { selectedCompany?.phn_number ? `Tel ${selectedCompany?.phn_number || ""}` : ""},{selectedCompany?.email ? `Email: ${selectedCompany?.email || ""}` : ""}
    </p>

    <p className="text-[11px] text-gray-700 mb-2">
      TRN : {selectedCompany?.trn || ""}
    </p>

     <h1 className="font-bold text-[15px] uppercase">
      {selectedVendor?.vendor_name || "Vendor Name"}
    </h1>
     <p className="text-[11px] text-gray-700">
        {selectedVendor?.address || "Vendor Address"}
    </p>
      <p className="text-[11px] text-gray-700">
       {selectedVendor?.country || ""}, { selectedVendor?.phone_number ? `Tel ${selectedVendor?.phone_number || ""}` : ""},{selectedVendor?.email ? `Email: ${selectedVendor?.email || ""}` : ""}
    </p>
      <p className="text-[11px] text-gray-700">
        {selectedVendor?.website || "Vendor Address"}
    </p>
  </div>

  {/* TITLE */}
<div className="flex justify-between items-center w-full">

  {/* BARCODE */}
  <div>
    <svg ref={barcodeRef}></svg>
  </div>

  {/* TITLE SECTION */}
  <div className="text-right leading-tight">

    <h2 className="font-bold text-[20px] tracking-wide">
      PAYMENT REQUEST FORM
    </h2>

    {/* ADDED LINE */}
    {/* <p className="text-[10px] text-gray-500 mt-1">
      GENERATED
    </p> */}

  </div>

</div>

</div>

        {/* ================= TOP INFO TABLE ================= */}
<table className="w-full border border-black border-collapse mb-5 text-[10px]">

  <tbody>

    {/* ROW 1 */}
    <tr>

      {/* LEFT COLUMN */}
      <td className="border border-black p-2 w-[34%] align-top">

         <div className="grid grid-cols-[80px_18px_1fr] gap-y-1">

          <span className="font-normal">DATE</span>
          <span>:</span>
          <span className="font-semibold">
            {header.created_at ? formatDate(header.created_at) : ""}
          </span>

        </div>

      </td>
      

      {/* RIGHT COLUMN */}
      <td className="border border-black p-2 align-top">

        {/* PRF + DATE */}
        <div className="flex justify-between">

          <div className="grid grid-cols-[120px_10px_1fr]">
            <span className="font-normal">PRF NUMBER</span>
            <span>:</span>
            <span className="font-semibold">
               
              {details?.[0]?.prf_num}
            </span>
          </div>
           </div>
 </td>

    </tr>
     <tr>

      {/* LEFT COLUMN */}
      <td className="border border-black p-2 w-[28%] align-top">

         <div className="grid grid-cols-[80px_18px_1fr] gap-y-1">

          <span className="font-normal">PAID TO</span>
          <span>:</span>
          <span className="font-semibold">
            {header.vendors} {isVatApplicable ? "(VAT Included)" : ""}
          </span>

        </div>

      </td>   

      {/* RIGHT COLUMN */}
      <td className="border border-black p-2 align-top">
        {/* DIVISION */}
        <div className="grid grid-cols-[120px_10px_1fr] mt-1">
          <span className="font-normal">DEPARTMENT</span>
          <span>:</span>
          <span className="font-semibold">
            {header.department}
          </span>
        </div>
      </td>
    </tr>
      <tr>
      {/* LEFT COLUMN */}
      <td className="border border-black p-2 w-[28%] align-top">
        <div className="grid grid-cols-[80px_18px_1fr] gap-y-1">
          <span className="font-normal">CURRENCY</span>
          <span>:</span>
          <span className="font-semibold">
            {header.currency}
          </span>
        </div>
      </td>
      {/* RIGHT COLUMN */}
    <td className="border border-black p-2">
        {/* DESCRIPTION */}
        <div className="grid grid-cols-[120px_10px_1fr] mt-1">
          <span className="font-normal">DESCRIPTION</span>
          <span>:</span>
          <span className="font-semibold">
            {header.term} {header.product_types} fees ( expiry on {expiryDate} )
          </span>
        </div>
      </td>
    </tr>
    {/* ROW 2 */}
    <tr>
      <td className="border border-black p-2 w-[28%] align-top">
        <div className="grid grid-cols-[80px_18px_1fr] gap-y-1">
          <span className="font-normal">PAYMENT TYPE</span>
          <span>:</span>
          <span className="font-semibold">
            {header.mode || "ONLINE"}
          </span>
        </div>
      </td>
      <td className="border border-black p-2">
        {/* PAYMENT MODE */}
        <div className="grid grid-cols-[120px_10px_1fr] mt-1">
          <span className="font-normal">PAYMENT METHOD</span>
          <span>:</span>
          <span className="font-semibold">
            {header.payment_mode || "CREDIT CARD"}
          </span>
        </div>
      </td>
    </tr>
  </tbody>

</table>

        {/* ================= DETAILS TABLE ================= */}
        <table className="w-full border border-black border-collapse mb-5 text-[10px]">

          <thead>

            <tr className="bg-gray-100">

              <th className="border border-black p-2 w-[5%]">
                S/N
              </th>

              <th className="border border-black p-2 w-[15%]">
                INVOICE / PO DOC DATE
              </th>

              <th className="border border-black p-2 w-[15%]">
                INVOICE / PO DOC NO
              </th>

              <th className="border border-black p-2">
                PRODUCT DESCRIPTION
              </th>

              <th className="border border-black p-2 w-[10%] text-right">
                AMOUNT
              </th>
              <th className="border border-black p-2 w-[13%] text-right">
                VAT AMOUNT
              </th>
              <th className="border border-black p-2 w-[14%] text-right">
                TOTAL AMOUNT
              </th>

            </tr>

          </thead>

          <tbody>

          <tr className="text-center align-top h-[200px]">

    {/* S/N */}
    <td className="border border-black p-2 align-top">
      {details?.map((_, i) => (
        <div key={i} className="py-1">
          {i + 1}.
        </div>
      ))}
    </td>

    {/* DATE */}
    <td className="border border-black p-2 align-top text-center">
      {details?.map((item, i) => (
        <div key={i} className="py-1">
          {item.doc_date ? formatDate(item.doc_date) : ""}
        </div>
      ))}
    </td>

    {/* DOC NO */}
    <td className="border border-black p-2 align-top text-center">
      {details?.map((item, i) => (
        <div key={i} className="py-1">
          {item.doc_no}
        </div>
      ))}
    </td>

    {/* PRODUCT */}
    <td className="border border-black p-2 align-top text-center">
      {details?.map((item, i) => (
        <div key={i} className="py-1">
          {item.product}
        </div>
      ))}
    </td>

    {/* AMOUNT */}
    <td className="border border-black p-2 align-top text-right">
   {details?.map((item, i) => {

  const hasHeader = item.doc_date || item.doc_no;

  return (
    <div key={i} className="py-1">
      {hasHeader
        ? `${header.currency} ${formatDecimal(item.amount ?? 0)}`
        : ""
      }
    </div>
  );
})}
    </td>

    {/* VAT */}
    <td className="border border-black p-2 align-top text-right">
 {details?.map((item, i) => {

  const hasHeader = item.doc_date || item.doc_no;

  return (
    <div key={i} className="py-1">
      {hasHeader
        ? `${header.currency} ${formatDecimal(item.vat_amount ?? 0)}`
        : ""
      }
    </div>
  );
})}
    </td>

    {/* TOTAL */}
    <td className="border border-black p-2 align-top text-right">
  {details?.map((item, i) => {

  const hasHeader = item.doc_date || item.doc_no;

  return (
    <div key={i} className="py-1">
      {hasHeader
        ? `${header.currency} ${formatDecimal(item.total_amount ?? 0)}`
        : ""
      }
    </div>
  );
})}
    </td>

  </tr>

         

            {/* TOTAL */}
            <tr >

                 <td
                colSpan={4}
                 className="
                  border border-black
                  p-2
                  font-bold
                  text-left
                "
              >
                TOTAL
              </td>

              <td
                colSpan={1}
                className="
                  border border-black
                  p-2
                  font-bold
                  text-right
                "
              >
              {header.currency} {formatDecimal(Total)}
              </td>
               <td
                colSpan={1}
                 className="
                  border border-black
                  p-2
                  font-bold
                  text-right
                "
              >
                {header.currency} {formatDecimal(TotalVAT)}
              </td>

              <td className="border border-black p-2 text-right font-bold">
                {header.currency} {formatDecimal(grandTotal)}
              </td>

            </tr>
             <tr >

              <td
                colSpan={7}
                className="
                  border border-black
                  p-2
                  font-bold
                  text-left
                "
              >
                TOTAL AMOUNT IN WORDS - {numberToWords(grandTotal)} ONLY
              </td>

              {/* <td className="border border-black p-2 text-right font-bold">
                {header.currency} {formatDecimal(grandTotal)}
              </td> */}

            </tr>
            {/* PAID BY */}
            <tr>

              <td colSpan={7} className="border border-black p-2 font-bold text-left">
               PAID BY  {details?.[0]?.paid_by} using CREDIT CARD ending with **** 
               {(() => {
                 // Fix for SABAH/SABHA typo: try both, or use a mapping if needed
                 let paidBy = (details?.[0]?.paid_by || "").toString().trim().toUpperCase();
                 // Optionally, you can add a mapping or fuzzy match here
                 const card = creditCards.find(
                   c => (c.card_holder_name || "").toString().trim().toUpperCase() === paidBy
                 );
                 //console.log("Matching card for paid_by:", paidBy, card);
                 const last4 = card?.card_number || card?.card_4number;
                 return  last4 ;
               })()}
              </td>
              </tr>

          </tbody>

        </table>

   

        {/* ================= SIGNATURE AREA ================= */}
        {/* <div className="text-right font-bold mb-4 text-[15px] uppercase">
          FOR {header.division}
        </div> */}

        <table className="w-full border border-black border-collapse text-center text-[10px]">

          <thead>

            <tr className="bg-gray-100 text-[10px]">

              <th className="border border-black p-2">
                PREPARED BY
              </th>

              <th className="border border-black p-2">
                CHECKED BY
              </th>

              <th className="border border-black p-2">
                VERIFIED / VALIDATED BY
              </th>

              <th className="border border-black p-2">
                SIGNED BY
              </th>

              <th className="border border-black p-2">
                APPROVED BY
              </th>

            </tr>

          </thead>

          <tbody>

            <tr className="h-[120px] align-bottom">

              <td className="border border-black p-3 font-semibold">
                <div>{details?.[0]?.prepared_by}</div>
                <div className="">IT DEPARTMENT</div>
              </td>

              <td className="border border-black p-3 font-semibold">
                <div>{details?.[0]?.checked_by}</div>
                <div>IT DEPARTMENT</div>
              </td>

              <td className="border border-black p-3 font-semibold">
                <div>{details?.[0]?.verified_by}</div>
                <div>ACCOUNTS</div>
              </td>

              <td className="border border-black p-3 font-semibold">
                <div>{details?.[0]?.signed_by}</div>
                <div>FINANCE MANAGER</div>
              </td>

              <td className="border border-black p-3 font-semibold">
                <div>{details?.[0]?.approved_by}</div>
                <div>FOUNDER & CEO</div>
              </td>

            </tr>

          </tbody>

        </table>

        <table
  className="w-full mt-20"
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
</table>

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
                window.print();
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