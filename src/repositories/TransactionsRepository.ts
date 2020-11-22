import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();

    const balance = transactions.reduce(
      (totalBalance, entry) => {
        const results = totalBalance;

        if (entry.type === 'income') {
          results.income += entry.value;
          results.total += entry.value;
        } else {
          results.outcome += entry.value;
          results.total -= entry.value;
        }

        return results;
      },
      {
        income: 0,
        outcome: 0,
        total: 0,
      },
    );

    return balance;
  }
}

export default TransactionsRepository;
