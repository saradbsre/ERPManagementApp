import { data } from "react-router-dom";

const masterTableConfig = {
  currency: {
    displayName: "Currency Master",

    columns: [
      { key: "curr_name", label: "Currency", data_type: "string" },
      { key: "curr_code", label: "Currency Code", data_type: "string", is_code: true },
      { key: "curr_descr", label: "Description", data_type: "string" },
      { key: "curr_country", label: "Country", data_type: "string" },
      { key: "curr_exchange_rate", label: "Exchange Rate", data_type: "number" },
      { key: "curr_is_active", label: "Active Status", data_type: "boolean" },
    ]
  },

  vendors: {
    displayName: "Vendors Master",

    columns: [
      { key: "vend_name", label: "Vendor Name", data_type: "string" },
      { key: "vend_code", label: "Vendor Code", data_type: "string", is_code: true },
      { key: "vend_descr", label: "Description", data_type: "string" },
      { key: "vend_website", label: "Website", data_type: "string" },
      { key: "vend_is_vat", label: "VAT Applicable", data_type: "boolean" },
      { key: "vend_address", label: "Address", data_type: "string" },
      { key: "vend_state", label: "State", data_type: "string" },
      { key: "vend_country", label: "Country", data_type: "string" },
      { key: "vend_email", label: "Email", data_type: "string" },
      { key: "vend_phn", label: "Phone", data_type: "string" },
      { key: "vend_trn", label: "TRN", data_type: "string" },
      { key: "vend_is_active", label: "Active Status", data_type: "boolean" },
    ]
  },
    products: {
    displayName: "Products Master",

    columns: [
      { key: "prd_name", label: "Product Name", data_type: "string" },
      { key: "prd_code", label: "Product Code", data_type: "string", is_code: true },
      { key: "vend_code", label: "Vendor", data_type: "string" },
      { key: "prdtype_code", label: "Product Type", data_type: "string" },
      { key: "prd_approved", label: "Approved By", data_type: "boolean" },
      { key: "prd_descr", label: "Description", data_type: "string" },
      { key: "prd_is_vat", label: "VAT Applicable", data_type: "boolean" },
      { key: "prd_is_inventory", label: "Inventory Type", data_type: "boolean" },
      { key: "prd_is_active", label: "Active Status", data_type: "boolean" },
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
        { key: "billcycle_name", label: "Term Name", data_type: "string" },
        { key: "billcycle_code", label: "Term Code", data_type: "number", is_code: true },
        { key: "billcycle_descr", label: "Description", data_type: "string" },
        { key: "billcycle_is_active", label: "Is Active", data_type: "boolean" },
    ]
  },
   payment_method:{
    displayName: "Payment Methods Master",

    columns: [
        { key: "method_name", label: "Payment Method", data_type: "string" },
        { key: "pm_code", label: "Payment Method Code", data_type: "string", is_code: true },
        { key: "pm_descr", label: "Description", data_type: "string" },
        { key: "pm_is_active", label: "Is Active", data_type: "boolean" },
        
        
    ]
  },
  company: {
    displayName: "Company Master",
    columns: [
      { key: "com_name", label: "Company Name", data_type: "string" },
      { key: "com_code", label: "Company Code", data_type: "string", is_code: true },
      { key: "com_licence", label: "Licence Number", data_type: "string" },
      { key: "com_sector", label: "Sector/Brand", data_type: "string" },
      { key: "com_address", label: "Address", data_type: "string" },
      { key: "com_area", label: "Location", data_type: "string" },
      { key: "com_state", label: "State", data_type: "string" },
      { key: "com_country", label: "Country", data_type: "string" },
      { key: "com_email", label: "Email", data_type: "string" },
      { key: "com_phn", label: "Phone", data_type: "string" },
      { key: "com_descr", label: "Description", data_type: "string" },
      { key: "com_issue_dt", label: "Issue Date", data_type: "datetime" },
      { key: "com_expiry_dt", label: "Expiry Date", data_type: "datetime" },
      { key: "com_trn", label: "TRN", data_type: "string" },
      { key: "com_is_active", label: "Active Status", data_type: "boolean" },
    ]
  },
   product_types: {
    displayName: "Product Types Master",

    columns: [
      { key: "prdtype_name", label: "Name", data_type: "string" },
      { key: "prdtype_code", label: "Product Type Code", data_type: "string", is_code: true },
      { key: "prdtype_descr", label: "Description", data_type: "string" },
      { key: "prdtype_is_active", label: "Active Status", data_type: "boolean" },
    ]
  },
   credit_card: {
    displayName: "Credit Cards Master",
    columns: [
      { key: "crcd_holder_name", label: "Cardholder Name", data_type: "string" },
      { key: "crcd_code", label: "Card Code", data_type: "string", is_code: true },
      { key: "crcd_last4num", label: "Card Number - Last 4 Digits", data_type: "string" },
      { key: "crcd_type", label: "Card Type", data_type: "string" },
      { key: "crcd_expiry_dt", label: "Expiry Date", data_type: "datetime" },
      { key: "crcd_descr", label: "Description", data_type: "string" },
      { key: "crcd_billaddress", label: "Billing Address", data_type: "string" }
    ]
  },
  plans: {
    displayName: "Plans Master",
    columns: [
      { key: "plan_name", label: "Plan Name", data_type: "string" },
      { key: "plan_code", label: "Plan Code", data_type: "string", is_code: true },
      { key: "plan_descr", label: "Description", data_type: "string" },
      { key: "plan_is_active", label: "Active Status", data_type: "boolean" },
    ]
  },
   department: {
    displayName: "Department Master",
    columns: [
      { key: "dep_name", label: "Department Name", data_type: "string" },
      { key: "dep_code", label: "Department Code", data_type: "string", is_code: true },
      { key: "dep_descr", label: "Description", data_type: "string" },
      { key: "dep_is_active", label: "Active Status", data_type: "boolean" },
    ]
  },
   division: {
    displayName: "Division Master",
    columns: [
      { key: "dv_name", label: "Division Name", data_type: "string" },
      { key: "dv_code", label: "Division Code", data_type: "string", is_code: true },
      { key: "dv_descr", label: "Description", data_type: "string" },
      { key: "dv_is_active", label: "Active Status", data_type: "boolean" },
    ]
  },
  providers: {
    displayName: "Providers Master",
    columns: [
      { key: "provider_name", label: "Provider Name", data_type: "string" },
      { key: "provider_code", label: "Provider Code", data_type: "string", is_code: true },
      { key: "provider_type", label: "Provider Type", data_type: "string" },
      { key: "website", label: "Website", data_type: "string" },
      { key: "support_email", label: "Support Email", data_type: "string" },
      { key: "provider_is_active", label: "Active Status", data_type: "boolean" },
    ]
   },
    transaction_types:{
    displayName: "Transaction Types Master",

    columns: [
        { key: "trntype_name", label: "Transaction Name", data_type: "string" },
        { key: "trntype_code", label: "Transaction Code", data_type: "string", is_code: true },
        { key: "trntype_descr", label: "Description", data_type: "string" },
        { key: "trntype_is_active", label: "Is Active", data_type: "boolean" },     
    ]
  },
  inventory_types:{
    displayName: "Inventory Types Master",

    columns: [
        { key: "inventory_type", label: "Inventory Name", data_type: "string" },
        { key: "inventory_type_code", label: "Inventory Code", data_type: "string", is_code: true },
        { key: "inventory_type_descr", label: "Description", data_type: "string" },
        { key: "inventory_type_is_active", label: "Is Active", data_type: "boolean" },     
    ]
  },

   projects:{
    displayName: "Projects Master",

    columns: [
        { key: "prj_name", label: "Project Name", data_type: "string" },
        { key: "prj_code", label: "Project Code", data_type: "string", is_code: true },
        { key: "prj_descr", label: "Description", data_type: "string" },
        { key: "prj_address", label: "Address", data_type: "string" },
        { key: "prj_is_active", label: "Is Active", data_type: "boolean" },     
    ]
  },
};

export default masterTableConfig;