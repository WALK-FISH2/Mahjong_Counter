import { describe, expect, it, vi } from 'vitest';

import {
  commonSimpleCapabilityRegistry,
  COMMON_SIMPLE_RULE_REF,
  createCommonSimpleRuleRepository,
} from './common-simple-rule-repository';
import { commonSimplePatternRecognizerRegistry } from '../../content/rules/common-simple/pattern-recognizers';
import { BuiltInRuleRepository } from './built-in-rule-repository';
import { commonSimpleRulePackageInput } from '../../content/rules/common-simple/rule-package';

describe('BuiltInRuleRepository', () => {
  it('fails closed when a declared recognizer has no installed implementation', async () => {
    const repository = new BuiltInRuleRepository([
      {
        ref: COMMON_SIMPLE_RULE_REF,
        input: commonSimpleRulePackageInput,
        capabilities: commonSimpleCapabilityRegistry,
        patternRecognizers: {
          recognizers: commonSimplePatternRecognizerRegistry.recognizers.slice(1),
        },
      },
    ]);

    await expect(repository.getInstalledRule(COMMON_SIMPLE_RULE_REF)).rejects.toMatchObject({
      reasonCode: 'RULE_CAPABILITY_UNAVAILABLE',
    });
  });
  it('loads the built-in rule without network access and returns immutable data', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('network forbidden'));
    const repository = createCommonSimpleRuleRepository();

    const rulePackage = await repository.getInstalledRule(COMMON_SIMPLE_RULE_REF);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(rulePackage.manifest).toMatchObject(COMMON_SIMPLE_RULE_REF);
    expect(rulePackage.tileSet.enabledTiles).toHaveLength(42);
    expect(rulePackage.handModel.targetStructuralTileCount).toBe(14);
    expect(rulePackage.structures).toHaveLength(6);
    expect(rulePackage.patterns).toHaveLength(81);
    expect(rulePackage.scoring.strategyKey).toBe('scoring.additive');
    expect(Object.isFrozen(rulePackage)).toBe(true);
    expect(Object.isFrozen(rulePackage.patterns)).toBe(true);
    expect(await repository.getInstalledRule(COMMON_SIMPLE_RULE_REF)).toBe(rulePackage);

    fetchSpy.mockRestore();
  });

  it('lists the same validated manifest for installed and available built-ins', async () => {
    const repository = createCommonSimpleRuleRepository();

    await expect(repository.listInstalledRules()).resolves.toEqual([
      expect.objectContaining(COMMON_SIMPLE_RULE_REF),
    ]);
    await expect(repository.listAvailableRules()).resolves.toEqual([
      expect.objectContaining(COMMON_SIMPLE_RULE_REF),
    ]);
    const [catalogEntry] = await repository.listRuleCatalog();
    expect(catalogEntry?.aliases).toEqual(['大众麻将', '通用简化版']);
    expect(catalogEntry?.resultImpactVersion).toBe('1.0.0');
    expect(catalogEntry?.manifest).toMatchObject(COMMON_SIMPLE_RULE_REF);
  });

  it('reports deterministic errors for missing or mutating operations', async () => {
    const repository = createCommonSimpleRuleRepository();
    const missingRule = { ruleId: 'missing', ruleVersion: '1.0.0' };

    await expect(repository.getInstalledRule(missingRule)).rejects.toMatchObject({
      reasonCode: 'RULE_NOT_INSTALLED',
    });
    await expect(repository.downloadRule(COMMON_SIMPLE_RULE_REF)).rejects.toMatchObject({
      reasonCode: 'RULE_REPOSITORY_READ_ONLY',
    });
    await expect(repository.removeRule(COMMON_SIMPLE_RULE_REF)).rejects.toMatchObject({
      reasonCode: 'RULE_REPOSITORY_READ_ONLY',
    });
  });

  it('rejects a registration whose lookup ref differs from the validated manifest', async () => {
    const repository = new BuiltInRuleRepository([
      {
        ref: { ruleId: 'different-rule', ruleVersion: '1.0.0' },
        input: commonSimpleRulePackageInput,
        capabilities: commonSimpleCapabilityRegistry,
      },
    ]);

    await expect(
      repository.getInstalledRule({ ruleId: 'different-rule', ruleVersion: '1.0.0' }),
    ).rejects.toMatchObject({
      reasonCode: 'RULE_PACKAGE_INVALID',
      data: {
        expectedRuleRef: 'different-rule@1.0.0',
        actualRuleRef: 'common-simple@1.0.0',
      },
    });
  });
});
