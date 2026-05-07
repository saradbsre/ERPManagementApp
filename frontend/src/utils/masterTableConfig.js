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

  service_providers: {
    displayName: "Service Providers Master",

    columns: [
      { key: "provider_name", label: "Name", data_type: "string" },
      { key: "is_active", label: "Active Status", data_type: "boolean" },
      { key: "services", label: "Services", data_type: "string" },
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
        { key: "description", label: "Description", data_type: "string" },
        { key: "is_active", label: "Is Active", data_type: "boolean" },
    ]
  },
   payment_method:{
    displayName: "Payment Methods Master",

    columns: [
        { key: "method_name", label: "Payment Method", data_type: "string" },
        // { key: "is_active", label: "Is Active", data_type: "boolean" },
        { key: "sysdate", label: "Updated On", data_type: "datetime" },
        
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
  },
   services: {
    displayName: "Services Master",

    columns: [
      { key: "service_name", label: "Name", data_type: "string" },
      { key: "is_active", label: "Active Status", data_type: "boolean" },
    ]
  },
   credit_card: {
    displayName: "Credit Cards Master",
    columns: [
      { key: "card_holder_name", label: "Cardholder Name", data_type: "string" },
      { key: "card_4number", label: "Card Number - Last 4 Digits", data_type: "string" },
      { key: "card_brand", label: "Card Brand", data_type: "string" },
      { key: "expiry_date", label: "Expiry Date", data_type: "datetime" },
      // { key: "cvv", label: "CVV", data_type: "string" },
      { key: "billing_address", label: "Billing Address", data_type: "string" }
    ]
  },
  plans: {
    displayName: "Plans Master",
    columns: [
      { key: "plan_name", label: "Plan Name", data_type: "string" },
      // { key: "description", label: "Description", data_type: "string" },
      { key: "is_active", label: "Active Status", data_type: "boolean" },
    ]
  },
   department: {
    displayName: "Department Master",
    columns: [
      { key: "department_name", label: "Department Name", data_type: "string" },
      { key: "description", label: "Description", data_type: "string" },
      { key: "is_active", label: "Active Status", data_type: "boolean" },
    ]
  },
  providers: {
    displayName: "Providers Master",
    columns: [
      { key: "provider_name", label: "Provider Name", data_type: "string" },
      { key: "provider_code", label: "Provider Code", data_type: "string" },
      { key: "provider_type", label: "Provider Type", data_type: "string" },
      { key: "website", label: "Website", data_type: "string" },
      { key: "support_email", label: "Support Email", data_type: "string" },
      { key: "is_active", label: "Active Status", data_type: "boolean" },
    ]
   }
};

export default masterTableConfig;