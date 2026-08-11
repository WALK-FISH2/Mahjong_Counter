# T211 本地构建日志摘要

- 日期：2026-08-11
- 分支：`m2-rule-system`
- 基准提交：`191a20722426bbeef82fe95abecf98d2cc791401`
- 命令：`npm.cmd run build`
- 结果：`PASS`

关键输出：

```text
> mahjong-fan-calculator@0.0.0 build
> tsc -b && vite build

vite v8.2.1 building client environment for production...
[plugin common-simple-rule-validation] Rule validation PASS: common-simple@1.0.0 (81/78/3, 6 sources)
✓ 31 modules transformed.
✓ built in 154ms

PWA v1.3.0
Building src/pwa/sw.ts service worker ("es" format)...
✓ 2 modules transformed.
✓ built in 10ms
files generated
  dist/sw.js
```

非阻断提示：

- Vite 提示其未来原生 config loader 将要求配置依赖使用显式扩展名；当前构建仍使用受支持的配置加载方式并成功完成。
- PWA 插件提示 `inlineDynamicImports` 将来改为 `codeSplitting: false`；这是既有 M0 PWA 最小脚手架提示，不影响本批规则校验或当前产物。
