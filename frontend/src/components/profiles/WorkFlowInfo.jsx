import React, { useState, useEffect } from "react";
import { getDefaultWorkflow, saveDefaultWorkflow } from "../../api/api"; // change to your api file path

// component keys -> API keys
const toApi = (o) => ({
  prepared_by: o.preparedBy,
  checked_by: o.checkedBy,
  verified_by_it: o.verifiedByIT,
  verified_by: o.verifiedByAccounts,
  signed_by: o.signedBy,
  approved_by: o.approvedBy,
});

// API keys -> component keys (falls back to the given defaults)
const fromApi = (o, fallback) => ({
  preparedBy: o?.prepared_by ?? fallback.preparedBy,
  checkedBy: o?.checked_by ?? fallback.checkedBy,
  verifiedByIT: o?.verified_by_it ?? fallback.verifiedByIT,
  verifiedByAccounts: o?.verified_by ?? fallback.verifiedByAccounts,
  signedBy: o?.signed_by ?? fallback.signedBy,
  approvedBy: o?.approved_by ?? fallback.approvedBy,
});
const DEFAULT_PEOPLE = {
  preparedBy: "Agalya",
  checkedBy: "",
  verifiedByIT: "SARAD N.V / AKBAR J.J",
  verifiedByAccounts: "",
  signedBy: "MR KUMAR",
  approvedBy: "MR SHABIB",
};

const DEFAULT_LABELS = {
  preparedBy: "IT DEPARTMENT",
  checkedBy: "OPERATIONS",
  verifiedByIT: "IT DEPARTMENT",
  verifiedByAccounts: "ACCOUNTS",
  signedBy: "FINANCE MANAGER",
  approvedBy: "FOUNDER & CEO",
};

// Captions shown above each input in the card
const FIELDS = [
  { key: "preparedBy", caption: "Prepared By" },
  { key: "checkedBy", caption: "Checked By Marketting", needsAdvertising: true },
  { key: "verifiedByIT", caption: "Verified By IT" },
  { key: "verifiedByAccounts", caption: "Verified By Accounts" },
  { key: "signedBy", caption: "Signed By" },
  { key: "approvedBy", caption: "Approved By" },
];

// Captions shown in the Edit Labels popup
const LABEL_FIELDS = [
  { key: "preparedBy", caption: "Prepared By" },
  { key: "checkedBy", caption: "Checked By", needsAdvertising: true },
  { key: "verifiedByIT", caption: "Verified By IT" },
  { key: "verifiedByAccounts", caption: "Verified By Accounts" },
  { key: "signedBy", caption: "Signed By" },
  { key: "approvedBy", caption: "Approved By" },
];

export default function WorkflowInfo({
  activeUserEmail,
  initialPeople = DEFAULT_PEOPLE,
  initialLabels = DEFAULT_LABELS,
  initialAdvertising = false,
  onSave, // called with { people, labels, advertising }
}) {
  const [people, setPeople] = useState(initialPeople);
  const [labels, setLabels] = useState(initialLabels);
  const [advertising, setAdvertising] = useState(initialAdvertising);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [draftLabels, setDraftLabels] = useState(initialLabels);

  const openModal = () => {
    setDraftLabels(labels);
    setShowModal(true);
  };

  const saveLabels = () => {
    setLabels(draftLabels);
    setShowModal(false);
  };

  const payload = () => ({ people, labels, advertising });


useEffect(() => {
  getDefaultWorkflow()
    .then((res) => {
      const { values, labels: savedLabels } = res.data;
      if (values) {
        setPeople(fromApi(values, DEFAULT_PEOPLE));
        setAdvertising(!!values.advertising);
      }
      if (savedLabels) {
        setLabels(fromApi(savedLabels, DEFAULT_LABELS));
      }
    })
    .catch((err) => console.error("Load workflow failed:", err));
}, []);
const handleSave = async () => {
  try {
    setSaving(true);
    await saveDefaultWorkflow(
      toApi(people),
      toApi(labels),
      advertising,
      activeUserEmail
    );
    if (onSave) onSave(payload());
  } catch (err) {
    console.error("Save workflow failed:", err);
    alert(err?.response?.data?.error || "Failed to save workflow");
  } finally {
    setSaving(false);
  }
};
  return (
    <div className="wf-wrap">
      <style>{css}</style>

      {/* ===== Approval Workflow card ===== */}
      <div className="wf-card">
        <div className="wf-card-head">
          <h3 className="wf-title">Approval Workflow</h3>
          <div className="wf-head-right">
            <button type="button" className="wf-btn wf-btn-soft" onClick={openModal}>
              Edit Labels
            </button>
            <span className="wf-adv-text">Advertising</span>
            <button
              type="button"
              role="switch"
              aria-checked={advertising}
              className={`wf-switch ${advertising ? "on" : ""}`}
              onClick={() => setAdvertising((v) => !v)}
            >
              <span className="wf-knob" />
            </button>
          </div>
        </div>

        <div className="wf-body">
          <div className="wf-grid">
            {FIELDS.map((f) => {
              const disabled = f.needsAdvertising && !advertising;
              return (
                <div key={f.key} className="wf-field">
                  <label className="wf-caption">{f.caption}</label>
                  <input
                    className="wf-input"
                    value={people[f.key]}
                    disabled={disabled}
                    onChange={(e) =>
                      setPeople({ ...people, [f.key]: e.target.value })
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===== Footer buttons ===== */}
      <div className="wf-footer">
        <button
            type="button"
            className="wf-btn wf-btn-primary"
            onClick={handleSave}
            disabled={saving}
            >
            {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {/* ===== Edit Approval Labels popup ===== */}
      {showModal && (
        <div className="wf-overlay" onClick={() => setShowModal(false)}>
          <div className="wf-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wf-modal-head">
              <div>
                <h3 className="wf-modal-title">Edit Approval Labels</h3>
                <p className="wf-modal-sub">
                  Customize the approval department/designation labels.
                </p>
              </div>
              <button
                type="button"
                className="wf-close"
                onClick={() => setShowModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="wf-modal-body">
              {LABEL_FIELDS.map((f) => {
                const disabled = f.needsAdvertising && !advertising;
                return (
                  <div key={f.key} className="wf-field">
                    <label className="wf-caption">{f.caption}</label>
                    <input
                      className="wf-input wf-input-modal"
                      value={draftLabels[f.key]}
                      disabled={disabled}
                      onChange={(e) =>
                        setDraftLabels({ ...draftLabels, [f.key]: e.target.value })
                      }
                    />
                  </div>
                );
              })}
            </div>

            <div className="wf-modal-foot">
              <button
                type="button"
                className="wf-btn wf-btn-soft"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button type="button" className="wf-btn wf-btn-violet" onClick={saveLabels}>
                Save Labels
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const css = `
.wf-wrap { font-family: Georgia, "Times New Roman", serif; color: #111827; }
.wf-card { background:#fff; border:1px solid #e5e7eb; border-radius:14px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,.05); }
.wf-card-head { display:flex; align-items:center; justify-content:space-between; padding:14px 18px; background:linear-gradient(90deg,#f5f7ff,#eef2ff); border-bottom:1px solid #111; }
.wf-title { margin:0; font-size:15px; font-weight:700; }
.wf-head-right { display:flex; align-items:center; gap:10px; }
.wf-adv-text { font-size:13px; }
.wf-body { padding:18px; }
.wf-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px 22px; }
.wf-field { display:flex; flex-direction:column; gap:4px; }
.wf-caption { font-size:11px; color:#64748b; }
.wf-input { height:42px; padding:0 14px; border:1.5px solid #111; border-radius:12px; background:#f8fafc; font-family:inherit; font-size:14px; outline:none; box-sizing:border-box; width:100%; }
.wf-input:focus { border-color:#4f46e5; box-shadow:0 0 0 3px rgba(79,70,229,.15); }
.wf-input:disabled { background:#eef2f7; border-color:#cbd5e1; color:#94a3b8; cursor:not-allowed; }
.wf-input-modal { border:1.5px solid #c7d2fe; background:#fff; }
.wf-btn { height:36px; padding:0 16px; border-radius:10px; font-family:inherit; font-size:13px; cursor:pointer; }
.wf-btn-soft { background:#eef2ff; border:1px solid #c7d2fe; color:#4f46e5; }
.wf-btn-outline { background:#fff; border:1px solid #d1d5db; color:#111827; }
.wf-btn-primary { background:#1d5cff; border:1px solid #1d5cff; color:#fff; }
.wf-btn-violet { background:#4f3df5; border:1px solid #4f3df5; color:#fff; }
.wf-footer { display:flex; justify-content:flex-end; gap:12px; padding:16px 4px 0; }
.wf-switch { width:38px; height:22px; border-radius:999px; border:none; background:#cbd5e1; position:relative; cursor:pointer; padding:0; transition:background .2s; }
.wf-switch.on { background:#4f46e5; }
.wf-knob { position:absolute; top:2px; left:2px; width:18px; height:18px; background:#fff; border-radius:50%; transition:left .2s; }
.wf-switch.on .wf-knob { left:18px; }
.wf-overlay { position:fixed; inset:0; background:rgba(15,23,42,.45); display:flex; align-items:center; justify-content:center; z-index:1000; padding:16px; }
.wf-modal { background:#fff; width:100%; max-width:420px; max-height:92vh; display:flex; flex-direction:column; border-radius:16px; box-shadow:0 20px 50px rgba(0,0,0,.25); overflow:hidden; }
.wf-modal-head { display:flex; justify-content:space-between; align-items:flex-start; padding:18px 20px 12px; border-bottom:1px solid #111; }
.wf-modal-title { margin:0; font-size:16px; font-weight:700; }
.wf-modal-sub { margin:4px 0 0; font-size:11px; color:#64748b; }
.wf-close { background:none; border:none; font-size:24px; line-height:1; cursor:pointer; color:#374151; }
.wf-modal-body { padding:16px 20px; display:flex; flex-direction:column; gap:12px; overflow-y:auto; }
.wf-modal-foot { display:flex; justify-content:flex-end; gap:10px; padding:14px 20px; border-top:1px solid #111; }
@media (max-width:640px){ .wf-grid{ grid-template-columns:1fr; } }
`;