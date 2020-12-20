import { Subject } from '@gelliott181/reactionjs';

export interface Transaction { update$: Subject<TransactionContext>,  fn: (context?: TransactionContext) => TransactionContext, contextFactory?: () => TransactionContext };
export type TransactionFunction = (context?: TransactionContext) => TransactionContext;
export type TransactionContext = any
export interface TransactorConfig {
  transactionHooks: TransactionHooks,
  debugHooks?: DebugHooks
}

export interface DebugHooks {
  initialized?: (context: TransactionContext) => TransactionContext,
  before?: (context: TransactionContext) => TransactionContext,
  after?: (context: TransactionContext) => TransactionContext,
  finalized?: (context: TransactionContext) => TransactionContext
}

export interface TransactionHooks {
  initialize?: (context: TransactionContext) => TransactionContext,
  finalize?: (context: TransactionContext) => TransactionContext,
  error?: (err: Error) => any
}

export class Transactor {
  private transactionsInProgress = 0;
  private transactionQueue: Transaction[] = [];

  constructor(private config: TransactorConfig) { }

  public transaction(transactionFn: TransactionFunction, contextFactory?: () => TransactionContext): Subject<TransactionContext> {
    const update$ = new Subject<TransactionContext>();
    const transactionsInProgress = this.transactionsInProgress;
    const transaction: Transaction = { 
      update$,
      contextFactory,
      fn: (context?: TransactionContext): TransactionContext => {
        return transactionFn(context);
      }
    };

    this.transactionQueue.push(transaction);
    this.transactionsInProgress++;

    if (transactionsInProgress >= 0 && this.transactionQueue.length > 0) {
      this.handleTransaction();
    }

    return update$;
  }

  private async handleTransaction() {
    const transactionsInProgress = this.transactionsInProgress;
    if (transactionsInProgress > 0 && this.transactionQueue.length > 0) {
      const { contextFactory, fn, update$ } = this.transactionQueue.pop()!;

      const { initialize, finalize, error } = this.config.transactionHooks ?? { };
      
      try {
        const debugHooks = this.config.debugHooks ?? { };

        const context = contextFactory?.();

        debugHook(context, debugHooks.before);
        
        const initializedContext = initialize?.(context) ?? context;
        
        debugHook(initializedContext, debugHooks.initialized);

        const transactedContext = await fn(initializedContext);

        debugHook(transactedContext, debugHooks.after);

        const finalizedContext = finalize?.(context) ?? context;

        debugHook(finalizedContext, debugHooks.finalized);

      } catch (err: any) {
        if (err instanceof Error) {
          error?.(err);
        }

        error?.(new Error(err));
      }

      this.handleTransaction();
    }
  }  
}

const debugHook = (context: TransactionContext, hook?: (context: TransactionContext) => TransactionContext, ) => {
  if (!hook) { return; }
  const contextClone = JSON.parse(JSON.stringify(context));
  hook(contextClone);
}