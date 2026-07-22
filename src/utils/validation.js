export const validators = {
  required: (msg) => (v) => (v == null || v === '') ? msg : null,
  minLength: (n, msg) => (v) => (!v || v.length < n) ? msg : null,
  maxLength: (n, msg) => (v) => (v && v.length > n) ? msg : null,
  pattern: (rx, msg) => (v) => (v && !rx.test(v)) ? msg : null,
  email: (msg) => (v) => (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) ? msg : null,
  oneOf: (options, msg) => (v) => (v && !options.includes(v)) ? msg : null,
  matches: (other, msg) => (v, fields) => (v !== fields[other]) ? msg : null,
};

export function validate(fields, rules) {
  const errors = {};
  for (const [field, fieldRules] of Object.entries(rules)) {
    for (const rule of Array.isArray(fieldRules) ? fieldRules : [fieldRules]) {
      const err = rule(fields[field], fields);
      if (err) {
        errors[field] = err;
        break;
      }
    }
  }
  return { valid: Object.keys(errors).length === 0, errors };
}
