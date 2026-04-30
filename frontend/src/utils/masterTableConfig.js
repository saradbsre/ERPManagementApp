import { data } from "react-router-dom";

const masterTableConfig = {
  currency: {
    displayName: "Currency Master",

    columns: [
      { key: "currency_code", label: "Code", data_type: "string" },
      { key: "currency_name", label: "Currency Name", data_type: "string" },
      { key: "country", label: "Country", data_type: "string" },
      { key: "sysdate", label: "Updated On", data_type: "datetime" },
      { key: "exchange_rate", label: "Exchange Rate", data_type: "number" }
    ]
  },

  subscriptions: {
    displayName: "Subscriptions Master",

    columns: [
      { key: "provider_name", label: "Name", data_type: "string" },
      { key: "plan_name", label: "Plan", data_type: "string" },
      { key: "purchase_date", label: "Purchase Date", data_type: "datetime" },
      { key: "renewal_date", label: "Renewal Date", data_type: "datetime" },
      { key: "billing_cycle", label: "Billing Cycle", data_type: "string" },
    ]
  },

  data_types: {
    displayName: "Data Types ",

    columns: [
      { key: "label", label: "Label", data_type: "string" },
      { key: "type_key", label: "Type Key", data_type: "string" },
      { key: "default_length", label: "Default Length", data_type: "number" }
    ]
  },

  billing_cycle:{
    displayName: "Billing Cycle Master",

    columns: [
        { key: "value", label: "Term Name", data_type: "string" },
    ]
  },
   payment_method:{
    displayName: "Payment Methods Master",

    columns: [
        { key: "method_name", label: "Payment Method", data_type: "string" },
        { key: "provider", label: "Provider", data_type: "string" },
        { key: "card_holder_name", label: "Card Holder Name", data_type: "string" },
        { key: "card_number", label: "Card Number", data_type: "string" },
        { key: "card_brand", label: "Card Brand", data_type: "string" },
        
    ]
  },
  company: {
    displayName: "Company Master",
    columns: [
      { key: "licence_no", label: "Licence Number", data_type: "string" },
      { key: "sector_brand", label: "Sector/Brand", data_type: "string" },
      { key: "trade_name", label: "Trade Name", data_type: "string" },
      { key: "legal_status", label: "Legal Status", data_type: "string" },
      { key: "location_brand", label: "Location", data_type: "string" },
      { key: "issue_date", label: "Issue Date", data_type: "datetime" },
      { key: "expiry_date", label: "Expiry Date", data_type: "datetime" },
      { key: "trn", label: "TRN", data_type: "string" }
    ]
  }
};

export default masterTableConfig;