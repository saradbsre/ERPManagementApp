const masterTableConfig = {
  currency: {
    displayName: "Currency Master",

    columns: [
      { key: "currency_code", label: "Code" },
      { key: "currency_name", label: "Currency Name" },
      { key: "country", label: "Country" },
      { key: "sysdate", label: "Updated On" },
      { key: "exchange_rate", label: "Exchange Rate" }
    ]
  },

  subscriptions: {
    displayName: "Subscriptions Master",

    columns: [
      { key: "provider_name", label: "Name" },
      { key: "plan_name", label: "Plan" },
      { key: "purchase_date", label: "Purchase Date" },
      { key: "renewal_date", label: "Renewal Date" },
      { key: "billing_cycle", label: "Billing Cycle" },
    ]
  },

  data_types: {
    displayName: "Data Types ",

    columns: [
      { key: "label", label: "Label" },
      { key: "type_key", label: "Type Key" },
      { key: "default_length", label: "Default Length" }
    ]
  },

  billing_cycle:{
    displayName: "Billing Cycle Master",

    columns: [
        { key: "value", label: "Term Name" },
    ]
  },
   payment_method:{
    displayName: "Payment Methods Master",

    columns: [
        { key: "method_name", label: "Payment Method" },
        { key: "provider", label: "Provider" },
        { key: "card_holder_name", label: "Card Holder Name" },
        { key: "card_number", label: "Card Number" },
        { key: "card_brand", label: "Card Brand" },
        
    ]
  },
  company: {
    displayName: "Company Master",
    columns: [
      { key: "licence_no", label: "Licence Number" },
      { key: "sector_brand", label: "Sector/Brand" },
      { key: "trade_name", label: "Trade Name" },
      { key: "legal_status", label: "Legal Status" },
      { key: "location_brand", label: "Location" },
      { key: "issue_date", label: "Issue Date" },
      { key: "expiry_date", label: "Expiry Date" },
      { key: "trn", label: "TRN" }
    ]
  }
};

export default masterTableConfig;