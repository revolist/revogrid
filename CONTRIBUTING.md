# Contributing to RevoGrid

Contributions of all sizes are welcome: bug reports, reproductions, documentation, tests, performance improvements, and code. Working on RevoGrid is an opportunity to learn about web components, data grids, and browser performance while collaborating with other developers.

Please follow our [Code of Conduct](CODE_OF_CONDUCT.md) in all project spaces.

## Before you start

- Search [existing issues](https://github.com/revolist/revogrid/issues), including closed issues, before opening a new report. Add useful details or a reaction to an existing report instead of posting duplicate requests.
- For questions and implementation help, use [GitHub Discussions](https://github.com/revolist/revogrid/discussions).
- For security vulnerabilities, follow the private reporting instructions in [SECURITY.md](SECURITY.md). Do not include vulnerability details in public issues or pull requests.
- For substantial changes, open an issue describing the problem and proposed approach before implementation. Comment on an existing issue if you plan to work on it so others can coordinate. Small documentation corrections can go straight to a pull request.

## Report a bug or request a feature

Use the [issue template](https://github.com/revolist/revogrid/issues/new/choose) and describe one problem per report. Include:

- RevoGrid version and, where relevant, framework wrapper version, browser, and operating system.
- A minimal runnable reproduction, with steps to reproduce the problem.
- Expected and actual behavior; screenshots or recordings when they help explain a visual issue.

For feature requests, describe the use case, desired behavior, and any alternatives you have tried. Distinguish the MIT-licensed RevoGrid core from commercial RevoGrid Pro features.

## Set up a local checkout

Install a current Node.js LTS release and pnpm, then fork and clone the repository:

```sh
git clone https://github.com/YOUR-USERNAME/revogrid.git
cd revogrid
git remote add upstream https://github.com/revolist/revogrid.git
git switch -c docs/describe-your-change
pnpm install --lockfile=false
```

Choose a descriptive branch name appropriate to your change. The repository currently tracks `package-lock.json` for CI; avoid introducing a second lockfile or unrelated dependency updates.

Framework wrappers, column types, PDF export, and the documentation site are separate Git submodules. Initialize only the submodule you need, for example `git submodule update --init docs`. Changes inside a submodule belong in that submodule's repository and require their own pull request.

Run the development server with `pnpm dev`.

## Make your change

- Keep pull requests focused on one problem and follow nearby code conventions.
- Use the implementation in `src/` and its TypeScript types as the source of truth for APIs and behavior.
- Update documentation or examples when public behavior changes. Preserve framework-specific conventions in wrapper examples.
- Add regression coverage for bug fixes and tests for new behavior. Unit tests live in `test/`; browser tests live in `e2e/`.
- Root and framework READMEs are generated from `readme/` by `scripts/generate_readme.mjs`. Update the source fragment as well as the affected generated README. The generator writes into wrapper submodules, so review its output carefully and keep changes limited to the intended repositories.

Use descriptive commit messages with a type and optional scope, for example `fix(selection): preserve the active cell` or `docs: clarify local setup`. Common types include `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, and `chore`.

## Validate your change

Run the checks relevant to the change and include the commands and results in your pull request:

| Check                                            | Command                     |
| ------------------------------------------------ | --------------------------- |
| Production build                                 | `pnpm build`                |
| Unit tests                                       | `pnpm test -- --runInBand`  |
| Browser tests                                    | `pnpm test:e2e`             |
| Hydrate type declarations, after building        | `pnpm test:hydrate`         |
| CommonJS and ESM package formats, after building | `pnpm test:package-formats` |

For documentation-only changes, check Markdown formatting, links, and any documented commands; grid tests are only needed when behavior changes.

### Browser regression tests

Rendering, editing, selection, filtering, sorting, grouping, pinning, virtualization, export, and keyboard or mouse changes need coverage in the existing browser suite. Import `test` from `@stencil/playwright`, import `expect` from `@playwright/test`, and reuse `e2e/helpers.ts`.

Install Chromium once before running browser tests:

```sh
pnpm exec playwright install chromium
```

Check `node -v` before running E2E. To run a focused test, first confirm discovery, then run it:

```sh
pnpm exec playwright test e2e/pinning.spec.ts --grep "test name" --list
pnpm exec playwright test e2e/pinning.spec.ts --grep "test name"
```

Replace the file and test name with your regression. Playwright starts the Stencil server automatically and reuses an existing local server when available. For a compile preflight without watch mode, use `pnpm exec stencil build --dev --serve --no-open`.

If startup fails with `ERR_SOCKET_BAD_PORT` and port `65536`, no browser assertions have run. Check the Node.js version and whether another server is using `localhost:3333`. Retry only after addressing the environment or server state, and report startup failures separately from assertion failures.

## Submit a pull request

1. Push your branch to your fork and open a pull request against the upstream default branch.
2. Explain the problem, resulting behavior, and relevant tradeoffs. Link the related issue, using `Closes #123` only when the change resolves it.
3. Include validation results and screenshots or recordings for visual changes. Explain checks you could not run.
4. Respond to review feedback and keep the pull request up to date. Maintainers review changes and CI results before merging.

By contributing, you agree that your contributions to this repository are licensed under the [MIT License](LICENSE).
