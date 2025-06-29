### Enhancements

- [ ] Clickhouse service/adapter and arrow builder
- [ ] Develop `connect-core` package as an alternative to `core` using connect gRPC library in place of gRPC
- [ ] Develop Flight server plugins for Express and Fastify
- [ ] Arrow builder class in `utils` has a switch-case statement in `_createVector` function, which means any changes in the data types in Arrow requires changing and publishing of this project. Find a better way
- [ ] Package a framework-agnostic client package that can be plugged into any frontend application - React, Svelte, and so on - to remotely fetch streaming Arrow data from the server and store it in an in-memory database like DuckDB, or chDB

### Writing

- [ ] [Apache Arrow Vector vs Lists/Arrays](./writing-vectors.md)