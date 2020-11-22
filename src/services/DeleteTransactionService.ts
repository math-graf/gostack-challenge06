import { getRepository } from 'typeorm';

import AppError from '../errors/AppError';
import Transaction from '../models/Transaction';

class DeleteTransactionService {
  public async execute(id: string): Promise<void> {
    const transactionsRepository = getRepository(Transaction);
    const deleteTransaction = await transactionsRepository.delete(id);

    if (deleteTransaction.affected === 0) {
      throw new AppError('Transaction not found.', 400);
    }
  }
}

export default DeleteTransactionService;
