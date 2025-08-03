# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [1.0.0-alpha.9](https://github.com/ggauravr/flightstream/compare/@flightstream/adapters-csv@1.0.0-alpha.8...@flightstream/adapters-csv@1.0.0-alpha.9) (2025-08-03)


### Bug Fixes

* **csv:** correctly handle escaped quotes in CSV parser ([913d971](https://github.com/ggauravr/flightstream/commit/913d9710ee9bb6f9c820e31540aa6e45a0ccfb7a))


### Features

* **csv:** Implement lazy schema inference for datasets ([ab471e7](https://github.com/ggauravr/flightstream/commit/ab471e7f8e249b7bc3856543ad0d9edd087fb811))


### Performance Improvements

* **arrow:** optimize csv parsing and simplify ipc serialization ([b1a9f79](https://github.com/ggauravr/flightstream/commit/b1a9f795274498fde29c4911f235b94d537f32d2))
* **csv:** Optimize CSV to Arrow conversion ([a3c5f8e](https://github.com/ggauravr/flightstream/commit/a3c5f8e110209196bd4aec7831df37180f304f39))
* **csv:** use subarray and simplify type conversions ([c6270da](https://github.com/ggauravr/flightstream/commit/c6270da8694f1d41f0c448f858613eb94e01ebd5))





# [1.0.0-alpha.8](https://github.com/ggauravr/flightstream/compare/@flightstream/adapters-csv@1.0.0-alpha.7...@flightstream/adapters-csv@1.0.0-alpha.8) (2025-07-29)


### Features

* **arrow:** Optimize Arrow IPC serialization ([2514ea0](https://github.com/ggauravr/flightstream/commit/2514ea0596f285989c7acdf2f74bb8352dc0eb35))





# [1.0.0-alpha.7](https://github.com/ggauravr/flightstream/compare/@flightstream/adapters-csv@1.0.0-alpha.6...@flightstream/adapters-csv@1.0.0-alpha.7) (2025-07-27)


### Performance Improvements

* **csv:** implement direct CSV to Arrow parsing ([cfee75d](https://github.com/ggauravr/flightstream/commit/cfee75d910454a3016011e37501b7d879bd86998))





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
