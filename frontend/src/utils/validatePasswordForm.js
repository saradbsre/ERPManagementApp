export const validatePasswordForm = (data) => {
  const errors = {};

  if (!data.oldPassword) {
    errors.oldPassword = "Old password is required";
  }

  if (!data.password) {
    errors.password = "Password is required";
  } else if (data.password.length < 6) {
    errors.password = "Password must be at least 6 characters";
  } else if (!/[A-Z]/.test(data.password)) {
    errors.password = "Must contain at least 1 uppercase letter";
  } else if (!/[0-9]/.test(data.password)) {
    errors.password = "Must contain at least 1 number";
  }

  if (!data.confirmPassword) {
    errors.confirmPassword = "Please confirm your password";
  } else if (data.password !== data.confirmPassword) {
    errors.confirmPassword = "Passwords do not match";
  }

  return errors;
};