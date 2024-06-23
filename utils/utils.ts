export const validatePhoneNumber = (phoneNumber: unknown): boolean => {
  const phoneNumberPattern =
    /^(\+1\s)??(1\s)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;
  if (typeof phoneNumber !== "string") {
    return false;
  }
  if (phoneNumberPattern.test(phoneNumber)) {
    return true;
  }
  return false;
};

export const validateEmailFormat = (email: unknown): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (typeof email !== "string") {
    return false;
  }
  return emailRegex.test(email);
};

export const validateZipCode = (zipCode: unknown): boolean => {
  if (typeof zipCode !== "string") {
    return false;
  }
  const zipCodePattern = /^[0-9]{5}$/;
  return zipCodePattern.test(zipCode);
};
