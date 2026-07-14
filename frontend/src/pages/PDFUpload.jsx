import { useState, useEffect } from "react";

import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Upload, Loader } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import { getMasterData } from "../api/api";
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

const API_URL = import.meta.env.VITE_API_URL;
  const invoiceColumns = [
  { key: "product", label: "Product", type: "text" },
  { key: "invoiceNumber", label: "Invoice Number", type: "text" },
  { key: "invoiceDate", label: "Invoice Date", type: "date" },
  { key: "vendorName", label: "Vendors", type: "dropdown", source: "vendors" },
  { key: "billingCompany", label: "Billing Company", type: "dropdown", source: "companies" },
  { key: "currency", label: "Currency", type: "dropdown", source: "currencies" },
  { key: "amount", label: "Amount", type: "number" },
  { key: "totalAmount", label: "Total Amount", type: "number" },
  { key: "vatAmount", label: "VAT Amount", type: "number" },
  { key: "totalAmountAED", label: "Total Amount (AED)", type: "number" },
  { key: "itRequestNum", label: "IT Request Num", type: "text" },
  { key: "requestedBy", label: "Requested By", type: "text" },
  { key: "qty", label: "Qty", type: "number" },
  { key: "lpoNo", label: "LPO No", type: "text" },
  { key: "lpoDate", label: "LPO Date", type: "date" },
  { key: "expiryDate", label: "Expiry Date", type: "date" },
  { key: "deliveryDate", label: "Delivery Date", type: "date" },
  { key: "remarks", label: "Remarks", type: "text" },
  { key: "productType", label: "Product Type", type: "text" },
  { key: "plan", label: "Plan", type: "text" },
  { key: "department", label: "Department", type: "text" },
  { key: "term", label: "Term", type: "text" },
  { key: "creditCard", label: "Credit Card", type: "text" },
  { key: "costCenter", label: "Cost Center", type: "text" },
  { key: "transactionType", label: "Transaction Type", type: "dropdown", source: "transactionTypes" },
  { key: "projects", label: "Projects", type: "text" },
  { key: "createdBy", label: "Created By", type: "text" },
];

export default function PDFUpload() {
  const navigate = useNavigate();
  const { moduleId } = useParams();


const [files, setFiles] = useState([]);
const [extractedData, setExtractedData] = useState(null); // for single invoice
const [extractedInvoices, setExtractedInvoices] = useState([]); // for multiple invoices
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [pdfText, setPdfText] = useState("");
  const [invoiceRows, setInvoiceRows] = useState([]);
const [vendors, setVendors] = useState([]);
const [currencies, setCurrencies] = useState([]);
const [transactionTypes, setTransactionTypes] = useState([]);
const [companies, setCompanies] = useState([]);
useEffect(() => {
  loadDropdownData();
}, []);
useEffect(() => {
  if (!invoiceRows.length) return;

  const vendorOptions = getDropdownOptions({ source: "vendors" });
  const currencyOptions = getDropdownOptions({ source: "currencies" });
  const companyOptions = getDropdownOptions({ source: "companies" });

  if (!vendorOptions.length && !currencyOptions.length && !companyOptions.length) return;

  setInvoiceRows((prevRows) =>
    prevRows.map((row) => {
      const matchedVendor = findMatchingOption(row.vendorName, vendorOptions);
      const matchedCurrency = findMatchingOption(row.currency, currencyOptions);
      const matchedCompany = findMatchingOption(row.billingCompany, companyOptions);

      return {
        ...row,
        vendorName: matchedVendor || "",
        currency: matchedCurrency || "",
        billingCompany: matchedCompany || "",
      };
    })
  );
}, [vendors, currencies, companies, invoiceRows.length]);

 const handleFileSelect = (e) => {
  const selectedFiles = Array.from(e.target.files || []);

  if (!selectedFiles.length) return;

  const pdfFiles = selectedFiles.filter(
    (selectedFile) => selectedFile.type === "application/pdf"
  );

  if (!pdfFiles.length) {
    setMessage({ type: "error", text: "Please select valid PDF files only" });
    setFiles([]);
    return;
  }

  if (pdfFiles.length !== selectedFiles.length) {
    setMessage({
      type: "error",
      text: "Some files were skipped because they are not PDF files."
    });
  } else {
    setMessage({ type: "", text: "" });
  }

  setFiles(pdfFiles);
  setExtractedData(null);
  setExtractedInvoices([]);
  setInvoiceRows([]);
  setPdfText("");
};

  const extractTextFromPDF = async (pdfFile) => {
    const arrayBuffer = await pdfFile.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
      useSystemFonts: true,
      disableFontFace: false
    }).promise;

    let fullText = "";
    const maxPages = Math.min(pdf.numPages, 10);

    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      const items = textContent.items
        .filter(item => typeof item.str === "string" && item.str.trim())
        .map(item => ({
          str: item.str,
          x: item.transform?.[4] || 0,
          y: Math.round(item.transform?.[5] || 0)
        }));

      items.sort((a, b) => {
        if (Math.abs(b.y - a.y) > 2) return b.y - a.y;
        return a.x - b.x;
      });

      const lines = [];
      let currentY = null;
      let currentLine = [];

      for (const item of items) {
        if (currentY === null) {
          currentY = item.y;
        }

        if (Math.abs(item.y - currentY) > 2) {
          if (currentLine.length > 0) {
            lines.push(currentLine.join(" ").trim());
          }

          currentLine = [];
          currentY = item.y;
        }

        currentLine.push(item.str);
      }

      if (currentLine.length > 0) {
        lines.push(currentLine.join(" ").trim());
      }

      fullText += lines.filter(Boolean).join("\n") + "\n";
    }

    if (!fullText.trim()) {
      throw new Error("No text content found in PDF. The PDF might be image-only.");
    }

    return fullText;
  };

const convertPdfToImages = async (pdfFile) => {
  const arrayBuffer = await pdfFile.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
    useSystemFonts: true,
    disableFontFace: false
  }).promise;

  const imagePages = [];
  const maxPages = Math.min(pdf.numPages, 2);

  for (let pageNo = 1; pageNo <= maxPages; pageNo++) {
    setMessage({
      type: "info",
      text: `Converting scanned PDF page ${pageNo} of ${maxPages}...`
    });

    const page = await pdf.getPage(pageNo);

    const viewport = page.getViewport({ scale: 1.2 });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: context,
      viewport
    }).promise;

    const dataUrl = canvas.toDataURL("image/jpeg", 0.65);

    imagePages.push({
      pageNo,
      mimeType: "image/jpeg",
      data: dataUrl.split(",")[1]
    });
  }

  return imagePages;
};
 const postToBackend = async (body) => {
  const response = await fetch(`${API_URL}/pdf/extract`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body)
  });

  const responseText = await response.text();

  let result;
  try {
    result = JSON.parse(responseText);
  } catch (err) {
    console.error("Backend returned non-JSON response:");
    console.error(responseText);

    throw new Error(
      "Backend did not return JSON. Check API URL, route, authentication, or backend error."
    );
  }



  if (!response.ok || !result.success) {
    throw new Error(result.error || "Failed to extract PDF data");
  }

  return result.data || {};
};

  const extractDataWithGeminiText = async (text) => {
    return postToBackend({
      pdfText: text
    });
  };

  const extractDataWithGeminiImages = async (imagePages) => {
    return postToBackend({
      imagePages
    });
  };

  const hasUsefulData = (data) => {
    if (!data) return false;

    return Boolean(
      data.productName ||
      data.billingAddress ||
      data.cost ||
      data.totalAmount ||
      (Array.isArray(data.products) && data.products.length > 0)
    );
  };
const sortInvoicesByNumber = (invoices) => {
  return [...invoices].sort((a, b) => {
    const invA = String(a.invoiceNumber || "").trim();
    const invB = String(b.invoiceNumber || "").trim();

    return invA.localeCompare(invB, undefined, {
      numeric: true,
      sensitivity: "base"
    });
  });
};

const processSinglePdfFile = async (pdfFile, index, totalFiles) => {
  let data = null;

  try {
    setMessage({
      type: "info",
      text: `Checking PDF text ${index + 1} of ${totalFiles}: ${pdfFile.name}`
    });

    const text = await extractTextFromPDF(pdfFile);

    if (index === 0) {
      setPdfText(text);
    }

    if (text && text.trim().length >= 20) {
      setMessage({
        type: "info",
        text: `Processing invoice ${index + 1} of ${totalFiles} with Gemini AI...`
      });

      data = await extractDataWithGeminiText(text);
    }
  } catch (textError) {
    console.warn(
      `Text extraction failed for ${pdfFile.name}. Switching to image OCR:`,
      textError.message
    );
  }

  if (!hasUsefulData(data)) {
    setMessage({
      type: "info",
      text: `Processing scanned invoice ${index + 1} of ${totalFiles}: ${pdfFile.name}`
    });

    const imagePages = await convertPdfToImages(pdfFile);

    const payloadSizeMB =
      JSON.stringify({ imagePages }).length / 1024 / 1024;

    console.log(`Image payload size for ${pdfFile.name}:`, payloadSizeMB.toFixed(2), "MB");

    if (!imagePages.length) {
      throw new Error(`Could not convert ${pdfFile.name} to images.`);
    }

    data = await extractDataWithGeminiImages(imagePages);
  }

  if (!hasUsefulData(data)) {
    throw new Error(`Could not extract useful data from ${pdfFile.name}`);
  }

  return {
    ...data,
    fileName: pdfFile.name
  };
};
  const handleUpload = async () => {
  if (!files.length) {
    setMessage({ type: "error", text: "Please select one or more PDF files first" });
    return;
  }

  setLoading(true);
  setExtractedData(null);
  setExtractedInvoices([]);

  try {
    const results = [];

    for (let i = 0; i < files.length; i++) {
      const invoiceData = await processSinglePdfFile(files[i], i, files.length);
      results.push(invoiceData);
    }

    const sortedResults = sortInvoicesByNumber(results);

    setExtractedInvoices(sortedResults);
const editableRows = buildEditableInvoiceRows(sortedResults);
setInvoiceRows(editableRows);
    if (sortedResults.length === 1) {
      setExtractedData(sortedResults[0]);
    } else {
      setExtractedData(null);
    }

    setMessage({
      type: "success",
      text: `✓ ${sortedResults.length} invoice${sortedResults.length > 1 ? "s" : ""} processed successfully and sorted by invoice number!`
    });

  } catch (error) {
    console.error("Upload error:", error);

    setMessage({
      type: "error",
      text: error.message || "Error processing PDF invoices. Please try again."
    });

    setExtractedData(null);
    setExtractedInvoices([]);
  } finally {
    setLoading(false);
  }
};

  const formatAmount = (value) => {
    if (value === null || value === undefined || value === "") return "Not found";
    return value;
  };

  const displayCost = extractedData?.cost ?? extractedData?.totalAmount;
const getInvoiceProductRows = (invoices) => {
  const rows = [];

  invoices.forEach((invoice) => {
    const products = Array.isArray(invoice.products) ? invoice.products : [];

    if (products.length > 0) {
      products.forEach((product) => {
        rows.push({
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate,
          vendorName: invoice.vendorName,
          currency: invoice.currency,
          fileName: invoice.fileName,
          description: product.description,
          unit: product.unit,
          qty: product.qty,
          unitPrice: product.unitPrice,
          amount: product.amount
        });
      });
    } else {
      rows.push({
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        vendorName: invoice.vendorName,
        currency: invoice.currency,
        fileName: invoice.fileName,
        description: invoice.productName || invoice.productSummary || "-",
        unit: null,
        qty: null,
        unitPrice: null,
        amount: invoice.cost ?? invoice.totalAmount
      });
    }
  });

  return rows;
};
const loadDropdownData = async () => {
  try {
    const activeUser = JSON.parse(localStorage.getItem("user"));
    const activeUserEmail = activeUser?.email || "";

    const [vendorRes, currencyRes, companyRes, transactionRes] =
      await Promise.all([
        getMasterData("vendors", activeUserEmail),
        getMasterData("currency", activeUserEmail),
        getMasterData("company", activeUserEmail),
        getMasterData("transaction_types", activeUserEmail),
      ]);

    const vendorData = Array.isArray(vendorRes?.data) ? vendorRes.data : [];
    const currencyData = Array.isArray(currencyRes?.data) ? currencyRes.data : [];
    const companyData = Array.isArray(companyRes?.data) ? companyRes.data : [];
    const transactionData = Array.isArray(transactionRes?.data)
      ? transactionRes.data
      : [];

    setVendors(vendorData);
    setCurrencies(currencyData);
    setCompanies(companyData);
    setTransactionTypes(transactionData);

    console.log("Vendor Data:", vendorData);
    console.log("Currency Data:", currencyData);
    console.log("Company Data:", companyData);
    console.log("Transaction Type Data:", transactionData);
  } catch (error) {
    console.error("Dropdown loading failed:", error);
  }
};



const formatDateForInput = (dateValue) => {
  if (!dateValue) return "";

  // Already correct format: yyyy-MM-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue;
  }

  const date = new Date(dateValue);

  if (isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const buildEditableInvoiceRows = (invoices) => {
  const rows = [];

  invoices.forEach((invoice) => {
    const products = Array.isArray(invoice.products) ? invoice.products : [];

    if (products.length > 0) {
      products.forEach((product) => {
        const amount = product.amount ?? invoice.cost ?? invoice.totalAmount ?? "";

        rows.push({
          invoiceDate: formatDateForInput(invoice.invoiceDate),
          invoiceNumber: invoice.invoiceNumber || "",
          itRequestNum: "",
          requestedBy: "",
          qty: product.qty ?? "",
          lpoNo: "",
          lpoDate: "",
          expiryDate: formatDateForInput(invoice.expiryDate),
          deliveryDate: formatDateForInput(invoice.deliveryDate),
          amount,
          vatAmount: invoice.vatAmount || "",
          totalAmount: invoice.totalAmount ?? invoice.cost ?? "",
          totalAmountAED: invoice.totalAmountAED || "",
          remarks: "",
          vendorName: invoice.vendorName || "",
          product: product.description || invoice.productName || invoice.productSummary || "",
          productType: invoice.productType || "",
          plan: invoice.plan || "",
          department: invoice.department || "",
          billingCompany: invoice.billingCompany || invoice.billingAddress || "",
          term: invoice.term || "",
          creditCard: invoice.creditCard || "",
          currency: invoice.currency || "",
          costCenter: "",
          transactionType: "",
          projects: invoice.projects || "",
          createdBy: invoice.createdBy || "",
          fileName: invoice.fileName || "",
        });
      });
    } else {
      rows.push({
        invoiceDate: formatDateForInput(invoice.invoiceDate),
        invoiceNumber: invoice.invoiceNumber || "",
        itRequestNum: "",
        requestedBy: "",
        qty: "",
        lpoNo: "",
        lpoDate: "",
        expiryDate: formatDateForInput(invoice.expiryDate),
        deliveryDate: formatDateForInput(invoice.deliveryDate),
        amount: invoice.cost ?? invoice.totalAmount ?? "",
        vatAmount: invoice.vatAmount || "",
        totalAmount: invoice.totalAmount ?? invoice.cost ?? "",
        totalAmountAED: invoice.totalAmountAED || "",
        remarks: "",
        vendorName: invoice.vendorName || "",
        product: invoice.productName || invoice.productSummary || "",
        productType: invoice.productType || "",
        plan: invoice.plan || "",
        department: invoice.department || "",
        billingCompany: invoice.billingCompany || invoice.billingAddress || "",
        term: invoice.term || "",
        creditCard: invoice.creditCard || "",
        currency: invoice.currency || "",
        costCenter: "",
        transactionType: "",
        projects: invoice.projects || "",
        createdBy: invoice.createdBy || "",
        fileName: invoice.fileName || "",
      });
    }
  });

  return rows;
};
const handleInvoiceCellChange = (rowIndex, field, value) => {
  setInvoiceRows((prevRows) => {
    const updatedRows = [...prevRows];

    updatedRows[rowIndex] = {
      ...updatedRows[rowIndex],
      [field]: value,
    };

    return updatedRows;
  });
};




const normalizeText = (value) => {
  return String(value || "")
    .toLowerCase()
    .replace(/ltd\.?/g, "limited")
    .replace(/llc\.?/g, "llc")
    .replace(/[^a-z0-9]/g, "");
};

const getDropdownOptions = (column) => {
  if (column.source === "vendors") {
    return vendors
      .map((vendor) => {
        const id = vendor.id || "";
        const name = vendor.vend_name || "";

        return {
          value: id,
          label: name,
        };
      })
      .filter((option) => option.value);
  }
  
 

if (column.source === "companies") {
  return companies
    .map((company) => {
      const id = company.id || "";
      const name = company.com_name || "";

      return {
        value: String(id),
        label: name,
      };
    })
    .filter((option) => option.value && option.label);
}

  if (column.source === "currencies") {
    return currencies
      .map((currency) => {
        const id = currency.curr_code || "";
        const code = currency.curr_name || "";

        return {
          value: String(id),
          label: code,
        };
      })
      .filter((option) => option.value);
  }

   if (column.source === "transactionTypes") {
    return transactionTypes
      .map((type) => {
        const id =
          type.id ||
         
          "";

        const name =
          type.trntype_name ||
         
          "";

        return {
          value: String(id || name),
          label: name,
        };
      })
      .filter((option) => option.value && option.label);
  }

  return [];
};

const findMatchingOption = (value, options) => {
  if (!value || !options.length) return "";

  const normalizedValue = normalizeText(value);

  const exactMatch = options.find((option) => {
    return (
      normalizeText(option.value) === normalizedValue ||
      normalizeText(option.label) === normalizedValue
    );
  });

  if (exactMatch) return exactMatch.value;

  const partialMatch = options.find((option) => {
    const optionValue = normalizeText(option.value);
    const optionLabel = normalizeText(option.label);

    return (
      optionLabel.includes(normalizedValue) ||
      normalizedValue.includes(optionLabel) ||
      optionValue.includes(normalizedValue) ||
      normalizedValue.includes(optionValue)
    );
  });

  return partialMatch ? partialMatch.value : "";
};

const getCompanyName = (company) => {
  return (
    company.trade_name ||
    company.company_name ||
    company.companyName ||
    company.name ||
    company.value ||
    ""
  );
};

const renderEditableCell = (row, rowIndex, column) => {
  const value = row[column.key] ?? "";

if (column.type === "dropdown") {
  let options = [];

  if (column.source === "vendors") {
    console.log("Vendors available for dropdown:", vendors);
    options = vendors.map((vendor) => ({
      value: vendor.id,
      label: vendor.vend_name,
    }));
  }

  if (column.source === "currencies") {
    console.log("Currencies available for dropdown:", currencies);
    options = currencies.map((currency) => ({
      value: currency.curr_code,
      label: currency.curr_name,
    }));
  }

  if (column.source === "transactionTypes") {
    console.log("Transaction Types available for dropdown:", transactionTypes);
    options = transactionTypes.map((type) => ({
      value: type.id,
      label: type.trntype_name,
    }));
  }
  
  if (column.source === "companies") {
     console.log("Companies available for dropdown:", companies);
    options = companies.map((company) => ({
      value: company.id,
      label: company.com_name,
    }));
  }


  const mappedValue = findMatchingOption(value, options);

  return (
    <select
      value={mappedValue}
      onChange={(e) =>
        handleInvoiceCellChange(rowIndex, column.key, e.target.value)
      }
      className="
        w-full h-full min-h-[42px]
      bg-transparent
      border-0 outline-none
      px-3 py-2
      text-xs text-gray-900
      focus:bg-blue-50
      focus:ring-1 focus:ring-blue-400
      appearance-none
      cursor-pointer
      "
      style={{
          backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")",
      backgroundRepeat: "no-repeat",
      backgroundPosition: "right 10px center",
      backgroundSize: "16px",
      paddingRight: "34px",
      }}
    >
      <option value="">Select</option>

      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

 return (
  <input
    type={column.type || "text"}
    value={value}
    onChange={(e) =>
      handleInvoiceCellChange(rowIndex, column.key, e.target.value)
    }
    className="
      w-full h-full min-h-[42px]
      bg-transparent
      border-0 outline-none
      px-3 py-2
      text-xs text-gray-900
      focus:bg-blue-50
      focus:ring-1 focus:ring-blue-400
    "
  />
);
};

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate(`/workspace/${moduleId}`)}
          className="p-2 hover:bg-gray-200 rounded-lg transition"
        >
          <ArrowLeft size={24} />
        </button>

       <h1 className="text-xl font-semibold text-gray-800">
  Purchase Invoice PDF Upload & Extraction
</h1>
      </div>

     <div className="max-w-[95vw] mx-auto">
        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
  <div className="flex items-center justify-between gap-4">
    <div>
      <h2 className="text-base font-semibold text-gray-800">
        Upload Invoice pdf
      </h2>
      <p className="text-xs text-gray-500 mt-1">
        select one or multiple pdf invoices
      </p>
    </div>

    <div className="flex items-center gap-3">
      <input
        type="file"
        accept=".pdf"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        id="pdf-input"
        disabled={loading}
      />

      <label
        htmlFor="pdf-input"
        className="px-4 py-2 rounded-md bg-gray-100 border border-gray-300 text-sm text-gray-700 cursor-pointer hover:bg-gray-200"
      >
        Upload pdf
      </label>

      <span className="text-sm text-gray-600 min-w-[140px]">
        {files.length
          ? `${files.length} file${files.length > 1 ? "s" : ""} selected`
          : "no file selected"}
      </span>

     <button
  onClick={handleUpload}
  disabled={!files.length || loading}
  className={`px-5 py-2 rounded-md text-sm font-medium transition ${
    files.length && !loading
      ? "bg-[#264d86] text-white hover:bg-[#2c5a9e]"
      : "bg-gray-300 text-gray-500 cursor-not-allowed"
  }`}
>
  {loading ? "processing..." : "Extract"}
</button>
    </div>
  </div>

  {message.text && (
    <div
      className={`mt-3 p-2 rounded-md text-xs flex items-center gap-2 ${
        message.type === "success"
          ? "bg-green-50 text-green-800 border border-green-200"
          : message.type === "error"
          ? "bg-red-50 text-red-800 border border-red-200"
          : "bg-blue-50 text-blue-800 border border-blue-200"
      }`}
    >
      {loading && message.type !== "error" && (
        <Loader size={16} className="animate-spin" />
      )}
      <span>{message.text}</span>
    </div>
  )}
</div>
{invoiceRows.length > 0 && (
  <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-4 mt-4">
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold text-gray-800">
        Extracted Invoice Details
      </h2>

      <span className="text-sm text-gray-500">
        {invoiceRows.length} row{invoiceRows.length > 1 ? "s" : ""}
      </span>
    </div>

    <div className="border border-gray-400 rounded overflow-auto max-h-[650px] bg-white">
      <table className="border-collapse text-xs min-w-[3800px] w-full">
                <thead className="bg-slate-200 sticky top-0 z-30 text-gray-900">
                  <tr>
                  <th className="border border-gray-400 px-3 py-2 min-w-[60px] bg-slate-200">
                    S.No
                  </th>

                    {invoiceColumns.map((column) => {
                      // let stickyClass = "";

                      // if (column.key === "invoiceNumber") {
                      //   stickyClass =
                      //     "sticky left-[60px] z-40 bg-slate-200 min-w-[180px]";
                      // }

                      // if (column.key === "product") {
                      //   stickyClass =
                      //     "sticky left-[60px] z-40 bg-slate-200 min-w-[180px]";
                      // }

                      return (
                        <th
                          key={column.key}
                          className={`border border-gray-400 px-3 py-2 text-left whitespace-nowrap min-w-[160px] font-semibold`}
                        >
                          {column.label}
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody>
                  {invoiceRows.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className={rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50"}
                    >
                      <td className="border border-gray-400 px-3 py-2 text-center">
                        {rowIndex + 1}
                      </td>

                      {invoiceColumns.map((column) => {
                        // let stickyClass = "";

                        // if (column.key === "invoiceNumber") {
                        //   stickyClass =
                        //     "sticky left-[60px] z-20 bg-inherit min-w-[180px] font-medium";
                        // }

                        // if (column.key === "product") {
                        //   stickyClass =
                        //     "sticky left-[240px] z-20 bg-inherit min-w-[300px] font-medium";
                        // }

                        return (
                          <td
                            key={column.key}
                            className={`border border-gray-400 min-w-[160px] p-0`}
                          >
                            {renderEditableCell(row, rowIndex, column)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3 mt-5" style={{ justifyContent: "center", fontSize: "11px" }}>
              <button
                onClick={() => {
                  console.log("Final editable invoice rows:", invoiceRows);
                }}
                className="px-2 py-1 bg-blue-600 text-xs text-white rounded hover:bg-blue-700"
              >
                Confirm
              </button>

              <button
                onClick={() => {
                  setInvoiceRows([]);
                  setExtractedInvoices([]);
                  setExtractedData(null);
                  setFiles([]);
                  setPdfText("");
                  setMessage({ type: "", text: "" });
                }}
                className="px-5 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Discard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}