import { useState, useCallback } from 'react';
import { validate } from '@/utils/validation.js';

export function useFormValidation(initialValues, rules) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const setField = useCallback((name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    if (touched[name]) {
      const fieldRules = rules[name];
      if (fieldRules) {
        const fieldErrors = [];
        for (const rule of Array.isArray(fieldRules) ? fieldRules : [fieldRules]) {
          const err = rule(value, { ...values, [name]: value });
          if (err) { fieldErrors.push(err); break; }
        }
        setErrors((prev) => ({ ...prev, [name]: fieldErrors[0] || null }));
      }
    }
  }, [rules, touched, values]);

  const setTouchedField = useCallback((name) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
    const fieldRules = rules[name];
    if (fieldRules) {
      const fieldErrors = [];
      for (const rule of Array.isArray(fieldRules) ? fieldRules : [fieldRules]) {
        const err = rule(values[name], values);
        if (err) { fieldErrors.push(err); break; }
      }
      setErrors((prev) => ({ ...prev, [name]: fieldErrors[0] || null }));
    }
  }, [rules, values]);

  const validateAll = useCallback(() => {
    const result = validate(values, rules);
    const allTouched = {};
    Object.keys(rules).forEach((k) => { allTouched[k] = true; });
    setTouched(allTouched);
    setErrors(result.errors);
    return result.valid;
  }, [values, rules]);

  const reset = useCallback((newValues) => {
    setValues(newValues || initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return { values, errors, touched, setField, setTouchedField, validateAll, reset, setValues };
}
