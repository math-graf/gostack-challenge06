import csvParse from 'csv-parse';
import fs from 'fs';

import { getRepository } from 'typeorm';
import Transaction from '../models/Transaction';
import Categories from '../models/Category';

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

interface TransactionsToSave {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category_id: string | undefined;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const categoriesRepository = getRepository(Categories);
    const transactionsRepository = getRepository(Transaction);
    const readCSVStream = fs.createReadStream(filePath);

    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    const parseCSV = readCSVStream.pipe(parseStream);

    const transactionsImported: string[] = [];
    const categories: string[] = [];
    const uniqueCategories: string[] = [];

    parseCSV.on('data', async line => {
      categories.push(line[3]);
      transactionsImported.push(line);
    });

    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    categories.forEach(category => {
      if (!uniqueCategories.includes(category)) {
        uniqueCategories.push(category);
      }
    });

    const existentCategories = await categoriesRepository.find();
    const categoriesToAdd = uniqueCategories.filter(category => {
      let shouldInclude = true;
      existentCategories.forEach(categoryObject => {
        if (category === categoryObject.title) {
          shouldInclude = false;
        }
      });
      return shouldInclude;
    });

    let categoriesSaved: Categories[] = [];

    if (categoriesToAdd.length > 0) {
      const categoriesToSave = categoriesRepository.create(
        categoriesToAdd.map(title => ({ title })),
      );

      categoriesSaved = await categoriesRepository.save(categoriesToSave);
    }

    const allCategories = existentCategories.concat(categoriesSaved);

    const transactions: TransactionsToSave[] = transactionsImported.map(
      entry => ({
        title: entry[0],
        type: entry[1] === 'income' ? 'income' : 'outcome',
        value: Number(entry[2]),
        category_id: allCategories.find(category => category.title === entry[3])
          ?.id,
      }),
    );

    const transactionsToSave = transactionsRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category_id: transaction.category_id,
      })),
    );

    const transactionsSaved = await transactionsRepository.save(
      transactionsToSave,
    );

    await fs.promises.unlink(filePath);

    return transactionsSaved;

    // const existentCategories = await categoriesRepository.find({
    //   where: {
    //     title: In(uniqueCategories),
    //   },
    // });

    // const existentCategoriesTitles = existentCategories.map(
    //   (item: Categories) => item.title,
    // );
    // const categoriesToAdd = uniqueCategories.filter(
    //   item => !existentCategoriesTitles.includes(item),
    // );

    // const newCategoriesCreated = categoriesRepository.create(
    //   categoriesToAdd.map(title => ({ title })),
    // );

    // await categoriesRepository.save(newCategoriesCreated);

    // console.log(transactionsImported)

    // return transactionsImported;
  }
}

export default ImportTransactionsService;
