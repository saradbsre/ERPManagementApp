import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api/itasset",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,   // 🔥 ADD THIS
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const registerUser = (data) => {
  return API.post("/auth/register", data);
};

export const loginUser = (data) => {
  return API.post("/auth/login", data);
};

export const fetchUsers = () => {
  return API.get("/users");
};

export const fetchRoles = () => {
  return API.get("/roles");
};


export const confirmRequest = (id, isCancel, email, activeUserEmail) => {
  const endpoint = isCancel
    ? `/users/${id}/confirm`
    : `/users/${id}/cancel`;
    console.log("API Call:", endpoint, { email, activeUserEmail });

  return API.post(endpoint, {
    isCancel,
    email,
    activeUserEmail
  });
};


export const toggleUserStatus = (id, status, email, activeUserEmail) => {
  const endpoint = status
    ? `/users/${id}/activate`
    : `/users/${id}/deactivate`;

  return API.post(endpoint, { email, activeUserEmail });
};



export const updateUserRole = (id, data) => {
  return API.post(`/users/${id}/role`, data);
};

export const updateUserPermissions = (id, data) => {
  return API.post(`/users/${id}/permissions`, data);
};

export const createRole = (data) => {
  return API.post("/roles", data);
};

export const updateRole = (role, data) => {
  return API.put(`/roles/${role}`, data);
};

export const signupRequest = (data) => {
    return API.get(`/signup-requests`, data);
}

export const upsertModule = (data) => {
  return API.post("/modules", data);
}

export const upsertModuleColumn = (data) => {
  return API.post("/columns", data);
}

export const fetchSections = () => {
  return API.get("/sections");
}

export const getModuleData = (moduleId, activeUserEmail, filters = {}) => {
  return API.get(`/module-data/${moduleId}`, {
    params: {
      activeUserEmail,
      search: filters.search || "",
      filters: filters.filters || "[]",
      dateFilters: filters.dateFilters || "{}"
    }
  });
};

export const createModuleRow = (moduleId, data, activeUserEmail) => {
  return API.post(`/module-data/${moduleId}`, data, {
    params: { activeUserEmail }
  });
}

export const updateModuleRow = (moduleId, rowId, data, activeUserEmail) => {
  return API.put(`/module-data/${moduleId}/${rowId}`, data, {
    params: { activeUserEmail }
  });
}

export const deleteModuleRow = (moduleId, rowId, activeUserEmail) => {
  return API.delete(`/module-data/${moduleId}/${rowId}`, {
    params: { activeUserEmail }
  });
}

export const cancelModuleRow = (moduleId, rowId, activeUserEmail) => {
  return API.delete(`/module-data/${moduleId}/${rowId}/cancel`, {
    params: { activeUserEmail }
  });
}

export const undoCancelModuleRow = (moduleId, rowId, activeUserEmail) => {
  return API.post(`/module-data/${moduleId}/${rowId}/undo-cancel`, {}, {
    params: { activeUserEmail }
  });
}


export const exportColumnNames = (moduleId) => {
  return API.get(`/export-columns/${moduleId}`, {
    responseType: "blob"
  });
};

export const importTable = (moduleId, file, activeUserEmail) => {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("module_id", moduleId);
  formData.append("userid", localStorage.getItem("username")); // better name than username

  return API.post(`/import-table/${moduleId}`, formData, {
  headers: {
    "Content-Type": "multipart/form-data",
  },
  params: { activeUserEmail }
});
};

export const fetchMasters = () => {
  return API.get("/masters");
};

export const getMasterData = (masterName, activeUserEmail) => {
  return API.get(`/masters/${masterName}`, {
    params: { activeUserEmail }
  });
}

export const dataTypes = () => {
  return API.get("/data-types");
}

export const currencises = () => {
  return API.get("/currencies");
}

export const billingCycle = () => {
  return API.get("/billing-cycle");
}

export const getMasterValues = (master) => {
  return API.get(`/master-data?master=${master}`);
};

export const exportPdf = (data) => {
  return API.post("/pdf", data, {
    responseType: "blob",
  });
};

export const createMasterData = (masterName, data, activeUserEmail) => {
  return API.post(`/masters/${masterName}`, data, {
    params: { activeUserEmail }
  });
}

export const updateMasterData = (masterName, id, data, activeUserEmail) => {
  return API.put(`/masters/${masterName}/${id}`, data, {
    params: { activeUserEmail }
  });
}

export const deleteMasterData = (masterName, id, activeUserEmail) => {
  return API.delete(`/masters/${masterName}/${id}`, {
    data: { activeUserEmail }
  });
}

export const getTopExpensiveAssets = () => {
  return API.get("/top-expensive-assets");
}

export const getAlertData = () => {
  return API.get("/alerts");
}

export const getRecentTransactions = () => {
  return API.get("/recent-transactions");
}

export const getLogs = (params = {}) => {
  return API.get("/logs", { params });
};

export const logOut = () => {
  return API.post(
    "/auth/logout",
    {},
    {
      withCredentials: true
    }
  );
};

export const forgetPassword = (payload) => {
  return API.post("/forgot-password", payload);
};

export const fetchForgotPasswordReqs = () => {
  return API.get("/forgot-password-requests");
}

export const resetPassword = (data) => {
  return API.post("/auth/reset-password", data);
};

export const saveProviderPlans = (data) => {
  return API.post("/providers/plans", data);
}

export const getProviderPlans = (providerId) => {
  return API.get(`/providers/${providerId}/plans`);
}

export const upsertSavedFilter = (payload) => {
  return API.post(`/saved-filters/${payload.userId}`, payload);
}

export const getReportsName = (activeUserEmail, reportId) => {
  return API.get("/reports", {
    params: {
      activeUserEmail,
      reportId
    }
  });
};

export const getFilteredReports = (data) => {
  return API.post("/reports/data", data);
};

export const getCustomizedColumns = (moduleId, activeUserEmail, reportId = null) => {
  return API.get(`/custom-columns/${moduleId}`, {
    params: {
      module_id: moduleId,
      user_id: activeUserEmail,
      report_id: reportId
    }
  });
};

export const getReportCustomizedColumns = (reportId, activeUserEmail, moduleId = null) => {
  return API.get(`/custom-columns/${reportId}`, {
    params: {
      module_id: moduleId,
      user_id: activeUserEmail,
      report_id: reportId
    }
  });
};

export const upsertCustomizedColumns = (moduleId, userId, columns, reportId = null) => {
  return API.post(`/custom-columns/${moduleId}`, {
    module_id: moduleId,
    user_id: userId,
    report_id: reportId,
    columns
  });
};

export const upsertReportCustomizedColumns = (reportId, userId, columns, moduleId = null) => {
  return API.post(`/custom-columns/${reportId}`, {
    module_id: moduleId,
    user_id: userId,
    report_id: reportId,
    columns
  });
};

export const addMasterData = (masterName,value) => {
  return API.post(`/masters/${masterName}/add`, {
    master_name: masterName,
    value
  });
}

export const createPaymentRequest = (data, activeUserEmail) => {
  return API.post("/payment-requests", data, {
    params: { activeUserEmail }
  });
}

export const getPaymentRequests = (activeUserEmail, startDate, endDate) => {
  return API.get("/payment-requests", {
    params: { activeUserEmail, startDate, endDate }
  });
}

export const getLastPRFNumber = () => {
  return API.get("/last-prf-number");
}

export const updatePaymentRequest = (id, data, activeUserEmail) => {
  return API.put(`/payment-requests/${id}`, data, {
    params: { activeUserEmail }
  });
}

export const deletePaymentRequest = (id, activeUserEmail) => {
  return API.delete(`/payment-requests/${id}`, {
    params: { activeUserEmail }
  });
}

export const getUserbyemail = (email) => {
  return API.get(`/users/profile/${email}`);
};

export const changePassword = (data, activeUserEmail) => {
  return API.post("/users/profile/change-password", data, {
    params: { activeUserEmail }
  });
}

export const updateUserProfile = (email, data) => {
  return API.put(`/users/profile/${email}`, data);
};

export const sessionHeartbeat = (email) => {
  return API.post("/auth/heartbeat", { email });
};

export const getDbStatus = () => {
  return API.get("/db-status");
};

export const updateGenarateStatus = (prfNum, activeUserEmail) => {
  return API.put(
    `/payment-requests/${encodeURIComponent(prfNum)}/generate`,
    {},
    {
      params: { activeUserEmail }
    }
  );
};

export const getVatPercentage = () => {
  return API.get("/vat-percentage");
};

export const getApprovalWorkflow = () => {
  return API.get("/approval-workflow");
};

export const createprf = (data,activeUserEmail, selectedRow) => {
  return API.post("/create-prf", data, {
    params: { activeUserEmail, selectedRow }
  });
};