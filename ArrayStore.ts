import { Observable, ValueSubject } from "@gelliott181/reactionjs";
import { DebugHooks, Transactor } from "./Transactor";

export class ArrayStore<T> {
  private valueSubject = new ValueSubject<T[]>([]);
  private transactor = new Transactor();

  constructor(debugHooks?: DebugHooks) {
    this.transactor = new Transactor({
      debugHooks,
      transactionHooks: {
        initialize: () => [ ...this.valueSubject.value ],
        finalize: (array: T[]) => this.valueSubject.next(array),
        error: (err: Error) => this.valueSubject.error(err)
      },
    });
  }

  updates() {
    return this.valueSubject as Observable<T[]>;
  }

  transaction(transactionFn: Function) {
    setTimeout(() => this.transactor.transaction((array: T[]) => {
      return transactionFn(array);
    }));
  }
}