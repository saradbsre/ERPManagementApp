import { data } from "react-router-dom";

const masterTableConfig = {
  currency: {
    displayName: "Currency Master",

    columns: [
      { key: "currency", label: "Currency", data_type: "string" },
      { key: "currency_code", label: "Currency Code", data_type: "string" },
      { key: "description", label: "Description", data_type: "string" },
      { key: "country", label: "Country", data_type: "string" },
      { key: "sysdate", label: "Updated On", data_type: "datetime" },
      { key: "exchange_rate", label: "Exchange Rate", data_type: "number" }
    ]
  },

  vendors: {
    displayName: "Service Providers Master",

    columns: [
      { key: "vendor_name", label: "Vendor Name", data_type: "string" },
      { key: "vendor_code", label: "Vendor Code", data_type: "string" },
      { key: "description", label: "Description", data_type: "string" },
      { key: "website", label: "Website", data_type: "string" },
      { key: "is_vat", label: "VAT Applicable", data_type: "boolean" },
      { key: "address", label: "Address", data_type: "string" },
      { key: "country", label: "Country", data_type: "string" },
      { key: "email", label: "Email", data_type: "string" },
      { key: "phone_number", label: "Phone", data_type: "string" },
      { key: "is_active", label: "Active Status", data_type: "boolean" },
    ]
  },
    service_providers: {
    displayName: "Service Providers Master",

    columns: [
      { key: "product", label: "Product Name", data_type: "string" },
      { key: "product_code", label: "Product Code", data_type: "string" },
      { key: "vendor", label: "Vendor", data_type: "string" },
      { key: "services", label: "Product Type", data_type: "string" },
      { key: "approved", label: "Approved By", data_type: "boolean" },
      { key: "description", label: "Description", data_type: "string" },
      { key: "is_vat", label: "VAT Applicable", data_type: "boolean" },
      { key: "is_inventory", label: "Inventory Type", data_type: "boolean" },
      // { key: "is_icann", label: "ICANN Applicable", data_type: "boolean" },
      // { key: "icann_fee", label: "ICANN Fee", data_type: "number" },
      { key: "is_active", label: "Active Status", data_type: "boolean" },
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
        { key: "bc_code", label: "Term Code", data_type: "number" },
        { key: "description", label: "Description", data_type: "string" },
        { key: "is_active", label: "Is Active", data_type: "boolean" },
    ]
  },
   payment_method:{
    displayName: "Payment Methods Master",

    columns: [
        { key: "method_name", label: "Payment Method", data_type: "string" },
        { key: "pm_code", label: "Payment Method Code", data_type: "string" },
        { key: "description", label: "Description", data_type: "string" },
        { key: "is_active", label: "Is Active", data_type: "boolean" },
        
        
    ]
  },
  company: {
    displayName: "Company Master",
    columns: [
      { key: "company_code", label: "Company Code", data_type: "string" },
      { key: "licence_no", label: "Licence Number", data_type: "string" },
      { key: "sector_brand", label: "Sector/Brand", data_type: "string" },
      { key: "trade_name", label: "Company Name", data_type: "string" },
      { key: "address", label: "Address", data_type: "string" },
      { key: "area", label: "Location", data_type: "string" },
      { key: "emirate", label: "Emirate", data_type: "string" },
      { key: "country", label: "Country", data_type: "string" },
      { key: "email", label: "Email", data_type: "string" },
      { key: "phn_number", label: "Phone", data_type: "string" },
      { key: "description", label: "Description", data_type: "string" },
      { key: "issue_date", label: "Issue Date", data_type: "datetime" },
      { key: "expiry_date", label: "Expiry Date", data_type: "datetime" },
      { key: "trn", label: "TRN", data_type: "string" }
    ]
  },
   services: {
    displayName: "Services Master",

    columns: [
      { key: "service_name", label: "Name", data_type: "string" },
      { key: "service_code", label: "ServiceCode", data_type: "string" },
      { key: "description", label: "Description", data_type: "string" },
      { key: "is_active", label: "Active Status", data_type: "boolean" },
    ]
  },
   credit_card: {
    displayName: "Credit Cards Master",
    columns: [
      { key: "cc_code", label: "Card Code", data_type: "string" },
      { key: "card_holder_name", label: "Cardholder Name", data_type: "string" },
      { key: "card_4number", label: "Card Number - Last 4 Digits", data_type: "string" },
      { key: "card_brand", label: "Card Brand", data_type: "string" },
      { key: "expiry_date", label: "Expiry Date", data_type: "datetime" },
      { key: "description", label: "Description", data_type: "string" },
      { key: "billing_address", label: "Billing Address", data_type: "string" }
    ]
  },
  plans: {
    displayName: "Plans Master",
    columns: [
      { key: "plan_name", label: "Plan Name", data_type: "string" },
      { key: "plan_code", label: "Plan Code", data_type: "string" },
      { key: "description", label: "Description", data_type: "string" },
      { key: "is_active", label: "Active Status", data_type: "boolean" },
    ]
  },
   department: {
    displayName: "Department Master",
    columns: [
      { key: "department_name", label: "Department Name", data_type: "string" },
      { key: "department_code", label: "Department Code", data_type: "string" },
      { key: "description", label: "Description", data_type: "string" },
      { key: "is_active", label: "Active Status", data_type: "boolean" },
    ]
  },
   division: {
    displayName: "Division Master",
    columns: [
      { key: "division_name", label: "Division Name", data_type: "string" },
      { key: "division_code", label: "Division Code", data_type: "string" },
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
   },
    transaction_types:{
    displayName: "Payment Methods Master",

    columns: [
        { key: "transaction_name", label: "Transaction Name", data_type: "string" },
        { key: "transaction_code", label: "Transaction Code", data_type: "string" },
        { key: "description", label: "Description", data_type: "string" },
        { key: "is_active", label: "Is Active", data_type: "boolean" },     
    ]
  },
  inventory_types:{
    displayName: "Inventory Types Master",

    columns: [
        { key: "inventory_type", label: "Inventory Name", data_type: "string" },
        { key: "inventory_type_code", label: "Inventory Code", data_type: "string" },
        { key: "description", label: "Description", data_type: "string" },
        { key: "is_active", label: "Is Active", data_type: "boolean" },     
    ]
  },

   projects:{
    displayName: "Projects Master",

    columns: [
        { key: "project_name", label: "Project Name", data_type: "string" },
        { key: "project_code", label: "Project Code", data_type: "string" },
        { key: "description", label: "Description", data_type: "string" },
        { key: "address", label: "Address", data_type: "string" },
        { key: "is_active", label: "Is Active", data_type: "boolean" },     
    ]
  },
};

export default masterTableConfig;