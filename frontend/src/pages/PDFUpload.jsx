import { useState, useEffect, useRef  } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Upload, Loader, Trash2, ChevronDown, Eye, X  } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import {
  getMasterData,
  getVatPercentage,
  createPaymentTransactions,
} from "../api/api";
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

const API_URL = import.meta.env.VITE_API_URL;
const invoiceColumns = [
  { key: "product", label: "Product", type: "dropdown", source: "products" },
  { key: "invoiceNumber", label: "Invoice Number", type: "text" },
  { key: "invoiceDate", label: "Invoice Date", type: "date" },
  { key: "vendorName", label: "Vendors", type: "dropdown", source: "vendors" },
  { key: "billingCompany", label: "Billing Company", type: "dropdown", source: "companies" },
  { key: "currency", label: "Currency", type: "dropdown", source: "currencies" },
  { key: "amount", label: "Amount", type: "number" },
  { key: "vatAmount", label: "VAT Amount", type: "number" },
  { key: "totalAmount", label: "Total Amount", type: "number" },
  { key: "totalAmountAED", label: "Total Amount (AED)", type: "number" },
  { key: "itRequestNum", label: "IT Request Num", type: "text" },
  { key: "requestedBy", label: "Requested By", type: "text" },
  { key: "qty", label: "Qty", type: "number" },
  { key: "lpoNo", label: "LPO No", type: "text" },
  { key: "lpoDate", label: "LPO Date", type: "date" },
  { key: "expiryDate", label: "Expiry Date", type: "date" },
  { key: "deliveryDate", label: "Delivery Date", type: "date" },
  { key: "remarks", label: "Remarks", type: "text" },
  { key: "productType", label: "Product Type", type: "dropdown", source: "productTypes" },
  { key: "plan", label: "Plan", type: "dropdown", source: "plans" },
  { key: "department", label: "Department", type: "dropdown", source: "departments" },
  { key: "term", label: "Term", type: "dropdown", source: "terms" },
  { key: "creditCard", label: "Credit Card", type: "dropdown", source: "creditCards" },
  { key: "costCenter", label: "Cost Center", type: "dropdown", source: "costCenters" },
  { key: "transactionType", label: "Transaction Type", type: "dropdown", source: "transactionTypes" },
  { key: "projects", label: "Projects", type: "dropdown", source: "projects" },
  { key: "createdBy", label: "Created By", type: "text" },
];

export default function PDFUpload() {
  const navigate = useNavigate();
  const { moduleId } = useParams();

const [pdfPreviewUrls, setPdfPreviewUrls] = useState({});
const [previewPdfUrl, setPreviewPdfUrl] = useState("");
const [files, setFiles] = useState([]);
const [extractedData, setExtractedData] = useState(null); // for single invoice
const [extractedInvoices, setExtractedInvoices] = useState([]); // for multiple invoices
const [loading, setLoading] = useState(false);
const [message, setMessage] = useState({ type: "", text: "" });
const [dropdownPosition, setDropdownPosition] = useState({
  top: 0,
  left: 0,
  width: 260,
});
const [pdfText, setPdfText] = useState("");
const [invoiceRows, setInvoiceRows] = useState([]);
const [vendors, setVendors] = useState([]);
const [currencies, setCurrencies] = useState([]);
const [transactionTypes, setTransactionTypes] = useState([]);
const [companies, setCompanies] = useState([]);
const [products, setProducts] = useState([]);
const [product_types, setProductTypes] = useState([]);
const fileInputRef = useRef(null);
const [plans, setPlans] = useState([]);
const [departments, setDepartments] = useState([]);
const [terms, setTerms] = useState([]);
const [creditCards, setCreditCards] = useState([]);
const [projects, setProjects] = useState([]);
const [vatPercent, setVatPercent] = useState(0);
const [costCenters, setCostCenters] = useState([]);
const [openDropdown, setOpenDropdown] = useState(null);
const [dropdownSearch, setDropdownSearch] = useState("");
const [validationErrors, setValidationErrors] = useState({});
useEffect(() => {
  loadDropdownData();
}, []);

const rightAlignedColumns = [
  "amount",
  "vatAmount",
  "totalAmount",
  "totalAmountAED",
];

useEffect(() => {
  if (!invoiceRows.length) return;
  
  const productOptions = getDropdownOptions({ source: "products" });
  const vendorOptions = getDropdownOptions({ source: "vendors" });
  const currencyOptions = getDropdownOptions({ source: "currencies" });
  const companyOptions = getDropdownOptions({ source: "companies" });
  const transactionOptions = getDropdownOptions({ source: "transactionTypes" });

  if (
    !productOptions.length &&
    !vendorOptions.length &&
    !currencyOptions.length &&
    !companyOptions.length &&
    !transactionOptions.length
  ) {
    return;
  }

  setInvoiceRows((prevRows) =>
    prevRows.map((row) => {
      // console.log("billing company from rows:", prevRows.map(row => row.billingCompany));
      // console.log("billing company from companies:", companyOptions);
      const matchedProduct = findMatchingOption(row.product, productOptions);
      const matchedVendor = findMatchingOption(row.vendorName, vendorOptions);
      const matchedCurrency = findMatchingOption(row.currency, currencyOptions);
      const matchedCompany = findMatchingOption(row.billingCompany, companyOptions);
      const matchedTransactionType = findMatchingOption(row.transactionType, transactionOptions);

      let nextRow = {
        ...row,
        product: matchedProduct || row.product,
        vendorName: matchedVendor || row.vendorName,
        currency: matchedCurrency || row.currency,
        billingCompany: matchedCompany || "",
        transactionType: matchedTransactionType || row.transactionType,
      };

          if (matchedProduct) {
        const selectedProduct = products.find((product) => {
          const id = product.prd_code || "";
          return String(id) === String(matchedProduct);
        });

        nextRow = {
          ...nextRow,
          vendorName: selectedProduct?.vend_code || nextRow.vendorName,
          productType: selectedProduct?.prdtype_code || nextRow.productType,
          vatApplicable: isVatApplicable(selectedProduct),
        };
      }

      const calculated = calculateInvoiceAmounts(nextRow);

      nextRow = {
        ...nextRow,
        vatAmount: calculated.vatAmount,
        totalAmount: calculated.totalAmount,
        totalAmountAED: calculated.totalAmountAED,
      };

      return nextRow;

    
    })
  );
}, [
  products,
  vendors,
  currencies,
  companies,
  transactionTypes,
  invoiceRows.length,
  vatPercent,
]);

useEffect(() => {
  const handleClickOutside = (event) => {
    if (!event.target.closest(".relative")) {
      setOpenDropdown(null);
      setDropdownSearch("");
    }
  };

  document.addEventListener("mousedown", handleClickOutside);

  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
  };
}, []);

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
  const previewMap = {};

pdfFiles.forEach((pdfFile) => {
  previewMap[pdfFile.name] = URL.createObjectURL(pdfFile);
});

setPdfPreviewUrls(previewMap);
  setExtractedData(null);
  setExtractedInvoices([]);
  setInvoiceRows([]);
  setPdfText("");
  setPreviewPdfUrl("");
  setMessage({ type: "", text: "" });
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
    //console.log("Sorted invoice results:", sortedResults);
    setExtractedInvoices(sortedResults);
const editableRows = buildEditableInvoiceRows(sortedResults);
console.log("Extracted invoice raw data:", sortedResults);
console.log("Editable invoice rows after date format:", editableRows);
//console.log("Editable invoice rows:", editableRows);
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

    const [
      productRes,
      vendorRes,
      currencyRes,
      companyRes,
      transactionRes,
      planRes,
      departmentRes,
      termRes,
      creditCardRes,
      projectRes,
      productTypeRes,
      costCenterRes,
      vatRes,
      
      
    ] = await Promise.all([
      getMasterData("products", activeUserEmail),
      getMasterData("vendors", activeUserEmail),
      getMasterData("currency", activeUserEmail),
      getMasterData("company", activeUserEmail),
      getMasterData("transaction_types", activeUserEmail),
      getMasterData("plans", activeUserEmail),
      getMasterData("department", activeUserEmail),
      getMasterData("billing_cycle", activeUserEmail),
      getMasterData("credit_card", activeUserEmail),
      getMasterData("projects", activeUserEmail),
      getMasterData("product_types", activeUserEmail),
      getMasterData("division", activeUserEmail),
      getVatPercentage(),
    ]);
    setProducts(Array.isArray(productRes?.data) ? productRes.data : []);
    setVendors(Array.isArray(vendorRes?.data) ? vendorRes.data : []);
    setCurrencies(Array.isArray(currencyRes?.data) ? currencyRes.data : []);
    setCompanies(Array.isArray(companyRes?.data) ? companyRes.data : []);
    setTransactionTypes(Array.isArray(transactionRes?.data) ? transactionRes.data : []);
    setPlans(Array.isArray(planRes?.data) ? planRes.data : []);
    setDepartments(Array.isArray(departmentRes?.data) ? departmentRes.data : []);
    setTerms(Array.isArray(termRes?.data) ? termRes.data : []);
    setCreditCards(Array.isArray(creditCardRes?.data) ? creditCardRes.data : []);
    setProjects(Array.isArray(projectRes?.data) ? projectRes.data : []);
    setProductTypes(Array.isArray(productTypeRes?.data) ? productTypeRes.data : []);
    setCostCenters(Array.isArray(costCenterRes?.data) ? costCenterRes.data : []);
    setVatPercent(Number(vatRes?.data?.vatPercentage || 0));

    
  } catch (error) {
    console.error("Dropdown loading failed:", error);
  }
};



const formatDateForInput = (dateValue) => {
  if (!dateValue) return "";

  let value = String(dateValue).trim();

  // Remove time part
  value = value.split("T")[0].trim();

  // Remove ordinal suffix: 1st, 2nd, 3rd, 14th
  value = value.replace(/(\d{1,2})(st|nd|rd|th)/gi, "$1");

  const monthMap = {
    jan: "01",
    january: "01",
    feb: "02",
    february: "02",
    mar: "03",
    march: "03",
    apr: "04",
    april: "04",
    may: "05",
    jun: "06",
    june: "06",
    jul: "07",
    july: "07",
    aug: "08",
    august: "08",
    sep: "09",
    sept: "09",
    september: "09",
    oct: "10",
    october: "10",
    nov: "11",
    november: "11",
    dec: "12",
    december: "12",
  };

  // yyyy-MM-dd or yyyy/MM/dd
  // Example: 2026-07-14
  const yyyyMmDd = value.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (yyyyMmDd) {
    const [, year, monthRaw, dayRaw] = yyyyMmDd;

    const month = String(monthRaw).padStart(2, "0");
    const day = String(dayRaw).padStart(2, "0");

    if (
      Number(month) >= 1 &&
      Number(month) <= 12 &&
      Number(day) >= 1 &&
      Number(day) <= 31
    ) {
      return `${year}-${month}-${day}`;
    }

    return "";
  }

  // dd/MM/yyyy or dd-MM-yyyy
  // Example: 14/07/2026 or 14-07-2026
 const slashDashDate = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);

if (slashDashDate) {
  const [, firstRaw, secondRaw, year] = slashDashDate;

  const first = Number(firstRaw);
  const second = Number(secondRaw);

  let day;
  let month;

  if (first > 12 && second <= 12) {
    // dd/MM/yyyy
    day = first;
    month = second;
  } else if (second > 12 && first <= 12) {
    // MM/DD/yyyy
    month = first;
    day = second;
  } else {
    // Ambiguous date like 07/08/2026
    // Default to dd/MM/yyyy for UAE/common invoice format
    day = first;
    month = second;
  }

  if (
    day >= 1 &&
    day <= 31 &&
    month >= 1 &&
    month <= 12
  ) {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return "";
}

  // Normalize month-name date separators
  // 14-Jul-2026, 14.Jul.2026, 14 Jul 2026 => 14 Jul 2026
  const normalizedMonthDate = value
    .replace(/[.\-\/,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // dd MMM yyyy
  // Example: 14 Jul 2026
  const ddMmmYyyy = normalizedMonthDate.match(
    /^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/
  );

  if (ddMmmYyyy) {
    const [, dayRaw, monthNameRaw, year] = ddMmmYyyy;

    const day = String(dayRaw).padStart(2, "0");
    const month = monthMap[monthNameRaw.toLowerCase()];

    if (!month) return "";

    return `${year}-${month}-${day}`;
  }

  // MMM dd yyyy
  // Example: Jul 14 2026
  const mmmDdYyyy = normalizedMonthDate.match(
    /^([A-Za-z]{3,})\s+(\d{1,2})\s+(\d{4})$/
  );

  if (mmmDdYyyy) {
    const [, monthNameRaw, dayRaw, year] = mmmDdYyyy;

    const month = monthMap[monthNameRaw.toLowerCase()];
    const day = String(dayRaw).padStart(2, "0");

    if (!month) return "";

    return `${year}-${month}-${day}`;
  }

  return "";
};
const buildEditableInvoiceRows = (invoices) => {
  const rows = [];

  invoices.forEach((invoice) => {

    const invoiceDateValue =
  invoice.invoiceDate ||
  invoice.invoice_date ||
  invoice.date ||
  invoice.invoice_date_value ||
  "";

const expiryDateValue =
  invoice.expiryDate ||
  invoice.expiry_date ||
  "";

const deliveryDateValue =
  invoice.deliveryDate ||
  invoice.delivery_date ||
  "";
    const products = Array.isArray(invoice.products) ? invoice.products : [];

    if (products.length > 0) {
      products.forEach((product) => {
        const amount = product.amount ?? "";

        rows.push({
          invoiceDate: formatDateForInput(invoiceDateValue),
          invoiceNumber: invoice.invoiceNumber || "",
          itRequestNum: "",
          requestedBy: "",
          qty: product.qty ?? "",
          lpoNo: "",
          lpoDate: "",
          expiryDate: formatDateForInput(expiryDateValue),
          deliveryDate: formatDateForInput(deliveryDateValue),
          amount,
           vatAmount: "",
          totalAmount: "",
          totalAmountAED: "",
          remarks: "",
          vendorName: invoice.vendorName || "",
          product: product.description || invoice.productName || invoice.productSummary || "",
          productType: invoice.productType || "",
          plan: invoice.plan || "",
          department: invoice.department || "",
          billingCompany: invoice.billingCompany || "",
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
  invoiceDate: formatDateForInput(invoiceDateValue),
  invoiceNumber: invoice.invoiceNumber || "",
  itRequestNum: "",
  requestedBy: "",
  qty: "",
  lpoNo: "",
  lpoDate: "",
  expiryDate: formatDateForInput(expiryDateValue),
  deliveryDate: formatDateForInput(deliveryDateValue),
  amount: invoice.cost ?? "",
  vatAmount: "",
  totalAmount: "",
  totalAmountAED: "",
  remarks: "",
  vendorName: invoice.vendorName || "",
  product: invoice.productName || invoice.productSummary || "",
  productType: invoice.productType || "",
  plan: invoice.plan || "",
  department: invoice.department || "",
  billingCompany: invoice.billingCompany || "",
  term: invoice.term || "",
  creditCard: invoice.creditCard || "",
  currency: invoice.currency || "",
  costCenter: "",
  transactionType: "",
  projects: invoice.projects || "",
  createdBy: invoice.createdBy || "",
  fileName: invoice.fileName || "",
  vatApplicable: false,
});
    }
  });

  return rows;
};

const handleCheckboxChange = (rowIndex, field, checked) => {
  setInvoiceRows((prevRows) =>
    prevRows.map((row, index) =>
      index === rowIndex
        ? { ...row, [field]: checked }
        : row
    )
  );
};

const handleInvoiceCellChange = (rowIndex, field, value) => {
  // Clear validation error for this field
  setValidationErrors((prev) => {
    const next = { ...prev };

    if (next[rowIndex]) {
      delete next[rowIndex][field];

      if (Object.keys(next[rowIndex]).length === 0) {
        delete next[rowIndex];
      }
    }

    return next;
  });

  if (field === "product") {
    handleProductChange(rowIndex, value);
    return;
  }

  setInvoiceRows((prevRows) => {
    const updatedRows = [...prevRows];

    let nextRow = {
      ...updatedRows[rowIndex],
      [field]: value,
    };

    if (field === "amount" || field === "currency") {
      const calculated = calculateInvoiceAmounts(nextRow);

      nextRow = {
        ...nextRow,
        vatAmount: calculated.vatAmount,
        totalAmount: calculated.totalAmount,
        totalAmountAED: calculated.totalAmountAED,
      };
    }

    updatedRows[rowIndex] = nextRow;

    return updatedRows;
  });
};

const validateRows = () => {
  const errors = {};

  invoiceRows.forEach((row, rowIndex) => {
    const rowErrors = {};

    // Product
    if (!row.product || !isValidProduct(row.product))
      rowErrors.product = true;

    // Required only
    if (!row.invoiceDate)
      rowErrors.invoiceDate = true;

    // Vendor
    if (!row.vendorName || !isValidVendor(row.vendorName))
      rowErrors.vendorName = true;

    // Company
    if (!row.billingCompany || !isValidCompany(row.billingCompany))
      rowErrors.billingCompany = true;

    // Currency
    if (!row.currency)
      rowErrors.currency = true;

    // Amount
    if (!row.amount || Number(row.amount) <= 0)
      rowErrors.amount = true;

    // Transaction Type
    if ( !row.transactionType )
      rowErrors.transactionType = true;

    if (Object.keys(rowErrors).length) {
      // console.log("Row", rowIndex, row);
      // console.log("Errors", rowErrors);

      errors[rowIndex] = rowErrors;
    }
  });

  console.log("Validation Errors:", errors);

  setValidationErrors(errors);

  return Object.keys(errors).length === 0;
};


const normalizeText = (value) => {
  return String(value || "")
    .toLowerCase()
    .replace(/ltd\.?/g, "limited")
    .replace(/llc\.?/g, "llc")
    .replace(/[^a-z0-9]/g, "");
};

const getDropdownOptions = (column) => {
  if (column.source === "products") {

    return products
      .map((product) => {
        const id =
          product.prd_code ||"";

        const name =
          product.prd_name ||
       
          "";

        return {
          value: id,
          label: name,
        };
      })
      .filter((option) => option.value && option.label);
  }

  if (column.source === "vendors") {
    return vendors
      .map((vendor) => {
        const id = vendor.vend_code || "";

        const name =vendor.vend_name || "";

        return {
          value: String(id),
          label: name,
        };
      })
      .filter((option) => option.value && option.label);
  }

  if (column.source === "companies") {
    return companies
      .map((company) => {
        const id =  company.com_code ||"";

        const name =  company.com_name || "";

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
        const code =
          currency.curr_code || "";

        const name =
          currency.curr_name || "";

        return {
          value: String(code),
          label: name,
        };
      })
      .filter((option) => option.value);
  }

  if (column.source === "productTypes") {
    
    return product_types
      .map((productType) => {
        const code = productType.prdtype_code || "";

        const name =
          productType.prdtype_name || "";

        return {
          value: String(code),
          label: name,
        };
      })
      .filter((option, index, self) =>
        option.value &&
        index === self.findIndex((x) => x.value === option.value)
      );
  }

  if (column.source === "transactionTypes") {
    return transactionTypes
      .map((type) => {
        const id =
          type.trntype_code || "";

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

  if (column.source === "plans") {
    return plans
      .map((plan) => {
        const id = plan.plan_code  || "";
        const name = plan.plan_name || "";

        return {
          value: String(id || name),
          label: name,
        };
      })
      .filter((option) => option.value && option.label);
  }

  if (column.source === "departments") {
    return departments
      .map((dept) => {
        const id = dept.dep_code || "";
        const name = dept.dep_name || "";

        return {
          value: String(id || name),
          label: name,
        };
      })
      .filter((option) => option.value && option.label);
  }

  if (column.source === "terms") {
    return terms
      .map((term) => {
        const id = term.billcycle_code || "";
        const name = term.billcycle_name || "";

        return {
          value: String(id || name),
          label: name,
        };
      })
      .filter((option) => option.value && option.label);
  }

  if (column.source === "creditCards") {
    return creditCards
      .map((card) => {
        const id = card.crcd_code || "";
        const name =
          card.crcd_last4num || "";

        return {
          value: String(id || name),
          label: name,
        };
      })
      .filter((option) => option.value && option.label);
  }

  if (column.source === "projects") {
    return projects
      .map((project) => {
        const id = project.prj_code || "";
        const name = project.prj_name || "";

        return {
          value: String(id || name),
          label: name,
        };
      })
      .filter((option) => option.value && option.label);
  }

  if (column.source === "costCenters") {
  return costCenters
    .map((division) => {
      const id =
        division.dv_code || "";

      const name =
        division.dv_name || "";

      return {
        value: String(id),
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

const isVatApplicable = (product) => {
  const value =
    product?.prd_is_vat ??0;

  return value === true || value === 1 || value === "1" || String(value).toLowerCase() === "yes";
};

const getCurrencyRate = (currencyCode) => {
  const currency = currencies.find((c) => {
    const code =
      c.curr_code ||
      c.currency_code ||
      c.currencyCode ||
      c.code ||
      "";

    return String(code).toUpperCase() === String(currencyCode).toUpperCase();
  });

  return Number(
    currency?.curr_exchange_rate ||0
  );
};

const calculateInvoiceAmounts = (row) => {
  const amount = Number(row.amount || 0);
  const currencyCode = row.currency || "AED";

  const vatAmount = row.vatApplicable
    ? Number(((amount * Number(vatPercent || 0)) / 100).toFixed(2))
    : 0;

  const totalAmount = Number((amount + vatAmount).toFixed(2));
  console.log("Calculating amounts for row:", "vatPercent:", vatPercent, "vatAmount:", vatAmount, "totalAmount:", totalAmount);
  let totalAmountAED = totalAmount;

  if (String(currencyCode).toUpperCase() !== "AED") {
    const rate = getCurrencyRate(currencyCode);

    // Your currency table shows USD = 0.2723, meaning 1 AED = 0.2723 USD.
    // So USD to AED = USD / 0.2723
    totalAmountAED = rate ? Number((totalAmount / rate).toFixed(2)) : totalAmount;
  }
  console.log("totalAmountAED:", totalAmountAED, "currencyCode:", currencyCode, "rate:", getCurrencyRate(currencyCode));
  return {
    vatAmount,
    totalAmount,
    totalAmountAED,
  };
};

const handleProductChange = (rowIndex, productId) => {
  const selectedProduct = products.find((product) => {
    const id =
      product.prd_code || "";

    return String(id) === String(productId);
  });

  setInvoiceRows((prevRows) => {
    const updatedRows = [...prevRows];
    const currentRow = updatedRows[rowIndex];

    const vendorId =
      selectedProduct?.vend_code ||"";

    const productTypeCode =
      selectedProduct?.prdtype_code ||"";

    const nextRow = {
      ...currentRow,
      product: String(productId),
      vendorName: String(vendorId),
      productType: String(productTypeCode),
      vatApplicable: isVatApplicable(selectedProduct),
    };

    const calculated = calculateInvoiceAmounts(nextRow);

    updatedRows[rowIndex] = {
      ...nextRow,
      vatAmount: calculated.vatAmount,
      totalAmount: calculated.totalAmount,
      totalAmountAED: calculated.totalAmountAED,
    };

    return updatedRows;
  });
};
const createBlankInvoiceRow = () => ({
  invoiceDate: "",
  invoiceNumber: "",
  itRequestNum: "",
  requestedBy: "",
  qty: "",
  lpoNo: "",
  lpoDate: "",
  expiryDate: "",
  deliveryDate: "",
  amount: "",
  vatAmount: "",
  totalAmount: "",
  totalAmountAED: "",
  remarks: "",
  vendorName: "",
  product: "",
  productType: "",
  plan: "",
  department: "",
  billingCompany: "",
  term: "",
  creditCard: "",
  currency: "AED",
  costCenter: "",
  transactionType: "",
  projects: "",
  createdBy: "",
  fileName: "",
  vatApplicable: false,
});

const handleAddSingleRecord = () => {

  setValidationErrors({});

  setInvoiceRows((prevRows) => [
    ...prevRows,
    createBlankInvoiceRow(),
  ]);

};

const handleDeleteRow = (rowIndex) => {

  setInvoiceRows((prevRows) =>
    prevRows.filter((_, index) => index !== rowIndex)
  );


  setValidationErrors((prev) => {

    const next = {};

    Object.keys(prev).forEach((key) => {

      const index = Number(key);

      if (index < rowIndex) {
        next[index] = prev[key];
      }

      if (index > rowIndex) {
        next[index - 1] = prev[key];
      }

    });

    return next;

  });

};

const getFilteredOptions = (options) => {
  const searchText = dropdownSearch.toLowerCase().trim();

  if (!searchText) return options;

  return options.filter((option) =>
    String(option.label || "")
      .toLowerCase()
      .includes(searchText)
  );
};
const renderEditableCell = (row, rowIndex, column) => {
  const value = row[column.key] ?? "";
  const hasError = validationErrors[rowIndex]?.[column.key];

  if (column.type === "dropdown") {
    const options = getDropdownOptions(column);
    const mappedValue = findMatchingOption(value, options);

    const selectedOption =
      options.find((option) => String(option.value) === String(mappedValue)) ||
      null;

    const dropdownKey = `${rowIndex}-${column.key}`;
    const isOpen = openDropdown === dropdownKey;
    const filteredOptions = getFilteredOptions(options);
    const isRightAligned = rightAlignedColumns.includes(column.key);

    return (
      <div className="relative w-full h-full">
        <button
          type="button"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();

            setDropdownPosition({
              top: rect.bottom + 4,
              left: rect.left,
              width: Math.max(rect.width, 260),
            });

            setOpenDropdown(isOpen ? null : dropdownKey);
            setDropdownSearch("");
          }}
          className={`
            w-full h-full min-h-[42px]
            bg-transparent
            outline-none
            px-3 py-2
            text-xs text-gray-900
            ${isRightAligned ? "text-right" : "text-left"}
            flex items-center justify-between
            ${
              hasError
                ? " text-red-500 bg-red-50"
                : "border-0 focus:bg-blue-50 focus:ring-1 focus:ring-blue-400"
            }
          `}
        >
          <span
  className={`truncate flex-1 ${
    isRightAligned ? "text-right" : "text-left"
  }`}
>
            {selectedOption?.label || "Select"}
          </span>

          <span className="inline-flex items-center justify-center px-2 py-1 text-gray-600">
            <ChevronDown size={16} />
          </span>
        </button>

        {isOpen && (
          <div
            className="
              fixed
              bg-white
              border border-gray-300
              rounded-md
              shadow-lg
              z-[99999]
              overflow-hidden
            "
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
            }}
          >
            <input
              type="text"
              value={dropdownSearch}
              onChange={(e) => setDropdownSearch(e.target.value)}
              placeholder="Search..."
              autoFocus
              className="
                w-full
                px-3 py-2
                text-xs
                border-0 border-b border-gray-200
                outline-none
                focus:ring-0
              "
            />

            <div className="max-h-[220px] overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      handleInvoiceCellChange(
                        rowIndex,
                        column.key,
                        option.value
                      );
                      setOpenDropdown(null);
                      setDropdownSearch("");
                    }}
                    className={`
                      w-full
                      px-3 py-2
                      text-left
                      text-xs
                      hover:bg-gray-100
                      ${
                        String(option.value) === String(mappedValue)
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-800"
                      }
                    `}
                  >
                    {option.label}
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-xs text-gray-500">
                  No results found
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
  const isRightAligned = rightAlignedColumns.includes(column.key);
  return (
    <input
      readOnly={["vatAmount", "totalAmount", "totalAmountAED"].includes(column.key)}
      type={column.type || "text"}
      value={value}
      onChange={(e) =>
        handleInvoiceCellChange(rowIndex, column.key, e.target.value)
      }
      className={`
        w-full h-full min-h-[42px]
        bg-transparent
        outline-none
        px-3 py-2
        text-xs text-gray-900
        flex items-center justify-between
        ${isRightAligned ? "text-right" : "text-left"}
        ${
          hasError
            ? " text-red-500 bg-red-50"
            : "border-0 focus:bg-blue-50 focus:ring-1 focus:ring-blue-400"
        }
      `}
    />
  );
};

const isValidCompany = (companyCode) => {
  return companies.some(
    (company) => String(company.com_code) === String(companyCode)
  );
};

const isValidProduct = (productCode) => {
  return products.some(
    (product) => String(product.prd_code) === String(productCode)
  );
};

const isValidVendor = (vendorCode) =>
  vendors.some(
    (vendor) => String(vendor.vend_code) === String(vendorCode)
  );



const handleSaveTransactions = async () => {
  try {
    if (!invoiceRows.length) {
      setMessage({
        type: "error",
        text: "No rows available to save.",
      });
      return;
    }

    if (!validateRows()) {
      setMessage({
        type: "error",
        text: "Please fill all required fields.",
      });
      return;
    }

    const activeUser = JSON.parse(localStorage.getItem("user"));
    const activeUserEmail = activeUser?.email || "";

    const validRows = invoiceRows.filter((row) => {
      return row.product || row.vendorName || row.invoiceNumber || row.amount;
    });

    if (!validRows.length) {
      setMessage({
        type: "error",
        text: "Please enter at least one valid transaction row.",
      });
      return;
    }

    const payloadRows = validRows.map((row) => ({
      invoiceDate: formatDateForInput(row.invoiceDate) || null,
      vendorName: row.vendorName || null,
      product: row.product || null,
      productType: row.productType || null,
      plan: row.plan || null,
      department: row.department || null,
      billingCompany: row.billingCompany || null,
      term: row.term || null,
      creditCard: row.creditCard || null,
      currency: row.currency || null,
      amount: Number(row.amount || 0),
      totalAmountAED: Number(row.totalAmountAED || 0),
      expiryDate: formatDateForInput(row.expiryDate) || null,
      costCenter: row.costCenter || null,
      remarks: row.remarks || null,
      vatAmount: Number(row.vatAmount || 0),
      totalAmount: Number(row.totalAmount || 0),
      invoiceNumber: row.invoiceNumber || null,
      transactionType: row.transactionType || null,
      projects: row.projects || null,
      itRequestNum: row.itRequestNum || null,
      requestedBy: row.requestedBy || null,
      qty: Number(row.qty || 0),
      lpoNo: row.lpoNo || null,
      lpoDate: formatDateForInput(row.lpoDate) || null,
      deliveryDate: formatDateForInput(row.deliveryDate) || null,
      prfRequired: row.prfRequired || false,

      // important for saving PDF path in backend
      pdfFileName: row.fileName || null,
    }));

    const formData = new FormData();

    formData.append(
      "payload",
      JSON.stringify({
        rows: payloadRows,
      })
    );

    files.forEach((pdfFile) => {
      formData.append("pdfFiles", pdfFile, pdfFile.name);
    });

    console.log("Saving transactions:", payloadRows);

    await createPaymentTransactions(formData, activeUserEmail);

    setMessage({
      type: "success",
      text: "Payment transactions saved successfully.",
    });

    setInvoiceRows([]);
    setExtractedInvoices([]);
    setExtractedData(null);
    setFiles([]);
    setPdfText("");
    setValidationErrors({});

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  } catch (error) {
    console.error("Save transaction error:", error);

    setMessage({
      type: "error",
      text:
        error.response?.data?.error ||
        error.message ||
        "Failed to save transactions.",
    });
  }
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
  ref={fileInputRef}
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
<button
  type="button"
  onClick={handleAddSingleRecord}
  disabled={loading}
  className="
    px-5 py-2
    rounded-md
    text-sm
    font-medium
    bg-green-600
    text-white
    hover:bg-green-700
    disabled:bg-gray-300
    disabled:text-gray-500
    disabled:cursor-not-allowed
  "
>
  Add Manually
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
    <div className="flex items-center justify-between mb-0">
      <h2 className="text-sm font-semibold text-gray-800">
        Extracted Invoice Details
      </h2>
      <span className="text-sm text-gray-500">
        {invoiceRows.length} row{invoiceRows.length > 1 ? "s" : ""}
      </span>
    </div>
    <div>
       <p className="text-xs text-gray-500">
        Enable the checkbox if PRF is required for the transaction.
      </p>
    </div>

    <div className="border border-gray-400 rounded overflow-auto max-h-[650px] bg-white">
      <table className="border-collapse text-xs min-w-[3800px] w-full">
                <thead className="bg-slate-200 sticky top-0 z-30 text-gray-900">
                  <tr>
                    <th className="border border-gray-400 px-3 py-2 min-w-[50px] bg-slate-200 text-center">
  Action
</th>
 <th className="border border-gray-400 px-3 py-2 min-w-[40px] bg-slate-200 text-center">
  PRF Required
</th>
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
                          className={`
  border border-gray-400 px-3 py-2 whitespace-nowrap min-w-[160px] font-semibold
  ${rightAlignedColumns.includes(column.key) ? "text-right" : "text-left"}
`}
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
                      <td className="border border-gray-400 text-center min-w-[50px]">
  <div className="flex items-center justify-center gap-1 p-1">
    {/* Delete Button */}
    {row.fileName && pdfPreviewUrls[row.fileName] && (
  <button
    type="button"
    onClick={() => setPreviewPdfUrl(pdfPreviewUrls[row.fileName])}
    className="inline-flex items-center justify-center p-1.5 text-gray-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
    title="Preview PDF"
  >
    <Eye size={16} />
  </button>
)}
    <button
      type="button"
      onClick={() => handleDeleteRow(rowIndex)}
      className="inline-flex items-center justify-center p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
      title="Delete row"
    >
      <Trash2 size={16} />
    </button>
     {/* Modern Checkbox */}
   
  </div>
</td>
<td className="border border-gray-400 px-3 py-2 text-center"> <label className="inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={row.prfRequired || false}
        onChange={(e) =>
          handleCheckboxChange(
            rowIndex,
            "prfRequired",
            e.target.checked
          )
        }
        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
        title = "PRF Required"
      />
    </label></td>
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
                            className={`
                            border border-gray-400
                            min-w-[180px]
                            p-0
                            relative
                            overflow-visible
                            ${rightAlignedColumns.includes(column.key) ? "text-right" : "text-left"}
                          `}
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
  onClick={handleSaveTransactions}
  disabled={!invoiceRows.length || loading}
  className="px-5 py-2 bg-blue-600 text-xs text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
>
  Save Transactions
</button>

              <button
  onClick={() => {
    setInvoiceRows([]);
    setExtractedInvoices([]);
    setExtractedData(null);
    setFiles([]);
    setPdfText("");
    setMessage({ type: "", text: "" });
    setValidationErrors({});

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }}
  className="px-5 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
>
  Discard
</button>

            </div>
          </div>
        )}

          {previewPdfUrl && (
          <div className="fixed inset-0 z-[99999] bg-black/60 flex items-center justify-center p-5">
            <div className="bg-white w-[90vw] h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h3 className="font-semibold text-gray-800">PDF Preview</h3>

                <button
                  onClick={() => setPreviewPdfUrl("")}
                  className="p-2 rounded-md hover:bg-red-50 text-red-600"
                >
                  <X size={20} />
                </button>
              </div>

              <iframe
                src={previewPdfUrl}
                title="PDF Preview"
                className="w-full flex-1"
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}