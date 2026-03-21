export interface ContractValidationError {
  instancePath?: string;
  schemaPath?: string;
  keyword?: string;
  message?: string;
  params?: Record<string, unknown>;
}

export interface ContractValidationResult {
  ok: boolean;
  errors: ContractValidationError[];
}

export function validateContract(
  contractName: string,
  data: unknown,
): Promise<ContractValidationResult>;

export function assertContract(
  contractName: string,
  data: unknown,
): Promise<void>;
