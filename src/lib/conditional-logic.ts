import type { FormField, ConditionalRule } from './types';

/**
 * Evaluates whether a single conditional rule passes given the current form values.
 */
export function evaluateRule(rule: ConditionalRule, formValues: Record<string, unknown>): boolean {
  const rawValue = formValues[rule.fieldId];
  const targetValue = rule.value;

  // Normalize value for string/number comparison
  const strRaw = rawValue !== undefined && rawValue !== null ? String(rawValue).trim().toLowerCase() : '';
  const strTarget = targetValue !== undefined && targetValue !== null ? String(targetValue).trim().toLowerCase() : '';

  switch (rule.operator) {
    case 'equals':
      return strRaw === strTarget;

    case 'not_equals':
      return strRaw !== strTarget;

    case 'contains':
      if (Array.isArray(rawValue)) {
        return rawValue.some((item) => String(item).toLowerCase().includes(strTarget));
      }
      return strRaw.includes(strTarget);

    case 'greater_than': {
      const numRaw = Number(rawValue);
      const numTarget = Number(targetValue);
      return !isNaN(numRaw) && !isNaN(numTarget) && numRaw > numTarget;
    }

    case 'less_than': {
      const numRaw = Number(rawValue);
      const numTarget = Number(targetValue);
      return !isNaN(numRaw) && !isNaN(numTarget) && numRaw < numTarget;
    }

    case 'is_empty':
      if (Array.isArray(rawValue)) return rawValue.length === 0;
      if (typeof rawValue === 'object' && rawValue !== null) return Object.keys(rawValue).length === 0;
      return strRaw === '';

    case 'is_not_empty':
      if (Array.isArray(rawValue)) return rawValue.length > 0;
      if (typeof rawValue === 'object' && rawValue !== null) return Object.keys(rawValue).length > 0;
      return strRaw !== '';

    default:
      return true;
  }
}

/**
 * Determines if a field should be visible.
 * Rules attached to the field itself (field.config.conditions) or pointing to it via targetFieldId.
 */
export function isFieldVisible(
  field: FormField,
  allFields: FormField[],
  formValues: Record<string, unknown>
): boolean {
  // Check conditions configured directly on the field
  const localConditions = field.config.conditions || [];

  // Also check if any other field's conditions target this field
  const externalConditions: ConditionalRule[] = [];
  allFields.forEach((other) => {
    if (other.id !== field.id && other.config.conditions) {
      other.config.conditions.forEach((c) => {
        if (c.targetFieldId === field.id) {
          externalConditions.push(c);
        }
      });
    }
  });

  const allRules = [...localConditions, ...externalConditions];
  if (allRules.length === 0) return true;

  // Evaluate rules
  for (const rule of allRules) {
    const isMatched = evaluateRule(rule, formValues);
    if (rule.action === 'show' && !isMatched) {
      return false;
    }
    if (rule.action === 'hide' && isMatched) {
      return false;
    }
  }

  return true;
}

/**
 * Determines if a field is required, considering dynamic rules.
 */
export function isFieldDynamicallyRequired(
  field: FormField,
  formValues: Record<string, unknown>
): boolean {
  if (field.required) return true;

  const conditions = field.config.conditions || [];
  for (const rule of conditions) {
    if (rule.action === 'require' && evaluateRule(rule, formValues)) {
      return true;
    }
  }

  return false;
}
