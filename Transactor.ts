import { Subject } from '@gelliott181/reactionjs';

export interface Transaction { fn: (context?: TransactionContext) => TransactionContext };
export type TransactionFunction = (context?: TransactionContext) => TransactionContext;
export type TransactionContext = any
export type TransactionResult<T> = T
export interface TransactorConfig {
  transactionHooks?: TransactionHooks,
  debugHooks?: DebugHooks
}

export interface DebugHooks {
  initialized?: (context: TransactionContext) => TransactionContext,
  before?: (context: TransactionContext) => TransactionContext,
  after?: (context: TransactionContext) => TransactionContext,
  finalized?: (context: TransactionContext) => TransactionContext
}

export interface TransactionHooks {
  initialize?: () => TransactionContext,
  finalize?: (context: TransactionContext) => TransactionResult<any>,
  error?: (err: Error) => any
}

export class Transactor {
  private transactionsInProgress = 0;
  private transactionQueue: Transaction[] = [];

  constructor(private config: TransactorConfig = { }) { }

  public transaction(transactionFn: TransactionFunction) {
    const transactionsInProgress = this.transactionsInProgress;
    const transaction: Transaction = { 
      fn: async ({ initialize, finalize }): Promise<TransactionContext> => {
        const context = await initialize?.();
        const transactedContext = await transactionFn(context);
        await finalize?.(transactedContext);
      }
    };

    this.transactionQueue.push(transaction);
    this.transactionsInProgress++;

    if (transactionsInProgress >= 0 && this.transactionQueue.length > 0) {
      this.handleTransaction();
    }
  }

  private async handleTransaction() {
    const transactionsInProgress = this.transactionsInProgress;
    if (transactionsInProgress > 0 && this.transactionQueue.length > 0) {
      const { fn } = this.transactionQueue.pop()!;

      const transactionHooks = this.config.transactionHooks ?? { };
      const initialize = () => { 
        const context = transactionHooks.initialize?.();
        debugHook(context, this.config.debugHooks?.initialized);
        return context;
      };

      const finalize = (context: TransactionContext) => {
        const finalizedContext = transactionHooks.finalize?.(context) ?? context;
        debugHook(finalizedContext, this.config.debugHooks?.finalized);
      };

      try {
        await fn({ initialize, finalize });
      } catch (err: any) {
        if (err instanceof Error) {
          transactionHooks.error?.(err);
        }

        transactionHooks.error?.(new Error(err));
      }

      this.handleTransaction();
    }
  }  
}

const debugHook = (context: TransactionContext, hook?: (context: TransactionContext) => TransactionContext, ) => {
  if (!hook) { return; }
  hook(context);
}