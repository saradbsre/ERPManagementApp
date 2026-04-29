import { hasPermission } from "../utils/permissions";

export default function PermissionButton({
  user,
  permission,
  onClick,
  children,
  className = ""
}) {
  if (!hasPermission(user, permission)) return null;
  console.log("Rendering PermissionButton for permission:", permission); // Debug log

  return (
    <button
      onClick={onClick}
      className={className}
    >
      {children}
    </button>
  );
}