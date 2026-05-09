import { useState } from "react";
import { getMasterValues, createPaymentRequest  } from "../../api/api";

export default function PaymentRequestEntryForm({ onBack }) {
  const activeUser = JSON.parse(localStorage.getItem("user"));
  const activeUserEmail = activeUser?.email;
  const [form, setForm] = useState({
    paid_to: "",
    prf_number: "",
    date: "",
    division: "",
    amount: "",
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

  const [items, setItems] = useState([
    { doc_date: "", doc_no: "", narration: "", amount: "" }
  ]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const addRow = () => {
    setItems([...items, { doc_date: "", doc_no: "", narration: "", amount: "" }]);
  };

  const removeRow = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

 const handleSave = async () => {
  try {
    // =========================
    // BASIC VALIDATION
    // =========================
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

    // =========================
    // PREPARE PAYLOAD
    // =========================
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
        amount: item.amount
      }))
    };

    // =========================
    // API CALL
    // =========================
    const res = await createPaymentRequest(payload, activeUserEmail);

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Save failed");
    }

    // =========================
    // SUCCESS
    // =========================
    alert("Payment Request saved successfully");

    // optional reset
    setForm({
      paid_to: "",
      prf_number: "",
      date: "",
      division: "",
      amount: "",
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

    setItems([{ doc_date: "", doc_no: "", narration: "", amount: "" }]);

    // go back
    onBack?.();

  } catch (err) {
    console.error("Save error:", err);
    alert(err.message);
  }
};

return (
  <div className="bg-gray-50 min-h-screen p-6 flex flex-col space-y-6">

{/* ================= PAYMENT INFORMATION ================= */}
<div className="bg-white rounded-2xl shadow-sm  p-6">

  <h2 className="text-lg font-semibold text-gray-800 mb-5">
    Payment Information
  </h2>

  {/* ROW 1 - PAID TO */}
  <div className="mb-5">
    <LabelInput
      label="Paid To"
      name="paid_to"
      value={form.paid_to}
      onChange={handleChange}
    />
  </div>

  {/* ROW 2 - PRF + DATE + DIVISION (2 COLS) */}
  <div className="grid grid-cols-4 gap-4 mb-5">

    <LabelInput
      label="PRF Number"
      name="prf_number"
      value={form.prf_number}
      onChange={handleChange}
    />

    <LabelInput
      type="date"
      label="Date"
      name="date"
      value={form.date}
      onChange={handleChange}
    />

    <div className="col-span-2">
      <LabelInput
        label="Division"
        name="division"
        value={form.division}
        onChange={handleChange}
      />
    </div>

  </div>

  {/* ROW 3 - MODE + CURRENCY + PAYMENT MODE + AMOUNT */}
  <div className="grid grid-cols-4 gap-4 mb-5">

    <LabelInput
      label="Mode"
      name="mode"
      value={form.mode}
      onChange={handleChange}
    />

    <LabelInput
      label="Currency"
      name="currency"
      value={form.currency}
      onChange={handleChange}
    />

    <LabelInput
      label="Payment Mode"
      name="payment_mode"
      value={form.payment_mode}
      onChange={handleChange}
    />

    <LabelInput
      label="Amount"
      name="amount"
      value={form.amount}
      onChange={handleChange}
    />

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

        <button
          onClick={addRow}
          className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Add Row
        </button>
      </div>

      <div className="overflow-auto border rounded-lg">

        <table className="w-full text-sm">

          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-2 border">S.No</th>
              <th className="p-2 border">Date</th>
              <th className="p-2 border">Doc No</th>
              <th className="p-2 border">Narration</th>
              <th className="p-2 border">Amount</th>
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

                <td className="border p-1">
                  <input
                    value={item.narration}
                    onChange={(e) => handleItemChange(i, "narration", e.target.value)}
                    className="w-full px-2 py-1 border rounded"
                  />
                </td>

                <td className="border p-1">
                  <input
                    value={item.amount}
                    onChange={(e) => handleItemChange(i, "amount", e.target.value)}
                    className="w-full px-2 py-1 border rounded"
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

       <LabelInput label="Paid By" name="paid_by" value={form.paid_by} onChange={handleChange} />
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
        className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
      >
        Save
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
  type = "text"
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