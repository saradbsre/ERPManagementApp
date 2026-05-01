export const hasPermission = (user, key) => {
  // console.log("Checking permission for user:", user?.email, "Key:", key);
  // console.log("User permissions:", user);
  if (!user?.permissions) return false;
  const result = !!user.permissions[key];
  //console.log("Permission result for", key, ":", result);
  return result;
};