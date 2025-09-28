import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<T> = {
}

export type ImpureCircuits<T> = {
}

export type PureCircuits = {
  verifyAge(birthdateTimestamp_0: bigint, currentTimestamp_0: bigint): [];
}

export type Circuits<T> = {
  verifyAge(context: __compactRuntime.CircuitContext<T>,
            birthdateTimestamp_0: bigint,
            currentTimestamp_0: bigint): __compactRuntime.CircuitResults<T, []>;
}

export type Ledger = {
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<T, W extends Witnesses<T> = Witnesses<T>> {
  witnesses: W;
  circuits: Circuits<T>;
  impureCircuits: ImpureCircuits<T>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<T>): __compactRuntime.ConstructorResult<T>;
}

export declare function ledger(state: __compactRuntime.StateValue): Ledger;
export declare const pureCircuits: PureCircuits;
