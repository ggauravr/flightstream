### Enhancements

- [ ] Clickhouse service/adapter and arrow builder
- [ ] Develop `connect-core` package as an alternative to `core` using connect gRPC library in place of gRPC
- [ ] Develop Flight server plugins for Express and Fastify
- [ ] Arrow builder class in `utils` has a switch-case statement in `_createVector` function, which means any changes in the data types in Arrow requires changing and publishing of this project. Find a better way

### Writing

- [ ] [Apache Arrow Vector vs Lists/Arrays](./writing-vectors.md)