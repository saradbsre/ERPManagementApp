export const FILTER_OPERATORS = {
  text: [
    { label: "Contains", value: "contains" },
    { label: "Does not contain", value: "not_contains" },
    { label: "Is", value: "is" },
    { label: "Is not", value: "is_not" },
    { label: "Is empty", value: "empty" },
    { label: "Is not empty", value: "not_empty" }
  ],

  number: [
    { label: "Equals", value: "eq" },
    { label: "Not equals", value: "neq" },
    { label: "Greater than", value: "gt" },
    { label: "Less than", value: "lt" },
    { label: "Between", value: "between" }
  ],

  date: [
    { label: "Is", value: "is" },
    { label: "Before", value: "before" },
    { label: "After", value: "after" },
    { label: "Between", value: "between" }
  ]
};