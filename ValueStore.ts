import { Observable, ValueSubject } from "@gelliott181/reactionjs";
import { Transactor, TransactorConfig, TransactionContext } from "./Transactor";

export interface ValueStoreConfig extends TransactorConfig { }
export interface ValueTransactionContext extends TransactionContext { 
  actions: { set: (value: any) => void },
  readonly value: any
}

export interface ValueTransactionActions {
  set: (value: any) => any,
}

export class ValueStore  {
  transactor: Transactor;
  _value: any;

  set value(value) {
    this.value = value;
  }

  get value() {
    return this._value;
  }

  private update$: ValueSubject<any> = new ValueSubject<any>();

  constructor(userConfig?: Partial<TransactorConfig>) {
    this.transactor = new Transactor({
      transactionHooks: {
        finalize: (context: any) => {
          this.update$.next(context.value);
          return context;
        }
      },
      ...userConfig
    });

  }

  updates() {
    return this.update$ as Observable<any>;
  }

  transaction(transactionFn: (actions: ValueTransactionActions) => void) {
    const contextFactory = (): ValueTransactionContext => {
      let _value: any = this._value;
      return {
        actions: {
          set: (value: any) => _value = value
        },
        get value() { return _value; }
      };
    };

    this.transactor.transaction((context?: ValueTransactionContext) => {
      transactionFn(context!.actions)
      return context;
    }, contextFactory);
  }
}