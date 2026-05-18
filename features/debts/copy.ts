/** User-facing labels for who the debt is with (people, companies, orgs, etc.). */

export const DEBT_NAME_LABEL = 'Name';
export const DEBT_NAMES_LABEL = 'Names';

export const DEBT_NAME_PLACEHOLDER = 'Person, company, or organization';

export function debtNameSplitPlaceholder(index: number): string {
  return `Name ${index + 1}`;
}

export const ADD_DEBT_NAME_LABEL = 'Add name';

export const ENTER_DEBT_NAME = 'Enter a name.';

export const ENTER_TWO_NAMES_TO_SPLIT = 'Enter at least two names to split across.';

export const ADD_AT_LEAST_ONE_NAME = 'Add at least one name.';

export const RECEIPT_NAME_LABEL = DEBT_NAME_LABEL;

export function formatShareNameLine(name: string): string {
  return `${DEBT_NAME_LABEL}: ${name}`;
}
