import React from "react";
import { previewPrintContent } from "../../utils/PrintHelper";
import { formatDateTime } from "../../utils/formatDateTime";
import { formatDate } from "../../utils/formatDate";
import { useEffect, useState, useRef } from "react";
import JsBarcode from "jsbarcode";
import { getMasterData, createPaymentRequest, incrementPRFExportCount  } from "../../api/api";
export default function PaymentRequestPreview({ data, onBack, disablePrint = false }) {
  console.log("PaymentRequestPreview data:", data);
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
const isAdvertisingEnabled =
  details?.is_advertising === true ||
  details?.is_advertising === 1 ||
  details?.is_advertising === "1" ||
  String(details?.is_advertising || "").toLowerCase() === "true";

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
  const [transactionType, setTransactionType] = useState([]);
  
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
  if (num === null || num === undefined || isNaN(num)) return "-";
  const value = Number(num);
  return value === 0 ? "-" : value.toFixed(2);
}

const handleExportPrf = async (prfNum) => {
  try {
    await incrementPRFExportCount(encodeURIComponent(prfNum), activeUserEmail); // pass the email!
    setPopupMessage("Export count incremented successfully.");
    setPopupType("success");
  } catch (err) {
    // setPopupMessage("Failed to increment export count.");
    // setPopupType("error");
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
  getMasterData("products", activeUser.email).then(res => {
    const result = Array.isArray(res?.data) ? res.data : [];
    setProducts(result);
  });
  getMasterData("product_types", activeUser.email).then(res => {
    const result = Array.isArray(res?.data) ? res.data : [];
    setProductTypes(result);
  });
  getMasterData("transaction_types", activeUser.email).then(res => {
    const result = Array.isArray(res?.data) ? res.data : [];
    setTransactionType(result);
  });
}, []);


console.log("vendor:", vendor);
const selectedVendor =
  Array.isArray(vendor) && header.vendors
    ? vendor.find((v) => {
        const headerValue = header.vendors
          .toString()
          .trim()
          .toUpperCase();

        const vendorCode = (v.vend_code || "")
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

console.log("Selected Vendor:", selectedVendor);
console.log("header.vendors value:", header.vendors); 
const isVatApplicable = selectedVendor ? selectedVendor.is_vat : false;


const selectedCompany =
  Array.isArray(company) && header.company
    ? company.find((c) => {
        const headerValue = header.company
          .toString()
          .trim()
          .toUpperCase();

        const companyCode = (c.com_code || "")
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
console.log("Selected Company:", selectedCompany);




const selectedCurrency =
  Array.isArray(currency) && header.currency
    ? currency.find((c) => {
        const headerValue = header.currency
          .toString()
          .trim()
          .toUpperCase();

        const currencyCode = (c.curr_code || "")
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
    (cc) => (cc.dv_code || "").toString().trim().toUpperCase() === header.cost_center.toString().trim().toUpperCase()   
) : null;
console.log("header.cost_center value:", header.cost_center);
console.log("Cost Centers:", costCenters);
console.log("Selected Cost Center:", selectedCostCenter);
const selectedDepartment = Array.isArray(departments) && header.department ? departments.find(
    (d) => (d.dep_code || "").toString().trim().toUpperCase() === header.department.toString().trim().toUpperCase()
) : null;

const selectedTransactionType = Array.isArray(transactionType) && header.transaction_type ? transactionType.find(
    (tt) => (tt.tt_code || "").toString().trim().toUpperCase() === header.transaction_type.toString().trim().toUpperCase()
) : null;

const selectedProductType = Array.isArray(productTypes) && header.product_types ? productTypes.find(
    (pt) => (pt.pt_code || "").toString().trim().toUpperCase() === header.product_types.toString().trim().toUpperCase()
) : null;
console.log("header.product_types value:", header);
console.log(" Product Type:", productTypes);
console.log("Selected Product Type:", selectedProductType); 



const getProductName = (productCode) => {
  const product = products?.find(
    p =>
      (p.prd_code || "").toUpperCase() ===
      (productCode || "").toUpperCase()
  );
  //console.log("products:", product);
  return product?.prd_name || productCode;
};

const getServiceName = (serviceCode) => {
  const service = productTypes?.find(
    s =>
      (s.pt_code || "").toUpperCase() ===
      (serviceCode || "").toUpperCase()
  );

  return service?.prd_types || serviceCode;
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
  const printWindow = window.open("", "", "width=1200,height=900");

  const header =
    document.getElementById("print-header")?.innerHTML || "";

  const body =
    document.getElementById("print-body")?.innerHTML || "";

  const footer =
    document.getElementById("approval-footer")?.innerHTML || "";

  const now = new Date();

  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();

  let hh = now.getHours();
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const ampm = hh >= 12 ? "PM" : "AM";

  hh = hh % 12;
  hh = hh ? hh : 12;
  hh = String(hh).padStart(2, "0");

  const formattedDateTime =
    `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss} ${ampm}`;

  printWindow.document.write(`
<html>
<head>
<title>Payment Request</title>

<script src="https://cdn.tailwindcss.com"></script>

<style>
@page {
  size: A4;
  margin: 10mm 10mm 20mm 10mm;
}

html, body {
  margin: 0;
  padding: 0;
  font-family: "Times New Roman", serif;
  background: white;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  display: table-header-group;
}

tr, td, th {
  page-break-inside: avoid;
}

/* FOOTER */
.approval-footer {
  margin-top: 15px;
}

/* BLANK SPACE */
.print-blank-space {
  display: none;
  margin-top: 20px;
  text-align: center;
  font-size: 10px;
  color: #666;
}


/* PRINT FOOTER INFO */
@media print {
  @page {
    @bottom-left {
      content: "User: ${activeUser?.name || ""} | Printed: ${formattedDateTime}";
      font-size: 9px;
      font-family: "Times New Roman", serif;
    }

    @bottom-right {
      content: "Page " counter(page) " of " counter(pages);
      font-size: 9px;
      font-family: "Times New Roman", serif;
    }
  }
}
</style>

</head>

<body>

<div class="print-wrapper">

  <table>
    <thead>
      <tr>
        <td>${header}</td>
      </tr>
    </thead>

    <tbody>
      <tr>
        <td>${body}</td>
      </tr>
    </tbody>
  </table>

  <div class="approval-footer">
    ${footer}
  </div>

  <div id="blankSpace" class="print-blank-space">
    *** SPACE INTENTIONALLY LEFT BLANK ***
  </div>

 

</div>

</body>
</html>
  `);

  printWindow.document.close();

  // =========================
  // FINAL PRINT LOGIC (IMPORTANT)
  // =========================
  printWindow.onload = function () {
    setTimeout(() => {
      const wrapper = printWindow.document.querySelector(".print-wrapper");
      const blankSpace = printWindow.document.getElementById("blankSpace");

      const pageHeight = 1055;
      const contentHeight = wrapper.scrollHeight;

      const totalPages = Math.ceil(contentHeight / pageHeight);

      const isMultiPage = totalPages > 1;

      console.log("Content Height:", contentHeight);
      console.log("Total Pages:", totalPages);

      // =========================
      // FINAL CONTROL (NO CSS RELIANCE)
      // =========================
      if (isMultiPage) {
        blankSpace.style.display = "block";
      } else {
        blankSpace.style.display = "none";
      }

      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }, 400);

    }, 600);
  };
}
const Total = Number(details?.amount || 0);

const TotalVAT = Number(details?.vat_amount || 0);

const grand = Number(details?.total_amount || 0);

const TotalICANN = headers?.reduce((sum, item) => {
  const product = products?.find(
    p =>
      (p.prd_code || "").toUpperCase() ===
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
    : null;

const expiryDate = header?.expiry_date
  ? formatDateLong(header.expiry_date)
  : null;

const periodDisplay =
  startDate && expiryDate
    ? `${startDate} to ${expiryDate}`
    : "-";
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

<div id="print-header">
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

<div className=" items-center w-full mb-3">

  {/* TITLE SECTION */}
  <div className="text-center leading-tight">

    <h2 className="font-bold text-[20px] text-center">
      PAYMENT REQUEST FORM
    </h2>

  </div>

</div>

  {/* COMPANY DETAILS */}
<div className="grid grid-cols-2 border border-gray-400 mb-3">

  {/* LEFT COLUMN */}
  <div className="p-3 leading-4 border-r border-gray-300">

    <h2 className="font-bold text-[12px] uppercase mb-1">
      PAYEE / SUPPLIER
    </h2>

    <h1 className="font-bold text-[13px]">
      {selectedVendor?.vendor_name || header.vendors || "Vendor Name"}
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
    {selectedVendor?.trn
        ? ` | TRN: ${selectedVendor.trn}`
        : ""}
    </p>

  </div>

  {/* RIGHT COLUMN */}
  <div className="p-3 leading-4">

    <h2 className="font-bold text-[12px] uppercase mb-1">
      REQUEST SUMMARY
    </h2>
    <h1 className="font-bold text-[13px]">
      {selectedTerm?.bc_name || header.term} {selectedProductType?.prd_types || header.product_types} Fees
    </h1>
   <p className="text-[12px] text-gray-700">
   {selectedTransactionType?.tt_code === "TT003" ? (
    header.product_types === "S52"
      ? "This payment request is for a new purchase."
      : "This payment request is for a new subscription."
  ) : (
    ""
  )}

  {selectedTransactionType?.tt_code === "TT001" &&
    `This payment request is for the renewal of a subscription.`}

  {selectedTransactionType?.tt_code === "TT004" &&
    `This payment request is related to the cancellation of a subscription service.`}
     {selectedTransactionType?.tt_code === "TT005" &&
    `This payment request is related to the transfer of a service.`}
      {selectedTransactionType?.tt_code === "TT006" &&
    `This payment request is related to the bill payment of a service.`}
    </p>
   {expiryDate && (
  <p className="text-[12px] text-gray-700">
    Subscription expiry on {expiryDate}
  </p>
)}

    <p className="text-[12px] text-gray-700">
      
      Paid by {paid_by} using {(() => {
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

        return card?.card_brand || card?.card_brand || "";
      })()} ending with ****
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
</div>
<div id="print-body">
<table className="w-full border border-black border-collapse mb-3 text-[10px]">

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
        {selectedDepartment?.dep_name || header.department || " - "}
      </td>

      {/* PAYMENT METHOD */}
      <td className="border border-gray-800 px-2 py-1 font-bold">
        PAYMENT METHOD
      </td>

      <td className="border border-gray-800 px-2 py-1 font-semibold">
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

        return card?.card_brand || card?.card_brand || "";
      })()}
      </td>

    </tr>
     <tr className="bg-[#f8fafc]">

      {/* DEPARTMENT */}
    
       <td className="border border-gray-800 px-2 py-1 font-bold">
        COST CENTER
      </td>

      <td className="border border-gray-800 px-2 py-1 font-semibold">
        {selectedCostCenter?.dv_name || header.cost_center || " - "}
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
  {(() => {
    const rowHeight = "min-h-[38px]";

    return (
      <>
        <tr className="text-center align-top h-[250px] bg-[#f8fafc] border border-black-800">

          {/* S/N */}
          <td className="border border-gray-800 p-2 align-top ">
            {headers?.map((_, i) => (
              <div
                key={i}
                className={`${rowHeight} flex  justify-center items-start w-full py-1`}
              >
                {i + 1}.
              </div>
            ))}
          </td>

          {/* DATE */}
          <td className="border border-gray-800 p-2 align-top">
            {headers?.map((item, i) => (
              <div
                key={i}
                className={`${rowHeight} flex  justify-center items-start w-full py-1`}
              >
                {item?.date ? formatDate(item.date) : ""}
              </div>
            ))}
          </td>

          {/* INVOICE NUMBER */}
          <td className="border border-gray-800 p-2 align-top ">
            {headers?.map((item, i) => (
              <div
                key={i}
                className={`${rowHeight} flex  justify-center items-start w-full py-1`}
              >
                {item?.invoice_number || "-"}
              </div>
            ))}
          </td>

          {/* PRODUCT DESCRIPTION */}
         <td className="border border-gray-800 p-2 align-top text-left">
  {headers?.map((item, i) => {
    const product = products?.find(
      p =>
        (p.prd_code || "").toUpperCase() ===
        (item?.products || "").toUpperCase()
    );

    return (
      <div key={i} className={`${rowHeight} flex flex-col py-1`}>
        <div>
          {getProductName(item?.products)}
          {item?.plan_provider &&
            ` - ${getPlanName(item.plan_provider)}`}
          {item?.product_types &&
            ` - ${getServiceName(item.product_types)}`}
        </div>
      </div>
    );
  })}

  {/* ✅ ONLY SHOW WHEN ROWS < 6 */}
  {(!headers || headers.length < 6) && (
    <div className="mt-1 text-center text-[8px] text-gray-500">
      *** SPACE INTENTIONALLY LEFT BLANK ***
    </div>
  )}
</td>

          {/* AMOUNT */}
          <td className="border border-gray-800 p-2 align-top text-right">
            {headers?.map((item, i) => (
              <div
                key={i}
                className={`${rowHeight} flex justify-end items-start py-1`}
              >
                {formatDecimal(item?.amount ?? 0)}
              </div>
            ))}
          </td>

          {/* VAT */}
          <td className="border border-gray-800 p-2 align-top text-right">
            {headers?.map((item, i) => (
              <div
                key={i}
                className={`${rowHeight} flex justify-end items-start py-1`}
              >
                {formatDecimal(item?.vat_amount ?? 0)}
              </div>
            ))}
          </td>

          {/* TOTAL */}
          <td className="border border-gray-800 p-2 align-top text-right">
            {headers?.map((item, i) => {
              const product = products?.find(
                p =>
                  (p.prd_code || "").toUpperCase() ===
                  (item?.products || "").toUpperCase()
              );

              const mainAmount = Number(
                item?.total_amount ?? 0
              );

              const icannFee = product?.is_icann
                ? Number(product?.icann_fee ?? 0)
                : 0;

              return (
                <div
                  key={i}
                  className={`${rowHeight} flex flex-col items-end py-1`}
                >
                  <div>
                    {formatDecimal(mainAmount)}
                  </div>

                  {icannFee > 0 && (
                    <div className="text-[10px] mt-1">
                      {formatDecimal(icannFee)}
                    </div>
                  )}
                </div>
              );
            })}
          </td>

        </tr>

        {/* TOTAL */}
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
            {numberToWords(
              grandTotal,
              selectedCurrency?.currency
            )}{" "}
            ONLY
          </td>
        </tr>
      </>
    );
  })()}
</tbody>

</table>

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
<div className="print-end-section">
<div className="approval-footer">
<table className="w-full mt-15 table-fixed border border-gray-800 border-collapse text-center text-[10px]">

  {/* HEADER */}
  <thead>

    {/* TITLE */}
    <tr className="bg-gray-200 text-black">

      <th
        colSpan={isAdvertisingEnabled ? 6 : 5}
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
    {isAdvertisingEnabled && (
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
      {isAdvertisingEnabled && (
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
</div>

  </div>
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
  if (disablePrint) return;
  handlePrint();
  handleExportPrf(details?.prf_num);
}}
            disabled={disablePrint}
            className="
              px-5 py-2
              bg-blue-600
              text-white
              rounded
              hover:bg-blue-700
              disabled:bg-gray-400
              disabled:cursor-not-allowed
            "
          >
            Print
          </button>

        </div>
      
</div>
      </div>

    </div>


  );

}