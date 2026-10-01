import type { FormField } from './types';

/**
 * Safely parses and evaluates basic math expressions containing field tokens like {field_id}.
 * Supports +, -, *, /, parentheses, and helper tokens.
 * Avoids eval() for maximum security.
 */

function tokenize(expr: string): string[] {
  const tokens: string[] = [];
  let current = '';

  for (let i = 0; i < expr.length; i++) {
    const char = expr[i];

    if (/\s/.test(char)) {
      continue;
    }

    if (['+', '-', '*', '/', '(', ')'].includes(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      tokens.push(char);
    } else {
      current += char;
    }
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

// Simple Shunting-yard algorithm to evaluate infix expressions safely
function evaluateInfix(tokens: string[]): number {
  const values: number[] = [];
  const ops: string[] = [];

  const precedence = (op: string) => {
    if (op === '+' || op === '-') return 1;
    if (op === '*' || op === '/') return 2;
    return 0;
  };

  const applyOp = (op: string, b: number, a: number) => {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return b !== 0 ? a / b : 0;
      default: return 0;
    }
  };

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (!isNaN(Number(token))) {
      values.push(Number(token));
    } else if (token === '(') {
      ops.push(token);
    } else if (token === ')') {
      while (ops.length > 0 && ops[ops.length - 1] !== '(') {
        const op = ops.pop()!;
        const b = values.pop() ?? 0;
        const a = values.pop() ?? 0;
        values.push(applyOp(op, b, a));
      }
      ops.pop(); // remove '('
    } else if (['+', '-', '*', '/'].includes(token)) {
      while (
        ops.length > 0 &&
        precedence(ops[ops.length - 1]) >= precedence(token)
      ) {
        const op = ops.pop()!;
        const b = values.pop() ?? 0;
        const a = values.pop() ?? 0;
        values.push(applyOp(op, b, a));
      }
      ops.push(token);
    }
  }

  while (ops.length > 0) {
    const op = ops.pop()!;
    const b = values.pop() ?? 0;
    const a = values.pop() ?? 0;
    values.push(applyOp(op, b, a));
  }

  return values[0] ?? 0;
}

/**
 * Evaluates formula for a calculated field.
 * Example formula: "{score1} * 0.4 + {score2} * 0.6"
 */
export function evaluateFormula(
  formula: string,
  formValues: Record<string, unknown>
): number {
  if (!formula || typeof formula !== 'string') return 0;

  // Replace tokens like {field_id} with their numeric values
  let resolvedFormula = formula.replace(/\{([a-zA-Z0-9_-]+)\}/g, (_, fieldId) => {
    const raw = formValues[fieldId];
    const num = Number(raw);
    return isNaN(num) ? '0' : String(num);
  });

  try {
    const tokens = tokenize(resolvedFormula);
    const result = evaluateInfix(tokens);
    return isNaN(result) ? 0 : Number(result.toFixed(2));
  } catch (err) {
    console.warn('Formula evaluation error:', err);
    return 0;
  }
}

/**
 * Updates all calculated fields in a form given current form values.
 */
export function updateCalculatedValues(
  fields: FormField[],
  formValues: Record<string, unknown>
): Record<string, unknown> {
  const updated = { ...formValues };

  fields.forEach((field) => {
    if (field.config?.formula) {
      updated[field.id] = evaluateFormula(field.config.formula, updated);
    }
  });

  return updated;
}
