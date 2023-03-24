export {};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const WordDB = jest.genMockFromModule('../WordDB') as any;

WordDB.useWordDB = () => {
  return [
    true,
    '',
    false,
    () => {
      /*empty*/
    },
  ];
};

WordDB.wordDB = true;

WordDB.matchingWords = () => [];

module.exports = WordDB;
