export type RuleDataPrimitive = boolean | number | string | null;

export type RuleDataValue =
  RuleDataPrimitive | readonly RuleDataValue[] | Readonly<{ [key: string]: RuleDataValue }>;

export type RuleDataObject = Readonly<Record<string, RuleDataValue>>;
