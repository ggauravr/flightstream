# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [1.0.0-alpha.6](https://github.com/ggauravr/flightstream/compare/@flightstream/adapters-csv@1.0.0-alpha.5...@flightstream/adapters-csv@1.0.0-alpha.6) (2025-07-26)


### Performance Improvements

* **csv, client:** Enhance streaming performance and memory efficiency ([e3eb1ef](https://github.com/ggauravr/flightstream/commit/e3eb1ef5cc578822d53aaddf407ce1af21fd999a))
* **csv:** eliminate redundant data transformations in processing pipeline; load entire file into memory - achieves 1s for 850k rows ([1ef4066](https://github.com/ggauravr/flightstream/commit/1ef4066c6b35883263b5264e6269680bd989661f))





# [1.0.0-alpha.5](https://github.com/ggauravr/flightstream/compare/@flightstream/adapters-csv@1.0.0-alpha.4...@flightstream/adapters-csv@1.0.0-alpha.5) (2025-07-20)


### Bug Fixes

* Correct retry handler logic and remove unused code ([a58b32f](https://github.com/ggauravr/flightstream/commit/a58b32fdb7b8b70680edb2919a8bdca3f71015e1))


### Features

* **client:** add cli argument for dataset selection ([c057628](https://github.com/ggauravr/flightstream/commit/c0576286a80da846b4880db324a59d7f39690cc0))
* **csv:** optimize CSV to Arrow serialization path ([50c15f4](https://github.com/ggauravr/flightstream/commit/50c15f41f25603ca47d769a7f26bcb36c9a6547a))


### Performance Improvements

* **csv:** optimize arrow builder with schema-aware batch processing ([fd927b2](https://github.com/ggauravr/flightstream/commit/fd927b217b2b3d409b0a079ca9c5c577bbc6bb98))


### Reverts

* Revert "fix: Correct retry handler logic and remove unused code" ([e184802](https://github.com/ggauravr/flightstream/commit/e1848020cdd074d8dd9d66e12139ce1f4c01d68a))





# [1.0.0-alpha.4](https://github.com/ggauravr/flightstream/compare/@flightstream/adapters-csv@1.0.0-alpha.3...@flightstream/adapters-csv@1.0.0-alpha.4) (2025-07-09)

**Note:** Version bump only for package @flightstream/adapters-csv





# [1.0.0-alpha.3](https://github.com/ggauravr/flightstream/compare/@flightstream/adapters-csv@1.0.0-alpha.2...@flightstream/adapters-csv@1.0.0-alpha.3) (2025-07-04)

**Note:** Version bump only for package @flightstream/adapters-csv





# 1.0.0-alpha.2 (2025-07-04)


### Features

* add production-grade structured logging with pino ([9e4d13d](https://github.com/ggauravr/flightstream/commit/9e4d13dbf2c2c319b4fcaed4cb5aa251b4b7d7bb))
