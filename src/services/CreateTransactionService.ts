import { getCustomRepository, getRepository } from 'typeorm';

import Transaction from '../models/Transaction';
import Categories from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';
import AppError from '../errors/AppError';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Categories);

    const { total } = await transactionsRepository.getBalance();

    if (type === 'outcome' && total - value < 0) {
      throw new AppError(
        'You have insufficient balance in your account to execute this transaction.',
        400,
      );
    }

    const categoryExists = await categoriesRepository.findOne({
      where: { title: category },
    });

    if (!categoryExists) {
      const newCategory = categoriesRepository.create({
        title: category,
      });

      await categoriesRepository.save(newCategory);

      const transaction = transactionsRepository.create({
        title,
        value,
        type,
        category_id: newCategory.id,
      });

      await transactionsRepository.save(transaction);

      return transaction;
    }

    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category_id: categoryExists.id,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
