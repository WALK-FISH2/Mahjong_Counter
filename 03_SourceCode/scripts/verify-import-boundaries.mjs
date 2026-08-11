import { ESLint } from 'eslint';

const eslint = new ESLint({ cwd: process.cwd() });
const filePath = 'src/domain/index.ts';

const forbiddenImports = [
  ['React', "import 'react';"],
  ['Zustand', "import 'zustand';"],
  ['Zod', "import 'zod';"],
  ['Dexie', "import 'dexie';"],
  ['Schema layer', "import '../schemas/rule-package';"],
  ['Presentation', "import '../pages/example';"],
  ['Infrastructure', "import '../infrastructure/example';"],
];

for (const [label, source] of forbiddenImports) {
  const [result] = await eslint.lintText(source, { filePath });
  const isRejected = result?.messages.some(
    (message) => message.ruleId === 'no-restricted-imports' && message.severity === 2,
  );

  if (!isRejected) {
    throw new Error(
      `Architecture boundary did not reject the ${label} import. ESLint messages: ${JSON.stringify(result?.messages ?? [])}`,
    );
  }
}

const [allowedResult] = await eslint.lintText(
  "import type { DomainValue } from './allowed';\nexport type Example = DomainValue;",
  { filePath },
);

if (allowedResult?.messages.some((message) => message.ruleId === 'no-restricted-imports')) {
  throw new Error('Architecture boundary rejected a Domain-local type import.');
}

console.log('Architecture import boundaries verified.');
