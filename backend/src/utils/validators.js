import ApiError from "./ApiError.js";

// Null-safe design: all helpers allow undefined/null through so existing
// presence checks (!field) keep their original error messages unchanged.
// They only throw when the value IS present but is the wrong type —
// the exact case an attacker exploits with { "$ne": null } payloads.

export const requireString = (value, field) => {
  if (value !== undefined && value !== null && typeof value !== "string") {
    throw new ApiError(400, `${field} must be a string.`);
  }
};

export const requireNumber = (value, field) => {
  if (value !== undefined && value !== null && typeof value !== "number") {
    throw new ApiError(400, `${field} must be a number.`);
  }
};

// Rejects non-integers (objects, floats, strings).
// Complements existing Number.isInteger() checks — does not replace them.
export const requireInteger = (value, field) => {
  if (value !== undefined && value !== null && !Number.isInteger(value)) {
    throw new ApiError(400, `${field} must be an integer.`);
  }
};

// Only checks typeof — ObjectId format/validity is handled by existing code.
export const requireObjectId = (value, field) => {
  if (value !== undefined && value !== null && typeof value !== "string") {
    throw new ApiError(400, `${field} must be a valid identifier.`);
  }
};

export const requireBoolean = (value, field) => {
  if (value !== undefined && value !== null && typeof value !== "boolean") {
    throw new ApiError(400, `${field} must be a boolean.`);
  }
};
