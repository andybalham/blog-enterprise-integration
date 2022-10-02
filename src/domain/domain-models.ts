export interface QuoteRequest {
  personalDetails: PersonalDetails;
  loanDetails: LoanDetails;
}

export interface QuoteResponse {
  lenderId: string;
  bestRate: number;
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
  lenderName: string;
  isEnabled: boolean;
}
