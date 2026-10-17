# Temporary maintained patch for GHSA-vfj7-8cjw-p6xm

Source: `braces@3.0.3`, MIT, https://github.com/micromatch/braces.
The upstream registry had no fixed release on 2026-10-17. This local package
preserves the upstream source/license and limits nesting to 64 in the parser
and recursive compile/stringify/expand AST walkers. Excess nesting raises a
controlled SyntaxError before stack exhaustion, including caller-supplied ASTs.
Regression tests cover deep braces, parentheses, supplied ASTs and normal globs.

`package.json` overrides braces to this explicit local dependency. The changed
package name/version identifies our patched source; this is not an upstream fix.
Replace this override with an audited upstream fixed version when available.
