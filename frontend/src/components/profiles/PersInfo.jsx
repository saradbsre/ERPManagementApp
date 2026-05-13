import React, { useEffect, useState } from "react";
import {
  User,
  Mail,
  Phone,
  Shield,
  Calendar
} from "lucide-react";

import { getUserbyemail } from "../../api/api";

const UserProfileCard = () => {

  const [user, setUser] = useState(null);
  console.log("UserProfileCard rendered with user:", user);
  useEffect(() => {

    const fetchUser = async () => {

      try {

        // ✅ get logged user
        const activeUser = JSON.parse(
          localStorage.getItem("user")
        );

        const activeUserEmail = activeUser?.email;

        if (!activeUserEmail) return;

        // ✅ API call
        const res = await getUserbyemail(activeUserEmail);

        setUser(res?.data?.[0] || res?.data);

      } catch (err) {
        console.error("Failed to fetch user:", err);
      }
    };

    fetchUser();

  }, []);

  const formatDate = (date) => {

    if (!date) return "-";

    const d = new Date(date);

    if (isNaN(d.getTime())) return date;

    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
  };

  return (
    <div className="bg-white shadow-md rounded-2xl p-6 border border-gray-200 w-full max-w-md">

      {/* HEADER */}
      <div className="flex flex-col items-center mb-6">

        <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
          <User size={40} />
        </div>

        <h2 className="mt-4 text-2xl font-bold text-gray-800">
          {user?.name || "User"}
        </h2>

        <p className="text-sm text-gray-500">
          {user?.role || "-"}
        </p>
      </div>

      {/* DETAILS */}
      <div className="space-y-4">

        <div className="flex items-center gap-3">
          <Mail className="text-blue-500" size={18} />

          <div>
            <p className="text-xs text-gray-500">
              Email
            </p>

            <p className="text-sm font-medium text-gray-800">
              {user?.email || "-"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Phone className="text-green-500" size={18} />

          <div>
            <p className="text-xs text-gray-500">
              Phone Number
            </p>

            <p className="text-sm font-medium text-gray-800">
              {user?.phone_number || "-"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Shield className="text-purple-500" size={18} />

          <div>
            <p className="text-xs text-gray-500">
              Role
            </p>

            <p className="text-sm font-medium text-gray-800">
              {user?.role || "-"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Calendar className="text-orange-500" size={18} />

          <div>
            <p className="text-xs text-gray-500">
              Joined At
            </p>

            <p className="text-sm font-medium text-gray-800">
              {/* {formatDate(user?.created_at)} */}
              {user?.created_at ? formatDate(user.created_at) : "-"}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default UserProfileCard;