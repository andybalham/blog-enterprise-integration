export interface QuoteRequest {
  personalDetails: PersonalDetails;
  loanDetails: LoanDetails;
}

export interface LenderRate {
  lenderId: string;
  lenderName: string;
  rate?: number;
}

export interface LoanDetails {
  amount: number;
  termMonths: number;
}

export interface PersonalDetails {
  firstName: string;
  lastName: string;
  niNumber: string;
  address: Address;
}

export interface Address {
  lines: string[];
  postcode: string;
}

export interface CreditReport {
  reportReference: string;
  onElectoralRoll: boolean;
  hasBankruptcies: boolean;
  creditScore: number;
}

export interface LenderRegisterEntry {
  lenderId: string;
  isEnabled: boolean;
}
