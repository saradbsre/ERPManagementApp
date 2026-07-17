import { hasPermission } from "../utils/permissions";

export default function PermissionButton({
  user,
  permission,
  onClick,
  children,
  className = "",
  title = "",
}) {
  if (!hasPermission(user, permission)) return null;
 // console.log("Rendering PermissionButton for permission:", permission); // Debug log

  return (
    <button
      onClick={onClick}
      className={className}
      title={title}
    >
      {children}
    </button>
  );
}