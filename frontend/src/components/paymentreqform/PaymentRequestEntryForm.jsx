import Select from "react-select";
import { useEffect, useState } from "react";
import { getMasterValues, createPaymentRequest, updatePaymentRequest, getMasterData, getLastPRFNumber, updateGenarateStatus, getVatPercentage  } from "../../api/api";
import ValidatePopups from "../Validatepopups";

export default function PaymentRequestEntryForm({ onBack, editData, onRefresh, onSaveAndPreview }) {
 // console.log("Edit Data in Form:", editData);
  const isEditMode = !!editData && !!editData.id;
  const activeUser = JSON.parse(localStorage.getItem("user"));
  const activeUserEmail = activeUser?.email;
  const [vendors, setVendors] = useState([]);
  const [serviceProviders, setServiceProviders] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [paymentModes, setPaymentModes] = useState([]);
  const [currency, setCurrency] = useState([]);
  const [creditCards, setCreditCards] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [billingCycles, setBillingCycles] = useState([]);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupType, setPopupType] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const isAlreadyGenerated = !!editData?.is_generated;
  const [vatPercent, setVatPercent] = useState(null);
  const [form, setForm] = useState({
    paid_to: "",
    prf_number: "",
    product_type: "",
    division: "",
    billing_cycle: "",
    mode: "",
    currency: "",
    description: "",
    payment_mode: "",
    paid_by: "",
    prepared_by: "",
    checked_by: "",
    verified_by: "",
    signed_by: "",
    approved_by: ""
  });

useEffect(() => {
  async function setInitialForm() {
    function toDateInputValue(dateStr) {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${d.getFullYear()}-${month}-${day}`;
    }

    if (editData) {
      setForm({
        paid_to: editData.paid_to || "",
        prf_number: editData.prf_number || "",
        product_type: editData.product_type || "",
        division: editData.division || "",
        billing_cycle: editData.billing_cycle || "",
        mode: editData.mode || "",
        currency: editData.currency || "",
        description: editData.description || "",
        payment_mode: editData.payment_mode || "",
        paid_by: editData.paid_by || "",
        prepared_by: editData.prepared_by || "",
        checked_by: editData.checked_by || "",
        verified_by: editData.verified_by || "",
        signed_by: editData.signed_by || "",
        approved_by: editData.approved_by || "",

      });
      setItems(
        Array.isArray(editData.details)
          ? editData.details.map(item => ({
              ...item,
              doc_date: toDateInputValue(item.doc_date)
            }))
          : [{ doc_date: "", doc_no: "", narration: "", amount: "", vat: "", total_amount: "" }]
      );
    } else {
      // Only auto-generate for new entries
      const nextPrf = await generateNextPrfNumber();
      setForm({
        paid_to: "",
        prf_number: nextPrf,
        product_type: "",
        division: "",
        billing_cycle: "",
        mode: "",
        currency: "",
        description: "",
        payment_mode: "",
        paid_by: "",
        prepared_by: "",
        checked_by: "",
        verified_by: "",
        signed_by: "",
        approved_by: ""
      });
      setItems([{ doc_date: "", doc_no: "", narration: "", amount: "", vat: "", total_amount: "" }]);
    }
  }
  setInitialForm();
}, [editData]);

const [items, setItems] = useState([
  { doc_date: "", doc_no: "", narration: "", amount: "", vat: "", total_amount: "" }
]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

const handleItemChange = async (index, field, value) => {
  const updated = [...items];
  updated[index][field] = value;

  // If amount changes, fetch VAT percent if not already fetched, then calculate VAT amount
  if (field === "amount") {
    let vat = vatPercent;
    if (vat === null) {
      // Fetch VAT percent only once
      try {
        const res = await getVatPercentage();
        vat = parseFloat(res.data?.vatPercentage) || 0;
        setVatPercent(vat);
      } catch {
        vat = 0;
        setVatPercent(0);
      }
    }
    const amount = parseFloat(value) || 0;
    const vatAmount = ((amount * vat) / 100).toFixed(2);
    updated[index].vat = vatAmount;
    updated[index].total_amount = (amount + parseFloat(vatAmount)).toFixed(2);
  }

  // If VAT is manually changed, recalculate total_amount
  if (field === "vat") {
    const amount = parseFloat(updated[index].amount) || 0;
    const vatAmount = parseFloat(value) || 0;
    updated[index].total_amount = (amount + vatAmount).toFixed(2);
  }

  setItems(updated);
};

const addRow = () => {
  setItems([...items, { doc_date: "", doc_no: "", narration: "", amount: "", vat: "", total_amount: "" }]);
};

  const removeRow = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const generateNextPrfNumber = async () => {
  // Option 1: If you have an API endpoint to get the latest PRF number:
  const res = await getLastPRFNumber(); // implement this API if needed
  const latest = res.data?.lastPRFNumber || "IT/000325";
  console.log("Latest PRF from API:", latest);
  // Extract the numeric part and increment
  const match = latest.match(/IT\/(\d{6})/);
  let nextNum = 1;
  if (match) {
    nextNum = parseInt(match[1], 10) + 1;
  }
  return `IT/${String(nextNum).padStart(6, "0")}`;
};

useEffect(() => {
getMasterData("products", activeUserEmail).then(res => {
  const result = Array.isArray(res.data) ? res.data : [];
  //console.log("Raw Service Providers:", result);
  setServiceProviders(result);
  console.log("Service Providers:", result);
});
 getMasterData("vendors", activeUserEmail).then(res => {
    const result = Array.isArray(res?.data) ? res.data : [];
    setVendors(result);
    //console.log("Vendors:", result);
  });
  getMasterData("company", activeUserEmail).then(res => {
    const result = Array.isArray(res?.data) ? res.data : [];
    setCompanies(result);
    //console.log("Companies:", result);
  });
  getMasterData("payment_method", activeUserEmail).then(res => {
    const result = Array.isArray(res?.data) ? res.data : [];
    setPaymentModes(result);
   // console.log("Payment Modes:", result);
  });
   getMasterData("currency", activeUserEmail).then(res => {
    const result = Array.isArray(res?.data) ? res.data : [];
    setCurrency(result);
  //  console.log("Currency:", result);
  });
    getMasterData("credit_card", activeUserEmail).then(res => {
    const result = Array.isArray(res?.data) ? res.data : [];
    setCreditCards(result);
  //  console.log("Credit Cards:", result);
  });
    getMasterData("services", activeUserEmail).then(res => {
    const result = Array.isArray(res?.data) ? res.data : [];
    setServiceTypes(result);
  //  console.log("Service Types:", result);
  });
    getMasterData("billing_cycle", activeUserEmail).then(res => {
    const result = Array.isArray(res?.data) ? res.data : [];
    setBillingCycles(result);
  //  console.log("Billing Cycles:", result);
  });
}, []);

const handleSave = async () => {
  try {
    // BASIC VALIDATION (same as before)
    if (!form.paid_to) {
      alert("Paid To is required");
      return;
    }
    if (!form.prf_number) {
      alert("PRF Number is required");
      return;
    }
    if (!items.length) {
      alert("At least one detail row is required");
      return;
    }

    // PREPARE PAYLOAD
    const payload = {
      header: {
        paid_to: form.paid_to,
        prf_number: form.prf_number,
        product_type: form.product_type,
        division: form.division,
        billing_cycle: form.billing_cycle,
        mode: form.mode,
        currency: form.currency,
        payment_mode: form.payment_mode,
        description: form.description,
        paid_by: form.paid_by,
        prepared_by: form.prepared_by,
        checked_by: form.checked_by,
        verified_by: form.verified_by,
        signed_by: form.signed_by,
        approved_by: form.approved_by,
      },
      details: items.map((item) => ({
        doc_date: item.doc_date,
        doc_no: item.doc_no,
        narration: item.narration,
        amount: item.amount,
        vat: item.vat,
        total_amount: item.total_amount
      }))
    };

    let res;
  if (isEditMode) {
  res = await updatePaymentRequest(editData.id, payload, activeUserEmail);

  setPopupMessage("Payment Request updated successfully");
  setPopupType("success");

} else {
  res = await createPaymentRequest(payload, activeUserEmail);

  setPopupMessage("Payment Request saved successfully");
  setPopupType("success");
}
setIsSaved(true);

      setTimeout(() => {
        onRefresh?.();
        // if (onSaveAndPreview) {
        //   // Use the payload you just saved for preview
        //   onSaveAndPreview(payload);
        // } else {
        //   onBack?.();
        // }
      }, 1500);

  } catch (err) {
    console.error("Save error:", err);
    alert(err.message);
  }
};

const handleGenerate = async () => {
  if (!isSaved) {
    setPopupMessage("Please save the details before generate.");
    setPopupType("warning");
    return;
  }

  // Prepare the payload from current form state
  const payload = {
    header: {
      paid_to: form.paid_to,
      prf_number: form.prf_number,
      prf_date: form.date,
      division: form.division,
      amount: form.amount,
      mode: form.mode,
      currency: form.currency,
      payment_mode: form.payment_mode,
      description: form.description,
      paid_by: form.paid_by,
      prepared_by: form.prepared_by,
      checked_by: form.checked_by,
      verified_by: form.verified_by,
      signed_by: form.signed_by,
      approved_by: form.approved_by,
    },
    details: items.map((item) => ({
      doc_date: item.doc_date,
      doc_no: item.doc_no,
      narration: item.narration,
      amount: item.amount,
      vat: item.vat,
      total_amount: item.total_amount
    }))
  };

  if (onSaveAndPreview) {
    onSaveAndPreview(payload);
  }

  // Only call this if you have an id (edit mode)
  if (form.prf_number) {
    await updateGenarateStatus(form.prf_number, activeUserEmail);
  }
};





return (
  <div className="bg-gray-50 min-h-screen p-6 flex flex-col space-y-6">
<ValidatePopups
  open={!!popupMessage}
  type={popupType}
  message={popupMessage}
  onClose={() => {
    setPopupMessage("");
    setPopupType("");
  }}
/>

{/* ================= PAYMENT INFORMATION ================= */}
<div className="bg-white rounded-2xl shadow-sm  p-6">

  <h2 className="text-lg font-semibold text-gray-800 mb-5">
    Payment Information
  </h2>

  {/* ROW 1 - PAID TO */}
        <div className="mb-5">
         <label className="block text-xs font-medium text-gray-500 mb-1">
        Division
      </label>
      <Select
        options={Array.isArray(companies) ? companies.map(c => ({ label: c.trade_name, value: c.trade_name })) : []}
        value={form.division ? { label: form.division, value: form.division } : null}
        onChange={option => setForm({ ...form, division: option?.value || "" })}
        isClearable
         styles={{
      control: (base, state) => ({
        ...base,
        minHeight: "42px",
        borderRadius: "0.75rem",
        backgroundColor: "#f9fafb",
        borderColor: state.isFocused ? "#bfdbfe" : "#e5e7eb",
        boxShadow: state.isFocused
          ? "0 0 0 2px #bfdbfe"
          : "none",
        "&:hover": {
          borderColor: "#d1d5db",
        },
      }),
      valueContainer: (base) => ({
        ...base,
        padding: "0 12px",
      }),
      input: (base) => ({
        ...base,
        margin: "0px",
        padding: "0px",
      }),
    }}
        placeholder="Select division..."
      />
      </div>


  {/* ROW 2 - PRF + DATE + DIVISION (2 COLS) */}
  <div className="grid grid-cols-3 gap-4 mb-5">
      <div className="">
  <label className="block text-xs font-medium text-gray-500 mb-1">
          Paid To
        </label>
   <Select
  options={
    Array.isArray(vendors)
      ? vendors.map(v => ({
          label: v.vendor_name,
          value: v.vendor_name
        }))
      : []
  }
  value={form.paid_to ? { label: form.paid_to, value: form.paid_to } : null}
  onChange={option => {
    setForm({ ...form, paid_to: option?.value || "" });

    // Find all serviceProviders for this vendor
    if (option) {
      const matchedProviders = serviceProviders.filter(
        sp => sp.vendor === option.value
      );

      // Create a row for each product
      if (matchedProviders.length > 0) {
        setItems(
          matchedProviders.map(sp => ({
            doc_date: "",
            doc_no: "",
            narration: sp.prd_name || "",
            amount: "",
            vat: "",
            total_amount: ""
          }))
        );

        // Auto-select product_type (service) for the first match
        const firstServiceId = matchedProviders[0].products_types;
        const matchedService = serviceTypes.find(
          st => String(st.id) === String(firstServiceId)
        );
        setForm(form => ({
          ...form,
          product_type: matchedService ? matchedService.prd_type : ""
        }));
      } else {
        setItems([
          {
            doc_date: "",
            doc_no: "",
            narration: "",
            amount: "",
            vat: "",
            total_amount: ""
          }
        ]);
        setForm(form => ({ ...form, product_type: "" }));
      }
    }
  }}
  styles={{
    control: (base, state) => ({
      ...base,
      minHeight: "42px",
      borderRadius: "0.75rem",
      backgroundColor: "#f9fafb",
      borderColor: state.isFocused ? "#bfdbfe" : "#e5e7eb",
      boxShadow: state.isFocused ? "0 0 0 2px #bfdbfe" : "none",
      "&:hover": {
        borderColor: "#d1d5db"
      }
    }),
    valueContainer: base => ({
      ...base,
      padding: "0 12px"
    }),
    input: base => ({
      ...base,
      margin: "0px",
      padding: "0px"
    })
  }}
  placeholder="Select Vendor..."
/>
    </div>
   <div className="">
  <label className="block text-xs font-medium text-gray-500 mb-1">
          Product Type
        </label>
       <Select
          options={Array.isArray(serviceTypes) ? serviceTypes.map(st => ({ label: st.prd_type, value: st.prd_type })) : []}
          value={form.product_type ? { label: form.product_type, value: form.product_type } : null}
          onChange={option => {
            setForm({ ...form, product_type: option?.value || "" });
            // Auto-fill narration in the first detail row
            if (option && option.product) {
              setItems(items => {
                const updated = [...items];
                if (updated.length > 0) {
                  updated[0] = { ...updated[0], narration: option.product };
                }
                return updated;
              });
            }
          
          }}
          isClearable
           styles={{
      control: (base, state) => ({
        ...base,
        minHeight: "42px",
        borderRadius: "0.75rem",
        backgroundColor: "#f9fafb",
        borderColor: state.isFocused ? "#bfdbfe" : "#e5e7eb",
        boxShadow: state.isFocused
          ? "0 0 0 2px #bfdbfe"
          : "none",
        "&:hover": {
          borderColor: "#d1d5db",
        },
      }),
      valueContainer: (base) => ({
        ...base,
        padding: "0 12px",
      }),
      input: (base) => ({
        ...base,
        margin: "0px",
        padding: "0px",
      }),
    }}
          placeholder="Select Vendor..."
        />
    </div>

   <LabelInput
  label="PRF Number"
  name="prf_number"
  value={form.prf_number}
  onChange={handleChange}
  readOnly={true}
/>

    {/* <LabelInput
      type="date"
      label="Date"
      name="date"
      value={form.date}
      onChange={handleChange}
    /> */}

  

  </div>

  {/* ROW 3 - MODE + CURRENCY + PAYMENT MODE + AMOUNT */}
  <div className="grid grid-cols-4 gap-4 mb-5">

    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">
        Payment Type
      </label>
      <Select
        options={
          Array.isArray(paymentModes)
            ? paymentModes.map((m) => ({
                label: m.method_name,
                value: m.method_name,
                payment_mode: m.method_name === "Online" ? "CREDIT CARD" : "",
              }))
            : []
        }
        value={form.mode ? { label: form.mode, value: form.mode } : null}
        onChange={(option) => {
          setForm((prev) => ({
            ...prev,
            mode: option?.value || "",
            payment_mode: option?.value === "Online" ? "CREDIT CARD" : "",
          }));
        }}
        isClearable
         styles={{
      control: (base, state) => ({
        ...base,
        minHeight: "42px",
        borderRadius: "0.75rem",
        backgroundColor: "#f9fafb",
        borderColor: state.isFocused ? "#bfdbfe" : "#e5e7eb",
        boxShadow: state.isFocused
          ? "0 0 0 2px #bfdbfe"
          : "none",
        "&:hover": {
          borderColor: "#d1d5db",
        },
      }),
      valueContainer: (base) => ({
        ...base,
        padding: "0 12px",
      }),
      input: (base) => ({
        ...base,
        margin: "0px",
        padding: "0px",
      }),
    }}
        placeholder="Select mode..."
      />
    </div>

      <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">
        Currency
      </label>
      <Select
        options={Array.isArray(currency) ? currency.map(c => ({ label: c.currency_code, value: c.currency_code })) : []}
        value={form.currency ? { label: form.currency, value: form.currency } : null}
        onChange={option => setForm({ ...form, currency: option?.value || "" })}  
        isClearable
         styles={{
      control: (base, state) => ({
        ...base,
        minHeight: "42px",
        borderRadius: "0.75rem",
        backgroundColor: "#f9fafb",
        borderColor: state.isFocused ? "#bfdbfe" : "#e5e7eb",
        boxShadow: state.isFocused
          ? "0 0 0 2px #bfdbfe"
          : "none",
        "&:hover": {
          borderColor: "#d1d5db",
        },
      }),
      valueContainer: (base) => ({
        ...base,
        padding: "0 12px",
      }),
      input: (base) => ({
        ...base,
        margin: "0px",
        padding: "0px",
      }),
    }}
        placeholder="Select currency..."
      />
    </div>

    <LabelInput
      label="Payment Method"
      name="payment_mode"
      value={form.payment_mode}
      onChange={handleChange}
    />

         <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">
        Billing Cycle
      </label>
      <Select
        options={Array.isArray(billingCycles) ? billingCycles.map(c => ({ label: c.value, value: c.value })) : []}
        value={form.billing_cycle ? { label: form.billing_cycle, value: form.billing_cycle } : null}
        onChange={option => setForm({ ...form, billing_cycle: option?.value || "" })}  
        isClearable
         styles={{
      control: (base, state) => ({
        ...base,
        minHeight: "42px",
        borderRadius: "0.75rem",
        backgroundColor: "#f9fafb",
        borderColor: state.isFocused ? "#bfdbfe" : "#e5e7eb",
        boxShadow: state.isFocused
          ? "0 0 0 2px #bfdbfe"
          : "none",
        "&:hover": {
          borderColor: "#d1d5db",
        },
      }),
      valueContainer: (base) => ({
        ...base,
        padding: "0 12px",
      }),
      input: (base) => ({
        ...base,
        margin: "0px",
        padding: "0px",
      }),
    }}
        placeholder="Select billing cycle..."
      />
    </div>

    {/* <LabelInput
      label="Amount"
      name="amount"
      value={form.amount}
      onChange={handleChange}
    /> */}

  </div>

  {/* ROW 4 - DESCRIPTION */}
  <div>

    <label className="block text-xs font-medium text-gray-500 mb-1">
      Description
    </label>

    <textarea
      name="description"
      value={form.description}
      onChange={handleChange}
      rows={3}
      className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200
      focus:bg-white focus:ring-2 focus:ring-blue-200 outline-none transition"
    />

  </div>

</div>

    {/* ================= DETAILS TABLE ================= */}
    <div className="bg-white p-5 rounded-xl shadow">

      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-700">
          Invoice / PO Details
        </h3>

        {/* <button
          onClick={addRow}
          className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Add Row
        </button> */}
      </div>

      <div className="overflow-auto border rounded-lg">

        <table className="w-full text-sm">

          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-2 border">S.No</th>
              <th className="p-2 border">Date</th>
              <th className="p-2 border">Doc No</th>
              <th className="p-2 border">Product Description</th>
              <th className="p-2 border">Amount</th>
              <th className="p-2 border">VAT Amount</th>
              <th className="p-2 border">Total Amount</th>
              <th className="p-2 border">Action</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="hover:bg-gray-50">

                <td className="border p-2 text-center">{i + 1}</td>

                <td className="border p-1">
                  <input
                    type="date"
                    value={item.doc_date}
                    onChange={(e) => handleItemChange(i, "doc_date", e.target.value)}
                    className="w-full px-2 py-1 border rounded"
                  />
                </td>

                <td className="border p-1">
                  <input
                    value={item.doc_no}
                    onChange={(e) => handleItemChange(i, "doc_no", e.target.value)}
                    className="w-full px-2 py-1 border rounded"
                  />
                </td>

                <td className="border p-1 ">
                  <input
                    value={item.narration}
                    onChange={(e) => handleItemChange(i, "narration", e.target.value)}
                    className="w-full px-2 py-1 border rounded"
                  />
                </td>

                <td className="border p-1">
  <input
    type="number"
    min="0"
    step="0.01"
    value={item.amount}
    onChange={(e) => handleItemChange(i, "amount", e.target.value)}
    className="w-full px-2 py-1 border rounded"
  />
</td>

<td className="border p-1">
  <input
    type="number"
    min="0"
    step="0.01"
    value={item.vat}
    readOnly
    className="w-full px-2 py-1 border rounded"
  />
</td>

<td className="border p-1">
  <input
    type="number"
    min="0"
    step="0.01"
    value={item.total_amount}
    onChange={(e) => handleItemChange(i, "total_amount", e.target.value)}
    className="w-full px-2 py-1 border rounded bg-gray-100"
    readOnly
  />
</td>

                <td className="border p-2 text-center">
                  <button
                    onClick={() => removeRow(i)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </td>

              </tr>
            ))}
          </tbody>

        </table>
      </div>
    </div>

    {/* ================= APPROVAL ================= */}
    <div className="bg-white p-5 rounded-xl shadow">

      <h3 className="font-semibold mb-4 text-gray-700">
        Approval Workflow
      </h3>

      <div className="grid grid-cols-3 gap-4">

      <div className="w-full">
  <label className="block text-xs font-medium text-gray-500 mb-1">
    Paid By
  </label>

  <Select
    options={
      Array.isArray(creditCards)
        ? creditCards.map((card) => ({
            label: card.card_holder_name,
            value: card.card_holder_name,
          }))
        : []
    }
    value={
      form.paid_by
        ? { label: form.paid_by, value: form.paid_by }
        : null
    }
    onChange={(option) =>
      setForm({ ...form, paid_by: option?.value || "" })
    }
    isClearable
    placeholder="Select card holder..."
    styles={{
      control: (base, state) => ({
        ...base,
        minHeight: "42px",
        borderRadius: "0.75rem",
        backgroundColor: "#f9fafb",
        borderColor: state.isFocused ? "#bfdbfe" : "#e5e7eb",
        boxShadow: state.isFocused
          ? "0 0 0 2px #bfdbfe"
          : "none",
        "&:hover": {
          borderColor: "#d1d5db",
        },
      }),
      valueContainer: (base) => ({
        ...base,
        padding: "0 12px",
      }),
      input: (base) => ({
        ...base,
        margin: "0px",
        padding: "0px",
      }),
    }}
  />
</div>
<LabelInput label="Prepared By" name="prepared_by" value={form.prepared_by} onChange={handleChange} />
<LabelInput label="Checked By" name="checked_by" value={form.checked_by} onChange={handleChange} />

<LabelInput label="Verified By" name="verified_by" value={form.verified_by} onChange={handleChange} />
<LabelInput label="Signed By" name="signed_by" value={form.signed_by} onChange={handleChange} />
<LabelInput label="Approved By" name="approved_by" value={form.approved_by} onChange={handleChange} />

      </div>
    </div>

    {/* ================= ACTION BAR ================= */}
    <div className="bg-white p-4 rounded-xl shadow flex justify-end gap-3 sticky bottom-0">

      <button
        onClick={onBack}
        className="px-5 py-2 border rounded-lg hover:bg-gray-100"
      >
        Cancel
      </button>

     <button
  onClick={handleSave}
  disabled={isSaved || isAlreadyGenerated}
  title={
    isAlreadyGenerated
      ? "Already generated"
      : (isSaved ? "Already saved" : "")
  }
  className={`
    px-5 py-2 rounded-lg text-white transition
    ${
      isAlreadyGenerated || isSaved
        ? "bg-gray-400 cursor-not-allowed opacity-70"
        : "bg-green-600 hover:bg-green-700 cursor-pointer"
    }
  `}
>
  {isEditMode
    ? (isAlreadyGenerated ? "Updated" : (isSaved ? "Updated" : "Update"))
    : (isAlreadyGenerated ? "Saved" : (isSaved ? "Saved" : "Save"))}
</button>

      <button
  onClick={() => { if (!isAlreadyGenerated) handleGenerate(); }}
  disabled={!isSaved || isAlreadyGenerated}
  title={
    isAlreadyGenerated
      ? "Already generated"
      : (!isSaved ? "Save first before generating" : "")
  }
  className={`
    px-5 py-2 rounded-lg text-white transition
    ${
      isAlreadyGenerated
        ? "bg-gray-400 cursor-not-allowed opacity-70"
        : (isSaved
            ? "bg-blue-600 hover:bg-blue-700 cursor-pointer"
            : "bg-gray-400 cursor-not-allowed"
          )
    }
  `}
>
  {isAlreadyGenerated ? "Generated" : (!isSaved ? "🔒 Generate" : "Generate")}
</button>

    </div>

  </div>
);
}

// ================= INPUT =================
function LabelInput({
  label,
  name,
  value,
  onChange,
  type = "text",
  readOnly = false
}) {
  return (
    <div className="w-full">

      <label className="block text-xs font-medium text-gray-500 mb-1">
        {label}
      </label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        className="
          w-full px-3 py-2 rounded-xl
          bg-gray-50 border border-gray-200
          focus:bg-white focus:ring-2 focus:ring-blue-200
          outline-none transition
        "
      />

    </div>
  );
}