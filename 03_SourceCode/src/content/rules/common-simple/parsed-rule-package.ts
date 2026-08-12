import { parseRulePackageDefinition } from '../../../schemas/rule-package/rule-package-definition-schema';

import { commonSimpleRulePackageInput } from './rule-package';

export const commonSimpleRulePackage = parseRulePackageDefinition(commonSimpleRulePackageInput);
