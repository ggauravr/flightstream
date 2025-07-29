# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [1.0.0-alpha.5](https://github.com/ggauravr/flightstream/compare/@flightstream/core-shared@1.0.0-alpha.4...@flightstream/core-shared@1.0.0-alpha.5) (2025-07-29)


### Features

* **arrow:** Optimize Arrow IPC serialization ([2514ea0](https://github.com/ggauravr/flightstream/commit/2514ea0596f285989c7acdf2f74bb8352dc0eb35))





# [1.0.0-alpha.4](https://github.com/ggauravr/flightstream/compare/@flightstream/core-shared@1.0.0-alpha.3...@flightstream/core-shared@1.0.0-alpha.4) (2025-07-26)


### Performance Improvements

* **csv:** eliminate redundant data transformations in processing pipeline; load entire file into memory - achieves 1s for 850k rows ([1ef4066](https://github.com/ggauravr/flightstream/commit/1ef4066c6b35883263b5264e6269680bd989661f))





# [1.0.0-alpha.3](https://github.com/ggauravr/flightstream/compare/@flightstream/core-shared@1.0.0-alpha.2...@flightstream/core-shared@1.0.0-alpha.3) (2025-07-20)

**Note:** Version bump only for package @flightstream/core-shared





# 1.0.0-alpha.2 (2025-07-20)


### Bug Fixes

* Correct retry handler logic and remove unused code ([a58b32f](https://github.com/ggauravr/flightstream/commit/a58b32fdb7b8b70680edb2919a8bdca3f71015e1))


### Features

* **config:** introduce dedicated client configuration ([bbf74fa](https://github.com/ggauravr/flightstream/commit/bbf74faf496a6dce76d20ff42ceb269ee62a79c5))
* **core:** introduce shared package for client and server ([9c16e35](https://github.com/ggauravr/flightstream/commit/9c16e3596e2a63d09974d58343ece8248a604da4))
* **csv:** optimize CSV to Arrow serialization path ([50c15f4](https://github.com/ggauravr/flightstream/commit/50c15f41f25603ca47d769a7f26bcb36c9a6547a))


### Reverts

* Revert "fix: Correct retry handler logic and remove unused code" ([e184802](https://github.com/ggauravr/flightstream/commit/e1848020cdd074d8dd9d66e12139ce1f4c01d68a))
