import { map, Observable, pipe, ValueSubject } from "@gelliott181/reactionjs";
import { Transactor, TransactorConfig, TransactionContext } from "./Transactor";

export interface ValueStoreConfig extends TransactorConfig { }
export interface ValueTransactionContext extends TransactionContext { 
  actions: { set: (value: any) => void, get: () => any },
  readonly value: any
}

export interface ValueTransactionActions {
  set: (value: any) => any,
  get: () => any
}

export class ValueStore  {
  transactor: Transactor;
  get value() {
    return this.container.value;
  }

  private container: ValueSubject<any> = new ValueSubject<any>();

  constructor(userConfig?: Partial<{ transactorConfig: Partial<TransactorConfig> }>) {
    this.transactor = new Transactor({
      ...userConfig?.transactorConfig,
      transactionHooks: {
        ...userConfig?.transactorConfig?.transactionHooks,
        finalize: (context: any) => {
          userConfig?.transactorConfig?.transactionHooks?.finalize?.(context);
          this.container.next(context.value);
          return context;
        },
        error: (err: Error) => { 
          userConfig?.transactorConfig?.transactionHooks?.error?.(err);
          this.container.error(err); 
        }
      },
    });

  }

  updates() {
    return this.container as Observable<any>;
  }

  transaction(transactionFn: (actions: ValueTransactionActions) => void) {
    const contextFactory = (): ValueTransactionContext => {
      const container: any = { value: this.container.value };
      return {
        actions: {
          set: (value: any) => container.value = value,
          get: () => container.value
        },
        get value() { return container.value; }
      }
    };

    this.transactor.transaction((context?: ValueTransactionContext) => {
      transactionFn(context!.actions)
      return context;
    }, contextFactory);
  }
}