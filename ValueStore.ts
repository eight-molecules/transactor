import { map, Observable, pipe, ValueSubject } from "@gelliott181/reactionjs";
import { Transactor, TransactorConfig, TransactionContext, DebugHooks } from "./Transactor";

export interface ValueStoreConfig extends TransactorConfig { }
export interface ValueTransactionContext extends TransactionContext { 
  actions: { set: (value: any) => void, get: () => any },
  readonly value: any
}

export interface ValueTransactionActions {
  set: (value: any) => any,
  get: () => any
}

export class ValueStore {
  private container: ValueSubject<any> = new ValueSubject<any>();
  private transactor: Transactor;
  
  get value() {
    return this.container.value;
  }


  constructor(debugHooks?: DebugHooks) {
    this.transactor = new Transactor({
      debugHooks,
      transactionHooks: {
        initialize: () => {
          const container: any = { value: this.container.value };
          return {
            actions: {
              set: (value: any) => container.value = value,
              get: () => container.value
            },
            get value() { return container.value; }
          }
        },
        finalize: (context: any) => {
          this.container.next(context.value);
          return context;
        },
        error: (err: Error) => { 
          this.container.error(err); 
        }
      },
    });
  }

  updates() {
    return this.container as Observable<any>;
  }

  transaction(transactionFn: (actions: ValueTransactionActions) => void) {
    this.transactor.transaction((context: ValueTransactionContext) => {
      transactionFn(context.actions)
      return context;
    });
  }
}