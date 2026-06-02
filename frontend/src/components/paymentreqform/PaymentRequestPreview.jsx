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


const headers = Array.isArray(data?.header)
  ? data.header
  : [];
// console.log("Headers array:", headers);
const header = headers[0] || {};
// console.log("Using header:", header);
const details = data?.details || {};

const paid_by = data?.paid_by || "";

const remarksList = headers
  .map(h => h.remarks)
  .filter(Boolean);

const remarks = remarksList.join(", ");
const currencyNames = {
  // Currency codes
  AED: "DIRHAMS",
  USD: "DOLLARS",
  EUR: "EUROS",
  GBP: "POUNDS",
  INR: "RUPEES",
  SAR: "RIYALS",

  // Master codes
  CR001: "DIRHAMS",   // AED
  CR002: "DOLLARS",   // USD
  CR003: "EUROS",     // EUR
  CR004: "POUNDS",    // GBP
  CR006: "RUPEES",    // INR
  CR007: "RIYALS"     // SAR
};

// console.log("Header:", header);
//   console.log("Details:", details);
  const [creditCards, setCreditCards] = useState([]);
  const [company, setCompany] = useState([]);
  const [vendor, setVendor] = useState(null);
  const [currency, setCurrency] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [terms, setTerms] = useState([]);
  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [transactionType, setTransactionType] = useState("");
  const barcodeRef = useRef(null);
  const activeUser = JSON.parse(localStorage.getItem("user"));
  const activeUserEmail = activeUser?.email;
  const activeUserName = activeUser?.name;
  

   useEffect(() => {
  if (details?.prf_num && barcodeRef.current) {
    const svg = barcodeRef.current;
   // console.log("Generating barcode for PRF Number:", details[0].prf_num);
    // 🔥 IMPORTANT: clear old barcode
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    JsBarcode(svg, details.prf_num, {
      format: "CODE128",
      height: 40,
      width: 1,
      fontSize: 9,
      margin: 2,
      displayValue: true
    });
  }
}, [details?.prf_num]);
function numberToWords(num, currencyCode = "AED") {
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

  const majorUnits = {
    AED: "DIRHAMS",
    USD: "DOLLARS",
    EUR: "EUROS",
    GBP: "POUNDS",
    INR: "RUPEES",
    SAR: "RIYALS",

    CR001: "DIRHAMS",
    CR002: "DOLLARS",
    CR003: "EUROS",
    CR004: "POUNDS",
    CR006: "RUPEES",
    CR007: "RIYALS"
  };

  const minorUnits = {
    AED: "FILS",
    USD: "CENTS",
    EUR: "CENTS",
    GBP: "PENCE",
    INR: "PAISE",
    SAR: "HALALAS",

    CR001: "FILS",
    CR002: "CENTS",
    CR003: "CENTS",
    CR004: "PENCE",
    CR006: "PAISE",
    CR007: "HALALAS"
  };

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

  const major = majorUnits[currencyCode] || "";
  const minor = minorUnits[currencyCode] || "FILS";

  let result = helper(whole);

  if (major) {
    result += ` ${major}`;
  }

  if (decimal > 0) {
    result += ` AND ${helper(decimal)} ${minor}`;
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

function formatDateLong(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date)) return "";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

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
  getMasterData("currency", activeUser.email).then(res => {
    const result = Array.isArray(res?.data) ? res.data : [];
    setCurrency(result);
  });
  getMasterData("division", activeUser.email).then(res => {
    const result = Array.isArray(res?.data) ? res.data : [];
    setCostCenters(result);
  });
  getMasterData("department", activeUser.email).then(res => {
    const result = Array.isArray(res?.data) ? res.data : [];
    setDepartments(result);
  });
  getMasterData("billing_cycle", activeUser.email).then(res => {
    const result = Array.isArray(res?.data) ? res.data : [];
    setTerms(result);
  });
  getMasterData("plans", activeUser.email).then(res => {
    const result = Array.isArray(res?.data) ? res.data : [];
    setPlans(result);
  });
  getMasterData("service_providers", activeUser.email).then(res => {
    const result = Array.isArray(res?.data) ? res.data : [];
    setProducts(result);
  });
  getMasterData("services", activeUser.email).then(res => {
    const result = Array.isArray(res?.data) ? res.data : [];
    setProductTypes(result);
  });
  getMasterData("transaction_types", activeUser.email).then(res => {
    const result = Array.isArray(res?.data) ? res.data : [];
    setTransactionType(result);
  });
}, []);



const selectedVendor =
  Array.isArray(vendor) && header.vendors
    ? vendor.find((v) => {
        const headerValue = header.vendors
          .toString()
          .trim()
          .toUpperCase();

        const vendorCode = (v.vendor_code || "")
          .toString()
          .trim()
          .toUpperCase();

        const vendorName = (v.vendor_name || "")
          .toString()
          .trim()
          .toUpperCase();

        return (
          vendorCode === headerValue ||
          vendorName === headerValue
        );
      })
    : null;

//console.log("Selected Vendor:", selectedVendor);
const isVatApplicable = selectedVendor ? selectedVendor.is_vat : false;


const selectedCompany =
  Array.isArray(company) && header.company
    ? company.find((c) => {
        const headerValue = header.company
          .toString()
          .trim()
          .toUpperCase();

        const companyCode = (c.company_code || "")
          .toString()
          .trim()
          .toUpperCase();

        const tradeName = (c.trade_name || "")
          .toString()
          .trim()
          .toUpperCase();

        

        return (
          companyCode === headerValue ||
          tradeName === headerValue
        );
      })
    : null;





const selectedCurrency =
  Array.isArray(currency) && header.currency
    ? currency.find((c) => {
        const headerValue = header.currency
          .toString()
          .trim()
          .toUpperCase();

        const currencyCode = (c.currency_code || "")
          .toString()
          .trim()
          .toUpperCase();

        const currencyName = (c.currency || "")
          .toString()
          .trim()
          .toUpperCase();

        return (
          currencyCode === headerValue ||
          currencyName === headerValue
        );
      })
    : null;

const selectedTerm = Array.isArray(terms) && header.term ? terms.find(
  (t) =>
    (t.bc_code || "").toString().trim().toUpperCase() ===
    header.term.toString().trim().toUpperCase()
) : null;

const selectedCostCenter = Array.isArray(costCenters) && header.cost_center ? costCenters.find(
    (cc) => (cc.division_code || "").toString().trim().toUpperCase() === header.cost_center.toString().trim().toUpperCase()   
) : null;

const selectedDepartment = Array.isArray(departments) && header.department ? departments.find(
    (d) => (d.department_code || "").toString().trim().toUpperCase() === header.department.toString().trim().toUpperCase()
) : null;

const selectedTransactionType = Array.isArray(transactionType) && header.transaction_type ? transactionType.find(
    (tt) => (tt.transaction_code || "").toString().trim().toUpperCase() === header.transaction_type.toString().trim().toUpperCase()
) : null;

console.log("Selected Transaction Type:", selectedTransactionType); 

// console.log("Selected currency:", selectedCurrency);
// console.log("Selected term:", selectedTerm);
// console.log("Selected cost center:", selectedCostCenter);
// console.log("Selected department:", selectedDepartment);

const getProductName = (productCode) => {
  const product = products?.find(
    p =>
      (p.product_code || "").toUpperCase() ===
      (productCode || "").toUpperCase()
  );
  console.log("products:", product);
  return product?.product || productCode;
};

const getServiceName = (serviceCode) => {
  const service = productTypes?.find(
    s =>
      (s.service_code || "").toUpperCase() ===
      (serviceCode || "").toUpperCase()
  );

  return service?.service_name || serviceCode;
};

const getPlanName = (planCode) => {
  const plan = plans?.find(
    p =>
      (p.plan_code || "").toUpperCase() ===
      (planCode || "").toUpperCase()
  );

  return plan?.plan_name || planCode;
};

function handlePrint() {
  const content = document.getElementById("print-area").innerHTML;

  const printWindow = window.open("", "", "width=1200,height=900");

const now = new Date();

const dd = String(now.getDate()).padStart(2, '0');
const mm = String(now.getMonth() + 1).padStart(2, '0');
const yyyy = now.getFullYear();

let hh = now.getHours();
const min = String(now.getMinutes()).padStart(2, '0');
const ss = String(now.getSeconds()).padStart(2, '0');

const ampm = hh >= 12 ? 'PM' : 'AM';

// convert to 12-hour format
hh = hh % 12;
hh = hh ? hh : 12; // 0 should be 12
hh = String(hh).padStart(2, '0');

const formattedDateTime = `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss} ${ampm}`;

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
                  content: "User:${activeUser.name}  | Printed: ${formattedDateTime}";
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
const Total = Number(details?.amount || 0);

const TotalVAT = Number(details?.vat_amount || 0);

const grand = Number(details?.total_amount || 0);

const TotalICANN = headers?.reduce((sum, item) => {
  const product = products?.find(
    p =>
      (p.product_code || "").toUpperCase() ===
      (item?.products || "").toUpperCase()
  );

  return sum + (product?.is_icann ? Number(product?.icann_fee || 0) : 0);
}, 0);
const grandTotal = grand + TotalICANN;
// At the top, after expiryDate:
const startDate = header.date
  ? formatDateLong(header.date)
  : details?.[0]?.doc_date
    ? formatDateLong(details[0].doc_date)
    : "N/A";
const expiryDate = header?.expiry_date ? formatDateLong(header.expiry_date) : "N/A";
const periodDisplay = `${startDate} to ${expiryDate}`;
const currentDate = new Date();

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
      {selectedCompany?.trade_name || header.company || "Company Name"}
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
      {selectedVendor?.address || "Vendor Address"} {selectedVendor?.country ?`, ${selectedVendor?.country}` : ""}
    </p>

    <p className="text-[12px] text-gray-700">
      Email: {selectedVendor?.email || "-"}{" "}
      {selectedVendor?.website
        ? `| Website: ${selectedVendor.website}`
        : ""}
   
    </p>
      <p className="text-[12px] text-gray-700">
     
    {selectedVendor?.phone_number
        ? `Tel: ${selectedVendor.phone_number}`
        : ""}
    </p>

  </div>

  {/* RIGHT COLUMN */}
  <div className="p-3 leading-4">

    <h2 className="font-bold text-[12px] uppercase mb-1">
      REQUEST SUMMARY
    </h2>
    <h1 className="font-bold text-[13px]">
      {selectedTerm?.value || header.term} Subscription Fees
    </h1>
   <p className="text-[12px] text-gray-700">
  {selectedTransactionType?.transaction_code === "TT003" &&
    `This payment request is for a new subscription.`}

  {selectedTransactionType?.transaction_code === "TT001" &&
    `This payment request is for the renewal of a subscription.`}

  {selectedTransactionType?.transaction_code === "TT004" &&
    `This payment request is related to the cancellation of a subscription service.`}
    </p>
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
        {details?.sysdate
  ? formatDate(details.sysdate)
  : formatDate(currentDate)}
      </td>

      {/* CURRENCY */}
      <td className="border border-gray-800 px-2 py-1 w-[18%] font-bold">
         PRF NUMBER
      </td>

      <td className="border border-gray-800 px-2 py-1 font-semibold">
        {details?.prf_num}
      </td>

    </tr>

    {/* ROW 2 */}
    <tr className="bg-[#f8fafc]">

      {/* PRF */}
       <td className="border border-gray-800 px-2 py-1 font-bold">
        RECEIPT NUMBER
      </td>

      <td className="border border-gray-800 px-2 py-1 font-semibold">
        {details?.receipt_number || " - "}
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
        {selectedDepartment?.department_name || header.department || " - "}
      </td>

      {/* PAYMENT METHOD */}
      <td className="border border-gray-800 px-2 py-1 font-bold">
        PAYMENT METHOD
      </td>

      <td className="border border-gray-800 px-2 py-1 font-semibold">
        {header.payment_mode || "CREDIT CARD"}
      </td>

    </tr>
     <tr className="bg-[#f8fafc]">

      {/* DEPARTMENT */}
    
       <td className="border border-gray-800 px-2 py-1 font-bold">
        COST CENTER
      </td>

      <td className="border border-gray-800 px-2 py-1 font-semibold">
        {selectedCostCenter?.division_name || header.cost_center || " - "}
      </td>

      {/* PAYMENT METHOD */}
      <td className="border border-gray-800 px-2 py-1 font-bold">
        PERIOD
      </td>

      <td className="border border-gray-800 px-2 py-1 font-semibold">
        {periodDisplay}
      </td>

    </tr>

  

  </tbody>

</table>


{/* ================= DESCRIPTION ================= */}

{/* <table className="w-full border border-black border-collapse mb-5 text-[10px]">

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

</table> */}


{/* ================= DETAILS TABLE ================= */}

<table className="w-full border border-black-800 border-collapse mb-0 text-[10px]">

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
    <tr className="bg-gray-200 text-black text-[9px]">

      <th className="border border-gray-800 px-2 py-1 w-[5%]">
        S/N
      </th>

      <th className="border border-gray-800 px-2 py-1 w-[15%]">
        INVOICE / PO DOC DATE
      </th>

      <th className="border border-gray-800 px-2 py-1 w-[15%]">
        INVOICE / PO DOC NO
      </th>

      <th className="border border-gray-800 px-2 py-1">
        PRODUCT DESCRIPTION
      </th>

      <th className="border border-gray-800 px-1 py-1 w-[10%] text-right">
        AMOUNT ({selectedCurrency?.currency || header.currency})
      </th>

      <th className="border border-gray-800 px-1 py-1 w-[10%] text-right">
        VAT AMOUNT ({selectedCurrency?.currency || header.currency})
      </th>

      <th className="border border-gray-800 px-1 py-1 w-[10%] text-right">
        TOTAL AMOUNT ({selectedCurrency?.currency || header.currency})
      </th>

    </tr>

  </thead>

  <tbody>

    {/* DATA ROW */}
    <tr className="text-center align-top h-[250px] bg-[#f8fafc] border border-black-800">

     
      <td className="border border-gray-800 p-2 align-top">
        {headers?.map((_, i) => (
          <div key={i} className="py-1">
            {i + 1}.
          </div>
        ))}
      </td>

      
      <td className="border border-gray-800 p-2 align-top">
        {headers?.map((_, i) => (
          <div key={i} className="py-1">
            {headers?.[i]?.date
              ? formatDate(headers[i].date)
              : ""}
          </div>
        ))}
      </td>

     
      <td className="border border-gray-800 p-2 align-top">
        {headers?.map((_, i) => (
          <div key={i} className="py-1">
            {headers[i]?.invoice_number || " - "}
          </div>
        ))}
      </td>

     
<td className="border border-gray-800 p-2 align-top text-left">
  {headers?.map((item, i) => {
    const product = products?.find(
      p =>
        (p.product_code || "").toUpperCase() ===
        (item?.products || "").toUpperCase()
    );

    return (
      <div key={i} className="py-1 flex flex-col">
        <div>
          {getProductName(item?.products)}
          {item?.plan_provider &&
            ` - ${getPlanName(item.plan_provider)}`}
          {item?.product_types &&
            ` - ${getServiceName(item.product_types)}`}
        </div>

        {product?.is_icann && product?.icann_fee ? (
          <div className="text-[9px] mt-1">
            ICANN Fee added for {getProductName(item?.products)}
          </div>
        ) : null}
      </div>
    );
  })}

  {/* Show after entries */}
  <div className="mt-4 pt-2 border-gray-400 text-center text-[9px]  text-gray-500">
    *** SPACE INTENTIONALLY LEFT BLANK ***
  </div>
</td>

    
      <td className="border border-gray-800 p-2 align-top text-right">
        {headers?.map((_, i) => (
          <div key={i} className="py-1">
           
            {formatDecimal(headers[i]?.amount ?? 0)}
          </div>
        ))}
      </td>

      
      <td className="border border-gray-800 p-2 align-top text-right">
        {headers?.map((_, i) => (
          <div key={i} className="py-1">
           
            {formatDecimal(headers[i]?.vat_amount ?? 0)}
          </div>
        ))}
      </td>

     
     <td className="border border-gray-800 p-2 align-top text-right">
  {headers?.map((item, i) => {
    const product = products?.find(
      p =>
        (p.product_code || "").toUpperCase() ===
        (item?.products || "").toUpperCase()
    );

    const mainAmount = Number(item?.total_amount ?? 0);
    const icannFee = product?.is_icann ? Number(product?.icann_fee ?? 0) : 0;

    return (
      <div key={i} className="py-1 flex flex-col items-end">

        {/* LINE 1: NORMAL TOTAL */}
        <div>
          {formatDecimal(mainAmount)}
        </div>

        {/* LINE 2: ICANN FEE */}
        {icannFee > 0 && (
          <div className="text-[10px] text-black mt-1">
             {formatDecimal(icannFee)} 
          </div>
        )}

      </div>
    );
  })}
</td>

    </tr>

   
    <tr className="bg-[#e5e7eb]">

      <td
        colSpan={4}
        className="border border-gray-800 p-2 font-bold text-right"
      >
        TOTAL
      </td>

      <td className="border border-gray-800 p-2 text-right font-bold">
        {formatDecimal(Total)}
      </td>

      <td className="border border-gray-800 p-2 text-right font-bold">
        {formatDecimal(TotalVAT)}
      </td>

      <td className="border border-gray-800 p-2 text-right font-bold text-[12px]">
        {/* {selectedCurrency?.currency || header.currency} {formatDecimal(grandTotal)} */}
        {formatDecimal(grandTotal)}
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
        {numberToWords(grandTotal, selectedCurrency?.currency)}  ONLY
      </td>

    </tr>
     

  </tbody>

</table>

   

{/* ================= ADDITIONAL DETAILS ================= */}

<table className="w-full border-x border-b border-gray-800 border-collapse mb-5 text-[10px]">

  {/* HEADER */}
  <thead>

   <tr className="bg-gray-200 text-black">
  <th
    colSpan={2}
    className="text-left px-2 py-1 border-l border-r border-b border-gray-800 text-[14px] font-bold"
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
  {remarks}{" "}

  {(header.currency !== "CR001" &&
    header.currency !== "AED" &&
    header.total_amount_aed) && (
    <>
      {/* <br /> */}
    <span>
  Equivalent Amount in AED: {formatDecimal(header.total_amount_aed)}
  {details?.exchange_rate && (
    <>
      {" "}
      (Converted at an exchange rate of {details.exchange_rate} when this PRF was generated on{" "}
      {formatDate(details.prf_date)})
    </>
  )}
</span>
    </>
  )}

  {!remarks &&
    !(header.currency !== "CR001" &&
      header.currency !== "AED" &&
      header.total_amount_aed) &&
    " - "}
</td>

    </tr>

  </tbody>

</table>


{/* ================= APPROVALS ================= */}

<table className="w-full mt-15 table-fixed border border-gray-800 border-collapse text-center text-[10px]">

  {/* HEADER */}
  <thead>

    {/* TITLE */}
    <tr className="bg-gray-200 text-black">

      <th
        colSpan={details?.is_advertising ? 6 : 5}
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
    {details?.is_advertising && (
      <th className="w-1/6 border border-gray-800 px-2 py-1">
        CHECKED BY 
      </th>
    )}

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

        <div className="text-[8px]">
          {details?.prepared_by}
        </div>

        <div className="mt-2 text-[8px] ">
          IT DEPARTMENT
        </div>

      </td>

      {/* CHECKED */}
      {details?.is_advertising && (
      <td className="border border-gray-800 px-2 py-1 font-semibold">

        <div className="text-[8px]">
          {details?.checked_by}
        </div>

        <div className="mt-2 text-[8px] ">
          OPERATIONS
        </div>

      </td>
      )}

      {/* VERIFIED */}
      <td className="border border-gray-800 px-2 py-1 font-semibold">

        <div className="text-[8px]">
          {details?.verified_by_it}
        </div>

        <div className="mt-2 text-[8px] ">
          IT DEPARTMENT
        </div>

      </td>

      {/* VERIFIED */}
      <td className="border border-gray-800 px-2 py-1 font-semibold">

        <div className="text-[8px]">
          {details?.verified_by}
        </div>

        <div className="mt-2 text-[8px] ">
          ACCOUNTS
        </div>

      </td>

      {/* SIGNED */}
      <td className="border border-gray-800 px-2 py-1 font-semibold">

        <div className="text-[8px]">
          {details?.signed_by}
        </div>

        <div className="mt-2 text-[8px] ">
          FINANCE MANAGER
        </div>

      </td>

      {/* APPROVED */}
      <td className="w-1/6 border border-gray-800 px-2 py-1 font-semibold">

        <div className="text-[8px]">
          {details?.approved_by}
        </div>

        <div className="mt-2 text-[8px]">
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